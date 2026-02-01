// programs-parents.js
// Parent management with search, filtering, and delegate linking
(function() {
'use strict';

const apiBase = window.API_URL || '';

// State
let currentProgramId = null;
let currentProgramYearId = null;
let parentsList = [];
let delegatesList = [];
let editingParentId = null;
let linkingParentId = null;

// Filter state
let filters = {
  search: '',
  status: 'all',
  page: 1,
  pageSize: 50
};

// Pagination state
let totalParents = 0;
let totalPages = 0;

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
      contextEl.textContent = `Program: ${name}`;
    } else {
      contextEl.textContent = `Program ID: ${programId}`;
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

// HTML escape helper
function escapeHtml(str) {
  if (!str) return '';
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

// Load program years
async function loadProgramYears() {
  const yearSelect = document.getElementById('year-select');
  if (!yearSelect) return;

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(currentProgramId)}/years`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 204 || response.status === 404) {
        yearSelect.innerHTML = '<option value="">No years available</option>';
        return;
      }
      throw new Error('Failed to load program years');
    }

    const years = await response.json();
    if (!years || years.length === 0) {
      yearSelect.innerHTML = '<option value="">No years available</option>';
      return;
    }

    // Sort by year descending
    years.sort((a, b) => b.year - a.year);

    yearSelect.innerHTML = years.map(y =>
      `<option value="${y.id}" data-year="${y.year}">${y.year}</option>`
    ).join('');

    // Select remembered year or first
    let selectedYear = localStorage.getItem(`selectedYear_${currentProgramId}`);
    const matchingOption = Array.from(yearSelect.options).find(opt => opt.dataset.year === selectedYear);
    if (matchingOption) {
      yearSelect.value = matchingOption.value;
    } else {
      selectedYear = years[0].year.toString();
      localStorage.setItem(`selectedYear_${currentProgramId}`, selectedYear);
    }

    currentProgramYearId = parseInt(yearSelect.value);

    // Load data for selected year
    await loadParents();

  } catch (err) {
    showError(err.message || 'Failed to load program years');
    console.error('Error loading program years:', err);
  }
}

// Load parents with current filters
async function loadParents() {
  if (!currentProgramYearId) return;

  const tbody = document.getElementById('parents-table-body');
  const resultsCount = document.getElementById('results-count');

  tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500 italic">Loading parents...</td></tr>';

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    const url = `${apiBase}/program-years/${currentProgramYearId}/parents`;
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 204 || response.status === 404) {
        parentsList = [];
        totalParents = 0;
        totalPages = 0;
        renderParentsTable();
        return;
      }
      throw new Error('Failed to load parents');
    }

    let data = await response.json();

    // Client-side filtering since backend doesn't support it yet
    if (filters.search) {
      const search = filters.search.toLowerCase();
      data = data.filter(p => {
        // Match parent name or email
        if ((p.firstName && p.firstName.toLowerCase().includes(search)) ||
            (p.lastName && p.lastName.toLowerCase().includes(search)) ||
            (p.email && p.email.toLowerCase().includes(search))) {
          return true;
        }
        // Match linked delegate names
        if (p.links && p.links.length > 0) {
          return p.links.some(link =>
            link.delegate && (
              (link.delegate.firstName && link.delegate.firstName.toLowerCase().includes(search)) ||
              (link.delegate.lastName && link.delegate.lastName.toLowerCase().includes(search)) ||
              (link.delegate.email && link.delegate.email.toLowerCase().includes(search))
            )
          );
        }
        return false;
      });
    }

    if (filters.status !== 'all') {
      data = data.filter(p => p.status === filters.status);
    }

    // Sort by last name, then first name
    data.sort((a, b) => {
      const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.firstName || '').localeCompare(b.firstName || '');
    });

    // Client-side pagination
    totalParents = data.length;
    totalPages = Math.ceil(totalParents / filters.pageSize);
    const start = (filters.page - 1) * filters.pageSize;
    const end = start + filters.pageSize;
    parentsList = data.slice(start, end);

    renderParentsTable();
    renderPagination();

    // Update results count
    if (resultsCount) {
      if (totalParents === 0) {
        resultsCount.textContent = 'No parents found';
      } else if (totalParents === 1) {
        resultsCount.textContent = '1 parent found';
      } else {
        const displayStart = start + 1;
        const displayEnd = Math.min(end, totalParents);
        resultsCount.textContent = `Showing ${displayStart}-${displayEnd} of ${totalParents} parents`;
      }
    }

  } catch (err) {
    showError(err.message || 'Failed to load parents');
    console.error('Error loading parents:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">Failed to load parents</td></tr>';
  }
}

// Render parents table
function renderParentsTable() {
  const tbody = document.getElementById('parents-table-body');
  if (!tbody) return;

  if (!parentsList || parentsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500 italic">No parents found</td></tr>';
    return;
  }

  tbody.innerHTML = parentsList.map(parent => {
    const name = `${escapeHtml(parent.firstName)} ${escapeHtml(parent.lastName)}`;
    const email = escapeHtml(parent.email) || '-';
    const phone = escapeHtml(parent.phone) || '-';

    // Linked delegates display
    let linkedDelegates = '-';
    if (parent.links && parent.links.length > 0) {
      const delegateNames = parent.links
        .filter(link => link.delegate)
        .map(link => `${escapeHtml(link.delegate.firstName)} ${escapeHtml(link.delegate.lastName)}`);
      if (delegateNames.length > 0) {
        linkedDelegates = delegateNames.join(', ');
      }
    }

    // Status badge
    const statusClass = parent.status === 'active'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-600';
    const statusDisplay = `<span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${escapeHtml(parent.status)}</span>`;

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 whitespace-nowrap">${name}</td>
        <td class="px-4 py-3 whitespace-nowrap">${email}</td>
        <td class="px-4 py-3 whitespace-nowrap">${phone}</td>
        <td class="px-4 py-3">${linkedDelegates}</td>
        <td class="px-4 py-3 whitespace-nowrap">${statusDisplay}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <button class="edit-parent-btn text-legend-blue hover:text-blue-800 font-semibold text-sm mr-2" data-id="${parent.id}">Edit</button>
          <button class="link-delegate-btn text-green-600 hover:text-green-800 font-semibold text-sm mr-2" data-id="${parent.id}" data-name="${escapeHtml(name)}">Link</button>
          ${parent.status === 'active' ? `<button class="deactivate-parent-btn text-red-600 hover:text-red-800 font-semibold text-sm" data-id="${parent.id}" data-name="${escapeHtml(name)}">Deactivate</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Attach event handlers
  tbody.querySelectorAll('.edit-parent-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
  });

  tbody.querySelectorAll('.link-delegate-btn').forEach(btn => {
    btn.addEventListener('click', () => openLinkModal(parseInt(btn.dataset.id), btn.dataset.name));
  });

  tbody.querySelectorAll('.deactivate-parent-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeactivate(parseInt(btn.dataset.id), btn.dataset.name));
  });
}

