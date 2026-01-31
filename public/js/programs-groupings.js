// programs-groupings.js
// Program-level grouping management (both types and instances)

const apiBase = window.API_URL || "";

// Get username from session/localStorage
function getUsername() {
  return localStorage.getItem("user") || sessionStorage.getItem("user");
}

// Get programId from URL params or localStorage
function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  const urlProgramId = params.get('programId');
  const storedProgramId = localStorage.getItem('lastSelectedProgramId');
  return urlProgramId || storedProgramId || '';
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
// GROUPING TYPES SECTION
// ============================================================

let groupingTypes = []; // Store loaded types globally
let editingTypeId = null; // Track if we're editing a type

// Load grouping types from API
async function loadGroupingTypes() {
  const programId = getProgramId();
  const typesList = document.getElementById('grouping-types-list');

  if (!programId) {
    showError('No program selected. Please select a program first.');
    typesList.innerHTML = '<p class="text-gray-500">No program selected.</p>';
    return;
  }

  try {
    const headers = {};
    console.log('[DEBUG] getAuthHeaders type:', typeof getAuthHeaders);
    if (typeof getAuthHeaders === 'function') {
      const authHeaders = getAuthHeaders();
      console.log('[DEBUG] Auth headers:', authHeaders);
      Object.assign(headers, authHeaders);
    } else {
      console.error('[ERROR] getAuthHeaders is not a function!');
    }
    console.log('[DEBUG] Final headers:', headers);

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/grouping-types`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 204) {
        typesList.innerHTML = '<p class="text-gray-500 italic">No organizational levels defined yet. Click "Add Level" to get started.</p>';
        groupingTypes = [];
        updateQuickSetupVisibility();
        return;
      }
      if (response.status === 403) {
        throw new Error('Access denied. You may need to restart the backend server or check your permissions.');
      }
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to load grouping types (${response.status})`);
    }

    groupingTypes = await response.json();

    if (groupingTypes.length === 0) {
      typesList.innerHTML = '<p class="text-gray-500 italic">No organizational levels defined yet. Click "Add Level" to get started.</p>';
      updateQuickSetupVisibility();
      return;
    }

    // Filter out retired types
    const activeTypes = groupingTypes.filter(t => t.status !== 'retired');

    if (activeTypes.length === 0) {
      typesList.innerHTML = '<p class="text-gray-500 italic">No active organizational levels. Click "Add Level" to create one.</p>';
      updateQuickSetupVisibility();
      return;
    }

    // Render types
    typesList.innerHTML = activeTypes.map(type => {
      const displayName = type.customName || type.defaultName;
      const pluralDisplay = type.pluralName ? ` (${type.pluralName})` : '';
      return `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition">
          <div class="flex items-center gap-4">
            <span class="bg-legend-blue text-white font-bold text-sm px-3 py-1 rounded">Level ${type.levelOrder}</span>
            <div>
              <h3 class="font-semibold text-legend-blue">${escapeHtml(displayName)}${pluralDisplay}</h3>
              <p class="text-xs text-gray-500">${type.defaultName !== displayName ? `Default: ${type.defaultName}` : ''} ${type.isRequired ? '• Required' : ''}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="edit-type-btn text-legend-blue hover:text-blue-800 font-semibold transition" data-id="${type.id}">
              Edit
            </button>
            <button class="delete-type-btn text-red-600 hover:text-red-800 font-semibold transition" data-id="${type.id}" data-name="${escapeHtml(displayName)}">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach edit handlers
    document.querySelectorAll('.edit-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const typeId = parseInt(e.target.dataset.id);
        editGroupingType(typeId);
      });
    });

    // Attach delete handlers
    document.querySelectorAll('.delete-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const typeId = e.target.dataset.id;
        const typeName = e.target.dataset.name;
        showConfirmation(
          'Delete Organizational Level',
          `Are you sure you want to delete "${typeName}"? All groupings of this type will need to be reassigned.`,
          'Delete',
          () => deleteGroupingType(typeId)
        );
      });
    });

    // Update grouping form type dropdown
    updateGroupingTypeDropdown();

    // Update Quick Setup visibility
    updateQuickSetupVisibility();

  } catch (err) {
    showError(err.message || 'Failed to load grouping types');
    console.error('Error loading grouping types:', err);
  }
}

// Show type modal
function showTypeModal() {
  document.getElementById('type-modal').classList.remove('hidden');
}

// Hide type modal
function hideTypeModal() {
  document.getElementById('type-modal').classList.add('hidden');
  resetTypeForm();
}

// Show grouping modal
function showGroupingModal() {
  document.getElementById('grouping-modal').classList.remove('hidden');
}

// Hide grouping modal
function hideGroupingModal() {
  document.getElementById('grouping-modal').classList.add('hidden');
  resetGroupingForm();
}

// Update Quick Setup visibility based on whether levels exist
function updateQuickSetupVisibility() {
  const quickSetupSection = document.getElementById('default-levels-section');
  if (!quickSetupSection) return;

  const activeTypes = groupingTypes.filter(t => t.status !== 'retired');
  if (activeTypes.length > 0) {
    quickSetupSection.classList.add('hidden');
  } else {
    quickSetupSection.classList.remove('hidden');
  }
}

// Populate form for editing a grouping type
function editGroupingType(typeId) {
  const type = groupingTypes.find(t => t.id === typeId);
  if (!type) {
    showError('Could not find the organizational level to edit.');
    return;
  }

  editingTypeId = typeId;

  // Populate form fields
  document.getElementById('type-name-input').value = type.defaultName || '';
  document.getElementById('type-custom-name-input').value = type.customName || '';
  document.getElementById('type-plural-name-input').value = type.pluralName || '';
  document.getElementById('type-level-order-input').value = type.levelOrder || '';
  document.getElementById('type-required-checkbox').checked = type.isRequired || false;

  // Update form title and button
  document.getElementById('type-form-title').textContent = 'Edit Organizational Level';
  document.getElementById('save-type-btn').textContent = 'Update Level';

  // Show modal
  showTypeModal();
  clearMessages();
}

// Reset type form to add mode
function resetTypeForm() {
  editingTypeId = null;
  document.getElementById('type-name-input').value = '';
  document.getElementById('type-custom-name-input').value = '';
  document.getElementById('type-plural-name-input').value = '';
  document.getElementById('type-level-order-input').value = '';
  document.getElementById('type-required-checkbox').checked = false;
  document.getElementById('type-form-title').textContent = 'Add New Organizational Level';
  document.getElementById('save-type-btn').textContent = 'Save Level';
}

// Save or update grouping type
async function saveGroupingType() {
  clearMessages();
  const programId = getProgramId();

  const defaultName = document.getElementById('type-name-input').value.trim();
  const customName = document.getElementById('type-custom-name-input').value.trim();
  const pluralName = document.getElementById('type-plural-name-input').value.trim();
  const levelOrder = parseInt(document.getElementById('type-level-order-input').value);
  const isRequired = document.getElementById('type-required-checkbox').checked;

  if (!defaultName || !levelOrder) {
    showError('Please provide a level name and order.');
    return;
  }

  const saveBtn = document.getElementById('save-type-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = editingTypeId ? 'Updating...' : 'Saving...';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    let response;
    if (editingTypeId) {
      // Update existing type
      response = await fetch(`${apiBase}/grouping-types/${editingTypeId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ defaultName, customName, pluralName, levelOrder, isRequired }),
      });
    } else {
      // Create new type
      response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/grouping-types`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ defaultName, customName, pluralName, levelOrder, isRequired }),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to ${editingTypeId ? 'update' : 'save'} grouping type`);
    }

    showSuccess(`Organizational level "${defaultName}" ${editingTypeId ? 'updated' : 'created'} successfully!`);

    // Reset form and hide modal
    hideTypeModal();

    // Reload types
    await loadGroupingTypes();

  } catch (err) {
    showError(err.message || `Failed to ${editingTypeId ? 'update' : 'save'} grouping type`);
    console.error('Error saving grouping type:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editingTypeId ? 'Update Level' : 'Save Level';
  }
}

