const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(logger('dev'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ENV
const MAX_QUEUE_SIZE = 100;

let nextTaskId = 1;
const agents = [];
const queue = [];

// web interface
app.get('/', (req, res) => res.render('index', {queue}));
app.post('/build', (req, res) => {
  const locals = {queue};

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
app.get('/build/:id', (req, res) => res.render('build', {}));

// API for agents
app.post('/notify_agent', (req, res) => {
  // -- зарегистрировать агента . В параметрах хост и порт, на котором запущен агент
  const {host, port} = req.body;
  if (!host || !port) {
    throw new Error('Host and port required!');
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
  console.info('Todo: Save build result');
  res.status(204).end();
});

const DEFAULT_PORT = 3000;
const port = process.env.port || DEFAULT_PORT;
app.listen(port, () => console.info(`Server listening on http://0.0.0.0:${port}/`));
