/**
 * ============================================================================
 * VOTING PORTAL - SHARED CORE LOGIC
 * ============================================================================
 *
 * IMPORTANT: This file contains the core voting logic shared between:
 *   1. voting-portal.html (PUBLIC delegate portal - voter ID entry)
 *   2. voting-portal-admin.html (ADMIN portal - delegate dropdown)
 *
 * WHEN EDITING THIS FILE:
 *   - Test changes in BOTH the public and admin portals
 *   - The voting UI and behavior should be IDENTICAL in both
 *   - Only the voter identification method differs (voter ID vs dropdown)
 *
 * The entry point scripts (voting-portal-public.js and voting-portal-admin.js)
 * handle voter identification, then call initVotingPortal() from this file.
 * ============================================================================
 */

// Current state
let currentDelegateId = null;
let currentDelegateInfo = null;
let currentElections = [];
let allElections = []; // Unfiltered elections from API
let currentPrimaryModel = 'closed';
let currentAdvancementModel = 'top_2'; // For blanket primaries: top_2 or top_4_irv
let selectedPartyId = null; // For open/semi-open primary party selection
let selectedElection = null;
let selectedCandidateId = null;
let rcvRankings = []; // For ranked choice voting

// API URL from config
const API_URL = window.API_URL || 'http://localhost:3000';

/**
 * Initialize the voting portal with a specific delegate
 * Called by both public and admin portal entry scripts
 *
 * @param {number} delegateId - The delegate's database ID
 * @param {object} delegateInfo - Object with delegate details:
 *   { firstName, lastInitial, groupingName, partyName, partyColor }
 * @param {string|null} authToken - JWT token (null for public portal, token for admin)
 */
function initVotingPortal(delegateId, delegateInfo, authToken = null) {
  currentDelegateId = delegateId;
  currentDelegateInfo = delegateInfo;

  // Store auth token for API calls
  window._votingPortalAuthToken = authToken;

  // Hide voter ID section, show voting content
  const voterIdSection = document.getElementById('voter-id-section');
  const votingContent = document.getElementById('voting-portal-content');

  if (voterIdSection) voterIdSection.classList.add('hidden');
  if (votingContent) votingContent.classList.remove('hidden');

  // Display voter info
  displayVoterInfo(delegateInfo);

  // Load eligible elections
  loadEligibleElections();

  // Set up event listeners
  setupVotingEventListeners();
}

/**
 * Display the voter's information in the welcome banner
 */
function displayVoterInfo(info) {
  const voterName = document.getElementById('voter-name');
  const voterGrouping = document.getElementById('voter-grouping');
  const voterPartyBadge = document.getElementById('voter-party-badge');

  if (voterName) {
    voterName.textContent = `${info.firstName} ${info.lastInitial}.`;
  }

  if (voterGrouping) {
    voterGrouping.textContent = info.groupingName || '';
  }

  if (voterPartyBadge) {
    if (info.partyName) {
      voterPartyBadge.textContent = info.partyName;
      voterPartyBadge.style.backgroundColor = info.partyColor || '#6B7280';
      voterPartyBadge.classList.remove('hidden');
    } else {
      voterPartyBadge.classList.add('hidden');
    }
  }
}

/**
 * Load eligible elections for the current delegate
 */
async function loadEligibleElections() {
  const electionsList = document.getElementById('elections-list');
  const noElectionsMessage = document.getElementById('no-elections-message');

  if (electionsList) {
    electionsList.innerHTML = '<p class="text-gray-500 italic">Loading elections...</p>';
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add auth header if we have a token (admin portal)
    if (window._votingPortalAuthToken) {
      headers['Authorization'] = `Bearer ${window._votingPortalAuthToken}`;
    }

    const response = await fetch(`${API_URL}/delegates/${currentDelegateId}/eligible-elections`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to load elections');
    }

    const data = await response.json();
    allElections = data.elections || [];
    currentPrimaryModel = data.primaryModel || 'closed';
    currentAdvancementModel = data.advancementModel || 'top_2';

    // Check if we need party selection for open/semi-open primaries
    handlePrimaryModelSelection();

    renderElectionsList();
  } catch (err) {
    console.error('Error loading elections:', err);
    showError('Failed to load elections. Please try again.');
    if (electionsList) {
      electionsList.innerHTML = '<p class="text-red-500">Failed to load elections.</p>';
    }
  }
}

