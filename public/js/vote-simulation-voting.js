/**
 * vote-simulation-voting.js
 * Handles vote simulation engine for the vote simulation page.
 * Depends on: vote-simulation-utils.js, vote-simulation-state.js (via window)
 */

// Uses shared state from window.voteSimState
function getVoteState() {
  return window.voteSimState || {};
}

async function loadProgramYears() {
  const state = getVoteState();
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const res = await fetch(`${window.API_URL}/programs/${state.currentProgramId}/years`, { headers });
    if (!res.ok) throw new Error('Failed to load years');

    const years = await res.json();
    const yearSelect = document.getElementById('year-select');
    yearSelect.innerHTML = '<option value="">Select a year...</option>';

    years.sort((a, b) => b.year - a.year);
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y.id;
      opt.textContent = y.year;
      yearSelect.appendChild(opt);
    });

    // Auto-select most recent year
    if (years.length > 0) {
      yearSelect.value = years[0].id;
      await onYearChange();
    }
  } catch (err) {
    showError('Failed to load program years: ' + err.message);
  }
}

async function onYearChange() {
  const state = getVoteState();
  const yearSelect = document.getElementById('year-select');
  const electionSelect = document.getElementById('election-select');
  const simulationSection = document.getElementById('simulation-section');
  const noActiveWarning = document.getElementById('no-active-warning');
  const electionDetails = document.getElementById('election-details');

  state.currentProgramYearId = yearSelect.value;
  electionSelect.innerHTML = '<option value="">Loading elections...</option>';
  simulationSection.classList.add('hidden');
  noActiveWarning.classList.add('hidden');
  electionDetails.classList.add('hidden');

  if (!state.currentProgramYearId) {
    electionSelect.innerHTML = '<option value="">Select year first...</option>';
    return;
  }

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Fetch primary and advancement models early so we know how to display primaries
    const programRes = await fetch(`${window.API_URL}/programs/${state.currentProgramId}`, { headers });
    if (programRes.ok) {
      const program = await programRes.json();
      state.currentPrimaryModel = program.defaultPrimaryModel || 'closed';
      state.currentAdvancementModel = program.defaultAdvancementModel || 'top_2';
    } else {
      state.currentPrimaryModel = 'closed';
      state.currentAdvancementModel = 'top_2';
    }

    // Get only active elections (voting in progress)
    const res = await fetch(`${window.API_URL}/program-years/${state.currentProgramYearId}/elections?status=active`, { headers });
    if (!res.ok) throw new Error('Failed to load elections');

    const elections = await res.json();
    state.allActiveElections = elections; // Store for combined primary handling
    electionSelect.innerHTML = '<option value="">Select an election...</option>';

    if (elections.length === 0) {
      electionSelect.innerHTML = '<option value="">No active elections</option>';
      noActiveWarning.classList.remove('hidden');
      return;
    }

    // For open/semi-open primaries, combine both parties' primaries into single entries
    // NOTE: Blanket primaries are NOT combined - they are single elections with partyId=null
    const isCombinedPrimary = state.currentPrimaryModel === 'open' || state.currentPrimaryModel === 'semi_open';

    if (isCombinedPrimary) {
      // Group primaries by position+grouping, keep other elections separate
      const primaryGroups = new Map(); // key: "positionId-groupingId", value: array of elections
      const nonPrimaries = [];

      for (const e of elections) {
        if (e.electionType === 'primary' && e.partyId) {
          const key = `${e.positionId || e.position?.id}-${e.groupingId || e.grouping?.id}`;
          if (!primaryGroups.has(key)) {
            primaryGroups.set(key, []);
          }
          primaryGroups.get(key).push(e);
        } else {
          nonPrimaries.push(e);
        }
      }

      // Add combined primary entries
      for (const [key, groupElections] of primaryGroups) {
        const firstElection = groupElections[0];
        const posName = firstElection.position?.position?.name
          || firstElection.position?.name
          || firstElection.positionName
          || 'Unknown Position';
        const groupName = firstElection.grouping?.name
          || firstElection.groupingName
          || 'Unknown Grouping';

        // Get party names and total candidates
        const partyNames = groupElections.map(e => e.party?.party?.name || e.party?.name || 'Unknown').join(' / ');
        const totalCandidates = groupElections.reduce((sum, e) => sum + (e._count?.candidates || 0), 0);

        // Label based on primary model
        const labelPrefix = state.currentPrimaryModel === 'blanket' ? '[Blanket Primary]' : '[Primary]';

        const opt = document.createElement('option');
        // Use comma-separated IDs for combined primaries
        opt.value = groupElections.map(e => e.id).join(',');
        opt.textContent = `${labelPrefix} ${posName} - ${groupName} (${partyNames}, ${totalCandidates} candidates)`;
        opt.dataset.combined = 'true';
        electionSelect.appendChild(opt);
      }

      // Add non-primary elections (general elections, runoffs, etc.)
      for (const e of nonPrimaries) {
        const posName = e.position?.position?.name
          || e.position?.name
          || e.positionName
          || 'Unknown Position';
        const groupName = e.grouping?.name
          || e.groupingName
          || 'Unknown Grouping';

        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${posName} - ${groupName} (${e._count?.candidates || 0} candidates)`;
        electionSelect.appendChild(opt);
      }
    } else {
      // Closed primaries, blanket primaries, jungle primaries, or other models
      elections.forEach(e => {
        const posName = e.position?.position?.name
          || e.position?.name
          || e.positionName
          || 'Unknown Position';
        const groupName = e.grouping?.name
          || e.groupingName
          || 'Unknown Grouping';

        // Determine label based on election type and model
        let label = `${posName} - ${groupName}`;

        if (e.electionType === 'primary') {
          if (e.partyId) {
            // Per-party primary (closed model)
            const partyName = e.party?.party?.name || e.party?.name || 'Unknown Party';
            label = `[${partyName}] ${label}`;
          } else {
            // Blanket primary (partyId=null) - all candidates from all parties
            label = `[Blanket Primary] ${label}`;
          }
        } else if (e.electionType === 'general' && !e.partyId && state.currentPrimaryModel === 'jungle') {
          // Jungle primary (Louisiana style) - general election with all parties
          label = `[Jungle Primary] ${label}`;
        } else if (e.electionType === 'general' && e.partyId) {
          // Party-specific general (rare)
          const partyName = e.party?.party?.name || e.party?.name || 'Unknown Party';
          label = `[General - ${partyName}] ${label}`;
        }

        label += ` (${e._count?.candidates || 0} candidates)`;

        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = label;
        electionSelect.appendChild(opt);
      });
    }
  } catch (err) {
    showError('Failed to load elections: ' + err.message);
  }
}

async function onElectionChange() {
  const electionSelect = document.getElementById('election-select');
  const simulationSection = document.getElementById('simulation-section');
  const electionDetails = document.getElementById('election-details');
  const electionIdValue = electionSelect.value;
  simulationSection.classList.add('hidden');
  electionDetails.classList.add('hidden');

  if (!electionIdValue) return;

  // Check if this is a combined primary (comma-separated IDs)
  const selectedOption = electionSelect.options[electionSelect.selectedIndex];
  const isCombined = selectedOption?.dataset?.combined === 'true' || electionIdValue.includes(',');

  if (isCombined) {
    await loadCombinedPrimaryData(electionIdValue.split(',').map(id => parseInt(id.trim(), 10)));
  } else {
    await loadElectionData(electionIdValue);
  }
}

async function loadElectionData(electionId) {
  const state = getVoteState();
  try {
    showSuccess('Loading election data...');
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Reset combined primary state (this is a single election)
    state.isCombinedPrimary = false;
    state.combinedElections = null;
    state.candidatesByElection = null;

    // Get full election details
    const electionRes = await fetch(`${window.API_URL}/elections/${electionId}`, { headers });
    if (!electionRes.ok) throw new Error('Failed to load election details');
    state.currentElection = await electionRes.json();

    // For primary elections, get the program's primary and advancement models
    if (state.currentElection.electionType === 'primary') {
      const programRes = await fetch(`${window.API_URL}/programs/${state.currentProgramId}`, { headers });
      if (programRes.ok) {
        const program = await programRes.json();
        state.currentPrimaryModel = program.defaultPrimaryModel || 'closed';
        state.currentAdvancementModel = program.defaultAdvancementModel || 'top_2';
      } else {
        state.currentPrimaryModel = 'closed';
        state.currentAdvancementModel = 'top_2';
      }
    } else {
      state.currentPrimaryModel = null;
    }

    // Show election details
    document.getElementById('detail-position').textContent = state.currentElection.position?.position?.name || '-';
    document.getElementById('detail-grouping').textContent = state.currentElection.grouping?.name || '-';

    // Show election type with blanket/jungle primary distinction
    let typeLabel = getElectionTypeLabel(state.currentElection.electionType);
    const method = state.currentElection.method || 'plurality';
    if (state.currentElection.electionType === 'primary' && !state.currentElection.partyId) {
      // Advancement count based on program's advancement model setting
      const advancementCount = state.currentAdvancementModel === 'top_4_irv' ? 4 : 2;
      typeLabel = `Blanket Primary (all parties, top ${advancementCount} advance)`;
    } else if (state.currentElection.electionType === 'primary' && state.currentElection.partyId) {
      const partyName = state.currentElection.party?.party?.name || state.currentElection.party?.name || 'Unknown';
      typeLabel = `Primary (${partyName})`;
    } else if (state.currentElection.electionType === 'general' && !state.currentElection.partyId && state.currentPrimaryModel === 'jungle') {
      typeLabel = 'Jungle Primary (all parties, majority wins)';
    }
    document.getElementById('detail-type').textContent = typeLabel;
    document.getElementById('detail-status').textContent = state.currentElection.status;

    // Show voting method with badge (method already defined above for blanket primary label)
    const methodEl = document.getElementById('detail-method');
    if (methodEl) {
      const methodLabels = {
        'plurality': 'Plurality',
        'majority': 'Majority',
        'ranked': 'Ranked Choice (IRV)'
      };
      methodEl.textContent = methodLabels[method] || method;
      // Add warning for RCV elections
      if (method === 'ranked') {
        methodEl.className = 'font-semibold text-purple-700';
      } else {
        methodEl.className = '';
      }
    }

    // Show/hide RCV notice
    const rcvNotice = document.getElementById('rcv-notice');
    if (rcvNotice) {
      rcvNotice.classList.toggle('hidden', method !== 'ranked');
    }

    document.getElementById('election-details').classList.remove('hidden');

    // Get candidates
    const candidatesRes = await fetch(`${window.API_URL}/elections/${electionId}/candidates`, { headers });
    if (!candidatesRes.ok) throw new Error('Failed to load candidates');
    state.candidates = await candidatesRes.json();
    state.candidates = state.candidates.filter(c => c.status === 'nominated' || c.status === 'qualified');

    // Get eligible voters (delegates in this grouping)
    const votersRes = await fetch(`${window.API_URL}/elections/${electionId}/eligible-delegates`, { headers });
    if (!votersRes.ok) throw new Error('Failed to load eligible voters');
    state.eligibleVoters = await votersRes.json();

    // Get vote stats to determine who has voted
    const resultsRes = await fetch(`${window.API_URL}/elections/${electionId}/voters`, { headers });
    if (resultsRes.ok) {
      const voterData = await resultsRes.json();
      state.votersWhoVoted = voterData.voterIds || [];
    } else {
      state.votersWhoVoted = [];
    }

    // Calculate remaining voters
    const votedSet = new Set(state.votersWhoVoted);
    state.remainingVoters = state.eligibleVoters.filter(v => !votedSet.has(v.id));

    // Update stats
    document.getElementById('stat-candidates').textContent = state.candidates.length;
    document.getElementById('stat-eligible').textContent = state.eligibleVoters.length;
    document.getElementById('stat-voted').textContent = state.votersWhoVoted.length;
    document.getElementById('stat-remaining').textContent = state.remainingVoters.length;

    // Render candidates list
    renderCandidates();

    // Show simulation section
    document.getElementById('simulation-section').classList.remove('hidden');

    // Set default vote count
    document.getElementById('vote-count-input').max = state.remainingVoters.length;
    document.getElementById('vote-count-input').value = Math.min(10, state.remainingVoters.length);

    // Load results if any votes exist
    if (state.votersWhoVoted.length > 0) {
      await loadResults(electionId);
      document.getElementById('results-section').classList.remove('hidden');
    } else {
      document.getElementById('results-section').classList.add('hidden');
    }

    hideMessages();
  } catch (err) {
    showError('Failed to load election data: ' + err.message);
  }
}

/**
 * Load data for combined primary elections (open/semi-open models)
 * This loads multiple elections and combines their data for unified simulation
 * NOTE: Blanket primaries are NOT combined - they're single elections handled by loadElectionData()
 */
async function loadCombinedPrimaryData(electionIds) {
  const state = getVoteState();
  try {
    showSuccess('Loading combined primary data...');
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Load all elections
    const elections = [];
    for (const electionId of electionIds) {
      const electionRes = await fetch(`${window.API_URL}/elections/${electionId}`, { headers });
      if (!electionRes.ok) throw new Error(`Failed to load election ${electionId}`);
      elections.push(await electionRes.json());
    }

    // Store combined elections in state
    state.combinedElections = elections;
    state.currentElection = elections[0]; // Use first for display purposes
    state.isCombinedPrimary = true;

    // Primary and advancement models should already be set from onYearChange
    // but ensure they're set
    if (!state.currentPrimaryModel) {
      const programRes = await fetch(`${window.API_URL}/programs/${state.currentProgramId}`, { headers });
      if (programRes.ok) {
        const program = await programRes.json();
        state.currentPrimaryModel = program.defaultPrimaryModel || 'closed';
        state.currentAdvancementModel = program.defaultAdvancementModel || 'top_2';
      }
    }

    // Show basic election details (party names will be updated after loading candidates)
    const posName = state.currentElection.position?.position?.name || '-';
    const groupName = state.currentElection.grouping?.name || '-';

    document.getElementById('detail-position').textContent = posName;
    document.getElementById('detail-grouping').textContent = groupName;
    document.getElementById('detail-type').textContent = `Primary (loading...)`;
    document.getElementById('detail-status').textContent = 'active';

    // Show voting method
    const method = state.currentElection.method || 'plurality';
    const methodEl = document.getElementById('detail-method');
    if (methodEl) {
      const methodLabels = {
        'plurality': 'Plurality',
        'majority': 'Majority',
        'ranked': 'Ranked Choice (IRV)'
      };
      methodEl.textContent = methodLabels[method] || method;
      if (method === 'ranked') {
        methodEl.className = 'font-semibold text-purple-700';
      } else {
        methodEl.className = '';
      }
    }

    const rcvNotice = document.getElementById('rcv-notice');
    if (rcvNotice) {
      rcvNotice.classList.toggle('hidden', method !== 'ranked');
    }

    document.getElementById('election-details').classList.remove('hidden');

    // Get candidates from all elections, tagged with their election
    state.candidates = [];
    state.candidatesByElection = new Map();

    // Helper to get party name from various sources
    const getPartyNameForElection = (election) => {
      // Try nested ProgramYearParty structure from detail endpoint
      if (election.party?.party?.name) return election.party.party.name;
      // Try flat party structure
      if (election.party?.name) return election.party.name;
      // Try to find in allActiveElections (list endpoint often has full info)
      const listElection = state.allActiveElections?.find(e => e.id === election.id);
      if (listElection?.party?.party?.name) return listElection.party.party.name;
      if (listElection?.party?.name) return listElection.party.name;
      return null; // Will try to get from candidates
    };

    for (const election of elections) {
      const candidatesRes = await fetch(`${window.API_URL}/elections/${election.id}/candidates`, { headers });
      if (!candidatesRes.ok) throw new Error(`Failed to load candidates for election ${election.id}`);
      let candidates = await candidatesRes.json();
      candidates = candidates.filter(c => c.status === 'nominated' || c.status === 'qualified');

      // Try to get party name from election or list
      let partyName = getPartyNameForElection(election);

      // If still not found, try getting from candidates' own party info
      if (!partyName && candidates.length > 0) {
        const firstCandidate = candidates[0];
        partyName = firstCandidate.party?.party?.name || firstCandidate.party?.name;
      }

      // Last resort - use party ID
      if (!partyName) {
        partyName = 'Party ' + election.partyId;
      }

      // Tag each candidate with their election ID and party
      candidates.forEach(c => {
        c._electionId = election.id;
        c._partyId = election.partyId;
        c._partyName = partyName;
      });

      // Also store the party name on the election for later use
      election._resolvedPartyName = partyName;

      state.candidatesByElection.set(election.id, candidates);
      state.candidates.push(...candidates);
    }

    // Now update the party names display with resolved names
    const resolvedPartyNames = elections.map(e => e._resolvedPartyName || 'Unknown').join(' / ');
    const typeLabel = `Combined Primary (${resolvedPartyNames})`;
    document.getElementById('detail-type').textContent = typeLabel;

    // Get eligible voters - for combined primaries, ALL delegates in the grouping are eligible
    // (they'll be randomly assigned to parties during simulation)
    // Must combine eligible voters from ALL elections since each only returns its party's members
    const allEligibleVoters = new Map(); // Use Map to dedupe by voter ID
    for (const election of elections) {
      const votersRes = await fetch(`${window.API_URL}/elections/${election.id}/eligible-delegates`, { headers });
      if (votersRes.ok) {
        const voters = await votersRes.json();
        voters.forEach(v => {
          if (!allEligibleVoters.has(v.id)) {
            allEligibleVoters.set(v.id, v);
          }
        });
      }
    }
    state.eligibleVoters = Array.from(allEligibleVoters.values());

    // Get voters who have voted in ANY of the elections
    const allVoterIds = new Set();
    for (const election of elections) {
      const resultsRes = await fetch(`${window.API_URL}/elections/${election.id}/voters`, { headers });
      if (resultsRes.ok) {
        const voterData = await resultsRes.json();
        (voterData.voterIds || []).forEach(id => allVoterIds.add(id));
      }
    }
    state.votersWhoVoted = Array.from(allVoterIds);

    // Calculate remaining voters
    const votedSet = new Set(state.votersWhoVoted);
    state.remainingVoters = state.eligibleVoters.filter(v => !votedSet.has(v.id));

    // Update stats
    document.getElementById('stat-candidates').textContent = state.candidates.length;
    document.getElementById('stat-eligible').textContent = state.eligibleVoters.length;
    document.getElementById('stat-voted').textContent = state.votersWhoVoted.length;
    document.getElementById('stat-remaining').textContent = state.remainingVoters.length;

    // Render candidates list (grouped by party)
    renderCombinedCandidates();

    // Show simulation section
    document.getElementById('simulation-section').classList.remove('hidden');

    // Set default vote count
    document.getElementById('vote-count-input').max = state.remainingVoters.length;
    document.getElementById('vote-count-input').value = Math.min(10, state.remainingVoters.length);

    // Load results if any votes exist
    if (state.votersWhoVoted.length > 0) {
      // For combined primaries, show results for both parties
      await loadCombinedResults(elections);
      document.getElementById('results-section').classList.remove('hidden');
    } else {
      document.getElementById('results-section').classList.add('hidden');
    }

    hideMessages();
  } catch (err) {
    showError('Failed to load combined primary data: ' + err.message);
  }
}

/**
 * Render candidates for combined primaries, grouped by party
 */
function renderCombinedCandidates() {
  const state = getVoteState();
  const container = document.getElementById('candidates-list');
  const weightInputs = document.getElementById('weight-inputs');
  const singleSelect = document.getElementById('single-candidate-select');

  if (state.candidates.length === 0) {
    container.innerHTML = '<p class="text-gray-500 italic">No candidates in these elections</p>';
    weightInputs.innerHTML = '<p class="text-gray-500 italic">No candidates</p>';
    singleSelect.innerHTML = '<option value="">No candidates</option>';
    return;
  }

  // Group candidates by party for display
  const byParty = new Map();
  for (const c of state.candidates) {
    const partyName = c._partyName || c.party?.party?.name || 'Independent';
    if (!byParty.has(partyName)) {
      byParty.set(partyName, []);
    }
    byParty.get(partyName).push(c);
  }

  // Render candidate cards grouped by party
  let html = '';
  for (const [partyName, candidates] of byParty) {
    const partyColor = partyName.toLowerCase().includes('federalist') ? 'blue' :
                       partyName.toLowerCase().includes('nationalist') ? 'red' : 'gray';
    html += `<div class="mb-4"><h4 class="text-sm font-semibold text-${partyColor}-700 mb-2">${partyName}</h4>`;
    html += `<div class="grid grid-cols-2 gap-2">`;
    for (const c of candidates) {
      html += `
        <div class="bg-${partyColor}-50 border border-${partyColor}-200 rounded-lg p-2">
          <div class="font-semibold text-gray-800 text-sm">${c.delegate?.firstName} ${c.delegate?.lastName}</div>
          <div class="text-xs text-gray-500">ID: ${c.delegate?.id}</div>
        </div>
      `;
    }
    html += `</div></div>`;
  }
  container.innerHTML = html;

  // Weight inputs - for combined primaries, show by party first
  let weightHtml = '';
  for (const [partyName, candidates] of byParty) {
    weightHtml += `<div class="mb-3"><h5 class="text-sm font-semibold text-gray-700 mb-1">${partyName}</h5>`;
    for (const c of candidates) {
      weightHtml += `
        <div class="flex items-center gap-3 ml-2">
          <input type="number" min="0" max="100" value="0" class="weight-input w-20 border border-gray-300 rounded px-2 py-1" data-delegate-id="${c.delegate?.id}" data-election-id="${c._electionId}">
          <span class="text-gray-700 text-sm">${c.delegate?.firstName} ${c.delegate?.lastName}</span>
        </div>
      `;
    }
    weightHtml += `</div>`;
  }
  weightInputs.innerHTML = weightHtml;

  // Set equal weights
  const equalWeight = Math.floor(100 / state.candidates.length);
  const weightInputElements = weightInputs.querySelectorAll('.weight-input');
  weightInputElements.forEach((input, i) => {
    input.value = i === 0 ? (100 - equalWeight * (state.candidates.length - 1)) : equalWeight;
    input.addEventListener('input', updateWeightTotal);
  });
  updateWeightTotal();

  // Single candidate select - include party name
  singleSelect.innerHTML = '<option value="">Select a candidate...</option>';
  for (const [partyName, candidates] of byParty) {
    for (const c of candidates) {
      const opt = document.createElement('option');
      opt.value = c.delegate?.id;
      opt.dataset.electionId = c._electionId;
      opt.textContent = `${c.delegate?.firstName} ${c.delegate?.lastName} (${partyName})`;
      singleSelect.appendChild(opt);
    }
  }
}

function renderCandidates() {
  const state = getVoteState();
  const container = document.getElementById('candidates-list');
  const weightInputs = document.getElementById('weight-inputs');
  const singleSelect = document.getElementById('single-candidate-select');

  if (state.candidates.length === 0) {
    container.innerHTML = '<p class="text-gray-500 italic">No candidates in this election</p>';
    weightInputs.innerHTML = '<p class="text-gray-500 italic">No candidates</p>';
    singleSelect.innerHTML = '<option value="">No candidates</option>';
    return;
  }

  // Candidate cards
  container.innerHTML = state.candidates.map(c => {
    const partyName = c.party?.party?.name || 'Independent';
    const partyColor = partyName.toLowerCase().includes('federalist') ? 'blue' :
                       partyName.toLowerCase().includes('nationalist') ? 'red' : 'gray';
    return `
      <div class="bg-${partyColor}-50 border border-${partyColor}-200 rounded-lg p-3">
        <div class="font-semibold text-gray-800">${c.delegate?.firstName} ${c.delegate?.lastName}</div>
        <div class="text-sm text-${partyColor}-600">${partyName}</div>
        <div class="text-xs text-gray-500">ID: ${c.delegate?.id}</div>
      </div>
    `;
  }).join('');

  // Weight inputs
  weightInputs.innerHTML = state.candidates.map(c => {
    const partyName = c.party?.party?.name || 'Independent';
    return `
      <div class="flex items-center gap-3">
        <input type="number" min="0" max="100" value="0" class="weight-input w-20 border border-gray-300 rounded px-2 py-1" data-delegate-id="${c.delegate?.id}">
        <span class="text-gray-700">${c.delegate?.firstName} ${c.delegate?.lastName} (${partyName})</span>
      </div>
    `;
  }).join('');

  // Set equal weights by default
  const equalWeight = Math.floor(100 / state.candidates.length);
  const weightInputElements = weightInputs.querySelectorAll('.weight-input');
  weightInputElements.forEach((input, i) => {
    input.value = i === 0 ? (100 - equalWeight * (state.candidates.length - 1)) : equalWeight;
    input.addEventListener('input', updateWeightTotal);
  });
  updateWeightTotal();

  // Single candidate select
  singleSelect.innerHTML = '<option value="">Select a candidate...</option>' +
    state.candidates.map(c => {
      const partyName = c.party?.party?.name || 'Independent';
      return `<option value="${c.delegate?.id}">${c.delegate?.firstName} ${c.delegate?.lastName} (${partyName})</option>`;
    }).join('');
}

function updateWeightTotal() {
  const inputs = document.querySelectorAll('.weight-input');
  let total = 0;
  inputs.forEach(input => {
    total += parseInt(input.value) || 0;
  });
  const totalEl = document.getElementById('weight-total');
  totalEl.textContent = `Total: ${total}%`;
  totalEl.className = total === 100 ? 'text-sm text-green-600 mt-2' : 'text-sm text-red-600 mt-2';
}

function onSimModeChange() {
  const mode = document.querySelector('input[name="sim-mode"]:checked').value;
  document.getElementById('weighted-section').classList.toggle('hidden', mode !== 'weighted');
  document.getElementById('single-section').classList.toggle('hidden', mode !== 'single');
}

async function runSimulation() {
  const state = getVoteState();
  const voteCount = parseInt(document.getElementById('vote-count-input').value);
  const mode = document.querySelector('input[name="sim-mode"]:checked').value;

  if (!voteCount || voteCount < 1) {
    showError('Please enter a valid number of votes');
    return;
  }

  if (voteCount > state.remainingVoters.length) {
    showError(`Only ${state.remainingVoters.length} voters remaining. Cannot simulate ${voteCount} votes.`);
    return;
  }

  if (state.candidates.length === 0) {
    showError('No candidates to vote for');
    return;
  }

  // Validate mode-specific requirements
  if (mode === 'weighted') {
    const inputs = document.querySelectorAll('.weight-input');
    let total = 0;
    inputs.forEach(input => { total += parseInt(input.value) || 0; });
    if (total !== 100) {
      showError('Weighted percentages must sum to 100%');
      return;
    }
  }

  if (mode === 'single') {
    const selectedCandidate = document.getElementById('single-candidate-select').value;
    if (!selectedCandidate) {
      showError('Please select a candidate for single-winner mode');
      return;
    }
  }

  // Show progress section
  const progressSection = document.getElementById('progress-section');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressLog = document.getElementById('progress-log');

  progressSection.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressText.textContent = `Preparing...`;
  progressLog.innerHTML = '<p>Starting simulation...</p>';

  // Disable button during simulation
  const runBtn = document.getElementById('run-simulation-btn');
  runBtn.disabled = true;
  runBtn.textContent = 'Simulating...';

  // Check if this is a ranked choice election
  const isRankedChoice = state.currentElection.method === 'ranked';

  // For combined primaries (open/semi-open), use different logic
  if (state.isCombinedPrimary) {
    await runCombinedPrimarySimulation(voteCount, mode, progressSection, progressBar, progressText, progressLog, runBtn);
    return;
  }

  // For single elections (including closed primaries), use original logic
  let availableVoters = [...state.remainingVoters];
  const isOpenPrimary = state.currentElection.electionType === 'primary' &&
    (state.currentPrimaryModel === 'open' || state.currentPrimaryModel === 'semi_open');

  // Note: For open/semi-open with single election selection (not combined), we still filter
  // But this path should be rare since onYearChange now combines them
  if (isOpenPrimary && state.currentElection.partyId) {
    logMessage(progressLog, `Single primary selected in open/semi-open model`, 'info');
    logMessage(progressLog, `Election party ID: ${state.currentElection.partyId}`, 'info');

    const assignmentResult = await assignVotersToPartyWithStats(state.remainingVoters, state.currentElection.partyId, progressLog);
    availableVoters = assignmentResult.voters;

    const partyName = state.currentElection.party?.party?.name || state.currentElection.party?.name || 'this party';
    logMessage(progressLog, `Result: ${availableVoters.length} of ${state.remainingVoters.length} voters assigned to ${partyName} primary`, 'info');

    if (availableVoters.length === 0) {
      logMessage(progressLog, `ERROR: No voters available. Stats: ${JSON.stringify(assignmentResult.stats)}`, 'error');
      showError('No voters available for this party\'s primary. Check console for details.');
      runBtn.disabled = false;
      runBtn.textContent = 'Run Simulation';
      return;
    }

    if (voteCount > availableVoters.length) {
      logMessage(progressLog, `Requested ${voteCount} votes but only ${availableVoters.length} voters assigned to this party. Adjusting...`, 'warning');
    }
  }

  // Adjust vote count if needed
  const actualVoteCount = Math.min(voteCount, availableVoters.length);

  // Get candidate distribution based on mode
  const distribution = getVoteDistribution(mode, actualVoteCount);

  // Shuffle available voters and take the number we need
  const shuffledVoters = [...availableVoters].sort(() => Math.random() - 0.5);
  const votersToUse = shuffledVoters.slice(0, actualVoteCount);

  // Update progress text with actual count
  progressText.textContent = `0 / ${actualVoteCount} votes`;

  // Run simulation
  let completed = 0;
  let errors = 0;
  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
  headers['Content-Type'] = 'application/json';

  if (isRankedChoice) {
    logMessage(progressLog, 'Ranked Choice Voting detected - generating ranked ballots...', 'info');
  }

  for (let i = 0; i < votersToUse.length; i++) {
    const voter = votersToUse[i];

    if (isRankedChoice) {
      // For RCV: Generate a ranked ballot for this voter
      const rankedBallot = generateRankedBallot(mode, distribution[i % distribution.length]);
      let voterSuccess = true;

      // Submit each ranking as a separate vote
      let rankedVotesSubmitted = 0;
      for (let rank = 0; rank < rankedBallot.length; rank++) {
        const candidateId = rankedBallot[rank];
        try {
          const res = await fetch(`${window.API_URL}/elections/${state.currentElection.id}/vote`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              candidateId: candidateId,
              voterId: voter.id,
              rank: rank + 1  // 1-indexed rank
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            if (rank === 0) {
              voterSuccess = false;
              errors++;
            }
            logMessage(progressLog, `Error (rank ${rank + 1}) for ${voter.firstName}: ${errData.error || res.statusText}`, 'error');
          } else {
            rankedVotesSubmitted++;
          }
        } catch (err) {
          if (rank === 0) {
            voterSuccess = false;
            errors++;
          }
          logMessage(progressLog, `Network error (rank ${rank + 1}) for ${voter.firstName}: ${err.message}`, 'error');
        }
      }

      // Log if not all rankings were submitted
      if (voterSuccess && rankedVotesSubmitted < rankedBallot.length) {
        logMessage(progressLog, `Warning: Only ${rankedVotesSubmitted}/${rankedBallot.length} rankings saved for ${voter.firstName}`, 'warning');
      }

      if (voterSuccess) {
        completed++;
        const firstChoice = state.candidates.find(c => c.delegate?.id === rankedBallot[0]);
        const firstName = firstChoice ? `${firstChoice.delegate?.firstName} ${firstChoice.delegate?.lastName}` : 'Unknown';
        logMessage(progressLog, `Ballot ${completed}: ${voter.firstName} ${voter.lastName} - 1st: ${firstName} (+${rankedBallot.length - 1} rankings)`, 'success');
      }
    } else {
      // For non-RCV: Single vote
      const candidateId = distribution[i % distribution.length];
      const candidate = state.candidates.find(c => c.delegate?.id === candidateId);

      try {
        const res = await fetch(`${window.API_URL}/elections/${state.currentElection.id}/vote`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            candidateId: candidateId,
            voterId: voter.id
          })
        });

        if (res.ok) {
          completed++;
          const candidateName = candidate ? `${candidate.delegate?.firstName} ${candidate.delegate?.lastName}` : 'Unknown';
          logMessage(progressLog, `Vote ${completed}: ${voter.firstName} ${voter.lastName} -> ${candidateName}`, 'success');
        } else {
          const errData = await res.json().catch(() => ({}));
          errors++;
          logMessage(progressLog, `Error voting for ${voter.firstName}: ${errData.error || res.statusText}`, 'error');
        }
      } catch (err) {
        errors++;
        logMessage(progressLog, `Network error for ${voter.firstName}: ${err.message}`, 'error');
      }
    }

    // Update progress
    const progress = ((i + 1) / actualVoteCount) * 100;
    progressBar.style.width = progress + '%';
    progressText.textContent = `${i + 1} / ${actualVoteCount} votes`;

    // Small delay to avoid overwhelming the server
    if (i < votersToUse.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Done
  runBtn.disabled = false;
  runBtn.textContent = 'Run Simulation';

  logMessage(progressLog, `\nSimulation complete: ${completed} successful, ${errors} errors`, completed === actualVoteCount ? 'success' : 'warning');

  // Refresh data
  await loadElectionData(state.currentElection.id);
  showSuccess(`Simulation complete! ${completed} votes cast successfully.`);
}

/**
 * Run simulation for combined primaries (open/semi-open models)
 * - Open: Voter is randomly assigned to a party and locked to it for all primaries
 * - Semi-open: Voter can choose a party for each position (random in simulation)
 * NOTE: Blanket primaries are NOT combined - they're single elections handled by runSimulation()
 */
async function runCombinedPrimarySimulation(voteCount, mode, progressSection, progressBar, progressText, progressLog, runBtn) {
  const state = getVoteState();
  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
  headers['Content-Type'] = 'application/json';

  logMessage(progressLog, `Combined primary simulation (${state.currentPrimaryModel} model)`, 'info');

  // Get party names - try multiple sources since API structures vary
  const getPartyName = (election) => {
    // First check if we resolved the name during loadCombinedPrimaryData
    if (election._resolvedPartyName) return election._resolvedPartyName;
    // Try nested ProgramYearParty structure
    if (election.party?.party?.name) return election.party.party.name;
    // Try flat party structure
    if (election.party?.name) return election.party.name;
    // Try to find in allActiveElections (list endpoint has full info)
    const listElection = state.allActiveElections?.find(e => e.id === election.id);
    if (listElection?.party?.party?.name) return listElection.party.party.name;
    if (listElection?.party?.name) return listElection.party.name;
    // Check candidates for party info
    const candidates = state.candidatesByElection?.get(election.id);
    if (candidates?.length > 0) {
      const candidateParty = candidates[0]._partyName;
      if (candidateParty && !candidateParty.startsWith('Party ')) return candidateParty;
    }
    return 'Party ' + election.partyId;
  };

  // Get list of elections with their candidates
  const electionData = state.combinedElections.map(election => ({
    id: election.id,
    partyId: election.partyId,
    partyName: getPartyName(election),
    candidates: state.candidatesByElection.get(election.id) || []
  }));

  logMessage(progressLog, `Elections: ${electionData.map(e => e.partyName).join(' + ')}`, 'info');
  logMessage(progressLog, `Candidates per party: ${electionData.map(e => `${e.partyName}: ${e.candidates.length}`).join(', ')}`, 'info');

  // Check for existing party locks from ALL primary elections in this program year
  // (not just the current combined set - voters might have voted in other positions' primaries)
  const voterPartyLocks = new Map();
  logMessage(progressLog, `Checking for party locks across all primaries...`, 'info');

  try {
    // Get all primary elections for this program year
    const allElectionsRes = await fetch(`${window.API_URL}/program-years/${state.currentProgramYearId}/elections`, { headers });
    if (allElectionsRes.ok) {
      const allElections = await allElectionsRes.json();
      const primaryElections = allElections.filter(e => e.electionType === 'primary' && e.partyId);

      for (const election of primaryElections) {
        try {
          const votersRes = await fetch(`${window.API_URL}/elections/${election.id}/voters`, { headers });
          if (votersRes.ok) {
            const voterData = await votersRes.json();
            const voterIds = voterData.voterIds || [];
            for (const voterId of voterIds) {
              if (!voterPartyLocks.has(voterId)) {
                voterPartyLocks.set(voterId, election.partyId);
              }
            }
          }
        } catch (err) {
          // Silently continue
        }
      }
    }
  } catch (err) {
    logMessage(progressLog, `Warning: Could not check all primary elections: ${err.message}`, 'warning');
  }

  // Count how many of the REMAINING voters have locks (more useful stat)
  const eligibleVoterIds = new Set(state.remainingVoters.map(v => v.id));
  const locksInRemainingPool = Array.from(voterPartyLocks.keys()).filter(id => eligibleVoterIds.has(id)).length;
  logMessage(progressLog, `Voters with party locks in remaining pool: ${locksInRemainingPool} of ${state.remainingVoters.length}`, 'info');

  // Shuffle voters and take the requested count
  const shuffledVoters = [...state.remainingVoters].sort(() => Math.random() - 0.5);
  const actualVoteCount = Math.min(voteCount, shuffledVoters.length);
  const votersToUse = shuffledVoters.slice(0, actualVoteCount);

  progressText.textContent = `0 / ${actualVoteCount} votes`;

  let completed = 0;
  let errors = 0;
  const partyVoteCounts = new Map();
  electionData.forEach(e => partyVoteCounts.set(e.partyName, 0));

  for (let i = 0; i < votersToUse.length; i++) {
    const voter = votersToUse[i];

    // OPEN/SEMI-OPEN: Assign voter to a party first, then select candidate from that party
    let targetElection;
    let candidateId;
    let candidate;

    const existingLock = voterPartyLocks.get(voter.id);

    if (existingLock !== undefined) {
      // Voter already locked to a party - find matching election
      // Use loose comparison to handle string/number type differences
      targetElection = electionData.find(e => String(e.partyId) === String(existingLock));

      if (!targetElection) {
        // Party lock exists but no matching election in this combined set
        // This shouldn't happen for same-position primaries, but log it
        logMessage(progressLog, `Voter ${voter.firstName} locked to party ${existingLock} not in current elections, skipping`, 'warning');
        errors++;
        continue;
      }
    } else {
      // Randomly assign to a party (equal probability)
      targetElection = electionData[Math.floor(Math.random() * electionData.length)];
    }

    if (!targetElection || targetElection.candidates.length === 0) {
      logMessage(progressLog, `No candidates available for voter ${voter.firstName} in assigned party`, 'warning');
      errors++;
      continue;
    }

    // Select a candidate based on mode (from the assigned party only)
    if (mode === 'random') {
      const randomCandidate = targetElection.candidates[Math.floor(Math.random() * targetElection.candidates.length)];
      candidateId = randomCandidate.delegate?.id;
    } else if (mode === 'weighted') {
      // For weighted mode in combined primaries, use the weights for candidates in this party
      candidateId = selectWeightedCandidateFromParty(targetElection.candidates);
    } else if (mode === 'single') {
      // For single mode, if the selected candidate is in this party, vote for them
      // Otherwise pick randomly from this party
      const selectedId = parseInt(document.getElementById('single-candidate-select').value);
      const selectedOption = document.getElementById('single-candidate-select').selectedOptions[0];
      const selectedElectionId = selectedOption?.dataset?.electionId;

      if (selectedElectionId && parseInt(selectedElectionId) === targetElection.id) {
        candidateId = selectedId;
      } else {
        // Selected candidate is in a different party, pick randomly from this one
        const randomCandidate = targetElection.candidates[Math.floor(Math.random() * targetElection.candidates.length)];
        candidateId = randomCandidate.delegate?.id;
      }
    }

    candidate = targetElection.candidates.find(c => c.delegate?.id === candidateId);

    try {
      const res = await fetch(`${window.API_URL}/elections/${targetElection.id}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId: candidateId,
          voterId: voter.id
        })
      });

      if (res.ok) {
        completed++;
        partyVoteCounts.set(targetElection.partyName, (partyVoteCounts.get(targetElection.partyName) || 0) + 1);
        const candidateName = candidate ? `${candidate.delegate?.firstName} ${candidate.delegate?.lastName}` : 'Unknown';
        logMessage(progressLog, `Vote ${completed}: ${voter.firstName} ${voter.lastName} -> ${candidateName} (${targetElection.partyName})`, 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        errors++;
        logMessage(progressLog, `Error voting for ${voter.firstName}: ${errData.error || res.statusText}`, 'error');
      }
    } catch (err) {
      errors++;
      logMessage(progressLog, `Network error for ${voter.firstName}: ${err.message}`, 'error');
    }

    // Update progress
    const progress = ((i + 1) / actualVoteCount) * 100;
    progressBar.style.width = progress + '%';
    progressText.textContent = `${i + 1} / ${actualVoteCount} votes`;

    // Small delay
    if (i < votersToUse.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Done
  runBtn.disabled = false;
  runBtn.textContent = 'Run Simulation';

  // Show vote distribution by party
  const partyBreakdown = Array.from(partyVoteCounts.entries())
    .map(([party, count]) => `${party}: ${count}`)
    .join(', ');
  logMessage(progressLog, `\nVote distribution: ${partyBreakdown}`, 'info');
  logMessage(progressLog, `Simulation complete: ${completed} successful, ${errors} errors`, completed === actualVoteCount ? 'success' : 'warning');

  // Refresh data for first election
  await loadCombinedPrimaryData(state.combinedElections.map(e => e.id));
  showSuccess(`Simulation complete! ${completed} votes cast (${partyBreakdown}).`);
}

