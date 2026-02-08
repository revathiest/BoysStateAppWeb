/**
 * runoff-fix.test.js
 *
 * Verifies that the runoff POST request fix is in place.
 * Uses file reading instead of require() to avoid including large
 * UI files in coverage tracking.
 */

const fs = require('fs');
const path = require('path');

describe('Runoff POST request fix verification', () => {
  describe('elections-management.js', () => {
    let code;

    beforeAll(() => {
      code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/elections-management.js'),
        'utf8'
      );
    });

    test('runoff request includes empty JSON body', () => {
      // Verify the fix is in place: body: JSON.stringify({}) should be present
      expect(code).toContain("body: JSON.stringify({})");
    });

    test('has POST method for runoff endpoint', () => {
      expect(code).toContain("/runoff");
      expect(code).toContain("method: 'POST'");
    });

    test('has Content-Type header for runoff request', () => {
      expect(code).toContain("'Content-Type': 'application/json'");
    });

    test('createRunoff function exists', () => {
      expect(code).toContain("async function createRunoff");
    });

    test('createRunoff checks for currentElection', () => {
      expect(code).toContain("if (!currentElection)");
    });

    test('handles runoff creation response', () => {
      // elections-management.js uses 'response' variable
      expect(code).toContain("response.ok");
      expect(code).toContain("showSuccess");
    });

    test('handles business logic rejection (success: false)', () => {
      // Verify the code checks for success: false from backend
      expect(code).toContain("result.success === false");
      expect(code).toContain("result.error || 'Runoff creation was rejected'");
    });

    test('showError scrolls error into view', () => {
      expect(code).toContain("errorBox.scrollIntoView");
    });

    test('createRunoff shows errors in election modal', () => {
      // Verify errors are shown in the election modal, not behind the confirmation modal
      expect(code).toContain("election-modal-error");
      expect(code).toContain("electionModalError.textContent = err.message");
    });

    test('election modal error is cleared on open', () => {
      expect(code).toContain("election-modal-error");
      // Verify error is cleared in openElectionModal
      expect(code).toMatch(/openElectionModal[\s\S]*?election-modal-error[\s\S]*?classList\.add\('hidden'\)/);
    });
  });

  describe('vote-simulation.js (split into modules)', () => {
    let code;
    let utilsCode;
    let resultsCode;

    beforeAll(() => {
      // Read all vote-simulation modules and concatenate
      const mainCode = fs.readFileSync(
        path.resolve(__dirname, '../public/js/vote-simulation.js'),
        'utf8'
      );
      utilsCode = fs.readFileSync(
        path.resolve(__dirname, '../public/js/vote-simulation-utils.js'),
        'utf8'
      );
      resultsCode = fs.readFileSync(
        path.resolve(__dirname, '../public/js/vote-simulation-results.js'),
        'utf8'
      );
      code = mainCode + utilsCode + resultsCode;
    });

    test('runoff request includes empty JSON body', () => {
      // Verify the fix is in place: body: JSON.stringify({}) should be present
      expect(code).toContain("body: JSON.stringify({})");
    });

    test('has POST method for runoff endpoint', () => {
      expect(code).toContain("/runoff");
      expect(code).toContain("method: 'POST'");
    });

    test('has Content-Type header for runoff request', () => {
      expect(code).toContain("'Content-Type': 'application/json'");
    });

    test('createRunoffElection function exists', () => {
      expect(code).toContain("async function createRunoffElection");
    });

    test('createRunoffElection checks for currentElection', () => {
      // After refactoring, state is accessed via state.currentElection
      expect(code).toContain("if (!state.currentElection)");
      expect(code).toContain("showError('No election selected')");
    });

    test('handles runoff creation response', () => {
      expect(code).toContain("res.ok");
      expect(code).toContain("showSuccess");
    });

    test('handles business logic rejection (success: false)', () => {
      // Verify the code checks for success: false from backend
      expect(code).toContain("result.success === false");
      expect(code).toContain("result.error || 'Runoff creation was rejected'");
    });

    test('showError scrolls error into view', () => {
      expect(code).toContain("errorBox.scrollIntoView");
    });

    test('has election type label for primary_runoff', () => {
      expect(code).toContain("getElectionTypeLabel");
      expect(code).toContain("primary_runoff");
    });
  });

  describe('elections-management.js - primary runoff support', () => {
    let code;

    beforeAll(() => {
      code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/elections-management.js'),
        'utf8'
      );
    });

    test('displays Primary Runoff badge for primary_runoff elections', () => {
      expect(code).toContain("election.electionType === 'primary_runoff'");
      expect(code).toContain("Primary Runoff");
    });

    test('displays Runoff badge for regular runoff elections', () => {
      expect(code).toContain("election.electionType === 'runoff'");
    });

    test('excludes primary_runoff from showing create runoff button', () => {
      // Should not show runoff button for elections that are already runoffs
      expect(code).toContain("['runoff', 'primary_runoff'].includes(currentElection.electionType)");
    });
  });

  describe('elections-management.js - reopen nominations feature', () => {
    let code;

    beforeAll(() => {
      code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/elections-management.js'),
        'utf8'
      );
    });

    test('reopenNominations function exists', () => {
      expect(code).toContain("async function reopenNominations");
    });

    test('reopenNominations calls reopen-nominations endpoint', () => {
      expect(code).toContain("/reopen-nominations");
    });

    test('reopenNominations handles success response', () => {
      expect(code).toContain("result.error || 'Reopening nominations was rejected'");
    });

    test('reopenNominations shows errors in election modal', () => {
      expect(code).toContain("'Failed to reopen nominations'");
    });

    test('reopen nominations button visibility logic exists', () => {
      expect(code).toContain("reopen-nominations-btn");
      expect(code).toContain("canReopenNominations");
    });

    test('event listener for reopen nominations button exists', () => {
      expect(code).toContain("reopen-nominations-btn");
      expect(code).toContain("reopenNominations");
    });
  });

  describe('elections-management.js - skip to appointed feature', () => {
    let code;

    beforeAll(() => {
      code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/elections-management.js'),
        'utf8'
      );
    });

    test('skipToAppointed function exists', () => {
      expect(code).toContain("async function skipToAppointed");
    });

    test('skipToAppointed calls skip-to-appointed endpoint', () => {
      expect(code).toContain("/skip-to-appointed");
    });

    test('skipToAppointed handles success response', () => {
      expect(code).toContain("result.error || 'Conversion was rejected'");
    });

    test('skipToAppointed shows errors in election modal', () => {
      expect(code).toContain("'Failed to convert to appointed'");
    });

    test('skip to appointed button visibility logic exists', () => {
      expect(code).toContain("skip-to-appointed-btn");
      expect(code).toContain("canSkipToAppointed");
    });

    test('event listener for skip to appointed button exists', () => {
      expect(code).toContain("skip-to-appointed-btn");
      expect(code).toContain("skipToAppointed");
    });

    test('skipped status badge displays as Appointed', () => {
      expect(code).toContain("case 'skipped':");
      expect(code).toContain("Appointed");
    });
  });

  describe('elections-management.js - mass skip feature', () => {
    let code;

    beforeAll(() => {
      code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/elections-management.js'),
        'utf8'
      );
    });

    test('showConfirmation accepts checkbox configuration', () => {
      expect(code).toContain("checkboxConfig = null");
      expect(code).toContain("confirmation-checkbox-container");
      expect(code).toContain("confirmation-checkbox-label");
    });

    test('showConfirmation shows checkbox when config provided', () => {
      expect(code).toContain("if (checkboxConfig)");
      expect(code).toContain("checkboxLabel.textContent = checkboxConfig.label");
      expect(code).toContain("checkbox.checked = checkboxConfig.checked");
    });

    test('showConfirmation passes checkbox state to callback', () => {
      expect(code).toContain("const checkboxState = checkboxConfig ? checkbox.checked : null");
      expect(code).toContain("onConfirm(checkboxState)");
    });

    test('startAllElections shows checkbox for no-candidate elections', () => {
      expect(code).toContain("const checkboxConfig = noCandidatesCount > 0");
      expect(code).toContain("Convert");
      expect(code).toContain("to appointed positions");
    });

    test('startAllElections passes skipNoCandidates to backend', () => {
      expect(code).toContain("skipNoCandidates: skipNoCandidates || false");
    });

    test('startAllElections handles skippedToAppointed in response', () => {
      expect(code).toContain("result.skippedToAppointed");
      expect(code).toContain("converted to appointed");
    });
  });

  describe('elections-management.html - confirmation modal checkbox', () => {
    let html;

    beforeAll(() => {
      html = fs.readFileSync(
        path.resolve(__dirname, '../public/elections-management.html'),
        'utf8'
      );
    });

    test('confirmation modal has checkbox container', () => {
      expect(html).toContain('id="confirmation-checkbox-container"');
    });

    test('confirmation modal has checkbox input', () => {
      expect(html).toContain('id="confirmation-checkbox"');
      expect(html).toContain('type="checkbox"');
    });

    test('confirmation modal has checkbox label', () => {
      expect(html).toContain('id="confirmation-checkbox-label"');
    });
  });

  describe('elections-management.js - status summary feature', () => {
    let code;

    beforeAll(() => {
      code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/elections-management.js'),
        'utf8'
      );
    });

    test('updateStatusSummary function exists', () => {
      expect(code).toContain('function updateStatusSummary()');
    });

    test('updateStatusSummary calculates counts per status', () => {
      expect(code).toContain("status === 'nomination'");
      expect(code).toContain("status === 'scheduled'");
      expect(code).toContain("status === 'active'");
      expect(code).toContain("status === 'completed'");
      expect(code).toContain("status === 'skipped'");
    });

    test('updateActiveChip function exists', () => {
      expect(code).toContain('function updateActiveChip(');
    });

    test('onStatusChipClick function exists', () => {
      expect(code).toContain('function onStatusChipClick(');
    });

    test('status chip click updates dropdown', () => {
      expect(code).toContain("dropdown.value = status");
    });

    test('status chips have click handlers', () => {
      expect(code).toContain("status-chip");
      expect(code).toContain("addEventListener('click', onStatusChipClick)");
    });

    test('renderElections calls updateStatusSummary', () => {
      expect(code).toContain("updateStatusSummary()");
    });
  });

  describe('elections-management.html - status summary bar', () => {
    let html;

    beforeAll(() => {
      html = fs.readFileSync(
        path.resolve(__dirname, '../public/elections-management.html'),
        'utf8'
      );
    });

    test('status summary bar container exists', () => {
      expect(html).toContain('id="status-summary"');
    });

    test('has status chips for each status', () => {
      expect(html).toContain('data-status=""');
      expect(html).toContain('data-status="nomination"');
      expect(html).toContain('data-status="scheduled"');
      expect(html).toContain('data-status="active"');
      expect(html).toContain('data-status="completed"');
      expect(html).toContain('data-status="skipped"');
    });

    test('status chips have count spans', () => {
      expect(html).toContain('class="status-count');
    });

    test('status chips have appropriate labels', () => {
      expect(html).toContain('Nominations');
      expect(html).toContain('Scheduled');
      expect(html).toContain('Voting');
      expect(html).toContain('Completed');
      expect(html).toContain('Appointed');
    });
  });
});
