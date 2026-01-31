// application-builder.js

// Wrap in IIFE to avoid redeclaration of globals
(function () {
// Import dependencies (CommonJS for tests, globals for browser)
let renderFieldTypeOptions, showError, clearError, showSuccess;
if (typeof module !== 'undefined' && module.exports) {
  ({ renderFieldTypeOptions } = require('./application-field-types.js'));
  ({ showError, clearError, showSuccess } = require('./application-messages.js'));
} else {
  renderFieldTypeOptions = window.renderFieldTypeOptions;
  showError = window.showError;
  clearError = window.clearError;
  showSuccess = window.showSuccess;
}

function renderApplicationBuilder(builderRoot, appData = {}, programId, currentYear, currentType) {
  // Check if questions are locked (responses have been submitted)
  const questionsLocked = appData.locked && appData.locked.includes('questions');

  builderRoot.innerHTML = `       <form id="application-builder-form" class="bg-white rounded-2xl shadow-lg p-8 sm:p-12 max-w-4xl w-full mx-auto border-t-4 border-legend-gold flex flex-col gap-6">         <div>           <label class="block text-lg font-bold text-legend-blue mb-2" for="app-title">Application Title</label>           <input type="text" id="app-title" aria-label="Application title" class="border rounded-xl px-4 py-2 w-full" placeholder="e.g. 2025 Boys State Delegate Application" required />         </div>         <div>           <label class="block text-base font-semibold text-gray-700 mb-2" for="app-description">Application Description</label>           <textarea id="app-description" aria-label="Application description" class="border rounded-xl px-4 py-2 w-full min-h-[60px]" placeholder="Describe this application form"></textarea>         </div>         <div>           <label class="block text-base font-semibold text-gray-700 mb-2" for="app-closing-date">Application Closing Date <span class="text-sm font-normal text-gray-500">(optional)</span></label>           <input type="datetime-local" id="app-closing-date" aria-label="Application closing date" class="border rounded-xl px-4 py-2 w-full max-w-md" />           <p class="text-xs text-gray-500 mt-1">After this date, applicants will not be able to submit applications.</p>         </div>         <div>           <label class="block text-base font-semibold text-gray-700 mb-2" for="questions-list">Questions</label>           <div id="questions-list" class="flex flex-col gap-4"></div>           <button type="button" id="add-question-btn" aria-label="Add question" class="mt-6 bg-legend-blue hover:bg-legend-gold text-white font-bold py-2 px-4 rounded-xl shadow transition ${questionsLocked ? 'opacity-50 cursor-not-allowed' : ''}" ${questionsLocked ? 'disabled' : ''}>             + Add Question           </button>         </div>         <button type="submit" id="save-application-btn" class="bg-legend-blue hover:bg-legend-gold text-white font-bold py-2 px-8 rounded-xl shadow transition self-center mt-4 ${questionsLocked ? 'opacity-50 cursor-not-allowed' : ''}" ${questionsLocked ? 'disabled' : ''}>              Save Application         </button>       </form>        `;
  let questions = Array.isArray(appData.questions) ? appData.questions : [];

  // ALWAYS ensure the first three questions are "First Name", "Last Name", and "Email" (required, cannot be removed)
  const hasFirstName = questions.length > 0 && questions[0].text === 'First Name';
  const hasLastName = questions.length > 1 && questions[1].text === 'Last Name';
  const hasEmail = questions.length > 2 && questions[2].text === 'Email';

  if (!hasFirstName || !hasLastName || !hasEmail) {
    // Remove any existing system fields that are in wrong positions
    questions = questions.filter(q => q.text !== 'First Name' && q.text !== 'Last Name' && q.text !== 'Full Name' && q.text !== 'Email');

    // Insert required system fields at the beginning
    questions.unshift(
      {
        type: 'email',
        text: 'Email',
        required: true,
        isSystemField: true // Mark as system field to prevent removal
      },
      {
        type: 'short_answer',
        text: 'Last Name',
        required: true,
        isSystemField: true // Mark as system field to prevent removal
      },
      {
        type: 'short_answer',
        text: 'First Name',
        required: true,
        isSystemField: true // Mark as system field to prevent removal
      }
    );
  } else {
    // Ensure existing system fields are marked as required and system fields
    questions[0].required = true;
    questions[0].isSystemField = true;
    questions[1].required = true;
    questions[1].isSystemField = true;
    questions[2].required = true;
    questions[2].isSystemField = true;
  }

  document.getElementById('app-title').value = appData.title || '';
  document.getElementById('app-description').value = appData.description || '';
  // Set closing date if it exists
  if (appData.closingDate) {
    const closingDate = new Date(appData.closingDate);
    const localDateTime = new Date(closingDate.getTime() - closingDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('app-closing-date').value = localDateTime;
  }

  // --- Question rendering and editing ---
  function renderQuestions() {
    const questionsList = document.getElementById('questions-list');
    questionsList.innerHTML = '';
    questions.forEach((q, idx) => {
      questionsList.innerHTML += renderQuestionRow(q, idx, questionsLocked);
    });
    attachEditListeners();
  }

  function renderQuestionRow(q, idx, isLocked = false) {
    // Different fields for different types
    // Show options/fields depending on q.type
    let optionsHTML = '';
    if (["dropdown", "radio", "checkbox"].includes(q.type)) {
      optionsHTML = `
          <div class="ml-4 mt-2">
            <label class="block text-xs text-gray-500 mb-1">Options</label>
            <div id="opts-${idx}">
              ${q.options.map((opt, oidx) => `
                <div class="flex gap-2 items-center mb-1">
                  <label for="q${idx}-opt-${oidx}" class="sr-only">Option ${oidx + 1}</label>
                  <input id="q${idx}-opt-${oidx}" type="text" aria-label="Option ${oidx + 1}" class="border rounded px-2 py-1 flex-1 text-sm ${isLocked ? 'bg-gray-100' : ''}" value="${opt}" data-optidx="${oidx}" data-qidx="${idx}" ${isLocked ? 'readonly' : ''} />
                  ${isLocked ? '' : `<button type="button" class="text-red-600 hover:underline text-xs" data-remove-opt="${oidx}" data-qidx="${idx}">Remove</button>`}
                </div>`).join('')}
            </div>
            ${isLocked ? '' : `<div class="flex mt-2 gap-2">
              <label for="add-opt-${idx}" class="sr-only">New option</label>
              <input type="text" id="add-opt-${idx}" aria-label="New option" class="border rounded px-2 py-1 text-sm" placeholder="Add option..." />
              <button type="button" class="bg-gray-200 text-xs px-2 py-1 rounded" data-add-opt="${idx}">Add</button>
            </div>`}
          </div>
        `;
    } else if(q.type === "file") {
      optionsHTML = `
          <div class="ml-4 mt-2 flex gap-4 items-center">
            <div>
              <label class="block text-xs text-gray-500 mb-1" for="file-accept-${idx}">Allowed Types (comma, e.g. .pdf,.jpg)</label>
              <input id="file-accept-${idx}" type="text" aria-label="Allowed file types" class="border rounded px-2 py-1 text-sm ${isLocked ? 'bg-gray-100' : ''}" placeholder=".pdf,.jpg" value="${q.accept || ''}" data-file-accept="${idx}" ${isLocked ? 'readonly' : ''} />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1" for="file-max-${idx}">Max Files</label>
              <input id="file-max-${idx}" type="number" min="1" aria-label="Max files" class="border rounded px-2 py-1 text-sm w-20 ${isLocked ? 'bg-gray-100' : ''}" placeholder="1" value="${q.maxFiles || 1}" data-file-maxfiles="${idx}" ${isLocked ? 'readonly' : ''} />
            </div>
          </div>
        `;
    } else if(q.type === "static_text") {
      optionsHTML = `<div class="ml-4 mt-2"><span class="text-xs text-gray-500">Static info only, no input for applicants.</span></div>`;
    } else if(q.type === "boolean") {
      optionsHTML = `<div class="ml-4 mt-2"><span class="text-xs text-gray-500">Will render as Yes/No toggle.</span></div>`;
    } else if(q.type === "address") {
      optionsHTML = `<div class="ml-4 mt-2"><span class="text-xs text-gray-500">Standard US address fields.</span></div>`;
    }

    // System fields (First Name, Last Name, Email) cannot be removed and are always required
    const isSystemField = q.isSystemField || idx === 0 || idx === 1 || idx === 2;
    // Disable editing if system field OR if questions are locked
    const fieldDisabled = isSystemField || isLocked;
    const removeButtonHTML = isSystemField
      ? `<span class="text-xs text-gray-500 ml-2 px-2 py-1 bg-blue-100 rounded">Required Field</span>`
      : (isLocked ? '' : `<button type="button" class="text-red-600 hover:underline ml-2" data-remove="${idx}">Remove</button>`);
    const requiredCheckboxDisabled = fieldDisabled ? 'disabled' : '';
    const requiredCheckboxTitle = isSystemField ? 'This field is always required' : (isLocked ? 'Questions are locked' : '');

    return `
        <div class="border rounded-xl p-4 ${isSystemField ? 'bg-blue-50 border-blue-200' : (isLocked ? 'bg-gray-100 border-gray-300' : 'bg-gray-50')} flex flex-col gap-2">
          <div class="flex gap-2 items-center mb-2">
            <label for="q-text-${idx}" class="sr-only">Question text</label>
            <input id="q-text-${idx}" type="text" aria-label="Question text" class="border rounded px-3 py-2 flex-1 ${fieldDisabled ? 'bg-gray-100' : ''}" placeholder="Question text/label" value="${q.text || ''}" data-idx="${idx}" ${fieldDisabled ? 'readonly' : ''} />
            <label for="q-type-${idx}" class="sr-only">Field type</label>
            <select id="q-type-${idx}" aria-label="Field type" class="border rounded px-2 py-2 text-sm" data-type-idx="${idx}" ${fieldDisabled ? 'disabled' : ''}>
              ${renderFieldTypeOptions(q.type)}
            </select>
            <div class="flex items-center ml-2">
              <input id="q-req-${idx}" type="checkbox" class="" ${q.required ? 'checked' : ''} data-required-idx="${idx}" aria-label="Required" ${requiredCheckboxDisabled} title="${requiredCheckboxTitle}" />
              <label for="q-req-${idx}" class="ml-1">Required</label>
            </div>
            ${removeButtonHTML}
          </div>
          ${optionsHTML}
        </div>
      `;
  }

  // Attach all listeners for edit controls
  function attachEditListeners() {
    // Label
    builderRoot.querySelectorAll('input[data-idx]').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +input.dataset.idx;
        questions[idx].text = input.value;
      });
    });
    // Type
    builderRoot.querySelectorAll('select[data-type-idx]').forEach(sel => {
      sel.addEventListener('change', e => {
        const idx = +sel.dataset.typeIdx;
        const newType = sel.value;
        const old = questions[idx];
        // Change type, reset irrelevant properties
        questions[idx] = createDefaultQuestion(newType, old.text, old.required);
        renderQuestions();
      });
    });
    // Required
    builderRoot.querySelectorAll('input[data-required-idx]').forEach(chk => {
      chk.addEventListener('change', e => {
        const idx = +chk.dataset.requiredIdx;
        questions[idx].required = chk.checked;
      });
    });
    // Remove question (but not the first three fields which are always First Name, Last Name, and Email)
    builderRoot.querySelectorAll('button[data-remove]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +btn.dataset.remove;
        // Prevent removing the first three fields (First Name, Last Name, Email - system fields)
        if (idx === 0 || idx === 1 || idx === 2) {
          if (showError) showError('The First Name, Last Name, and Email fields cannot be removed. They are required for all applications.');
          return;
        }
        questions.splice(idx, 1);
        renderQuestions();
      });
    });
    // --- Option editing for dropdown/radio/checkbox ---
    // Remove option
    builderRoot.querySelectorAll('button[data-remove-opt]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +btn.dataset.qidx;
        const oidx = +btn.dataset.removeOpt;
        if (questions[idx] && Array.isArray(questions[idx].options)) {
          questions[idx].options.splice(oidx, 1);
          renderQuestions();
        }
      });
    });
    // Add option
    builderRoot.querySelectorAll('button[data-add-opt]').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +btn.dataset.addOpt;
        const input = document.getElementById(`add-opt-${idx}`);
        if (input && input.value && input.value.trim() && questions[idx] && Array.isArray(questions[idx].options)) {
          questions[idx].options.push(input.value.trim());
          input.value = '';
          renderQuestions();
        }
      });
    });
    // Edit option value
    builderRoot.querySelectorAll('input[data-optidx]').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +input.dataset.qidx;
        const oidx = +input.dataset.optidx;
        if (questions[idx] && Array.isArray(questions[idx].options)) {
          questions[idx].options[oidx] = input.value;
        }
      });
    });
    // File fields (accept, maxFiles)
    builderRoot.querySelectorAll('input[data-file-accept]').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +input.dataset.fileAccept;
        questions[idx].accept = input.value;
      });
    });
    builderRoot.querySelectorAll('input[data-file-maxfiles]').forEach(input => {
      input.addEventListener('input', e => {
        const idx = +input.dataset.fileMaxfiles;
        questions[idx].maxFiles = parseInt(input.value) || 1;
      });
    });
  }

  // Default data structure per question type
  function createDefaultQuestion(type, text = '', required = false) {
    if (["dropdown","radio","checkbox"].includes(type)) {
      return { type, text, required, options: [] };
    }
    if (type === "file") {
      return { type, text, required, accept: ".pdf,.jpg", maxFiles: 1 };
    }
    // section/static_text/boolean/address/date/date_range/phone/number/email/paragraph/short_answer
    return { type, text, required };
  }

  document.getElementById('add-question-btn').onclick = function() {
    questions.push(createDefaultQuestion("short_answer"));
    renderQuestions();
  };

  document.getElementById('application-builder-form').onsubmit = async function(e) {
    e.preventDefault();
    // Prevent saving if questions are locked
    if (questionsLocked) {
      showError('Cannot save: Questions are locked because responses have been submitted. Delete all responses to unlock editing.');
      return;
    }
    const title = document.getElementById('app-title').value.trim();
    const description = document.getElementById('app-description').value.trim();
    const closingDateValue = document.getElementById('app-closing-date').value;
    // Remove empty or invalid questions
    const filteredQuestions = questions.filter(q => q.text.trim() !== "");
    if (!programId || !currentYear || !currentType) {
      showError('Missing program id');
      return;
    }
    const payload = {
      year: currentYear,
      type: currentType,
      title,
      description,
      closingDate: closingDateValue ? new Date(closingDateValue).toISOString() : null,
      questions: filteredQuestions
    };
    const saveBtn = document.querySelector('#application-builder-form button[type="submit"]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }
    clearError();
    try {
      const res = await fetch(`${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (res.ok || res.status === 201) {
        showSuccess('Application saved');
      } else {
        showError('Failed to save application');
      }
    } catch {
      showError('Failed to save application');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Application';
      }
    }
  };

  document.getElementById('copyLinkBtn').onclick = function() {
    const textarea = document.getElementById('publicApplicationUrl');
    textarea.select();
    textarea.setSelectionRange(0, 99999); // Mobile
    navigator.clipboard.writeText(textarea.value).then(function() {
      const status = document.getElementById('copyStatus');
      status.classList.remove('hidden');
      setTimeout(() => status.classList.add('hidden'), 1200);
      showSuccess('Link copied');
    });
  };

  renderQuestions();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderApplicationBuilder };
} else {
  window.renderApplicationBuilder = renderApplicationBuilder;
}
})();