/**
 * Select a candidate from ALL parties based on weighted distribution (for blanket primaries)
 */
function selectWeightedCandidateFromAllParties() {
  const state = getVoteState();
  const inputs = document.querySelectorAll('.weight-input');
  const weights = [];

  inputs.forEach(input => {
    const delegateId = parseInt(input.dataset.delegateId);
    const weight = parseInt(input.value) || 0;
    if (delegateId) {
      weights.push({ delegateId, weight });
    }
  });

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight === 0) {
    // No weights set, pick randomly from all candidates
    const randomCandidate = state.candidates[Math.floor(Math.random() * state.candidates.length)];
    return randomCandidate.delegate?.id;
  }

  // Weighted random selection
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  for (const w of weights) {
    cumulative += w.weight;
    if (random <= cumulative) {
      return w.delegateId;
    }
  }

  // Fallback
  return weights[weights.length - 1]?.delegateId || state.candidates[0]?.delegate?.id;
}

/**
 * Select a candidate from a party based on weighted distribution
 */
function selectWeightedCandidateFromParty(partyCandidates) {
  const inputs = document.querySelectorAll('.weight-input');
  const weights = [];

  inputs.forEach(input => {
    const delegateId = parseInt(input.dataset.delegateId);
    const electionId = input.dataset.electionId ? parseInt(input.dataset.electionId) : null;
    const weight = parseInt(input.value) || 0;

    // Only include if this candidate is in the party
    if (partyCandidates.some(c => c.delegate?.id === delegateId)) {
      weights.push({ delegateId, weight });
    }
  });

  // Normalize weights for this party's candidates
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight === 0) {
    // No weights set for this party, pick randomly
    const randomCandidate = partyCandidates[Math.floor(Math.random() * partyCandidates.length)];
    return randomCandidate.delegate?.id;
  }

  // Weighted random selection
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  for (const w of weights) {
    cumulative += w.weight;
    if (random <= cumulative) {
      return w.delegateId;
    }
  }

  // Fallback
  return weights[weights.length - 1]?.delegateId || partyCandidates[0]?.delegate?.id;
}