/**
 * Handle primary model selection for open/semi-open primaries
 * Shows party selection UI if needed, or filters directly for closed/blanket primaries
 * NOTE: Blanket primaries are now single elections with partyId=null (not combined per-party)
 */
function handlePrimaryModelSelection() {
  const partySelectionSection = document.getElementById('party-selection-section');
  const electionsSection = document.getElementById('elections-section');

  // Get unique parties from per-party primary elections (not blanket)
  const perPartyPrimaries = allElections.filter(e => e.electionType === 'primary' && e.partyId);
  const parties = [];
  const seenPartyIds = new Set();

  for (const election of perPartyPrimaries) {
    if (election.partyId && !seenPartyIds.has(election.partyId)) {
      seenPartyIds.add(election.partyId);
      parties.push({
        id: election.partyId,
        name: election.partyName,
        color: election.partyColor || '#6B7280',
      });
    }
  }

  // Blanket primaries are now single elections with partyId=null
  // Mark them for special rendering but don't combine anything
  if (currentPrimaryModel === 'blanket') {
    if (partySelectionSection) partySelectionSection.classList.add('hidden');
    selectedPartyId = null;

    // Mark blanket primaries (primary elections with partyId=null) for special rendering
    currentElections = allElections.map(e => {
      if (e.electionType === 'primary' && !e.partyId) {
        return { ...e, _isBlanketPrimary: true };
      }
      return e;
    });
    return;
  }

  // Jungle primaries (Louisiana style): no primaries, straight to general
  // Partisan positions will have general elections with partyId=null
  // Candidates show their party tags but all voters vote together
  if (currentPrimaryModel === 'jungle') {
    if (partySelectionSection) partySelectionSection.classList.add('hidden');
    selectedPartyId = null;

    // Mark jungle primaries (general elections with partyId=null for partisan positions)
    // Candidates have party info that should be displayed
    currentElections = allElections.map(e => {
      if (e.electionType === 'general' && !e.partyId) {
        return { ...e, _isJunglePrimary: true };
      }
      return e;
    });
    return;
  }

  // Check if we need party selection (open or semi_open with multiple parties)
  const needsPartySelection =
    (currentPrimaryModel === 'open' || currentPrimaryModel === 'semi_open') &&
    parties.length > 1;

  if (!needsPartySelection) {
    // Closed primary or only one party - show all elections
    if (partySelectionSection) partySelectionSection.classList.add('hidden');
    currentElections = allElections;
    selectedPartyId = null;
    return;
  }

  // For open/semi-open: check if delegate already voted in a party's primary
  // Once they vote in ANY primary, they're locked to that party for ALL primaries
  let lockedPartyId = null;
  if (currentPrimaryModel === 'open' || currentPrimaryModel === 'semi_open') {
    const votedPrimaryElection = primaryElections.find(e => e.hasVoted);
    if (votedPrimaryElection) {
      lockedPartyId = votedPrimaryElection.partyId;
    }
  }

  // Show party selection section
  if (partySelectionSection) {
    partySelectionSection.classList.remove('hidden');

    // Update description based on primary model
    const description = document.getElementById('party-selection-description');
    const lockedMessage = document.getElementById('party-selection-locked-message');

    // Both open and semi-open show locked message after first vote
    if (lockedPartyId) {
      if (description) description.classList.add('hidden');
      if (lockedMessage) {
        lockedMessage.classList.remove('hidden');
        const lockedParty = parties.find(p => p.id === lockedPartyId);
        lockedMessage.textContent = `You have already voted in the ${lockedParty?.name || 'a party\'s'} primary. You must continue voting in their primaries.`;
      }
    } else {
      // Show appropriate description based on model
      if (description) {
        if (currentPrimaryModel === 'open') {
          description.textContent = 'This is an Open Primary. Choose a party\'s primary to participate in. Once you vote, you\'ll be committed to that party\'s primaries.';
        } else {
          description.textContent = 'This is a Semi-Open Primary. Choose a party\'s primary to participate in. Once you vote, you\'ll be committed to that party\'s primaries.';
        }
        description.classList.remove('hidden');
      }
      if (lockedMessage) lockedMessage.classList.add('hidden');
    }

    // Render party buttons
    renderPartySelectionButtons(parties, lockedPartyId);
  }

  // If locked to a party, auto-select it
  if (lockedPartyId) {
    selectPartyForPrimary(lockedPartyId);
  } else {
    // No party selected yet - hide elections until one is chosen
    currentElections = allElections.filter(e => e.electionType !== 'primary');
    if (electionsSection) {
      // Show general elections only
      const electionsHeader = electionsSection.querySelector('h3');
      if (electionsHeader && currentElections.length > 0) {
        electionsHeader.textContent = 'General Elections';
      }
    }
  }
}

