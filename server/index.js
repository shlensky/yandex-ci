const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const path = require('path');
const {port, repoUrl} = require('./env');

const {index, build, details} = require('./routes/client');
const {notifyAgent, notifyBuildResult} = require('./routes/agent');

const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(logger('dev'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// web interface
app.get('/', index);
app.post('/build', build);
app.get('/build/:id', details);

// API for agents
app.post('/notify_agent', notifyAgent);
app.post('/notify_build_result', notifyBuildResult);

app.listen(port, () => {
  console.info(`Repository URL is ${repoUrl}. Server listening on http://0.0.0.0:${port}/`);
  require('./scheduler');
});
