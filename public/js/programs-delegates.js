// programs-delegates.js
// Delegate management with search, filtering, and pagination
(function() {
'use strict';

const apiBase = window.API_URL || '';

// State
let currentProgramId = null;
let currentProgramYearId = null;
let delegatesList = [];
let groupingsList = [];
let partiesList = [];
let editingDelegateId = null;

// Filter state
let filters = {
  search: '',
  groupingId: '',
  partyId: '',
  status: 'all',
  page: 1,
  pageSize: 50
};

// Pagination state
let totalDelegates = 0;
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
    await Promise.all([loadGroupings(), loadParties()]);
    await loadDelegates();

  } catch (err) {
    showError(err.message || 'Failed to load program years');
    console.error('Error loading program years:', err);
  }
}

// Load groupings for filter dropdown (only active for current program year)
async function loadGroupings() {
  if (!currentProgramYearId) return;

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/groupings`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 204 || response.status === 404) {
        groupingsList = [];
        updateGroupingDropdowns();
        return;
      }
      throw new Error('Failed to load groupings');
    }

    // Response is ProgramYearGrouping records with nested grouping and groupingType
    const programYearGroupings = await response.json();

    // Transform to format expected by dropdowns (flatten grouping properties)
    groupingsList = programYearGroupings.map(pyg => ({
      id: pyg.grouping.id,
      name: pyg.grouping.name,
      groupingType: pyg.grouping.groupingType,
      status: pyg.status,
    }));

    updateGroupingDropdowns();

  } catch (err) {
    console.error('Error loading groupings:', err);
    groupingsList = [];
    updateGroupingDropdowns();
  }
}

// Load parties for filter dropdown
async function loadParties() {
  if (!currentProgramYearId) return;

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/parties`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 204 || response.status === 404) {
        partiesList = [];
        return;
      }
      throw new Error('Failed to load parties');
    }

    const allParties = await response.json();

    // Filter out retired and deduplicate by partyId (underlying Party, not ProgramYearParty)
    const seenPartyIds = new Set();
    partiesList = allParties.filter(p => {
      if (p.status === 'retired') return false;
      if (seenPartyIds.has(p.partyId)) return false;
      seenPartyIds.add(p.partyId);
      return true;
    });

    updatePartyDropdowns();

  } catch (err) {
    console.error('Error loading parties:', err);
    partiesList = [];
  }
}

// Update grouping dropdowns (filter and edit modal)
function updateGroupingDropdowns() {
  const filterSelect = document.getElementById('filter-grouping');
  const editSelect = document.getElementById('delegate-grouping');

  // Group by type
  const grouped = {};
  groupingsList.forEach(g => {
    const typeName = g.groupingType?.customName || g.groupingType?.defaultName || 'Other';
    if (!grouped[typeName]) grouped[typeName] = [];
    grouped[typeName].push(g);
  });

  const typeNames = Object.keys(grouped).sort();

  // Filter dropdown
  if (filterSelect) {
    let html = '<option value="">All Groupings</option><option value="unassigned">Unassigned</option>';
    if (typeNames.length === 1) {
      html += grouped[typeNames[0]].map(g =>
        `<option value="${g.id}">${escapeHtml(g.name)}</option>`
      ).join('');
    } else {
      typeNames.forEach(typeName => {
        html += `<optgroup label="${escapeHtml(typeName)}">`;
        html += grouped[typeName].map(g =>
          `<option value="${g.id}">${escapeHtml(g.name)}</option>`
        ).join('');
        html += '</optgroup>';
      });
    }
    filterSelect.innerHTML = html;
  }

  // Edit modal dropdown
  if (editSelect) {
    let html = '<option value="">No assignment</option>';
    if (typeNames.length === 1) {
      html += grouped[typeNames[0]].map(g =>
        `<option value="${g.id}">${escapeHtml(g.name)}</option>`
      ).join('');
    } else {
      typeNames.forEach(typeName => {
        html += `<optgroup label="${escapeHtml(typeName)}">`;
        html += grouped[typeName].map(g =>
          `<option value="${g.id}">${escapeHtml(g.name)}</option>`
        ).join('');
        html += '</optgroup>';
      });
    }
    editSelect.innerHTML = html;
  }
}

