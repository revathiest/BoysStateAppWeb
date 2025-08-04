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
        for (const y of yearsList) {
          existingApplications[y.year] = { delegate: false, staff: false };
          for (const t of ['delegate','staff']) {
            try {
              const aRes = await fetch(
                `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application?year=${encodeURIComponent(y.year)}&type=${t}`,
                {
                  method: 'HEAD',
                  headers: {
                    ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
                  },
                  credentials: 'include'
                }
              );
              existingApplications[y.year][t] = aRes.ok;
            } catch {
              existingApplications[y.year][t] = false;
            }
          }
        }
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

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        card.style.display = 'none';
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

    newAppBtn.addEventListener('click', () => {
      clearError();
      newAppForm.classList.remove('hidden');
      newAppYear.value = '';
      newAppType.value = currentType;
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
        const res = await fetch(`${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application?year=${encodeURIComponent(year)}&type=${encodeURIComponent(type)}`, {
          headers: {
            ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
          },
          credentials: 'include'
        });
          if (res.ok) {
            const data = await res.json();
            card.style.display = 'none';
            renderApplicationBuilder(builderRoot, data, programId, year, type);
            clearError();
          } else {
            card.style.display = '';
            builderRoot.innerHTML = '';
            if (noAppMsg) noAppMsg.textContent = `No application form defined for ${year} ${type}.`;
          }
      } catch {
        card.style.display = '';
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