// Delete grouping type
async function deleteGroupingType(typeId) {
  clearMessages();

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/grouping-types/${typeId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete grouping type');
    }

    showSuccess('Organizational level deleted successfully!');
    await loadGroupingTypes();

  } catch (err) {
    showError(err.message || 'Failed to delete grouping type');
    console.error('Error deleting grouping type:', err);
  }
}

// ============================================================
// GROUPINGS SECTION
// ============================================================

let groupings = []; // Store loaded groupings globally
let editingGroupingId = null; // Track if we're editing a grouping
let collapsedGroupings = new Set(); // Track collapsed grouping IDs

// Load groupings from API
async function loadGroupings() {
  const programId = getProgramId();
  const groupingsList = document.getElementById('groupings-list');

  if (!programId) {
    showError('No program selected. Please select a program first.');
    groupingsList.innerHTML = '<p class="text-gray-500">No program selected.</p>';
    return;
  }

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/groupings`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 204) {
        groupingsList.innerHTML = '<p class="text-gray-500 italic">No groupings defined yet. Click "Add Grouping" to create your first location.</p>';
        groupings = [];
        return;
      }
      if (response.status === 403) {
        throw new Error('Access denied. You may need to restart the backend server or check your permissions.');
      }
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to load groupings (${response.status})`);
    }

    groupings = await response.json();

    if (groupings.length === 0) {
      groupingsList.innerHTML = '<p class="text-gray-500 italic">No groupings defined yet. Click "Add Grouping" to create your first location.</p>';
      return;
    }

    // Filter out retired groupings
    const activeGroupings = groupings.filter(g => g.status !== 'retired');

    if (activeGroupings.length === 0) {
      groupingsList.innerHTML = '<p class="text-gray-500 italic">No active groupings. Click "Add Grouping" to create one.</p>';
      return;
    }

    // Build hierarchy visualization
    const hierarchyHtml = buildHierarchyHtml(activeGroupings);
    groupingsList.innerHTML = hierarchyHtml;

    // Attach toggle handlers for collapse/expand
    document.querySelectorAll('.toggle-grouping-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const groupingId = String(e.currentTarget.dataset.id);
        toggleGroupingCollapse(groupingId);
      });
    });

    // Attach edit handlers
    document.querySelectorAll('.edit-grouping-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const groupingId = parseInt(e.target.dataset.id);
        editGrouping(groupingId);
      });
    });

    // Attach delete handlers
    document.querySelectorAll('.delete-grouping-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const groupingId = e.target.dataset.id;
        const groupingName = e.target.dataset.name;
        showConfirmation(
          'Delete Grouping',
          `Are you sure you want to delete "${groupingName}"?`,
          'Delete',
          () => deleteGrouping(groupingId)
        );
      });
    });

    // Update parent dropdown
    updateParentGroupingDropdown();

  } catch (err) {
    showError(err.message || 'Failed to load groupings');
    console.error('Error loading groupings:', err);
  }
}

