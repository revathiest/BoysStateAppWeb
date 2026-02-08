// elections-management.js
// Election management for admin portal

const apiBase = window.API_URL || "";

// State
let currentProgramId = null;
let currentProgramYearId = null;
let groupingTypes = [];
let elections = [];
let currentElection = null;
let currentCandidate = null;

// Election type display labels
const electionTypeLabels = {
  primary: 'Primary',
  general: 'General',
  runoff: 'Runoff',
  primary_runoff: 'Primary Runoff',
};

function getElectionTypeLabel(type) {
  return electionTypeLabels[type] || type || 'General';
}

// Get programId from URL params or localStorage
function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  const urlProgramId = params.get('programId');
  const storedProgramId = localStorage.getItem('lastSelectedProgramId');
  return urlProgramId || storedProgramId || '';
}

// Show error message
function showError(message) {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
    // Scroll to make error visible
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (successBox) successBox.classList.add('hidden');
  }, 5000);
}

// Clear messages
function clearMessages() {
  const errorBox = document.getElementById('errorBox');
  const successBox = document.getElementById('successBox');
  if (errorBox) errorBox.classList.add('hidden');
  if (successBox) successBox.classList.add('hidden');
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Render program selector
function renderProgramSelector(programId, programName) {
  const container = document.getElementById("program-selector");
  if (!programId || !programName) {
    container.innerHTML = '<div class="text-red-600 font-semibold">No program selected. Please return to the dashboard.</div>';
    return;
  }
  container.innerHTML = `
    <div class="mb-2 flex items-center">
      <span class="font-bold text-gray-700 mr-2">Program:</span>
      <span class="text-lg text-legend-blue font-semibold">${escapeHtml(programName)}</span>
    </div>
  `;
}

// ============================================================
// DATA LOADING
// ============================================================

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
      throw new Error('Failed to load program years');
    }

    const years = await response.json();
    yearSelect.innerHTML = '<option value="">Select a year...</option>' +
      years.map(y => `<option value="${y.id}">${y.year}</option>`).join('');

    // Select most recent year by default
    if (years.length > 0) {
      const mostRecent = years.sort((a, b) => b.year - a.year)[0];
      yearSelect.value = mostRecent.id;
      currentProgramYearId = mostRecent.id;
      await loadGroupingTypes();
      await loadElections();
    }
  } catch (err) {
    console.error('Error loading program years:', err);
    showError('Failed to load program years');
  }
}

// Load grouping types (organizational levels)
async function loadGroupingTypes() {
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(currentProgramId)}/grouping-types`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load grouping types');
    }

    groupingTypes = await response.json();
    groupingTypes = groupingTypes.filter(t => t.status !== 'retired');
    groupingTypes.sort((a, b) => (a.levelOrder || 0) - (b.levelOrder || 0));

    // Update level dropdowns
    const levelSelect = document.getElementById('level-select');
    const filterLevel = document.getElementById('filter-level');

    const options = groupingTypes.map(t => {
      const name = t.customName || t.defaultName;
      return `<option value="${t.id}">${escapeHtml(name)}</option>`;
    }).join('');

    if (levelSelect) {
      levelSelect.innerHTML = '<option value="">Select a level...</option>' + options;
    }
    if (filterLevel) {
      filterLevel.innerHTML = '<option value="">All Levels</option>' + options;
    }
  } catch (err) {
    console.error('Error loading grouping types:', err);
  }
}

// Load elections for current program year
async function loadElections() {
  if (!currentProgramYearId) {
    document.getElementById('elections-list').innerHTML = '<p class="text-gray-500 italic">Select a year to view elections...</p>';
    return;
  }

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/elections`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load elections');
    }

    elections = await response.json();
    renderElections();
  } catch (err) {
    console.error('Error loading elections:', err);
    showError('Failed to load elections');
  }
}

