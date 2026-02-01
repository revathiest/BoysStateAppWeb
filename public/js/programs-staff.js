// programs-staff.js
(function() {
'use strict';

const apiBase = window.API_URL || '';

// State
let currentProgramId = null;
let currentProgramYearId = null;
let staffList = [];
let groupingsList = [];
let editingStaffId = null;

// Get programId from URL or localStorage
function getProgramId() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlProgramId = urlParams.get('programId');
  if (urlProgramId) {
    localStorage.setItem('lastSelectedProgramId', urlProgramId);
    return urlProgramId;
  }
  return localStorage.getItem('lastSelectedProgramId');
}

// Display program context
async function displayProgramContext() {
  const contextEl = document.getElementById('program-context');
  if (!contextEl) return;

  const programId = getProgramId();
  if (!programId) {
    contextEl.textContent = 'No program selected';
    return;
  }

  contextEl.textContent = `Program ID: ${programId} (loading...)`;

  try {
    const resp = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}`, {
      credentials: 'include',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {},
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

function clearMessages() {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) errorBox.classList.add('hidden');
  if (successBox) successBox.classList.add('hidden');
}

// Load program years
async function loadProgramYears() {
  const yearSelect = document.getElementById('year-select');
  if (!yearSelect) return;

  const programId = getProgramId();
  if (!programId) {
    yearSelect.innerHTML = '<option value="">No program selected</option>';
    return;
  }

  try {
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/years`, {
      headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load years');
    const years = await response.json();
    console.log('[DEBUG] loadProgramYears - received years:', years);

    if (years.length === 0) {
      yearSelect.innerHTML = '<option value="">No years configured</option>';
      return;
    }

    // Get previously selected year or default to most recent
    let selectedYear = localStorage.getItem(`selectedYear_${programId}`);
    if (!selectedYear) {
      selectedYear = years[0].year.toString();
      localStorage.setItem(`selectedYear_${programId}`, selectedYear);
    }
    console.log('[DEBUG] loadProgramYears - selectedYear:', selectedYear);

    yearSelect.innerHTML = years.map(y =>
      `<option value="${y.id}" data-year="${y.year}" ${y.year == selectedYear ? 'selected' : ''}>${y.year}</option>`
    ).join('');

    // Set the current program year ID
    const selectedOption = yearSelect.options[yearSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
      currentProgramYearId = parseInt(selectedOption.value);
      console.log('[DEBUG] loadProgramYears - set currentProgramYearId to:', currentProgramYearId, 'for year:', selectedOption.dataset?.year);
      await loadStaff();
      await loadGroupings();
    }
  } catch (err) {
    console.error('Error loading years:', err);
    yearSelect.innerHTML = '<option value="">Error loading years</option>';
  }
}

// Load staff for current program year
async function loadStaff() {
  const tbody = document.getElementById('staff-table-body');
  console.log('[DEBUG] loadStaff called with currentProgramYearId:', currentProgramYearId);
  if (!tbody || !currentProgramYearId) {
    console.log('[DEBUG] loadStaff - no tbody or programYearId, tbody:', !!tbody, 'programYearId:', currentProgramYearId);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500 italic">Select a program year to view staff</td></tr>';
    }
    return;
  }

  tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500 italic">Loading staff...</td></tr>';

  const url = `${apiBase}/program-years/${currentProgramYearId}/staff`;
  console.log('[DEBUG] loadStaff - fetching:', url);
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
      credentials: 'include',
    });

    console.log('[DEBUG] loadStaff - response status:', response.status);
    if (response.status === 204 || response.status === 404) {
      console.log('[DEBUG] loadStaff - no content (204/404)');
      staffList = [];
      renderStaffTable();
      return;
    }

    if (!response.ok) throw new Error('Failed to load staff');

    staffList = await response.json();
    console.log('[DEBUG] loadStaff - received staff:', staffList);
    renderStaffTable();
  } catch (err) {
    console.error('Error loading staff:', err);
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-red-500">Error loading staff</td></tr>';
  }
}

