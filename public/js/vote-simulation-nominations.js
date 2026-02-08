/**
 * vote-simulation-nominations.js
 * Handles nomination functionality for the vote simulation page.
 * Depends on: vote-simulation-utils.js, vote-simulation-state.js (via window)
 */

// Uses shared state from window.voteSimState
function getNomState() {
  return window.voteSimState || {};
}

async function loadNomProgramYears() {
  const state = getNomState();
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const res = await fetch(`${window.API_URL}/programs/${state.currentProgramId}/years`, { headers });
    if (!res.ok) throw new Error('Failed to load years');

    const years = await res.json();
    const nomYearSelect = document.getElementById('nom-year-select');
    nomYearSelect.innerHTML = '<option value="">Select a year...</option>';

    years.sort((a, b) => b.year - a.year);
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y.id;
      opt.textContent = y.year;
      nomYearSelect.appendChild(opt);
    });

    // Auto-select most recent year
    if (years.length > 0) {
      nomYearSelect.value = years[0].id;
      await onNomYearChange();
    }
  } catch (err) {
    showError('Failed to load program years for nominations: ' + err.message);
  }
}

async function onNomYearChange() {
  const state = getNomState();
  const nomYearSelect = document.getElementById('nom-year-select');
  const nomElectionSelect = document.getElementById('nom-election-select');
  const nominationForm = document.getElementById('nomination-form');
  const noNominationsWarning = document.getElementById('no-nominations-warning');

  state.nomProgramYearId = nomYearSelect.value;
  nomElectionSelect.innerHTML = '<option value="">Loading elections...</option>';
  nominationForm.classList.add('hidden');
  noNominationsWarning.classList.add('hidden');

  if (!state.nomProgramYearId) {
    nomElectionSelect.innerHTML = '<option value="">Select year first...</option>';
    document.getElementById('nomination-count').textContent = '0 elections open for nominations';
    // Clear grouping types dropdown
    const groupingTypeSelect = document.getElementById('bulk-grouping-type');
    if (groupingTypeSelect) groupingTypeSelect.innerHTML = '<option value="">Level...</option>';
    return;
  }

  // Load grouping types for the bulk operations dropdown
  await loadGroupingTypes();

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    // Get only elections in nomination status
    const res = await fetch(`${window.API_URL}/program-years/${state.nomProgramYearId}/elections?status=nomination`, { headers });
    if (!res.ok) throw new Error('Failed to load elections');

    const elections = await res.json();
    nomElectionSelect.innerHTML = '<option value="">Select an election...</option>';

    document.getElementById('nomination-count').textContent = `${elections.length} election${elections.length !== 1 ? 's' : ''} open for nominations`;

    if (elections.length === 0) {
      nomElectionSelect.innerHTML = '<option value="">No elections open for nominations</option>';
      noNominationsWarning.classList.remove('hidden');
      return;
    }

    elections.forEach(e => {
      const posName = e.position?.position?.name
        || e.position?.name
        || e.positionName
        || 'Unknown Position';
      const groupName = e.grouping?.name
        || e.groupingName
        || 'Unknown Grouping';
      const partyInfo = e.party?.party?.name ? ` - ${e.party.party.name}` : '';
      const typeLabel = e.electionType === 'primary' ? ' (Primary)' : '';
      const seatCount = e.position?.position?.seatCount || 1;
      const seatInfo = seatCount > 1 ? ` [${seatCount} seats]` : '';

      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${posName}${seatInfo} - ${groupName}${partyInfo}${typeLabel} (${e._count?.candidates || 0} candidates)`;
      nomElectionSelect.appendChild(opt);
    });
  } catch (err) {
    showError('Failed to load elections for nominations: ' + err.message);
  }
}

async function onNomElectionChange() {
  const nomElectionSelect = document.getElementById('nom-election-select');
  const nominationForm = document.getElementById('nomination-form');
  const electionId = nomElectionSelect.value;
  nominationForm.classList.add('hidden');

  if (!electionId) return;

  await loadNominationData(electionId);
}

async function loadNominationData(electionId) {
  const state = getNomState();
  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    // Get eligible delegates
    const eligibleRes = await fetch(`${window.API_URL}/elections/${electionId}/eligible-delegates`, { headers });
    if (!eligibleRes.ok) throw new Error('Failed to load eligible delegates');
    state.nomEligibleDelegates = await eligibleRes.json();

    // Get current candidates
    const candidatesRes = await fetch(`${window.API_URL}/elections/${electionId}/candidates`, { headers });
    if (!candidatesRes.ok) throw new Error('Failed to load candidates');
    state.nomCurrentCandidates = await candidatesRes.json();

    // Store election ID
    state.nomElection = { id: parseInt(electionId) };

    // Update stats
    document.getElementById('nom-candidates-count').textContent = state.nomCurrentCandidates.length;
    document.getElementById('nom-eligible-count').textContent = state.nomEligibleDelegates.length;

    // Populate delegate dropdown - filter out already nominated
    const delegateSelect = document.getElementById('nom-delegate-select');
    delegateSelect.innerHTML = '<option value="">Select a delegate...</option>';

    const nominatedIds = new Set(state.nomCurrentCandidates.map(c => c.delegateId));
    const availableDelegates = state.nomEligibleDelegates.filter(d => !nominatedIds.has(d.id) && !d.isCandidate);

    availableDelegates.forEach(d => {
      const partyName = d.party?.party?.name || 'No Party';
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.firstName} ${d.lastName} (${partyName})`;
      delegateSelect.appendChild(opt);
    });

    // Render current candidates
    renderNominees();

    // Show form
    document.getElementById('nomination-form').classList.remove('hidden');
  } catch (err) {
    showError('Failed to load nomination data: ' + err.message);
  }
}

