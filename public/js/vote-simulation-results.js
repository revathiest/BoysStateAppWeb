/**
 * vote-simulation-results.js
 * Handles results display, runoff creation, and audit modal.
 * Depends on: vote-simulation-utils.js, vote-simulation-state.js (via window)
 */

// Uses shared state from window.voteSimState
function getResultsState() {
  return window.voteSimState || {};
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
                <span class="text-lg">&#9888;</span>
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
              <span class="text-lg">&#9888;</span>
              <span class="font-semibold">Tie - No Winner Determined</span>
            </div>
            <p class="text-sm text-yellow-700 mt-1">All remaining candidates are tied. A tiebreaker is needed.</p>
          </div>
        `;
      }
    }
    // Handle plurality tie that needs resolution
    if (data.hasTie && data.tiedCandidates && data.tiedCandidates.length > 0) {
      const seatsToResolve = data.seatsToResolve || 1;
      const clearWinners = data.clearWinners || [];

      // Show clear winners first if any
      let clearWinnersHtml = '';
      if (clearWinners.length > 0) {
        clearWinnersHtml = `
          <div class="mb-3 p-3 bg-green-50 border border-green-200 rounded">
            <p class="text-sm font-medium text-green-800 mb-2">&#10003; Clear Winners (${clearWinners.length} of ${data.seatCount} seats filled):</p>
            ${clearWinners.map(w => `
              <p class="text-sm text-green-700 ml-4">• ${escapeHtml((w.delegate?.firstName || '') + ' ' + (w.delegate?.lastName || ''))} (${w.voteCount} votes)</p>
            `).join('')}
          </div>
        `;
      }

      headerHtml += `
        <div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">&#9878;</span>
            <span class="font-semibold text-yellow-800">Tie Detected - Admin Resolution Required</span>
          </div>
          ${clearWinnersHtml}
          <p class="text-sm text-yellow-700 mb-3">
            ${data.tiedCandidates.length} candidates tied with ${data.tiedCandidates[0]?.voteCount || 0} votes each.
            Select ${seatsToResolve} winner${seatsToResolve !== 1 ? 's' : ''} to fill the remaining seat${seatsToResolve !== 1 ? 's' : ''}.
          </p>
          <div class="space-y-2 mb-3" id="sim-tie-candidates-list">
            ${data.tiedCandidates.map(c => `
              <label class="flex items-center gap-2 p-2 bg-white rounded border border-yellow-200 cursor-pointer hover:bg-yellow-100">
                <input type="checkbox" name="sim-tie-winner" value="${c.delegateId}" class="sim-tie-winner-checkbox rounded border-gray-300 text-legend-blue focus:ring-legend-blue">
                <span class="font-medium">${escapeHtml((c.delegate?.firstName || '') + ' ' + (c.delegate?.lastName || ''))}</span>
                <span class="text-gray-500">(${c.voteCount} votes, ${c.percentage?.toFixed(1) || 0}%)</span>
              </label>
            `).join('')}
          </div>
          <div class="flex items-center justify-between">
            <span id="sim-tie-selection-count" class="text-sm text-yellow-700">Select ${seatsToResolve}</span>
            <button id="sim-resolve-tie-btn" class="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-1 px-3 rounded-lg shadow transition text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled data-seats-to-resolve="${seatsToResolve}">
              Resolve Tie
            </button>
          </div>
        </div>
      `;
    } else if (data.tieResolution && !data.hasTie) {
      // Tie was resolved - show indicator
      headerHtml += `
        <div class="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-blue-600">&#10003;</span>
              <span class="font-medium text-blue-800">Tie resolved (${data.tieResolution.method || 'admin choice'})</span>
            </div>
            <button id="sim-clear-tie-btn" class="text-blue-600 hover:text-blue-800 text-sm underline">
              Clear
            </button>
          </div>
        </div>
      `;
    }

    // Only show winners/leaders if there's no unresolved tie
    // Check election status - only show "Winner" for closed elections, "Leading" for active
    const electionStatus = data.election?.status || 'active';
    const isElectionClosed = electionStatus === 'closed' || electionStatus === 'completed';

    // For blanket primaries, show advancers instead of winners
    // Handle ties at the advancement cutoff (e.g., positions 4 and 5 tied in a top-4 scenario)
    if (data.isBlanketPrimary && data.blanketPrimaryHasTie && data.blanketTiedCandidates && data.blanketTiedCandidates.length > 0) {
      // Show clear advancers first if any
      let clearAdvancersHtml = '';
      if (data.blanketClearAdvancers && data.blanketClearAdvancers.length > 0) {
        clearAdvancersHtml = `
          <div class="mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
            <p class="text-sm font-medium text-purple-800 mb-2">&#10003; Clear Advancers (${data.blanketClearAdvancers.length} of ${data.blanketAdvancementCount} spots):</p>
            ${data.blanketClearAdvancers.map(a => {
              const advancerName = a.name || `${a.delegate?.firstName || ''} ${a.delegate?.lastName || ''}`.trim();
              const partyBadge = a.partyName
                ? `<span class="bg-purple-200 text-purple-700 text-xs px-1.5 py-0.5 rounded ml-1">${a.partyName}</span>`
                : '';
              return `<p class="text-sm text-purple-700 ml-4">• ${advancerName}${partyBadge} (${a.voteCount} votes)</p>`;
            }).join('')}
          </div>
        `;
      }

      headerHtml += `
        <div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">&#9878;</span>
            <span class="font-semibold text-yellow-800">Tie at Advancement Cutoff - Resolution Required</span>
          </div>
          ${clearAdvancersHtml}
          <p class="text-sm text-yellow-700 mb-3">
            ${data.blanketTiedCandidates.length} candidates tied with ${data.blanketTiedCandidates[0]?.voteCount || 0} votes each.
            Select ${data.blanketSlotsToResolve} to fill the remaining advancement spot${data.blanketSlotsToResolve !== 1 ? 's' : ''}.
          </p>
          <div class="space-y-2 mb-3" id="sim-blanket-tie-candidates-list">
            ${data.blanketTiedCandidates.map(c => {
              const candidateName = c.name || `${c.delegate?.firstName || ''} ${c.delegate?.lastName || ''}`.trim();
              const partyBadge = c.partyName
                ? `<span class="bg-yellow-200 text-yellow-700 text-xs px-1.5 py-0.5 rounded ml-1">${c.partyName}</span>`
                : '';
              return `
                <label class="flex items-center gap-2 p-2 bg-white rounded border border-yellow-200 cursor-pointer hover:bg-yellow-100">
                  <input type="checkbox" name="sim-blanket-tie-winner" value="${c.delegateId}" class="sim-blanket-tie-checkbox rounded border-gray-300 text-legend-blue focus:ring-legend-blue">
                  <span class="font-medium">${escapeHtml(candidateName)}</span>
                  ${partyBadge}
                  <span class="text-gray-500">(${c.voteCount} votes, ${c.percentage || 0}%)</span>
                </label>
              `;
            }).join('')}
          </div>
          <div class="flex items-center justify-between">
            <span id="sim-blanket-tie-selection-count" class="text-sm text-yellow-700">Select ${data.blanketSlotsToResolve}</span>
            <button id="sim-resolve-blanket-tie-btn" class="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-1 px-3 rounded-lg shadow transition text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled data-slots-to-resolve="${data.blanketSlotsToResolve}">
              Resolve Tie
            </button>
          </div>
        </div>
      `;
    } else if (data.isBlanketPrimary && data.advancers && data.advancers.length > 0) {
      // No tie - show advancers normally
      // Use blanketAdvancementCount from API to show target (e.g., "Top 4")
      const advancementTarget = data.blanketAdvancementCount || data.advancers.length;
      // Show "Would Advance" when voting is in progress, "Advancing" when completed
      const advanceLabel = isElectionClosed
        ? `Advancing to General (Top ${advancementTarget})`
        : `Would Advance to General (Top ${advancementTarget})`;
      const bgColor = isElectionClosed ? 'purple' : 'blue';
      const icon = isElectionClosed ? '&#127919;' : '&#9650;'; // Target vs up arrow
      const statusBadge = !isElectionClosed
        ? '<span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded ml-2">Voting in progress</span>'
        : '';

      headerHtml += `
        <div class="mt-3 bg-${bgColor}-50 border border-${bgColor}-200 rounded-lg p-3">
          <div class="flex items-center gap-2 text-${bgColor}-800 mb-2">
            <span class="text-lg">${icon}</span>
            <span class="font-semibold">${advanceLabel}</span>
            ${statusBadge}
          </div>
          ${data.advancers.map(a => {
            const advancerName = a.name || `${a.delegate?.firstName || ''} ${a.delegate?.lastName || ''}`.trim();
            const partyBadge = a.partyName
              ? `<span class="bg-${bgColor}-200 text-${bgColor}-700 text-xs px-1.5 py-0.5 rounded ml-1">${a.partyName}</span>`
              : '';
            return `<p class="text-sm text-${bgColor}-700">
              ${advancerName}${partyBadge} - ${a.voteCount} votes (${a.percentage || 0}%)
            </p>`;
          }).join('')}
        </div>
      `;
    } else if (!data.hasTie && data.winners && data.winners.length > 0) {
      // Multi-seat election support
      const seatCount = data.seatCount || 1;
      const winnerLabel = isElectionClosed
        ? (seatCount > 1 ? `Winners (${data.winners.length} of ${seatCount} seats)` : 'Winner')
        : (seatCount > 1 ? `Leading (${data.winners.length} of ${seatCount} seats)` : 'Current Leader');
      const bgColor = isElectionClosed ? 'green' : 'blue';
      const icon = isElectionClosed ? '&#127942;' : '&#9650;'; // Trophy vs up arrow

      headerHtml += `
        <div class="mt-3 bg-${bgColor}-50 border border-${bgColor}-200 rounded-lg p-3">
          <div class="flex items-center gap-2 text-${bgColor}-800 mb-2">
            <span class="text-lg">${icon}</span>
            <span class="font-semibold">${winnerLabel}</span>
            ${!isElectionClosed ? '<span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded ml-2">Voting in progress</span>' : ''}
          </div>
          ${data.winners.map(w => {
            const winnerParty = w.party?.party?.name || 'Independent';
            return `<p class="text-sm text-${bgColor}-700">
              ${w.delegate?.firstName} ${w.delegate?.lastName} (${winnerParty}) - ${w.voteCount} votes (${w.percentage?.toFixed(1) || ((w.voteCount / (data.totalVotes || data.totalVoters || 1)) * 100).toFixed(1)}%)
            </p>`;
          }).join('')}
        </div>
      `;
    } else if (!data.hasTie && data.winner) {
      // Backwards compatibility for single winner
      const winnerParty = data.winner.party?.party?.name || 'Independent';
      const bgColor = isElectionClosed ? 'green' : 'blue';
      const icon = isElectionClosed ? '&#127942;' : '&#9650;';
      const label = isElectionClosed ? 'Winner' : 'Current Leader';

      headerHtml += `
        <div class="mt-3 bg-${bgColor}-50 border border-${bgColor}-200 rounded-lg p-3">
          <div class="flex items-center gap-2 text-${bgColor}-800">
            <span class="text-lg">${icon}</span>
            <span class="font-semibold">${label}: ${data.winner.delegate?.firstName} ${data.winner.delegate?.lastName}</span>
            ${!isElectionClosed ? '<span class="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded ml-2">Voting in progress</span>' : ''}
          </div>
          <p class="text-sm text-${bgColor}-700 mt-1">
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

    // Build a set of winner delegateIds for multi-seat support
    const winnerIds = new Set(
      (data.winners || []).map(w => w.delegateId)
    );
    // Fall back to single winner for backwards compatibility
    if (winnerIds.size === 0 && data.winner) {
      winnerIds.add(data.winner.delegateId);
    }

    // Build HTML for each candidate
    const resultItems = data.results.map((r, i) => {
      const percentage = totalVotes > 0 ? ((r.voteCount / totalVotes) * 100).toFixed(1) : 0;
      const barWidth = maxVotes > 0 ? ((r.voteCount / maxVotes) * 100) : 0;
      const partyName = r.party?.party?.name || 'Independent';
      const partyColor = partyName.toLowerCase().includes('federalist') ? 'blue' :
                         partyName.toLowerCase().includes('nationalist') ? 'red' : 'gray';
      const isWinner = winnerIds.has(r.delegateId);

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

    // Add tie resolution handlers if present
    const tieCheckboxes = resultsContainer.querySelectorAll('.sim-tie-winner-checkbox');
    const resolveTieBtn = resultsContainer.querySelector('#sim-resolve-tie-btn');
    const selectionCountEl = resultsContainer.querySelector('#sim-tie-selection-count');

    if (tieCheckboxes.length > 0 && resolveTieBtn) {
      // Use seatsToResolve from button data attribute (number of seats that need tie resolution)
      const seatsToResolve = parseInt(resolveTieBtn.dataset.seatsToResolve) || 1;

      tieCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const selected = resultsContainer.querySelectorAll('.sim-tie-winner-checkbox:checked').length;
          if (selectionCountEl) {
            selectionCountEl.textContent = `${selected} of ${seatsToResolve} selected`;
          }
          resolveTieBtn.disabled = selected !== seatsToResolve;
        });
      });

      resolveTieBtn.addEventListener('click', () => resolveSimTie(data.election.id, seatsToResolve));
    }

    // Add clear tie resolution handler if present
    const clearTieBtn = resultsContainer.querySelector('#sim-clear-tie-btn');
    if (clearTieBtn) {
      clearTieBtn.addEventListener('click', () => clearSimTieResolution(data.election.id));
    }

    // Add blanket primary tie resolution handlers if present
    const blanketTieCheckboxes = resultsContainer.querySelectorAll('.sim-blanket-tie-checkbox');
    const resolveBlanketTieBtn = resultsContainer.querySelector('#sim-resolve-blanket-tie-btn');
    const blanketSelectionCountEl = resultsContainer.querySelector('#sim-blanket-tie-selection-count');

    if (blanketTieCheckboxes.length > 0 && resolveBlanketTieBtn) {
      const slotsToResolve = parseInt(resolveBlanketTieBtn.dataset.slotsToResolve) || 1;

      blanketTieCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const selected = resultsContainer.querySelectorAll('.sim-blanket-tie-checkbox:checked').length;
          if (blanketSelectionCountEl) {
            blanketSelectionCountEl.textContent = `${selected} of ${slotsToResolve} selected`;
          }
          resolveBlanketTieBtn.disabled = selected !== slotsToResolve;
        });
      });

      // Reuse the same tie resolution endpoint - it works for blanket primaries too
      // Pass blanket-specific selectors
      resolveBlanketTieBtn.addEventListener('click', () => resolveSimTie(
        data.election.id,
        slotsToResolve,
        '.sim-blanket-tie-checkbox:checked',
        '#sim-resolve-blanket-tie-btn'
      ));
    }

    document.getElementById('results-section').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load results:', err);
  }
}

