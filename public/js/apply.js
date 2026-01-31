// js/apply.js

const { programId, year, type } = getApplicationParams();

console.log('[DEBUG] apply.js - URL:', window.location.href);
console.log('[DEBUG] apply.js - programId:', programId);
console.log('[DEBUG] apply.js - year:', year);
console.log('[DEBUG] apply.js - type:', type);

document.addEventListener('DOMContentLoaded', async function() {
    if (!programId) {
      document.getElementById('applicationForm').innerHTML = '<div class="text-red-700">No program selected. Please use a valid application link.</div>';
      return;
    }

    try {
      const config = await fetchApplicationConfig(programId, year, type);
      renderApplicationForm(config);

      const form = document.getElementById('applicationForm');
      const formStatus = document.getElementById('formStatus');

      addValidationListeners(form, config);
      try { initAddressHelpers(form); } catch {}

      form.onsubmit = async function (e) {
        await handleFormSubmit(e, form, config, formStatus);
      };

    } catch (err) {
      document.getElementById('applicationForm').innerHTML = '<div class="text-red-700">Could not load application. Please check your link or try again later.</div>';
    }
  });