/**
 * Render party selection buttons
 */
function renderPartySelectionButtons(parties, lockedPartyId) {
  const buttonsContainer = document.getElementById('party-selection-buttons');
  if (!buttonsContainer) return;

  buttonsContainer.innerHTML = '';

  parties.forEach(party => {
    const btn = document.createElement('button');
    const isLocked = lockedPartyId !== null;
    const isSelected = party.id === selectedPartyId;
    const isLockedParty = party.id === lockedPartyId;

    btn.className = `party-select-btn flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition border-2 ${
      isSelected || isLockedParty
        ? 'ring-2 ring-offset-2 ring-legend-blue'
        : 'hover:opacity-80'
    } ${isLocked && !isLockedParty ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    btn.dataset.partyId = party.id;

    // Create party color badge
    const colorBadge = document.createElement('span');
    colorBadge.className = 'w-4 h-4 rounded-full';
    colorBadge.dataset.partyColor = party.color;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = party.name;

    btn.appendChild(colorBadge);
    btn.appendChild(nameSpan);

    // Add click handler if not locked or is the locked party
    if (!isLocked || isLockedParty) {
      btn.addEventListener('click', () => selectPartyForPrimary(party.id));
    }

    buttonsContainer.appendChild(btn);
  });

  // Apply party colors via JavaScript (CSP-compliant)
  buttonsContainer.querySelectorAll('[data-party-color]').forEach(el => {
    el.style.backgroundColor = el.dataset.partyColor;
  });

  // Style selected button
  updatePartyButtonStyles();
}

/**
 * Lock the delegate to a specific party (after first primary vote)
 */
function lockToParty(partyId) {
  const lockedMessage = document.getElementById('party-selection-locked-message');
  const description = document.getElementById('party-selection-description');
  const selectedParty = allElections.find(e => e.partyId === partyId);

  // Update the locked message
  if (lockedMessage && selectedParty) {
    lockedMessage.textContent = `You have already voted in the ${selectedParty.partyName} primary. You must continue voting in their primaries.`;
    lockedMessage.classList.remove('hidden');
  }
  if (description) description.classList.add('hidden');

  // Disable other party buttons immediately
  document.querySelectorAll('.party-select-btn').forEach(btn => {
    const btnPartyId = parseInt(btn.dataset.partyId, 10);
    if (btnPartyId !== partyId) {
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      // Remove click handler by cloning and replacing
      const newBtn = btn.cloneNode(true);
      newBtn.classList.add('opacity-50', 'cursor-not-allowed');
      btn.parentNode.replaceChild(newBtn, btn);
    }
  });
}

/**
 * Update party button styles to show selection
 */
function updatePartyButtonStyles() {
  const buttons = document.querySelectorAll('.party-select-btn');
  buttons.forEach(btn => {
    const partyId = parseInt(btn.dataset.partyId, 10);
    if (partyId === selectedPartyId) {
      btn.classList.add('ring-2', 'ring-offset-2', 'ring-legend-blue', 'bg-gray-100');
    } else {
      btn.classList.remove('ring-2', 'ring-offset-2', 'ring-legend-blue', 'bg-gray-100');
    }
  });
}

/**
 * Select a party for primary voting
 */
function selectPartyForPrimary(partyId) {
  selectedPartyId = partyId;

  // Filter elections to show:
  // 1. All non-primary elections (general elections)
  // 2. Primary elections for the selected party only
  currentElections = allElections.filter(e => {
    if (e.electionType !== 'primary') return true; // Include all non-primaries
    return e.partyId === partyId; // Only include primaries for selected party
  });

  // Update button styles
  updatePartyButtonStyles();

  // Update elections section header
  const electionsSection = document.getElementById('elections-section');
  if (electionsSection) {
    const header = electionsSection.querySelector('h3');
    const selectedParty = allElections.find(e => e.partyId === partyId);
    if (header && selectedParty) {
      header.textContent = `${selectedParty.partyName} Primary Elections`;
    }
  }

  // Re-render elections list
  renderElectionsList();
}

/**
 * Render the list of eligible elections
 */
function renderElectionsList() {
  const electionsList = document.getElementById('elections-list');
  const noElectionsMessage = document.getElementById('no-elections-message');

  if (!electionsList) return;

  if (currentElections.length === 0) {
    electionsList.innerHTML = '';
    if (noElectionsMessage) noElectionsMessage.classList.remove('hidden');
    return;
  }

  if (noElectionsMessage) noElectionsMessage.classList.add('hidden');

  electionsList.innerHTML = currentElections.map(election => {
    const badgeClass = election.hasVoted
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
    const badgeText = election.hasVoted ? 'Voted' : 'Open';

    // For blanket/jungle primaries, show appropriate badge
    let partyInfo = '';
    if (election._isBlanketPrimary) {
      partyInfo = '<span class="text-xs px-2 py-0.5 rounded-full bg-purple-600 text-white ml-2">Blanket</span>';
    } else if (election._isJunglePrimary) {
      partyInfo = '<span class="text-xs px-2 py-0.5 rounded-full bg-orange-600 text-white ml-2">Jungle</span>';
    } else if (election.partyName) {
      partyInfo = `<span class="text-xs px-2 py-0.5 rounded-full text-white ml-2" data-party-color="${election.partyColor || '#6B7280'}">${election.partyName}</span>`;
    }

    // Type label for primaries
    let typeLabel = '';
    if (election._isBlanketPrimary) {
      typeLabel = '<span class="text-xs text-purple-600 ml-1">(Vote for any party)</span>';
    } else if (election._isJunglePrimary) {
      typeLabel = '<span class="text-xs text-orange-600 ml-1">(All parties, majority wins)</span>';
    } else if (election.electionType === 'primary') {
      typeLabel = '<span class="text-xs text-gray-500 ml-1">(Primary)</span>';
    }

    return `
      <button
        class="election-btn w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition flex items-center justify-between"
        data-election-id="${election.id}"
      >
        <div>
          <div class="font-semibold text-legend-blue">
            ${escapeHtml(election.positionName)}
            ${partyInfo}
          </div>
          <div class="text-sm text-gray-600 mt-1">
            ${escapeHtml(election.groupingName)}
            ${typeLabel}
          </div>
        </div>
        <span class="text-xs font-semibold px-2 py-1 rounded ${badgeClass}">
          ${badgeText}
        </span>
      </button>
    `;
  }).join('');

  // Apply party colors via JavaScript to avoid CSP issues with inline styles
  electionsList.querySelectorAll('[data-party-color]').forEach(el => {
    el.style.backgroundColor = el.dataset.partyColor;
  });

  // Attach click handlers for election buttons (CSP-compliant)
  electionsList.querySelectorAll('.election-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const electionId = parseInt(btn.dataset.electionId, 10);
      selectElection(electionId);
    });
  });
}

/**
 * Select an election and show the voting UI
 */
function selectElection(electionId) {
  // Handle both single IDs and combined blanket IDs (comma-separated)
  selectedElection = currentElections.find(e => String(e.id) === String(electionId));
  if (!selectedElection) return;

  // Reset selection state
  selectedCandidateId = null;
  rcvRankings = [];

  // Hide elections list, show voting section
  const electionsSection = document.getElementById('elections-section');
  const votingSection = document.getElementById('voting-section');
  const confirmationSection = document.getElementById('confirmation-section');

  if (electionsSection) electionsSection.classList.add('hidden');
  if (votingSection) votingSection.classList.remove('hidden');
  if (confirmationSection) confirmationSection.classList.add('hidden');

  // Update election title
  const electionTitle = document.getElementById('election-title');
  const electionSubtitle = document.getElementById('election-subtitle');

  if (electionTitle) {
    let title = selectedElection.positionName;
    if (selectedElection._isBlanketPrimary) {
      title += ' - Blanket Primary';
    } else if (selectedElection._isJunglePrimary) {
      title += ' - Jungle Primary';
    } else if (selectedElection.partyName) {
      title += ` - ${selectedElection.partyName}`;
    }
    electionTitle.textContent = title;
  }

  if (electionSubtitle) {
    let subtitle = selectedElection.groupingName;
    if (selectedElection._isBlanketPrimary) {
      // Advancement count based on program's advancement model setting
      const advancementCount = currentAdvancementModel === 'top_4_irv' ? 4 : 2;
      subtitle += ` (Vote for any candidate from any party - Top ${advancementCount} advance)`;
    } else if (selectedElection._isJunglePrimary) {
      subtitle += ' (All parties compete - Majority wins or runoff)';
    } else if (selectedElection.electionType === 'primary') {
      subtitle += ' (Primary Election)';
    }
    electionSubtitle.textContent = subtitle;
  }

  // Show appropriate voting UI based on voting method and voted status
  const pluralityVoting = document.getElementById('plurality-voting');
  const rcvVoting = document.getElementById('rcv-voting');
  const alreadyVotedMessage = document.getElementById('already-voted-message');
  const castVoteContainer = document.getElementById('cast-vote-container');

  // Hide all initially
  if (pluralityVoting) pluralityVoting.classList.add('hidden');
  if (rcvVoting) rcvVoting.classList.add('hidden');
  if (alreadyVotedMessage) alreadyVotedMessage.classList.add('hidden');
  if (castVoteContainer) castVoteContainer.classList.add('hidden');

  if (selectedElection.hasVoted) {
    // Already voted - show message
    if (alreadyVotedMessage) alreadyVotedMessage.classList.remove('hidden');
  } else {
    // Show voting UI
    if (castVoteContainer) castVoteContainer.classList.remove('hidden');

    if (selectedElection.votingMethod === 'ranked') {
      renderRCVCandidates();
      if (rcvVoting) rcvVoting.classList.remove('hidden');
    } else {
      // plurality or majority - use radio buttons
      renderPluralityCandidates();
      if (pluralityVoting) pluralityVoting.classList.remove('hidden');
    }
  }

  updateCastVoteButton();
}

/**
 * Render candidates for plurality/majority voting (radio buttons)
 */
function renderPluralityCandidates() {
  const candidatesList = document.getElementById('candidates-list');
  if (!candidatesList || !selectedElection) return;

  // For blanket and jungle primaries, show party badge for each candidate
  const showPartyBadges = selectedElection._isBlanketPrimary || selectedElection._isJunglePrimary;

  candidatesList.innerHTML = selectedElection.candidates.map(candidate => {
    // Party badge for blanket/jungle primaries (candidates have their own party info)
    const partyBadge = showPartyBadges && candidate.partyName
      ? `<span class="text-xs px-2 py-0.5 rounded-full text-white ml-2" data-party-color="${candidate.partyColor || '#6B7280'}">${escapeHtml(candidate.partyName)}</span>`
      : '';

    return `
      <label class="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer transition">
        <input
          type="radio"
          name="candidate"
          value="${candidate.id}"
          class="candidate-radio w-5 h-5 text-legend-blue focus:ring-legend-blue"
          data-candidate-id="${candidate.id}"
        />
        <span class="ml-3 font-medium text-gray-800">
          ${escapeHtml(candidate.firstName)} ${escapeHtml(candidate.lastName)}
          ${partyBadge}
        </span>
      </label>
    `;
  }).join('');

  // Apply party colors via JavaScript (CSP-compliant)
  candidatesList.querySelectorAll('[data-party-color]').forEach(el => {
    el.style.backgroundColor = el.dataset.partyColor;
  });

  // Attach change handlers for candidate radios (CSP-compliant)
  candidatesList.querySelectorAll('.candidate-radio').forEach(radio => {
    radio.addEventListener('change', () => {
      const candidateId = parseInt(radio.dataset.candidateId, 10);
      selectCandidate(candidateId);
    });
  });
}

/**
 * Handle candidate selection for plurality voting
 */
function selectCandidate(candidateId) {
  selectedCandidateId = candidateId;
  updateCastVoteButton();
}

/**
 * Render candidates for ranked choice voting (drag and drop)
 */
function renderRCVCandidates() {
  const rcvList = document.getElementById('rcv-candidates-list');
  if (!rcvList || !selectedElection) return;

  // Initialize rankings with all candidates unranked
  // For blanket primaries, include party info for display
  rcvRankings = selectedElection.candidates.map(c => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    rank: null,
    partyName: c.partyName || null,
    partyColor: c.partyColor || null,
  }));

  renderRCVList();
}

/**
 * Re-render the RCV list based on current rankings
 */
function renderRCVList() {
  const rcvList = document.getElementById('rcv-candidates-list');
  if (!rcvList) return;

  // Sort: ranked candidates first (by rank), then unranked
  const ranked = rcvRankings.filter(c => c.rank !== null).sort((a, b) => a.rank - b.rank);
  const unranked = rcvRankings.filter(c => c.rank === null);

  rcvList.innerHTML = '';

  // Ranked section
  if (ranked.length > 0) {
    const rankedHeader = document.createElement('p');
    rankedHeader.className = 'text-sm font-semibold text-gray-700 mb-2';
    rankedHeader.textContent = 'Your Rankings:';
    rcvList.appendChild(rankedHeader);

    ranked.forEach(candidate => {
      const el = createRCVCandidateElement(candidate, true);
      rcvList.appendChild(el);
    });
  }

  // Unranked section
  if (unranked.length > 0) {
    const unrankedHeader = document.createElement('p');
    unrankedHeader.className = 'text-sm font-semibold text-gray-500 mb-2 mt-4';
    unrankedHeader.textContent = 'Unranked (click to add):';
    rcvList.appendChild(unrankedHeader);

    unranked.forEach(candidate => {
      const el = createRCVCandidateElement(candidate, false);
      rcvList.appendChild(el);
    });
  }

  updateCastVoteButton();
}

/**
 * Create an RCV candidate element
 */
function createRCVCandidateElement(candidate, isRanked) {
  const div = document.createElement('div');
  div.className = `flex items-center p-3 rounded-lg border transition cursor-pointer ${
    isRanked
      ? 'bg-legend-blue bg-opacity-10 border-legend-blue'
      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
  }`;
  div.dataset.candidateId = candidate.id;

  // Party badge for blanket primaries
  const partyBadge = candidate.partyName
    ? `<span class="text-xs px-2 py-0.5 rounded-full text-white ml-2" data-party-color="${candidate.partyColor || '#6B7280'}">${escapeHtml(candidate.partyName)}</span>`
    : '';

  if (isRanked) {
    div.innerHTML = `
      <span class="w-8 h-8 flex items-center justify-center bg-legend-blue text-white rounded-full font-bold text-sm mr-3">
        ${candidate.rank}
      </span>
      <span class="flex-1 font-medium text-gray-800">
        ${escapeHtml(candidate.firstName)} ${escapeHtml(candidate.lastName)}
        ${partyBadge}
      </span>
      <button
        class="rcv-remove-btn text-gray-400 hover:text-red-500 p-1"
        data-candidate-id="${candidate.id}"
        title="Remove ranking"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `;

    // Attach remove button handler (CSP-compliant)
    const removeBtn = div.querySelector('.rcv-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRCVRank(candidate.id);
      });
    }

    // Click to move up in ranking (swap with previous)
    div.onclick = () => {
      if (candidate.rank > 1) {
        moveRCVCandidate(candidate.id, candidate.rank - 1);
      }
    };
  } else {
    div.innerHTML = `
      <span class="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-500 rounded-full mr-3">
        -
      </span>
      <span class="flex-1 text-gray-700">
        ${escapeHtml(candidate.firstName)} ${escapeHtml(candidate.lastName)}
        ${partyBadge}
      </span>
      <span class="text-xs text-gray-400">Click to rank</span>
    `;

    // Click to add to ranking
    div.onclick = () => addRCVRank(candidate.id);
  }

  // Apply party colors (CSP-compliant)
  const partyEl = div.querySelector('[data-party-color]');
  if (partyEl) {
    partyEl.style.backgroundColor = partyEl.dataset.partyColor;
  }

  return div;
}

/**
 * Add a candidate to RCV rankings
 */
function addRCVRank(candidateId) {
  const candidate = rcvRankings.find(c => c.id === candidateId);
  if (!candidate || candidate.rank !== null) return;

  // Get next rank number
  const maxRank = Math.max(0, ...rcvRankings.filter(c => c.rank !== null).map(c => c.rank));
  candidate.rank = maxRank + 1;

  renderRCVList();
}

/**
 * Remove a candidate from RCV rankings
 */
function removeRCVRank(candidateId) {
  const candidate = rcvRankings.find(c => c.id === candidateId);
  if (!candidate || candidate.rank === null) return;

  const removedRank = candidate.rank;
  candidate.rank = null;

  // Adjust other rankings
  rcvRankings.forEach(c => {
    if (c.rank !== null && c.rank > removedRank) {
      c.rank--;
    }
  });

  renderRCVList();
}

/**
 * Move a candidate to a new rank position
 */
function moveRCVCandidate(candidateId, newRank) {
  const candidate = rcvRankings.find(c => c.id === candidateId);
  if (!candidate || candidate.rank === null) return;

  const oldRank = candidate.rank;
  if (oldRank === newRank) return;

  // Find candidate at new position and swap
  const other = rcvRankings.find(c => c.rank === newRank);
  if (other) {
    other.rank = oldRank;
  }
  candidate.rank = newRank;

  renderRCVList();
}

/**
 * Update the cast vote button state
 */
function updateCastVoteButton() {
  const castVoteBtn = document.getElementById('cast-vote-btn');
  if (!castVoteBtn) return;

  let canVote = false;

  if (selectedElection && !selectedElection.hasVoted) {
    if (selectedElection.votingMethod === 'ranked') {
      // RCV: need at least one ranking
      canVote = rcvRankings.some(c => c.rank !== null);
    } else {
      // Plurality/Majority: need a selected candidate
      canVote = selectedCandidateId !== null;
    }
  }

  castVoteBtn.disabled = !canVote;
}

/**
 * Submit the vote
 */
async function submitVote() {
  if (!selectedElection || !currentDelegateId) return;

  const castVoteBtn = document.getElementById('cast-vote-btn');
  if (castVoteBtn) {
    castVoteBtn.disabled = true;
    castVoteBtn.textContent = 'Submitting...';
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add auth header if we have a token
    if (window._votingPortalAuthToken) {
      headers['Authorization'] = `Bearer ${window._votingPortalAuthToken}`;
    }

    if (selectedElection.votingMethod === 'ranked') {
      // RCV: submit multiple votes with ranks
      const rankedCandidates = rcvRankings
        .filter(c => c.rank !== null)
        .sort((a, b) => a.rank - b.rank);

      for (const candidate of rankedCandidates) {
        // For blanket primaries, all candidates are in the single election
        const response = await fetch(`${API_URL}/elections/${selectedElection.id}/vote`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            candidateId: candidate.id,
            delegateId: currentDelegateId,
            rank: candidate.rank,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to cast vote');
        }
      }
    } else {
      // Plurality/Majority: single vote
      const response = await fetch(`${API_URL}/elections/${selectedElection.id}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId: selectedCandidateId,
          delegateId: currentDelegateId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to cast vote');
      }
    }

    // Mark election as voted in our local state
    selectedElection.hasVoted = true;

    // If this was a primary election in open/semi-open mode, immediately lock to this party
    if (selectedElection.electionType === 'primary' && selectedElection.partyId &&
        (currentPrimaryModel === 'open' || currentPrimaryModel === 'semi_open')) {
      lockToParty(selectedElection.partyId);
    }

    // Show confirmation
    showVoteConfirmation();
  } catch (err) {
    console.error('Error casting vote:', err);
    showError(err.message || 'Failed to cast vote. Please try again.');

    if (castVoteBtn) {
      castVoteBtn.disabled = false;
      castVoteBtn.textContent = 'Cast Vote';
    }
  }
}