// Load groupings for assignment dropdown
async function loadGroupings() {
  const programId = getProgramId();
  if (!programId) return;

  try {
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/groupings`, {
      headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
      credentials: 'include',
    });

    if (!response.ok) {
      groupingsList = [];
      return;
    }

    groupingsList = await response.json();
    updateGroupingSelect();
  } catch (err) {
    console.error('Error loading groupings:', err);
    groupingsList = [];
  }
}

// Update the grouping select dropdown
function updateGroupingSelect() {
  const select = document.getElementById('staff-grouping');
  if (!select) return;

  let options = '<option value="">No assignment (program-wide)</option>';

  // Group by type for better organization
  const groupedByType = {};
  groupingsList.forEach(g => {
    const typeName = g.groupingType
      ? (g.groupingType.customName || g.groupingType.defaultName)
      : 'Other';
    if (!groupedByType[typeName]) {
      groupedByType[typeName] = [];
    }
    groupedByType[typeName].push(g);
  });

  // Sort types by levelOrder (already sorted from backend, but group here)
  const typeNames = Object.keys(groupedByType);

  if (typeNames.length === 1 && groupingsList.length > 0) {
    // If only one type, don't use optgroups - just show type in parentheses
    const typeName = typeNames[0];
    groupedByType[typeName].forEach(g => {
      options += `<option value="${g.id}">${escapeHtml(g.name)} (${escapeHtml(typeName)})</option>`;
    });
  } else if (typeNames.length > 1) {
    // Multiple types - use optgroups
    typeNames.forEach(typeName => {
      options += `<optgroup label="${escapeHtml(typeName)}">`;
      groupedByType[typeName].forEach(g => {
        options += `<option value="${g.id}">${escapeHtml(g.name)}</option>`;
      });
      options += '</optgroup>';
    });
  }

  select.innerHTML = options;
}

// Render staff table
function renderStaffTable() {
  const tbody = document.getElementById('staff-table-body');
  if (!tbody) return;

  if (staffList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500 italic">No staff members found for this year</td></tr>';
    return;
  }

  tbody.innerHTML = staffList.map(staff => {
    const grouping = staff.groupingId ? groupingsList.find(g => g.id === staff.groupingId) : null;
    const statusClass = staff.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';

    // Format grouping display with type
    let groupingDisplay = '<span class="text-gray-400">None</span>';
    if (grouping) {
      const typeName = grouping.groupingType
        ? (grouping.groupingType.customName || grouping.groupingType.defaultName)
        : '';
      groupingDisplay = typeName
        ? `${escapeHtml(grouping.name)} <span class="text-gray-400 text-xs">(${escapeHtml(typeName)})</span>`
        : escapeHtml(grouping.name);
    }

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 text-sm font-medium text-gray-900">${escapeHtml(staff.firstName)} ${escapeHtml(staff.lastName)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(staff.email)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(staff.phone || '-')}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(staff.role)}</td>
        <td class="px-4 py-3 text-sm text-gray-600">${groupingDisplay}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">${staff.status}</span>
        </td>
        <td class="px-4 py-3 text-sm">
          <button class="edit-staff-btn text-blue-600 hover:text-blue-800 mr-2" data-id="${staff.id}">Edit</button>
          ${staff.userId ? `<button class="reset-password-btn text-purple-600 hover:text-purple-800 mr-2" data-id="${staff.id}" data-user-id="${staff.userId}" data-name="${escapeHtml(staff.firstName)} ${escapeHtml(staff.lastName)}">Password</button>` : ''}
          <button class="remove-staff-btn text-red-600 hover:text-red-800" data-id="${staff.id}" data-name="${escapeHtml(staff.firstName)} ${escapeHtml(staff.lastName)}">Remove</button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach event listeners
  tbody.querySelectorAll('.edit-staff-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
  });

  tbody.querySelectorAll('.reset-password-btn').forEach(btn => {
    btn.addEventListener('click', () => openPasswordModal(parseInt(btn.dataset.userId), btn.dataset.name));
  });

  tbody.querySelectorAll('.remove-staff-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmRemoveStaff(parseInt(btn.dataset.id), btn.dataset.name));
  });
}

// HTML escape helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Generate a random temporary password
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Open add modal
function openAddModal() {
  editingStaffId = null;
  document.getElementById('staff-form-title').textContent = 'Add Staff Member';
  document.getElementById('staff-id').value = '';
  document.getElementById('staff-first-name').value = '';
  document.getElementById('staff-last-name').value = '';
  document.getElementById('staff-email').value = '';
  document.getElementById('staff-phone').value = '';
  document.getElementById('staff-role').value = '';
  document.getElementById('staff-custom-role').value = '';
  document.getElementById('custom-role-container').classList.add('hidden');
  document.getElementById('staff-grouping').value = '';
  document.getElementById('staff-status').value = 'active';
  const tempPasswordField = document.getElementById('staff-temp-password');
  if (tempPasswordField) tempPasswordField.value = '';
  document.getElementById('staff-modal').classList.remove('hidden');
}

// Open edit modal
function openEditModal(staffId) {
  const staff = staffList.find(s => s.id === staffId);
  if (!staff) return;

  editingStaffId = staffId;
  document.getElementById('staff-form-title').textContent = 'Edit Staff Member';
  document.getElementById('staff-id').value = staffId;
  document.getElementById('staff-first-name').value = staff.firstName || '';
  document.getElementById('staff-last-name').value = staff.lastName || '';
  document.getElementById('staff-email').value = staff.email || '';
  document.getElementById('staff-phone').value = staff.phone || '';

  // Check if role is a predefined option
  const roleSelect = document.getElementById('staff-role');
  const predefinedRoles = Array.from(roleSelect.options).map(o => o.value).filter(v => v && v !== 'other');

  if (predefinedRoles.includes(staff.role)) {
    roleSelect.value = staff.role;
    document.getElementById('custom-role-container').classList.add('hidden');
  } else {
    roleSelect.value = 'other';
    document.getElementById('staff-custom-role').value = staff.role || '';
    document.getElementById('custom-role-container').classList.remove('hidden');
  }

  document.getElementById('staff-grouping').value = staff.groupingId || '';
  document.getElementById('staff-status').value = staff.status || 'active';
  const tempPasswordField = document.getElementById('staff-temp-password');
  if (tempPasswordField) tempPasswordField.value = '';
  document.getElementById('staff-modal').classList.remove('hidden');
}

// Close staff modal
function closeStaffModal() {
  document.getElementById('staff-modal').classList.add('hidden');
  editingStaffId = null;
}

// Save staff
async function saveStaff() {
  clearMessages();

  const firstName = document.getElementById('staff-first-name').value.trim();
  const lastName = document.getElementById('staff-last-name').value.trim();
  const email = document.getElementById('staff-email').value.trim();
  const phone = document.getElementById('staff-phone').value.trim();
  const roleSelect = document.getElementById('staff-role').value;
  const customRole = document.getElementById('staff-custom-role').value.trim();
  const groupingId = document.getElementById('staff-grouping').value;
  const status = document.getElementById('staff-status').value;
  const tempPassword = document.getElementById('staff-temp-password')?.value.trim() || '';

  // Determine actual role
  const role = roleSelect === 'other' ? customRole : roleSelect;

  // Validation
  if (!firstName || !lastName || !email || !role) {
    showError('Please fill in all required fields (First Name, Last Name, Email, Role)');
    return;
  }

  if (!currentProgramYearId) {
    showError('No program year selected');
    return;
  }

  const data = {
    firstName,
    lastName,
    email,
    phone: phone || null,
    role,
    groupingId: groupingId ? parseInt(groupingId) : null,
    status,
  };

  // Only include password if provided
  if (tempPassword) {
    data.tempPassword = tempPassword;
  }

  try {
    let response;
    if (editingStaffId) {
      // Update existing
      response = await fetch(`${apiBase}/staff/${editingStaffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
        credentials: 'include',
        body: JSON.stringify(data),
      });
    } else {
      // Create new
      response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
        credentials: 'include',
        body: JSON.stringify(data),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save staff member');
    }

    closeStaffModal();
    showSuccess(editingStaffId ? 'Staff member updated successfully' : 'Staff member added successfully');
    await loadStaff();
  } catch (err) {
    showError(err.message || 'Failed to save staff member');
  }
}

