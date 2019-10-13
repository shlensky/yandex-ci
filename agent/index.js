const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const fetch = require('node-fetch');
const path = require('path');
const {cloneRepo} = require('./git');

const app = express();
app.use(bodyParser.json());
app.use(logger('dev'));

const DEFAULT_HOST = '0.0.0.0';
const host = process.env.host || DEFAULT_HOST;

const DEFAULT_PORT = 3001;
const port = process.env.port || DEFAULT_PORT;

const DEFAULT_SERVER_URL = 'http://0.0.0.0:3000';
const serverUrl = process.env.serverUrl || DEFAULT_SERVER_URL;

const DEFAULT_BUILDS_DIRECTORY = './builds';
const buildsDirectory = path.resolve(process.env.buildsDirectory || DEFAULT_BUILDS_DIRECTORY);

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
    const buildDirectory = `build-${id}`;

    try {
      await cloneRepo(buildsDirectory, repoUrl, commitHash, buildDirectory);
    } catch (e) {
      res.status(500).send(e.message);
      return;
    }

    res.status(204).send();

    // todo: run build
    console.log({buildCommand});
  } catch (e) {
    next(e);
  }
});

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
