const {exec} = require('child_process');
const {promisify} = require('util');

const execAsync = promisify(exec);

async function cloneRepo(reposPath, repoUrl, commitHash, directory) {
  const CLONE_COMMAND = `git --no-pager clone -b ${commitHash} ${repoUrl} ${directory}`;
  const options = {cwd: reposPath, env: {GIT_TERMINAL_PROMPT: '0'}};

  return execAsync(CLONE_COMMAND, options);
}

module.exports = {cloneRepo};
