// programs-parties.js
// Program-level party management
// This page manages parties at the program level (defining parties that can be used across years)
// For year-specific activation, see programs-year-config.js (activating parties for specific years)

const apiBase = window.API_URL || "";

// Cache for program settings
let cachedProgramSettings = null;

// Get username from session/localStorage
function getUsername() {
  return localStorage.getItem("user") || sessionStorage.getItem("user");
}

// Fetch program settings (cached)
async function getProgramSettings() {
  if (cachedProgramSettings) return cachedProgramSettings;

  const programId = getProgramId();
  if (!programId) return null;

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}`, {
      headers,
      credentials: 'include',
    });

    if (response.ok) {
      cachedProgramSettings = await response.json();
      return cachedProgramSettings;
    }
  } catch (err) {
    console.error('Error fetching program settings:', err);
  }
  return null;
}

// Get program's primary model (for display purposes)
async function getProgramPrimaryModel() {
  const settings = await getProgramSettings();
  return settings?.defaultPrimaryModel || 'closed';
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
function renderProgramSelector(programId, programName) {
  const container = document.getElementById("program-selector");
  if (!programId || !programName) {
    container.innerHTML = '<div class="text-red-600 font-semibold">No program selected. Please return to the dashboard.</div>';
    return;
  }

  const year = getSelectedYear();
  const yearDisplay = year ? ` (${year})` : '';

  container.innerHTML = `
    <div class="mb-2 flex items-center">
      <span class="font-bold text-gray-700 mr-2">Program:</span>
      <span class="text-lg text-legend-blue font-semibold">${programName}${yearDisplay}</span>
    </div>
  `;
}

// Load parties from API (program-level)
async function loadParties() {
  const programId = getProgramId();
  const partiesList = document.getElementById('parties-list');

  if (!programId) {
    showError('No program selected. Please select a program first.');
    partiesList.innerHTML = '<p class="text-gray-500">No program selected.</p>';
    return;
  }

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Get program-level parties
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/parties`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 204) {
        partiesList.innerHTML = '<p class="text-gray-500 italic">No parties defined yet. Add your first party or use the quick setup below.</p>';
        document.getElementById('default-parties-section').classList.remove('hidden');
        return;
      }
      throw new Error('Failed to load parties');
    }

    const parties = await response.json();

    if (!parties || parties.length === 0) {
      partiesList.innerHTML = '<p class="text-gray-500 italic">No parties defined yet. Add your first party or use the quick setup below.</p>';
      document.getElementById('default-parties-section').classList.remove('hidden');
      return;
    }

    // Hide default parties section if we have parties
    document.getElementById('default-parties-section').classList.add('hidden');

    // Filter out retired parties
    const activeParties = parties.filter(p => p.status !== 'retired');

    if (activeParties.length === 0) {
      partiesList.innerHTML = '<p class="text-gray-500 italic">No active parties. Add your first party or use the quick setup below.</p>';
      document.getElementById('default-parties-section').classList.remove('hidden');
      return;
    }

    // Render parties (without inline styles to comply with CSP)
    // Note: Primary Model and Advancement Model are now program-level (set in Election Settings)
    partiesList.innerHTML = activeParties.map(party => {
      return `
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition">
        <div class="flex items-center gap-3">
          <div class="party-color-indicator w-8 h-8 rounded-full border-2 border-gray-300" data-color="${party.color || '#1B3D6D'}"></div>
          <div>
            <h3 class="font-semibold text-legend-blue">${escapeHtml(party.name)}</h3>
            <p class="text-xs text-gray-500">${party.color || 'No color set'}</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="edit-party-btn text-legend-blue hover:text-blue-800 font-semibold transition"
                  data-id="${party.id}"
                  data-name="${escapeHtml(party.name)}"
                  data-color="${party.color || '#1B3D6D'}">
            Edit
          </button>
          <button class="delete-party-btn text-red-600 hover:text-red-800 font-semibold transition" data-id="${party.id}" data-name="${escapeHtml(party.name)}">
            Delete
          </button>
        </div>
      </div>
    `;
    }).join('');

    // Set party colors via JavaScript to comply with CSP
    document.querySelectorAll('.party-color-indicator').forEach(el => {
      el.style.backgroundColor = el.dataset.color;
    });

    // Attach delete handlers
    document.querySelectorAll('.delete-party-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const partyId = e.target.dataset.id;
        const partyName = e.target.dataset.name;
        showConfirmation(
          'Delete Party',
          `Are you sure you want to delete "${partyName}"? This action cannot be undone.`,
          'Delete',
          () => deleteParty(partyId)
        );
      });
    });

    // Attach edit handlers
    document.querySelectorAll('.edit-party-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const partyId = e.target.dataset.id;
        const partyName = e.target.dataset.name;
        const partyColor = e.target.dataset.color;
        openEditPartyModal(partyId, partyName, partyColor);
      });
    });

  } catch (err) {
    showError(err.message || 'Failed to load parties');
    partiesList.innerHTML = '<p class="text-red-600">Error loading parties.</p>';
  }
}

