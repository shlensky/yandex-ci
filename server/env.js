const dotenv = require('dotenv');
dotenv.config();

const DEFAULT_REPO_URL = 'https://github.com/shlensky/yandex-arcanum';
const repoUrl = process.env.REPO_URL || DEFAULT_REPO_URL;

const DEFAULT_PORT = 3000;
const port = process.env.PORT || DEFAULT_PORT;

module.exports = {repoUrl, port};
