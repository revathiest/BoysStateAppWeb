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
    // Get only active elections (voting in progress)
    const res = await fetch(`${window.API_URL}/program-years/${state.currentProgramYearId}/elections?status=active`, { headers });
    if (!res.ok) throw new Error('Failed to load elections');

    const elections = await res.json();
    electionSelect.innerHTML = '<option value="">Select an election...</option>';

    if (elections.length === 0) {
      electionSelect.innerHTML = '<option value="">No active elections</option>';
      noActiveWarning.classList.remove('hidden');
      return;
    }

    elections.forEach(e => {
      // Handle various possible data structures for position name
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
    });
  } catch (err) {
    showError('Failed to load elections: ' + err.message);
  }
}

async function onElectionChange() {
  const electionSelect = document.getElementById('election-select');
  const simulationSection = document.getElementById('simulation-section');
  const electionDetails = document.getElementById('election-details');
  const electionId = electionSelect.value;
  simulationSection.classList.add('hidden');
  electionDetails.classList.add('hidden');

  if (!electionId) return;

  await loadElectionData(electionId);
}

async function loadElectionData(electionId) {
  const state = getVoteState();
  try {
    showSuccess('Loading election data...');
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Get full election details
    const electionRes = await fetch(`${window.API_URL}/elections/${electionId}`, { headers });
    if (!electionRes.ok) throw new Error('Failed to load election details');
    state.currentElection = await electionRes.json();

    // Show election details
    document.getElementById('detail-position').textContent = state.currentElection.position?.position?.name || '-';
    document.getElementById('detail-grouping').textContent = state.currentElection.grouping?.name || '-';
    document.getElementById('detail-type').textContent = getElectionTypeLabel(state.currentElection.electionType);
    document.getElementById('detail-status').textContent = state.currentElection.status;

    // Show voting method with badge
    const method = state.currentElection.method || 'plurality';
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
  progressText.textContent = `0 / ${voteCount} votes`;
  progressLog.innerHTML = '<p>Starting simulation...</p>';

  // Disable button during simulation
  const runBtn = document.getElementById('run-simulation-btn');
  runBtn.disabled = true;
  runBtn.textContent = 'Simulating...';

  // Check if this is a ranked choice election
  const isRankedChoice = state.currentElection.method === 'ranked';

  // Get candidate distribution based on mode
  const distribution = getVoteDistribution(mode, voteCount);

  // Shuffle remaining voters and take the number we need
  const shuffledVoters = [...state.remainingVoters].sort(() => Math.random() - 0.5);
  const votersToUse = shuffledVoters.slice(0, voteCount);

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
    const progress = ((i + 1) / voteCount) * 100;
    progressBar.style.width = progress + '%';
    progressText.textContent = `${i + 1} / ${voteCount} votes`;

    // Small delay to avoid overwhelming the server
    if (i < votersToUse.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Done
  runBtn.disabled = false;
  runBtn.textContent = 'Run Simulation';

  logMessage(progressLog, `\nSimulation complete: ${completed} successful, ${errors} errors`, completed === voteCount ? 'success' : 'warning');

  // Refresh data
  await loadElectionData(state.currentElection.id);
  showSuccess(`Simulation complete! ${completed} votes cast successfully.`);
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
    renderCandidates,
    updateWeightTotal,
    onSimModeChange,
    runSimulation,
    getVoteDistribution,
    generateRankedBallot,
  };
} else {
  window.loadProgramYears = loadProgramYears;
  window.onYearChange = onYearChange;
  window.onElectionChange = onElectionChange;
  window.loadElectionData = loadElectionData;
  window.renderCandidates = renderCandidates;
  window.updateWeightTotal = updateWeightTotal;
  window.onSimModeChange = onSimModeChange;
  window.runSimulation = runSimulation;
  window.getVoteDistribution = getVoteDistribution;
  window.generateRankedBallot = generateRankedBallot;
}