// Render pagination
function renderPagination() {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `<button class="page-btn px-3 py-1 rounded ${filters.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}" data-page="${filters.page - 1}" ${filters.page === 1 ? 'disabled' : ''}>Prev</button>`;

  // Page numbers
  const maxPages = 5;
  let startPage = Math.max(1, filters.page - Math.floor(maxPages / 2));
  let endPage = Math.min(totalPages, startPage + maxPages - 1);
  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  if (startPage > 1) {
    html += `<button class="page-btn px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700" data-page="1">1</button>`;
    if (startPage > 2) {
      html += `<span class="px-2 text-gray-400">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === filters.page;
    html += `<button class="page-btn px-3 py-1 rounded ${isActive ? 'bg-legend-blue text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}" data-page="${i}" ${isActive ? 'disabled' : ''}>${i}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="px-2 text-gray-400">...</span>`;
    }
    html += `<button class="page-btn px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700" data-page="${totalPages}">${totalPages}</button>`;
  }

  // Next button
  html += `<button class="page-btn px-3 py-1 rounded ${filters.page === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}" data-page="${filters.page + 1}" ${filters.page === totalPages ? 'disabled' : ''}>Next</button>`;

  pagination.innerHTML = html;

  // Attach click handlers
  pagination.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      filters.page = parseInt(btn.dataset.page);
      loadParents();
    });
  });
}

// Apply filters
function applyFilters() {
  filters.search = document.getElementById('search-input').value.trim();
  filters.status = document.getElementById('filter-status').value;
  filters.page = 1; // Reset to first page
  loadParents();
}

// Clear filters
function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-status').value = 'all';

  filters.search = '';
  filters.status = 'all';
  filters.page = 1;

  loadParents();
}

// Open add modal
function openAddModal() {
  editingParentId = null;

  const titleEl = document.getElementById('parent-form-title');
  const idField = document.getElementById('parent-id');
  const firstNameField = document.getElementById('parent-first-name');
  const lastNameField = document.getElementById('parent-last-name');
  const emailField = document.getElementById('parent-email');
  const phoneField = document.getElementById('parent-phone');
  const statusField = document.getElementById('parent-status');
  const tempPasswordField = document.getElementById('parent-temp-password');
  const modal = document.getElementById('parent-modal');

  if (titleEl) titleEl.textContent = 'Add Parent';
  if (idField) idField.value = '';
  if (firstNameField) firstNameField.value = '';
  if (lastNameField) lastNameField.value = '';
  if (emailField) emailField.value = '';
  if (phoneField) phoneField.value = '';
  if (statusField) statusField.value = 'active';
  if (tempPasswordField) tempPasswordField.value = '';

  if (modal) modal.classList.remove('hidden');
}

// Open edit modal
function openEditModal(parentId) {
  const parent = parentsList.find(p => p.id === parentId);
  if (!parent) {
    showError('Parent not found');
    return;
  }

  editingParentId = parentId;

  const titleEl = document.getElementById('parent-form-title');
  const idField = document.getElementById('parent-id');
  const firstNameField = document.getElementById('parent-first-name');
  const lastNameField = document.getElementById('parent-last-name');
  const emailField = document.getElementById('parent-email');
  const phoneField = document.getElementById('parent-phone');
  const statusField = document.getElementById('parent-status');
  const tempPasswordField = document.getElementById('parent-temp-password');
  const modal = document.getElementById('parent-modal');

  if (titleEl) titleEl.textContent = 'Edit Parent';
  if (idField) idField.value = parentId;
  if (firstNameField) firstNameField.value = parent.firstName || '';
  if (lastNameField) lastNameField.value = parent.lastName || '';
  if (emailField) emailField.value = parent.email || '';
  if (phoneField) phoneField.value = parent.phone || '';
  if (statusField) statusField.value = parent.status || 'active';
  if (tempPasswordField) tempPasswordField.value = '';

  if (modal) modal.classList.remove('hidden');
}

// Close parent modal
function closeParentModal() {
  const modal = document.getElementById('parent-modal');
  if (modal) modal.classList.add('hidden');
  editingParentId = null;
}

// Save parent (add or update)
async function saveParent() {
  const firstName = document.getElementById('parent-first-name').value.trim();
  const lastName = document.getElementById('parent-last-name').value.trim();
  const email = document.getElementById('parent-email').value.trim();
  const phone = document.getElementById('parent-phone').value.trim();
  const status = document.getElementById('parent-status').value;
  const tempPassword = document.getElementById('parent-temp-password').value.trim();

  if (!firstName || !lastName || !email) {
    showError('First name, last name, and email are required');
    return;
  }

  const saveBtn = document.getElementById('save-parent-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
    };

    const body = {
      firstName,
      lastName,
      email,
      phone: phone || null,
      status
    };

    // Only include password if provided
    if (tempPassword) {
      body.tempPassword = tempPassword;
    }

    let url, method;
    if (editingParentId) {
      url = `${apiBase}/parents/${editingParentId}`;
      method = 'PUT';
    } else {
      url = `${apiBase}/program-years/${currentProgramYearId}/parents`;
      method = 'POST';
    }

    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save parent');
    }

    showSuccess(editingParentId ? 'Parent updated successfully' : 'Parent added successfully');
    closeParentModal();
    await loadParents();

  } catch (err) {
    showError(err.message || 'Failed to save parent');
    console.error('Error saving parent:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

// Confirm deactivate
function confirmDeactivate(parentId, parentName) {
  const modal = document.getElementById('confirmation-modal');
  const title = document.getElementById('confirmation-title');
  const message = document.getElementById('confirmation-message');
  const confirmBtn = document.getElementById('confirmation-confirm-btn');
  const cancelBtn = document.getElementById('confirmation-cancel-btn');

  title.textContent = 'Deactivate Parent';
  message.textContent = `Are you sure you want to deactivate "${parentName}"? This will mark their account as inactive.`;
  confirmBtn.textContent = 'Deactivate';

  // Clone to remove old listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  newConfirmBtn.addEventListener('click', async () => {
    modal.classList.add('hidden');
    await deactivateParent(parentId);
  });

  newCancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.classList.remove('hidden');
}

// Deactivate parent
async function deactivateParent(parentId) {
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    const response = await fetch(`${apiBase}/parents/${parentId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to deactivate parent');
    }

    showSuccess('Parent deactivated successfully');
    await loadParents();

  } catch (err) {
    showError(err.message || 'Failed to deactivate parent');
    console.error('Error deactivating parent:', err);
  }
}

// Load delegates for linking
async function loadDelegatesForLinking() {
  if (!currentProgramYearId) return [];

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    const url = `${apiBase}/program-years/${currentProgramYearId}/delegates`;
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 204 || response.status === 404) {
        return [];
      }
      throw new Error('Failed to load delegates');
    }

    const data = await response.json();

    // Handle both array and paginated response
    if (Array.isArray(data)) {
      return data;
    } else {
      return data.delegates || [];
    }

  } catch (err) {
    console.error('Error loading delegates for linking:', err);
    return [];
  }
}

