// programs-config.js

const apiBase = window.API_URL || ""; // Or your own config mechanism

// Get username from localStorage/sessionStorage/JWT -- adjust as needed
function getUsername() {
  // Try localStorage, sessionStorage, or parse from JWT if you store it
  return localStorage.getItem("user") || sessionStorage.getItem("user");
}

// Render the program selector (dropdown or label)
function renderProgramSelector(programs, selectedProgramId) {
  const container = document.getElementById("program-selector");
  container.innerHTML = "";

  if (programs.length === 1) {
    const p = programs[0];
    container.innerHTML = `
      <div class="mb-2 flex items-center">
        <span class="font-bold text-blue-900 mr-2">Program:</span>
        <span class="text-lg text-legend-blue">${p.programName || p.name}</span>
        <input type="hidden" id="current-program-id" value="${p.programId || p.id}">
      </div>
    `;
    updateConfigLinks(p.programId || p.id);
  } else if (programs.length > 1) {
    // Dropdown menu
    const options = programs
      .map(
        (p) =>
          `<option value="${p.programId || p.id}" ${
            (p.programId || p.id) === selectedProgramId ? "selected" : ""
          }>${p.programName || p.name}</option>`
      )
      .join("");
    container.innerHTML = `
      <label class="font-bold text-blue-900 mr-2" for="program-select">Program:</label>
      <select id="program-select" class="border rounded px-2 py-1 focus:outline-none">
        ${options}
      </select>
    `;
    document
      .getElementById("program-select")
      .addEventListener("change", (e) => {
        updateConfigLinks(e.target.value);
      });
    // Set the links initially
    updateConfigLinks(selectedProgramId || (programs[0].programId || programs[0].id));
  } else {
    // No programs found
    container.innerHTML = `<div class="text-red-600 font-semibold">No programs found for this user.</div>`;
  }
}

// Update all config links with selected programId
function updateConfigLinks(programId) {
  if (!programId) return;

  // Only update active feature links
  const brandingLink = document.getElementById("brandingLink");
  if (brandingLink) {
    brandingLink.href = `branding-contact.html?programId=${encodeURIComponent(programId)}`;
  }

  const applicationConfigLink = document.getElementById("applicationConfigLink");
  if (applicationConfigLink) {
    applicationConfigLink.href = `application-config.html?programId=${encodeURIComponent(programId)}`;
  }

  const partiesLink = document.getElementById("partiesLink");
  if (partiesLink) {
    partiesLink.href = `programs-parties.html?programId=${encodeURIComponent(programId)}`;
  }

  const yearConfigLink = document.getElementById("year-config-link");
  if (yearConfigLink) {
    yearConfigLink.href = `programs-year-config.html?programId=${encodeURIComponent(programId)}`;
  }

  const groupingsLink = document.getElementById("groupingsLink");
  if (groupingsLink) {
    groupingsLink.href = `programs-groupings.html?programId=${encodeURIComponent(programId)}`;
  }

  const positionsLink = document.getElementById("positionsLink");
  if (positionsLink) {
    positionsLink.href = `programs-positions.html?programId=${encodeURIComponent(programId)}`;
  }

  const emailConfigLink = document.getElementById("emailConfigLink");
  if (emailConfigLink) {
    emailConfigLink.href = `email-config.html?programId=${encodeURIComponent(programId)}`;
  }

  const emailTemplatesLink = document.getElementById("emailTemplatesLink");
  if (emailTemplatesLink) {
    emailTemplatesLink.href = `email-templates.html?programId=${encodeURIComponent(programId)}`;
  }

  const rolesLink = document.getElementById("rolesLink");
  if (rolesLink) {
    rolesLink.href = `programs-roles.html?programId=${encodeURIComponent(programId)}`;
  }

  // Store for other navigation
  window.selectedProgramId = programId;
  // Load years for this program
  loadProgramYears(programId);
  // Load election settings
  loadElectionSettings(programId);
}

