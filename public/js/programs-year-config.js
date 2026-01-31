// programs-year-config.js
// Year-level configuration for activating parties, groupings, and positions
// This page allows admins to select which program-level items to activate for specific years

const apiBase = window.API_URL || "";

// Get username from session/localStorage
function getUsername() {
  return localStorage.getItem("user") || sessionStorage.getItem("user");
}

// Get programId from URL params or localStorage
function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('programId') || localStorage.getItem('lastSelectedProgramId') || '';
}

// Get selected year for the program
function getSelectedYear() {
  const programId = getProgramId();
  if (!programId) return null;
  const year = localStorage.getItem(`selectedYear_${programId}`);
  return year ? parseInt(year) : null;
}

// Get program year ID for the selected year
async function getProgramYearId(programId, year) {
  console.log('[DEBUG] getProgramYearId called with:', { programId, year, apiBase });

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const url = `${apiBase}/programs/${encodeURIComponent(programId)}/years`;
    console.log('[DEBUG] Fetching:', url);

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    console.log('[DEBUG] Response status:', response.status);

    if (!response.ok) throw new Error('Failed to load program years');
    const years = await response.json();
    console.log('[DEBUG] Years received:', years);

    const programYear = years.find(y => Number(y.year) === Number(year));
    console.log('[DEBUG] Matched programYear:', programYear);
    console.log('[DEBUG] programYear.id:', programYear ? programYear.id : 'programYear is null');

    return programYear ? programYear.id : null;
  } catch (err) {
    console.error('[DEBUG] Error in getProgramYearId:', err);
    return null;
  }
}

// Show error message
function showError(message) {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }
  if (successBox) {
    successBox.classList.add('hidden');
  }
}

// Show success message
function showSuccess(message) {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (successBox) {
    successBox.textContent = message;
    successBox.classList.remove('hidden');
  }
  if (errorBox) {
    errorBox.classList.add('hidden');
  }
}

// Clear messages
function clearMessages() {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) errorBox.classList.add('hidden');
  if (successBox) successBox.classList.add('hidden');
}

// Render program selector
function renderProgramSelector(programId, programName, year) {
  const container = document.getElementById("program-selector");
  if (!programId || !programName) {
    container.innerHTML = '<div class="text-red-600 font-semibold">No program selected. Please return to the dashboard.</div>';
    return;
  }

  const yearDisplay = year ? ` (${year})` : '';

  container.innerHTML = `
    <div class="mb-2 flex items-center">
      <span class="font-bold text-gray-700 mr-2">Program:</span>
      <span class="text-lg text-legend-blue font-semibold">${programName}${yearDisplay}</span>
    </div>
  `;
}