function getVoteDistribution(mode, voteCount) {
  const state = getVoteState();
  const distribution = [];

  if (mode === 'random') {
    // Equal random distribution
    for (let i = 0; i < voteCount; i++) {
      const randomCandidate = state.candidates[Math.floor(Math.random() * state.candidates.length)];
      distribution.push(randomCandidate.delegate?.id);
    }
  } else if (mode === 'weighted') {
    // Weighted distribution based on percentages
    const inputs = document.querySelectorAll('.weight-input');
    const weights = [];
    inputs.forEach(input => {
      weights.push({
        delegateId: parseInt(input.dataset.delegateId),
        weight: parseInt(input.value) || 0
      });
    });

    // Create distribution array based on weights
    for (const w of weights) {
      const count = Math.round((w.weight / 100) * voteCount);
      for (let i = 0; i < count; i++) {
        distribution.push(w.delegateId);
      }
    }

    // Fill any remaining due to rounding
    while (distribution.length < voteCount) {
      const randomCandidate = state.candidates[Math.floor(Math.random() * state.candidates.length)];
      distribution.push(randomCandidate.delegate?.id);
    }

    // Shuffle to randomize order
    distribution.sort(() => Math.random() - 0.5);
  } else if (mode === 'single') {
    // All votes to one candidate
    const selectedId = parseInt(document.getElementById('single-candidate-select').value);
    for (let i = 0; i < voteCount; i++) {
      distribution.push(selectedId);
    }
  }

  return distribution;
}

