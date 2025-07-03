const logs = [];

function sendToApi(data) {
  if (!process.env.API_URL) {
    return;
  }
  // Fire and forget; errors are ignored
  fetch(`${process.env.API_URL}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {});
}

function log(message, { level = 'info', error = null, source = 'server' } = {}) {
  const entry = `[${new Date().toISOString()}] ${message}`;
  logs.push(entry);

  const payload = {
    programId: process.env.PROGRAM_ID || 'unknown',
    level,
    message,
    error,
    source
  };
  sendToApi(payload);
}

function getLogs() {
  return logs;
}

module.exports = { log, getLogs };
