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
  if (!groupingTypeId || !currentProgramYearId) {
    document.getElementById('positions-preview').classList.add('hidden');
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
    const positionsList = document.getElementById('positions-list');
    const preview = document.getElementById('positions-preview');

    if (positions.length === 0) {
      positionsList.innerHTML = '<span class="text-gray-500 italic">No elected positions at this level</span>';
    } else {
      positionsList.innerHTML = positions.map(p => {
        const seatBadge = p.seatCount > 1 ? `<span class="text-xs text-gray-500">(${p.seatCount} seats)</span>` : '';
        const openBadge = p.hasOpenElections
          ? '<span class="text-xs text-amber-600">(already open)</span>'
          : '';
        return `<span class="bg-gray-100 px-2 py-1 rounded text-sm">${escapeHtml(p.name)} ${seatBadge} ${openBadge}</span>`;
      }).join('');
    }

    preview.classList.remove('hidden');
  } catch (err) {
    console.error('Error loading positions:', err);
  }
}

// ============================================================
// RENDERING
// ============================================================

// Render elections list
function renderElections() {
  const container = document.getElementById('elections-list');
  const filterLevel = document.getElementById('filter-level').value;
  const filterStatus = document.getElementById('filter-status').value;
  const closeAllBtn = document.getElementById('close-all-nominations-btn');

  let filtered = elections.filter(e => e.status !== 'archived');

  // Show/hide "Close All Nominations" button based on elections in nomination status
  const hasNominationsOpen = elections.some(e => e.status === 'nomination');
  if (closeAllBtn) {
    closeAllBtn.classList.toggle('hidden', !hasNominationsOpen);
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

  // Attach event handlers
  container.querySelectorAll('.election-card').forEach(card => {
    card.addEventListener('click', () => {
      const electionId = parseInt(card.dataset.id);
      openElectionModal(electionId);
    });
  });
}

// Render a single election card
function renderElectionCard(election) {
  const positionName = election.position?.position?.name || 'Unknown Position';
  const groupingName = election.grouping?.name || '';
  const candidateCount = election._count?.candidates || 0;
  const seatCount = election.position?.position?.seatCount || 1;
  const statusBadge = getStatusBadge(election.status);
  const typeBadge = election.electionType === 'primary'
    ? '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">Primary</span>'
    : election.electionType === 'general'
      ? '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">General</span>'
      : '';

  // Show seat count badge for multi-seat positions
  const seatBadge = seatCount > 1
    ? `<span class="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">${seatCount} seats</span>`
    : '';

  // Warning if not enough candidates (need at least seatCount + 1 for a contested race)
  const needsCandidates = election.status === 'nomination' && candidateCount < seatCount + 1;
  const warningBadge = needsCandidates
    ? '<span class="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">Needs candidates</span>'
    : '';

  return `
    <div class="election-card flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-legend-blue transition cursor-pointer" data-id="${election.id}">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <h4 class="font-semibold text-legend-blue">${escapeHtml(positionName)}</h4>
          ${seatBadge}
          ${typeBadge}
          ${statusBadge}
          ${warningBadge}
        </div>
        <p class="text-sm text-gray-600">${escapeHtml(groupingName)} - ${candidateCount} candidate${candidateCount !== 1 ? 's' : ''}</p>
      </div>
      <span class="text-legend-blue">View &rarr;</span>
    </div>
  `;
}

// Get status badge HTML
function getStatusBadge(status) {
  switch (status) {
    case 'nomination':
      return '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Nominations Open</span>';
    case 'scheduled':
      return '<span class="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded">Scheduled</span>';
    case 'active':
      return '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Voting Active</span>';
    case 'completed':
      return '<span class="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">Completed</span>';
    default:
      return `<span class="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">${escapeHtml(status)}</span>`;
  }
}

// ============================================================
// OPEN NOMINATIONS
// ============================================================

async function openNominations() {
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

  const btn = document.getElementById('open-nominations-btn');
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
      body: JSON.stringify({ groupingTypeId: parseInt(groupingTypeId) }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to open nominations');
    }

    const result = await response.json();
    showSuccess(`Created ${result.created} election${result.created !== 1 ? 's' : ''}. Nominations are now open.`);

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
    btn.textContent = 'Open Nominations for Level';
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

  const positionName = currentElection.position?.position?.name || 'Unknown Position';
  const groupingName = currentElection.grouping?.name || '';
  const position = currentElection.position?.position;

  title.textContent = `${positionName} - ${groupingName}`;

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
        <span class="ml-2">${currentElection.electionType === 'primary' ? 'Primary' : 'General'}</span>
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
  const startElectionBtn = document.getElementById('start-election-btn');
  const addCandidateBtn = document.getElementById('add-candidate-btn');

  closeNominationsBtn.classList.toggle('hidden', currentElection.status !== 'nomination');
  startElectionBtn.classList.toggle('hidden', currentElection.status !== 'scheduled');
  addCandidateBtn.classList.toggle('hidden', currentElection.status !== 'nomination');

  // Load candidates
  await loadCandidates();

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
      return '<span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">Nominated</span>';
    case 'qualified':
      return '<span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">Qualified</span>';
    case 'withdrawn':
      return '<span class="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded">Withdrawn</span>';
    case 'advanced':
      return '<span class="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">Advanced</span>';
    case 'elected':
      return '<span class="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded">Elected</span>';
    default:
      return '';
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

  searchInput.value = '';
  delegatesList.innerHTML = '<p class="text-gray-500 italic p-4">Loading eligible delegates...</p>';

  modal.classList.remove('hidden');

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const response = await fetch(`${apiBase}/elections/${currentElection.id}/eligible-delegates`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load delegates');
    }

    const delegates = await response.json();
    renderEligibleDelegates(delegates);

    // Add search handler
    searchInput.oninput = () => {
      const search = searchInput.value.toLowerCase();
      const filtered = delegates.filter(d => {
        const name = `${d.firstName} ${d.lastName}`.toLowerCase();
        return name.includes(search);
      });
      renderEligibleDelegates(filtered);
    };

  } catch (err) {
    console.error('Error loading delegates:', err);
    delegatesList.innerHTML = '<p class="text-red-500 p-4">Failed to load delegates</p>';
  }
}

