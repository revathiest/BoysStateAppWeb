// application-config.js

// Supported field types with labels and config
const FIELD_TYPES = [
    { value: "short_answer", label: "Short Answer" },
    { value: "paragraph", label: "Paragraph" },
    { value: "dropdown", label: "Dropdown (Select)" },
    { value: "radio", label: "Radio Buttons" },
    { value: "checkbox", label: "Checkboxes" },
    { value: "date", label: "Date Picker" },
    { value: "date_range", label: "Date Range" },
    { value: "phone", label: "Phone Number" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "file", label: "Document Upload" },
    { value: "section", label: "Section/Header" },
    { value: "static_text", label: "Static Text / Instructions" },
    { value: "boolean", label: "Yes/No (Boolean)" },
    { value: "address", label: "Address" },
    { value: "repeating_group", label: "Repeating Group" }
    ];
    
    // Helpers for rendering
    function renderFieldTypeOptions(selected) {
    return FIELD_TYPES.map(
    t => `<option value="${t.value}"${selected === t.value ? " selected" : ""}>${t.label}</option>`
    ).join("");
    }
    
    // ---- Main App Builder Logic ----
    document.addEventListener("DOMContentLoaded", function() {
    const createBtn = document.getElementById('create-application-form');
    const card = document.getElementById('create-form-card');
    const builderRoot = document.getElementById('application-builder-root');
    
    if (createBtn) {
    createBtn.addEventListener('click', () => {
    card.style.display = 'none';
    renderApplicationBuilder();
    });
    }
    
    function renderApplicationBuilder() {
    builderRoot.innerHTML = `       <form id="application-builder-form" class="bg-white rounded-2xl shadow-lg p-8 sm:p-12 max-w-4xl w-full mx-auto border-t-4 border-legend-gold flex flex-col gap-6">         <div>           <label class="block text-lg font-bold text-legend-blue mb-2">Application Title</label>           <input type="text" id="app-title" class="border rounded-xl px-4 py-2 w-full" placeholder="e.g. 2025 Boys State Delegate Application" required />         </div>         <div>           <label class="block text-base font-semibold text-gray-700 mb-2">Application Description</label>           <textarea id="app-description" class="border rounded-xl px-4 py-2 w-full min-h-[60px]" placeholder="Describe this application form"></textarea>         </div>         <div>           <label class="block text-base font-semibold text-gray-700 mb-2">Questions</label>           <div id="questions-list" class="flex flex-col gap-4"></div>           <button type="button" id="add-question-btn" class="mt-6 bg-legend-blue hover:bg-legend-gold text-white font-bold py-2 px-4 rounded-xl shadow transition">             + Add Question           </button>         </div>         <button type="submit" class="bg-legend-blue hover:bg-legend-gold text-white font-bold py-2 px-8 rounded-xl shadow transition self-center mt-4">
              Save Application         </button>       </form>
        `;
    let questions = [];
    
    // --- Question rendering and editing ---
    function renderQuestions() {
      const questionsList = document.getElementById('questions-list');
      questionsList.innerHTML = '';
      questions.forEach((q, idx) => {
        questionsList.innerHTML += renderQuestionRow(q, idx);
      });
      attachEditListeners();
    }
    
    function renderQuestionRow(q, idx) {
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
                  <input type="text" class="border rounded px-2 py-1 flex-1 text-sm" value="${opt}" data-optidx="${oidx}" data-qidx="${idx}" />
                  <button type="button" class="text-red-600 hover:underline text-xs" data-remove-opt="${oidx}" data-qidx="${idx}">Remove</button>
                </div>`).join('')}
            </div>
            <div class="flex mt-2 gap-2">
              <input type="text" class="border rounded px-2 py-1 text-sm" placeholder="Add option..." id="add-opt-${idx}" />
              <button type="button" class="bg-gray-200 text-xs px-2 py-1 rounded" data-add-opt="${idx}">Add</button>
            </div>
          </div>
        `;
      } else if(q.type === "file") {
        optionsHTML = `
          <div class="ml-4 mt-2 flex gap-4 items-center">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Allowed Types (comma, e.g. .pdf,.jpg)</label>
              <input type="text" class="border rounded px-2 py-1 text-sm" placeholder=".pdf,.jpg" value="${q.accept || ''}" data-file-accept="${idx}" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Max Files</label>
              <input type="number" min="1" class="border rounded px-2 py-1 text-sm w-20" placeholder="1" value="${q.maxFiles || 1}" data-file-maxfiles="${idx}" />
            </div>
          </div>
        `;
      } else if(q.type === "static_text") {
        optionsHTML = `<div class="ml-4 mt-2"><span class="text-xs text-gray-500">Static info only, no input for applicants.</span></div>`;
      } else if(q.type === "boolean") {
        optionsHTML = `<div class="ml-4 mt-2"><span class="text-xs text-gray-500">Will render as Yes/No toggle.</span></div>`;
      } else if(q.type === "address") {
        optionsHTML = `<div class="ml-4 mt-2"><span class="text-xs text-gray-500">Standard US address fields.</span></div>`;
      } else if(q.type === "repeating_group") {
        optionsHTML = `
          <div class="ml-4 mt-2">
            <label class="block text-xs text-gray-500 mb-1">Fields in this group</label>
            <div id="repeat-fields-${idx}">
              ${(q.fields || []).map((field, fidx) => `
                <div class="flex gap-2 items-center mb-1">
                  <input type="text" class="border rounded px-2 py-1 flex-1 text-sm" value="${field.text}" disabled />
                  <span class="text-xs text-gray-500">${FIELD_TYPES.find(t=>t.value===field.type)?.label || field.type}</span>
                  <button type="button" class="text-red-600 hover:underline text-xs" data-remove-repeat-field="${fidx}" data-qidx="${idx}">Remove</button>
                </div>`).join('')}
            </div>
            <div class="flex mt-2 gap-2">
              <select id="repeat-add-type-${idx}" class="border rounded px-2 py-1 text-sm">
                ${renderFieldTypeOptions("short_answer")}
              </select>
              <input type="text" class="border rounded px-2 py-1 text-sm" placeholder="Field label..." id="repeat-add-label-${idx}" />
              <button type="button" class="bg-gray-200 text-xs px-2 py-1 rounded" data-add-repeat-field="${idx}">Add Field</button>
            </div>
          </div>
        `;
      }
      return `
        <div class="border rounded-xl p-4 bg-gray-50 flex flex-col gap-2">
          <div class="flex gap-2 items-center mb-2">
            <input type="text" class="border rounded px-3 py-2 flex-1" placeholder="Question text/label" value="${q.text || ''}" data-idx="${idx}" />
            <select class="border rounded px-2 py-2 text-sm" data-type-idx="${idx}">
              ${renderFieldTypeOptions(q.type)}
            </select>
            <input type="checkbox" class="ml-2" ${q.required ? 'checked' : ''} data-required-idx="${idx}" title="Required" />
            <button type="button" class="text-red-600 hover:underline ml-2" data-remove="${idx}">Remove</button>
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
      builderRoot.querySelectorAll('input[data-required-idx]').forEach(box => {
        box.addEventListener('change', e => {
          const idx = +box.dataset.requiredIdx;
          questions[idx].required = box.checked;
        });
      });
      // Remove question
      builderRoot.querySelectorAll('button[data-remove]').forEach(btn => {
        btn.addEventListener('click', e => {
          const idx = +btn.dataset.remove;
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
          questions[idx].options.splice(oidx, 1);
          renderQuestions();
        });
      });
      // Add option
      builderRoot.querySelectorAll('button[data-add-opt]').forEach(btn => {
        btn.addEventListener('click', e => {
          const idx = +btn.dataset.addOpt;
          const input = document.getElementById(`add-opt-${idx}`);
          if (input.value.trim()) {
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
          questions[idx].options[oidx] = input.value;
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
      // Repeating group: remove field
      builderRoot.querySelectorAll('button[data-remove-repeat-field]').forEach(btn => {
        btn.addEventListener('click', e => {
          const idx = +btn.dataset.qidx;
          const fidx = +btn.dataset.removeRepeatField;
          (questions[idx].fields = questions[idx].fields || []).splice(fidx, 1);
          renderQuestions();
        });
      });
      // Repeating group: add field
      builderRoot.querySelectorAll('button[data-add-repeat-field]').forEach(btn => {
        btn.addEventListener('click', e => {
          const idx = +btn.dataset.addRepeatField;
          const sel = document.getElementById(`repeat-add-type-${idx}`);
          const labelInput = document.getElementById(`repeat-add-label-${idx}`);
          if (labelInput.value.trim()) {
            (questions[idx].fields = questions[idx].fields || []).push({
              type: sel.value,
              text: labelInput.value.trim(),
              required: false
            });
            labelInput.value = '';
            renderQuestions();
          }
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
      if (type === "repeating_group") {
        return { type, text, required, fields: [] };
      }
      // section/static_text/boolean/address/date/date_range/phone/number/email/paragraph/short_answer
      return { type, text, required };
    }
    
    document.getElementById('add-question-btn').onclick = function() {
      questions.push(createDefaultQuestion("short_answer"));
      renderQuestions();
    };
    
    document.getElementById('application-builder-form').onsubmit = function(e) {
      e.preventDefault();
      const title = document.getElementById('app-title').value.trim();
      const description = document.getElementById('app-description').value.trim();
      // Remove empty or invalid questions
      const filteredQuestions = questions.filter(q => q.text.trim() !== "");
      // TODO: Replace with API call
      alert("Application Saved!\n\n" + JSON.stringify({ title, description, questions: filteredQuestions }, null, 2));
    };
    
    renderQuestions();
    
    }
    });
    