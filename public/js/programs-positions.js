// programs-positions.js
// Program-level position management

const apiBase = window.API_URL || "";

// Get programId from URL params or localStorage
function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  const urlProgramId = params.get('programId');
  const storedProgramId = localStorage.getItem('lastSelectedProgramId');
  return urlProgramId || storedProgramId || '';
}

// Get username from session/localStorage
function getUsername() {
  return localStorage.getItem("user") || sessionStorage.getItem("user");
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
function renderProgramSelector(programId, programName, year) {
  const container = document.getElementById("program-selector");
  if (!programId || !programName) {
    container.innerHTML = '<div class="text-red-600 font-semibold">No program selected. Please return to the dashboard.</div>';
    return;
  }

  const yearDisplay = year ? ` (${year})` : '';

  container.innerHTML = `
    <div class="mb-2 flex items-center">
      <span class="font-bold text-gray-700 mr-2">Program:</span>
      <span class="text-lg text-legend-blue font-semibold">${programName}${yearDisplay}</span>
    </div>
  `;
}

// Helper to safely escape HTML
function escapeHtml(str) {
  return ('' + str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// DATA STORAGE
// ============================================================

let positions = []; // Store loaded positions globally
let groupingTypes = []; // Store organizational levels
let editingPositionId = null; // Track if we're editing
let collapsedLevels = new Set(); // Track collapsed level sections

// ============================================================
// LOAD DATA
// ============================================================

// Load organizational levels (grouping types) from API
async function loadGroupingTypes() {
  const programId = getProgramId();
  if (!programId) return;

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/grouping-types`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 204) {
        groupingTypes = [];
        return;
      }
      throw new Error('Failed to load organizational levels');
    }

    groupingTypes = await response.json();
    groupingTypes = groupingTypes.filter(t => t.status !== 'retired');

    // Sort by levelOrder (ensure numeric comparison)
    groupingTypes.sort((a, b) => {
      const aOrder = Number(a.levelOrder) || 0;
      const bOrder = Number(b.levelOrder) || 0;
      return aOrder - bOrder;
    });

    // Update the dropdown in the form
    updateLevelDropdown();

    // Update quick setup visibility
    updateQuickSetupVisibility();

  } catch (err) {
    console.error('Error loading grouping types:', err);
  }
}

// Load positions from API
async function loadPositions() {
  const programId = getProgramId();
  const positionsList = document.getElementById('positions-list');

  if (!programId) {
    showError('No program selected. Please select a program first.');
    positionsList.innerHTML = '<p class="text-gray-500">No program selected.</p>';
    return;
  }

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/positions`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 204) {
        positionsList.innerHTML = '<p class="text-gray-500 italic">No positions defined yet. Click "Add Position" or use Quick Setup to get started.</p>';
        positions = [];
        return;
      }
      if (response.status === 403) {
        throw new Error('Access denied. You may need to check your permissions.');
      }
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to load positions (${response.status})`);
    }

    positions = await response.json();

    if (positions.length === 0) {
      positionsList.innerHTML = '<p class="text-gray-500 italic">No positions defined yet. Click "Add Position" or use Quick Setup to get started.</p>';
      return;
    }

    // Filter out retired positions
    const activePositions = positions.filter(p => p.status !== 'retired');

    if (activePositions.length === 0) {
      positionsList.innerHTML = '<p class="text-gray-500 italic">No active positions. Click "Add Position" to create one.</p>';
      return;
    }

    // Render positions grouped by level
    renderPositionsList(activePositions);

  } catch (err) {
    showError(err.message || 'Failed to load positions');
    console.error('Error loading positions:', err);
  }
}

// ============================================================
// RENDERING
// ============================================================

// Render positions grouped by organizational level
function renderPositionsList(activePositions) {
  const positionsList = document.getElementById('positions-list');

  if (!activePositions || activePositions.length === 0) {
    positionsList.innerHTML = '<p class="text-gray-500 italic">No active positions.</p>';
    return;
  }

  // Group positions by groupingTypeId
  const grouped = {};
  const noLevel = [];

  activePositions.forEach(pos => {
    if (pos.groupingTypeId) {
      if (!grouped[pos.groupingTypeId]) {
        grouped[pos.groupingTypeId] = [];
      }
      grouped[pos.groupingTypeId].push(pos);
    } else {
      noLevel.push(pos);
    }
  });

  let html = '';

  // Sort grouping types by levelOrder (ascending - 1 is top level like State)
  const sortedTypes = [...groupingTypes].sort((a, b) => {
    const aOrder = Number(a.levelOrder) || 999;
    const bOrder = Number(b.levelOrder) || 999;
    return aOrder - bOrder;
  });

  // Render each level group
  sortedTypes.forEach(type => {
    const levelPositions = grouped[type.id] || [];
    if (levelPositions.length === 0) return;

    // Sort positions by displayOrder (null/undefined goes last), then name
    levelPositions.sort((a, b) => {
      const aOrder = a.displayOrder != null ? a.displayOrder : Infinity;
      const bOrder = b.displayOrder != null ? b.displayOrder : Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    const levelName = type.customName || type.defaultName;
    const isCollapsed = collapsedLevels.has(String(type.id));

    html += renderLevelSection(type.id, levelName, levelPositions, isCollapsed);
  });

  // Render positions without a level
  if (noLevel.length > 0) {
    noLevel.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return (a.displayOrder || 0) - (b.displayOrder || 0);
      return a.name.localeCompare(b.name);
    });
    const isCollapsed = collapsedLevels.has('no-level');
    html += renderLevelSection('no-level', 'Unassigned Level', noLevel, isCollapsed);
  }

  if (!html) {
    positionsList.innerHTML = '<p class="text-gray-500 italic">No positions to display.</p>';
    return;
  }

  positionsList.innerHTML = html;

  // Attach event handlers
  attachPositionEventHandlers();
}

// Render a single level section
function renderLevelSection(levelId, levelName, levelPositions, isCollapsed) {
  const toggleIcon = isCollapsed ? '▶' : '▼';
  const positionsHtml = isCollapsed ? '' : levelPositions.map(pos => renderPositionCard(pos)).join('');

  return `
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <div class="bg-gray-100 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition toggle-level-btn" data-level-id="${levelId}">
        <div class="flex items-center gap-2">
          <span class="text-gray-500 text-lg">${toggleIcon}</span>
          <h3 class="font-semibold text-legend-blue">${escapeHtml(levelName)}</h3>
          <span class="text-sm text-gray-500">(${levelPositions.length} position${levelPositions.length !== 1 ? 's' : ''})</span>
        </div>
      </div>
      ${!isCollapsed ? `<div class="p-3 space-y-2 bg-white">${positionsHtml}</div>` : ''}
    </div>
  `;
}

// Render a single position card
function renderPositionCard(position) {
  const electedBadge = position.isElected
    ? '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Elected</span>'
    : '<span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">Appointed</span>';

  const countBadge = (position.seatCount && position.seatCount > 1)
    ? `<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">${position.seatCount} seats</span>`
    : '';

  const description = position.description
    ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(position.description)}</p>`
    : '';

  return `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition">
      <div>
        <div class="flex items-center gap-2">
          <h4 class="font-semibold text-legend-blue">${escapeHtml(position.name)}</h4>
          ${electedBadge}
          ${countBadge}
        </div>
        ${description}
      </div>
      <div class="flex gap-2">
        <button class="edit-position-btn text-legend-blue hover:text-blue-800 font-semibold text-sm transition" data-id="${position.id}">
          Edit
        </button>
        <button class="delete-position-btn text-red-600 hover:text-red-800 font-semibold text-sm transition" data-id="${position.id}" data-name="${escapeHtml(position.name)}">
          Delete
        </button>
      </div>
    </div>
  `;
}

// Attach event handlers after rendering
function attachPositionEventHandlers() {
  // Level toggle handlers
  document.querySelectorAll('.toggle-level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const levelId = btn.dataset.levelId;
      toggleLevelCollapse(levelId);
    });
  });

  // Edit handlers
  document.querySelectorAll('.edit-position-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const positionId = parseInt(e.target.dataset.id);
      editPosition(positionId);
    });
  });

  // Delete handlers
  document.querySelectorAll('.delete-position-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const positionId = e.target.dataset.id;
      const positionName = e.target.dataset.name;
      showConfirmation(
        'Delete Position',
        `Are you sure you want to delete "${positionName}"?`,
        'Delete',
        () => deletePosition(positionId)
      );
    });
  });
}

// Toggle level collapse state
function toggleLevelCollapse(levelId) {
  if (collapsedLevels.has(String(levelId))) {
    collapsedLevels.delete(String(levelId));
  } else {
    collapsedLevels.add(String(levelId));
  }
  const activePositions = positions.filter(p => p.status !== 'retired');
  renderPositionsList(activePositions);
}

// Collapse all levels
function collapseAll() {
  groupingTypes.forEach(type => {
    collapsedLevels.add(String(type.id));
  });
  collapsedLevels.add('no-level');
  const activePositions = positions.filter(p => p.status !== 'retired');
  renderPositionsList(activePositions);
}

// Expand all levels
function expandAll() {
  collapsedLevels.clear();
  const activePositions = positions.filter(p => p.status !== 'retired');
  renderPositionsList(activePositions);
}

// Update level dropdown in the form
function updateLevelDropdown() {
  const select = document.getElementById('position-level-select');
  if (!select) return;

  select.innerHTML = '<option value="">Select a level...</option>' +
    groupingTypes.map(t => {
      const displayName = t.customName || t.defaultName;
      return `<option value="${t.id}">${displayName} (Level ${t.levelOrder})</option>`;
    }).join('');
}

// Update quick setup visibility
function updateQuickSetupVisibility() {
  const quickSetupButtons = document.getElementById('quick-setup-buttons');
  const noLevelsWarning = document.getElementById('no-levels-warning');

  if (groupingTypes.length === 0) {
    if (quickSetupButtons) quickSetupButtons.classList.add('hidden');
    if (noLevelsWarning) noLevelsWarning.classList.remove('hidden');
  } else {
    if (quickSetupButtons) quickSetupButtons.classList.remove('hidden');
    if (noLevelsWarning) noLevelsWarning.classList.add('hidden');
  }
}

// ============================================================
// MODAL FUNCTIONS
// ============================================================

function showPositionModal() {
  document.getElementById('position-modal').classList.remove('hidden');
}

function hidePositionModal() {
  document.getElementById('position-modal').classList.add('hidden');
  resetPositionForm();
}

function resetPositionForm() {
  editingPositionId = null;
  document.getElementById('position-name-input').value = '';
  document.getElementById('position-level-select').value = '';
  document.getElementById('position-count-input').value = '1';
  document.getElementById('position-order-input').value = '';
  document.getElementById('position-description-input').value = '';
  document.getElementById('position-elected-checkbox').checked = false;
  document.getElementById('position-form-title').textContent = 'Add New Position';
  document.getElementById('save-position-btn').textContent = 'Save Position';
}

// Populate form for editing
function editPosition(positionId) {
  const position = positions.find(p => p.id === positionId);
  if (!position) {
    showError('Could not find the position to edit.');
    return;
  }

  editingPositionId = positionId;

  document.getElementById('position-name-input').value = position.name || '';
  document.getElementById('position-level-select').value = position.groupingTypeId || '';
  document.getElementById('position-count-input').value = position.seatCount || 1;
  document.getElementById('position-order-input').value = position.displayOrder || '';
  document.getElementById('position-description-input').value = position.description || '';
  document.getElementById('position-elected-checkbox').checked = position.isElected || false;

  document.getElementById('position-form-title').textContent = 'Edit Position';
  document.getElementById('save-position-btn').textContent = 'Update Position';

  showPositionModal();
  clearMessages();
}

// ============================================================
// CRUD OPERATIONS
// ============================================================

// Save or update position
async function savePosition() {
  clearMessages();
  const programId = getProgramId();

  const name = document.getElementById('position-name-input').value.trim();
  const groupingTypeId = document.getElementById('position-level-select').value ? parseInt(document.getElementById('position-level-select').value) : null;
  const count = parseInt(document.getElementById('position-count-input').value) || 1;
  const displayOrder = document.getElementById('position-order-input').value ? parseInt(document.getElementById('position-order-input').value) : null;
  const description = document.getElementById('position-description-input').value.trim();
  const isElected = document.getElementById('position-elected-checkbox').checked;

  if (!name) {
    showError('Please provide a position name.');
    return;
  }

  if (!groupingTypeId) {
    showError('Please select an organizational level.');
    return;
  }

  const saveBtn = document.getElementById('save-position-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = editingPositionId ? 'Updating...' : 'Saving...';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const body = { name, groupingTypeId, description, displayOrder, isElected };
    // Include count if backend supports it
    if (count > 1) {
      body.seatCount = count;
    }

    let response;
    if (editingPositionId) {
      response = await fetch(`${apiBase}/positions/${editingPositionId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } else {
      response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/positions`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Failed to ${editingPositionId ? 'update' : 'save'} position`);
    }

    showSuccess(`Position "${name}" ${editingPositionId ? 'updated' : 'created'} successfully!`);
    hidePositionModal();
    await loadPositions();

  } catch (err) {
    showError(err.message || `Failed to ${editingPositionId ? 'update' : 'save'} position`);
    console.error('Error saving position:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editingPositionId ? 'Update Position' : 'Save Position';
  }
}

