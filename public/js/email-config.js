// email-config.js

// Parse programId from URL
function getProgramIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('programId') || '';
}

const programId = getProgramIdFromUrl();
let isConfigured = false;

// Show status message
function showStatus(message, isError = false) {
  const statusMsg = document.getElementById('statusMsg');
  statusMsg.textContent = message;
  statusMsg.className = `rounded-lg px-4 py-3 mb-6 ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
  statusMsg.classList.remove('hidden');

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMsg.classList.add('hidden');
  }, 5000);
}

// Show test result
function showTestResult(message, isError = false) {
  const testResult = document.getElementById('testResult');
  testResult.textContent = message;
  testResult.className = `mt-3 rounded-lg px-4 py-2 text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
  testResult.classList.remove('hidden');
}

// Update enabled status display
function updateEnabledStatus(enabled) {
  const enabledStatus = document.getElementById('enabledStatus');
  const emailEnabled = document.getElementById('emailEnabled');
  emailEnabled.checked = enabled;
  enabledStatus.textContent = enabled ? '(Enabled)' : '(Disabled)';
  enabledStatus.className = `ml-2 text-sm ${enabled ? 'text-green-600 font-semibold' : 'text-gray-500'}`;
}

// Load email config from API
async function loadEmailConfig() {
  const API_URL = window.API_URL;
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.classList.add('hidden');

  try {
    const res = await fetch(`${API_URL}/api/programs/${programId}/email-config`, {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });

    if (res.ok) {
      const config = await res.json();
      populateForm(config);
      isConfigured = config.configured || false;

      // Show/hide delete button based on configuration status
      const deleteBtn = document.getElementById('deleteBtn');
      if (isConfigured) {
        deleteBtn.classList.remove('hidden');
      } else {
        deleteBtn.classList.add('hidden');
      }

      // Show password hint if configured
      if (isConfigured && config.hasPassword) {
        document.getElementById('passwordHint').classList.remove('hidden');
        document.getElementById('smtpPass').placeholder = 'Leave blank to keep existing password';
      }
    } else {
      resetForm();
    }
  } catch (e) {
    errorMsg.textContent = 'Could not load email configuration.';
    errorMsg.classList.remove('hidden');
    console.error('Error loading email config:', e);
  }
}

// Populate form with config data
function populateForm(config) {
  document.getElementById('smtpHost').value = config.smtpHost || '';
  document.getElementById('smtpPort').value = config.smtpPort || '587';
  document.getElementById('smtpUser').value = config.smtpUser || '';
  document.getElementById('smtpPass').value = ''; // Never populate password
  document.getElementById('fromEmail').value = config.fromEmail || '';
  document.getElementById('fromName').value = config.fromName || '';
  updateEnabledStatus(config.enabled !== false);

  if (config.programName) {
    document.getElementById('programNameLabel').textContent = config.programName;
  }
}

// Reset form to default values
function resetForm() {
  document.getElementById('smtpHost').value = '';
  document.getElementById('smtpPort').value = '587';
  document.getElementById('smtpUser').value = '';
  document.getElementById('smtpPass').value = '';
  document.getElementById('fromEmail').value = '';
  document.getElementById('fromName').value = '';
  document.getElementById('passwordHint').classList.add('hidden');
  document.getElementById('smtpPass').placeholder = 'Enter password or app-specific password';
  updateEnabledStatus(true);
  isConfigured = false;
  document.getElementById('deleteBtn').classList.add('hidden');
}