// Update party dropdowns (filter and edit modal)
function updatePartyDropdowns() {
  const filterSelect = document.getElementById('filter-party');
  const editSelect = document.getElementById('delegate-party');

  // Filter dropdown
  if (filterSelect) {
    let html = '<option value="">All Parties</option><option value="unassigned">Unassigned</option>';
    html += partiesList.map(p => {
      const name = p.party?.name || 'Unknown';
      return `<option value="${p.id}">${escapeHtml(name)}</option>`;
    }).join('');
    filterSelect.innerHTML = html;
  }

  // Edit modal dropdown
  if (editSelect) {
    let html = '<option value="">No party</option>';
    html += partiesList.map(p => {
      const name = p.party?.name || 'Unknown';
      return `<option value="${p.id}">${escapeHtml(name)}</option>`;
    }).join('');
    editSelect.innerHTML = html;
  }
}

// Load delegates with current filters
async function loadDelegates() {
  if (!currentProgramYearId) return;

  const tbody = document.getElementById('delegates-table-body');
  const resultsCount = document.getElementById('results-count');

  tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500 italic">Loading delegates...</td></tr>';

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Build query string
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.groupingId) params.set('groupingId', filters.groupingId);
    if (filters.partyId) params.set('partyId', filters.partyId);
    if (filters.status) params.set('status', filters.status);
    params.set('page', filters.page.toString());
    params.set('pageSize', filters.pageSize.toString());

    const url = `${apiBase}/program-years/${currentProgramYearId}/delegates?${params.toString()}`;
    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 204 || response.status === 404) {
        delegatesList = [];
        totalDelegates = 0;
        totalPages = 0;
        renderDelegatesTable();
        return;
      }
      throw new Error('Failed to load delegates');
    }

    const data = await response.json();

    // Handle both old format (array) and new format (object with pagination)
    if (Array.isArray(data)) {
      delegatesList = data;
      totalDelegates = data.length;
      totalPages = 1;
    } else {
      delegatesList = data.delegates || [];
      totalDelegates = data.total || 0;
      totalPages = data.totalPages || 1;
      filters.page = data.page || 1;
    }

    renderDelegatesTable();
    renderPagination();

    // Update results count
    if (resultsCount) {
      if (totalDelegates === 0) {
        resultsCount.textContent = 'No delegates found';
      } else if (totalDelegates === 1) {
        resultsCount.textContent = '1 delegate found';
      } else {
        const start = (filters.page - 1) * filters.pageSize + 1;
        const end = Math.min(filters.page * filters.pageSize, totalDelegates);
        resultsCount.textContent = `Showing ${start}-${end} of ${totalDelegates} delegates`;
      }
    }

  } catch (err) {
    showError(err.message || 'Failed to load delegates');
    console.error('Error loading delegates:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">Failed to load delegates</td></tr>';
  }
}