// Build hierarchical HTML display (nested tree view)
function buildHierarchyHtml(activeGroupings) {
  // Find root groupings (no parent)
  const roots = activeGroupings.filter(g => !g.parentGroupingId);

  // Sort roots by type levelOrder, then by displayOrder/name
  roots.sort((a, b) => {
    const typeA = groupingTypes.find(t => String(t.id) === String(a.groupingTypeId));
    const typeB = groupingTypes.find(t => String(t.id) === String(b.groupingTypeId));
    const levelOrderA = typeA ? typeA.levelOrder : 999;
    const levelOrderB = typeB ? typeB.levelOrder : 999;
    if (levelOrderA !== levelOrderB) return levelOrderA - levelOrderB;
    if (a.displayOrder !== b.displayOrder) return (a.displayOrder || 0) - (b.displayOrder || 0);
    return a.name.localeCompare(b.name);
  });

  if (roots.length === 0) {
    return '<p class="text-gray-500 italic">No groupings to display.</p>';
  }

  // Build flat list with depth info for clean rendering
  const flatList = [];
  roots.forEach(root => {
    flattenTree(root, activeGroupings, 0, flatList);
  });

  // Render as a clean list
  let html = '<div class="space-y-2">';
  flatList.forEach(item => {
    html += renderGroupingCard(item.grouping, item.depth, item.hasChildren, item.childCount, item.isCollapsed);
  });
  html += '</div>';

  return html;
}