// Load positions at a level (for preview)
async function loadPositionsAtLevel(groupingTypeId) {
  const preview = document.getElementById('positions-preview');
  const positionsList = document.getElementById('positions-list');
  const primaryBtn = document.getElementById('open-primary-btn');
  const generalBtn = document.getElementById('open-general-btn');

  // Clear any error messages when user selects a level
  clearMessages();

  if (!groupingTypeId || !currentProgramYearId) {
    preview.classList.add('hidden');
    // Disable buttons when no level selected
    primaryBtn.disabled = true;
    generalBtn.disabled = true;
    return;
  }

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/election-positions?groupingTypeId=${groupingTypeId}`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load positions');
    }

    const positions = await response.json();

    // Debug: Log position data to verify isNonPartisan values
    console.log('Positions at level:', positions.map(p => ({
      name: p.name,
      isNonPartisan: p.isNonPartisan,
      type: typeof p.isNonPartisan
    })));

    // Split positions into partisan (has primary) and non-partisan (no primary)
    // Partisan: isNonPartisan is false, null, or undefined (default assumption)
    // Non-partisan: isNonPartisan must be explicitly true
    const partisanPositions = positions.filter(p => p.isNonPartisan !== true);
    const nonPartisanPositions = positions.filter(p => p.isNonPartisan === true);

    // Enable/disable buttons based on available positions
    primaryBtn.disabled = partisanPositions.length === 0;
    generalBtn.disabled = nonPartisanPositions.length === 0;

    if (positions.length === 0) {
      positionsList.innerHTML = '<span class="text-gray-500 italic">No elected positions at this level</span>';
    } else {
      let html = '';

      // Partisan positions (with primaries)
      if (partisanPositions.length > 0) {
        html += `
          <div class="mb-3">
            <h4 class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Partisan (Primary → General)</h4>
            <div class="flex flex-wrap gap-2">
              ${partisanPositions.map(p => renderPositionBadge(p, 'purple')).join('')}
            </div>
          </div>
        `;
      }

      // Non-partisan positions (no primaries)
      if (nonPartisanPositions.length > 0) {
        html += `
          <div>
            <h4 class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Non-Partisan (General Only)</h4>
            <div class="flex flex-wrap gap-2">
              ${nonPartisanPositions.map(p => renderPositionBadge(p, 'blue')).join('')}
            </div>
          </div>
        `;
      }

      positionsList.innerHTML = html;
    }

    preview.classList.remove('hidden');
  } catch (err) {
    console.error('Error loading positions:', err);
  }
}

// Helper to render a position badge
function renderPositionBadge(position, color) {
  const seatBadge = position.seatCount > 1 ? `<span class="text-xs text-gray-500">(${position.seatCount} seats)</span>` : '';
  const openBadge = position.hasOpenElections
    ? '<span class="text-xs text-amber-600">(already open)</span>'
    : '';
  const bgColor = color === 'purple' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200';
  return `<span class="${bgColor} border px-2 py-1 rounded text-sm">${escapeHtml(position.name)} ${seatBadge} ${openBadge}</span>`;
}

// ============================================================
// RENDERING
// ============================================================

// Update KPI dashboard
function updateKPIs() {
  const dashboard = document.getElementById('kpi-dashboard');
  if (!dashboard) return;

  // Filter out archived elections
  const activeElections = elections.filter(e => e.status !== 'archived');

  if (activeElections.length === 0) {
    dashboard.classList.add('hidden');
    return;
  }

  dashboard.classList.remove('hidden');

  // Count by status
  const nominations = activeElections.filter(e => e.status === 'nomination').length;
  const scheduled = activeElections.filter(e => e.status === 'scheduled').length;
  const active = activeElections.filter(e => e.status === 'active').length;

  // Count elections with 100% voter turnout (all eligible voters have voted)
  const votingComplete = activeElections.filter(e => {
    const voteCount = e._count?.votes || 0;
    const eligibleVoters = e.eligibleVoters || 0;
    return voteCount >= eligibleVoters && eligibleVoters > 0;
  }).length;

  // Sum total votes
  const totalVotes = activeElections.reduce((sum, e) => sum + (e._count?.votes || 0), 0);

  // Update DOM
  document.getElementById('kpi-total').textContent = activeElections.length;
  document.getElementById('kpi-nominations').textContent = nominations;
  document.getElementById('kpi-scheduled').textContent = scheduled;
  document.getElementById('kpi-active').textContent = active;
  document.getElementById('kpi-completed').textContent = votingComplete;
  document.getElementById('kpi-votes').textContent = totalVotes.toLocaleString();
}

// Update status summary chips with counts
function updateStatusSummary() {
  const summaryBar = document.getElementById('status-summary');
  if (!summaryBar) return;

  // Calculate counts per status (excluding archived)
  const nonArchived = elections.filter(e => e.status !== 'archived');
  const counts = {
    '': nonArchived.length,
    nomination: nonArchived.filter(e => e.status === 'nomination').length,
    scheduled: nonArchived.filter(e => e.status === 'scheduled').length,
    active: nonArchived.filter(e => e.status === 'active').length,
    completed: nonArchived.filter(e => e.status === 'completed').length,
    skipped: nonArchived.filter(e => e.status === 'skipped').length,
  };

  // Update chip counts and visibility
  summaryBar.querySelectorAll('.status-chip').forEach(chip => {
    const status = chip.getAttribute('data-status');
    const countSpan = chip.querySelector('.status-count');
    const count = counts[status] || 0;

    if (countSpan) {
      countSpan.textContent = status === '' ? '' : count;
    }

    // Hide chips with 0 count (except "All")
    if (status !== '') {
      chip.classList.toggle('hidden', count === 0);
    }
  });

  // Show the summary bar if we have elections
  summaryBar.classList.toggle('hidden', nonArchived.length === 0);

  // Sync active chip with current filter
  const currentFilter = document.getElementById('filter-status').value;
  updateActiveChip(currentFilter);
}

// Update visual state of active chip
function updateActiveChip(activeStatus) {
  const summaryBar = document.getElementById('status-summary');
  if (!summaryBar) return;

  const chipStyles = {
    '': { active: 'bg-legend-blue text-white', inactive: 'bg-white text-legend-blue hover:bg-blue-50' },
    nomination: { active: 'bg-amber-500 text-white', inactive: 'bg-white text-amber-700 hover:bg-amber-50' },
    scheduled: { active: 'bg-blue-500 text-white', inactive: 'bg-white text-blue-700 hover:bg-blue-50' },
    active: { active: 'bg-green-500 text-white', inactive: 'bg-white text-green-700 hover:bg-green-50' },
    completed: { active: 'bg-gray-500 text-white', inactive: 'bg-white text-gray-600 hover:bg-gray-50' },
    skipped: { active: 'bg-purple-500 text-white', inactive: 'bg-white text-purple-700 hover:bg-purple-50' },
  };

  summaryBar.querySelectorAll('.status-chip').forEach(chip => {
    const status = chip.getAttribute('data-status');
    const styles = chipStyles[status] || chipStyles[''];
    const isActive = status === activeStatus;

    // Remove all possible style classes
    chip.classList.remove(
      'bg-legend-blue', 'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-gray-500', 'bg-purple-500',
      'bg-white', 'text-white', 'text-legend-blue', 'text-amber-700', 'text-blue-700',
      'text-green-700', 'text-gray-600', 'text-purple-700',
      'hover:bg-blue-50', 'hover:bg-amber-50', 'hover:bg-green-50', 'hover:bg-gray-50', 'hover:bg-purple-50'
    );

    // Add appropriate classes
    const classes = isActive ? styles.active : styles.inactive;
    classes.split(' ').forEach(c => chip.classList.add(c));
  });
}

// Handle status chip click
function onStatusChipClick(event) {
  const chip = event.currentTarget;
  const status = chip.getAttribute('data-status');

  // Update the dropdown to match
  const dropdown = document.getElementById('filter-status');
  if (dropdown) {
    dropdown.value = status;
  }

  // Re-render with the new filter
  renderElections();
}

// Render elections list
function renderElections() {
  const container = document.getElementById('elections-list');
  const filterLevel = document.getElementById('filter-level').value;
  const filterStatus = document.getElementById('filter-status').value;
  const closeAllBtn = document.getElementById('close-all-nominations-btn');
  const startAllBtn = document.getElementById('start-all-elections-btn');
  const closeAllActiveBtn = document.getElementById('close-all-elections-btn');

  // Update status summary chips
  updateStatusSummary();

  let filtered = elections.filter(e => e.status !== 'archived');

  // Show/hide "Close All Nominations" button based on elections in nomination status
  const hasNominationsOpen = elections.some(e => e.status === 'nomination');
  if (closeAllBtn) {
    closeAllBtn.classList.toggle('hidden', !hasNominationsOpen);
  }

  // Show/hide "Start All Elections" button based on elections in scheduled status
  const hasScheduledElections = elections.some(e => e.status === 'scheduled');
  if (startAllBtn) {
    startAllBtn.classList.toggle('hidden', !hasScheduledElections);
  }

  // Show/hide "Close All Active Elections" button based on elections in active status
  const hasActiveElections = elections.some(e => e.status === 'active');
  if (closeAllActiveBtn) {
    closeAllActiveBtn.classList.toggle('hidden', !hasActiveElections);
  }

  if (filterLevel) {
    filtered = filtered.filter(e => e.grouping?.groupingType?.id === parseInt(filterLevel));
  }
  if (filterStatus) {
    filtered = filtered.filter(e => e.status === filterStatus);
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-gray-500 italic">No elections found. Open nominations for a level to create elections.</p>';
    return;
  }

  // Group by level
  const grouped = {};
  filtered.forEach(e => {
    const levelName = e.grouping?.groupingType?.customName || e.grouping?.groupingType?.defaultName || 'Unknown';
    if (!grouped[levelName]) {
      grouped[levelName] = [];
    }
    grouped[levelName].push(e);
  });

  let html = '';
  for (const [levelName, levelElections] of Object.entries(grouped)) {
    html += `
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-gray-100 px-4 py-3">
          <h3 class="font-semibold text-legend-blue">${escapeHtml(levelName)} Elections</h3>
        </div>
        <div class="p-3 space-y-2 bg-white">
          ${levelElections.map(e => renderElectionCard(e)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // Apply progress bar widths via JavaScript to avoid CSP inline style issues
  container.querySelectorAll('.vote-progress-bar').forEach(bar => {
    const width = bar.getAttribute('data-width');
    if (width) {
      bar.style.width = width + '%';
    }
  });

  // Apply party badge colors
  container.querySelectorAll('[data-party-badge]').forEach(badge => {
    const color = badge.getAttribute('data-color');
    if (color) {
      badge.style.backgroundColor = color;
    }
  });

  // Attach event handlers
  container.querySelectorAll('.election-card').forEach(card => {
    card.addEventListener('click', () => {
      const electionId = parseInt(card.dataset.id);
      openElectionModal(electionId);
    });
  });

  // Update KPIs
  updateKPIs();
}

// Render a single election card
function renderElectionCard(election) {
  const positionName = election.position?.position?.name || 'Unknown Position';
  const groupingName = election.grouping?.name || '';
  const candidateCount = election._count?.candidates || 0;
  // Use uniqueVoters for turnout calculation - this properly counts distinct voters
  // (important for RCV where each voter casts multiple vote records)
  const voteCount = election.uniqueVoters ?? (election._count?.votes || 0);
  const eligibleVoters = election.eligibleVoters || 0;
  const seatCount = election.position?.position?.seatCount || 1;
  const statusBadge = getStatusBadge(election.status, voteCount, eligibleVoters);

  // For primary elections, show the party name
  const partyName = election.party?.party?.name || '';
  const partyColor = election.party?.party?.color || '#7C3AED'; // Default purple

  let typeBadge = '';
  if (election.electionType === 'primary') {
    if (partyName) {
      // Show party name with party color
      typeBadge = `<span class="text-xs px-2 py-0.5 rounded text-white" data-party-badge data-color="${escapeHtml(partyColor)}">${escapeHtml(partyName)} Primary</span>`;
    } else {
      // Fallback when party data not loaded
      typeBadge = '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">Primary</span>';
    }
  } else if (election.electionType === 'general') {
    typeBadge = '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">General</span>';
  } else if (election.electionType === 'primary_runoff') {
    if (partyName) {
      typeBadge = `<span class="text-xs px-2 py-0.5 rounded text-white" data-party-badge data-color="${escapeHtml(partyColor)}">${escapeHtml(partyName)} Primary Runoff</span>`;
    } else {
      typeBadge = '<span class="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded">Primary Runoff</span>';
    }
  } else if (election.electionType === 'runoff') {
    typeBadge = '<span class="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded">Runoff</span>';
  }

  // Show seat count badge for multi-seat positions
  const seatBadge = seatCount > 1
    ? `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">${seatCount} seats</span>`
    : '';

  // Warning if not enough candidates (need at least seatCount + 1 for a contested race)
  const needsCandidates = election.status === 'nomination' && candidateCount < seatCount + 1;
  const warningBadge = needsCandidates
    ? '<span class="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">Needs candidates</span>'
    : '';

  // Needs runoff badge for completed majority elections without a winner
  const runoffBadge = election.requiresRunoff
    ? '<span class="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-semibold">Needs Runoff</span>'
    : '';

  // Vote progress for active elections
  let voteProgressHtml = '';
  let leaderHtml = '';
  if (election.status === 'active' || election.status === 'completed') {
    const percentage = eligibleVoters > 0 ? Math.round((voteCount / eligibleVoters) * 100) : 0;
    const isComplete = voteCount >= eligibleVoters && eligibleVoters > 0;
    const barColor = isComplete ? 'bg-green-500' : 'bg-legend-blue';

    voteProgressHtml = `
      <div class="mt-2">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>${voteCount} / ${eligibleVoters} votes</span>
          <span>${percentage}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1.5">
          <div class="vote-progress-bar ${barColor} h-1.5 rounded-full transition-all" data-width="${Math.min(percentage, 100)}"></div>
        </div>
      </div>
    `;

    // Show leader/winner if available, or tie indicator
    if (election.hasTie && election.status === 'completed') {
      // Show tie indicator for completed elections with unresolved ties
      leaderHtml = `
        <div class="mt-1 flex items-center gap-1 text-xs">
          <span>⚖️</span>
          <span class="font-medium text-amber-700">Tie - Resolution Required</span>
        </div>
      `;
    } else if (election.winners && election.winners.length > 1 && election.status === 'completed') {
      // Multi-seat election with multiple winners
      const seatCount = election.position?.position?.seatCount || election.winners.length;
      leaderHtml = `
        <div class="mt-1 text-xs">
          <div class="flex items-center gap-1 mb-1">
            <span>🏆</span>
            <span class="text-gray-500">Winners (${election.winners.length} of ${seatCount} seats):</span>
          </div>
          <div class="ml-5 space-y-0.5">
            ${election.winners.map(w => `
              <div class="font-medium text-gray-700">${escapeHtml(w.name)} <span class="text-gray-500 font-normal">(${w.voteCount} votes, ${w.percentage}%)</span></div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (election.leader && election.leader.voteCount > 0) {
      const leaderIcon = election.status === 'completed' ? '🏆' : '📊';
      const leaderLabel = election.status === 'completed' ? 'Winner' : 'Leading';
      // For RCV, indicate this is the final result after instant runoff
      const rcvSuffix = election.leader.isRcvResult ? ' <span class="text-purple-600">(IRV)</span>' : '';
      leaderHtml = `
        <div class="mt-1 flex items-center gap-1 text-xs">
          <span>${leaderIcon}</span>
          <span class="text-gray-500">${leaderLabel}:</span>
          <span class="font-medium text-gray-700">${escapeHtml(election.leader.name)}</span>
          <span class="text-gray-500">(${election.leader.voteCount} votes, ${election.leader.percentage}%)${rcvSuffix}</span>
        </div>
      `;
    }
  }

  return `
    <div class="election-card flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition cursor-pointer" data-id="${election.id}">
      <div class="flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <h4 class="font-semibold text-legend-blue">${escapeHtml(positionName)}</h4>
          ${seatBadge}
          ${typeBadge}
          ${statusBadge}
          ${warningBadge}
          ${runoffBadge}
        </div>
        <p class="text-sm text-gray-600">${escapeHtml(groupingName)} - ${candidateCount} candidate${candidateCount !== 1 ? 's' : ''}</p>
        ${voteProgressHtml}
        ${leaderHtml}
      </div>
      <span class="text-legend-blue ml-4">View &rarr;</span>
    </div>
  `;
}

// Get status badge HTML
function getStatusBadge(status, voteCount = 0, eligibleVoters = 0) {
  // Check if voting is complete (all eligible voters have voted)
  const votingComplete = voteCount >= eligibleVoters && eligibleVoters > 0;

  switch (status) {
    case 'nomination':
      return '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Nominations Open</span>';
    case 'scheduled':
      return '<span class="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">Scheduled</span>';
    case 'active':
      if (votingComplete) {
        return '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">✓ Voting Complete</span>';
      }
      return '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Voting Active</span>';
    case 'completed':
      return '<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">Completed</span>';
    case 'skipped':
      return '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">Appointed</span>';
    default:
      return `<span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">${escapeHtml(status)}</span>`;
  }
}

// ============================================================
// OPEN NOMINATIONS
// ============================================================

async function openNominations(electionType) {
  const levelSelect = document.getElementById('level-select');
  const groupingTypeId = levelSelect.value;

  if (!groupingTypeId) {
    showError('Please select an organizational level');
    return;
  }

  if (!currentProgramYearId) {
    showError('Please select a program year');
    return;
  }

  const btn = electionType === 'primary'
    ? document.getElementById('open-primary-btn')
    : document.getElementById('open-general-btn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Opening...';

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/elections/open-level`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        groupingTypeId: parseInt(groupingTypeId),
        electionType: electionType,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to open nominations');
    }

    const result = await response.json();
    const typeLabel = electionType === 'primary' ? 'primary' : 'general';
    showSuccess(`Created ${result.created} ${typeLabel} election${result.created !== 1 ? 's' : ''}. Nominations are now open.`);

    // Reload elections
    await loadElections();

    // Reset form
    levelSelect.value = '';
    document.getElementById('positions-preview').classList.add('hidden');

  } catch (err) {
    showError(err.message || 'Failed to open nominations');
    console.error('Error opening nominations:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ============================================================
// ELECTION MODAL
// ============================================================

async function openElectionModal(electionId) {
  currentElection = elections.find(e => e.id === electionId);
  if (!currentElection) return;

  const modal = document.getElementById('election-modal');
  const title = document.getElementById('election-modal-title');
  const info = document.getElementById('election-info');
  const candidatesList = document.getElementById('candidates-list');

  // Clear any previous error message
  const errorEl = document.getElementById('election-modal-error');
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }

  const positionName = currentElection.position?.position?.name || 'Unknown Position';
  const groupingName = currentElection.grouping?.name || '';
  const position = currentElection.position?.position;
  const partyName = currentElection.party?.party?.name || '';

  // For primary elections, include the party name in the title
  const electionTitle = partyName
    ? `${partyName} Primary: ${positionName} - ${groupingName}`
    : `${positionName} - ${groupingName}`;
  title.textContent = electionTitle;

  const seatCount = position?.seatCount || 1;
  const candidateCount = currentElection.candidates?.length || currentElection._count?.candidates || 0;
  const needsMoreCandidates = candidateCount < seatCount + 1;

  // Show election info
  info.innerHTML = `
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span class="text-gray-500">Status:</span>
        <span class="ml-2 font-semibold">${getStatusBadge(currentElection.status)}</span>
      </div>
      <div>
        <span class="text-gray-500">Type:</span>
        <span class="ml-2">${getElectionTypeLabel(currentElection.electionType)}</span>
      </div>
      <div>
        <span class="text-gray-500">Seats to fill:</span>
        <span class="ml-2 font-semibold">${seatCount}</span>
      </div>
      <div>
        <span class="text-gray-500">Candidates:</span>
        <span class="ml-2 font-semibold ${needsMoreCandidates && currentElection.status === 'nomination' ? 'text-amber-600' : ''}">${candidateCount}</span>
        ${needsMoreCandidates && currentElection.status === 'nomination' ? '<span class="text-amber-600 text-xs ml-1">(need ' + (seatCount + 1) + '+ for contested)</span>' : ''}
      </div>
      ${position?.requiresDeclaration ? '<div class="col-span-2 text-amber-600"><span class="font-semibold">Requires Declaration of Candidacy</span></div>' : ''}
      ${position?.requiresPetition ? `<div class="col-span-2 text-amber-600"><span class="font-semibold">Requires Petition (${position.petitionSignatures || 'unknown'} signatures)</span></div>` : ''}
    </div>
  `;

  // Show/hide action buttons based on status
  const closeNominationsBtn = document.getElementById('close-nominations-btn');
  const addCandidateBtn = document.getElementById('add-candidate-btn');
  const reopenNominationsBtn = document.getElementById('reopen-nominations-btn');
  const skipToAppointedBtn = document.getElementById('skip-to-appointed-btn');

  closeNominationsBtn.classList.toggle('hidden', currentElection.status !== 'nomination');
  addCandidateBtn.classList.toggle('hidden', currentElection.status !== 'nomination');

  // Show "Reopen Nominations" when election is scheduled, active, or completed
  const canReopenNominations = ['scheduled', 'active', 'completed'].includes(currentElection.status);
  reopenNominationsBtn.classList.toggle('hidden', !canReopenNominations);

  // Show "Skip to Appointed" when election has no candidates and is in nomination or scheduled status
  // This allows converting a position to appointed when no one wants to run
  const canSkipToAppointed = ['nomination', 'scheduled'].includes(currentElection.status) && candidateCount === 0;
  skipToAppointedBtn.classList.toggle('hidden', !canSkipToAppointed);

  // Show/hide results section based on status
  const resultsSection = document.getElementById('election-results-section');
  const hasVotes = ['active', 'completed'].includes(currentElection.status);
  resultsSection.classList.toggle('hidden', !hasVotes);

  // Load candidates
  await loadCandidates();

  // Load results if election has votes (runoff button is shown in results section if needed)
  if (hasVotes) {
    await loadElectionResults();
  }

  modal.classList.remove('hidden');
}

async function loadCandidates() {
  if (!currentElection) return;

  const candidatesList = document.getElementById('candidates-list');
  candidatesList.innerHTML = '<p class="text-gray-500 italic">Loading candidates...</p>';

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/elections/${currentElection.id}/candidates`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load candidates');
    }

    const candidates = await response.json();
    const position = currentElection.position?.position;

    if (candidates.length === 0) {
      candidatesList.innerHTML = '<p class="text-gray-500 italic">No candidates yet. Click "Add Candidate" to nominate delegates.</p>';
      return;
    }

    candidatesList.innerHTML = candidates.map(c => {
      const delegateName = `${c.delegate?.firstName || ''} ${c.delegate?.lastName || ''}`.trim();
      const partyName = c.party?.party?.name || 'No Party';
      const statusBadge = getCandidateStatusBadge(c.status);

      // Check requirements
      let requirementsBadges = '';
      if (position?.requiresDeclaration) {
        requirementsBadges += c.declarationReceived
          ? '<span class="text-xs text-green-600">Declaration ✓</span>'
          : '<span class="text-xs text-red-600">Declaration pending</span>';
      }
      if (position?.requiresPetition) {
        requirementsBadges += c.petitionVerified
          ? `<span class="text-xs text-green-600 ml-2">Petition ✓ (${c.petitionSignatureCount || 0})</span>`
          : '<span class="text-xs text-red-600 ml-2">Petition pending</span>';
      }

      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-800">${escapeHtml(delegateName)}</span>
              <span class="text-sm text-gray-500">(${escapeHtml(partyName)})</span>
              ${statusBadge}
            </div>
            ${requirementsBadges ? `<div class="mt-1">${requirementsBadges}</div>` : ''}
          </div>
          <button class="edit-candidate-btn text-legend-blue hover:text-blue-800 text-sm font-semibold" data-id="${c.id}">
            Edit
          </button>
        </div>
      `;
    }).join('');

    // Attach edit handlers
    candidatesList.querySelectorAll('.edit-candidate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const candidateId = parseInt(btn.dataset.id);
        const candidate = candidates.find(c => c.id === candidateId);
        if (candidate) {
          openCandidateModal(candidate);
        }
      });
    });

  } catch (err) {
    console.error('Error loading candidates:', err);
    candidatesList.innerHTML = '<p class="text-red-500">Failed to load candidates</p>';
  }
}

function getCandidateStatusBadge(status) {
  switch (status) {
    case 'nominated':
      return '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">Nominated</span>';
    case 'qualified':
      return '<span class="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Qualified</span>';
    case 'withdrawn':
      return '<span class="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">Withdrawn</span>';
    case 'advanced':
      return '<span class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">Advanced</span>';
    case 'elected':
      return '<span class="bg-legend-gold text-legend-blue text-xs px-2 py-0.5 rounded font-semibold">Elected</span>';
    default:
      return '';
  }
}

// Load and display election results in the modal
async function loadElectionResults() {
  if (!currentElection) return;

  const resultsContent = document.getElementById('election-results-content');
  resultsContent.innerHTML = '<p class="text-gray-500 italic">Loading results...</p>';

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/elections/${currentElection.id}/results`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load results');
    }

    const data = await response.json();
    renderElectionResultsModal(data);

  } catch (err) {
    console.error('Error loading election results:', err);
    resultsContent.innerHTML = '<p class="text-red-500">Failed to load results</p>';
  }
}

// Render election results in the modal
function renderElectionResultsModal(data) {
  const resultsContent = document.getElementById('election-results-content');
  const eligibleVoters = currentElection.eligibleVoters || 0;
  // Use totalVotes (non-RCV) or totalVoters (RCV) - both represent unique voters who cast ballots
  const totalVotes = data.totalVotes ?? data.totalVoters ?? 0;
  const turnout = eligibleVoters > 0 ? Math.round((totalVotes / eligibleVoters) * 100) : 0;
  const isComplete = totalVotes >= eligibleVoters && eligibleVoters > 0;

  const methodLabels = {
    'plurality': 'Plurality (most votes wins)',
    'majority': 'Majority (>50% required)',
    'ranked': 'Ranked Choice (IRV)'
  };

  // Determine max votes for scaling progress bars
  const maxVotes = data.results?.length > 0
    ? Math.max(...data.results.map(r => r.voteCount || 0))
    : 0;

  // Build results HTML
  let html = `
    <div class="bg-gray-50 rounded-lg p-4 mb-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div class="text-center">
          <div class="text-2xl font-bold text-legend-blue">${totalVotes}</div>
          <div class="text-gray-500">Votes Cast</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-600">${eligibleVoters}</div>
          <div class="text-gray-500">Eligible Voters</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold ${isComplete ? 'text-green-600' : 'text-amber-600'}">${turnout}%</div>
          <div class="text-gray-500">Turnout</div>
        </div>
        <div class="text-center">
          <div class="text-xs text-gray-500 mb-1">Method</div>
          <div class="text-sm font-medium">${methodLabels[currentElection.method] || currentElection.method || 'Unknown'}</div>
        </div>
      </div>
    </div>
  `;

  // Winner/leader display - support multiple winners for multi-seat elections
  // Build a set of winner delegateIds for multi-seat support
  const winnerIds = new Set((data.winners || []).map(w => w.delegateId));

  // Only show winners if there's no unresolved tie
  if (!data.hasTie && data.winners && data.winners.length > 0) {
    const seatCount = data.seatCount || 1;
    const winnerLabel = seatCount > 1 ? `Winners (${data.winners.length} of ${seatCount} seats)` : 'Winner';
    html += `
      <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div class="flex items-center gap-2 text-green-800 mb-2">
          <span class="text-green-600 text-lg">🏆</span>
          <span class="font-semibold">${winnerLabel}</span>
        </div>
        ${data.winners.map(w => {
          const winnerName = `${w.delegate?.firstName || ''} ${w.delegate?.lastName || ''}`.trim();
          return `
            <div class="flex items-center gap-2 ml-6 text-green-700">
              <span class="font-medium">${escapeHtml(winnerName)}</span>
              <span>(${w.voteCount} votes, ${w.percentage?.toFixed(1) || 0}%)</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (!data.hasTie && data.winner) {
    // Backwards compatibility for single winner
    const winnerName = `${data.winner.delegate?.firstName || ''} ${data.winner.delegate?.lastName || ''}`.trim();
    html += `
      <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-green-600 text-lg">🏆</span>
          <span class="font-semibold text-green-800">Winner: ${escapeHtml(winnerName)}</span>
          <span class="text-green-700">(${data.winner.voteCount} votes, ${data.winner.percentage?.toFixed(1) || 0}%)</span>
        </div>
      </div>
    `;
  }

  // Show "Advance Winners" button for completed primaries with winners
  const hasWinners = (data.winners && data.winners.length > 0) || data.winner;
  const isCompletedPrimary = currentElection.status === 'completed' &&
    currentElection.electionType === 'primary' &&
    !data.hasTie;
  if (isCompletedPrimary && hasWinners) {
    // Get the advancement model from the party
    const advancementModel = currentElection.party?.party?.advancementModel || 'traditional';
    const advancementLabels = {
      'traditional': 'Traditional (winner advances)',
      'top_2': 'Top 2 (top 2 advance)',
      'top_4_irv': 'Top 4 IRV (top 4 advance to RCV general)',
    };
    html += `
      <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-purple-600 text-lg">🚀</span>
            <div>
              <span class="font-semibold text-purple-800">Ready to Advance</span>
              <span class="text-purple-600 text-sm ml-2">(${advancementLabels[advancementModel] || advancementModel})</span>
            </div>
          </div>
          <button id="advance-winners-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-4 rounded-lg shadow transition text-sm">
            Advance to General
          </button>
        </div>
        <p class="text-sm text-purple-700 mt-2">Advance winning candidates from this primary to the general election.</p>
      </div>
    `;
  }

  if (data.requiresRunoff && currentElection.method === 'majority' && !['runoff', 'primary_runoff'].includes(currentElection.electionType)) {
    // Show runoff needed warning with action button for majority elections
    html += `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-amber-600 text-lg">⚠️</span>
            <span class="font-semibold text-amber-800">No majority winner - runoff needed</span>
          </div>
          <button id="results-runoff-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-4 rounded-lg shadow transition text-sm">
            Create Runoff
          </button>
        </div>
        <p class="text-sm text-amber-700 mt-2">No candidate achieved &gt;50% of votes. A runoff election between the top 2 candidates is needed.</p>
      </div>
    `;
  } else if (data.requiresRunoff) {
    // Generic runoff needed message (for RCV ties etc)
    html += `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
        <div class="flex items-center gap-2">
          <span class="text-amber-600 text-lg">⚠️</span>
          <span class="font-semibold text-amber-800">No winner determined - special action needed</span>
        </div>
      </div>
    `;
  }

  // Tie warning for plurality elections
  if (data.hasTie && data.tiedCandidates && data.tiedCandidates.length > 0) {
    const seatsToResolve = data.seatsToResolve || 1;
    const clearWinners = data.clearWinners || [];

    // Show clear winners first if any
    let clearWinnersHtml = '';
    if (clearWinners.length > 0) {
      clearWinnersHtml = `
        <div class="mb-3 p-3 bg-green-50 border border-green-200 rounded">
          <p class="text-sm font-medium text-green-800 mb-2">✓ Clear Winners (${clearWinners.length} of ${data.seatCount} seats filled):</p>
          ${clearWinners.map(w => `
            <p class="text-sm text-green-700 ml-4">• ${escapeHtml((w.delegate?.firstName || '') + ' ' + (w.delegate?.lastName || ''))} (${w.voteCount} votes)</p>
          `).join('')}
        </div>
      `;
    }

    html += `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-yellow-600 text-lg">⚖️</span>
          <span class="font-semibold text-yellow-800">Tie Detected - Admin Resolution Required</span>
        </div>
        ${clearWinnersHtml}
        <p class="text-sm text-yellow-700 mb-3">
          ${data.tiedCandidates.length} candidates are tied with ${data.tiedCandidates[0]?.voteCount || 0} votes each.
          Select ${seatsToResolve} winner${seatsToResolve !== 1 ? 's' : ''} to fill the remaining seat${seatsToResolve !== 1 ? 's' : ''}.
        </p>
        <div class="space-y-2 mb-3" id="tie-candidates-list">
          ${data.tiedCandidates.map(c => `
            <label class="flex items-center gap-2 p-2 bg-white rounded border border-yellow-200 cursor-pointer hover:bg-yellow-100">
              <input type="checkbox" name="tie-winner" value="${c.delegateId}" class="tie-winner-checkbox rounded border-gray-300 text-legend-blue focus:ring-legend-blue">
              <span class="font-medium">${escapeHtml((c.delegate?.firstName || '') + ' ' + (c.delegate?.lastName || ''))}</span>
              <span class="text-gray-500">(${c.voteCount} votes, ${c.percentage?.toFixed(1) || 0}%)</span>
            </label>
          `).join('')}
        </div>
        <div class="flex items-center justify-between">
          <span id="tie-selection-count" class="text-sm text-yellow-700">Select ${seatsToResolve} candidate${seatsToResolve !== 1 ? 's' : ''}</span>
          <button id="resolve-tie-btn" class="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-1.5 px-4 rounded-lg shadow transition text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled data-seats-to-resolve="${seatsToResolve}">
            Resolve Tie
          </button>
        </div>
      </div>
    `;
  } else if (data.tieResolution) {
    // Show that a tie was resolved
    html += `
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-blue-600 text-lg">✓</span>
            <span class="font-medium text-blue-800">Tie resolved by admin (${data.tieResolution.method || 'manual choice'})</span>
          </div>
          <button id="clear-tie-resolution-btn" class="text-blue-600 hover:text-blue-800 text-sm underline">
            Clear Resolution
          </button>
        </div>
      </div>
    `;
  }

  // Candidate results
  const isRCV = currentElection.method === 'ranked';

  if (data.results && data.results.length > 0) {
    // For RCV, build a map of eliminated candidates with their elimination info
    const eliminatedInfo = new Map(); // delegateId -> { round, percentage }
    if (isRCV && data.rounds) {
      data.rounds.forEach((round, roundIndex) => {
        if (round.eliminated) {
          round.eliminated.forEach(elim => {
            // Find this candidate's vote count in this round's results
            const candidateInRound = round.results?.find(r => r.delegateId === elim.delegateId);
            const elimPercentage = candidateInRound?.percentage || 0;
            eliminatedInfo.set(elim.delegateId, {
              round: roundIndex + 1,
              percentage: elimPercentage,
              voteCount: candidateInRound?.voteCount || 0,
            });
          });
        }
      });
    }

    // For RCV, we need to show ALL candidates including eliminated ones
    // Combine current results with eliminated candidates
    let allCandidates = [...data.results];
    if (isRCV && eliminatedInfo.size > 0) {
      // Add eliminated candidates that aren't in the final results
      eliminatedInfo.forEach((info, delegateId) => {
        if (!allCandidates.find(c => c.delegateId === delegateId)) {
          // Find delegate info from rounds
          let delegateInfo = null;
          for (const round of data.rounds || []) {
            const found = round.results?.find(r => r.delegateId === delegateId);
            if (found) {
              delegateInfo = found;
              break;
            }
          }
          if (delegateInfo) {
            allCandidates.push({
              ...delegateInfo,
              voteCount: info.voteCount,
              isEliminated: true,
              eliminationRound: info.round,
              eliminationPercentage: info.percentage,
            });
          }
        }
      });

      // Mark eliminated candidates in the results
      allCandidates = allCandidates.map(c => {
        const elimInfo = eliminatedInfo.get(c.delegateId);
        if (elimInfo) {
          return {
            ...c,
            isEliminated: true,
            eliminationRound: elimInfo.round,
            eliminationPercentage: elimInfo.percentage,
          };
        }
        return c;
      });

      // Sort: winners first, then by final vote count, eliminated last (by round desc)
      allCandidates.sort((a, b) => {
        const aIsWinner = winnerIds.has(a.delegateId);
        const bIsWinner = winnerIds.has(b.delegateId);
        if (aIsWinner && !bIsWinner) return -1;
        if (bIsWinner && !aIsWinner) return 1;
        if (a.isEliminated && !b.isEliminated) return 1;
        if (!a.isEliminated && b.isEliminated) return -1;
        if (a.isEliminated && b.isEliminated) {
          return b.eliminationRound - a.eliminationRound; // Later elimination first
        }
        return b.voteCount - a.voteCount;
      });
    }

    // Add RCV explanation note
    if (isRCV) {
      html += `
        <div class="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 text-sm">
          <div class="flex items-center gap-2 text-purple-800 font-semibold mb-1">
            <span>🗳️</span> Instant Runoff Results
          </div>
          <p class="text-purple-700">
            Candidates are eliminated one by one until a winner achieves majority.
            Eliminated candidates show their vote share at the time of elimination.
          </p>
        </div>
      `;
    }

    html += '<div class="space-y-2">';
    allCandidates.forEach((r, index) => {
      const name = `${r.delegate?.firstName || ''} ${r.delegate?.lastName || ''}`.trim();
      const partyName = r.party?.party?.name || r.party?.name || '';
      const percentage = totalVotes > 0 ? ((r.voteCount / totalVotes) * 100).toFixed(1) : 0;
      const barWidth = maxVotes > 0 ? Math.round((r.voteCount / maxVotes) * 100) : 0;
      const isLeader = index === 0 && r.voteCount > 0 && !r.isEliminated;
      const isWinner = winnerIds.has(r.delegateId);
      const isEliminated = r.isEliminated;

      // Determine styling based on status
      let cardClass = 'bg-white border-gray-200';
      let nameClass = '';
      let barClass = 'bg-legend-blue';
      let icon = '';
      let statusBadge = '';

      if (isWinner) {
        cardClass = 'bg-green-50 border-green-200';
        nameClass = 'text-green-800';
        barClass = 'bg-green-500';
        icon = '<span class="text-green-600">🏆</span>';
      } else if (isEliminated) {
        cardClass = 'bg-gray-50 border-gray-200 opacity-75';
        nameClass = 'text-gray-600';
        barClass = 'bg-gray-400';
        statusBadge = `<span class="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded ml-2">Eliminated with ${r.eliminationPercentage?.toFixed(1) || 0}%</span>`;
      } else if (isLeader) {
        icon = '<span class="text-legend-blue">📊</span>';
      }

      html += `
        <div class="p-3 rounded-lg border ${cardClass}">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2 flex-wrap">
              ${icon}
              <span class="font-medium ${nameClass}">${escapeHtml(name)}</span>
              ${partyName ? `<span class="text-sm text-gray-500">(${escapeHtml(partyName)})</span>` : ''}
              ${statusBadge}
            </div>
            <div class="text-right">
              <span class="font-semibold ${isEliminated ? 'text-gray-500' : ''}">${r.voteCount}</span>
              <span class="text-gray-500 text-sm ml-1">(${percentage}%)</span>
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="result-bar h-2 rounded-full transition-all ${barClass}" data-width="${barWidth}"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  } else {
    html += '<p class="text-gray-500 italic">No votes recorded yet.</p>';
  }

  resultsContent.innerHTML = html;

  // Apply bar widths via JavaScript to avoid CSP issues
  resultsContent.querySelectorAll('.result-bar').forEach(bar => {
    const width = bar.getAttribute('data-width');
    if (width) {
      bar.style.width = width + '%';
    }
  });

  // Attach runoff button handler if present
  const resultsRunoffBtn = resultsContent.querySelector('#results-runoff-btn');
  if (resultsRunoffBtn) {
    resultsRunoffBtn.addEventListener('click', createRunoff);
  }

  // Attach advance winners button handler if present
  const advanceWinnersBtn = resultsContent.querySelector('#advance-winners-btn');
  if (advanceWinnersBtn) {
    advanceWinnersBtn.addEventListener('click', advanceWinners);
  }

  // Attach tie resolution handlers if present
  const tieCheckboxes = resultsContent.querySelectorAll('.tie-winner-checkbox');
  const resolveTieBtn = resultsContent.querySelector('#resolve-tie-btn');
  const selectionCountEl = resultsContent.querySelector('#tie-selection-count');

  if (tieCheckboxes.length > 0 && resolveTieBtn) {
    // Use seatsToResolve from button data attribute (number of seats that need tie resolution)
    const seatsToResolve = parseInt(resolveTieBtn.dataset.seatsToResolve) || 1;

    // Update selection count and button state when checkboxes change
    tieCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const selected = resultsContent.querySelectorAll('.tie-winner-checkbox:checked').length;
        if (selectionCountEl) {
          selectionCountEl.textContent = `${selected} of ${seatsToResolve} selected`;
        }
        resolveTieBtn.disabled = selected !== seatsToResolve;
      });
    });

    resolveTieBtn.addEventListener('click', resolveTie);
  }

  // Attach clear tie resolution handler if present
  const clearTieBtn = resultsContent.querySelector('#clear-tie-resolution-btn');
  if (clearTieBtn) {
    clearTieBtn.addEventListener('click', clearTieResolution);
  }
}

function closeElectionModal() {
  document.getElementById('election-modal').classList.add('hidden');
  currentElection = null;
}

// ============================================================
// ADD CANDIDATE MODAL
// ============================================================

async function openAddCandidateModal() {
  if (!currentElection) return;

  const modal = document.getElementById('add-candidate-modal');
  const delegatesList = document.getElementById('eligible-delegates-list');
  const searchInput = document.getElementById('candidate-search');
  const primaryInfoSection = document.getElementById('primary-info-section');

  searchInput.value = '';

  // For primary elections, show which party this is for
  const isPrimary = currentElection.electionType === 'primary';
  const partyName = currentElection.party?.party?.name || '';

  if (isPrimary && partyName) {
    primaryInfoSection.innerHTML = `<p class="text-sm text-gray-600">Adding candidates for the <strong>${escapeHtml(partyName)} Primary</strong>. Only delegates from this party are eligible.</p>`;
    primaryInfoSection.classList.remove('hidden');
  } else {
    primaryInfoSection.classList.add('hidden');
  }

  delegatesList.innerHTML = '<p class="text-gray-500 italic p-4">Loading eligible delegates...</p>';
  modal.classList.remove('hidden');

  // Load eligible delegates
  await loadEligibleDelegates();

  // Set up search handler
  searchInput.oninput = () => {
    const search = searchInput.value.toLowerCase();
    const items = delegatesList.querySelectorAll('[data-delegate-id]');
    items.forEach(item => {
      const name = item.getAttribute('data-name')?.toLowerCase() || '';
      item.style.display = name.includes(search) ? '' : 'none';
    });
    // Update selection count to reflect visible items
    updateSelectionCount();
  };
}

// Load eligible delegates for the current election
async function loadEligibleDelegates() {
  const delegatesList = document.getElementById('eligible-delegates-list');
  delegatesList.innerHTML = '<p class="text-gray-500 italic p-4">Loading eligible delegates...</p>';

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const url = `${apiBase}/elections/${currentElection.id}/eligible-delegates`;

    const response = await fetch(url, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to load delegates');
    }

    const delegates = await response.json();
    renderEligibleDelegates(delegates);

  } catch (err) {
    console.error('Error loading delegates:', err);
    delegatesList.innerHTML = `<p class="text-red-500 p-4">${escapeHtml(err.message)}</p>`;
  }
}

function renderEligibleDelegates(delegates) {
  const delegatesList = document.getElementById('eligible-delegates-list');
  const selectAllRow = document.getElementById('select-all-row');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  const nominateSelectedBtn = document.getElementById('nominate-selected-btn');

  // Filter to only eligible (not already candidates)
  const eligibleDelegates = delegates.filter(d => !d.isCandidate);

  if (delegates.length === 0) {
    delegatesList.innerHTML = '<p class="text-gray-500 italic p-4">No eligible delegates found</p>';
    selectAllRow.classList.add('hidden');
    nominateSelectedBtn.classList.add('hidden');
    return;
  }

  // Show select all row and nominate button if there are eligible delegates
  if (eligibleDelegates.length > 0) {
    selectAllRow.classList.remove('hidden');
    nominateSelectedBtn.classList.remove('hidden');
    selectAllCheckbox.checked = false;
  } else {
    selectAllRow.classList.add('hidden');
    nominateSelectedBtn.classList.add('hidden');
  }

  // For primary elections, delegates are already filtered by party on the backend
  // For general elections, show all delegates with their party
  const isPrimary = currentElection?.electionType === 'primary';

  delegatesList.innerHTML = delegates.map(d => {
    const name = `${d.firstName} ${d.lastName}`;
    const partyName = d.party?.party?.name || 'No Party';
    const isCandidate = d.isCandidate;
    const nominatedFor = d.nominatedFor || 'another position';

    return `
      <div class="flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 ${isCandidate ? 'opacity-50 bg-gray-50' : ''}" data-delegate-id="${d.id}" data-name="${escapeHtml(name)}">
        ${isCandidate ? `
          <div class="w-4 h-4 mr-3"></div>
        ` : `
          <input type="checkbox" class="delegate-checkbox w-4 h-4 mr-3 text-legend-blue focus:ring-2 focus:ring-legend-blue rounded cursor-pointer" data-id="${d.id}">
        `}
        <div class="flex-1">
          <span class="font-medium">${escapeHtml(name)}</span>
          ${!isPrimary ? `<span class="text-sm text-gray-500 ml-2">(${escapeHtml(partyName)})</span>` : ''}
          ${isCandidate ? `<span class="text-xs text-gray-400 ml-2">Nominated for ${escapeHtml(nominatedFor)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Update selection count
  updateSelectionCount();

  // Attach checkbox change handlers
  delegatesList.querySelectorAll('.delegate-checkbox').forEach(cb => {
    cb.addEventListener('change', updateSelectionCount);
  });

  // Select all handler
  selectAllCheckbox.onchange = () => {
    const checkboxes = delegatesList.querySelectorAll('.delegate-checkbox:not([style*="display: none"])');
    checkboxes.forEach(cb => {
      // Only select visible checkboxes (respects search filter)
      const row = cb.closest('[data-delegate-id]');
      if (row && row.style.display !== 'none') {
        cb.checked = selectAllCheckbox.checked;
      }
    });
    updateSelectionCount();
  };
}

function updateSelectionCount() {
  const delegatesList = document.getElementById('eligible-delegates-list');
  const selectionCountEl = document.getElementById('selection-count');
  const nominateSelectedBtn = document.getElementById('nominate-selected-btn');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');

  const allCheckboxes = delegatesList.querySelectorAll('.delegate-checkbox');
  const checkedCheckboxes = delegatesList.querySelectorAll('.delegate-checkbox:checked');
  const count = checkedCheckboxes.length;

  selectionCountEl.textContent = `${count} selected`;
  nominateSelectedBtn.textContent = `Nominate Selected (${count})`;
  nominateSelectedBtn.disabled = count === 0;

  // Update select all checkbox state
  if (allCheckboxes.length > 0) {
    selectAllCheckbox.checked = checkedCheckboxes.length === allCheckboxes.length;
    selectAllCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
  }
}

async function nominateSelectedCandidates() {
  if (!currentElection) return;

  const delegatesList = document.getElementById('eligible-delegates-list');
  const checkedCheckboxes = delegatesList.querySelectorAll('.delegate-checkbox:checked');
  const delegateIds = Array.from(checkedCheckboxes).map(cb => parseInt(cb.dataset.id));

  if (delegateIds.length === 0) {
    showError('Please select at least one delegate to nominate');
    return;
  }

  const nominateBtn = document.getElementById('nominate-selected-btn');
  const originalText = nominateBtn.textContent;
  nominateBtn.disabled = true;
  nominateBtn.textContent = 'Nominating...';

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    // Nominate each delegate sequentially
    for (const delegateId of delegateIds) {
      try {
        const response = await fetch(`${apiBase}/elections/${currentElection.id}/candidates`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ delegateId }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          errors.push(error.error || 'Failed to nominate');
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        errors.push(err.message);
        errorCount++;
      }
    }

    // Show result
    if (errorCount === 0) {
      showSuccess(`Successfully nominated ${successCount} candidate${successCount !== 1 ? 's' : ''}`);
    } else if (successCount > 0) {
      showSuccess(`Nominated ${successCount} candidate${successCount !== 1 ? 's' : ''}. ${errorCount} failed.`);
    } else {
      showError(`Failed to nominate candidates: ${errors[0]}`);
    }

    // Refresh data
    await loadCandidates();
    await loadElections();
    if (currentElection) {
      currentElection = elections.find(e => e.id === currentElection.id);
    }

    // Close the modal after successful nomination
    if (successCount > 0) {
      closeAddCandidateModal();
    }

  } catch (err) {
    showError(err.message || 'Failed to nominate candidates');
    console.error('Error nominating candidates:', err);
  } finally {
    nominateBtn.disabled = false;
    nominateBtn.textContent = originalText;
    updateSelectionCount();
  }
}

function closeAddCandidateModal() {
  document.getElementById('add-candidate-modal').classList.add('hidden');
}

// ============================================================
// CANDIDATE REQUIREMENTS MODAL
// ============================================================

function openCandidateModal(candidate) {
  currentCandidate = candidate;
  const modal = document.getElementById('candidate-modal');
  const title = document.getElementById('candidate-modal-title');
  const info = document.getElementById('candidate-info');
  const position = currentElection?.position?.position;

  const delegateName = `${candidate.delegate?.firstName || ''} ${candidate.delegate?.lastName || ''}`.trim();
  title.textContent = `${delegateName} - Requirements`;

  info.innerHTML = `
    <p class="text-sm text-gray-600">
      Party: <strong>${escapeHtml(candidate.party?.party?.name || 'None')}</strong>
    </p>
  `;

  // Show/hide requirement fields based on position config
  const declarationReq = document.getElementById('declaration-requirement');
  const petitionReq = document.getElementById('petition-requirement');
  const requiredSigs = document.getElementById('required-signatures');

  declarationReq.classList.toggle('hidden', !position?.requiresDeclaration);
  petitionReq.classList.toggle('hidden', !position?.requiresPetition);

  if (position?.requiresPetition) {
    requiredSigs.textContent = `(${position.petitionSignatures || 0} required)`;
  }

  // Populate current values
  document.getElementById('declaration-checkbox').checked = candidate.declarationReceived || false;
  document.getElementById('petition-checkbox').checked = candidate.petitionVerified || false;
  document.getElementById('petition-signatures-input').value = candidate.petitionSignatureCount || '';
  document.getElementById('withdrawn-checkbox').checked = candidate.status === 'withdrawn';

  // Update computed status badge
  updateCandidateStatusBadge();

  // Update date displays
  const declarationDate = document.getElementById('declaration-date');
  const petitionDate = document.getElementById('petition-date');
  if (candidate.declarationReceivedAt) {
    declarationDate.textContent = `Received: ${new Date(candidate.declarationReceivedAt).toLocaleDateString()}`;
  } else {
    declarationDate.textContent = '';
  }
  if (candidate.petitionVerifiedAt) {
    petitionDate.textContent = `Verified: ${new Date(candidate.petitionVerifiedAt).toLocaleDateString()}`;
  } else {
    petitionDate.textContent = '';
  }

  modal.classList.remove('hidden');
}

// Update the computed status badge based on current checkbox values
function updateCandidateStatusBadge() {
  const position = currentElection?.position?.position;
  const badge = document.getElementById('candidate-status-badge');
  const hint = document.getElementById('status-hint');
  const withdrawn = document.getElementById('withdrawn-checkbox').checked;

  if (withdrawn) {
    badge.textContent = 'Withdrawn';
    badge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700';
    hint.textContent = '';
    return;
  }

  // Check requirements
  const requiresDeclaration = position?.requiresDeclaration || false;
  const requiresPetition = position?.requiresPetition || false;
  const declarationReceived = document.getElementById('declaration-checkbox').checked;
  const petitionVerified = document.getElementById('petition-checkbox').checked;

  const declarationMet = !requiresDeclaration || declarationReceived;
  const petitionMet = !requiresPetition || petitionVerified;

  if (declarationMet && petitionMet) {
    badge.textContent = 'Qualified';
    badge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800';
    hint.textContent = 'All requirements met';
  } else {
    badge.textContent = 'Nominated';
    badge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800';
    // Build hint about missing requirements
    const missing = [];
    if (requiresDeclaration && !declarationReceived) missing.push('declaration');
    if (requiresPetition && !petitionVerified) missing.push('petition');
    hint.textContent = missing.length > 0 ? `Missing: ${missing.join(', ')}` : '';
  }
}

async function saveCandidate() {
  if (!currentElection || !currentCandidate) return;

  const declarationReceived = document.getElementById('declaration-checkbox').checked;
  const petitionVerified = document.getElementById('petition-checkbox').checked;
  const petitionSignatureCount = parseInt(document.getElementById('petition-signatures-input').value) || null;
  const withdrawn = document.getElementById('withdrawn-checkbox').checked;

  // Status is computed automatically by the backend based on requirements
  // Only send 'withdrawn' if explicitly checked
  const status = withdrawn ? 'withdrawn' : undefined;

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const response = await fetch(`${apiBase}/elections/${currentElection.id}/candidates/${currentCandidate.id}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        declarationReceived,
        petitionVerified,
        petitionSignatureCount,
        status,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to update candidate');
    }

    showSuccess('Candidate updated successfully');
    closeCandidateModal();
    await loadCandidates();

  } catch (err) {
    showError(err.message || 'Failed to update candidate');
    console.error('Error updating candidate:', err);
  }
}

function closeCandidateModal() {
  document.getElementById('candidate-modal').classList.add('hidden');
  currentCandidate = null;
}

// ============================================================
// ELECTION ACTIONS
// ============================================================

async function closeNominations() {
  if (!currentElection) return;

  const position = currentElection.position?.position;
  const seatCount = position?.seatCount || 1;
  // Get candidate count - check detailed data first, then fall back to original election's _count
  const originalElection = elections.find(e => e.id === currentElection.id);
  const candidateCount = currentElection.candidates?.length
    || currentElection._count?.candidates
    || originalElection?._count?.candidates
    || 0;
  const needsMoreCandidates = candidateCount < seatCount + 1;

  let message = 'Are you sure you want to close nominations? No more candidates can be added after this.';
  if (needsMoreCandidates) {
    if (candidateCount === 0) {
      message = `Warning: This election has no candidates. You will need at least ${seatCount} candidate${seatCount > 1 ? 's' : ''} to fill the seat${seatCount > 1 ? 's' : ''}. Do you want to close nominations anyway?`;
    } else if (candidateCount <= seatCount) {
      message = `Warning: This election has ${candidateCount} candidate${candidateCount !== 1 ? 's' : ''} for ${seatCount} seat${seatCount > 1 ? 's' : ''}. The race will be uncontested. Do you want to close nominations anyway?`;
    }
  }

  showConfirmation(
    'Close Nominations',
    message,
    'Close Nominations',
    async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/elections/${currentElection.id}`, {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({ status: 'scheduled' }),
        });

        if (!response.ok) {
          throw new Error('Failed to close nominations');
        }

        showSuccess('Nominations closed. Election is now scheduled.');
        closeElectionModal();
        await loadElections();

      } catch (err) {
        showError(err.message || 'Failed to close nominations');
      }
    },
    'warning'
  );
}

// Close all nominations (batch operation)
async function closeAllNominations() {
  if (!currentProgramYearId) {
    showError('Please select a program year');
    return;
  }

  // Count elections with open nominations
  const nominationElections = elections.filter(e => e.status === 'nomination');
  const nominationCount = nominationElections.length;
  if (nominationCount === 0) {
    showError('No elections with open nominations');
    return;
  }

  // Check for elections with insufficient candidates
  const insufficientCandidates = nominationElections.filter(e => {
    const seatCount = e.position?.position?.seatCount || 1;
    const candidateCount = e._count?.candidates || 0;
    return candidateCount < seatCount + 1;
  });

  let message = `Are you sure you want to close nominations for all ${nominationCount} election${nominationCount !== 1 ? 's' : ''}? No more candidates can be added after this.`;

  if (insufficientCandidates.length > 0) {
    const uncontested = insufficientCandidates.filter(e => {
      const seatCount = e.position?.position?.seatCount || 1;
      const candidateCount = e._count?.candidates || 0;
      return candidateCount > 0 && candidateCount <= seatCount;
    }).length;
    const noCandidates = insufficientCandidates.filter(e => (e._count?.candidates || 0) === 0).length;

    let warningParts = [];
    if (noCandidates > 0) {
      warningParts.push(`${noCandidates} with no candidates`);
    }
    if (uncontested > 0) {
      warningParts.push(`${uncontested} uncontested`);
    }

    message = `Warning: ${insufficientCandidates.length} election${insufficientCandidates.length !== 1 ? 's' : ''} may need more candidates (${warningParts.join(', ')}). Do you want to close nominations for all ${nominationCount} election${nominationCount !== 1 ? 's' : ''} anyway?`;
  }

  showConfirmation(
    'Close All Nominations',
    message,
    'Close All',
    async () => {
      const btn = document.getElementById('close-all-nominations-btn');
      btn.disabled = true;
      btn.textContent = 'Closing...';

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/elections/close-nominations`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({}), // Close all nominations for the year
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to close nominations');
        }

        const result = await response.json();
        showSuccess(result.message || `Nominations closed for ${result.closed} election${result.closed !== 1 ? 's' : ''}.`);
        await loadElections();

      } catch (err) {
        showError(err.message || 'Failed to close nominations');
        console.error('Error closing all nominations:', err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Close All Nominations';
      }
    },
    'warning'
  );
}

// Start all elections (batch operation)
async function startAllElections() {
  if (!currentProgramYearId) {
    showError('Please select a program year');
    return;
  }

  // Check if any elections still have open nominations
  const nominationElections = elections.filter(e => e.status === 'nomination');
  if (nominationElections.length > 0) {
    showError(`Cannot start elections: ${nominationElections.length} election${nominationElections.length !== 1 ? 's' : ''} still have open nominations. Close all nominations first.`);
    return;
  }

  // Get scheduled elections
  const scheduledElections = elections.filter(e => e.status === 'scheduled');
  const scheduledCount = scheduledElections.length;
  if (scheduledCount === 0) {
    showError('No scheduled elections to start');
    return;
  }

  // Check for elections with insufficient candidates
  const problemElections = scheduledElections.filter(e => {
    const seatCount = e.position?.position?.seatCount || 1;
    const candidateCount = e._count?.candidates || 0;
    return candidateCount < seatCount;
  });

  const uncontestedElections = scheduledElections.filter(e => {
    const seatCount = e.position?.position?.seatCount || 1;
    const candidateCount = e._count?.candidates || 0;
    return candidateCount > 0 && candidateCount <= seatCount;
  });

  let message = `Start voting for all ${scheduledCount} scheduled election${scheduledCount !== 1 ? 's' : ''}?`;

  // Build warning message
  const noCandidatesCount = problemElections.filter(e => (e._count?.candidates || 0) === 0).length;
  const uncontestedCount = uncontestedElections.length;

  if (noCandidatesCount > 0 || uncontestedCount > 0) {
    let warningParts = [];
    if (noCandidatesCount > 0) {
      warningParts.push(`${noCandidatesCount} with no candidates`);
    }
    if (uncontestedCount > 0) {
      warningParts.push(`${uncontestedCount} uncontested`);
    }
    message = `Warning: ${warningParts.join(', ')}. Start voting for ${scheduledCount} election${scheduledCount !== 1 ? 's' : ''}?`;
  }

  // Show checkbox to convert no-candidate elections to appointed positions
  const checkboxConfig = noCandidatesCount > 0 ? {
    label: `Convert ${noCandidatesCount} election${noCandidatesCount !== 1 ? 's' : ''} with no candidates to appointed positions`,
    checked: true,
  } : null;

  showConfirmation(
    'Start All Elections',
    message,
    'Start All',
    async (skipNoCandidates) => {
      const btn = document.getElementById('start-all-elections-btn');
      btn.disabled = true;
      btn.textContent = 'Starting...';

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/elections/start-all`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ skipNoCandidates: skipNoCandidates || false }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          // Check if this is an incomplete requirements error
          if (error.incompleteRequirements && error.incompleteRequirements.length > 0) {
            showIncompleteRequirementsModal(error.incompleteRequirements);
            return;
          }
          throw new Error(error.error || 'Failed to start elections');
        }

        const result = await response.json();
        let successMsg = `Voting started for ${result.started} election${result.started !== 1 ? 's' : ''}.`;
        if (result.skippedToAppointed > 0) {
          successMsg += ` ${result.skippedToAppointed} converted to appointed (no candidates).`;
        } else if (result.skipped > 0) {
          successMsg += ` ${result.skipped} skipped (no candidates).`;
        }
        showSuccess(successMsg);
        await loadElections();

      } catch (err) {
        showError(err.message || 'Failed to start elections');
        console.error('Error starting all elections:', err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Start All Elections';
      }
    },
    'success',
    checkboxConfig
  );
}

// Close all active elections (end voting)
async function closeAllActiveElections() {
  if (!currentProgramYearId) {
    showError('Please select a program year');
    return;
  }

  // Get active elections
  const activeElections = elections.filter(e => e.status === 'active');
  const activeCount = activeElections.length;

  if (activeCount === 0) {
    showError('No active elections to close');
    return;
  }

  // Show turnout info in confirmation
  const lowTurnout = activeElections.filter(e => {
    const turnout = e.eligibleVoters > 0 ? (e.uniqueVoters || 0) / e.eligibleVoters : 0;
    return turnout < 1;
  });

  let message = `Close voting for all ${activeCount} active election${activeCount !== 1 ? 's' : ''}?`;
  if (lowTurnout.length > 0) {
    message += ` (${lowTurnout.length} with less than 100% turnout)`;
  }

  showConfirmation(
    'Close All Active Elections',
    message,
    'Close All',
    async () => {
      const btn = document.getElementById('close-all-elections-btn');
      btn.disabled = true;
      btn.textContent = 'Closing...';

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/elections/close-all`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to close elections');
        }

        const result = await response.json();
        showSuccess(result.message || `Closed ${result.closed} elections.`);
        await loadElections();

      } catch (err) {
        showError(err.message || 'Failed to close elections');
        console.error('Error closing all elections:', err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Close All Active Elections';
      }
    },
    'danger'
  );
}

async function archiveElection() {
  if (!currentElection) return;

  showConfirmation(
    'Archive Election',
    'Are you sure you want to archive this election? This cannot be undone.',
    'Archive',
    async () => {
      try {
        const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

        const response = await fetch(`${apiBase}/elections/${currentElection.id}`, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to archive election');
        }

        showSuccess('Election archived.');
        closeElectionModal();
        await loadElections();

      } catch (err) {
        showError(err.message || 'Failed to archive election');
      }
    }
  );
}

// Create a runoff election
async function createRunoff() {
  if (!currentElection) return;

  showConfirmation(
    'Create Runoff Election',
    'This will create a new runoff election between the top 2 candidates. The original election will be marked as completed. Continue?',
    'Create Runoff',
    async () => {
      // Clear any previous error in election modal
      const electionModalError = document.getElementById('election-modal-error');
      if (electionModalError) {
        electionModalError.classList.add('hidden');
        electionModalError.textContent = '';
      }

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/elections/${currentElection.id}/runoff`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to create runoff');
        }

        const result = await response.json();

        // Handle business logic rejections (200 with success: false)
        if (result.success === false) {
          throw new Error(result.error || 'Runoff creation was rejected');
        }

        // Success - close election modal and refresh
        showSuccess(result.message || 'Runoff election created successfully!');
        closeElectionModal();
        await loadElections();

      } catch (err) {
        // Show error in the election modal
        if (electionModalError) {
          electionModalError.textContent = err.message || 'Failed to create runoff election';
          electionModalError.classList.remove('hidden');
        } else {
          showError(err.message || 'Failed to create runoff election');
        }
      }
    },
    'success'
  );
}

// Advance winners from primary to general election
async function advanceWinners() {
  if (!currentElection) return;

  const advancementModel = currentElection.party?.party?.advancementModel || 'traditional';
  const advancementDescriptions = {
    'traditional': 'The winner will advance to the general election.',
    'top_2': 'The top 2 vote-getters will advance to the general election.',
    'top_4_irv': 'The top 4 vote-getters will advance to a ranked choice (IRV) general election.',
  };

  showConfirmation(
    'Advance to General Election',
    `${advancementDescriptions[advancementModel] || 'Winners will advance to the general election.'} Continue?`,
    'Advance Winners',
    async () => {
      // Clear any previous error in election modal
      const electionModalError = document.getElementById('election-modal-error');
      if (electionModalError) {
        electionModalError.classList.add('hidden');
        electionModalError.textContent = '';
      }

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/elections/${currentElection.id}/advance`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to advance winners');
        }

        const result = await response.json();

        // Handle business logic rejections (200 with success: false)
        if (result.success === false) {
          throw new Error(result.error || 'Advancement was rejected');
        }

        // Success - close election modal and refresh
        showSuccess(result.message || 'Winners advanced to general election!');
        closeElectionModal();
        await loadElections();

      } catch (err) {
        // Show error in the election modal
        if (electionModalError) {
          electionModalError.textContent = err.message || 'Failed to advance winners';
          electionModalError.classList.remove('hidden');
        } else {
          showError(err.message || 'Failed to advance winners');
        }
      }
    },
    'success'
  );
}

// Resolve a tie by selecting winners
async function resolveTie() {
  if (!currentElection) return;

  const resultsContent = document.getElementById('election-results-content');
  const selectedCheckboxes = resultsContent.querySelectorAll('.tie-winner-checkbox:checked');
  const selectedWinnerIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

  if (selectedWinnerIds.length === 0) {
    showError('Please select at least one winner');
    return;
  }

  // Get seatsToResolve from the button data attribute
  const resolveTieBtn = resultsContent.querySelector('#resolve-tie-btn');
  const seatsToResolve = resolveTieBtn ? parseInt(resolveTieBtn.dataset.seatsToResolve) || 1 : 1;
  if (selectedWinnerIds.length !== seatsToResolve) {
    showError(`Please select exactly ${seatsToResolve} winner${seatsToResolve !== 1 ? 's' : ''} to fill remaining seats`);
    return;
  }

  const electionModalError = document.getElementById('election-modal-error');
  if (electionModalError) {
    electionModalError.classList.add('hidden');
    electionModalError.textContent = '';
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const response = await fetch(`${apiBase}/elections/${currentElection.id}/resolve-tie`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ selectedWinnerIds }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to resolve tie');
    }

    const result = await response.json();
    showSuccess(result.message || 'Tie resolved successfully!');

    // Refresh results to show updated winners
    await loadElectionResults();

    // Refresh elections list to update the card
    await loadElections();

  } catch (err) {
    if (electionModalError) {
      electionModalError.textContent = err.message || 'Failed to resolve tie';
      electionModalError.classList.remove('hidden');
    } else {
      showError(err.message || 'Failed to resolve tie');
    }
  }
}

