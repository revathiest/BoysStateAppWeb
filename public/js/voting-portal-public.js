/**
 * ============================================================================
 * VOTING PORTAL - PUBLIC ENTRY SCRIPT
 * ============================================================================
 *
 * IMPORTANT: This file works with voting-portal.js (shared core logic).
 *
 * This script handles voter identification via 6-digit voter ID entry.
 * Once the voter is identified, it calls initVotingPortal() from voting-portal.js.
 *
 * KEEP IN SYNC: The voting-portal-admin.js file provides an alternative
 * identification method (delegate dropdown) but uses the same core voting logic.
 * ============================================================================
 */

// NOTE: API_URL is already declared in voting-portal.js which is loaded first

// Program context from URL params
let programId = null;
let programYearId = null;

/**
 * Initialize the public voting portal on page load
 */
function initPublicVotingPortal() {
  // Get program context from URL params
  const params = new URLSearchParams(window.location.search);
  programId = params.get('programId');
  programYearId = params.get('programYearId');

  if (!programId || !programYearId) {
    showError('Invalid voting portal link. Please contact your counselor.');
    disableVoterIdForm();
    return;
  }

  // Set up voter ID form
  setupVoterIdForm();
}

/**
 * Set up the voter ID entry form
 */
function setupVoterIdForm() {
  const voterIdInput = document.getElementById('voter-id-input');
  const submitBtn = document.getElementById('voter-id-submit-btn');

  if (!voterIdInput || !submitBtn) return;

  // Handle input - only allow digits
  voterIdInput.addEventListener('input', (e) => {
    // Remove non-digits
    e.target.value = e.target.value.replace(/\D/g, '');

    // Enable/disable submit based on length
    submitBtn.disabled = e.target.value.length !== 6;
  });

  // Handle Enter key
  voterIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && voterIdInput.value.length === 6) {
      lookupVoter();
    }
  });

  // Handle submit button
  submitBtn.addEventListener('click', lookupVoter);

  // Initial state
  submitBtn.disabled = true;

  // Focus the input
  voterIdInput.focus();
}

/**
 * Look up voter by voter ID
 */
async function lookupVoter() {
  const voterIdInput = document.getElementById('voter-id-input');
  const submitBtn = document.getElementById('voter-id-submit-btn');
  const statusEl = document.getElementById('voter-id-status');

  if (!voterIdInput) return;

  const voterId = voterIdInput.value.trim();

  // Validate format
  if (!/^\d{6}$/.test(voterId)) {
    showVoterIdError('Please enter a valid 6-digit voter ID.');
    return;
  }

  // Show loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Looking up...';
  }

  if (statusEl) {
    statusEl.classList.add('hidden');
  }

  clearMessages();

  try {
    const response = await fetch(`${API_URL}/programs/${programId}/voter-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voterId: voterId,
        programYearId: parseInt(programYearId, 10),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Voter not found');
    }

    const voterData = await response.json();

    // Successfully identified voter - initialize voting portal
    // No auth token for public portal
    initVotingPortal(voterData.delegateId, {
      firstName: voterData.firstName,
      lastInitial: voterData.lastInitial,
      groupingName: voterData.groupingName,
      partyName: voterData.partyName,
      partyColor: voterData.partyColor,
    }, null);

  } catch (err) {
    console.error('Voter lookup error:', err);
    showVoterIdError(err.message || 'Failed to look up voter. Please try again.');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Continue';
    }
  }
}

/**
 * Show error message in voter ID section
 */
function showVoterIdError(message) {
  const statusEl = document.getElementById('voter-id-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = 'mt-4 text-sm text-red-600';
    statusEl.classList.remove('hidden');
  }
}

/**
 * Disable the voter ID form (when no valid program context)
 */
function disableVoterIdForm() {
  const voterIdInput = document.getElementById('voter-id-input');
  const submitBtn = document.getElementById('voter-id-submit-btn');

  if (voterIdInput) voterIdInput.disabled = true;
  if (submitBtn) submitBtn.disabled = true;
}

/**
 * Show error message (global error box)
 */
function showError(message) {
  const errorBox = document.getElementById('errorBox');
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }
}

/**
 * Clear error messages
 */
function clearMessages() {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) errorBox.classList.add('hidden');
  if (successBox) successBox.classList.add('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initPublicVotingPortal);

// ============================================================================
// Exports for both browser and Node (testing)
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initPublicVotingPortal,
    lookupVoter,
  };
}