/**
 * For open/semi-open primaries, randomly assign voters to parties.
 * Returns voters filtered to only those assigned to the target party.
 * Also tracks existing party locks from previous votes.
 */
async function assignVotersToParty(voters, targetPartyId) {
  const result = await assignVotersToPartyWithStats(voters, targetPartyId, null);
  return result.voters;
}

/**
 * Same as assignVotersToParty but returns stats for debugging.
 * Optionally logs to a progress log element.
 */
async function assignVotersToPartyWithStats(voters, targetPartyId, progressLog) {
  const state = getVoteState();
  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

  const log = (msg, type = 'info') => {
    console.log('[Party Assignment]', msg);
    if (progressLog && typeof logMessage === 'function') {
      logMessage(progressLog, `[Debug] ${msg}`, type);
    }
  };

  // Normalize targetPartyId to number for consistent comparison
  const normalizedTargetPartyId = parseInt(targetPartyId, 10);
  log(`Target party ID: ${normalizedTargetPartyId} (type: ${typeof targetPartyId} -> normalized: ${typeof normalizedTargetPartyId})`);

  // Get all parties for this program year to do random assignment
  let parties = [];
  try {
    const partiesRes = await fetch(`${window.API_URL}/program-years/${state.currentProgramYearId}/parties`, { headers });
    if (partiesRes.ok) {
      parties = await partiesRes.json();
      log(`Parties loaded: ${parties.length}`);
      parties.forEach(p => {
        log(`  Party: id=${p.id}, partyId=${p.partyId}, party.id=${p.party?.id}, name=${p.party?.name || p.name}`);
      });
    } else {
      log(`Failed to load parties: ${partiesRes.status}`, 'error');
    }
  } catch (err) {
    log(`Error loading parties: ${err.message}`, 'error');
  }

  // If we couldn't get parties or there's only one, just return all voters
  if (parties.length <= 1) {
    log('Only one party or no parties, returning all voters');
    return { voters, stats: { singleParty: true } };
  }

  // Check which voters already have a party lock from previous primary votes
  const voterPartyLocks = new Map();

  try {
    const electionsRes = await fetch(`${window.API_URL}/program-years/${state.currentProgramYearId}/elections`, { headers });
    if (electionsRes.ok) {
      const allElections = await electionsRes.json();
      const primaryElections = allElections.filter(e => e.electionType === 'primary' && e.partyId);
      log(`Found ${primaryElections.length} primary elections to check for locks`);

      for (const election of primaryElections) {
        try {
          const votersRes = await fetch(`${window.API_URL}/elections/${election.id}/voters`, { headers });
          if (votersRes.ok) {
            const voterData = await votersRes.json();
            const voterIds = voterData.voterIds || [];
            const electionPartyId = parseInt(election.partyId, 10);
            for (const voterId of voterIds) {
              if (!voterPartyLocks.has(voterId)) {
                voterPartyLocks.set(voterId, electionPartyId);
              }
            }
          }
        } catch (err) {
          log(`Failed to get voters for election ${election.id}: ${err.message}`, 'warning');
        }
      }
    }
  } catch (err) {
    log(`Failed to check existing primary votes: ${err.message}`, 'error');
  }

  log(`Voters with existing party locks: ${voterPartyLocks.size}`);

  // Extract the actual party IDs for random assignment
  // IMPORTANT: Elections store partyId as ProgramYearParty.id (the join table record)
  // So we need to use p.id (ProgramYearParty.id), not p.partyId (which is Party.id foreign key)
  const partyIds = parties.map(p => {
    const pid = parseInt(p.id, 10);  // Use ProgramYearParty.id
    return pid;
  });
  log(`Party IDs (ProgramYearParty.id) for random assignment: [${partyIds.join(', ')}]`);

  // Also get the inner Party.id values as fallback
  const innerPartyIds = parties.map(p => parseInt(p.partyId || p.party?.id, 10)).filter(x => !isNaN(x));
  log(`Party IDs (Party.id) for reference: [${innerPartyIds.join(', ')}]`);

  // Check if target is in either set
  const targetInProgramYearParty = partyIds.includes(normalizedTargetPartyId);
  const targetInParty = innerPartyIds.includes(normalizedTargetPartyId);
  log(`Target party ${normalizedTargetPartyId} in ProgramYearParty.id list: ${targetInProgramYearParty}`);
  log(`Target party ${normalizedTargetPartyId} in Party.id list: ${targetInParty}`);

  // Determine which ID set to use based on where target is found
  let effectivePartyIds = partyIds;
  if (!targetInProgramYearParty && targetInParty) {
    log(`Target found in Party.id list but not ProgramYearParty.id - using Party.id for matching`);
    effectivePartyIds = innerPartyIds;
  } else if (!targetInProgramYearParty && !targetInParty) {
    log(`WARNING: Target party ${normalizedTargetPartyId} not found in any party list!`, 'error');
  }

  const eligibleVoters = [];
  let lockedToTarget = 0;
  let lockedToOther = 0;
  let randomlyAssignedToTarget = 0;
  let randomlyAssignedToOther = 0;

  for (const voter of voters) {
    const existingLock = voterPartyLocks.get(voter.id);

    if (existingLock !== undefined) {
      if (existingLock === normalizedTargetPartyId) {
        eligibleVoters.push(voter);
        lockedToTarget++;
      } else {
        lockedToOther++;
      }
    } else {
      const randomPartyId = effectivePartyIds[Math.floor(Math.random() * effectivePartyIds.length)];
      if (randomPartyId === normalizedTargetPartyId) {
        eligibleVoters.push(voter);
        randomlyAssignedToTarget++;
      } else {
        randomlyAssignedToOther++;
      }
    }
  }

  const stats = {
    totalVoters: voters.length,
    lockedToTarget,
    lockedToOther,
    randomlyAssignedToTarget,
    randomlyAssignedToOther,
    eligibleForThisParty: eligibleVoters.length,
    targetPartyId: normalizedTargetPartyId,
    programYearPartyIds: partyIds,
    innerPartyIds: innerPartyIds,
    effectivePartyIds: effectivePartyIds
  };

  log(`Results: locked=${lockedToTarget}/${lockedToOther}, random=${randomlyAssignedToTarget}/${randomlyAssignedToOther}, eligible=${eligibleVoters.length}`);

  return { voters: eligibleVoters, stats };
}