/**
 * Show the vote confirmation screen
 */
function showVoteConfirmation() {
  const votingSection = document.getElementById('voting-section');
  const confirmationSection = document.getElementById('confirmation-section');

  if (votingSection) votingSection.classList.add('hidden');
  if (confirmationSection) confirmationSection.classList.remove('hidden');
}

/**
 * Go back to the elections list
 */
function backToElections() {
  const electionsSection = document.getElementById('elections-section');
  const votingSection = document.getElementById('voting-section');
  const confirmationSection = document.getElementById('confirmation-section');

  if (electionsSection) electionsSection.classList.remove('hidden');
  if (votingSection) votingSection.classList.add('hidden');
  if (confirmationSection) confirmationSection.classList.add('hidden');

  // Re-render elections list to update voted status
  renderElectionsList();

  // Reset selection
  selectedElection = null;
  selectedCandidateId = null;
  rcvRankings = [];
}

/**
 * Reset the voting portal to initial state (change voter)
 */
function resetVotingPortal() {
  currentDelegateId = null;
  currentDelegateInfo = null;
  currentElections = [];
  allElections = [];
  currentPrimaryModel = 'closed';
  currentAdvancementModel = 'top_2';
  selectedPartyId = null;
  selectedElection = null;
  selectedCandidateId = null;
  rcvRankings = [];
  window._votingPortalAuthToken = null;

  const voterIdSection = document.getElementById('voter-id-section');
  const votingContent = document.getElementById('voting-portal-content');
  const partySelectionSection = document.getElementById('party-selection-section');
  const electionsSection = document.getElementById('elections-section');
  const votingSection = document.getElementById('voting-section');
  const confirmationSection = document.getElementById('confirmation-section');

  if (voterIdSection) voterIdSection.classList.remove('hidden');
  if (votingContent) votingContent.classList.add('hidden');
  if (partySelectionSection) partySelectionSection.classList.add('hidden');
  if (electionsSection) electionsSection.classList.remove('hidden');
  if (votingSection) votingSection.classList.add('hidden');
  if (confirmationSection) confirmationSection.classList.add('hidden');

  // Reset elections header
  const electionsHeader = electionsSection?.querySelector('h3');
  if (electionsHeader) {
    electionsHeader.textContent = 'Your Elections';
  }

  // Clear voter ID input
  const voterIdInput = document.getElementById('voter-id-input');
  if (voterIdInput) voterIdInput.value = '';

  clearMessages();
}