// Add a new party (program-level)
async function saveParty(name, color) {
  const programId = getProgramId();
  const statusDiv = document.getElementById('party-form-status');
  statusDiv.classList.add('hidden');

  if (!programId) {
    statusDiv.textContent = 'Program ID not available.';
    statusDiv.classList.remove('hidden', 'text-green-700');
    statusDiv.classList.add('text-red-600');
    return;
  }

  if (!name || name.trim().length === 0) {
    statusDiv.textContent = 'Party name is required.';
    statusDiv.classList.remove('hidden', 'text-green-700');
    statusDiv.classList.add('text-red-600');
    return;
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Note: primaryModel and advancementModel are now set at the program level (Election Settings), not per-party
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/parties`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        name: name.trim(),
        color: color || '#1B3D6D',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create party');
    }

    // Success - reload parties and hide form
    await loadParties();
    resetPartyForm();
    showSuccess('Party added successfully!');

  } catch (err) {
    statusDiv.textContent = err.message || 'Failed to create party';
    statusDiv.classList.remove('hidden', 'text-green-700');
    statusDiv.classList.add('text-red-600');
  }
}

// Reset the party form to defaults
function resetPartyForm() {
  document.getElementById('add-party-form').classList.add('hidden');
  document.getElementById('party-name-input').value = '';
  document.getElementById('party-color-input').value = '#1B3D6D';
  document.getElementById('party-form-status').classList.add('hidden');
}

// Delete a party (soft delete - sets status to retired)
async function deleteParty(partyId) {
  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/parties/${partyId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 204) {
        showError('Party not found.');
        return;
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete party');
    }

    showSuccess('Party deleted successfully.');
    await loadParties();

  } catch (err) {
    showError(err.message || 'Failed to delete party');
  }
}

// Open the edit party modal
function openEditPartyModal(partyId, name, color) {
  const modal = document.getElementById('edit-party-modal');
  const statusDiv = document.getElementById('edit-party-status');

  // Populate form fields (primaryModel and advancementModel are now program-level, not per-party)
  document.getElementById('edit-party-id').value = partyId;
  document.getElementById('edit-party-name').value = name;
  document.getElementById('edit-party-color').value = color;

  // Clear any previous status
  statusDiv.classList.add('hidden');
  statusDiv.textContent = '';

  modal.classList.remove('hidden');
}

// Close the edit party modal
function closeEditPartyModal() {
  document.getElementById('edit-party-modal').classList.add('hidden');
}

// Update an existing party
async function updateParty() {
  const partyId = document.getElementById('edit-party-id').value;
  const name = document.getElementById('edit-party-name').value;
  const color = document.getElementById('edit-party-color').value;
  const statusDiv = document.getElementById('edit-party-status');

  // Validate
  if (!name || name.trim().length === 0) {
    statusDiv.textContent = 'Party name is required.';
    statusDiv.classList.remove('hidden');
    return;
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Note: primaryModel and advancementModel are now set at the program level (Election Settings), not per-party
    const response = await fetch(`${apiBase}/parties/${partyId}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        name: name.trim(),
        color: color,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update party');
    }

    // Success - close modal and reload
    closeEditPartyModal();
    showSuccess('Party updated successfully!');
    await loadParties();

  } catch (err) {
    statusDiv.textContent = err.message || 'Failed to update party';
    statusDiv.classList.remove('hidden');
  }
}