// Clear a previously set tie resolution
async function clearTieResolution() {
  if (!currentElection) return;

  showConfirmation(
    'Clear Tie Resolution',
    'This will clear the manual tie resolution and return the election to an unresolved tie state. Continue?',
    'Clear Resolution',
    async () => {
      const electionModalError = document.getElementById('election-modal-error');
      if (electionModalError) {
        electionModalError.classList.add('hidden');
        electionModalError.textContent = '';
      }

      try {
        const headers = {
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/elections/${currentElection.id}/resolve-tie`, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to clear tie resolution');
        }

        showSuccess('Tie resolution cleared');

        // Refresh results
        await loadElectionResults();

        // Refresh elections list to update the card
        await loadElections();

      } catch (err) {
        if (electionModalError) {
          electionModalError.textContent = err.message || 'Failed to clear tie resolution';
          electionModalError.classList.remove('hidden');
        } else {
          showError(err.message || 'Failed to clear tie resolution');
        }
      }
    },
    'warning'
  );
}

// Reopen nominations for an election
async function reopenNominations() {
  if (!currentElection) return;

  const hasVotes = (currentElection._count?.votes || 0) > 0;
  let message = 'This will reopen nominations for this election, allowing you to add more candidates.';
  if (hasVotes) {
    message += ' Note: Existing votes will be preserved but may become invalid if candidates are changed.';
  }

  showConfirmation(
    'Reopen Nominations',
    message,
    'Reopen Nominations',
    async () => {
      const electionModalError = document.getElementById('election-modal-error');
      if (electionModalError) {
        electionModalError.classList.add('hidden');
        electionModalError.textContent = '';
      }

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/elections/${currentElection.id}/reopen-nominations`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to reopen nominations');
        }

        const result = await response.json();

        if (result.success === false) {
          throw new Error(result.error || 'Reopening nominations was rejected');
        }

        showSuccess(result.message || 'Nominations reopened successfully');
        closeElectionModal();
        await loadElections();

      } catch (err) {
        if (electionModalError) {
          electionModalError.textContent = err.message || 'Failed to reopen nominations';
          electionModalError.classList.remove('hidden');
        } else {
          showError(err.message || 'Failed to reopen nominations');
        }
      }
    },
    'success'
  );
}

