/**
 * vote-simulation.js
 * Admin tool for simulating votes in elections for testing purposes.
 * Uses the existing voting endpoints with actual delegate IDs.
 */

let currentProgramId = null;
let currentProgramYearId = null;
let currentElection = null;
let candidates = [];
let eligibleVoters = [];
let votersWhoVoted = [];
let remainingVoters = [];

// Election type display labels
const electionTypeLabels = {
  primary: 'Primary',
  general: 'General',
  runoff: 'Runoff',
  primary_runoff: 'Primary Runoff',
};

function getElectionTypeLabel(type) {
  return electionTypeLabels[type] || type || 'general';
}

// DOM elements
let yearSelect, electionSelect, electionDetails;
let simulationSection, noActiveWarning;
let errorBox, successBox;

document.addEventListener('DOMContentLoaded', async () => {
  // Require auth
  if (typeof requireAuth === 'function') {
    requireAuth();
  }

  // Get programId from URL or localStorage
  const params = new URLSearchParams(window.location.search);
  currentProgramId = params.get('programId') || localStorage.getItem('lastSelectedProgramId');

  if (!currentProgramId) {
    showError('No program selected. Please go back and select a program.');
    return;
  }

  // Cache DOM elements
  yearSelect = document.getElementById('year-select');
  electionSelect = document.getElementById('election-select');
  electionDetails = document.getElementById('election-details');
  simulationSection = document.getElementById('simulation-section');
  noActiveWarning = document.getElementById('no-active-warning');
  errorBox = document.getElementById('errorBox');
  successBox = document.getElementById('successBox');

  // Event listeners
  yearSelect.addEventListener('change', onYearChange);
  electionSelect.addEventListener('change', onElectionChange);

  document.querySelectorAll('input[name="sim-mode"]').forEach(radio => {
    radio.addEventListener('change', onSimModeChange);
  });

  document.getElementById('set-all-btn').addEventListener('click', () => {
    document.getElementById('vote-count-input').value = remainingVoters.length;
  });

  document.getElementById('run-simulation-btn').addEventListener('click', runSimulation);
  document.getElementById('refresh-stats-btn').addEventListener('click', () => loadElectionData(currentElection.id));
  document.getElementById('view-full-results-btn')?.addEventListener('click', () => {
    if (currentElection) {
      openAuditModal(currentElection.id);
    }
  });

  // Audit modal close buttons
  document.getElementById('audit-modal-close')?.addEventListener('click', closeAuditModal);
  document.getElementById('audit-modal-done')?.addEventListener('click', closeAuditModal);
  document.getElementById('audit-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'audit-modal') closeAuditModal();
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('authToken');
    window.location.href = 'login.html';
  });

  // Update back link with programId
  const backLink = document.querySelector('a[href="elections-management.html"]');
  if (backLink) {
    backLink.href = `elections-management.html?programId=${encodeURIComponent(currentProgramId)}`;
  }

  // Load program years
  await loadProgramYears();
});

async function loadProgramYears() {
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const res = await fetch(`${window.API_URL}/programs/${currentProgramId}/years`, { headers });
    if (!res.ok) throw new Error('Failed to load years');

    const years = await res.json();
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
  currentProgramYearId = yearSelect.value;
  electionSelect.innerHTML = '<option value="">Loading elections...</option>';
  simulationSection.classList.add('hidden');
  noActiveWarning.classList.add('hidden');
  electionDetails.classList.add('hidden');

  if (!currentProgramYearId) {
    electionSelect.innerHTML = '<option value="">Select year first...</option>';
    return;
  }

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    // Get only active elections (voting in progress)
    const res = await fetch(`${window.API_URL}/program-years/${currentProgramYearId}/elections?status=active`, { headers });
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

      // Debug logging
      console.log('Election data:', { id: e.id, position: e.position, grouping: e.grouping });

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
  const electionId = electionSelect.value;
  simulationSection.classList.add('hidden');
  electionDetails.classList.add('hidden');

  if (!electionId) return;

  await loadElectionData(electionId);
}

