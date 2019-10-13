const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());
app.use(logger('dev'));

// API for server
app.post('/build', (req, res) => {
  // -- запустить сборку. В параметрах -- id сборки, адрес репозитория, хэш коммита, команда, которую надо запустить
  console.log('start build agent');
});

const DEFAULT_HOST = '0.0.0.0';
const host = process.env.host || DEFAULT_HOST;

const DEFAULT_PORT = 3001;
const port = process.env.port || DEFAULT_PORT;

const DEFAULT_SERVER_URL = 'http://0.0.0.0:3000';
const serverUrl = process.env.serverUrl || DEFAULT_SERVER_URL;

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