// Skip election and convert position to appointed
async function skipToAppointed() {
  if (!currentElection) return;

  const positionName = currentElection.position?.position?.name || 'this position';
  const groupingName = currentElection.grouping?.name || '';

  showConfirmation(
    'Convert to Appointed Position',
    `This will skip the election for ${positionName} - ${groupingName} and mark it as an appointed position for this year. The position will need to be filled by appointment rather than election. Continue?`,
    'Convert to Appointed',
    async () => {
      const electionModalError = document.getElementById('election-modal-error');
      if (electionModalError) {
        electionModalError.classList.add('hidden');
        electionModalError.textContent = '';
      }

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        };

        const response = await fetch(`${apiBase}/elections/${currentElection.id}/skip-to-appointed`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to convert to appointed');
        }

        const result = await response.json();

        if (result.success === false) {
          throw new Error(result.error || 'Conversion was rejected');
        }

        showSuccess(result.message || 'Position converted to appointed successfully');
        closeElectionModal();
        await loadElections();

      } catch (err) {
        if (electionModalError) {
          electionModalError.textContent = err.message || 'Failed to convert to appointed';
          electionModalError.classList.remove('hidden');
        } else {
          showError(err.message || 'Failed to convert to appointed');
        }
      }
    },
    'warning'
  );
}

