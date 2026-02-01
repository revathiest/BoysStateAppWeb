// programs-year-config.js
// Year-level configuration for activating parties, groupings, and positions
// This page allows admins to select which program-level items to activate for specific years

const apiBase = window.API_URL || "";

// Get username from session/localStorage
function getUsername() {
  return localStorage.getItem("user") || sessionStorage.getItem("user");
}

// Get programId from URL params or localStorage
function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('programId') || localStorage.getItem('lastSelectedProgramId') || '';
}

// Get selected year for the program
function getSelectedYear() {
  const programId = getProgramId();
  if (!programId) return null;
  const year = localStorage.getItem(`selectedYear_${programId}`);
  return year ? parseInt(year) : null;
}

// Get program year ID for the selected year
async function getProgramYearId(programId, year) {
  console.log('[DEBUG] getProgramYearId called with:', { programId, year, apiBase });

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const url = `${apiBase}/programs/${encodeURIComponent(programId)}/years`;
    console.log('[DEBUG] Fetching:', url);

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    console.log('[DEBUG] Response status:', response.status);

    if (!response.ok) throw new Error('Failed to load program years');
    const years = await response.json();
    console.log('[DEBUG] Years received:', years);

    const programYear = years.find(y => Number(y.year) === Number(year));
    console.log('[DEBUG] Matched programYear:', programYear);
    console.log('[DEBUG] programYear.id:', programYear ? programYear.id : 'programYear is null');

    return programYear ? programYear.id : null;
  } catch (err) {
    console.error('[DEBUG] Error in getProgramYearId:', err);
    return null;
  }
}

// Update navigation links to include programId
function updateNavLinks() {
  const programId = getProgramId();
  if (!programId) return;

  const encodedProgramId = encodeURIComponent(programId);
  const linkIds = [
    'back-link',
    'manage-parties-link',
    'create-parties-link',
    'manage-groupings-link',
    'create-groupings-link',
    'manage-positions-link',
    'create-positions-link'
  ];

  linkIds.forEach(id => {
    const link = document.getElementById(id);
    if (link) {
      const baseHref = link.getAttribute('href').split('?')[0];
      link.href = `${baseHref}?programId=${encodedProgramId}`;
    }
  });
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

// Load years and populate year selector
async function loadYears() {
  const programId = getProgramId();
  console.log('[DEBUG] loadYears called with programId:', programId);

  if (!programId) {
    console.log('[DEBUG] No programId, returning early');
    return;
  }

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/years`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load years');
    const years = await response.json();

    const yearSelect = document.getElementById('year-select');
    if (years.length === 0) {
      yearSelect.innerHTML = '<option value="">No years configured</option>';
      showError('No years configured for this program. Please add a year first.');
      return;
    }

    // Get currently selected year or use most recent
    let selectedYear = getSelectedYear();
    if (!selectedYear && years.length > 0) {
      selectedYear = years[0].year;
      localStorage.setItem(`selectedYear_${programId}`, selectedYear.toString());
    }

    // Populate year selector
    yearSelect.innerHTML = years.map(y =>
      `<option value="${y.year}" ${y.year == selectedYear ? 'selected' : ''}>${y.year}</option>`
    ).join('');

    // Load configuration for selected year
    await loadYearConfiguration(selectedYear);

  } catch (err) {
    showError(err.message || 'Failed to load years');
    console.error('Error loading years:', err);
  }
}

// Load parties and their activation status for the selected year
async function loadYearConfiguration(year) {
  clearMessages();
  const programId = getProgramId();
  if (!programId || !year) return;

  // Update program selector with year
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

  // Load parties, groupings, and positions
  await loadParties(programId, year);
  await loadGroupings(programId, year);
  await loadPositions(programId, year);
}

// Load parties and their activation status
async function loadParties(programId, year) {
  console.log('[DEBUG] loadParties called with:', { programId, year });

  const loadingDiv = document.getElementById('parties-loading');
  const listDiv = document.getElementById('parties-list');
  const noneDiv = document.getElementById('parties-none');
  const saveBtn = document.getElementById('save-parties-btn');

  loadingDiv.classList.remove('hidden');
  listDiv.classList.add('hidden');
  noneDiv.classList.add('hidden');
  saveBtn.classList.add('hidden');

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Get all program-level parties
    const partiesResponse = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/parties`, {
      headers,
      credentials: 'include',
    });

    if (!partiesResponse.ok) {
      if (partiesResponse.status === 404 || partiesResponse.status === 204) {
        loadingDiv.classList.add('hidden');
        noneDiv.classList.remove('hidden');
        return;
      }
      throw new Error('Failed to load parties');
    }

    const allParties = await partiesResponse.json();
    const activeParties = allParties.filter(p => p.status !== 'retired');

    if (activeParties.length === 0) {
      loadingDiv.classList.add('hidden');
      noneDiv.classList.remove('hidden');
      return;
    }

    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get activated parties for this year
    let activatedPartyIds = [];
    try {
      const activatedResponse = await fetch(`${apiBase}/program-years/${programYearId}/parties`, {
        headers,
        credentials: 'include',
      });

      if (activatedResponse.ok) {
        const activatedParties = await activatedResponse.json();
        activatedPartyIds = activatedParties.map(p => p.partyId);
      }
    } catch (err) {
      console.warn('No activated parties yet:', err);
    }

    // Render parties with checkboxes (without inline styles to comply with CSP)
    listDiv.innerHTML = activeParties.map(party => `
      <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition cursor-pointer">
        <input
          type="checkbox"
          class="party-checkbox w-5 h-5 text-legend-blue focus:ring-2 focus:ring-legend-blue rounded"
          data-party-id="${party.id}"
          ${activatedPartyIds.includes(party.id) ? 'checked' : ''}
        />
        <div class="flex items-center gap-2 flex-1">
          <div class="party-color-indicator w-6 h-6 rounded-full border-2 border-gray-300" data-color="${party.color || '#1B3D6D'}"></div>
          <span class="font-semibold text-legend-blue">${escapeHtml(party.name)}</span>
        </div>
      </label>
    `).join('');

    // Set party colors via JavaScript to comply with CSP
    listDiv.querySelectorAll('.party-color-indicator').forEach(el => {
      el.style.backgroundColor = el.dataset.color;
    });

    loadingDiv.classList.add('hidden');
    listDiv.classList.remove('hidden');
    saveBtn.classList.remove('hidden');

  } catch (err) {
    showError(err.message || 'Failed to load parties');
    loadingDiv.classList.add('hidden');
    console.error('Error loading parties:', err);
  }
}