// Load years and populate year selector
async function loadYears() {
  const programId = getProgramId();
  console.log('[DEBUG] loadYears called with programId:', programId);

  if (!programId) {
    console.log('[DEBUG] No programId, returning early');
    return;
  }

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/years`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load years');
    const years = await response.json();

    const yearSelect = document.getElementById('year-select');
    if (years.length === 0) {
      yearSelect.innerHTML = '<option value="">No years configured</option>';
      showError('No years configured for this program. Please add a year first.');
      return;
    }

    // Get currently selected year or use most recent
    let selectedYear = getSelectedYear();
    if (!selectedYear && years.length > 0) {
      selectedYear = years[0].year;
      localStorage.setItem(`selectedYear_${programId}`, selectedYear.toString());
    }

    // Populate year selector
    yearSelect.innerHTML = years.map(y =>
      `<option value="${y.year}" ${y.year == selectedYear ? 'selected' : ''}>${y.year}</option>`
    ).join('');

    // Load configuration for selected year
    await loadYearConfiguration(selectedYear);

  } catch (err) {
    showError(err.message || 'Failed to load years');
    console.error('Error loading years:', err);
  }
}

// Load parties and their activation status for the selected year
async function loadYearConfiguration(year) {
  clearMessages();
  const programId = getProgramId();
  if (!programId || !year) return;

  // Update program selector with year
  const username = getUsername();
  if (username) {
    try {
      const headers = {};
      if (typeof getAuthHeaders === 'function') {
        Object.assign(headers, getAuthHeaders());
      }

      const response = await fetch(`${apiBase}/user-programs/${encodeURIComponent(username)}`, {
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const programs = data.programs || [];
        const program = programs.find(p => (p.programId || p.id) === programId);
        if (program) {
          renderProgramSelector(programId, program.programName || program.name, year);
        }
      }
    } catch (err) {
      console.error('Error fetching program info:', err);
    }
  }

  // Load parties
  await loadParties(programId, year);
}

// Load parties and their activation status
async function loadParties(programId, year) {
  console.log('[DEBUG] loadParties called with:', { programId, year });

  const loadingDiv = document.getElementById('parties-loading');
  const listDiv = document.getElementById('parties-list');
  const noneDiv = document.getElementById('parties-none');
  const saveBtn = document.getElementById('save-parties-btn');

  loadingDiv.classList.remove('hidden');
  listDiv.classList.add('hidden');
  noneDiv.classList.add('hidden');
  saveBtn.classList.add('hidden');

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Get all program-level parties
    const partiesResponse = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/parties`, {
      headers,
      credentials: 'include',
    });

    if (!partiesResponse.ok) {
      if (partiesResponse.status === 404 || partiesResponse.status === 204) {
        loadingDiv.classList.add('hidden');
        noneDiv.classList.remove('hidden');
        return;
      }
      throw new Error('Failed to load parties');
    }

    const allParties = await partiesResponse.json();
    const activeParties = allParties.filter(p => p.status !== 'retired');

    if (activeParties.length === 0) {
      loadingDiv.classList.add('hidden');
      noneDiv.classList.remove('hidden');
      return;
    }

    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get activated parties for this year
    let activatedPartyIds = [];
    try {
      const activatedResponse = await fetch(`${apiBase}/program-years/${programYearId}/parties`, {
        headers,
        credentials: 'include',
      });

      if (activatedResponse.ok) {
        const activatedParties = await activatedResponse.json();
        activatedPartyIds = activatedParties.map(p => p.partyId);
      }
    } catch (err) {
      console.warn('No activated parties yet:', err);
    }

    // Render parties with checkboxes (without inline styles to comply with CSP)
    listDiv.innerHTML = activeParties.map(party => `
      <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition cursor-pointer">
        <input
          type="checkbox"
          class="party-checkbox w-5 h-5 text-legend-blue focus:ring-2 focus:ring-legend-blue rounded"
          data-party-id="${party.id}"
          ${activatedPartyIds.includes(party.id) ? 'checked' : ''}
        />
        <div class="flex items-center gap-2 flex-1">
          <div class="party-color-indicator w-6 h-6 rounded-full border-2 border-gray-300" data-color="${party.color || '#1B3D6D'}"></div>
          <span class="font-semibold text-legend-blue">${escapeHtml(party.name)}</span>
        </div>
      </label>
    `).join('');

    // Set party colors via JavaScript to comply with CSP
    listDiv.querySelectorAll('.party-color-indicator').forEach(el => {
      el.style.backgroundColor = el.dataset.color;
    });

    loadingDiv.classList.add('hidden');
    listDiv.classList.remove('hidden');
    saveBtn.classList.remove('hidden');

  } catch (err) {
    showError(err.message || 'Failed to load parties');
    loadingDiv.classList.add('hidden');
    console.error('Error loading parties:', err);
  }
}

// Save party activations for the selected year
async function savePartyActivations() {
  clearMessages();
  const programId = getProgramId();
  const year = parseInt(document.getElementById('year-select').value);

  if (!programId || !year) {
    showError('Program or year not selected');
    return;
  }

  const saveBtn = document.getElementById('save-parties-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get checked party IDs
    const checkboxes = document.querySelectorAll('.party-checkbox');
    const selectedPartyIds = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.partyId));

    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Send activation request
    const response = await fetch(`${apiBase}/program-years/${programYearId}/parties/activate`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ partyIds: selectedPartyIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save party activations');
    }

    showSuccess(`Successfully activated ${selectedPartyIds.length} ${selectedPartyIds.length === 1 ? 'party' : 'parties'} for ${year}`);

    // Reload to show updated state
    setTimeout(() => loadYearConfiguration(year), 1000);

  } catch (err) {
    showError(err.message || 'Failed to save party activations');
    console.error('Error saving party activations:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Party Activations';
  }
}

// Helper to safely escape HTML
function escapeHtml(str) {
  return ('' + str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Setup event listeners
function setupEventListeners() {
  // Year selector change
  document.getElementById('year-select').addEventListener('change', (e) => {
    const year = parseInt(e.target.value);
    const programId = getProgramId();
    if (programId && year) {
      localStorage.setItem(`selectedYear_${programId}`, year.toString());
      loadYearConfiguration(year);
    }
  });

  // Save parties button
  document.getElementById('save-parties-btn').addEventListener('click', savePartyActivations);

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  const programId = getProgramId();

  if (!programId) {
    showError('No program selected. Please select a program from the dashboard.');
    return;
  }

  setupEventListeners();
  await loadYears();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    getSelectedYear,
    getProgramYearId,
    loadYears,
    loadYearConfiguration,
    loadParties,
    savePartyActivations
  };
}