function renderNominees() {
  const state = getNomState();
  const container = document.getElementById('nominees-list');

  if (state.nomCurrentCandidates.length === 0) {
    container.innerHTML = '<p class="text-gray-500 italic text-sm">No candidates yet</p>';
    return;
  }

  container.innerHTML = state.nomCurrentCandidates.map(c => {
    const partyName = c.party?.party?.name || 'No Party';
    const partyColor = partyName.toLowerCase().includes('federalist') ? 'blue' :
                       partyName.toLowerCase().includes('nationalist') ? 'red' : 'gray';
    return `
      <div class="flex items-center justify-between bg-${partyColor}-50 rounded px-3 py-2 text-sm">
        <span>${c.delegate?.firstName} ${c.delegate?.lastName} <span class="text-${partyColor}-600">(${partyName})</span></span>
        <span class="text-xs text-gray-500">${c.status}</span>
      </div>
    `;
  }).join('');
}

async function addNomination() {
  const state = getNomState();
  const delegateId = document.getElementById('nom-delegate-select').value;
  if (!delegateId || !state.nomElection) {
    showError('Please select a delegate to nominate');
    return;
  }

  const btn = document.getElementById('add-nomination-btn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/elections/${state.nomElection.id}/candidates`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ delegateId: parseInt(delegateId) }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to add nomination');
    }

    showSuccess('Candidate nominated successfully');
    await loadNominationData(state.nomElection.id);
    // Refresh the election dropdown to update candidate count
    await onNomYearChange();
    // Re-select the current election
    document.getElementById('nom-election-select').value = state.nomElection.id;
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Nomination';
  }
}

