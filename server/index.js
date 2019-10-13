const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(logger('dev'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ENV
const MAX_QUEUE_SIZE = 100;
const REPO_URL = 'https://github.com/shlensky/yandex-arcanum';

let nextTaskId = 1;
let agents = [];
let tasks = [];
const queue = [];

function getTaskById(id) {
  return tasks.find(task => task.id === parseInt(id, 10));
}

async function runTaskOnAgent(task, agent) {
  const res = await fetch(`http://${agent.host}:${agent.port}/build`, {
    method: 'post',
    body: JSON.stringify({...task, repoUrl: REPO_URL}),
    headers: {'Content-Type': 'application/json'},
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
}

async function drainQueue() {
  if (!queue.length) return;
  if (!agents.length) return;

  const agent = agents.find(agent => !agent.taskId);
  if (!agent) return;

  const task = queue.shift();
  agent.taskId = task.id;
  task.status = 'starting';
  tasks.push(task);

  try {
    await runTaskOnAgent(task, agent);
    task.status = 'started';
    console.info(`Task ${task.id} started on agent ${agent.host}:${agent.port}`);
  } catch (e) {
    // remove broken agent and return task to the queue
    agents = agents.filter(a => a !== agent);
    queue.unshift(task);
    tasks = tasks.filter(t => t !== task);

    console.error(`Task ${task.id} failed to start on agent ${agent.host}:${agent.port}. Return it to the queue.`, e);
  }
}
setInterval(drainQueue, 500);

// web interface
app.get('/', (req, res) => res.render('index', {queue, tasks, agents}));

app.post('/build', (req, res) => {
  const locals = {queue, tasks, agents};

  // Check required fields
  const requiredFields = ['commitHash', 'buildCommand'];
  const absentField = requiredFields.find((field) => !req.body[field]);
  if (absentField) {
    locals.error = `${absentField} is required`;
    res.status(400).render('index', locals);
    return;
  }

  // Check queue size limit
  if (queue.length >= MAX_QUEUE_SIZE) {
    locals.error = `${MAX_QUEUE_SIZE} limit exceeded, please add more agents`;
    res.status(400).render('index', locals);
    return;
  }

  const {commitHash, buildCommand} = req.body;
  const id = nextTaskId++;
  queue.push({
    id,
    commitHash,
    buildCommand,
  });

  locals.message = `Task added to queue, task id is ${id}`;
  res.render('index', locals);
});

app.get('/build/:id', (req, res) => {
  const task = getTaskById(req.params.id);
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
  if (agents.some((agent) => agent.host === host && agent.port === port)) {
    console.info(`Agent is already registered, agent url is http://${host}:${port}`);
    res.status(200).send('Agent is already registered');
    return;
  }

  agents.push({host, port});

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

  const task = getTaskById(id);
  if (!task) {
    res.status(404).send(`Task with id ${id} is not found`);
    return;
  }

  Object.assign(task, {id, status, stdout, stderr});

  // release agent
  const agent = agents.find((agent) => agent.taskId === id);
  if (agent) {
    agent.taskId = null;
  }

  res.status(204).end();
});

const DEFAULT_PORT = 3000;
const port = process.env.port || DEFAULT_PORT;
app.listen(port, () => console.info(`Server listening on http://0.0.0.0:${port}/`));