function renderEligibleDelegates(delegates) {
  const delegatesList = document.getElementById('eligible-delegates-list');

  if (delegates.length === 0) {
    delegatesList.innerHTML = '<p class="text-gray-500 italic p-4">No eligible delegates found</p>';
    return;
  }

  delegatesList.innerHTML = delegates.map(d => {
    const name = `${d.firstName} ${d.lastName}`;
    const partyName = d.party?.party?.name || 'No Party';
    const isCandidate = d.isCandidate;

    return `
      <div class="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 ${isCandidate ? 'opacity-50' : ''}">
        <div>
          <span class="font-medium">${escapeHtml(name)}</span>
          <span class="text-sm text-gray-500 ml-2">(${escapeHtml(partyName)})</span>
          ${isCandidate ? '<span class="text-xs text-gray-400 ml-2">Already nominated</span>' : ''}
        </div>
        ${isCandidate ? '' : `
          <button class="nominate-delegate-btn bg-legend-blue hover:bg-blue-800 text-white text-sm font-semibold py-1 px-3 rounded transition" data-id="${d.id}">
            Nominate
          </button>
        `}
      </div>
    `;
  }).join('');

  // Attach nominate handlers
  delegatesList.querySelectorAll('.nominate-delegate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const delegateId = parseInt(btn.dataset.id);
      await nominateCandidate(delegateId);
    });
  });
}

async function nominateCandidate(delegateId) {
  if (!currentElection) return;

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const response = await fetch(`${apiBase}/elections/${currentElection.id}/candidates`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ delegateId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to nominate candidate');
    }

    showSuccess('Candidate nominated successfully');
    closeAddCandidateModal();
    await loadCandidates();
    await loadElections(); // Refresh counts
    // Update currentElection reference to the refreshed data
    if (currentElection) {
      currentElection = elections.find(e => e.id === currentElection.id);
    }

  } catch (err) {
    showError(err.message || 'Failed to nominate candidate');
    console.error('Error nominating candidate:', err);
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
  document.getElementById('candidate-status-select').value = candidate.status || 'nominated';

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

async function saveCandidate() {
  if (!currentElection || !currentCandidate) return;

  const declarationReceived = document.getElementById('declaration-checkbox').checked;
  const petitionVerified = document.getElementById('petition-checkbox').checked;
  const petitionSignatureCount = parseInt(document.getElementById('petition-signatures-input').value) || null;
  const status = document.getElementById('candidate-status-select').value;

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

async function startElection() {
  if (!currentElection) return;

  showConfirmation(
    'Start Election',
    'Are you sure you want to start the election? Voting will begin immediately.',
    'Start Election',
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
          body: JSON.stringify({
            status: 'active',
            startTime: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start election');
        }

        showSuccess('Election started! Voting is now active.');
        closeElectionModal();
        await loadElections();

      } catch (err) {
        showError(err.message || 'Failed to start election');
      }
    },
    'success'
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

// ============================================================
// CONFIRMATION MODAL
// ============================================================

// buttonStyle: 'danger' (red), 'warning' (amber), 'primary' (blue), 'success' (green)
function showConfirmation(title, message, confirmText, onConfirm, buttonStyle = 'danger') {
  const modal = document.getElementById('confirmation-modal');
  const titleEl = document.getElementById('confirmation-title');
  const messageEl = document.getElementById('confirmation-message');
  const confirmBtn = document.getElementById('confirmation-confirm-btn');
  const cancelBtn = document.getElementById('confirmation-cancel-btn');

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;

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
  // Year selector
  document.getElementById('year-select').addEventListener('change', async (e) => {
    currentProgramYearId = e.target.value ? parseInt(e.target.value) : null;
    await loadElections();
  });

  // Level selector (preview positions)
  document.getElementById('level-select').addEventListener('change', (e) => {
    loadPositionsAtLevel(e.target.value);
  });

  // Open nominations button
  document.getElementById('open-nominations-btn').addEventListener('click', openNominations);

  // Filter dropdowns
  document.getElementById('filter-level').addEventListener('change', renderElections);
  document.getElementById('filter-status').addEventListener('change', renderElections);

  // Close all nominations button
  document.getElementById('close-all-nominations-btn').addEventListener('click', closeAllNominations);

  // Election modal
  document.getElementById('election-modal-close').addEventListener('click', closeElectionModal);
  document.getElementById('election-modal-done').addEventListener('click', closeElectionModal);
  document.getElementById('election-modal').addEventListener('click', (e) => {
    if (e.target.id === 'election-modal') closeElectionModal();
  });

  // Election actions
  document.getElementById('add-candidate-btn').addEventListener('click', openAddCandidateModal);
  document.getElementById('close-nominations-btn').addEventListener('click', closeNominations);
  document.getElementById('start-election-btn').addEventListener('click', startElection);
  document.getElementById('archive-election-btn').addEventListener('click', archiveElection);

  // Add candidate modal
  document.getElementById('add-candidate-modal-close').addEventListener('click', closeAddCandidateModal);
  document.getElementById('cancel-add-candidate-btn').addEventListener('click', closeAddCandidateModal);
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

  setupEventListeners();
  await loadProgramYears();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    loadElections,
    openNominations,
    closeAllNominations,
  };
}
