// Update navigation links to include programId from localStorage
function updateNavLinks() {
  const programId = localStorage.getItem('lastSelectedProgramId');
  if (!programId) return;

  const links = {
    'user-management-link': 'user-management.html',
    'programs-config-link': 'programs-config.html',
  };

  for (const [id, basePath] of Object.entries(links)) {
    const link = document.getElementById(id);
    if (link) {
      link.href = `${basePath}?programId=${encodeURIComponent(programId)}`;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Update links with programId
  updateNavLinks();

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
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const programs = data?.programs || [];
      console.log('Loaded programs', programs);
      if (window.logToServer) {
        window.logToServer('Loaded programs', { level: 'info' });
      }

      // Auto-select program if user has programs
      if (programs.length > 0) {
        const currentProgramId = localStorage.getItem('lastSelectedProgramId');
        const validProgram = programs.find(p => (p.programId || p.id) === currentProgramId);

        if (!validProgram) {
          // No valid selection - auto-select first (or only) program
          const firstProgram = programs[0];
          const programId = firstProgram.programId || firstProgram.id;
          localStorage.setItem('lastSelectedProgramId', programId);
          console.log('Auto-selected program:', programId);
        }

        // Update nav links now that we have a valid programId
        updateNavLinks();
      }
    } else if (res.status === 401) {
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
      window.location.href = 'login.html'; // Redirect to login or home
    });
  }

});