// Open link modal
async function openLinkModal(parentId, parentName) {
  linkingParentId = parentId;

  const modal = document.getElementById('link-modal');
  const parentNameEl = document.getElementById('link-parent-name');
  const delegateSelect = document.getElementById('link-delegate-select');
  const linkParentIdField = document.getElementById('link-parent-id');

  if (parentNameEl) parentNameEl.textContent = `Linking delegate to: ${parentName}`;
  if (linkParentIdField) linkParentIdField.value = parentId;

  // Load delegates
  delegateSelect.innerHTML = '<option value="">Loading delegates...</option>';
  modal.classList.remove('hidden');

  delegatesList = await loadDelegatesForLinking();

  if (delegatesList.length === 0) {
    delegateSelect.innerHTML = '<option value="">No delegates available</option>';
    return;
  }

  // Sort by last name, first name
  delegatesList.sort((a, b) => {
    const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
    if (lastNameCompare !== 0) return lastNameCompare;
    return (a.firstName || '').localeCompare(b.firstName || '');
  });

  delegateSelect.innerHTML = '<option value="">Select a delegate...</option>' +
    delegatesList.map(d => `<option value="${d.id}">${escapeHtml(d.firstName)} ${escapeHtml(d.lastName)} (${escapeHtml(d.email || 'no email')})</option>`).join('');
}

