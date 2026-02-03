// Update navigation links to include programId from localStorage
function updateNavLinks() {
  const programId = localStorage.getItem('lastSelectedProgramId');
  if (!programId) return;

  const links = {
    'user-management-link': 'user-management.html',
    'programs-config-link': 'programs-config.html',
    'elections-link': 'elections-management.html',
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
    console.log('Console: /programs response status =', res.status, res.ok);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      console.log('Console: /programs raw data =', data);
      // Handle both array response and { programs: [...] } response
      const programs = Array.isArray(data) ? data : (data?.programs || []);
      console.log('Console: Loaded programs array =', programs);
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

  // Apply permissions to show/hide cards based on user's role
  const programId = localStorage.getItem('lastSelectedProgramId');
  console.log('Console: programId =', programId);
  if (typeof applyConsoleParentVisibility === 'function') {
    console.log('Console: calling applyConsoleParentVisibility');
    const result = await applyConsoleParentVisibility(programId);
    console.log('Console: permissions result =', result);

    // Show error message if permissions couldn't be loaded
    if (result.error || !result.hasVisibleCards) {
      const mainContent = document.getElementById('main-content');
      const grid = mainContent.querySelector('.grid');
      if (grid) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center';
        errorDiv.innerHTML = result.error
          ? `<p class="text-yellow-800 font-medium">Unable to load permissions.</p>
             <p class="text-yellow-700 text-sm mt-2">Please try refreshing the page or logging out and back in.</p>
             <p class="text-yellow-600 text-xs mt-2">Error: ${result.error}</p>`
          : `<p class="text-yellow-800 font-medium">No accessible features found.</p>
             <p class="text-yellow-700 text-sm mt-2">You don't have permissions for any features. Contact your program administrator.</p>`;
        grid.prepend(errorDiv);
      }
    }
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

});