// Delete position
async function deletePosition(positionId) {
  clearMessages();

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/positions/${positionId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete position');
    }

    showSuccess('Position deleted successfully!');
    await loadPositions();

  } catch (err) {
    showError(err.message || 'Failed to delete position');
    console.error('Error deleting position:', err);
  }
}

// ============================================================
// QUICK SETUP DEFAULTS
// ============================================================

// Default positions organized by level and category
const DEFAULT_POSITIONS = {
  state: {
    executive: [
      { name: 'Governor', isElected: true, seatCount: 1 },
      { name: 'Lieutenant Governor', isElected: true, seatCount: 1 },
      { name: 'Secretary of State', isElected: true, seatCount: 1 },
      { name: 'Attorney General', isElected: true, seatCount: 1 },
      { name: 'State Treasurer', isElected: true, seatCount: 1 },
      { name: 'State Auditor', isElected: true, seatCount: 1 },
      { name: 'State Comptroller', isElected: true, seatCount: 1 },
    ],
    legislative: [
      { name: 'State Senator', isElected: true, seatCount: 1 },
      { name: 'State Representative', isElected: true, seatCount: 1 },
      { name: 'Senate President', isElected: true, seatCount: 1 },
      { name: 'House Speaker', isElected: true, seatCount: 1 },
      { name: 'Senate Majority Leader', isElected: true, seatCount: 1 },
      { name: 'House Majority Leader', isElected: true, seatCount: 1 },
    ],
    judicial: [
      { name: 'Chief Justice', isElected: true, seatCount: 1 },
      { name: 'Supreme Court Justice', isElected: true, seatCount: 4 },
      { name: 'Appellate Court Judge', isElected: true, seatCount: 3 },
    ],
  },
  county: {
    executive: [
      { name: 'County Commissioner', isElected: true, seatCount: 3 },
      { name: 'County Executive', isElected: true, seatCount: 1 },
      { name: 'County Clerk', isElected: true, seatCount: 1 },
      { name: 'County Treasurer', isElected: true, seatCount: 1 },
      { name: 'County Assessor', isElected: true, seatCount: 1 },
      { name: 'Sheriff', isElected: true, seatCount: 1 },
      { name: 'Coroner', isElected: true, seatCount: 1 },
    ],
    legislative: [
      { name: 'County Board Member', isElected: true, seatCount: 5 },
    ],
    judicial: [
      { name: 'Circuit Court Judge', isElected: true, seatCount: 2 },
      { name: 'County Judge', isElected: true, seatCount: 1 },
      { name: "State's Attorney", isElected: true, seatCount: 1 },
      { name: 'Public Defender', isElected: false, seatCount: 1 },
    ],
  },
  city: {
    executive: [
      { name: 'Mayor', isElected: true, seatCount: 1 },
      { name: 'City Manager', isElected: false, seatCount: 1 },
      { name: 'City Clerk', isElected: false, seatCount: 1 },
      { name: 'City Treasurer', isElected: false, seatCount: 1 },
      { name: 'Police Chief', isElected: false, seatCount: 1 },
      { name: 'Fire Chief', isElected: false, seatCount: 1 },
    ],
    legislative: [
      { name: 'City Council Member', isElected: true, seatCount: 5 },
      { name: 'Council President', isElected: true, seatCount: 1 },
      { name: 'Ward Alderman', isElected: true, seatCount: 4 },
    ],
    judicial: [
      { name: 'Municipal Court Judge', isElected: true, seatCount: 1 },
      { name: 'City Attorney', isElected: false, seatCount: 1 },
    ],
  },
};

