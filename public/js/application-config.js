// application-config.js

// Wrap in IIFE to avoid polluting global scope and redeclaration errors
(function () {
// Import shared modules (CommonJS for tests, globals for browser)
let FIELD_TYPES, renderFieldTypeOptions, getProgramId, createOrCopyApplication, showError, clearError, showSuccess, renderApplicationBuilder;
if (typeof module !== 'undefined' && module.exports) {
  ({ FIELD_TYPES, renderFieldTypeOptions } = require('./application-field-types.js'));
  ({ getProgramId, createOrCopyApplication } = require('./application-service.js'));
  ({ showError, clearError, showSuccess } = require('./application-messages.js'));
  ({ renderApplicationBuilder } = require('./application-builder.js'));
} else {
  FIELD_TYPES = window.FIELD_TYPES;
  renderFieldTypeOptions = window.renderFieldTypeOptions;
  getProgramId = window.getProgramId;
  createOrCopyApplication = window.createOrCopyApplication;
  showError = window.showError;
  clearError = window.clearError;
  showSuccess = window.showSuccess;
  renderApplicationBuilder = window.renderApplicationBuilder;
}

const programId = getProgramId();

let currentYear;
let currentType = 'delegate';
    
    // ---- Main App Builder Logic ----
    /* istanbul ignore next */
    document.addEventListener("DOMContentLoaded", function() {
    const createBtn = document.getElementById('create-application-form');
    const card = document.getElementById('create-form-card');
    const builderRoot = document.getElementById('application-builder-root');
    const yearSelect = document.getElementById('year-select');
    const typeSelect = document.getElementById('type-select');
    const newAppBtn = document.getElementById('create-new-application');
    const newAppForm = document.getElementById('new-application-form');
    const newAppYear = document.getElementById('new-app-year');
    const newAppType = document.getElementById('new-app-type');
    const copyYearSelect = document.getElementById('copy-from-year');
    const cancelNewApp = document.getElementById('cancel-new-app');
    const createSubmit = document.getElementById('create-app-submit');
    const currentSelHeading = document.getElementById('current-selection');
    const noAppMsg = document.getElementById('no-app-message');

    let yearsList = [];
    let existingApplications = {};
    let existingAppsLoaded = false;

    function updateCurrentSelection() {
      if (currentYear && currentType && currentSelHeading) {
        const typeLabel = currentType.charAt(0).toUpperCase() + currentType.slice(1);
        currentSelHeading.textContent = `${currentYear} ${typeLabel} Application`;
      }
    }

    function updateCopyOptions() {
      const yearVal = parseInt(newAppYear.value, 10);
      const typeVal = newAppType.value;
      const options = Object.keys(existingApplications)
        .filter(y => existingApplications[y] && existingApplications[y][typeVal] && (!isNaN(yearVal) ? +y < yearVal : true));
      if (options.length) {
        copyYearSelect.disabled = false;
        copyYearSelect.innerHTML = '<option value="">No</option>' + options.sort((a,b)=>b-a).map(y => `<option value="${y}">${y}</option>`).join('');
      } else {
        copyYearSelect.disabled = true;
        copyYearSelect.innerHTML = '<option value="">No prior applications available</option>';
      }
    }

    function validateNewAppForm() {
      const year = parseInt(newAppYear.value, 10);
      const type = newAppType.value;
      let valid = true;
      const yearErr = document.getElementById('year-error');
      if (yearErr) yearErr.textContent = '';
      if (!year) {
        if (yearErr) yearErr.textContent = 'Year required';
        valid = false;
      } else if (existingApplications[year] && existingApplications[year][type]) {
        if (yearErr) yearErr.textContent = 'Application already exists for this year/type';
        valid = false;
      }
      if (createSubmit) createSubmit.disabled = !valid;
      return valid;
    }

    async function refreshYears() {
      if (!programId || !window.API_URL) return;
      try {
        const res = await fetch(`${window.API_URL}/programs/${encodeURIComponent(programId)}/years`, {
          headers: {
            ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
          },
          credentials: 'include'
        });
        yearsList = res.ok ? await res.json() : [];
        existingApplications = {};
        existingAppsLoaded = false;
        yearSelect.innerHTML = yearsList.map(y => `<option value="${y.year}">${y.year}</option>`).join('');
        if (yearsList.length) {
          currentYear = yearSelect.value || yearsList[0].year;
          yearSelect.value = currentYear;
        }
        updateCopyOptions();
      } catch {
        yearsList = [];
      }
    }

    async function loadExistingAppStatus() {
      if (existingAppsLoaded || !programId || !window.API_URL) return;
      existingApplications = {};
      for (const y of yearsList) {
        existingApplications[y.year] = { delegate: false, staff: false };
        for (const t of ['delegate', 'staff']) {
          try {
            const aRes = await fetch(`${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application?year=${encodeURIComponent(y.year)}&type=${t}`, {
              method: 'GET',
              headers: {
                ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
              },
              credentials: 'include'
            });
            existingApplications[y.year][t] = aRes.ok;
          } catch {
            existingApplications[y.year][t] = false;
          }
        }
      }
      existingAppsLoaded = true;
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        card.classList.add('hidden');
        renderApplicationBuilder(builderRoot, {}, programId, currentYear, currentType);
      });
    }

    yearSelect.addEventListener('change', () => {
      currentYear = yearSelect.value;
      updateCurrentSelection();
      loadExistingApplication(currentYear, currentType);
      setPublicLink();
    });

    typeSelect.addEventListener('change', () => {
      currentType = typeSelect.value;
      updateCurrentSelection();
      loadExistingApplication(currentYear, currentType);
      setPublicLink();
    });

    newAppBtn.addEventListener('click', async () => {
      clearError();
      newAppForm.classList.remove('hidden');
      newAppYear.value = '';
      newAppType.value = currentType;
      await loadExistingAppStatus();
      updateCopyOptions();
      validateNewAppForm();
    });

    cancelNewApp.addEventListener('click', () => {
      newAppForm.classList.add('hidden');
      newAppYear.value = '';
      const yearErr = document.getElementById('year-error');
      if (yearErr) yearErr.textContent = '';
    });

    newAppYear.addEventListener('input', () => {
      updateCopyOptions();
      validateNewAppForm();
    });

    newAppType.addEventListener('change', () => {
      updateCopyOptions();
      validateNewAppForm();
    });

    newAppForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateNewAppForm()) return;
      const year = parseInt(newAppYear.value, 10);
      const type = newAppType.value;
      const copyFrom = copyYearSelect.disabled ? null : (copyYearSelect.value || null);
      if (createSubmit) {
        createSubmit.disabled = true;
        createSubmit.textContent = 'Creating...';
      }
      clearError();
      try {
        await createOrCopyApplication({ programId, year, type, copyFromYear: copyFrom });
        newAppForm.classList.add('hidden');
        newAppYear.value = '';
        copyYearSelect.value = '';
        showSuccess('Application created');
        await refreshYears();
        currentYear = String(year);
        currentType = type;
        yearSelect.value = currentYear;
        typeSelect.value = currentType;
        updateCurrentSelection();
        loadExistingApplication(currentYear, currentType);
        setPublicLink();
      } catch (err) {
        showError(err.message || 'Failed to create application');
      } finally {
        if (createSubmit) {
          createSubmit.disabled = false;
          createSubmit.textContent = 'Create';
        }
      }
    });

    async function loadExistingApplication(year, type) {
      if (!programId || !window.API_URL || !year) return;
      builderRoot.innerHTML = '<div class="text-center p-4" id="loading">Loading...</div>';

      try {
        const url = `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application?year=${encodeURIComponent(year)}&type=${encodeURIComponent(type)}`;

        const res = await fetch(url, {
          headers: {
            ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
          },
          credentials: 'include'
        });

          // Status 204 means no application found
          if (res.status === 204) {
            card.classList.remove('hidden');
            builderRoot.innerHTML = '';
            if (noAppMsg) noAppMsg.textContent = `No application form defined for ${year} ${type}.`;
            return;
          }

          if (res.ok) {
            const data = await res.json();

            card.classList.add('hidden');

            // Render the form first
            renderApplicationBuilder(builderRoot, data, programId, year, type);

            // Then check if questions are locked and show warning banner AFTER rendering
            if (data.locked && data.locked.includes('questions')) {
              showLockedWarning(builderRoot, data.message, programId, year, type);
            }

            clearError();
          } else {
            card.classList.remove('hidden');
            builderRoot.innerHTML = '';
            if (noAppMsg) noAppMsg.textContent = `No application form defined for ${year} ${type}.`;
          }
      } catch {
        card.classList.remove('hidden');
        builderRoot.innerHTML = '';
        if (noAppMsg) noAppMsg.textContent = `No application form defined for ${year} ${type}.`;
        showError('Failed to load application');
      }
    }

    function encodeToken(year, type) {
      const json = JSON.stringify({ year, type });
      return typeof btoa === 'function'
        ? btoa(json)
        : Buffer.from(json, 'utf-8').toString('base64');
    }

    function setPublicLink() {
      if (typeof programId !== 'undefined' && programId && currentYear && currentType) {
        const token = encodeToken(currentYear, currentType);
        document.getElementById('publicApplicationUrl').value =
          location.origin + '/public/apply.html?programId=' + encodeURIComponent(programId) + '&token=' + encodeURIComponent(token);
      } else {
        document.getElementById('publicApplicationUrl').value =
          'Program ID not available.';
      }
    }

    // Show locked warning banner with delete option
    function showLockedWarning(builderRoot, message, programId, year, type) {
      const warningBanner = document.createElement('div');
      warningBanner.id = 'locked-warning-banner';
      warningBanner.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg';
      warningBanner.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3 flex-1">
            <h3 class="text-sm font-medium text-yellow-800">Questions Are Locked</h3>
            <div class="mt-2 text-sm text-yellow-700">
              <p>${message || 'Questions cannot be modified because responses have been submitted.'}</p>
            </div>
            <div class="mt-4">
              <button type="button" id="delete-all-responses-btn" class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition">
                Delete All Responses to Unlock Editing
              </button>
            </div>
          </div>
        </div>
      `;
      builderRoot.insertBefore(warningBanner, builderRoot.firstChild);

      // Attach delete handler
      const deleteBtn = document.getElementById('delete-all-responses-btn');
      if (deleteBtn) {
        deleteBtn.onclick = () => confirmAndDeleteAllResponses(programId, year, type);
      }
    }

    // Confirm and delete all responses
    async function confirmAndDeleteAllResponses(programId, year, type) {
      // Fetch response count first
      const responseCountText = await getResponseCount(programId, year, type);

      const confirmed = confirm(
        `⚠️ WARNING: This action cannot be undone!\n\n` +
        `You are about to delete ${responseCountText} for this application.\n\n` +
        `After deletion:\n` +
        `• All submitted application responses will be permanently deleted\n` +
        `• Question editing will be unlocked\n` +
        `• This cannot be reversed\n\n` +
        `Are you absolutely sure you want to proceed?`
      );

      if (!confirmed) return;

      // Second confirmation
      const doubleConfirmed = confirm(
        `Are you REALLY sure?\n\n` +
        `Type YES in the next dialog to confirm deletion of ${responseCountText}.`
      );

      if (!doubleConfirmed) return;

      const userInput = prompt(
        `Type YES (all capitals) to confirm deletion of ${responseCountText}:`
      );

      if (userInput !== 'YES') {
        showError('Deletion cancelled. You must type YES exactly to proceed.');
        return;
      }

      // Proceed with deletion
      try {
        const res = await fetch(
          `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application/responses/all?year=${encodeURIComponent(year)}&type=${encodeURIComponent(type)}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
            },
            credentials: 'include'
          }
        );

        if (res.ok) {
          const data = await res.json();
          showSuccess(data.message || 'All responses deleted successfully. Questions are now unlocked.');
          // Remove warning banner
          const banner = document.getElementById('locked-warning-banner');
          if (banner) banner.remove();
          // Reload the application
          loadExistingApplication(year, type);
        } else {
          const error = await res.json();
          showError(error.error || 'Failed to delete responses');
        }
      } catch (err) {
        showError(err.message || 'Failed to delete responses');
      }
    }

    // Get response count for confirmation dialog
    async function getResponseCount(programId, year, type) {
      try {
        const appType = type === 'delegate' ? 'delegate' : 'staff';
        const res = await fetch(
          `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/applications/${appType}?year=${encodeURIComponent(year)}`,
          {
            headers: {
              ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
            },
            credentials: 'include'
          }
        );

        if (res.ok) {
          const responses = await res.json();
          const count = Array.isArray(responses) ? responses.length : 0;
          return count === 1 ? '1 response' : `${count} responses`;
        }
        return 'all responses';
      } catch {
        return 'all responses';
      }
    }

    refreshYears().then(() => {
      if (yearSelect.value) {
        currentYear = yearSelect.value;
        updateCurrentSelection();
        loadExistingApplication(currentYear, currentType);
        setPublicLink();
      }
    });

      });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getProgramId, renderFieldTypeOptions, createOrCopyApplication };
}
})();