// Flatten the tree into a list with depth info
function flattenTree(grouping, allGroupings, depth, result) {
  const children = allGroupings
    .filter(g => String(g.parentGroupingId) === String(grouping.id))
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return (a.displayOrder || 0) - (b.displayOrder || 0);
      return a.name.localeCompare(b.name);
    });

  const isCollapsed = collapsedGroupings.has(String(grouping.id));

  result.push({
    grouping,
    depth,
    hasChildren: children.length > 0,
    childCount: children.length,
    isCollapsed
  });

  // Only include children if not collapsed
  if (!isCollapsed) {
    children.forEach(child => {
      flattenTree(child, allGroupings, depth + 1, result);
    });
  }
}

// Render a single grouping card with proper indentation
function renderGroupingCard(grouping, depth, hasChildren, childCount, isCollapsed) {
  const type = groupingTypes.find(t => String(t.id) === String(grouping.groupingTypeId));
  const typeName = type ? (type.customName || type.defaultName) : 'Unknown';
  const indentClass = getIndentClass(depth);

  // Toggle button for items with children
  const toggleBtn = hasChildren
    ? `<button class="toggle-grouping-btn text-gray-500 hover:text-legend-blue transition mr-2" data-id="${grouping.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
        <span class="text-lg">${isCollapsed ? '▶' : '▼'}</span>
      </button>`
    : '<span class="w-6 inline-block"></span>'; // Spacer for alignment

  return `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition ${indentClass} ${hasChildren ? 'border-l-4 border-l-legend-blue' : ''}">
      <div class="flex items-center gap-2">
        ${toggleBtn}
        <span class="bg-legend-blue text-white text-xs px-2 py-1 rounded whitespace-nowrap">${escapeHtml(typeName)}</span>
        <h4 class="font-semibold text-legend-blue">${escapeHtml(grouping.name)}</h4>
        ${hasChildren ? `<span class="text-xs text-gray-400">(${childCount})</span>` : ''}
      </div>
      <div class="flex gap-2">
        <button class="edit-grouping-btn text-legend-blue hover:text-blue-800 font-semibold text-sm transition" data-id="${grouping.id}">
          Edit
        </button>
        <button class="delete-grouping-btn text-red-600 hover:text-red-800 font-semibold text-sm transition" data-id="${grouping.id}" data-name="${escapeHtml(grouping.name)}">
          Delete
        </button>
      </div>
    </div>
  `;
}

// Get Tailwind margin class for hierarchy depth
function getIndentClass(depth) {
  // Map depth to Tailwind margin-left classes (1rem/16px increments)
  const indentClasses = ['ml-0', 'ml-4', 'ml-8', 'ml-12', 'ml-16'];
  return indentClasses[Math.min(depth, indentClasses.length - 1)];
}

// Toggle collapse state for a grouping
function toggleGroupingCollapse(groupingId) {
  if (collapsedGroupings.has(groupingId)) {
    collapsedGroupings.delete(groupingId);
  } else {
    collapsedGroupings.add(groupingId);
  }
  // Re-render the groupings list
  renderGroupingsList();
}

// Collapse all groupings that have children
function collapseAll() {
  const activeGroupings = groupings.filter(g => g.status !== 'retired');

  // Find all groupings that have children
  activeGroupings.forEach(grouping => {
    const hasChildren = activeGroupings.some(g =>
      String(g.parentGroupingId) === String(grouping.id)
    );
    if (hasChildren) {
      collapsedGroupings.add(String(grouping.id));
    }
  });

  renderGroupingsList();
}

// Expand all groupings
function expandAll() {
  collapsedGroupings.clear();
  renderGroupingsList();
}