async function loadElectionData(electionId) {
  try {
    showSuccess('Loading election data...');
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Get full election details
    const electionRes = await fetch(`${window.API_URL}/elections/${electionId}`, { headers });
    if (!electionRes.ok) throw new Error('Failed to load election details');
    currentElection = await electionRes.json();

    // Show election details
    document.getElementById('detail-position').textContent = currentElection.position?.position?.name || '-';
    document.getElementById('detail-grouping').textContent = currentElection.grouping?.name || '-';
    document.getElementById('detail-type').textContent = getElectionTypeLabel(currentElection.electionType);
    document.getElementById('detail-status').textContent = currentElection.status;

    // Show voting method with badge
    const method = currentElection.method || 'plurality';
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

    electionDetails.classList.remove('hidden');

    // Get candidates
    const candidatesRes = await fetch(`${window.API_URL}/elections/${electionId}/candidates`, { headers });
    if (!candidatesRes.ok) throw new Error('Failed to load candidates');
    candidates = await candidatesRes.json();
    candidates = candidates.filter(c => c.status === 'nominated' || c.status === 'qualified');

    // Get eligible voters (delegates in this grouping)
    const votersRes = await fetch(`${window.API_URL}/elections/${electionId}/eligible-delegates`, { headers });
    if (!votersRes.ok) throw new Error('Failed to load eligible voters');
    eligibleVoters = await votersRes.json();

    // Get vote stats to determine who has voted
    const resultsRes = await fetch(`${window.API_URL}/elections/${electionId}/voters`, { headers });
    if (resultsRes.ok) {
      const voterData = await resultsRes.json();
      votersWhoVoted = voterData.voterIds || [];
    } else {
      // Endpoint might not exist yet, estimate from results
      votersWhoVoted = [];
    }

    // Calculate remaining voters
    const votedSet = new Set(votersWhoVoted);
    remainingVoters = eligibleVoters.filter(v => !votedSet.has(v.id));

    // Update stats
    document.getElementById('stat-candidates').textContent = candidates.length;
    document.getElementById('stat-eligible').textContent = eligibleVoters.length;
    document.getElementById('stat-voted').textContent = votersWhoVoted.length;
    document.getElementById('stat-remaining').textContent = remainingVoters.length;

    // Render candidates list
    renderCandidates();

    // Show simulation section
    simulationSection.classList.remove('hidden');

    // Set default vote count
    document.getElementById('vote-count-input').max = remainingVoters.length;
    document.getElementById('vote-count-input').value = Math.min(10, remainingVoters.length);

    // Load results if any votes exist
    if (votersWhoVoted.length > 0) {
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
  const container = document.getElementById('candidates-list');
  const weightInputs = document.getElementById('weight-inputs');
  const singleSelect = document.getElementById('single-candidate-select');

  if (candidates.length === 0) {
    container.innerHTML = '<p class="text-gray-500 italic">No candidates in this election</p>';
    weightInputs.innerHTML = '<p class="text-gray-500 italic">No candidates</p>';
    singleSelect.innerHTML = '<option value="">No candidates</option>';
    return;
  }

  // Candidate cards
  container.innerHTML = candidates.map(c => {
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
  weightInputs.innerHTML = candidates.map(c => {
    const partyName = c.party?.party?.name || 'Independent';
    return `
      <div class="flex items-center gap-3">
        <input type="number" min="0" max="100" value="0" class="weight-input w-20 border border-gray-300 rounded px-2 py-1" data-delegate-id="${c.delegate?.id}">
        <span class="text-gray-700">${c.delegate?.firstName} ${c.delegate?.lastName} (${partyName})</span>
      </div>
    `;
  }).join('');

  // Set equal weights by default
  const equalWeight = Math.floor(100 / candidates.length);
  const weightInputElements = weightInputs.querySelectorAll('.weight-input');
  weightInputElements.forEach((input, i) => {
    input.value = i === 0 ? (100 - equalWeight * (candidates.length - 1)) : equalWeight;
    input.addEventListener('input', updateWeightTotal);
  });
  updateWeightTotal();

  // Single candidate select
  singleSelect.innerHTML = '<option value="">Select a candidate...</option>' +
    candidates.map(c => {
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
  const voteCount = parseInt(document.getElementById('vote-count-input').value);
  const mode = document.querySelector('input[name="sim-mode"]:checked').value;

  if (!voteCount || voteCount < 1) {
    showError('Please enter a valid number of votes');
    return;
  }

  if (voteCount > remainingVoters.length) {
    showError(`Only ${remainingVoters.length} voters remaining. Cannot simulate ${voteCount} votes.`);
    return;
  }

  if (candidates.length === 0) {
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
  const isRankedChoice = currentElection.method === 'ranked';

  // Get candidate distribution based on mode
  const distribution = getVoteDistribution(mode, voteCount);

  // Shuffle remaining voters and take the number we need
  const shuffledVoters = [...remainingVoters].sort(() => Math.random() - 0.5);
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
          const res = await fetch(`${window.API_URL}/elections/${currentElection.id}/vote`, {
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
            // Log ALL errors to help diagnose RCV issues
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
        const firstChoice = candidates.find(c => c.delegate?.id === rankedBallot[0]);
        const firstName = firstChoice ? `${firstChoice.delegate?.firstName} ${firstChoice.delegate?.lastName}` : 'Unknown';
        logMessage(progressLog, `Ballot ${completed}: ${voter.firstName} ${voter.lastName} - 1st: ${firstName} (+${rankedBallot.length - 1} rankings)`, 'success');
      }
    } else {
      // For non-RCV: Single vote
      const candidateId = distribution[i % distribution.length];
      const candidate = candidates.find(c => c.delegate?.id === candidateId);

      try {
        const res = await fetch(`${window.API_URL}/elections/${currentElection.id}/vote`, {
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

    // Update progress (use DOM style property instead of inline style attribute)
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
  await loadElectionData(currentElection.id);
  showSuccess(`Simulation complete! ${completed} votes cast successfully.`);
}

function getVoteDistribution(mode, voteCount) {
  const distribution = [];

  if (mode === 'random') {
    // Equal random distribution
    for (let i = 0; i < voteCount; i++) {
      const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
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
      const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
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
  const ballot = [];
  const candidateIds = candidates.map(c => c.delegate?.id).filter(id => id);

  // First choice is determined by the distribution
  ballot.push(firstChoiceId);

  // Remaining candidates shuffled randomly
  const remaining = candidateIds.filter(id => id !== firstChoiceId);
  remaining.sort(() => Math.random() - 0.5);

  ballot.push(...remaining);

  return ballot;
}

function logMessage(container, message, type = 'info') {
  const p = document.createElement('p');
  p.textContent = message;
  if (type === 'success') p.className = 'text-green-400';
  else if (type === 'error') p.className = 'text-red-400';
  else if (type === 'warning') p.className = 'text-yellow-400';
  container.appendChild(p);
  container.scrollTop = container.scrollHeight;
}

async function loadResults(electionId) {
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const res = await fetch(`${window.API_URL}/elections/${electionId}/results`, { headers });
    if (!res.ok) throw new Error('Failed to load results');

    const data = await res.json();
    const resultsContainer = document.getElementById('results-list');
    const method = data.election?.method || 'plurality';
    const methodLabels = {
      'plurality': 'Plurality (most votes wins)',
      'majority': 'Majority (requires >50%)',
      'ranked': 'Ranked Choice (instant runoff)'
    };

    if (!data.results || data.results.length === 0) {
      resultsContainer.innerHTML = '<p class="text-gray-500 italic">No votes yet</p>';
      return;
    }

    // Build the method badge and winner/runoff info
    let headerHtml = `
      <div class="mb-4 pb-3 border-b">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">
            ${methodLabels[method] || method}
          </span>
          <span class="text-sm text-gray-500">Total votes: ${data.totalVotes || data.totalVoters || 0}</span>
        </div>
    `;

    // Show winner or runoff status
    if (data.requiresRunoff) {
      if (method === 'majority') {
        headerHtml += `
          <div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-yellow-800">
                <span class="text-lg">⚠️</span>
                <span class="font-semibold">Runoff Required</span>
              </div>
              <button id="create-runoff-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-lg shadow transition text-sm">
                Create Runoff
              </button>
            </div>
            <p class="text-sm text-yellow-700 mt-1">No candidate achieved a majority (&gt;50%). A runoff election is needed between:</p>
            <ul class="text-sm text-yellow-700 mt-2 ml-4 list-disc">
              ${data.runoffCandidates?.map(c => `<li>${c.delegate?.firstName} ${c.delegate?.lastName} (${c.voteCount} votes, ${((c.voteCount / data.totalVotes) * 100).toFixed(1)}%)</li>`).join('') || ''}
            </ul>
          </div>
        `;
      } else if (data.tieBreakNeeded) {
        headerHtml += `
          <div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div class="flex items-center gap-2 text-yellow-800">
              <span class="text-lg">⚠️</span>
              <span class="font-semibold">Tie - No Winner Determined</span>
            </div>
            <p class="text-sm text-yellow-700 mt-1">All remaining candidates are tied. A tiebreaker is needed.</p>
          </div>
        `;
      }
    } else if (data.winner) {
      const winnerParty = data.winner.party?.party?.name || 'Independent';
      headerHtml += `
        <div class="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
          <div class="flex items-center gap-2 text-green-800">
            <span class="text-lg">🏆</span>
            <span class="font-semibold">Winner: ${data.winner.delegate?.firstName} ${data.winner.delegate?.lastName}</span>
          </div>
          <p class="text-sm text-green-700 mt-1">
            ${winnerParty} - ${data.winner.voteCount} votes (${data.winner.percentage?.toFixed(1) || ((data.winner.voteCount / (data.totalVotes || data.totalVoters || 1)) * 100).toFixed(1)}%)
          </p>
        </div>
      `;
    }

    headerHtml += '</div>';

    // For ranked choice, show rounds if available
    let roundsHtml = '';
    if (method === 'ranked' && data.rounds && data.rounds.length > 1) {
      roundsHtml = `
        <div class="mb-4">
          <details class="bg-gray-50 rounded-lg">
            <summary class="cursor-pointer p-3 font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
              View ${data.rounds.length} Elimination Rounds
            </summary>
            <div class="p-3 space-y-3">
              ${data.rounds.map(round => `
                <div class="border-l-4 border-gray-300 pl-3">
                  <div class="font-medium text-gray-700">Round ${round.roundNumber}</div>
                  <div class="text-sm text-gray-600 mt-1">
                    ${round.results.map(r => `${r.delegate?.firstName} ${r.delegate?.lastName}: ${r.voteCount} (${r.percentage?.toFixed(1)}%)`).join(' | ')}
                  </div>
                  ${round.eliminated ? `<div class="text-sm text-red-600 mt-1">Eliminated: ${round.eliminated.map(e => `${e.delegate?.firstName} ${e.delegate?.lastName}`).join(', ')}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </details>
        </div>
      `;
    }

    const maxVotes = Math.max(...data.results.map(r => r.voteCount));
    const totalVotes = data.totalVotes || data.totalVoters || 1;

    // Build HTML for each candidate
    const resultItems = data.results.map((r, i) => {
      const percentage = totalVotes > 0 ? ((r.voteCount / totalVotes) * 100).toFixed(1) : 0;
      const barWidth = maxVotes > 0 ? ((r.voteCount / maxVotes) * 100) : 0;
      const partyName = r.party?.party?.name || 'Independent';
      const partyColor = partyName.toLowerCase().includes('federalist') ? 'blue' :
                         partyName.toLowerCase().includes('nationalist') ? 'red' : 'gray';
      const isWinner = data.winner && r.delegateId === data.winner.delegateId;

      return {
        html: `
          <div class="bg-gray-50 rounded-lg p-3 ${isWinner ? 'ring-2 ring-legend-gold' : ''}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                ${isWinner ? '<span class="text-legend-gold">&#9733;</span>' : ''}
                <span class="font-semibold">${r.delegate?.firstName} ${r.delegate?.lastName}</span>
                <span class="text-sm text-${partyColor}-600">(${partyName})</span>
              </div>
              <div class="text-right">
                <span class="font-bold text-lg">${r.voteCount}</span>
                <span class="text-sm text-gray-500 ml-1">(${percentage}%)</span>
              </div>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div class="result-bar bg-${partyColor}-500 h-3 rounded-full transition-all duration-500" data-width="${barWidth}"></div>
            </div>
          </div>
        `,
        barWidth
      };
    });

    resultsContainer.innerHTML = headerHtml + roundsHtml + resultItems.map(r => r.html).join('');

    // Apply widths via JavaScript to avoid CSP inline style issues
    const bars = resultsContainer.querySelectorAll('.result-bar');
    bars.forEach(bar => {
      const width = bar.getAttribute('data-width');
      bar.style.width = width + '%';
    });

    // Add click handler for runoff button if present
    const runoffBtn = resultsContainer.querySelector('#create-runoff-btn');
    if (runoffBtn) {
      runoffBtn.addEventListener('click', createRunoffElection);
    }

    document.getElementById('results-section').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load results:', err);
  }
}

// ============================================================
// RUNOFF ELECTION
// ============================================================

async function createRunoffElection() {
  if (!currentElection) {
    showError('No election selected');
    return;
  }

  const runoffBtn = document.querySelector('#create-runoff-btn');
  if (runoffBtn) {
    runoffBtn.disabled = true;
    runoffBtn.textContent = 'Creating...';
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/elections/${currentElection.id}/runoff`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create runoff');
    }

    const result = await res.json();

    // Handle business logic rejections (200 with success: false)
    if (result.success === false) {
      throw new Error(result.error || 'Runoff creation was rejected');
    }

    showSuccess(result.message || 'Runoff election created! Go to Elections Management to start the runoff.');

    // Reload elections to show the new runoff
    await onYearChange();

  } catch (err) {
    showError(err.message || 'Failed to create runoff election');
  } finally {
    if (runoffBtn) {
      runoffBtn.disabled = false;
      runoffBtn.textContent = 'Create Runoff';
    }
  }
}

// ============================================================
// AUDIT MODAL
// ============================================================

async function openAuditModal(electionId) {
  const modal = document.getElementById('audit-modal');
  const title = document.getElementById('audit-modal-title');
  const electionInfo = document.getElementById('audit-election-info');
  const tableBody = document.getElementById('audit-table-body');
  const tableHead = tableBody.closest('table').querySelector('thead tr');

  modal.classList.remove('hidden');
  tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Loading audit data...</td></tr>';

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const res = await fetch(`${window.API_URL}/elections/${electionId}/audit`, { headers });

    if (!res.ok) {
      throw new Error('Failed to load audit data');
    }

    const data = await res.json();

    // Check if this is an RCV election
    const isRanked = data.election.method === 'ranked';

    // Update table header based on election type
    if (isRanked) {
      tableHead.innerHTML = `
        <th class="px-3 py-2 text-left font-semibold text-gray-700">#</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Voter</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Voted For</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Party</th>
        <th class="px-3 py-2 text-center font-semibold text-gray-700">Rank</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Timestamp</th>
      `;
    } else {
      tableHead.innerHTML = `
        <th class="px-3 py-2 text-left font-semibold text-gray-700">#</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Voter</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Voted For</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Party</th>
        <th class="px-3 py-2 text-left font-semibold text-gray-700">Timestamp</th>
      `;
    }

    // Update title and election info
    const methodLabels = {
      'plurality': 'Plurality',
      'majority': 'Majority',
      'ranked': 'Ranked Choice (IRV)'
    };
    title.textContent = `Vote Audit - ${data.election.position}`;
    electionInfo.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <span class="text-gray-500">Position:</span>
          <span class="font-semibold ml-1">${data.election.position}</span>
        </div>
        <div>
          <span class="text-gray-500">Grouping:</span>
          <span class="font-semibold ml-1">${data.election.grouping}</span>
        </div>
        <div>
          <span class="text-gray-500">Type:</span>
          <span class="font-semibold ml-1">${getElectionTypeLabel(data.election.electionType)}</span>
        </div>
        <div>
          <span class="text-gray-500">Method:</span>
          <span class="font-semibold ml-1">${methodLabels[data.election.method] || data.election.method || 'Unknown'}</span>
        </div>
        <div>
          <span class="text-gray-500">Total Votes:</span>
          <span class="font-semibold ml-1">${data.totalVotes}</span>
        </div>
      </div>
    `;

    if (data.votes.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No votes recorded yet</td></tr>';
      return;
    }

    // Render vote rows - include rank for RCV elections
    tableBody.innerHTML = data.votes.map((v, i) => {
      const partyColor = v.candidate.party.toLowerCase().includes('federalist') ? 'blue' :
                         v.candidate.party.toLowerCase().includes('nationalist') ? 'red' : 'gray';
      const timestamp = new Date(v.timestamp).toLocaleString();
      const rankDisplay = v.rank != null ? `#${v.rank}` : '-';

      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50">
          <td class="px-3 py-2 text-gray-500">${i + 1}</td>
          <td class="px-3 py-2 font-medium">${escapeHtml(v.voter.name)}</td>
          <td class="px-3 py-2">${escapeHtml(v.candidate.name)}</td>
          <td class="px-3 py-2">
            <span class="text-${partyColor}-600">${escapeHtml(v.candidate.party)}</span>
          </td>
          ${isRanked ? `<td class="px-3 py-2 text-center font-medium ${v.rank === 1 ? 'text-green-600' : 'text-gray-500'}">${rankDisplay}</td>` : ''}
          <td class="px-3 py-2 text-gray-500 text-xs">${timestamp}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load audit data:', err);
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">Failed to load audit data: ${err.message}</td></tr>`;
  }
}

function closeAuditModal() {
  document.getElementById('audit-modal').classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  successBox.classList.add('hidden');
  // Scroll to make error visible
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showSuccess(message) {
  successBox.textContent = message;
  successBox.classList.remove('hidden');
  errorBox.classList.add('hidden');
}

function hideMessages() {
  errorBox.classList.add('hidden');
  successBox.classList.add('hidden');
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getVoteDistribution,
    generateRankedBallot,
    renderCandidates,
    updateWeightTotal,
    createRunoffElection,
    showError,
    showSuccess,
  };
}