// ============================================================
// INCOMPLETE REQUIREMENTS MODAL
// ============================================================

function showIncompleteRequirementsModal(incompleteRequirements) {
  const modal = document.getElementById('incomplete-requirements-modal');
  const listEl = document.getElementById('incomplete-requirements-list');

  // Group by election
  const byElection = new Map();
  for (const item of incompleteRequirements) {
    const key = `${item.position} - ${item.grouping}`;
    if (!byElection.has(key)) {
      byElection.set(key, []);
    }
    byElection.get(key).push(item);
  }

  // Build list HTML
  let html = '';
  for (const [election, candidates] of byElection) {
    html += `
      <div class="mb-4">
        <h4 class="font-semibold text-legend-blue mb-2">${escapeHtml(election)}</h4>
        <ul class="space-y-2">
    `;
    for (const c of candidates) {
      const issues = [];
      if (c.missingDeclaration) {
        issues.push('Declaration of Candidacy not received');
      }
      if (c.missingPetition) {
        const sigInfo = c.petitionSignaturesRequired
          ? ` (requires ${c.petitionSignaturesRequired} signatures)`
          : '';
        issues.push(`Petition not verified${sigInfo}`);
      }
      html += `
        <li class="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div class="font-medium text-gray-800">${escapeHtml(c.candidateName)}</div>
          <ul class="text-sm text-amber-700 mt-1 ml-4 list-disc">
            ${issues.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
          </ul>
        </li>
      `;
    }
    html += `
        </ul>
      </div>
    `;
  }

  listEl.innerHTML = html;
  modal.classList.remove('hidden');
}

