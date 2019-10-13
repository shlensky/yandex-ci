const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(logger('dev'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// web interface
app.get('/', (req, res) => res.render('index', {}));
app.get('/build/:id', (req, res) => res.render('build', {}));

// API for agents
const agents = [];
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
