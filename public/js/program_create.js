document.addEventListener('DOMContentLoaded', async () => {
  const apiBase = typeof window.API_URL === 'string' && window.API_URL.trim()
    ? window.API_URL
    : null;
  if (!apiBase) {
    alert('Configuration error: API_URL is not set. Please contact the site administrator.');
    return;
  }
  let token = await window.ensureValidToken(apiBase);
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('createProgramForm');
  const msg = document.getElementById('createMsg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new URLSearchParams(new FormData(form));
    let resp;
    try {
      token = await window.ensureValidToken(apiBase);
      if (!token) {
        window.location.href = 'login.html';
        return;
      }
      resp = await fetch(`${apiBase}/create-program`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data.toString()
      });
    } catch (err) {
      console.error('Network error creating program', err);
      msg.textContent = 'Unable to reach server.';
      msg.className = 'text-red-600';
      return;
    }
    if (resp.status === 201) {
      msg.textContent = 'Program created!';
      msg.className = 'text-green-700';
      setTimeout(() => window.location.href = 'dashboard.html', 500);
    } else {
      const text = await resp.text();
      msg.textContent = text || 'Error';
      msg.className = 'text-red-600';
    }
  });
});