/**
 * Generate a ranked ballot for RCV elections.
 * The first choice is determined by the simulation mode/distribution.
 * Remaining candidates are shuffled randomly for subsequent rankings.
 */
function generateRankedBallot(mode, firstChoiceId) {
  const state = getVoteState();
  const ballot = [];
  const candidateIds = state.candidates.map(c => c.delegate?.id).filter(id => id);

  // First choice is determined by the distribution
  ballot.push(firstChoiceId);

  // Remaining candidates shuffled randomly
  const remaining = candidateIds.filter(id => id !== firstChoiceId);
  remaining.sort(() => Math.random() - 0.5);

  ballot.push(...remaining);

  return ballot;
}

// Export for Node testing and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadProgramYears,
    onYearChange,
    onElectionChange,
    loadElectionData,
    loadCombinedPrimaryData,
    renderCandidates,
    renderCombinedCandidates,
    updateWeightTotal,
    onSimModeChange,
    runSimulation,
    runCombinedPrimarySimulation,
    getVoteDistribution,
    selectWeightedCandidateFromAllParties,
    selectWeightedCandidateFromParty,
    assignVotersToParty,
    assignVotersToPartyWithStats,
    generateRankedBallot,
  };
} else {
  window.loadProgramYears = loadProgramYears;
  window.onYearChange = onYearChange;
  window.onElectionChange = onElectionChange;
  window.loadElectionData = loadElectionData;
  window.loadCombinedPrimaryData = loadCombinedPrimaryData;
  window.renderCandidates = renderCandidates;
  window.renderCombinedCandidates = renderCombinedCandidates;
  window.updateWeightTotal = updateWeightTotal;
  window.onSimModeChange = onSimModeChange;
  window.runSimulation = runSimulation;
  window.runCombinedPrimarySimulation = runCombinedPrimarySimulation;
  window.getVoteDistribution = getVoteDistribution;
  window.selectWeightedCandidateFromAllParties = selectWeightedCandidateFromAllParties;
  window.selectWeightedCandidateFromParty = selectWeightedCandidateFromParty;
  window.assignVotersToParty = assignVotersToParty;
  window.assignVotersToPartyWithStats = assignVotersToPartyWithStats;
  window.generateRankedBallot = generateRankedBallot;
}