// Render delegates table
function renderDelegatesTable() {
  const tbody = document.getElementById('delegates-table-body');
  if (!tbody) return;

  if (!delegatesList || delegatesList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500 italic">No delegates found</td></tr>';
    return;
  }

  tbody.innerHTML = delegatesList.map(delegate => {
    const name = `${escapeHtml(delegate.firstName)} ${escapeHtml(delegate.lastName)}`;
    const email = escapeHtml(delegate.email) || '-';

    // Get grouping name
    let groupingDisplay = '-';
    if (delegate.grouping) {
      const typeName = delegate.grouping.groupingType?.customName || delegate.grouping.groupingType?.defaultName || '';
      groupingDisplay = typeName ? `${escapeHtml(delegate.grouping.name)} (${escapeHtml(typeName)})` : escapeHtml(delegate.grouping.name);
    }

    // Get party name
    let partyDisplay = '-';
    if (delegate.party?.party) {
      partyDisplay = escapeHtml(delegate.party.party.name);
    }

    // Status badge
    const statusClass = delegate.status === 'active'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-600';
    const statusDisplay = `<span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${escapeHtml(delegate.status)}</span>`;

    return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 whitespace-nowrap">${name}</td>
        <td class="px-4 py-3 whitespace-nowrap">${email}</td>
        <td class="px-4 py-3 whitespace-nowrap">${groupingDisplay}</td>
        <td class="px-4 py-3 whitespace-nowrap">${partyDisplay}</td>
        <td class="px-4 py-3 whitespace-nowrap">${statusDisplay}</td>
        <td class="px-4 py-3 whitespace-nowrap">
          <button class="edit-delegate-btn text-legend-blue hover:text-blue-800 font-semibold text-sm mr-3" data-id="${delegate.id}">Edit</button>
          ${delegate.status === 'active' ? `<button class="withdraw-delegate-btn text-red-600 hover:text-red-800 font-semibold text-sm" data-id="${delegate.id}" data-name="${escapeHtml(name)}">Withdraw</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Attach event handlers
  tbody.querySelectorAll('.edit-delegate-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
  });

  tbody.querySelectorAll('.withdraw-delegate-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmWithdraw(parseInt(btn.dataset.id), btn.dataset.name));
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
      loadDelegates();
    });
  });
}

// Apply filters
function applyFilters() {
  filters.search = document.getElementById('search-input').value.trim();
  filters.groupingId = document.getElementById('filter-grouping').value;
  filters.partyId = document.getElementById('filter-party').value;
  filters.status = document.getElementById('filter-status').value;
  filters.page = 1; // Reset to first page
  loadDelegates();
}

// Clear filters
function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-grouping').value = '';
  document.getElementById('filter-party').value = '';
  document.getElementById('filter-status').value = 'all';

  filters.search = '';
  filters.groupingId = '';
  filters.partyId = '';
  filters.status = 'all';
  filters.page = 1;

  loadDelegates();
}

// Open edit modal
function openEditModal(delegateId) {
  const delegate = delegatesList.find(d => d.id === delegateId);
  if (!delegate) {
    showError('Delegate not found');
    return;
  }

  editingDelegateId = delegateId;

  const idField = document.getElementById('delegate-id');
  const firstNameField = document.getElementById('delegate-first-name');
  const lastNameField = document.getElementById('delegate-last-name');
  const emailField = document.getElementById('delegate-email');
  const phoneField = document.getElementById('delegate-phone');
  const groupingField = document.getElementById('delegate-grouping');
  const partyField = document.getElementById('delegate-party');
  const statusField = document.getElementById('delegate-status');
  const modal = document.getElementById('delegate-modal');

  if (idField) idField.value = delegateId;
  if (firstNameField) firstNameField.value = delegate.firstName || '';
  if (lastNameField) lastNameField.value = delegate.lastName || '';
  if (emailField) emailField.value = delegate.email || '';
  if (phoneField) phoneField.value = delegate.phone || '';
  if (groupingField) groupingField.value = delegate.groupingId || '';
  if (partyField) partyField.value = delegate.partyId || '';
  if (statusField) statusField.value = delegate.status || 'active';

  // Clear password field
  const tempPasswordField = document.getElementById('delegate-temp-password');
  if (tempPasswordField) tempPasswordField.value = '';

  if (modal) modal.classList.remove('hidden');
}

// Close edit modal
function closeEditModal() {
  const modal = document.getElementById('delegate-modal');
  if (modal) modal.classList.add('hidden');
  editingDelegateId = null;
}

// Save delegate changes
async function saveDelegate() {
  if (!editingDelegateId) return;

  const firstName = document.getElementById('delegate-first-name').value.trim();
  const lastName = document.getElementById('delegate-last-name').value.trim();
  const email = document.getElementById('delegate-email').value.trim();
  const phone = document.getElementById('delegate-phone').value.trim();
  const groupingId = document.getElementById('delegate-grouping').value;
  const partyId = document.getElementById('delegate-party').value;
  const status = document.getElementById('delegate-status').value;
  const tempPassword = document.getElementById('delegate-temp-password').value.trim();

  if (!firstName || !lastName || !email) {
    showError('First name, last name, and email are required');
    return;
  }

  const saveBtn = document.getElementById('save-delegate-btn');
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
      groupingId: groupingId ? parseInt(groupingId) : null,
      partyId: partyId ? parseInt(partyId) : null,
      status
    };

    // Only include password if provided
    if (tempPassword) {
      body.tempPassword = tempPassword;
    }

    const response = await fetch(`${apiBase}/delegates/${editingDelegateId}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save delegate');
    }

    showSuccess('Delegate updated successfully');
    closeEditModal();
    await loadDelegates();

  } catch (err) {
    showError(err.message || 'Failed to save delegate');
    console.error('Error saving delegate:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

// Confirm withdraw
function confirmWithdraw(delegateId, delegateName) {
  const modal = document.getElementById('confirmation-modal');
  const title = document.getElementById('confirmation-title');
  const message = document.getElementById('confirmation-message');
  const confirmBtn = document.getElementById('confirmation-confirm-btn');
  const cancelBtn = document.getElementById('confirmation-cancel-btn');

  title.textContent = 'Withdraw Delegate';
  message.textContent = `Are you sure you want to withdraw "${delegateName}"? This will mark them as inactive.`;
  confirmBtn.textContent = 'Withdraw';

  // Clone to remove old listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  newConfirmBtn.addEventListener('click', async () => {
    modal.classList.add('hidden');
    await withdrawDelegate(delegateId);
  });

  newCancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.classList.remove('hidden');
}

// Withdraw delegate
async function withdrawDelegate(delegateId) {
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    const response = await fetch(`${apiBase}/delegates/${delegateId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to withdraw delegate');
    }

    showSuccess('Delegate withdrawn successfully');
    await loadDelegates();

  } catch (err) {
    showError(err.message || 'Failed to withdraw delegate');
    console.error('Error withdrawing delegate:', err);
  }
}

// Auto-assign delegates - open modal and load preview
async function openAutoAssignModal() {
  if (!currentProgramYearId) {
    showError('Please select a program year first');
    return;
  }

  const modal = document.getElementById('auto-assign-modal');
  const loadingEl = document.getElementById('auto-assign-loading');
  const previewEl = document.getElementById('auto-assign-preview');
  const emptyEl = document.getElementById('auto-assign-empty');
  const errorEl = document.getElementById('auto-assign-error');
  const successEl = document.getElementById('auto-assign-success');

  // Reset states
  loadingEl.classList.remove('hidden');
  previewEl.classList.add('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  modal.classList.remove('hidden');

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
    };

    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/delegates/assign/preview`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    loadingEl.classList.add('hidden');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to preview assignment');
    }

    const data = await response.json();
    renderAutoAssignPreview(data);

  } catch (err) {
    loadingEl.classList.add('hidden');

    if (err.message && err.message.includes('No unassigned delegates')) {
      emptyEl.classList.remove('hidden');
    } else {
      errorEl.classList.remove('hidden');
      document.getElementById('auto-assign-error-message').textContent = err.message || 'Failed to load assignment preview';
    }

    console.error('Error loading auto-assign preview:', err);
  }
}

// Render auto-assign preview
function renderAutoAssignPreview(data) {
  const previewEl = document.getElementById('auto-assign-preview');

  // Update stats
  document.getElementById('assign-total').textContent = data.totalDelegates;
  document.getElementById('assign-already').textContent = data.alreadyAssigned;
  document.getElementById('assign-pending').textContent = data.toBeAssigned;
  document.getElementById('assign-groupings').textContent = data.groupings;

  // Render distribution
  const distributionEl = document.getElementById('assign-distribution');
  if (data.summary && data.summary.length > 0) {
    distributionEl.innerHTML = data.summary.map(g => {
      const partyBars = g.parties.map(p => {
        const existingWidth = g.totalCount > 0 ? (p.existingCount / Math.max(g.totalCount, 1)) * 100 : 0;
        const newWidth = g.totalCount > 0 ? (p.newCount / Math.max(g.totalCount, 1)) * 100 : 0;
        return `
          <div class="flex items-center gap-2 text-sm">
            <span class="w-24 truncate" title="${escapeHtml(p.partyName)}">${escapeHtml(p.partyName)}</span>
            <div class="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div class="h-full flex">
                <div class="bg-gray-400 assign-bar" data-width="${existingWidth}"></div>
                <div class="assign-bar" data-width="${newWidth}" data-color="${p.partyColor || '#8B5CF6'}"></div>
              </div>
            </div>
            <span class="w-16 text-right text-gray-600">${p.existingCount} + ${p.newCount}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="flex justify-between items-center mb-2">
            <span class="font-semibold text-gray-700">${escapeHtml(g.groupingName)}</span>
            <span class="text-sm text-gray-500">${g.totalExisting} existing + ${g.totalNew} new = ${g.totalCount} total</span>
          </div>
          <div class="space-y-1">
            ${partyBars}
          </div>
        </div>
      `;
    }).join('');

    // Apply widths and colors via JS to avoid CSP inline style violations
    distributionEl.querySelectorAll('.assign-bar').forEach(bar => {
      const width = bar.getAttribute('data-width');
      const color = bar.getAttribute('data-color');
      if (width) bar.style.width = width + '%';
      if (color) bar.style.backgroundColor = color;
    });
  } else {
    distributionEl.innerHTML = '<p class="text-gray-500 text-center py-4">No distribution data available</p>';
  }

  previewEl.classList.remove('hidden');
}

// Execute auto-assign
async function executeAutoAssign() {
  if (!currentProgramYearId) return;

  const executeBtn = document.getElementById('execute-assign-btn');
  const previewEl = document.getElementById('auto-assign-preview');
  const loadingEl = document.getElementById('auto-assign-loading');
  const successEl = document.getElementById('auto-assign-success');
  const errorEl = document.getElementById('auto-assign-error');

  executeBtn.disabled = true;
  executeBtn.textContent = 'Assigning...';

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
    };

    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/delegates/assign`, {
      method: 'POST',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to assign delegates');
    }

    const results = await response.json();

    previewEl.classList.add('hidden');
    successEl.classList.remove('hidden');

    let message = `Successfully assigned ${results.assigned} delegate${results.assigned !== 1 ? 's' : ''} to groupings and parties.`;
    if (results.failed > 0) {
      message += ` ${results.failed} failed.`;
    }
    document.getElementById('assign-success-message').textContent = message;

    // Refresh the delegates list
    await loadDelegates();

  } catch (err) {
    previewEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    document.getElementById('auto-assign-error-message').textContent = err.message || 'Failed to assign delegates';
    console.error('Error executing auto-assign:', err);
  } finally {
    executeBtn.disabled = false;
    executeBtn.textContent = 'Assign Now';
  }
}

// Close auto-assign modal
function closeAutoAssignModal() {
  const modal = document.getElementById('auto-assign-modal');
  if (modal) modal.classList.add('hidden');
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
        await Promise.all([loadGroupings(), loadParties()]);
        await loadDelegates();
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

  // Modal buttons
  document.getElementById('delegate-modal-close').addEventListener('click', closeEditModal);
  document.getElementById('cancel-delegate-btn').addEventListener('click', closeEditModal);
  document.getElementById('save-delegate-btn').addEventListener('click', saveDelegate);

  // Generate password button
  const generatePasswordBtn = document.getElementById('generate-delegate-password-btn');
  if (generatePasswordBtn) {
    generatePasswordBtn.addEventListener('click', () => {
      const passwordField = document.getElementById('delegate-temp-password');
      if (passwordField) {
        passwordField.value = generateTempPassword();
      }
    });
  }

  // Close modal on backdrop click
  document.getElementById('delegate-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delegate-modal') closeEditModal();
  });

  document.getElementById('confirmation-modal').addEventListener('click', (e) => {
    if (e.target.id === 'confirmation-modal') {
      e.target.classList.add('hidden');
    }
  });

  // Auto-assign buttons
  const autoAssignBtn = document.getElementById('auto-assign-btn');
  if (autoAssignBtn) {
    autoAssignBtn.addEventListener('click', openAutoAssignModal);
  }

  const autoAssignModal = document.getElementById('auto-assign-modal');
  if (autoAssignModal) {
    document.getElementById('auto-assign-modal-close').addEventListener('click', closeAutoAssignModal);
    document.getElementById('cancel-assign-btn').addEventListener('click', closeAutoAssignModal);
    document.getElementById('execute-assign-btn').addEventListener('click', executeAutoAssign);
    document.getElementById('close-assign-empty-btn').addEventListener('click', closeAutoAssignModal);
    document.getElementById('close-assign-error-btn').addEventListener('click', closeAutoAssignModal);
    document.getElementById('close-assign-success-btn').addEventListener('click', closeAutoAssignModal);

    // Close on backdrop click
    autoAssignModal.addEventListener('click', (e) => {
      if (e.target.id === 'auto-assign-modal') closeAutoAssignModal();
    });
  }

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
    loadDelegates,
    saveDelegate,
    withdrawDelegate,
    openAutoAssignModal,
    executeAutoAssign,
    closeAutoAssignModal
  };
}
})();