// Build a tree structure from flat groupings list
function buildGroupingTree(groupings) {
  const groupingMap = new Map();
  const rootNodes = [];

  // First pass: create map of all groupings
  groupings.forEach(g => {
    groupingMap.set(g.id, { ...g, children: [] });
  });

  // Second pass: build tree structure
  groupings.forEach(g => {
    const node = groupingMap.get(g.id);
    if (g.parentGroupingId && groupingMap.has(g.parentGroupingId)) {
      groupingMap.get(g.parentGroupingId).children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Sort children by displayOrder then name
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      }
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(rootNodes);

  return { rootNodes, groupingMap };
}

// Render grouping tree recursively
function renderGroupingTree(nodes, activatedGroupingIds, level = 0) {
  let html = '';
  // Use Tailwind margin classes for indentation (ml-0, ml-6, ml-12, ml-18, ml-24)
  // For deeper levels, cap at ml-24 (6 rem)
  const marginClasses = ['ml-0', 'ml-6', 'ml-12', 'ml-16', 'ml-20', 'ml-24'];
  const marginClass = marginClasses[Math.min(level, marginClasses.length - 1)];

  nodes.forEach(node => {
    const typeName = node.groupingType?.customName || node.groupingType?.defaultName || '';
    const hasChildren = node.children && node.children.length > 0;

    html += `
      <div class="grouping-tree-item" data-grouping-id="${node.id}" data-parent-id="${node.parentGroupingId || ''}">
        <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition cursor-pointer ${marginClass}">
          <input
            type="checkbox"
            class="grouping-checkbox w-5 h-5 text-legend-blue focus:ring-2 focus:ring-legend-blue rounded"
            data-grouping-id="${node.id}"
            data-parent-id="${node.parentGroupingId || ''}"
            ${activatedGroupingIds.includes(node.id) ? 'checked' : ''}
          />
          <div class="flex items-center gap-2 flex-1">
            ${hasChildren ? '<span class="text-gray-400 text-sm">▾</span>' : '<span class="w-4"></span>'}
            <span class="font-semibold text-legend-blue">${escapeHtml(node.name)}</span>
            ${typeName ? `<span class="text-xs text-gray-500">(${escapeHtml(typeName)})</span>` : ''}
          </div>
        </label>
      </div>`;

    if (hasChildren) {
      html += renderGroupingTree(node.children, activatedGroupingIds, level + 1);
    }
  });

  return html;
}

// Get all ancestor IDs for a grouping
function getAncestorIds(groupingId, groupingMap) {
  const ancestors = [];
  let current = groupingMap.get(groupingId);

  while (current && current.parentGroupingId) {
    ancestors.push(current.parentGroupingId);
    current = groupingMap.get(current.parentGroupingId);
  }

  return ancestors;
}

// Get all descendant IDs for a grouping
function getDescendantIds(groupingId, groupingMap) {
  const descendants = [];
  const node = groupingMap.get(groupingId);

  if (node && node.children) {
    const collectDescendants = (children) => {
      children.forEach(child => {
        descendants.push(child.id);
        if (child.children && child.children.length > 0) {
          collectDescendants(child.children);
        }
      });
    };
    collectDescendants(node.children);
  }

  return descendants;
}

// Setup cascade selection handlers for groupings
function setupGroupingCascadeHandlers(groupingMap) {
  const listDiv = document.getElementById('groupings-list');

  listDiv.addEventListener('change', (e) => {
    if (!e.target.classList.contains('grouping-checkbox')) return;

    const groupingId = parseInt(e.target.dataset.groupingId);
    const isChecked = e.target.checked;

    if (isChecked) {
      // Cascade UP: select all ancestors
      const ancestorIds = getAncestorIds(groupingId, groupingMap);
      ancestorIds.forEach(ancestorId => {
        const ancestorCheckbox = listDiv.querySelector(`.grouping-checkbox[data-grouping-id="${ancestorId}"]`);
        if (ancestorCheckbox && !ancestorCheckbox.checked) {
          ancestorCheckbox.checked = true;
        }
      });
    } else {
      // Cascade DOWN: deselect all descendants
      const descendantIds = getDescendantIds(groupingId, groupingMap);
      descendantIds.forEach(descendantId => {
        const descendantCheckbox = listDiv.querySelector(`.grouping-checkbox[data-grouping-id="${descendantId}"]`);
        if (descendantCheckbox && descendantCheckbox.checked) {
          descendantCheckbox.checked = false;
        }
      });
    }
  });
}

// Store grouping map globally for cascade handlers
let currentGroupingMap = null;

// Load groupings and their activation status
async function loadGroupings(programId, year) {
  const loadingDiv = document.getElementById('groupings-loading');
  const listDiv = document.getElementById('groupings-list');
  const noneDiv = document.getElementById('groupings-none');
  const saveBtn = document.getElementById('save-groupings-btn');

  loadingDiv.classList.remove('hidden');
  listDiv.classList.add('hidden');
  noneDiv.classList.add('hidden');
  saveBtn.classList.add('hidden');

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Get all program-level groupings
    const groupingsResponse = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/groupings`, {
      headers,
      credentials: 'include',
    });

    if (!groupingsResponse.ok) {
      if (groupingsResponse.status === 404 || groupingsResponse.status === 204) {
        loadingDiv.classList.add('hidden');
        noneDiv.classList.remove('hidden');
        return;
      }
      throw new Error('Failed to load groupings');
    }

    const allGroupings = await groupingsResponse.json();
    const activeGroupings = allGroupings.filter(g => g.status !== 'retired');

    if (activeGroupings.length === 0) {
      loadingDiv.classList.add('hidden');
      noneDiv.classList.remove('hidden');
      return;
    }

    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get activated groupings for this year
    let activatedGroupingIds = [];
    try {
      const activatedResponse = await fetch(`${apiBase}/program-years/${programYearId}/groupings`, {
        headers,
        credentials: 'include',
      });

      if (activatedResponse.ok) {
        const activatedGroupings = await activatedResponse.json();
        activatedGroupingIds = activatedGroupings.map(g => g.groupingId);
      }
    } catch (err) {
      console.warn('No activated groupings yet:', err);
    }

    // Build tree structure
    const { rootNodes, groupingMap } = buildGroupingTree(activeGroupings);
    currentGroupingMap = groupingMap;

    // Render tree
    listDiv.innerHTML = `<div class="space-y-1">${renderGroupingTree(rootNodes, activatedGroupingIds)}</div>`;

    // Setup cascade selection handlers
    setupGroupingCascadeHandlers(groupingMap);

    loadingDiv.classList.add('hidden');
    listDiv.classList.remove('hidden');
    saveBtn.classList.remove('hidden');

  } catch (err) {
    showError(err.message || 'Failed to load groupings');
    loadingDiv.classList.add('hidden');
    console.error('Error loading groupings:', err);
  }
}

// Save grouping activations for the selected year
async function saveGroupingActivations() {
  clearMessages();
  const programId = getProgramId();
  const year = parseInt(document.getElementById('year-select').value);

  if (!programId || !year) {
    showError('Program or year not selected');
    return;
  }

  const saveBtn = document.getElementById('save-groupings-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get checked grouping IDs
    const checkboxes = document.querySelectorAll('.grouping-checkbox');
    const selectedGroupingIds = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.groupingId));

    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Send activation request
    const response = await fetch(`${apiBase}/program-years/${programYearId}/groupings/activate`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ groupingIds: selectedGroupingIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save grouping activations');
    }

    showSuccess(`Successfully activated ${selectedGroupingIds.length} ${selectedGroupingIds.length === 1 ? 'grouping' : 'groupings'} for ${year}`);

    // Reload to show updated state
    setTimeout(() => loadYearConfiguration(year), 1000);

  } catch (err) {
    showError(err.message || 'Failed to save grouping activations');
    console.error('Error saving grouping activations:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Grouping Activations';
  }
}

// Load positions and their activation status
async function loadPositions(programId, year) {
  const loadingDiv = document.getElementById('positions-loading');
  const listDiv = document.getElementById('positions-list');
  const noneDiv = document.getElementById('positions-none');
  const saveBtn = document.getElementById('save-positions-btn');

  loadingDiv.classList.remove('hidden');
  listDiv.classList.add('hidden');
  noneDiv.classList.add('hidden');
  saveBtn.classList.add('hidden');

  try {
    const headers = {};
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Get all program-level positions
    const positionsResponse = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/positions`, {
      headers,
      credentials: 'include',
    });

    if (!positionsResponse.ok) {
      if (positionsResponse.status === 404 || positionsResponse.status === 204) {
        loadingDiv.classList.add('hidden');
        noneDiv.classList.remove('hidden');
        return;
      }
      throw new Error('Failed to load positions');
    }

    const allPositions = await positionsResponse.json();
    const activePositions = allPositions.filter(p => p.status !== 'retired');

    if (activePositions.length === 0) {
      loadingDiv.classList.add('hidden');
      noneDiv.classList.remove('hidden');
      return;
    }

    // Get grouping types to map IDs to names
    let groupingTypeMap = new Map();
    try {
      const groupingTypesResponse = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/grouping-types`, {
        headers,
        credentials: 'include',
      });
      if (groupingTypesResponse.ok) {
        const groupingTypes = await groupingTypesResponse.json();
        groupingTypes.forEach(gt => {
          groupingTypeMap.set(gt.id, gt.customName || gt.defaultName || 'Unknown');
        });
      }
    } catch (err) {
      console.warn('Could not load grouping types:', err);
    }

    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get activated positions for this year
    let activatedPositionIds = [];
    try {
      const activatedResponse = await fetch(`${apiBase}/program-years/${programYearId}/positions`, {
        headers,
        credentials: 'include',
      });

      if (activatedResponse.ok) {
        const activatedPositions = await activatedResponse.json();
        activatedPositionIds = activatedPositions.map(p => p.positionId);
      }
    } catch (err) {
      console.warn('No activated positions yet:', err);
    }

    // Group positions by grouping type
    const groupedByType = {};
    activePositions.forEach(p => {
      const typeName = p.groupingTypeId ? (groupingTypeMap.get(p.groupingTypeId) || 'Unknown Level') : 'Program-wide';
      if (!groupedByType[typeName]) {
        groupedByType[typeName] = [];
      }
      groupedByType[typeName].push(p);
    });

    // Sort groups: Program-wide first, then by grouping type level order
    const sortedGroups = Object.entries(groupedByType).sort((a, b) => {
      if (a[0] === 'Program-wide') return -1;
      if (b[0] === 'Program-wide') return 1;
      return a[0].localeCompare(b[0]);
    });

    // Render positions grouped by type
    let html = '';
    sortedGroups.forEach(([typeName, positions]) => {
      html += `<div class="mb-4">
        <h4 class="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">${escapeHtml(typeName)} Positions</h4>
        <div class="space-y-2">`;
      positions.forEach(position => {
        html += `
          <label class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition cursor-pointer">
            <input
              type="checkbox"
              class="position-checkbox w-5 h-5 text-legend-blue focus:ring-2 focus:ring-legend-blue rounded"
              data-position-id="${position.id}"
              ${activatedPositionIds.includes(position.id) ? 'checked' : ''}
            />
            <div class="flex-1">
              <span class="font-semibold text-legend-blue">${escapeHtml(position.name)}</span>
              ${position.isElected ? '<span class="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Elected</span>' : '<span class="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Appointed</span>'}
              ${position.description ? `<p class="text-sm text-gray-500 mt-1">${escapeHtml(position.description)}</p>` : ''}
            </div>
          </label>`;
      });
      html += `</div></div>`;
    });

    listDiv.innerHTML = html;

    loadingDiv.classList.add('hidden');
    listDiv.classList.remove('hidden');
    saveBtn.classList.remove('hidden');

  } catch (err) {
    showError(err.message || 'Failed to load positions');
    loadingDiv.classList.add('hidden');
    console.error('Error loading positions:', err);
  }
}

// Save position activations for the selected year
async function savePositionActivations() {
  clearMessages();
  const programId = getProgramId();
  const year = parseInt(document.getElementById('year-select').value);

  if (!programId || !year) {
    showError('Program or year not selected');
    return;
  }

  const saveBtn = document.getElementById('save-positions-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get checked position IDs
    const checkboxes = document.querySelectorAll('.position-checkbox');
    const selectedPositionIds = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.positionId));

    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Send activation request
    const response = await fetch(`${apiBase}/program-years/${programYearId}/positions/activate`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ positionIds: selectedPositionIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save position activations');
    }

    showSuccess(`Successfully activated ${selectedPositionIds.length} ${selectedPositionIds.length === 1 ? 'position' : 'positions'} for ${year}`);

    // Reload to show updated state
    setTimeout(() => loadYearConfiguration(year), 1000);

  } catch (err) {
    showError(err.message || 'Failed to save position activations');
    console.error('Error saving position activations:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Position Activations';
  }
}

// Save party activations for the selected year
async function savePartyActivations() {
  clearMessages();
  const programId = getProgramId();
  const year = parseInt(document.getElementById('year-select').value);

  if (!programId || !year) {
    showError('Program or year not selected');
    return;
  }

  const saveBtn = document.getElementById('save-parties-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Get program year ID
    const programYearId = await getProgramYearId(programId, year);
    if (!programYearId) {
      throw new Error('Failed to get program year ID');
    }

    // Get checked party IDs
    const checkboxes = document.querySelectorAll('.party-checkbox');
    const selectedPartyIds = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.partyId));

    const headers = { 'Content-Type': 'application/json' };
    if (typeof getAuthHeaders === 'function') {
      Object.assign(headers, getAuthHeaders());
    }

    // Send activation request
    const response = await fetch(`${apiBase}/program-years/${programYearId}/parties/activate`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ partyIds: selectedPartyIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save party activations');
    }

    showSuccess(`Successfully activated ${selectedPartyIds.length} ${selectedPartyIds.length === 1 ? 'party' : 'parties'} for ${year}`);

    // Reload to show updated state
    setTimeout(() => loadYearConfiguration(year), 1000);

  } catch (err) {
    showError(err.message || 'Failed to save party activations');
    console.error('Error saving party activations:', err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Party Activations';
  }
}

// Helper to safely escape HTML
function escapeHtml(str) {
  return ('' + str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Setup event listeners
function setupEventListeners() {
  // Year selector change
  document.getElementById('year-select').addEventListener('change', (e) => {
    const year = parseInt(e.target.value);
    const programId = getProgramId();
    if (programId && year) {
      localStorage.setItem(`selectedYear_${programId}`, year.toString());
      loadYearConfiguration(year);
    }
  });

  // Save parties button
  document.getElementById('save-parties-btn').addEventListener('click', savePartyActivations);

  // Save groupings button
  document.getElementById('save-groupings-btn').addEventListener('click', saveGroupingActivations);

  // Save positions button
  document.getElementById('save-positions-btn').addEventListener('click', savePositionActivations);

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  const programId = getProgramId();

  if (!programId) {
    showError('No program selected. Please select a program from the dashboard.');
    return;
  }

  updateNavLinks();
  setupEventListeners();
  await loadYears();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    getSelectedYear,
    getProgramYearId,
    updateNavLinks,
    loadYears,
    loadYearConfiguration,
    loadParties,
    savePartyActivations,
    loadGroupings,
    saveGroupingActivations,
    loadPositions,
    savePositionActivations,
    buildGroupingTree,
    renderGroupingTree,
    getAncestorIds,
    getDescendantIds
  };
}
