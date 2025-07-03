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

function interceptConsole() {
  const format = (a) => {
    if (typeof a === 'string') return a;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  };
  const wrap = (orig, level) => {
    return (...args) => {
      orig(...args);
      const msg = args.map(format).join(' ');
      log(msg, { level, source: 'console' });
    };
  };
  console.log = wrap(console.log.bind(console), 'info');
  console.warn = wrap(console.warn.bind(console), 'warn');
  console.error = wrap(console.error.bind(console), 'error');
}

function interceptProcessErrors() {
  process.on('uncaughtException', (err) => {
    log('Uncaught exception', { level: 'error', error: err.stack || err.message, source: 'process' });
  });
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason.stack : JSON.stringify(reason);
    log('Unhandled rejection', { level: 'error', error, source: 'process' });
  });
}

interceptConsole();
interceptProcessErrors();

module.exports = { log, getLogs };
