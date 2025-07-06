document.addEventListener('DOMContentLoaded', async () => {
  if (window.logToServer) {
    window.logToServer('Loaded console page', { level: 'info' });
  }
  const apiBase = typeof window.API_URL === 'string' && window.API_URL.trim()
    ? window.API_URL
    : null;
  if (!apiBase) {
    alert('Configuration error: API_URL is not set. Please contact the site administrator.');
    return;
  }
  try {
    const res = await fetch(`${apiBase}/programs`, {
      credentials: 'include',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {},
    });
    if (res.ok) {
      const programs = await res.json().catch(() => null);
      console.log('Loaded programs', programs);
      if (window.logToServer) {
        window.logToServer('Loaded programs', { level: 'info' });
      }
    } else if (res.status === 401) {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
      return;
    }
  } catch (err) {
    console.error('Network error while loading programs', err);
    if (window.logToServer) {
      window.logToServer('Network error while loading programs', { level: 'error', error: err });
    }
  }

document.getElementById('main-content').classList.remove('hidden');

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html'; // Redirect to login or home
    });
  }

});