// Render groupings list (used for re-rendering after collapse toggle)
function renderGroupingsList() {
  const groupingsList = document.getElementById('groupings-list');
  const activeGroupings = groupings.filter(g => g.status !== 'retired');

  if (activeGroupings.length === 0) {
    groupingsList.innerHTML = '<p class="text-gray-500 italic">No active groupings. Click "Add Grouping" to create one.</p>';
    return;
  }

  const hierarchyHtml = buildHierarchyHtml(activeGroupings);
  groupingsList.innerHTML = hierarchyHtml;

  // Re-attach event handlers
  document.querySelectorAll('.toggle-grouping-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupingId = String(e.currentTarget.dataset.id);
      toggleGroupingCollapse(groupingId);
    });
  });

  document.querySelectorAll('.edit-grouping-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupingId = parseInt(e.target.dataset.id);
      editGrouping(groupingId);
    });
  });

  document.querySelectorAll('.delete-grouping-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const groupingId = e.target.dataset.id;
      const groupingName = e.target.dataset.name;
      showConfirmation(
        'Delete Grouping',
        `Are you sure you want to delete "${groupingName}"?`,
        'Delete',
        () => deleteGrouping(groupingId)
      );
    });
  });
}


// Populate form for editing a grouping
function editGrouping(groupingId) {
  const grouping = groupings.find(g => g.id === groupingId);
  if (!grouping) {
    showError('Could not find the grouping to edit.');
    return;
  }

  editingGroupingId = groupingId;

  // Populate form fields
  document.getElementById('grouping-type-select').value = grouping.groupingTypeId || '';

  // Update parent dropdown based on the grouping type, preserving the current parent value
  if (grouping.groupingTypeId) {
    updateParentGroupingDropdown(grouping.groupingTypeId, grouping.parentGroupingId);
  }

  document.getElementById('grouping-name-input').value = grouping.name || '';
  document.getElementById('grouping-display-order-input').value = grouping.displayOrder || '';
  document.getElementById('grouping-notes-input').value = grouping.notes || '';

  // Update form title and button
  document.getElementById('grouping-form-title').textContent = 'Edit Grouping';
  document.getElementById('save-grouping-btn').textContent = 'Update Grouping';

  // Show modal
  showGroupingModal();
  clearMessages();
}

// Reset grouping form to add mode
function resetGroupingForm() {
  editingGroupingId = null;
  document.getElementById('grouping-type-select').value = '';

  // Reset parent dropdown to prompt state
  const parentSelect = document.getElementById('grouping-parent-select');
  parentSelect.innerHTML = '<option value="">Select a level first...</option>';
  parentSelect.disabled = true;

  document.getElementById('grouping-name-input').value = '';
  document.getElementById('grouping-display-order-input').value = '';
  document.getElementById('grouping-notes-input').value = '';
  document.getElementById('grouping-form-title').textContent = 'Add New Grouping';
  document.getElementById('save-grouping-btn').textContent = 'Save Grouping';
}

