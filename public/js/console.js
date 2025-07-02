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

