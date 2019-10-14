const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const DEFAULT_HOST = '0.0.0.0';
const host = process.env.HOST || DEFAULT_HOST;

const DEFAULT_PORT = 3001;
const port = process.env.PORT || DEFAULT_PORT;

const DEFAULT_SERVER_URL = 'http://0.0.0.0:3000';
const serverUrl = process.env.SERVER_URL || DEFAULT_SERVER_URL;

const DEFAULT_BUILDS_DIRECTORY = './builds';
const buildsDirectory = path.resolve(process.env.BUILDS_DIRECTORY || DEFAULT_BUILDS_DIRECTORY);

module.exports = {host, port, serverUrl, buildsDirectory};
