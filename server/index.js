const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');
const fetch = require('node-fetch');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const {port, repoUrl} = require('./env');

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({agents: [], tasks: [], queue: [], nextTaskId: 1}).write();

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(logger('dev'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ENV
console.info(`Repository URL is ${repoUrl}`);

async function runTaskOnAgent(task, agent) {
  const res = await fetch(`http://${agent.host}:${agent.port}/build`, {
    method: 'post',
    body: JSON.stringify({...task, repoUrl}),
    headers: {'Content-Type': 'application/json'},
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
}

function removeBrokenAgent(agent) {
  // return task to the queue if present
  if (agent.taskId) {
    const task = db.get('tasks').find({id: agent.taskId}).value();
    db.get('tasks').remove(task).value();
    db.get('queue').unshift(task).value();
  }

  db.get('agents').remove(agent).value();
  db.write();
}

async function drainQueue() {
  const queue = db.get('queue').value();
  const agents = db.get('agents').value();
  const tasks = db.get('tasks').value();

  if (!queue.length) return;
  if (!agents.length) return;

  const agent = agents.find(agent => !agent.taskId);
  if (!agent) return;

  const task = queue.shift();
  agent.taskId = task.id;
  task.status = 'starting';
  tasks.push(task);

  db.write();

  try {
    await runTaskOnAgent(task, agent);
    db.get('tasks').find({id: task.id}).set('status', 'started').write();
    console.info(`Task ${task.id} started on agent ${agent.host}:${agent.port}`);
  } catch (e) {
    // remove broken agent and return task to the queue
    removeBrokenAgent(agent);

    console.error(`Task ${task.id} failed to start on agent ${agent.host}:${agent.port}. Return it to the queue.`, e);
  }
}
setInterval(drainQueue, 500);

async function pingAgent(agent) {
  try {
    const res = await fetch(`http://${agent.host}:${agent.port}/ping`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

const CHECK_AGENTS_INTERVAL = 10 * 1000;
async function checkAgents() {
  // check only agents with tasks
  const agents = db.get('agents').filter(agent => agent.taskId).value();

  try {
    if (agents.length) {
      console.info(`Checking ${agents.length} agent(s)`);
    }
    for (const agent of agents) {
      const isOk = await pingAgent(agent);
      if (!isOk) {
        console.error(`Agent ${agent.host}:${agent.port} is not responding. Removing it and returning task to the queue.`);
        removeBrokenAgent(agent);
      }
    }
  } finally {
    setTimeout(checkAgents, CHECK_AGENTS_INTERVAL);
  }
}
setTimeout(checkAgents, CHECK_AGENTS_INTERVAL);

// web interface
app.get('/', (req, res) => res.render('index', {
  queue: db.get('queue').value(),
  tasks: db.get('tasks').value(),
  agents: db.get('agents').value(),
}));

const MAX_QUEUE_SIZE = 100;
app.post('/build', (req, res) => {
  const locals = {
    queue: db.get('queue').value(),
    tasks: db.get('tasks').value(),
    agents: db.get('agents').value(),
  };

  // Check required fields
  const requiredFields = ['commitHash', 'buildCommand'];
  const absentField = requiredFields.find((field) => !req.body[field]);
  if (absentField) {
    locals.error = `${absentField} is required`;
    res.status(400).render('index', locals);
    return;
  }

  // Check queue size limit
  const queue = db.get('queue').value();
  if (queue.length >= MAX_QUEUE_SIZE) {
    locals.error = `Limit of maximum ${MAX_QUEUE_SIZE} tasks in queue exceeded, please add more agents`;
    res.status(400).render('index', locals);
    return;
  }

  const {commitHash, buildCommand} = req.body;
  const id = db.get('nextTaskId').value();
  db.update('nextTaskId', n => n + 1).value();

  queue.push({
    id,
    commitHash,
    buildCommand,
  });
  db.write();

  locals.message = `Task added to queue, task id is ${id}`;
  res.render('index', locals);
});

app.get('/build/:id', (req, res) => {
  const task = db.get('tasks').find({id: parseInt(req.params.id, 10)}).value();
  if (!task) {
    res.status(404).send(`Task with id ${req.params.id} is not found`);
    return;
  }

  res.render('build', {task});
});

// API for agents
app.post('/notify_agent', (req, res) => {
  // -- зарегистрировать агента . В параметрах хост и порт, на котором запущен агент
  const {host, port} = req.body;
  if (!host || !port) {
    res.status(400).send('Host and port required!');
    return;
  }

  // Check if agent is already registered
  const agents = db.get('agents').value();
  if (agents.some((agent) => agent.host === host && agent.port === port)) {
    console.info(`Agent is already registered, agent url is http://${host}:${port}`);
    res.status(200).send('Agent is already registered');
    return;
  }

  agents.push({host, port});
  db.write();

  console.info(`Agent registered, agent url is http://${host}:${port}`);
  res.status(204).end();
});

app.post('/notify_build_result', (req, res) => {
  // -- сохранить результаты сборки. В параметрах -- id сборки, статус, stdout и stderr процесса.
  const {id, status, stdout, stderr} = req.body;
  if (!id || !status) {
    res.status(400).send('Id and status required!');
    return;
  }

  const task = db.get('tasks').find({id}).value();
  if (!task) {
    res.status(404).send(`Task with id ${id} is not found`);
    return;
  }

  Object.assign(task, {id, status, stdout, stderr});

  // release agent
  const agent = db.get('agents').find((agent) => agent.taskId === id).value();
  if (agent) {
    agent.taskId = null;
  }
  db.write();

  res.status(204).end();
});

app.listen(port, () => console.info(`Server listening on http://0.0.0.0:${port}/`));