// Confirm remove staff
function confirmRemoveStaff(staffId, staffName) {
  const modal = document.getElementById('confirmation-modal');
  const titleEl = document.getElementById('confirmation-title');
  const messageEl = document.getElementById('confirmation-message');
  const confirmBtn = document.getElementById('confirmation-confirm-btn');

  titleEl.textContent = 'Remove Staff Member';
  messageEl.textContent = `Are you sure you want to remove "${staffName}" from the staff list? This will mark them as inactive.`;
  confirmBtn.textContent = 'Remove';

  // Remove old listeners by cloning
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener('click', async () => {
    modal.classList.add('hidden');
    await removeStaff(staffId);
  });

  modal.classList.remove('hidden');
}

// Remove staff (set inactive)
async function removeStaff(staffId) {
  clearMessages();

  try {
    const response = await fetch(`${apiBase}/staff/${staffId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to remove staff member');
    }

    showSuccess('Staff member removed successfully');
    await loadStaff();
  } catch (err) {
    showError(err.message || 'Failed to remove staff member');
  }
}

// Close confirmation modal
function closeConfirmationModal() {
  document.getElementById('confirmation-modal').classList.add('hidden');
}

// Open password reset modal
function openPasswordModal(userId, staffName) {
  document.getElementById('password-user-id').value = userId;
  document.getElementById('password-staff-name').textContent = `Reset password for: ${staffName}`;
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  document.getElementById('password-error').classList.add('hidden');
  document.getElementById('password-modal').classList.remove('hidden');
}

// Close password modal
function closePasswordModal() {
  document.getElementById('password-modal').classList.add('hidden');
}

// Save new password
async function savePassword() {
  const userId = document.getElementById('password-user-id').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const errorBox = document.getElementById('password-error');

  errorBox.classList.add('hidden');

  // Validation
  if (!newPassword || !confirmPassword) {
    errorBox.textContent = 'Please enter and confirm the new password';
    errorBox.classList.remove('hidden');
    return;
  }

  if (newPassword.length < 8) {
    errorBox.textContent = 'Password must be at least 8 characters';
    errorBox.classList.remove('hidden');
    return;
  }

  if (newPassword !== confirmPassword) {
    errorBox.textContent = 'Passwords do not match';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    const response = await fetch(`${apiBase}/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}) },
      credentials: 'include',
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to reset password');
    }

    closePasswordModal();
    showSuccess('Password reset successfully');
  } catch (err) {
    errorBox.textContent = err.message || 'Failed to reset password';
    errorBox.classList.remove('hidden');
  }
}

