/**
 * vote-simulation-utils.js
 * Shared utility functions for the vote simulation page.
 */

// Election type display labels
const electionTypeLabels = {
  primary: 'Primary',
  general: 'General',
  runoff: 'Runoff',
  primary_runoff: 'Primary Runoff',
};

function getElectionTypeLabel(type) {
  return electionTypeLabels[type] || type || 'general';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
  // Scroll to make error visible
  if (errorBox) {
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

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

function hideMessages() {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) errorBox.classList.add('hidden');
  if (successBox) successBox.classList.add('hidden');
}

function logMessage(container, message, type = 'info') {
  const p = document.createElement('p');
  p.textContent = message;
  if (type === 'success') p.className = 'text-green-400';
  else if (type === 'error') p.className = 'text-red-400';
  else if (type === 'warning') p.className = 'text-yellow-400';
  container.appendChild(p);
  container.scrollTop = container.scrollHeight;
}

// Export for Node testing and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    electionTypeLabels,
    getElectionTypeLabel,
    escapeHtml,
    showError,
    showSuccess,
    hideMessages,
    logMessage,
  };
} else {
  window.electionTypeLabels = electionTypeLabels;
  window.getElectionTypeLabel = getElectionTypeLabel;
  window.escapeHtml = escapeHtml;
  window.showError = showError;
  window.showSuccess = showSuccess;
  window.hideMessages = hideMessages;
  window.logMessage = logMessage;
}