/**
 * Set up event listeners for voting controls
 */
function setupVotingEventListeners() {
  // Back to elections button
  const backBtn = document.getElementById('back-to-elections-btn');
  if (backBtn) {
    backBtn.onclick = backToElections;
  }

  // Back after vote button
  const backAfterVoteBtn = document.getElementById('back-to-elections-after-vote-btn');
  if (backAfterVoteBtn) {
    backAfterVoteBtn.onclick = backToElections;
  }

  // Cast vote button
  const castVoteBtn = document.getElementById('cast-vote-btn');
  if (castVoteBtn) {
    castVoteBtn.onclick = submitVote;
  }

  // Change voter button
  const changeVoterBtn = document.getElementById('change-voter-btn');
  if (changeVoterBtn) {
    changeVoterBtn.onclick = resetVotingPortal;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Show an error message
 */
function showError(message) {
  const errorBox = document.getElementById('errorBox');
  if (errorBox) {
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
  }

  // Auto-hide after 5 seconds
  setTimeout(() => clearError(), 5000);
}

/**
 * Clear the error message
 */
function clearError() {
  const errorBox = document.getElementById('errorBox');
  if (errorBox) {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }
}

/**
 * Show a success message
 */
function showSuccess(message) {
  const successBox = document.getElementById('successBox');
  if (successBox) {
    successBox.textContent = message;
    successBox.classList.remove('hidden');
  }

  // Auto-hide after 5 seconds
  setTimeout(() => clearSuccess(), 5000);
}

/**
 * Clear the success message
 */
function clearSuccess() {
  const successBox = document.getElementById('successBox');
  if (successBox) {
    successBox.classList.add('hidden');
    successBox.textContent = '';
  }
}

/**
 * Clear all messages
 */
function clearMessages() {
  clearError();
  clearSuccess();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// Exports for both browser and Node (testing)
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initVotingPortal,
    loadEligibleElections,
    selectElection,
    selectCandidate,
    submitVote,
    backToElections,
    resetVotingPortal,
    selectPartyForPrimary,
    escapeHtml,
  };
} else {
  window.initVotingPortal = initVotingPortal;
  window.loadEligibleElections = loadEligibleElections;
  window.selectElection = selectElection;
  window.selectCandidate = selectCandidate;
  window.submitVote = submitVote;
  window.backToElections = backToElections;
  window.resetVotingPortal = resetVotingPortal;
  window.selectPartyForPrimary = selectPartyForPrimary;
  window.escapeHtml = escapeHtml;
}
