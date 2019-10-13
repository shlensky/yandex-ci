const {exec} = require('child_process');
const {promisify} = require('util');

const execAsync = promisify(exec);

async function cloneRepo(reposPath, repoUrl, commitHash, directory) {
  const CLONE_COMMAND = `git --no-pager clone -b ${commitHash} ${repoUrl} ${directory}`;
  const options = {cwd: reposPath, env: {GIT_TERMINAL_PROMPT: '0'}};

  try {
    const {stdout, stderr} = await execAsync(CLONE_COMMAND, options);
    return {code: 0, stdout, stderr};
  } catch (e) {
    return {code: e.code, stdout: e.stdout, stderr: e.stderr};
  }
}

async function runBuild(buildDirectory, buildCommand) {
  const options = {cwd: buildDirectory};
  try {
    const {stdout, stderr} = await execAsync(buildCommand, options);
    return {code: 0, stdout, stderr};
  } catch (e) {
    return {code: e.code, stdout: e.stdout, stderr: e.stderr};
  }
}

module.exports = {cloneRepo, runBuild};
