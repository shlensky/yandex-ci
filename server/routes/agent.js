const {db} = require('../db');

function notifyAgent(req, res) {
  // -- зарегистрировать агента . В параметрах хост и порт, на котором запущен агент
  const {host, port} = req.body;
  if (!host || !port) {
    res.status(400).send('Host and port required!');
    return;
  }

  // Check if agent is already registered
  const agents = db.get('agents').value();
  if (agents.some((agent) => agent.host === host && agent.port === port)) {
    console.info(`Agent is already registered, agent url is http://${host}:${port}`);
    res.status(200).send('Agent is already registered');
    return;
  }

  agents.push({host, port});
  db.write();

  console.info(`Agent registered, agent url is http://${host}:${port}`);
  res.status(204).end();
}

function notifyBuildResult(req, res) {
  // -- сохранить результаты сборки. В параметрах -- id сборки, статус, stdout и stderr процесса.
  const {id, status, stdout, stderr} = req.body;
  if (!id || !status) {
    res.status(400).send('Id and status required!');
    return;
  }

  const task = db.get('tasks').find({id}).value();
  if (!task) {
    res.status(404).send(`Task with id ${id} is not found`);
    return;
  }

  Object.assign(task, {id, status, stdout, stderr, finished: (new Date()).toISOString()});

  // release agent
  const agent = db.get('agents').find((agent) => agent.taskId === id).value();
  if (agent) {
    agent.taskId = null;
  }
  db.write();

  res.status(204).end();
}

module.exports = {notifyAgent, notifyBuildResult};
