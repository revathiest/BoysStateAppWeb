// Check if user already has a program
async function checkExistingPrograms() {
  const apiBaseUrl = window.API_URL || "http://localhost:3000";
  const username = sessionStorage.getItem('user') || localStorage.getItem('user');

  if (!username) {
    showError("Unable to determine current user. Please log in again.");
    document.getElementById('createBtn').disabled = true;
    return;
  }

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const res = await fetch(`${apiBaseUrl}/user-programs/${encodeURIComponent(username)}`, {
      headers,
      credentials: 'include'
    });

    if (res.ok) {
      const data = await res.json();
      const programs = data.programs || [];

      if (programs.length > 0) {
        // User already has a program, prevent creating another
        const form = document.getElementById('createProgramForm');
        const programName = programs[0].programName || programs[0].name;

        form.innerHTML = `
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <svg class="inline w-16 h-16 mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 class="text-xl font-bold text-legend-blue mb-2">You already have a program</h2>
            <p class="text-gray-700 mb-4">Program: <strong>${programName}</strong></p>
            <p class="text-gray-600 text-sm mb-6">Currently, each user is limited to one program. If you need to manage multiple programs, please contact support.</p>
            <a href="console.html" class="inline-block bg-legend-blue text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-800 transition">
              Go to Dashboard
            </a>
          </div>
        `;
        return;
      }
    }
  } catch (err) {
    console.error("Error checking existing programs:", err);
    // Continue to allow form submission if check fails
  }
}

document.getElementById('createProgramForm').onsubmit = async function(e) {
    e.preventDefault();
    document.getElementById('formError').classList.add('hidden');
    document.getElementById('formSuccess').classList.add('hidden');

    const name = document.getElementById('name').value.trim();
    const year = document.getElementById('year').value.trim();

    if (!name || !year) {
      showError("Program name and year are required.");
      return;
    }
    if (isNaN(Number(year))) {
      showError("Year must be a number.");
      return;
    }

    // Use the global API URL from config.js
    const apiBaseUrl = window.API_URL || "http://localhost:3000";

    document.getElementById('createBtn').disabled = true;
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (typeof getAuthHeaders === 'function') {
        Object.assign(headers, getAuthHeaders());
      }
      const res = await fetch(`${apiBaseUrl}/programs`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name,
          year: Number(year)
        })
      });

      if (res.status === 201) {
        const data = await res.json();
        showSuccess(`Program created! <br><span class="font-mono text-xs">ID: ${data.id}</span><br>Name: <b>${data.name}</b> (${data.year})`);
        document.getElementById('name').value = '';
        document.getElementById('year').value = '';

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = 'console.html';
        }, 2000);
      } else {
        const err = await res.json();
        showError(err.error || "Failed to create program.");
      }
    } catch {
      showError("Network/server error.");
    }
    document.getElementById('createBtn').disabled = false;
  };

  function showError(msg) {
    const el = document.getElementById('formError');
    el.innerHTML = msg;
    el.classList.remove('hidden');
  }
  function showSuccess(msg) {
    const el = document.getElementById('formSuccess');
    el.innerHTML = msg;
    el.classList.remove('hidden');
  }

  // Check for existing programs on page load
  document.addEventListener('DOMContentLoaded', () => {
    checkExistingPrograms();

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (typeof clearAuthToken === 'function') clearAuthToken();
        window.location.href = 'login.html';
      });
    }
  });