async function autoNominate() {
  const state = getNomState();
  const count = parseInt(document.getElementById('auto-nom-count').value) || 3;
  if (!state.nomElection) {
    showError('Please select an election first');
    return;
  }

  const btn = document.getElementById('auto-nominate-btn');
  btn.disabled = true;
  btn.textContent = 'Nominating...';

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    // Get available delegates (not already nominated)
    const nominatedIds = new Set(state.nomCurrentCandidates.map(c => c.delegateId));
    const available = state.nomEligibleDelegates.filter(d => !nominatedIds.has(d.id) && !d.isCandidate);

    if (available.length === 0) {
      showError('No eligible delegates available for nomination');
      return;
    }

    // Shuffle and pick random delegates
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const toNominate = shuffled.slice(0, Math.min(count, shuffled.length));

    let successCount = 0;
    let errors = [];

    for (const delegate of toNominate) {
      try {
        const res = await fetch(`${window.API_URL}/elections/${state.nomElection.id}/candidates`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ delegateId: delegate.id }),
        });

        if (res.ok) {
          successCount++;
        } else {
          const error = await res.json().catch(() => ({}));
          errors.push(`${delegate.firstName}: ${error.error || 'Failed'}`);
        }
      } catch {
        errors.push(`${delegate.firstName}: Network error`);
      }
    }

    if (successCount > 0) {
      showSuccess(`Auto-nominated ${successCount} candidate${successCount !== 1 ? 's' : ''}`);
    }
    if (errors.length > 0) {
      console.warn('Auto-nomination errors:', errors);
    }

    // Check if we should auto-close after nominating
    const autoClose = document.getElementById('auto-close-after-nom')?.checked;
    if (autoClose && successCount > 0) {
      await closeNomination();
    } else {
      await loadNominationData(state.nomElection.id);
      await onNomYearChange();
      document.getElementById('nom-election-select').value = state.nomElection.id;
    }
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Auto-Nominate';
  }
}

async function closeNomination() {
  const state = getNomState();
  if (!state.nomElection) {
    showError('Please select an election first');
    return;
  }

  const btn = document.getElementById('close-nomination-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Closing...';
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/program-years/${state.nomProgramYearId}/elections/close-nominations`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ electionIds: [state.nomElection.id] }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to close nomination');
    }

    const result = await res.json();
    showSuccess(result.message || 'Nomination closed');

    // Refresh the list
    await onNomYearChange();
  } catch (err) {
    showError(err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Close This Nomination';
    }
  }
}

async function clearNominees() {
  const state = getNomState();
  if (!state.nomElection) {
    showError('Please select an election first');
    return;
  }

  if (state.nomCurrentCandidates.length === 0) {
    showError('This election has no nominees to clear');
    return;
  }

  const btn = document.getElementById('clear-nominees-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Clearing...';
  }

  try {
    const headers = {
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/elections/${state.nomElection.id}/candidates`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to clear nominees');
    }

    const result = await res.json();
    showSuccess(`Cleared ${result.deleted} nominee${result.deleted !== 1 ? 's' : ''} from election`);

    // Refresh the list
    await loadNominationData(state.nomElection.id);
    await onNomYearChange();
    // Re-select the current election
    document.getElementById('nom-election-select').value = state.nomElection.id;
  } catch (err) {
    showError(err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Clear Nominees';
    }
  }
}

async function closeAllNominations() {
  const state = getNomState();
  if (!state.nomProgramYearId) {
    showError('Please select a program year first');
    return;
  }

  const btn = document.getElementById('close-all-nominations-btn');
  btn.disabled = true;
  btn.textContent = 'Closing...';

  // Show progress
  clearBulkProgressLog();
  updateBulkProgress(0, 1, 'Closing all nominations...');

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/program-years/${state.nomProgramYearId}/elections/close-nominations`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({}), // No params = close all
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to close nominations');
    }

    const result = await res.json();
    updateBulkProgress(1, 1, `✓ ${result.message || 'All nominations closed'}`);
    showSuccess(result.message || 'All nominations closed');

    // Refresh the list
    await onNomYearChange();
  } catch (err) {
    updateBulkProgress(0, 1, `✗ Error: ${err.message}`);
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Close All';
  }
}

async function startAllElections() {
  const state = getNomState();
  if (!state.nomProgramYearId) {
    showError('Please select a program year first');
    return;
  }

  const btn = document.getElementById('start-all-elections-btn');
  btn.disabled = true;
  btn.textContent = 'Starting...';

  // Show progress
  clearBulkProgressLog();
  updateBulkProgress(0, 1, 'Starting all scheduled elections...');

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/program-years/${state.nomProgramYearId}/elections/start-all`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ skipNoCandidates: true }), // Convert elections with no candidates to appointed
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to start elections');
    }

    const result = await res.json();
    updateBulkProgress(1, 1, `✓ ${result.message || 'All elections started'}`);
    showSuccess(result.message || 'All elections started');

    // Refresh the list
    await onNomYearChange();

    // Also refresh voting section if available
    if (typeof onYearChange === 'function') {
      await onYearChange();
    }
  } catch (err) {
    updateBulkProgress(0, 1, `✗ Error: ${err.message}`);
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Start All';
  }
}

