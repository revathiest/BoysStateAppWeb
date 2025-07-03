(() => {
  function parseJwt(token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return {};
    }
  }

  window.isTokenExpired = function(token) {
    if (!token) return true;
    const payload = parseJwt(token);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  };

  window.ensureValidToken = async function(apiBase) {
    let token = localStorage.getItem('jwtToken');
    if (!token) return null;
    if (!window.isTokenExpired(token)) {
      return token;
    }
    try {
      const res = await fetch(`${apiBase}/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('jwtToken', data.token);
          return data.token;
        }
      }
    } catch (err) {
      console.error('Token refresh failed', err);
      if (window.logToServer) {
        window.logToServer('Token refresh failed', { level: 'error', error: err });
      }
    }
    localStorage.removeItem('jwtToken');
    return null;
  };
})();
