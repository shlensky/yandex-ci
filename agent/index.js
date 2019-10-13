const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const fetch = require('node-fetch');
const path = require('path');
const {cloneRepo, runBuild} = require('./utils');

const app = express();
app.use(bodyParser.json());
app.use(logger('dev'));

// ENV
const DEFAULT_HOST = '0.0.0.0';
const host = process.env.HOST || DEFAULT_HOST;

const DEFAULT_PORT = 3001;
const port = process.env.PORT || DEFAULT_PORT;

const DEFAULT_SERVER_URL = 'http://0.0.0.0:3000';
const serverUrl = process.env.SERVER_URL || DEFAULT_SERVER_URL;

const DEFAULT_BUILDS_DIRECTORY = './builds';
const buildsDirectory = path.resolve(process.env.BUILDS_DIRECTORY || DEFAULT_BUILDS_DIRECTORY);

const SERVER_NOTIFICATION_RETRY_INTERVAL = 10 * 1000;

async function notifyBuildResult(result) {
  try {
    await fetch(`${serverUrl}/notify_build_result`, {
      method: 'post',
      body: JSON.stringify({
        id: result.id,
        status: result.code ? 'failed' : 'success',
        stdout: result.stdout,
        stderr: result.stderr,
      }),
      headers: {'Content-Type': 'application/json'},
    });

    console.info(`Successfully notified server, task id is ${result.id}`);
  } catch (e) {
    console.error(`Server notification error, will retry in ${SERVER_NOTIFICATION_RETRY_INTERVAL}ms`, result, e);
    setTimeout(() => notifyBuildResult(result), SERVER_NOTIFICATION_RETRY_INTERVAL);
  }
}

// API for server
app.post('/build', async (req, res, next) => {
  try {
    // -- запустить сборку. В параметрах -- id сборки, адрес репозитория, хэш коммита, команда, которую надо запустить
    const requiredFields = ['id', 'repoUrl', 'commitHash', 'buildCommand'];
    const absentField = requiredFields.find((field) => !req.body[field]);
    if (absentField) {
      res.status(400).send(`${absentField} is required`);
      return;
    }

    const {id, repoUrl, commitHash, buildCommand} = req.body;
    const directoryName = `build-${id}`;

    res.status(204).send();

    const cloneResult = await cloneRepo(buildsDirectory, repoUrl, commitHash, directoryName);
    if (cloneResult.code) {
      notifyBuildResult({...cloneResult, id});
      return;
    }

    const buildResult = await runBuild(path.resolve(buildsDirectory, directoryName), buildCommand);
    notifyBuildResult({...buildResult, id});
  } catch (e) {
    next(e);
  }
});
app.get('/ping', (req, res) => res.status('204').end());

async function registerOnServer(serverUrl) {
  try {
    await fetch(`${serverUrl}/notify_agent`, {
      method: 'post',
      body: JSON.stringify({host, port}),
      headers: {'Content-Type': 'application/json'},
    });

    console.info(`Successfully registered on the server, server url is ${serverUrl}`);
  } catch (e) {
    console.error('Error registering on the server', e);
    process.exit(1);
  }
}

app.listen(port, () => {
  console.info(`Agent is listening on http://${host}:${port}/`);
  registerOnServer(serverUrl);
});
