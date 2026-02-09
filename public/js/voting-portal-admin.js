/**
 * ============================================================================
 * VOTING PORTAL - ADMIN TEST/SPOOF SCRIPT
 * ============================================================================
 *
 * IMPORTANT: This file works with voting-portal.js (shared core logic).
 *
 * This script allows admins to test the voting system by selecting any delegate
 * from a dropdown and voting on their behalf (for testing purposes).
 *
 * KEEP IN SYNC: The voting-portal-public.js file is for actual delegate voting
 * via voter ID entry, but uses the same core voting logic.
 * ============================================================================
 */

// NOTE: API_URL is already declared in voting-portal.js which is loaded first

// Program context
let programId = null;
let programYearId = null;

// Delegates list
let allDelegates = [];
let filteredDelegates = [];

/**
 * Initialize the admin voting portal on page load
 */
async function initAdminVotingPortal() {
  // Require authentication
  if (typeof requireAuth === 'function') {
    requireAuth();
  }

  // Get program context from URL params or localStorage
  const params = new URLSearchParams(window.location.search);
  programId = params.get('programId') || localStorage.getItem('lastSelectedProgramId');
  programYearId = params.get('programYearId') || localStorage.getItem('lastSelectedProgramYearId');

  if (!programId) {
    showError('No program selected. Please go back to elections management.');
    disableDelegateSelection();
    return;
  }

  // Set up logout handler
  setupLogoutHandler();

  // If no programYearId, try to get the active one
  if (!programYearId) {
    await loadActiveProgramYear();
  }

  if (!programYearId) {
    showError('No active program year found. Please select a program year first.');
    disableDelegateSelection();
    return;
  }

  // Load delegates
  await loadDelegates();

  // Set up delegate selection
  setupDelegateSelection();
}

/**
 * Load the active program year for the program
 */
async function loadActiveProgramYear() {
  try {
    const response = await fetch(`${API_URL}/programs/${programId}/years`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      console.error('Failed to load program years');
      return;
    }

    const years = await response.json();

    // Find the active year (most recent by default)
    if (years.length > 0) {
      // Sort by year descending and take the first
      years.sort((a, b) => b.year - a.year);
      programYearId = years[0].id;
      localStorage.setItem('lastSelectedProgramYearId', programYearId);
    }
  } catch (err) {
    console.error('Error loading program years:', err);
  }
}

/**
 * Load delegates for the program year
 */
async function loadDelegates() {
  const selectEl = document.getElementById('delegate-select');

  try {
    const response = await fetch(`${API_URL}/program-years/${programYearId}/delegates`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to load delegates');
    }

    // API returns paginated response: { delegates, total, page, pageSize, totalPages }
    const data = await response.json();
    allDelegates = data.delegates || [];

    // Sort by name
    allDelegates.sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    filteredDelegates = [...allDelegates];
    renderDelegateOptions();
  } catch (err) {
    console.error('Error loading delegates:', err);
    showError('Failed to load delegates. Please try again.');

    if (selectEl) {
      selectEl.innerHTML = '<option value="">-- Error loading delegates --</option>';
    }
  }
}

/**
 * Render delegate options in the select dropdown
 */
function renderDelegateOptions() {
  const selectEl = document.getElementById('delegate-select');
  if (!selectEl) return;

  const options = ['<option value="">-- Select a delegate --</option>'];

  filteredDelegates.forEach(delegate => {
    const partyInfo = delegate.party?.party?.name ? ` (${delegate.party.party.name})` : '';
    const groupingInfo = delegate.grouping?.name ? ` - ${delegate.grouping.name}` : '';
    const voterIdInfo = delegate.voterId ? ` [${delegate.voterId}]` : '';

    options.push(
      `<option value="${delegate.id}">${escapeHtmlForOption(delegate.lastName)}, ${escapeHtmlForOption(delegate.firstName)}${partyInfo}${groupingInfo}${voterIdInfo}</option>`
    );
  });

  selectEl.innerHTML = options.join('');
}

/**
 * Set up delegate selection controls
 */
function setupDelegateSelection() {
  const searchInput = document.getElementById('delegate-search-input');
  const selectEl = document.getElementById('delegate-select');
  const submitBtn = document.getElementById('voter-id-submit-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterDelegates(e.target.value);
    });
  }

  if (selectEl) {
    selectEl.addEventListener('change', () => {
      if (submitBtn) {
        submitBtn.disabled = !selectEl.value;
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', selectDelegate);
    submitBtn.disabled = true;
  }
}

/**
 * Filter delegates based on search input
 */
function filterDelegates(searchTerm) {
  const term = searchTerm.toLowerCase().trim();

  if (!term) {
    filteredDelegates = [...allDelegates];
  } else {
    filteredDelegates = allDelegates.filter(delegate => {
      const fullName = `${delegate.firstName} ${delegate.lastName}`.toLowerCase();
      const reverseName = `${delegate.lastName} ${delegate.firstName}`.toLowerCase();
      const voterId = delegate.voterId || '';

      return fullName.includes(term) ||
             reverseName.includes(term) ||
             voterId.includes(term);
    });
  }

  renderDelegateOptions();
}

/**
 * Handle delegate selection and start voting portal
 */
async function selectDelegate() {
  const selectEl = document.getElementById('delegate-select');
  const submitBtn = document.getElementById('voter-id-submit-btn');

  if (!selectEl || !selectEl.value) return;

  const delegateId = parseInt(selectEl.value, 10);
  const delegate = allDelegates.find(d => d.id === delegateId);

  if (!delegate) {
    showError('Invalid delegate selection.');
    return;
  }

  // Show loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';
  }

  try {
    // Get auth token for API calls
    const authToken = sessionStorage.getItem('authToken');

    // Build delegate info for the voting portal
    const delegateInfo = {
      firstName: delegate.firstName,
      lastInitial: delegate.lastName.charAt(0),
      groupingName: delegate.grouping?.name || null,
      partyName: delegate.party?.party?.name || null,
      partyColor: delegate.party?.party?.color || null,
    };

    // Initialize the voting portal with auth token
    initVotingPortal(delegateId, delegateInfo, authToken);
  } catch (err) {
    console.error('Error starting voting portal:', err);
    showError('Failed to start voting portal. Please try again.');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue';
    }
  }
}

/**
 * Disable delegate selection (when no program context)
 */
function disableDelegateSelection() {
  const searchInput = document.getElementById('delegate-search-input');
  const selectEl = document.getElementById('delegate-select');
  const submitBtn = document.getElementById('voter-id-submit-btn');

  if (searchInput) searchInput.disabled = true;
  if (selectEl) selectEl.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
}

/**
 * Set up logout button handler
 */
function setupLogoutHandler() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && typeof handleLogout === 'function') {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

/**
 * Get auth headers for API requests
 */
function getAuthHeaders() {
  const token = sessionStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

/**
 * Show error message
 */
function showError(message) {
  const errorBox = document.getElementById('errorBox');
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }
}

/**
 * Escape HTML for option elements (text content only)
 */
function escapeHtmlForOption(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAdminVotingPortal);

// ============================================================================
// Exports for both browser and Node (testing)
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initAdminVotingPortal,
    loadDelegates,
    selectDelegate,
    filterDelegates,
  };
}
