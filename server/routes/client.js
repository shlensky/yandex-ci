const {db} = require('../db');

const MAX_QUEUE_SIZE = 100;

function index(req, res) {
  res.render('index', {
    queue: db.get('queue').value(),
    tasks: db.get('tasks').value(),
    agents: db.get('agents').value(),
  });
}

function build(req, res) {
  const locals = {
    queue: db.get('queue').value(),
    tasks: db.get('tasks').value(),
    agents: db.get('agents').value(),
  };

  // Check required fields
  const requiredFields = ['commitHash', 'buildCommand'];
  const absentField = requiredFields.find((field) => !req.body[field]);
  if (absentField) {
    locals.error = `${absentField} is required`;
    res.status(400).render('index', locals);
    return;
  }

  // Check queue size limit
  const queue = db.get('queue').value();
  if (queue.length >= MAX_QUEUE_SIZE) {
    locals.error = `Limit of maximum ${MAX_QUEUE_SIZE} tasks in queue exceeded, please add more agents`;
    res.status(400).render('index', locals);
    return;
  }

  const {commitHash, buildCommand} = req.body;
  const id = db.get('nextTaskId').value();
  db.update('nextTaskId', n => n + 1).value();

  queue.push({
    id,
    commitHash,
    buildCommand,
  });
  db.write();

  locals.message = `Task added to queue, task id is ${id}`;
  res.render('index', locals);
}

function details(req, res) {
  const task = db.get('tasks').find({id: parseInt(req.params.id, 10)}).value();
  if (!task) {
    res.status(404).send(`Task with id ${req.params.id} is not found`);
    return;
  }

  res.render('build', {task});
}

module.exports = {index, build, details};