// Save or update grouping
async function saveGrouping() {
  clearMessages();
  const programId = getProgramId();

  const groupingTypeId = parseInt(document.getElementById('grouping-type-select').value);
  const parentGroupingId = document.getElementById('grouping-parent-select').value ? parseInt(document.getElementById('grouping-parent-select').value) : null;
  const name = document.getElementById('grouping-name-input').value.trim();
  const displayOrder = document.getElementById('grouping-display-order-input').value ? parseInt(document.getElementById('grouping-display-order-input').value) : null;
  const notes = document.getElementById('grouping-notes-input').value.trim();

  if (!groupingTypeId || !name) {
    showError('Please select an organizational level and provide a name.');
    return;
  }

  const saveBtn = document.getElementById('save-grouping-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = editingGroupingId ? 'Updating...' : 'Saving...';

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const body = { groupingTypeId, name, displayOrder, notes };
    if (parentGroupingId) body.parentGroupingId = parentGroupingId;

    let response;
    if (editingGroupingId) {
      // Update existing grouping
      response = await fetch(`${apiBase}/groupings/${editingGroupingId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });
    } else {
      // Create new grouping
      response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/groupings`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to ${editingGroupingId ? 'update' : 'save'} grouping`);
    }

    showSuccess(`Grouping "${name}" ${editingGroupingId ? 'updated' : 'created'} successfully!`);

    // Reset form and hide modal
    hideGroupingModal();

    // Reload groupings
    await loadGroupings();

  } catch (err) {
    showError(err.message || `Failed to ${editingGroupingId ? 'update' : 'save'} grouping`);
    console.error('Error saving grouping:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editingGroupingId ? 'Update Grouping' : 'Save Grouping';
  }
}

// Delete grouping
async function deleteGrouping(groupingId) {
  clearMessages();

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/groupings/${groupingId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete grouping');
    }

    showSuccess('Grouping deleted successfully!');
    await loadGroupings();

  } catch (err) {
    showError(err.message || 'Failed to delete grouping');
    console.error('Error deleting grouping:', err);
  }
}

// Update grouping type dropdown in grouping form
function updateGroupingTypeDropdown() {
  const select = document.getElementById('grouping-type-select');
  const activeTypes = groupingTypes.filter(t => t.status !== 'retired');

  select.innerHTML = '<option value="">Select a level...</option>' +
    activeTypes.map(t => {
      const displayName = t.customName || t.defaultName;
      return `<option value="${t.id}">${displayName} (Level ${t.levelOrder})</option>`;
    }).join('');
}

// Update parent grouping dropdown based on selected type
// Parents must be from exactly one level higher (lower levelOrder number)
function updateParentGroupingDropdown(selectedTypeId, preserveValue = null) {
  const select = document.getElementById('grouping-parent-select');
  const activeGroupings = groupings.filter(g => g.status !== 'retired');

  // Find the selected type's levelOrder
  const selectedType = groupingTypes.find(t => String(t.id) === String(selectedTypeId));

  if (!selectedType || selectedType.levelOrder === 1) {
    // Level 1 types (highest level) can't have parents
    select.innerHTML = '<option value="">No parent (top level)</option>';
    select.disabled = selectedType && selectedType.levelOrder === 1;
    return;
  }

  select.disabled = false;
  const parentLevelOrder = selectedType.levelOrder - 1;

  // Find types at the parent level
  const parentTypes = groupingTypes.filter(t => t.levelOrder === parentLevelOrder);
  const parentTypeIds = parentTypes.map(t => t.id);

  // Filter groupings to only those of parent types
  const eligibleParents = activeGroupings.filter(g =>
    parentTypeIds.some(id => String(id) === String(g.groupingTypeId))
  );

  if (eligibleParents.length === 0) {
    const parentTypeName = parentTypes.length > 0
      ? (parentTypes[0].customName || parentTypes[0].defaultName)
      : `Level ${parentLevelOrder}`;
    select.innerHTML = `<option value="">No ${parentTypeName} groupings available</option>`;
    return;
  }

  // If only one eligible parent, auto-select it
  if (eligibleParents.length === 1) {
    const parent = eligibleParents[0];
    const type = groupingTypes.find(t => String(t.id) === String(parent.groupingTypeId));
    const typeName = type ? (type.customName || type.defaultName) : 'Unknown';
    select.innerHTML = `<option value="${parent.id}" selected>${escapeHtml(parent.name)} (${typeName})</option>`;
    return;
  }

  // Multiple parents available - show dropdown with prompt
  select.innerHTML = '<option value="">Select a parent...</option>' +
    eligibleParents.map(g => {
      const type = groupingTypes.find(t => String(t.id) === String(g.groupingTypeId));
      const typeName = type ? (type.customName || type.defaultName) : 'Unknown';
      const isSelected = preserveValue && String(g.id) === String(preserveValue);
      return `<option value="${g.id}"${isSelected ? ' selected' : ''}>${escapeHtml(g.name)} (${typeName})</option>`;
    }).join('');
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
// QUICK SETUP DEFAULTS
// ============================================================

async function addDefaultLevel(defaultName, pluralName, levelOrder, isRequired = false) {
  const programId = getProgramId();
  if (!programId) {
    showError('No program selected.');
    return;
  }

  // Check if this level already exists
  const existing = groupingTypes.find(t =>
    (t.defaultName || '').toLowerCase() === defaultName.toLowerCase() ||
    (t.customName || '').toLowerCase() === defaultName.toLowerCase()
  );

  if (existing) {
    showError(`${defaultName} level already exists.`);
    return;
  }

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }
    headers['Content-Type'] = 'application/json';

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/grouping-types`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        defaultName,
        pluralName,
        levelOrder,
        isRequired,
        status: 'active'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to add ${defaultName}`);
    }

    showSuccess(`${defaultName} level added successfully!`);
    await loadGroupingTypes();
    updateGroupingTypeDropdown();
  } catch (error) {
    showError(error.message);
  }
}

async function addAllDefaultLevels() {
  const defaults = [
    { name: 'State', plural: 'States', order: 1, required: false },
    { name: 'County', plural: 'Counties', order: 2, required: false },
    { name: 'City', plural: 'Cities', order: 3, required: false }
  ];

  for (const def of defaults) {
    await addDefaultLevel(def.name, def.plural, def.order, def.required);
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // Grouping Type buttons
  document.getElementById('add-type-btn').addEventListener('click', () => {
    clearMessages();
    resetTypeForm(); // Reset to add mode
    showTypeModal();
  });

  document.getElementById('save-type-btn').addEventListener('click', saveGroupingType);

  document.getElementById('cancel-type-btn').addEventListener('click', hideTypeModal);
  document.getElementById('type-modal-close').addEventListener('click', hideTypeModal);

  // Close type modal on backdrop click
  document.getElementById('type-modal').addEventListener('click', (e) => {
    if (e.target.id === 'type-modal') {
      hideTypeModal();
    }
  });

  // Quick Setup buttons
  document.getElementById('add-state-btn').addEventListener('click', () => {
    clearMessages();
    addDefaultLevel('State', 'States', 1, false);
  });

  document.getElementById('add-county-btn').addEventListener('click', () => {
    clearMessages();
    addDefaultLevel('County', 'Counties', 2, false);
  });

  document.getElementById('add-city-btn').addEventListener('click', () => {
    clearMessages();
    addDefaultLevel('City', 'Cities', 3, false);
  });

  document.getElementById('add-all-defaults-btn').addEventListener('click', () => {
    clearMessages();
    addAllDefaultLevels();
  });

  // Grouping buttons
  document.getElementById('add-grouping-btn').addEventListener('click', () => {
    clearMessages();
    if (groupingTypes.length === 0) {
      showError('Please create at least one organizational level first.');
      return;
    }
    resetGroupingForm(); // Reset to add mode
    showGroupingModal();
  });

  // Collapse/Expand All buttons
  document.getElementById('collapse-all-btn').addEventListener('click', collapseAll);
  document.getElementById('expand-all-btn').addEventListener('click', expandAll);

  // When grouping type changes, update the parent dropdown
  document.getElementById('grouping-type-select').addEventListener('change', (e) => {
    const selectedTypeId = e.target.value;
    if (selectedTypeId) {
      updateParentGroupingDropdown(selectedTypeId);
    } else {
      // Reset parent dropdown when no type selected
      const parentSelect = document.getElementById('grouping-parent-select');
      parentSelect.innerHTML = '<option value="">Select a level first...</option>';
      parentSelect.disabled = true;
    }
  });

  document.getElementById('save-grouping-btn').addEventListener('click', saveGrouping);

  document.getElementById('cancel-grouping-btn').addEventListener('click', hideGroupingModal);
  document.getElementById('grouping-modal-close').addEventListener('click', hideGroupingModal);

  // Close grouping modal on backdrop click
  document.getElementById('grouping-modal').addEventListener('click', (e) => {
    if (e.target.id === 'grouping-modal') {
      hideGroupingModal();
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
  await loadGroupings();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    getSelectedYear,
    loadGroupingTypes,
    saveGroupingType,
    deleteGroupingType,
    loadGroupings,
    saveGrouping,
    deleteGrouping
  };
}
