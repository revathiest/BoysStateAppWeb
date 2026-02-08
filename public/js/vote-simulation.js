/**
 * vote-simulation.js
 * Main entry point for the vote simulation page.
 * Initializes shared state and sets up event handlers.
 *
 * Dependencies (load in this order):
 * 1. vote-simulation-utils.js - Shared utility functions
 * 2. vote-simulation-nominations.js - Nominations functionality
 * 3. vote-simulation-voting.js - Vote simulation engine
 * 4. vote-simulation-results.js - Results display and audit
 * 5. vote-simulation.js - This file (main entry)
 */

// Initialize shared state for all modules
window.voteSimState = {
  currentProgramId: null,
  currentProgramYearId: null,
  currentElection: null,
  candidates: [],
  eligibleVoters: [],
  votersWhoVoted: [],
  remainingVoters: [],

  // Nomination-related state
  nomProgramYearId: null,
  nomElection: null,
  nomEligibleDelegates: [],
  nomCurrentCandidates: [],
};

async function checkAdminAccess() {
  const state = window.voteSimState;
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const res = await fetch(`${window.API_URL}/programs/${state.currentProgramId}/my-permissions`, { headers });
    if (!res.ok) return false;

    const data = await res.json();
    return data.isAdmin === true;
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const state = window.voteSimState;

  // Require auth
  if (typeof requireAuth === 'function') {
    requireAuth();
  }

  // Get programId from URL or localStorage
  const params = new URLSearchParams(window.location.search);
  state.currentProgramId = params.get('programId') || localStorage.getItem('lastSelectedProgramId');

  if (!state.currentProgramId) {
    showError('No program selected. Please go back and select a program.');
    return;
  }

  // Check admin access before showing page content
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    document.getElementById('admin-warning').classList.remove('hidden');
    return;
  }

  // Show main content
  document.getElementById('main-content').classList.remove('hidden');

  // Event listeners - Voting simulation
  document.getElementById('year-select').addEventListener('change', onYearChange);
  document.getElementById('election-select').addEventListener('change', onElectionChange);

  document.querySelectorAll('input[name="sim-mode"]').forEach(radio => {
    radio.addEventListener('change', onSimModeChange);
  });

  document.getElementById('set-all-btn').addEventListener('click', () => {
    document.getElementById('vote-count-input').value = state.remainingVoters.length;
  });

  document.getElementById('run-simulation-btn').addEventListener('click', runSimulation);
  document.getElementById('refresh-stats-btn').addEventListener('click', () => loadElectionData(state.currentElection.id));
  document.getElementById('view-full-results-btn')?.addEventListener('click', () => {
    if (state.currentElection) {
      openAuditModal(state.currentElection.id);
    }
  });

  // Event listeners - Nominations
  document.getElementById('nom-year-select').addEventListener('change', onNomYearChange);
  document.getElementById('nom-election-select').addEventListener('change', onNomElectionChange);
  document.getElementById('add-nomination-btn').addEventListener('click', addNomination);
  document.getElementById('auto-nominate-btn').addEventListener('click', autoNominate);
  document.getElementById('close-nomination-btn').addEventListener('click', closeNomination);
  document.getElementById('clear-nominees-btn').addEventListener('click', clearNominees);
  document.getElementById('close-all-nominations-btn').addEventListener('click', closeAllNominations);
  document.getElementById('start-all-elections-btn').addEventListener('click', startAllElections);
  document.getElementById('open-elections-btn').addEventListener('click', openElectionsAtLevel);
  document.getElementById('auto-nominate-all-btn').addEventListener('click', autoNominateAll);

  // Event listeners - Reset
  document.getElementById('reset-all-btn').addEventListener('click', showResetModal);
  document.getElementById('reset-cancel-btn').addEventListener('click', hideResetModal);
  document.getElementById('reset-confirm-btn').addEventListener('click', confirmReset);

  // Audit modal close buttons
  document.getElementById('audit-modal-close')?.addEventListener('click', closeAuditModal);
  document.getElementById('audit-modal-done')?.addEventListener('click', closeAuditModal);
  document.getElementById('audit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'audit-modal') closeAuditModal();
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('authToken');
    window.location.href = 'login.html';
  });

  // Update back link with programId
  const backLink = document.querySelector('a[href="elections-management.html"]');
  if (backLink) {
    backLink.href = `elections-management.html?programId=${encodeURIComponent(state.currentProgramId)}`;
  }

  // Load program years for both sections
  await Promise.all([
    loadProgramYears(),
    loadNomProgramYears(),
  ]);
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkAdminAccess,
  };
}