async function fetchProgramsAndRenderSelector() {
  const username = getUsername();
  if (!username) {
    document.getElementById("program-selector").innerHTML =
      "<span class='text-red-600 font-semibold'>No user found. Please log in again.</span>";
    return;
  }

  try {
    const response = await fetch(
      `${apiBase}/user-programs/${encodeURIComponent(username)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
      }
    );
    if (!response.ok) throw new Error("Failed to fetch programs.");
    const data = await response.json();
    // API returns { username, programs: [...] }
    const programs = data.programs || [];
    let lastSelected = localStorage.getItem("lastSelectedProgramId");
    let selected = lastSelected && programs.some(p => (p.programId || p.id) === lastSelected)
      ? lastSelected
      : programs[0]?.programId || programs[0]?.id;

    // If localStorage had a stale/invalid value, update it to the actual selected program
    if (selected && selected !== lastSelected) {
      localStorage.setItem("lastSelectedProgramId", selected);
    }

    renderProgramSelector(programs, selected);

    // If you want to remember user selection
    document.getElementById("program-selector").addEventListener("change", (e) => {
      localStorage.setItem("lastSelectedProgramId", e.target.value);
    });

  } catch (e) {
    document.getElementById("program-selector").innerHTML =
      `<span class='text-red-600 font-semibold'>Error loading programs: ${e.message}</span>`;
  }
}

// Year Management
async function loadProgramYears(programId) {
  const yearsList = document.getElementById('years-list');
  if (!programId || !yearsList) return;

  try {
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/years`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load years');
    const years = await response.json();

    // Get currently selected year (from localStorage or default to most recent)
    let selectedYear = localStorage.getItem(`selectedYear_${programId}`);
    if (!selectedYear && years.length > 0) {
      selectedYear = years[0].year.toString();
      localStorage.setItem(`selectedYear_${programId}`, selectedYear);
    }
    window.selectedYear = selectedYear ? parseInt(selectedYear) : null;

    if (years.length === 0) {
      yearsList.innerHTML = '<span class="text-gray-500 italic">No years configured yet. Click "Add Year" to get started.</span>';
    } else if (years.length === 1) {
      // Single year - just display it
      yearsList.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-gray-600 font-medium">Current Year:</span>
          <span class="inline-block bg-legend-blue text-white px-4 py-2 rounded-full font-bold">${years[0].year}</span>
        </div>
      `;
    } else {
      // Multiple years - show dropdown selector
      const options = years.map(y =>
        `<option value="${y.year}" ${y.year == selectedYear ? 'selected' : ''}>${y.year}</option>`
      ).join('');

      yearsList.innerHTML = `
        <div class="flex items-center gap-3">
          <label for="year-selector" class="text-gray-600 font-medium">Selected Year:</label>
          <select id="year-selector" class="border border-gray-300 rounded-lg px-3 py-2 font-semibold text-legend-blue focus:outline-none focus:ring-2 focus:ring-legend-blue">
            ${options}
          </select>
        </div>
      `;

      // Add change listener
      document.getElementById('year-selector').addEventListener('change', (e) => {
        const newYear = e.target.value;
        localStorage.setItem(`selectedYear_${programId}`, newYear);
        window.selectedYear = parseInt(newYear);
        // Dispatch event for other components to listen to
        document.dispatchEvent(new CustomEvent('yearChanged', { detail: { year: newYear, programId } }));
      });
    }
  } catch (err) {
    yearsList.innerHTML = '<span class="text-red-600">Failed to load years</span>';
    console.error('Error loading years:', err);
  }
}

async function saveNewYear(programId, year) {
  const statusDiv = document.getElementById('year-form-status');
  statusDiv.classList.add('hidden');

  try {
    // Check if user wants to copy from previous year
    const copyCheckbox = document.getElementById('copy-from-previous-checkbox');
    const copyFromPreviousYear = copyCheckbox?.checked || false;

    const requestBody = {
      year: Number(year),
      status: 'active',
      ...(copyFromPreviousYear ? { copyFromPreviousYear: true } : {})
    };

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/years`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create year');
    }

    // Success - reload years and hide form
    await loadProgramYears(programId);
    document.getElementById('add-year-form').classList.add('hidden');
    document.getElementById('new-year-input').value = '';
    if (copyCheckbox) copyCheckbox.checked = false;

    const successMsg = copyFromPreviousYear
      ? 'Year added successfully! Copied configuration from previous year.'
      : 'Year added successfully!';
    statusDiv.textContent = successMsg;
    statusDiv.classList.remove('hidden', 'text-red-600');
    statusDiv.classList.add('text-green-700');
  } catch (err) {
    statusDiv.textContent = err.message || 'Failed to create year';
    statusDiv.classList.remove('hidden', 'text-green-700');
    statusDiv.classList.add('text-red-600');
  }
}

// Election Settings
async function loadElectionSettings(programId) {
  const votingMethodSelect = document.getElementById('voting-method-select');
  if (!programId || !votingMethodSelect) return;

  try {
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load program settings');
    const program = await response.json();

    // Set the voting method dropdown
    votingMethodSelect.value = program.defaultVotingMethod || 'plurality';
  } catch (err) {
    console.error('Error loading election settings:', err);
  }
}

async function saveVotingMethod(programId, method) {
  const statusDiv = document.getElementById('voting-method-status');

  try {
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({ defaultVotingMethod: method }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save voting method');
    }

    // Show success message
    statusDiv.textContent = 'Voting method saved successfully';
    statusDiv.classList.remove('hidden', 'text-red-600');
    statusDiv.classList.add('text-green-700');
    setTimeout(() => statusDiv.classList.add('hidden'), 3000);
  } catch (err) {
    statusDiv.textContent = err.message || 'Failed to save voting method';
    statusDiv.classList.remove('hidden', 'text-green-700');
    statusDiv.classList.add('text-red-600');
  }
}

function setupElectionSettings() {
  const votingMethodSelect = document.getElementById('voting-method-select');
  if (!votingMethodSelect) return;

  votingMethodSelect.addEventListener('change', () => {
    const programId = window.selectedProgramId || document.getElementById('current-program-id')?.value;
    if (programId) {
      saveVotingMethod(programId, votingMethodSelect.value);
    }
  });
}

function setupYearManagement() {
  const addYearBtn = document.getElementById('add-year-btn');
  const addYearForm = document.getElementById('add-year-form');
  const saveYearBtn = document.getElementById('save-year-btn');
  const cancelYearBtn = document.getElementById('cancel-year-btn');
  const newYearInput = document.getElementById('new-year-input');

  if (!addYearBtn) return;

  addYearBtn.addEventListener('click', () => {
    addYearForm.classList.toggle('hidden');
    newYearInput.focus();
  });

  cancelYearBtn.addEventListener('click', () => {
    addYearForm.classList.add('hidden');
    newYearInput.value = '';
    const copyCheckbox = document.getElementById('copy-from-previous-checkbox');
    if (copyCheckbox) copyCheckbox.checked = false;
    document.getElementById('year-form-status').classList.add('hidden');
  });

  saveYearBtn.addEventListener('click', () => {
    const year = newYearInput.value.trim();
    const programId = window.selectedProgramId || document.getElementById('current-program-id')?.value;

    if (!year || !programId) {
      const statusDiv = document.getElementById('year-form-status');
      statusDiv.textContent = 'Please enter a valid year';
      statusDiv.classList.remove('hidden', 'text-green-700');
      statusDiv.classList.add('text-red-600');
      return;
    }

    saveNewYear(programId, year);
  });

  // Allow Enter key to save
  newYearInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveYearBtn.click();
    }
  });
}

// On load
document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

  // Check if user has access to this page (any program_config permission)
  const programId = localStorage.getItem('lastSelectedProgramId') ||
    new URLSearchParams(window.location.search).get('programId');
  if (programId && typeof checkPageAccess === 'function') {
    const hasAccess = await checkPageAccess(programId, 'program_config.');
    if (!hasAccess) return; // Redirect handled by checkPageAccess
  }

  // Apply permissions to show/hide cards
  if (programId && typeof applyPermissions === 'function') {
    await applyPermissions(programId);
  }

  fetchProgramsAndRenderSelector();
  setupYearManagement();
  setupElectionSettings();
});

// Utility function for other pages to get selected year
function getSelectedYear(programId) {
  if (!programId) {
    programId = window.selectedProgramId || localStorage.getItem('lastSelectedProgramId');
  }
  return programId ? parseInt(localStorage.getItem(`selectedYear_${programId}`)) : null;
}

// Make it available globally
window.getSelectedYear = getSelectedYear;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getUsername,
    renderProgramSelector,
    updateConfigLinks,
    fetchProgramsAndRenderSelector,
    loadProgramYears,
    getSelectedYear,
    loadElectionSettings,
    saveVotingMethod,
    setupElectionSettings
  };
}

