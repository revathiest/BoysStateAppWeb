// application-review.js

// Display program context (name and ID) for debugging/clarity
async function displayProgramContext() {
  const contextEl = document.getElementById('program-context');
  if (!contextEl) return;

  // Debug: trace how programId is resolved
  const urlParams = new URLSearchParams(window.location.search);
  const urlProgramId = urlParams.get('programId');
  const localStorageProgramId = localStorage.getItem('lastSelectedProgramId');
  console.log('[DEBUG] displayProgramContext - URL programId:', urlProgramId);
  console.log('[DEBUG] displayProgramContext - localStorage programId:', localStorageProgramId);
  console.log('[DEBUG] displayProgramContext - window.location.search:', window.location.search);

  const programId = window.getProgramId ? window.getProgramId() : null;
  console.log('[DEBUG] displayProgramContext - Resolved programId:', programId);

  if (!programId) {
    contextEl.textContent = 'No program selected';
    return;
  }

  // Show ID immediately while loading name
  contextEl.textContent = `Program ID: ${programId} (loading...)`;

  try {
    const resp = await fetch(`${window.API_URL}/programs/${encodeURIComponent(programId)}`, {
      credentials: 'include',
      headers: window.getAuthHeaders ? window.getAuthHeaders() : {},
    });
    if (resp.ok) {
      const program = await resp.json();
      const name = program.programName || program.name || 'Unknown';
      contextEl.textContent = `Program: ${name} (${programId})`;
    } else {
      contextEl.textContent = `Program ID: ${programId} (could not load name)`;
    }
  } catch {
    contextEl.textContent = `Program ID: ${programId}`;
  }
}

// Error and success message helpers
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

function clearError() {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) errorBox.classList.add('hidden');
  if (successBox) successBox.classList.add('hidden');
}

