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
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    error,
    source
  };
  logs.push(entry);

  const payload = {
    programId: process.env.PROGRAM_ID || 'unknown',
    ...entry
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
    log(`Uncaught exception on route ${err.route || 'unknown'}: ${err.stack || err.message}`, { level: 'error', source: 'process' });
  });
  process.on('unhandledRejection', (reason) => {
    log(`Unhandled rejection: ${JSON.stringify(reason)}`, { level: 'error', source: 'process' });
  });
}

interceptConsole();
interceptProcessErrors();

module.exports = { log, getLogs };