// Add default parties (Federalists and Nationalists)
async function addDefaultParties() {
  const programId = getProgramId();

  if (!programId) {
    showError('Program ID not available.');
    return;
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Add Federalists
    const federalistsRes = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/parties`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ name: 'Federalists', color: '#1B3D6D' }),
    });

    if (!federalistsRes.ok) throw new Error('Failed to add Federalists');

    // Add Nationalists
    const nationalistsRes = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/parties`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ name: 'Nationalists', color: '#DC143C' }),
    });

    if (!nationalistsRes.ok) throw new Error('Failed to add Nationalists');

    showSuccess('Default parties added successfully!');
    await loadParties();

  } catch (err) {
    showError(err.message || 'Failed to add default parties');
  }
}

// Show confirmation modal
function showConfirmation(title, message, confirmText, onConfirm) {
  const modal = document.getElementById('confirmation-modal');
  const titleEl = document.getElementById('confirmation-title');
  const messageEl = document.getElementById('confirmation-message');
  const confirmBtn = document.getElementById('confirmation-confirm-btn');

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;

  // Remove any existing click handlers and add new one
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    onConfirm();
  });

  modal.classList.remove('hidden');
}

// Close confirmation modal
function closeConfirmation() {
  document.getElementById('confirmation-modal').classList.add('hidden');
}

// Helper to safely escape HTML
function escapeHtml(str) {
  return ('' + str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Get human-readable label for primary model
function getPrimaryModelLabel(model) {
  const labels = {
    closed: 'Closed Primary',
    open: 'Open Primary',
    semi_open: 'Semi-Open Primary',
    blanket: 'Blanket Primary',
  };
  return labels[model] || model;
}

// Get human-readable label for advancement model
function getAdvancementModelLabel(model) {
  const labels = {
    traditional: 'Traditional',
    top_2: 'Top 2',
    top_4_irv: 'Top 4 + RCV',
  };
  return labels[model] || model;
}

// Setup event listeners
function setupEventListeners() {
  // Add party button
  document.getElementById('add-party-btn').addEventListener('click', () => {
    const form = document.getElementById('add-party-form');
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
      document.getElementById('party-name-input').focus();
    }
  });

  // Cancel button
  document.getElementById('cancel-party-btn').addEventListener('click', () => {
    resetPartyForm();
  });

  // Save party button (primaryModel and advancementModel are now program-level, set in Election Settings)
  document.getElementById('save-party-btn').addEventListener('click', () => {
    const name = document.getElementById('party-name-input').value;
    const color = document.getElementById('party-color-input').value;
    saveParty(name, color);
  });

  // Add default parties button
  document.getElementById('add-default-parties-btn').addEventListener('click', () => {
    showConfirmation(
      'Add Default Parties',
      'This will add Federalists (blue) and Nationalists (red) parties to your program. Continue?',
      'Add Parties',
      addDefaultParties
    );
  });

  // Confirmation modal cancel
  document.getElementById('confirmation-cancel-btn').addEventListener('click', closeConfirmation);
  document.getElementById('confirmation-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeConfirmation();
  });

  // Edit party modal handlers
  document.getElementById('edit-party-cancel-btn').addEventListener('click', closeEditPartyModal);
  document.getElementById('edit-party-save-btn').addEventListener('click', updateParty);
  document.getElementById('edit-party-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditPartyModal();
  });

  // Allow Enter key to save in edit modal
  document.getElementById('edit-party-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('edit-party-save-btn').click();
    }
  });

  // Allow Enter key to save
  document.getElementById('party-name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('save-party-btn').click();
    }
  });

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

  // Fetch program info to display
  try {
    const username = getUsername();
    if (username) {
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
          renderProgramSelector(programId, program.programName || program.name);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching program info:', err);
  }

  setupEventListeners();
  await loadParties();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    getSelectedYear,
    loadParties,
    saveParty,
    updateParty,
    deleteParty,
    addDefaultParties,
    resetPartyForm,
    openEditPartyModal,
    closeEditPartyModal,
    getPrimaryModelLabel,
    getAdvancementModelLabel,
    getProgramSettings,
    getProgramPrimaryModel
  };
}