// Find level by name (case-insensitive partial match)
function findLevelByName(name) {
  const nameLower = name.toLowerCase();
  return groupingTypes.find(t => {
    const defaultName = (t.defaultName || '').toLowerCase();
    const customName = (t.customName || '').toLowerCase();
    return defaultName.includes(nameLower) || customName.includes(nameLower);
  });
}

// Check if position already exists
function positionExists(name, levelId) {
  return positions.some(p =>
    p.name.toLowerCase() === name.toLowerCase() &&
    String(p.groupingTypeId) === String(levelId)
  );
}

// Show Quick Setup modal
function showQuickSetupModal() {
  const modal = document.getElementById('quick-setup-modal');
  const content = document.getElementById('quick-setup-content');

  // Render the content
  content.innerHTML = renderQuickSetupContent();

  // Attach event handlers
  attachQuickSetupHandlers();

  // Update count
  updateSelectedCount();

  modal.classList.remove('hidden');
}

// Hide Quick Setup modal
function hideQuickSetupModal() {
  document.getElementById('quick-setup-modal').classList.add('hidden');
}

// Render Quick Setup content
function renderQuickSetupContent() {
  const levels = ['state', 'county', 'city'];
  const categories = ['executive', 'legislative', 'judicial'];
  const categoryLabels = {
    executive: 'Executive Branch',
    legislative: 'Legislative Branch',
    judicial: 'Judicial Branch',
  };

  let html = '';

  for (const levelName of levels) {
    const level = findLevelByName(levelName);
    if (!level) continue; // Skip if level doesn't exist

    const levelDisplayName = level.customName || level.defaultName;
    const levelPositions = DEFAULT_POSITIONS[levelName];
    if (!levelPositions) continue;

    html += `
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-gray-100 px-4 py-3 flex items-center justify-between">
          <h4 class="font-semibold text-legend-blue">${escapeHtml(levelDisplayName)} Positions</h4>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" class="select-all-level rounded" data-level="${levelName}">
            <span>Select All</span>
          </label>
        </div>
        <div class="p-4 space-y-4 bg-white">
    `;

    for (const category of categories) {
      const categoryPositions = levelPositions[category];
      if (!categoryPositions || categoryPositions.length === 0) continue;

      html += `
        <div>
          <h5 class="text-sm font-medium text-gray-600 mb-2">${categoryLabels[category]}</h5>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      `;

      for (const pos of categoryPositions) {
        const exists = positionExists(pos.name, level.id);
        const posId = `${levelName}-${pos.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const seatInfo = pos.seatCount > 1 ? ` (${pos.seatCount} seats)` : '';
        const electedBadge = pos.isElected
          ? '<span class="text-xs text-green-600">Elected</span>'
          : '<span class="text-xs text-gray-500">Appointed</span>';

        html += `
          <label class="flex items-start gap-2 p-2 rounded border ${exists ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200 hover:border-legend-blue cursor-pointer'}">
            <input
              type="checkbox"
              class="position-checkbox mt-0.5 rounded"
              data-level="${levelName}"
              data-name="${escapeHtml(pos.name)}"
              data-elected="${pos.isElected}"
              data-seats="${pos.seatCount}"
              ${exists ? 'disabled checked' : ''}
            >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="${exists ? 'text-gray-400' : 'text-gray-800'}">${escapeHtml(pos.name)}${seatInfo}</span>
              </div>
              <div class="flex items-center gap-2">
                ${electedBadge}
                ${exists ? '<span class="text-xs text-gray-400">(Already exists)</span>' : ''}
              </div>
            </div>
          </label>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  if (!html) {
    html = `
      <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-300">
        <p class="text-sm text-yellow-800">
          No organizational levels found. Please create State, County, or City levels in
          <a href="programs-groupings.html" class="text-legend-blue underline">Groupings</a> first.
        </p>
      </div>
    `;
  }

  return html;
}

// Attach Quick Setup event handlers
function attachQuickSetupHandlers() {
  // Select all per level
  document.querySelectorAll('.select-all-level').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const levelName = e.target.dataset.level;
      const isChecked = e.target.checked;

      document.querySelectorAll(`.position-checkbox[data-level="${levelName}"]`).forEach(cb => {
        if (!cb.disabled) {
          cb.checked = isChecked;
        }
      });

      updateSelectedCount();
    });
  });

  // Individual checkboxes
  document.querySelectorAll('.position-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateSelectedCount();
      updateSelectAllState();
    });
  });
}