function closeIncompleteRequirementsModal() {
  document.getElementById('incomplete-requirements-modal').classList.add('hidden');
}

// ============================================================
// CONFIRMATION MODAL
// ============================================================

// buttonStyle: 'danger' (red), 'warning' (amber), 'primary' (blue), 'success' (green)
// checkboxConfig: { label: string, checked: boolean } - optional checkbox configuration
function showConfirmation(title, message, confirmText, onConfirm, buttonStyle = 'danger', checkboxConfig = null) {
  const modal = document.getElementById('confirmation-modal');
  const titleEl = document.getElementById('confirmation-title');
  const messageEl = document.getElementById('confirmation-message');
  const errorEl = document.getElementById('confirmation-error');
  const confirmBtn = document.getElementById('confirmation-confirm-btn');
  const cancelBtn = document.getElementById('confirmation-cancel-btn');
  const checkboxContainer = document.getElementById('confirmation-checkbox-container');
  const checkbox = document.getElementById('confirmation-checkbox');
  const checkboxLabel = document.getElementById('confirmation-checkbox-label');

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;

  // Clear any previous error
  errorEl.classList.add('hidden');
  errorEl.textContent = '';

  // Handle checkbox configuration
  if (checkboxConfig) {
    checkboxLabel.textContent = checkboxConfig.label;
    checkbox.checked = checkboxConfig.checked || false;
    checkboxContainer.classList.remove('hidden');
  } else {
    checkboxContainer.classList.add('hidden');
    checkbox.checked = false;
  }

  // Remove all color classes first
  confirmBtn.classList.remove(
    'bg-red-600', 'hover:bg-red-700',
    'bg-amber-500', 'hover:bg-amber-600',
    'bg-legend-blue', 'hover:bg-blue-800',
    'bg-green-600', 'hover:bg-green-700'
  );

  // Apply appropriate style
  switch (buttonStyle) {
    case 'warning':
      confirmBtn.classList.add('bg-amber-500', 'hover:bg-amber-600');
      break;
    case 'primary':
      confirmBtn.classList.add('bg-legend-blue', 'hover:bg-blue-800');
      break;
    case 'success':
      confirmBtn.classList.add('bg-green-600', 'hover:bg-green-700');
      break;
    case 'danger':
    default:
      confirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
      break;
  }

  modal.classList.remove('hidden');

  const closeModal = () => {
    modal.classList.add('hidden');
    confirmBtn.removeEventListener('click', confirmHandler);
    cancelBtn.removeEventListener('click', closeModal);
  };

  const confirmHandler = () => {
    const checkboxState = checkboxConfig ? checkbox.checked : null;
    closeModal();
    onConfirm(checkboxState);
  };

  confirmBtn.addEventListener('click', confirmHandler);
  cancelBtn.addEventListener('click', closeModal);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // Year selector
  document.getElementById('year-select').addEventListener('change', async (e) => {
    currentProgramYearId = e.target.value ? parseInt(e.target.value) : null;
    await loadElections();
  });

  // Level selector (preview positions)
  document.getElementById('level-select').addEventListener('change', (e) => {
    loadPositionsAtLevel(e.target.value);
  });

  // Open nominations buttons
  document.getElementById('open-primary-btn').addEventListener('click', () => openNominations('primary'));
  document.getElementById('open-general-btn').addEventListener('click', () => openNominations('general'));

  // Filter dropdowns
  document.getElementById('filter-level').addEventListener('change', renderElections);
  document.getElementById('filter-status').addEventListener('change', renderElections);

  // Status summary chip click handlers
  document.querySelectorAll('.status-chip').forEach(chip => {
    chip.addEventListener('click', onStatusChipClick);
  });

  // Close all nominations button
  document.getElementById('close-all-nominations-btn').addEventListener('click', closeAllNominations);

  // Start all elections button
  document.getElementById('start-all-elections-btn').addEventListener('click', startAllElections);

  // Close all active elections button
  document.getElementById('close-all-elections-btn').addEventListener('click', closeAllActiveElections);

  // Incomplete requirements modal
  document.getElementById('incomplete-requirements-modal-close').addEventListener('click', closeIncompleteRequirementsModal);
  document.getElementById('incomplete-requirements-done-btn').addEventListener('click', closeIncompleteRequirementsModal);
  document.getElementById('incomplete-requirements-modal').addEventListener('click', (e) => {
    if (e.target.id === 'incomplete-requirements-modal') closeIncompleteRequirementsModal();
  });

  // Election modal
  document.getElementById('election-modal-close').addEventListener('click', closeElectionModal);
  document.getElementById('election-modal-done').addEventListener('click', closeElectionModal);
  document.getElementById('election-modal').addEventListener('click', (e) => {
    if (e.target.id === 'election-modal') closeElectionModal();
  });

  // Election actions
  document.getElementById('add-candidate-btn').addEventListener('click', openAddCandidateModal);
  document.getElementById('close-nominations-btn').addEventListener('click', closeNominations);
  document.getElementById('archive-election-btn').addEventListener('click', archiveElection);
  document.getElementById('refresh-results-btn').addEventListener('click', loadElectionResults);
  document.getElementById('reopen-nominations-btn').addEventListener('click', reopenNominations);
  document.getElementById('skip-to-appointed-btn').addEventListener('click', skipToAppointed);

  // Add candidate modal
  document.getElementById('add-candidate-modal-close').addEventListener('click', closeAddCandidateModal);
  document.getElementById('cancel-add-candidate-btn').addEventListener('click', closeAddCandidateModal);
  document.getElementById('nominate-selected-btn').addEventListener('click', nominateSelectedCandidates);
  document.getElementById('add-candidate-modal').addEventListener('click', (e) => {
    if (e.target.id === 'add-candidate-modal') closeAddCandidateModal();
  });

  // Candidate modal
  document.getElementById('candidate-modal-close').addEventListener('click', closeCandidateModal);
  document.getElementById('cancel-candidate-btn').addEventListener('click', closeCandidateModal);
  document.getElementById('save-candidate-btn').addEventListener('click', saveCandidate);
  document.getElementById('candidate-modal').addEventListener('click', (e) => {
    if (e.target.id === 'candidate-modal') closeCandidateModal();
  });

  // Update status badge when checkboxes change
  document.getElementById('declaration-checkbox').addEventListener('change', updateCandidateStatusBadge);
  document.getElementById('petition-checkbox').addEventListener('change', updateCandidateStatusBadge);
  document.getElementById('withdrawn-checkbox').addEventListener('change', updateCandidateStatusBadge);

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
  currentProgramId = getProgramId();

  if (!currentProgramId) {
    showError('No program selected. Please select a program from the dashboard.');
    return;
  }

  // Render program selector
  const username = localStorage.getItem("user") || sessionStorage.getItem("user");
  if (username) {
    try {
      const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
      const response = await fetch(`${apiBase}/user-programs/${encodeURIComponent(username)}`, {
        headers,
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const programs = data.programs || [];
        const program = programs.find(p => (p.programId || p.id) === currentProgramId);
        if (program) {
          renderProgramSelector(currentProgramId, program.programName || program.name);
        }
      }
    } catch (err) {
      console.error('Error fetching program info:', err);
    }
  }

  // Update vote simulation link with programId
  const voteSimLink = document.getElementById('vote-simulation-link');
  if (voteSimLink) {
    voteSimLink.href = `vote-simulation.html?programId=${encodeURIComponent(currentProgramId)}`;
  }

  setupEventListeners();
  await loadProgramYears();

  // Check for electionId URL parameter to auto-open modal (e.g., from vote simulation)
  const params = new URLSearchParams(window.location.search);
  const electionIdParam = params.get('electionId');
  if (electionIdParam) {
    const electionId = parseInt(electionIdParam);
    // Find the election and open the modal
    const election = elections.find(e => e.id === electionId);
    if (election) {
      openElectionModal(electionId);
    }
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    loadElections,
    openNominations,
    closeAllNominations,
    createRunoff,
    showError,
    showSuccess,
    escapeHtml,
  };
}