// Initialize page
function init() {
  currentProgramId = getProgramId();

  // Update back link with programId
  const backLink = document.querySelector('a[href^="user-management.html"]');
  if (backLink && currentProgramId) {
    backLink.href = `user-management.html?programId=${encodeURIComponent(currentProgramId)}`;
  }

  // Display program context
  displayProgramContext();

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

  // Year selector change
  const yearSelect = document.getElementById('year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', async (e) => {
      const option = e.target.options[e.target.selectedIndex];
      if (option && option.value) {
        currentProgramYearId = parseInt(option.value);
        const year = option.dataset.year;
        if (year && currentProgramId) {
          localStorage.setItem(`selectedYear_${currentProgramId}`, year);
        }
        await loadStaff();
        await loadGroupings();
      }
    });
  }

  // Add staff button
  const addStaffBtn = document.getElementById('add-staff-btn');
  if (addStaffBtn) {
    addStaffBtn.addEventListener('click', openAddModal);
  }

  // Role select change (show/hide custom role)
  const roleSelect = document.getElementById('staff-role');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      const customContainer = document.getElementById('custom-role-container');
      if (e.target.value === 'other') {
        customContainer.classList.remove('hidden');
      } else {
        customContainer.classList.add('hidden');
      }
    });
  }

  // Save staff button
  const saveStaffBtn = document.getElementById('save-staff-btn');
  if (saveStaffBtn) {
    saveStaffBtn.addEventListener('click', saveStaff);
  }

  // Generate password button
  const generatePasswordBtn = document.getElementById('generate-staff-password-btn');
  if (generatePasswordBtn) {
    generatePasswordBtn.addEventListener('click', () => {
      const passwordField = document.getElementById('staff-temp-password');
      if (passwordField) {
        passwordField.value = generateTempPassword();
      }
    });
  }

  // Cancel staff button
  const cancelStaffBtn = document.getElementById('cancel-staff-btn');
  if (cancelStaffBtn) {
    cancelStaffBtn.addEventListener('click', closeStaffModal);
  }

  // Staff modal close button
  const staffModalClose = document.getElementById('staff-modal-close');
  if (staffModalClose) {
    staffModalClose.addEventListener('click', closeStaffModal);
  }

  // Click outside modal to close
  const staffModal = document.getElementById('staff-modal');
  if (staffModal) {
    staffModal.addEventListener('click', (e) => {
      if (e.target === staffModal) closeStaffModal();
    });
  }

  // Confirmation modal handlers
  const confirmationCancelBtn = document.getElementById('confirmation-cancel-btn');
  if (confirmationCancelBtn) {
    confirmationCancelBtn.addEventListener('click', closeConfirmationModal);
  }

  const confirmationModal = document.getElementById('confirmation-modal');
  if (confirmationModal) {
    confirmationModal.addEventListener('click', (e) => {
      if (e.target === confirmationModal) closeConfirmationModal();
    });
  }

  // Password modal handlers
  const savePasswordBtn = document.getElementById('save-password-btn');
  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', savePassword);
  }

  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', closePasswordModal);
  }

  const passwordModalClose = document.getElementById('password-modal-close');
  if (passwordModalClose) {
    passwordModalClose.addEventListener('click', closePasswordModal);
  }

  const passwordModal = document.getElementById('password-modal');
  if (passwordModal) {
    passwordModal.addEventListener('click', (e) => {
      if (e.target === passwordModal) closePasswordModal();
    });
  }

  // Load initial data
  loadProgramYears();
}

// Run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);

// Exports for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    showError,
    showSuccess,
    clearMessages,
    escapeHtml,
    renderStaffTable,
    loadStaff,
    loadGroupings,
    saveStaff,
    removeStaff,
    openAddModal,
    openEditModal,
    closeStaffModal,
    openPasswordModal,
    closePasswordModal,
    savePassword,
  };
}

})();