// Update selected count display
function updateSelectedCount() {
  const checkboxes = document.querySelectorAll('.position-checkbox:checked:not(:disabled)');
  const countEl = document.getElementById('selected-count');
  if (countEl) {
    countEl.textContent = checkboxes.length;
  }
}

// Update select all checkbox states
function updateSelectAllState() {
  document.querySelectorAll('.select-all-level').forEach(selectAll => {
    const levelName = selectAll.dataset.level;
    const levelCheckboxes = document.querySelectorAll(`.position-checkbox[data-level="${levelName}"]:not(:disabled)`);
    const checkedCount = document.querySelectorAll(`.position-checkbox[data-level="${levelName}"]:checked:not(:disabled)`).length;

    selectAll.checked = levelCheckboxes.length > 0 && checkedCount === levelCheckboxes.length;
    selectAll.indeterminate = checkedCount > 0 && checkedCount < levelCheckboxes.length;
  });
}

// Add selected positions
async function addSelectedPositions() {
  clearMessages();

  const checkboxes = document.querySelectorAll('.position-checkbox:checked:not(:disabled)');
  if (checkboxes.length === 0) {
    showError('Please select at least one position to add.');
    return;
  }

  const addBtn = document.getElementById('add-selected-btn');
  addBtn.disabled = true;
  addBtn.textContent = 'Adding...';

  const programId = getProgramId();
  let added = 0;
  let failed = 0;

  for (const checkbox of checkboxes) {
    const levelName = checkbox.dataset.level;
    const name = checkbox.dataset.name;
    const isElected = checkbox.dataset.elected === 'true';
    const seatCount = parseInt(checkbox.dataset.seats) || 1;

    const level = findLevelByName(levelName);
    if (!level) {
      failed++;
      continue;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (typeof getAuthHeaders === 'function') {
        Object.assign(headers, getAuthHeaders());
      }

      const body = {
        name,
        groupingTypeId: level.id,
        isElected,
        seatCount,
        status: 'active'
      };

      const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/positions`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        added++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Error adding position ${name}:`, error);
      failed++;
    }
  }

  addBtn.disabled = false;
  addBtn.textContent = 'Add Selected Positions';

  hideQuickSetupModal();

  if (added > 0) {
    showSuccess(`Added ${added} position${added !== 1 ? 's' : ''}.${failed > 0 ? ` ${failed} failed.` : ''}`);
    await loadPositions();
  } else {
    showError('Failed to add positions. Please try again.');
  }
}