// Save email configuration
async function saveConfig() {
  if (!programId) return;

  const API_URL = window.API_URL;
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.classList.add('hidden');

  const smtpHost = document.getElementById('smtpHost').value.trim();
  const smtpPort = parseInt(document.getElementById('smtpPort').value);
  const smtpUser = document.getElementById('smtpUser').value.trim();
  const smtpPass = document.getElementById('smtpPass').value;
  const fromEmail = document.getElementById('fromEmail').value.trim();
  const fromName = document.getElementById('fromName').value.trim();
  const enabled = document.getElementById('emailEnabled').checked;

  // Validation
  if (!smtpHost) {
    showStatus('SMTP Host is required', true);
    document.getElementById('smtpHost').focus();
    return;
  }
  if (!smtpUser) {
    showStatus('SMTP Username is required', true);
    document.getElementById('smtpUser').focus();
    return;
  }
  if (!fromEmail) {
    showStatus('From Email is required', true);
    document.getElementById('fromEmail').focus();
    return;
  }
  if (!isConfigured && !smtpPass) {
    showStatus('SMTP Password is required for new configuration', true);
    document.getElementById('smtpPass').focus();
    return;
  }

  const config = {
    smtpHost,
    smtpPort,
    smtpUser,
    fromEmail,
    fromName,
    enabled
  };

  // Only include password if provided
  if (smtpPass) {
    config.smtpPass = smtpPass;
  }

  try {
    const res = await fetch(`${API_URL}/api/programs/${programId}/email-config`, {
      method: 'PUT',
      headers: {
        ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (res.ok) {
      showStatus('Email configuration saved successfully!');
      await loadEmailConfig(); // Reload to get updated state
    } else {
      const error = await res.json();
      showStatus(error.error || 'Failed to save configuration', true);
    }
  } catch (e) {
    showStatus('Could not save email configuration', true);
    console.error('Error saving email config:', e);
  }
}

// Send test email using current form values (before saving)
async function sendTestEmail() {
  if (!programId) return;

  const API_URL = window.API_URL;
  const testEmail = document.getElementById('testEmail').value.trim();
  const testResult = document.getElementById('testResult');
  testResult.classList.add('hidden');

  // Get current form values
  const smtpHost = document.getElementById('smtpHost').value.trim();
  const smtpPort = parseInt(document.getElementById('smtpPort').value);
  const smtpUser = document.getElementById('smtpUser').value.trim();
  const smtpPass = document.getElementById('smtpPass').value;
  const fromEmail = document.getElementById('fromEmail').value.trim();
  const fromName = document.getElementById('fromName').value.trim();

  // Validate test email
  if (!testEmail) {
    showTestResult('Please enter an email address for the test', true);
    document.getElementById('testEmail').focus();
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(testEmail)) {
    showTestResult('Please enter a valid email address', true);
    return;
  }

  // Validate required SMTP fields
  if (!smtpHost) {
    showTestResult('SMTP Host is required to test', true);
    document.getElementById('smtpHost').focus();
    return;
  }
  if (!smtpUser) {
    showTestResult('SMTP Username is required to test', true);
    document.getElementById('smtpUser').focus();
    return;
  }
  if (!fromEmail) {
    showTestResult('From Email is required to test', true);
    document.getElementById('fromEmail').focus();
    return;
  }
  // Password is required for new configs, but for existing configs we can use the saved one
  if (!isConfigured && !smtpPass) {
    showTestResult('SMTP Password is required to test', true);
    document.getElementById('smtpPass').focus();
    return;
  }

  // Disable button while sending
  const sendTestBtn = document.getElementById('sendTestBtn');
  const originalText = sendTestBtn.innerHTML;
  sendTestBtn.disabled = true;
  sendTestBtn.innerHTML = `
    <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Sending...
  `;

  try {
    // Send all config values along with the test email
    const payload = {
      testEmail,
      smtpHost,
      smtpPort,
      smtpUser,
      fromEmail,
      fromName
    };

    // Only include password if provided (otherwise backend will use saved password)
    if (smtpPass) {
      payload.smtpPass = smtpPass;
    }

    const res = await fetch(`${API_URL}/api/programs/${programId}/email-config/test`, {
      method: 'POST',
      headers: {
        ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.ok) {
      showTestResult(`Test email sent successfully to ${testEmail}. Please check your inbox.`);
    } else {
      showTestResult(result.error || 'Failed to send test email', true);
    }
  } catch (e) {
    showTestResult('Could not send test email. Please check your configuration.', true);
    console.error('Error sending test email:', e);
  } finally {
    sendTestBtn.disabled = false;
    sendTestBtn.innerHTML = originalText;
  }
}

// Delete email configuration
async function deleteConfig() {
  if (!programId) return;

  const API_URL = window.API_URL;

  try {
    const res = await fetch(`${API_URL}/api/programs/${programId}/email-config`, {
      method: 'DELETE',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });

    if (res.ok) {
      showStatus('Email configuration deleted');
      resetForm();
      document.getElementById('deleteModal').classList.add('hidden');
    } else {
      const error = await res.json();
      showStatus(error.error || 'Failed to delete configuration', true);
    }
  } catch (e) {
    showStatus('Could not delete email configuration', true);
    console.error('Error deleting email config:', e);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
  const programNameLabel = document.getElementById('programNameLabel');
  const errorMsg = document.getElementById('errorMsg');
  const formEls = document.querySelectorAll('input, select, button');

  if (!programId) {
    errorMsg.textContent = 'Missing ?programId= in the URL!';
    errorMsg.classList.remove('hidden');
    formEls.forEach(el => el.disabled = true);
    programNameLabel.textContent = '';
    return;
  }

  // Loading indicator
  programNameLabel.textContent = 'Loading program...';
  errorMsg.classList.add('hidden');

  try {
    const API_URL = window.API_URL;
    const res = await fetch(`${API_URL}/programs/${programId}`, {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });

    if (res.ok) {
      const program = await res.json();
      const label = program.name
        ? `${program.name}${program.year ? ' (' + program.year + ')' : ''}`
        : `Program ${programId}`;
      programNameLabel.textContent = label;
      errorMsg.classList.add('hidden');

      // Load email configuration
      await loadEmailConfig();
    } else {
      programNameLabel.textContent = `Program not found (${programId})`;
      errorMsg.textContent = 'Program not found!';
      errorMsg.classList.remove('hidden');
      formEls.forEach(el => el.disabled = true);
    }
  } catch (e) {
    programNameLabel.textContent = `Failed to load program (${programId})`;
    errorMsg.textContent = 'Could not load program info.';
    errorMsg.classList.remove('hidden');
    formEls.forEach(el => el.disabled = true);
  }

  // Event listeners
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveConfig);
  }

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.location.href = `programs-config.html?programId=${encodeURIComponent(programId)}`;
    });
  }

  const sendTestBtn = document.getElementById('sendTestBtn');
  if (sendTestBtn) {
    sendTestBtn.addEventListener('click', sendTestEmail);
  }

  // Password toggle
  const togglePassword = document.getElementById('togglePassword');
  const smtpPass = document.getElementById('smtpPass');
  if (togglePassword && smtpPass) {
    togglePassword.addEventListener('click', () => {
      const type = smtpPass.type === 'password' ? 'text' : 'password';
      smtpPass.type = type;
    });
  }

  // Enable toggle listener
  const emailEnabled = document.getElementById('emailEnabled');
  if (emailEnabled) {
    emailEnabled.addEventListener('change', () => {
      updateEnabledStatus(emailEnabled.checked);
    });
  }

  // Delete button and modal
  const deleteBtn = document.getElementById('deleteBtn');
  const deleteModal = document.getElementById('deleteModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      deleteModal.classList.remove('hidden');
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      deleteModal.classList.add('hidden');
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', deleteConfig);
  }

  // Close modal on backdrop click
  if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) {
        deleteModal.classList.add('hidden');
      }
    });
  }

  // Allow Enter key to send test email
  const testEmail = document.getElementById('testEmail');
  if (testEmail) {
    testEmail.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendTestEmail();
      }
    });
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramIdFromUrl,
    loadEmailConfig,
    populateForm,
    resetForm,
    saveConfig,
    sendTestEmail,
    deleteConfig,
    showStatus,
    showTestResult,
    updateEnabledStatus
  };
}
