const logs = [];

function log(message) {
  const entry = `[${new Date().toISOString()}] ${message}`;
  logs.push(entry);
}

function getLogs() {
  return logs;
}

module.exports = { log, getLogs };