// Helper to switch between delegate and staff tabs
function switchTab(tab) {
    const delegateSection = document.getElementById('delegate-applications-section');
    const staffSection = document.getElementById('staff-applications-section');
    const tabDelegate = document.getElementById('tab-delegate');
    const tabStaff = document.getElementById('tab-staff');
    if (tab === 'delegate') {
      // Show/hide sections
      delegateSection.classList.remove('hidden');
      staffSection.classList.add('hidden');

      // Style delegate tab as active
      tabDelegate.classList.add('border-legend-blue', 'text-legend-blue', 'bg-white');
      tabDelegate.classList.remove('border-transparent', 'text-gray-500', 'bg-gray-100');

      // Style staff tab as inactive
      tabStaff.classList.remove('border-legend-blue', 'text-legend-blue', 'bg-white');
      tabStaff.classList.add('border-transparent', 'text-gray-500', 'bg-gray-100');
    } else {
      // Show/hide sections
      delegateSection.classList.add('hidden');
      staffSection.classList.remove('hidden');

      // Style staff tab as active
      tabStaff.classList.add('border-legend-blue', 'text-legend-blue', 'bg-white');
      tabStaff.classList.remove('border-transparent', 'text-gray-500', 'bg-gray-100');

      // Style delegate tab as inactive
      tabDelegate.classList.remove('border-legend-blue', 'text-legend-blue', 'bg-white');
      tabDelegate.classList.add('border-transparent', 'text-gray-500', 'bg-gray-100');
    }
  }
  
  // Fetch and populate Delegate applications
  async function loadDelegateApplications() {
    try {
      clearError();
      const programId = window.getProgramId ? window.getProgramId() : null;
      console.log('[DEBUG] loadDelegateApplications - programId:', programId);
      console.log('[DEBUG] loadDelegateApplications - API_URL:', window.API_URL);
      if (!programId) throw new Error('Program ID not found.');

      const url = `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/applications/delegate?status=pending`;
      console.log('[DEBUG] loadDelegateApplications - Fetching:', url);

      const resp = await fetch(url, {
        credentials: 'include',
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {},
      });

      console.log('[DEBUG] loadDelegateApplications - Response status:', resp.status);

      // Handle different response scenarios
      if (resp.status === 204 || resp.status === 404) {
        console.log('[DEBUG] loadDelegateApplications - No content (204/404)');
        // No content or not found - show empty state
        renderApplicationsTable('delegate-applications-table', [], 'delegate');
        return;
      }

      if (!resp.ok) {
        const errorText = await resp.text();
        console.log('[DEBUG] loadDelegateApplications - Error response:', errorText);
        throw new Error('Failed to load delegate applications.');
      }

      // Try to parse JSON, handle empty responses gracefully
      const text = await resp.text();
      console.log('[DEBUG] loadDelegateApplications - Response text:', text);
      const applications = text ? JSON.parse(text) : [];
      console.log('[DEBUG] loadDelegateApplications - Parsed applications:', applications);
      renderApplicationsTable('delegate-applications-table', applications, 'delegate');
    } catch (err) {
      console.error('[DEBUG] loadDelegateApplications - Error:', err);
      // Only show error if it's not a JSON parsing issue from empty response
      if (err.message.includes('JSON')) {
        renderApplicationsTable('delegate-applications-table', [], 'delegate');
      } else {
        showError(err.message || 'Failed to load delegate applications.');
      }
    }
  }
  
  // Fetch and populate Staff applications
  async function loadStaffApplications() {
    try {
      clearError();
      const programId = window.getProgramId ? window.getProgramId() : null;
      console.log('[DEBUG] loadStaffApplications - programId:', programId);
      if (!programId) throw new Error('Program ID not found.');

      const url = `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/applications/staff?status=pending`;
      console.log('[DEBUG] loadStaffApplications - Fetching:', url);

      const resp = await fetch(url, {
        credentials: 'include',
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {},
      });

      console.log('[DEBUG] loadStaffApplications - Response status:', resp.status);

      // Handle different response scenarios
      if (resp.status === 204 || resp.status === 404) {
        console.log('[DEBUG] loadStaffApplications - No content (204/404)');
        // No content or not found - show empty state
        renderApplicationsTable('staff-applications-table', [], 'staff');
        return;
      }

      if (!resp.ok) {
        const errorText = await resp.text();
        console.log('[DEBUG] loadStaffApplications - Error response:', errorText);
        throw new Error('Failed to load staff applications.');
      }

      // Try to parse JSON, handle empty responses gracefully
      const text = await resp.text();
      console.log('[DEBUG] loadStaffApplications - Response text:', text);
      const applications = text ? JSON.parse(text) : [];
      console.log('[DEBUG] loadStaffApplications - Parsed applications:', applications);
      renderApplicationsTable('staff-applications-table', applications, 'staff');
    } catch (err) {
      console.error('[DEBUG] loadStaffApplications - Error:', err);
      // Only show error if it's not a JSON parsing issue from empty response
      if (err.message.includes('JSON')) {
        renderApplicationsTable('staff-applications-table', [], 'staff');
      } else {
        showError(err.message || 'Failed to load staff applications.');
      }
    }
  }
  
  // Render applications into a table
  function renderApplicationsTable(tableId, applications, type) {
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';
    if (!Array.isArray(applications) || applications.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 px-4 text-gray-400 text-center">
            <svg class="inline w-8 h-8 mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 12V8a4 4 0 00-8 0v4M12 16h.01"></path></svg>
            <div>No pending applications</div>
        </td>
        </tr>
      `;
      tbody.appendChild(row);
      return;
    }
    applications.forEach(app => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2 px-4 border-b">${escapeHtml(app.name || app.fullName || '')}</td>
        ${type === 'staff'
          ? `<td class="py-2 px-4 border-b">${escapeHtml(app.role || '')}</td>`
          : ''
        }
        <td class="py-2 px-4 border-b">${escapeHtml(app.year || '')}</td>
        <td class="py-2 px-4 border-b">${escapeHtml(app.status || 'pending')}</td>
        <td class="py-2 px-4 border-b">${app.submittedAt ? formatDate(app.submittedAt) : ''}</td>
        <td class="py-2 px-4 border-b">
          <button class="view-btn text-blue-600 underline mr-2" data-id="${app.id}" data-type="${type}">View</button>
          <button class="accept-btn bg-green-500 text-white px-3 py-1 rounded mr-1" data-id="${app.id}" data-type="${type}">Accept</button>
          <button class="reject-btn bg-red-500 text-white px-3 py-1 rounded" data-id="${app.id}" data-type="${type}">Reject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  
  // Helper to safely escape HTML
  function escapeHtml(str) {
    return ('' + str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  
  // Helper to format date (ISO to MM/DD/YYYY)
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
  }
  
  // View Application Details (modal)
  async function handleViewApplication(id, type) {
    try {
      clearError();
      const programId = window.getProgramId ? window.getProgramId() : null;
      if (!programId) throw new Error('Program ID not found.');
      const resp = await fetch(`${window.API_URL}/api/programs/${programId}/applications/${type}/${id}`, {
        credentials: 'include',
        headers: window.getAuthHeaders ? window.getAuthHeaders() : {},
      });
      if (!resp.ok) throw new Error('Failed to load application details.');
      const app = await resp.json();
      showApplicationModal(app, type);
    } catch (err) {
      showError(err.message || 'Failed to load application details.');
    }
  }
  
  function showApplicationModal(app, type) {
    const modal = document.getElementById('application-modal');
    const content = document.getElementById('application-modal-content');
    
    // Standard fields
    const detailRows = [
      ['Name', app.name || app.fullName || ''],
      ['Email', app.email || ''],
      ['Phone', app.phone || ''],
      ['Year', app.year || ''],
      ['Status', app.status || ''],
      ['Submitted', app.submittedAt ? formatDate(app.submittedAt) : ''],
      ...(type === 'staff' ? [['Role', app.role || '']] : []),
      ...(type === 'delegate' ? [['School', app.school || '']] : []),
    ];
  
    // Helper to render a single answer by field type
    function renderFieldAnswer(field) {
      if (!field) return '';
      const value = field.value ?? field.answer ?? '';
      switch (field.type) {
        case 'short_answer':
        case 'number':
        case 'email':
        case 'phone':
          return `<span>${escapeHtml(value)}</span>`;
        case 'paragraph':
          return `<div class="whitespace-pre-line text-gray-700">${escapeHtml(value)}</div>`;
        case 'dropdown':
        case 'radio':
          return `<span>${escapeHtml(field.optionLabel || value)}</span>`;
        case 'checkbox':
          if (Array.isArray(value)) {
            return `<ul class="list-disc ml-5">${value.map(opt => `<li>${escapeHtml(opt)}</li>`).join('')}</ul>`;
          }
          return `<span>${escapeHtml(value)}</span>`;
        case 'date':
          return `<span>${escapeHtml(value)}</span>`;
        case 'date_range':
          return `<span>${escapeHtml((value && value.start) ? `${value.start} – ${value.end}` : '')}</span>`;
        case 'file':
          if (value && value.url) {
            return `<a href="${escapeHtml(value.url)}" target="_blank" class="text-blue-700 underline">${escapeHtml(value.name || 'Download File')}</a>`;
          }
          if (Array.isArray(value) && value.length > 0) {
            return value.map(f =>
              `<a href="${escapeHtml(f.url)}" target="_blank" class="text-blue-700 underline mr-2">${escapeHtml(f.name || 'Download File')}</a>`
            ).join('');
          }
          return `<span class="text-gray-400">No file uploaded</span>`;
        case 'section':
          return `<h4 class="font-bold text-lg mt-6 mb-2">${escapeHtml(field.label || value)}</h4>`;
        case 'static_text':
          return `<div class="italic text-gray-500 my-3">${escapeHtml(field.label || value)}</div>`;
        case 'boolean':
          return `<span>${value ? 'Yes' : 'No'}</span>`;
        case 'address':
          if (value && typeof value === 'object') {
            return `<div>
              <div>${escapeHtml(value.line1 || '')}</div>
              <div>${escapeHtml(value.line2 || '')}</div>
              <div>${escapeHtml(value.city || '')}, ${escapeHtml(value.state || '')} ${escapeHtml(value.zip || '')}</div>
            </div>`;
          }
          return `<span>${escapeHtml(value)}</span>`;
        default:
          return `<span>${escapeHtml(value)}</span>`;
      }
    }
  
    // Application answers: group/section rendering
    let answersHtml = '';
    if (Array.isArray(app.answers) && app.answers.length > 0) {
      answersHtml = `
        <div class="mb-2">
          <h4 class="font-semibold text-gray-700 mb-2">Application Answers</h4>
          <div class="space-y-3">
            ${app.answers.map(field => {
              if (field.type === 'section') {
                return renderFieldAnswer(field);
              }
              if (field.type === 'static_text') {
                return renderFieldAnswer(field);
              }
              return `
                <div>
                  <span class="font-medium">${escapeHtml(field.label || field.question || '')}:</span>
                  <div class="ml-2">${renderFieldAnswer(field)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
  
    // Uploaded files outside answers (legacy pattern)
    let extraFilesHtml = '';
    if (Array.isArray(app.files) && app.files.length > 0) {
      extraFilesHtml = `
        <div class="mt-4">
          <h4 class="font-semibold text-gray-700 mb-1">Uploaded Documents</h4>
          <ul>
            ${app.files.map(f =>
              `<li>
                <a href="${escapeHtml(f.url)}" target="_blank" class="text-blue-700 underline">${escapeHtml(f.name || 'Download File')}</a>
              </li>`).join('')}
          </ul>
        </div>
      `;
    }
  
    // Combine all parts into the modal
    content.innerHTML = `
      <h3 class="text-xl font-bold mb-4 text-legend-blue">Application Details</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-6">
        ${detailRows.map(([label, value]) => `
          <div><span class="font-medium text-gray-800">${label}:</span> <span class="ml-2">${escapeHtml(value)}</span></div>
        `).join('')}
      </div>
      ${answersHtml}
      ${extraFilesHtml}
    `;
    modal.classList.remove('hidden');
  }


  // Accept/Reject Application
  async function handleDecision(id, type, action, extraData = {}) {
    try {
      clearError();
      const programId = window.getProgramId ? window.getProgramId() : null;
      if (!programId) throw new Error('Program ID not found.');
      const endpoint = `${window.API_URL}/api/programs/${programId}/applications/${type}/${id}/${action}`;
      const resp = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(window.getAuthHeaders ? window.getAuthHeaders() : {}),
        },
        body: JSON.stringify(extraData),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${action} application.`);
      }
      const result = await resp.json();

      // Show success message with created record info
      let successMsg = `Application ${action}ed successfully.`;
      if (result.delegateId) {
        successMsg += ` Delegate #${result.delegateId} created (pending city assignment).`;
      } else if (result.staffId) {
        successMsg += ` Staff member #${result.staffId} created.`;
      }
      showSuccess(successMsg);

      // Reload applications
      if (type === 'delegate') {
        loadDelegateApplications();
      } else {
        loadStaffApplications();
      }
      closeModal();
      closeRoleModal();
    } catch (err) {
      showError(err.message || `Failed to ${action} application.`);
    }
  }
  
  function closeModal() {
    document.getElementById('application-modal').classList.add('hidden');
  }

  // Role selection modal for staff acceptance
  let pendingStaffAcceptId = null;

  function showRoleModal(applicationId) {
    pendingStaffAcceptId = applicationId;
    const modal = document.getElementById('role-modal');
    const roleSelect = document.getElementById('staff-role-select');
    const customRoleContainer = document.getElementById('custom-role-container');
    const customRoleInput = document.getElementById('custom-role-input');

    // Reset the form
    roleSelect.value = '';
    customRoleInput.value = '';
    customRoleContainer.classList.add('hidden');

    modal.classList.remove('hidden');
  }

  function closeRoleModal() {
    document.getElementById('role-modal').classList.add('hidden');
    pendingStaffAcceptId = null;
  }

  function getSelectedRole() {
    const roleSelect = document.getElementById('staff-role-select');
    const customRoleInput = document.getElementById('custom-role-input');

    if (roleSelect.value === 'other') {
      return customRoleInput.value.trim();
    }
    return roleSelect.value;
  }

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

  function closeConfirmation() {
    document.getElementById('confirmation-modal').classList.add('hidden');
  }
  
  // Attach all event listeners
  function attachEventListeners() {
    // Tab switching
    document.getElementById('tab-delegate').addEventListener('click', () => {
      switchTab('delegate');
      const programId = window.getProgramId ? window.getProgramId() : null;
      if (programId) {
        loadDelegateApplications();
      }
    });
    document.getElementById('tab-staff').addEventListener('click', () => {
      switchTab('staff');
      const programId = window.getProgramId ? window.getProgramId() : null;
      if (programId) {
        loadStaffApplications();
      }
    });
  
    // Application actions (using event delegation)
    document.getElementById('delegate-applications-table').addEventListener('click', tableActionHandler);
    document.getElementById('staff-applications-table').addEventListener('click', tableActionHandler);
  
    // Close modal
    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  
    // Close modal on click outside modal content
    document.getElementById('application-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Confirmation modal handlers
    document.getElementById('confirmation-cancel-btn').addEventListener('click', closeConfirmation);
    document.getElementById('confirmation-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeConfirmation();
    });

    // Role modal handlers
    document.getElementById('role-modal-close').addEventListener('click', closeRoleModal);
    document.getElementById('role-cancel-btn').addEventListener('click', closeRoleModal);
    document.getElementById('role-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeRoleModal();
    });

    // Show/hide custom role input based on selection
    document.getElementById('staff-role-select').addEventListener('change', (e) => {
      const customContainer = document.getElementById('custom-role-container');
      if (e.target.value === 'other') {
        customContainer.classList.remove('hidden');
      } else {
        customContainer.classList.add('hidden');
      }
    });

    // Role confirm button
    document.getElementById('role-confirm-btn').addEventListener('click', () => {
      const role = getSelectedRole();
      if (!role) {
        showError('Please select a role for this staff member.');
        return;
      }
      if (pendingStaffAcceptId) {
        handleDecision(pendingStaffAcceptId, 'staff', 'accept', { role });
      }
    });
  }
  
  function tableActionHandler(e) {
    const target = e.target;
    if (!target.dataset.id) return;
    const id = target.dataset.id;
    const type = target.dataset.type;
    if (target.classList.contains('view-btn')) {
      handleViewApplication(id, type);
    } else if (target.classList.contains('accept-btn')) {
      if (type === 'staff') {
        // Show role selection modal for staff
        showRoleModal(id);
      } else {
        // Delegate acceptance - no role needed
        showConfirmation(
          'Accept Application',
          'Are you sure you want to accept this application? The delegate will be added to the program roster (pending city assignment).',
          'Accept',
          () => handleDecision(id, type, 'accept')
        );
      }
    } else if (target.classList.contains('reject-btn')) {
      showConfirmation(
        'Reject Application',
        'Are you sure you want to reject this application? The applicant will be notified.',
        'Reject',
        () => handleDecision(id, type, 'reject')
      );
    }
  }
  
  // On page load
  document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
    switchTab('delegate'); // Default tab

    // Display program context for debugging/clarity
    displayProgramContext();

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (typeof clearAuthToken === 'function') clearAuthToken();
        window.location.href = 'login.html';
      });
    }

    // Check if programId is available before loading
    const programId = window.getProgramId ? window.getProgramId() : null;
    if (programId) {
      loadDelegateApplications();
    } else {
      // Show a friendly message instead of an error
      const tbody = document.getElementById('delegate-applications-table');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="py-8 px-4 text-gray-500 text-center">
              <svg class="inline w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <div class="font-semibold">No program selected</div>
              <div class="text-sm mt-1">Please select a program from the dashboard first.</div>
            </td>
          </tr>
        `;
      }
    }
  });
  