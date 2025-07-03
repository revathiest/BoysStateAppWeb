(function(){
  function getToken() {
    try { return localStorage.getItem('jwtToken'); } catch { return null; }
  }
  function parsePayload(token) {
    try { return JSON.parse(atob(token.split('.')[1])); } catch { return {}; }
  }
  function sendLog(message, opts){
    const { level='info', error=null } = opts || {};
    const apiBase = typeof window.API_URL === 'string' && window.API_URL.trim() ? window.API_URL : null;
    const token = getToken();
    if(!apiBase || !token) return;
    const payloadData = parsePayload(token);
    const payload = {
      programId: payloadData.programId || 'unknown',
      level,
      message,
      error: error && (error.stack || error.message || String(error)),
      source: 'browser'
    };
    fetch(`${apiBase}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
  window.logToServer = sendLog;
  const format = (a) => { if (typeof a === 'string') return a; try { return JSON.stringify(a); } catch { return String(a); } };
  const wrap = (orig, level) => (...args) => {
    orig(...args);
    const msg = args.map(format).join(' ');
    sendLog(msg, { level });
  };
  console.log = wrap(console.log.bind(console), 'info');
  console.warn = wrap(console.warn.bind(console), 'warn');
  console.error = wrap(console.error.bind(console), 'error');
})();
