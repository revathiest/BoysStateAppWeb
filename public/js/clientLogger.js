(function(){
  function sendLog(message, opts){
    const { level='info', error=null, programId=null } = opts || {};
    const apiBase = typeof window.API_URL === 'string' && window.API_URL.trim() ? window.API_URL : null;
    if(!apiBase) return;

    // Get programId if set anywhere globally or in opts, otherwise default to 'website'
    let pid = programId;
    if (!pid) {
      if (typeof window.programId === 'string' && window.programId) pid = window.programId;
      else if (typeof window.selectedProgramId === 'string' && window.selectedProgramId) pid = window.selectedProgramId;
      else pid = 'website';
    }

    const payload = {
      programId: pid,
      level,
      message,
      error: error && (error.stack || error.message || String(error)),
      source: 'browser'
    };
    const headers = {
      'Content-Type': 'application/json'
    };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }
    fetch(`${apiBase}/logs`, {
      method: 'GET',
      headers,
      credentials: 'include',
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