async function loadGroupingTypes() {
  const state = getNomState();
  const groupingTypeSelect = document.getElementById('bulk-grouping-type');
  if (!groupingTypeSelect) return;

  groupingTypeSelect.innerHTML = '<option value="">Loading...</option>';

  try {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
    const res = await fetch(`${window.API_URL}/programs/${state.currentProgramId}/grouping-types`, { headers });
    if (!res.ok) throw new Error('Failed to load grouping types');

    const types = await res.json();
    groupingTypeSelect.innerHTML = '<option value="">Select level...</option>';

    // Sort by levelOrder
    types.sort((a, b) => (a.levelOrder || 999) - (b.levelOrder || 999));

    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.defaultName || t.name || `Level ${t.levelOrder}`;
      groupingTypeSelect.appendChild(opt);
    });
  } catch (err) {
    groupingTypeSelect.innerHTML = '<option value="">Error loading</option>';
    console.error('Failed to load grouping types:', err);
  }
}

async function openElectionsAtLevel() {
  const state = getNomState();
  if (!state.nomProgramYearId) {
    showError('Please select a program year first');
    return;
  }

  const groupingTypeSelect = document.getElementById('bulk-grouping-type');
  const groupingTypeId = groupingTypeSelect?.value;
  const electionTypeSelect = document.getElementById('bulk-election-type');
  const electionType = electionTypeSelect?.value || 'primary';

  if (!groupingTypeId) {
    showError('Please select a grouping level');
    return;
  }

  const btn = document.getElementById('open-elections-btn');
  btn.disabled = true;
  btn.textContent = 'Opening...';

  // Show progress
  const typeLabel = electionType === 'primary' ? 'primary' : 'general';
  clearBulkProgressLog();
  updateBulkProgress(0, 1, `Opening ${typeLabel} nominations at ${groupingTypeSelect.selectedOptions[0]?.text || 'selected'} level...`);

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/program-years/${state.nomProgramYearId}/elections/open-level`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        groupingTypeId: parseInt(groupingTypeId),
        electionType: electionType,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to open elections');
    }

    const result = await res.json();
    const message = `Created ${result.created} election${result.created !== 1 ? 's' : ''}`;
    updateBulkProgress(1, 1, `✓ ${message}`);

    if (result.errors && result.errors.length > 0) {
      result.errors.forEach(err => {
        updateBulkProgress(1, 1, `⚠ ${err}`);
      });
    }

    showSuccess(message);

    // Refresh the elections list
    await onNomYearChange();
  } catch (err) {
    updateBulkProgress(0, 1, `✗ Error: ${err.message}`);
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Open Nominations';
  }
}

// Helper to update bulk progress UI
function updateBulkProgress(current, total, logMessage) {
  const progressSection = document.getElementById('bulk-progress');
  const progressCount = document.getElementById('bulk-progress-count');
  const progressBar = document.getElementById('bulk-progress-bar');
  const progressLog = document.getElementById('bulk-progress-log');

  if (progressSection) progressSection.classList.remove('hidden');
  if (progressCount) progressCount.textContent = `${current} / ${total} elections`;
  if (progressBar) progressBar.style.width = total > 0 ? `${(current / total) * 100}%` : '0%';

  if (progressLog && logMessage) {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('p');
    line.textContent = `[${timestamp}] ${logMessage}`;
    progressLog.appendChild(line);
    progressLog.scrollTop = progressLog.scrollHeight;
  }
}

function clearBulkProgressLog() {
  const progressLog = document.getElementById('bulk-progress-log');
  if (progressLog) {
    progressLog.innerHTML = '<p>[' + new Date().toLocaleTimeString() + '] Starting bulk operation...</p>';
  }
}

async function autoNominateAll() {
  const state = getNomState();
  if (!state.nomProgramYearId) {
    showError('Please select a program year first');
    return;
  }

  const btn = document.getElementById('auto-nominate-all-btn');
  btn.disabled = true;
  btn.textContent = 'Working...';

  // Show and clear progress log
  clearBulkProgressLog();
  updateBulkProgress(0, 0, null);

  // Max extra candidates (in addition to the guaranteed per seat)
  const maxExtra = parseInt(document.getElementById('bulk-nom-count').value) || 3;

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    updateBulkProgress(0, 0, 'Fetching elections open for nominations...');

    // Get all elections in nomination status
    const electionsRes = await fetch(`${window.API_URL}/program-years/${state.nomProgramYearId}/elections?status=nomination`, {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {},
    });
    if (!electionsRes.ok) throw new Error('Failed to load elections');

    const elections = await electionsRes.json();
    if (elections.length === 0) {
      updateBulkProgress(0, 0, '⚠ No elections open for nominations');
      showError('No elections open for nominations');
      return;
    }

    updateBulkProgress(0, elections.length, `Found ${elections.length} elections to process`);

    let totalNominated = 0;
    let electionsProcessed = 0;
    let electionsSkipped = 0;
    let errors = [];

    for (let i = 0; i < elections.length; i++) {
      const election = elections[i];
      const posName = election.position?.position?.name || 'Unknown Position';
      const groupName = election.grouping?.name || '';
      const partyName = election.party?.party?.name || '';
      const electionLabel = `${posName}${groupName ? ' - ' + groupName : ''}${partyName ? ' (' + partyName + ')' : ''}`;

      try {
        updateBulkProgress(i, elections.length, `Processing: ${electionLabel}`);

        // Get eligible delegates for this election
        const eligibleRes = await fetch(`${window.API_URL}/elections/${election.id}/eligible-delegates`, {
          headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {},
        });
        if (!eligibleRes.ok) {
          updateBulkProgress(i, elections.length, `⚠ Failed to get eligible delegates for ${electionLabel}`);
          continue;
        }

        const eligibleDelegates = await eligibleRes.json();

        // Get current candidates
        const candidatesRes = await fetch(`${window.API_URL}/elections/${election.id}/candidates`, {
          headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {},
        });
        const currentCandidates = candidatesRes.ok ? await candidatesRes.json() : [];

        // Filter available delegates
        const nominatedIds = new Set(currentCandidates.map(c => c.delegateId));
        const available = eligibleDelegates.filter(d => !nominatedIds.has(d.id) && !d.isCandidate);

        // Get seat count for this position (default 1)
        const seatCount = election.position?.position?.seatCount || 1;
        const needsMoreCandidates = currentCandidates.length < seatCount;

        if (available.length === 0) {
          if (needsMoreCandidates) {
            electionsSkipped++;
            const needed = seatCount - currentCandidates.length;
            updateBulkProgress(i, elections.length, `⚠ ${electionLabel}: No eligible delegates (need ${needed} more for ${seatCount} seats)`);
            errors.push(`${posName}: No eligible delegates (need ${needed} more)`);
          } else {
            updateBulkProgress(i, elections.length, `✓ ${electionLabel}: Already has ${currentCandidates.length} candidates`);
          }
          continue;
        }

        // Shuffle available delegates
        const shuffled = [...available].sort(() => Math.random() - 0.5);

        // Determine how many to nominate:
        // - Need at least 1 candidate per seat
        // - Plus random(0 to maxExtra) additional candidates
        const currentCount = currentCandidates.length;
        const minRequired = seatCount; // One nominee per seat
        const neededForMin = Math.max(0, minRequired - currentCount);
        const extraCount = Math.floor(Math.random() * (maxExtra + 1));
        let countToNominate = neededForMin + extraCount;

        // Cap at available delegates
        countToNominate = Math.min(countToNominate, shuffled.length);

        const toNominate = shuffled.slice(0, countToNominate);
        let nominatedThisElection = 0;

        for (const delegate of toNominate) {
          try {
            const res = await fetch(`${window.API_URL}/elections/${election.id}/candidates`, {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({ delegateId: delegate.id }),
            });

            if (res.ok) {
              totalNominated++;
              nominatedThisElection++;
            }
          } catch {
            // Silent fail for individual nominations
          }
        }

        if (nominatedThisElection > 0) {
          const seatInfo = seatCount > 1 ? ` (${seatCount} seats)` : '';
          updateBulkProgress(i + 1, elections.length, `✓ ${electionLabel}${seatInfo}: Added ${nominatedThisElection} nominee${nominatedThisElection !== 1 ? 's' : ''}`);
        }

        electionsProcessed++;
      } catch {
        errors.push(`Election ${election.id}: Failed to process`);
        updateBulkProgress(i, elections.length, `✗ ${electionLabel}: Failed to process`);
      }
    }

    // Final summary
    updateBulkProgress(elections.length, elections.length, '─'.repeat(40));
    let summaryMsg = `✓ Complete: ${totalNominated} candidates across ${electionsProcessed} elections`;
    if (electionsSkipped > 0) {
      summaryMsg += ` (${electionsSkipped} skipped)`;
    }
    updateBulkProgress(elections.length, elections.length, summaryMsg);

    let message = `Auto-nominated ${totalNominated} candidates across ${electionsProcessed} elections`;
    if (electionsSkipped > 0) {
      message += ` (${electionsSkipped} skipped - no eligible delegates)`;
    }
    showSuccess(message);

    if (errors.length > 0) {
      console.warn('Auto-nomination errors:', errors);
    }

    // Refresh the list
    await onNomYearChange();
  } catch (err) {
    updateBulkProgress(0, 0, `✗ Error: ${err.message}`);
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Nominate All';
  }
}

// Reset functionality
function showResetModal() {
  const state = getNomState();
  // Use the nomination year selector if it has a value
  const yearId = state.nomProgramYearId || state.currentProgramYearId;
  if (!yearId) {
    showError('Please select a program year first');
    return;
  }

  // Get year label
  const yearSelect = state.nomProgramYearId ? document.getElementById('nom-year-select') : document.getElementById('year-select');
  const selectedOption = yearSelect.querySelector(`option[value="${yearId}"]`);
  const yearLabel = selectedOption ? selectedOption.textContent : yearId;

  document.getElementById('reset-year-display').textContent = yearLabel;
  document.getElementById('reset-modal').classList.remove('hidden');
}

function hideResetModal() {
  document.getElementById('reset-modal').classList.add('hidden');
}

async function confirmReset() {
  const state = getNomState();
  const yearId = state.nomProgramYearId || state.currentProgramYearId;
  if (!yearId) {
    hideResetModal();
    showError('No program year selected');
    return;
  }

  const confirmBtn = document.getElementById('reset-confirm-btn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Deleting...';

  try {
    const headers = {
      ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
    };

    const res = await fetch(`${window.API_URL}/program-years/${yearId}/elections/reset`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to reset elections');
    }

    const result = await res.json();
    hideResetModal();
    showSuccess(`Reset complete: Deleted ${result.deleted.elections} elections, ${result.deleted.candidates} candidates, ${result.deleted.votes} votes`);

    // Refresh both sections
    await Promise.all([
      typeof onYearChange === 'function' ? onYearChange() : Promise.resolve(),
      onNomYearChange(),
    ]);
  } catch (err) {
    showError(err.message);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Yes, Delete Everything';
  }
}

// Export for Node testing and browser global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadNomProgramYears,
    onNomYearChange,
    onNomElectionChange,
    loadNominationData,
    renderNominees,
    addNomination,
    autoNominate,
    closeNomination,
    clearNominees,
    closeAllNominations,
    startAllElections,
    loadGroupingTypes,
    openElectionsAtLevel,
    autoNominateAll,
    showResetModal,
    hideResetModal,
    confirmReset,
  };
} else {
  window.loadNomProgramYears = loadNomProgramYears;
  window.onNomYearChange = onNomYearChange;
  window.onNomElectionChange = onNomElectionChange;
  window.loadNominationData = loadNominationData;
  window.renderNominees = renderNominees;
  window.addNomination = addNomination;
  window.autoNominate = autoNominate;
  window.closeNomination = closeNomination;
  window.clearNominees = clearNominees;
  window.closeAllNominations = closeAllNominations;
  window.startAllElections = startAllElections;
  window.loadGroupingTypes = loadGroupingTypes;
  window.openElectionsAtLevel = openElectionsAtLevel;
  window.autoNominateAll = autoNominateAll;
  window.showResetModal = showResetModal;
  window.hideResetModal = hideResetModal;
  window.confirmReset = confirmReset;
}