// ============================================================
// CONFIRMATION MODAL
// ============================================================

function showConfirmation(title, message, confirmText, onConfirm) {
  const modal = document.getElementById('confirmation-modal');
  const titleEl = document.getElementById('confirmation-title');
  const messageEl = document.getElementById('confirmation-message');
  const confirmBtn = document.getElementById('confirmation-confirm-btn');
  const cancelBtn = document.getElementById('confirmation-cancel-btn');

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;

  modal.classList.remove('hidden');

  const closeModal = () => {
    modal.classList.add('hidden');
    confirmBtn.removeEventListener('click', confirmHandler);
    cancelBtn.removeEventListener('click', closeModal);
  };

  const confirmHandler = () => {
    closeModal();
    onConfirm();
  };

  confirmBtn.addEventListener('click', confirmHandler);
  cancelBtn.addEventListener('click', closeModal);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // Add position button
  document.getElementById('add-position-btn').addEventListener('click', () => {
    clearMessages();
    if (groupingTypes.length === 0) {
      showError('Please create organizational levels in Groupings first.');
      return;
    }
    resetPositionForm();
    showPositionModal();
  });

  // Save position
  document.getElementById('save-position-btn').addEventListener('click', savePosition);

  // Cancel / close modal
  document.getElementById('cancel-position-btn').addEventListener('click', hidePositionModal);
  document.getElementById('position-modal-close').addEventListener('click', hidePositionModal);

  // Close modal on backdrop click
  document.getElementById('position-modal').addEventListener('click', (e) => {
    if (e.target.id === 'position-modal') {
      hidePositionModal();
    }
  });

  // Collapse/Expand buttons
  document.getElementById('collapse-all-btn').addEventListener('click', collapseAll);
  document.getElementById('expand-all-btn').addEventListener('click', expandAll);

  // Quick Setup modal
  document.getElementById('open-quick-setup-btn').addEventListener('click', () => {
    clearMessages();
    if (groupingTypes.length === 0) {
      showError('Please create organizational levels in Groupings first.');
      return;
    }
    showQuickSetupModal();
  });

  document.getElementById('cancel-quick-setup-btn').addEventListener('click', hideQuickSetupModal);
  document.getElementById('quick-setup-modal-close').addEventListener('click', hideQuickSetupModal);
  document.getElementById('add-selected-btn').addEventListener('click', addSelectedPositions);

  // Close quick setup modal on backdrop click
  document.getElementById('quick-setup-modal').addEventListener('click', (e) => {
    if (e.target.id === 'quick-setup-modal') {
      hideQuickSetupModal();
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

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const programId = getProgramId();
  const year = getSelectedYear();

  if (!programId) {
    showError('No program selected. Please select a program from the dashboard.');
    return;
  }

  // Render program selector
  const username = getUsername();
  if (username) {
    try {
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
          renderProgramSelector(programId, program.programName || program.name, year);
        }
      }
    } catch (err) {
      console.error('Error fetching program info:', err);
    }
  }

  setupEventListeners();
  await loadGroupingTypes();
  await loadPositions();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    getSelectedYear,
    loadPositions,
    savePosition,
    deletePosition
  };
}