// Close link modal
function closeLinkModal() {
  const modal = document.getElementById('link-modal');
  if (modal) modal.classList.add('hidden');
  linkingParentId = null;
}

// Save link
async function saveLink() {
  const delegateId = document.getElementById('link-delegate-select').value;

  if (!delegateId) {
    showError('Please select a delegate to link');
    return;
  }

  if (!linkingParentId) {
    showError('No parent selected');
    return;
  }

  const saveBtn = document.getElementById('save-link-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Linking...';

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
    };

    const body = {
      delegateId: parseInt(delegateId),
      parentId: linkingParentId,
      programYearId: currentProgramYearId
    };

    const response = await fetch(`${apiBase}/delegate-parent-links`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to link delegate');
    }

    showSuccess('Delegate linked successfully');
    closeLinkModal();
    await loadParents();

  } catch (err) {
    showError(err.message || 'Failed to link delegate');
    console.error('Error linking delegate:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Link Delegate';
  }
}

// Initialize
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
        filters.page = 1;
        await loadParents();
      }
    });
  }

  // Filter buttons
  document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
  document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

  // Search on Enter key
  document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  });

  // Add parent button
  document.getElementById('add-parent-btn').addEventListener('click', openAddModal);

  // Parent modal buttons
  document.getElementById('parent-modal-close').addEventListener('click', closeParentModal);
  document.getElementById('cancel-parent-btn').addEventListener('click', closeParentModal);
  document.getElementById('save-parent-btn').addEventListener('click', saveParent);

  // Generate password button
  const generatePasswordBtn = document.getElementById('generate-parent-password-btn');
  if (generatePasswordBtn) {
    generatePasswordBtn.addEventListener('click', () => {
      const passwordField = document.getElementById('parent-temp-password');
      if (passwordField) {
        passwordField.value = generateTempPassword();
      }
    });
  }

  // Close parent modal on backdrop click
  document.getElementById('parent-modal').addEventListener('click', (e) => {
    if (e.target.id === 'parent-modal') closeParentModal();
  });

  // Link modal buttons
  document.getElementById('link-modal-close').addEventListener('click', closeLinkModal);
  document.getElementById('cancel-link-btn').addEventListener('click', closeLinkModal);
  document.getElementById('save-link-btn').addEventListener('click', saveLink);

  // Close link modal on backdrop click
  document.getElementById('link-modal').addEventListener('click', (e) => {
    if (e.target.id === 'link-modal') closeLinkModal();
  });

  // Confirmation modal backdrop click
  document.getElementById('confirmation-modal').addEventListener('click', (e) => {
    if (e.target.id === 'confirmation-modal') {
      e.target.classList.add('hidden');
    }
  });

  // Load data
  if (currentProgramId) {
    loadProgramYears();
  } else {
    showError('No program selected. Please select a program from the dashboard.');
  }
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
    applyFilters,
    clearFilters,
    loadParents,
    saveParent,
    deactivateParent,
    openLinkModal,
    closeLinkModal,
    saveLink
  };
}
})();