async function createRunoffElection() {
  const state = getResultsState();
  if (!state.currentElection) {
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

    const res = await fetch(`${window.API_URL}/elections/${state.currentElection.id}/runoff`, {
      method: 'POST',
      headers,
      credentials: 'include',
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

// Resolve a tie in simulation results
// checkboxSelector defaults to regular tie checkboxes, but can be overridden for blanket ties
async function resolveSimTie(electionId, seatsToResolve, checkboxSelector = '.sim-tie-winner-checkbox:checked', btnSelector = '#sim-resolve-tie-btn') {
  const resultsContainer = document.getElementById('results-list');
  const selectedCheckboxes = resultsContainer.querySelectorAll(checkboxSelector);
  const selectedWinnerIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

  if (selectedWinnerIds.length !== seatsToResolve) {
    showError(`Please select exactly ${seatsToResolve} candidate${seatsToResolve !== 1 ? 's' : ''} to fill remaining spots`);
    return;
  }

  const btn = resultsContainer.querySelector(btnSelector);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Resolving...';
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/elections/${electionId}/resolve-tie`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ selectedWinnerIds }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to resolve tie');
    }

    const result = await res.json();
    showSuccess(result.message || 'Tie resolved!');

    // Refresh results
    await loadResults(electionId);

  } catch (err) {
    showError(err.message || 'Failed to resolve tie');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Resolve Tie';
    }
  }
}

// Clear a tie resolution in simulation
async function clearSimTieResolution(electionId) {
  try {
    const headers = {
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/elections/${electionId}/resolve-tie`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to clear tie resolution');
    }

    showSuccess('Tie resolution cleared');

    // Refresh results
    await loadResults(electionId);

  } catch (err) {
    showError(err.message || 'Failed to clear tie resolution');
  }
}

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

/**
 * Load and display results for combined primaries (multiple elections)
 * Shows results for each party side-by-side or stacked
 * @param {Array} elections - Array of election objects with _resolvedPartyName
 */
async function loadCombinedResults(elections) {
  const resultsContainer = document.getElementById('results-list');
  if (!elections || elections.length === 0) {
    resultsContainer.innerHTML = '<p class="text-gray-500 italic">No elections to display</p>';
    return;
  }

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Load results for all elections in parallel
    const resultsPromises = elections.map(async (election) => {
      const res = await fetch(`${window.API_URL}/elections/${election.id}/results`, { headers });
      if (!res.ok) throw new Error(`Failed to load results for election ${election.id}`);
      const data = await res.json();
      return {
        election,
        partyName: election._resolvedPartyName || election.party?.party?.name || election.party?.name || 'Party',
        data
      };
    });

    const allResults = await Promise.all(resultsPromises);

    // Build combined results HTML
    let html = `
      <div class="mb-4 pb-3 border-b">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-legend-blue">Combined Primary Results</span>
          <span class="text-sm text-gray-500">Showing ${elections.length} party primaries</span>
        </div>
      </div>
    `;

    // Create a grid for side-by-side display on larger screens
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';

    for (const { election, partyName, data } of allResults) {
      const partyColor = partyName.toLowerCase().includes('federalist') ? 'blue' :
                         partyName.toLowerCase().includes('nationalist') ? 'red' : 'gray';

      const method = data.election?.method || 'plurality';
      const methodLabels = {
        'plurality': 'Plurality',
        'majority': 'Majority',
        'ranked': 'Ranked Choice'
      };

      html += `
        <div class="bg-${partyColor}-50 border-2 border-${partyColor}-200 rounded-xl p-4">
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-${partyColor}-200">
            <h3 class="font-bold text-${partyColor}-800 text-lg">${escapeHtml(partyName)}</h3>
            <span class="text-xs bg-${partyColor}-100 text-${partyColor}-700 px-2 py-1 rounded">
              ${methodLabels[method] || method}
            </span>
          </div>
      `;

      if (!data.results || data.results.length === 0) {
        html += '<p class="text-gray-500 italic text-sm">No votes yet</p>';
      } else {
        const totalVotes = data.totalVotes || data.totalVoters || 1;
        const maxVotes = Math.max(...data.results.map(r => r.voteCount));
        const electionStatus = data.election?.status || 'active';
        const isElectionClosed = electionStatus === 'closed' || electionStatus === 'completed';

        // Show winner/leader info
        const winnerIds = new Set((data.winners || []).map(w => w.delegateId));
        if (winnerIds.size === 0 && data.winner) {
          winnerIds.add(data.winner.delegateId);
        }

        if (winnerIds.size > 0) {
          const bgColor = isElectionClosed ? 'green' : 'blue';
          const label = isElectionClosed ? 'Winner' : 'Leading';
          const winners = data.winners || (data.winner ? [data.winner] : []);
          html += `
            <div class="bg-${bgColor}-100 border border-${bgColor}-200 rounded-lg p-2 mb-3">
              <div class="flex items-center gap-2 text-${bgColor}-800">
                <span class="text-sm">${isElectionClosed ? '🏆' : '▲'}</span>
                <span class="font-semibold text-sm">${label}: ${winners.map(w => `${w.delegate?.firstName} ${w.delegate?.lastName}`).join(', ')}</span>
              </div>
            </div>
          `;
        }

        html += `<p class="text-sm text-gray-600 mb-2">Total votes: ${totalVotes}</p>`;
        html += '<div class="space-y-2">';

        // Render each candidate
        for (const r of data.results) {
          const percentage = totalVotes > 0 ? ((r.voteCount / totalVotes) * 100).toFixed(1) : 0;
          const barWidth = maxVotes > 0 ? ((r.voteCount / maxVotes) * 100) : 0;
          const isWinner = winnerIds.has(r.delegateId);

          html += `
            <div class="bg-white rounded-lg p-2 ${isWinner ? 'ring-2 ring-legend-gold' : ''}">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-1">
                  ${isWinner ? '<span class="text-legend-gold text-xs">★</span>' : ''}
                  <span class="font-medium text-sm">${r.delegate?.firstName} ${r.delegate?.lastName}</span>
                </div>
                <div class="text-right">
                  <span class="font-bold">${r.voteCount}</span>
                  <span class="text-xs text-gray-500 ml-1">(${percentage}%)</span>
                </div>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="result-bar bg-${partyColor}-500 h-2 rounded-full" data-width="${barWidth}"></div>
              </div>
            </div>
          `;
        }

        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';

    resultsContainer.innerHTML = html;

    // Apply widths via JavaScript to avoid CSP inline style issues
    const bars = resultsContainer.querySelectorAll('.result-bar');
    bars.forEach(bar => {
      const width = bar.getAttribute('data-width');
      bar.style.width = width + '%';
    });

    document.getElementById('results-section').classList.remove('hidden');
  } catch (err) {
    console.error('Failed to load combined results:', err);
    resultsContainer.innerHTML = `<p class="text-red-500">Failed to load results: ${err.message}</p>`;
  }
}

// Export for Node testing and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadResults,
    loadCombinedResults,
    createRunoffElection,
    resolveSimTie,
    clearSimTieResolution,
    openAuditModal,
    closeAuditModal,
  };
} else {
  window.loadResults = loadResults;
  window.loadCombinedResults = loadCombinedResults;
  window.createRunoffElection = createRunoffElection;
  window.resolveSimTie = resolveSimTie;
  window.clearSimTieResolution = clearSimTieResolution;
  window.openAuditModal = openAuditModal;
  window.closeAuditModal = closeAuditModal;
}
