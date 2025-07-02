document.addEventListener('DOMContentLoaded', async () => {
  console.log("On console.html, jwtToken:", localStorage.getItem('jwtToken'));
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

  let userEmail = null;
  try {
    userEmail = JSON.parse(atob(token.split('.')[1])).email;
  } catch (e) {
    console.error('Failed to parse user email from token', e);
  }
  if (!userEmail) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${apiBase}/programs/${encodeURIComponent(userEmail)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const programs = await res.json().catch(() => null);
      console.log('Loaded programs', programs);
    } else if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }
  } catch (err) {
    console.error('Network error while loading programs', err);
  }

document.getElementById('main-content').classList.remove('hidden');

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('jwtToken');
      jwtToken = null;
      window.location.href = 'login.html'; // Redirect to login or home
    });
  }

  // Optionally: Block access if token missing
  if (!token) {
    window.location.href = 'login.html';
  }
});

