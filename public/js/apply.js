// js/apply.js

function getProgramId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('programId');
  }
  
  const programId = getProgramId();

  function validateField(q, form) {
    const name = `q_${q.id}`;
    let err = "";
  
    switch (q.type) {
      case "short_answer":
      case "paragraph":
        if (q.required && !form[name]?.value?.trim()) {
          err = "This field is required.";
        }
        break;
      case "email":
        const val = form[name]?.value?.trim();
        if (q.required && (!val || !/^[\w-.]+@[\w-]+\.[\w-.]+$/.test(val))) {
          err = "Please enter a valid email address.";
        }
        break;
      case "number":
        const num = form[name]?.value;
        if (q.required && (num === "" || isNaN(Number(num)))) {
          err = "Please enter a valid number.";
        }
        break;
      case "phone":
        const phone = form[name]?.value?.trim();
        if (q.required && (!phone || !/^[0-9+\-()\s]{7,}$/.test(phone))) {
          err = "Please enter a valid phone number.";
        }
        break;
      case "checkbox":
        const checked = form.querySelectorAll(`[name="${name}"]:checked`).length;
        if (q.required && checked === 0) {
          err = "Please check at least one option.";
        }
        break;
      case "radio":
        const selected = form.querySelector(`[name="${name}"]:checked`);
        if (q.required && !selected) {
          err = "Please select an option.";
        }
        break;
      case "dropdown":
        if (q.required && !form[name]?.value) {
          err = "Please select an option.";
        }
        break;
      case "date":
        if (q.required && !form[name]?.value) {
          err = "Please select a date.";
        }
        break;
      case "date_range":
        const start = form[`${name}_start`]?.value;
        const end = form[`${name}_end`]?.value;
        if (q.required && (!start || !end)) {
          err = "Please select both start and end dates.";
        } else if (start && end && new Date(start) > new Date(end)) {
          err = "Start date cannot be after end date.";
        }
        break;
      case "file":
        const files = form[name]?.files;
        if (q.required && (!files || files.length === 0)) {
          err = "Please upload a file.";
        }
        if (q.maxFiles && files && files.length > q.maxFiles) {
          err = `You can upload up to ${q.maxFiles} file(s).`;
        }
        break;
      case "boolean":
        if (q.required && !form[name]?.checked) {
          err = "Please check this box.";
        }
        break;
      case "address":
        const line1 = form[`${name}_line1`]?.value?.trim();
        const city = form[`${name}_city`]?.value?.trim();
        const state = form[`${name}_state`]?.value?.trim();
        const zip = form[`${name}_zip`]?.value?.trim();
        if (q.required && (!line1 || !city || !state || !zip)) {
          err = "Please complete the address.";
        }
        break;
    }
  
    // Show or clear the error message
    const errDiv = document.getElementById(`err_${name}`);
    if (errDiv) errDiv.textContent = err;
  
    // Return validity
    return !err;
  }
 
  async function fetchApplicationConfig(programId) {
    const url = `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('Could not load application configuration.');
    return await response.json();
  }
  
  function renderApplicationForm(config) {
    if (!config) return;
  
    // Set program title and description
    document.getElementById('programTitle').textContent = config.title || "Program Application";
    document.getElementById('programBranding').innerHTML = config.description
      ? `<div class="mb-4 text-gray-700">${config.description}</div>`
      : '';
  
    const form = document.getElementById('applicationForm');
    form.innerHTML = "";
  
    // Sort by "order" just in case
    config.questions.sort((a, b) => a.order - b.order);
  
    for (const q of config.questions) {
      let field = "";
      const required = q.required ? 'required' : '';
      const name = `q_${q.id}`;
      const errorDiv = `<div class="text-red-600 text-xs mt-1" id="err_${name}"></div>`;
  
      switch (q.type) {
        case "short_answer":
          field = `<input type="text" id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required}>`;
          break;
        case "paragraph":
          field = `<textarea id="${name}" name="${name}" rows="3" class="w-full border rounded px-3 py-2" ${required}></textarea>`;
          break;
        case "checkbox":
          field = q.options.map((opt, idx) =>
            `<label class="inline-flex items-center mr-4">
              <input type="checkbox" name="${name}" value="${opt}" class="mr-1"> ${opt}
            </label>`
          ).join('');
          break;
        case "radio":
          field = q.options.map((opt, idx) =>
            `<label class="inline-flex items-center mr-4">
              <input type="radio" name="${name}" value="${opt}" class="mr-1" ${idx === 0 && q.required ? 'required' : ''}> ${opt}
            </label>`
          ).join('');
          break;
        case "date":
          field = `<input type="date" id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required}>`;
          break;
        case "date_range":
          field = `
            <div class="flex gap-2">
              <input type="date" id="${name}_start" name="${name}_start" class="w-full border rounded px-3 py-2" ${required} placeholder="Start date">
              <span class="self-center">to</span>
              <input type="date" id="${name}_end" name="${name}_end" class="w-full border rounded px-3 py-2" ${required} placeholder="End date">
            </div>`;
          break;
        case "phone":
          field = `<input type="tel" id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required} pattern="[0-9\\-\\s\\(\\)]*">`;
          break;
        case "number":
          field = `<input type="number" id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required}>`;
          break;
        case "email":
          field = `<input type="email" id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required}>`;
          break;
        case "file":
          field = `<input type="file" id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required}
            ${q.accept ? `accept="${q.accept}"` : ''} ${q.maxFiles && q.maxFiles > 1 ? `multiple` : ''}>`;
          break;
        case "section":
          field = `<div class="text-xl font-bold mt-8 mb-2 text-blue-900">${q.text}</div>`;
          break;
        case "static_text":
          field = `<div class="mb-4 text-gray-700">${q.text}</div>`;
          break;
        case "boolean":
          field = `
            <label class="inline-flex items-center gap-2">
              <input type="checkbox" id="${name}" name="${name}" class="border rounded" ${required}>
              Yes
            </label>`;
          break;
        case "address":
          field = `
            <input type="text" name="${name}_line1" placeholder="Address line 1" class="w-full border rounded px-3 py-2 mb-2" ${required}>
            <input type="text" name="${name}_line2" placeholder="Address line 2" class="w-full border rounded px-3 py-2 mb-2">
            <div class="flex gap-2">
              <input type="text" name="${name}_city" placeholder="City" class="flex-1 border rounded px-3 py-2" ${required}>
              <input type="text" name="${name}_state" placeholder="State" class="w-20 border rounded px-3 py-2" ${required}>
              <input type="text" name="${name}_zip" placeholder="ZIP" class="w-24 border rounded px-3 py-2" ${required}>
            </div>`;
          break;
        case "dropdown":
          field = `<select id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required}>
            <option value="">-- Select --</option>
            ${(q.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>`;
          break;
        default:
          field = `<input type="text" id="${name}" name="${name}" class="w-full border rounded px-3 py-2" ${required}>`;
      }
  
      // Section/static_text should be rendered standalone, not in a label
      if (q.type === "section" || q.type === "static_text") {
        form.innerHTML += field;
      } else {
        form.innerHTML += `
          <div class="mb-4">
            <label class="block font-semibold mb-1" for="${name}">${q.text}${q.required ? ' *' : ''}</label>
            ${field}
            ${errorDiv}
          </div>
        `;
      }
    }
  
    form.innerHTML += `
      <button type="submit" class="w-full bg-legend-blue text-white font-bold py-2 px-4 rounded-2xl shadow hover:bg-legend-gold transition">Submit Application</button>
    `;
  }
  
  document.addEventListener('DOMContentLoaded', async function() {
    debugger;
    if (!programId) {
      document.getElementById('applicationForm').innerHTML = '<div class="text-red-700">No program selected. Please use a valid application link.</div>';
      return;
    }
  
    try {
      const config = await fetchApplicationConfig(programId);
      renderApplicationForm(config);
  
      const form = document.getElementById('applicationForm');
      const formStatus = document.getElementById('formStatus');

      // Add inline validation listeners
config.questions.forEach(q => {
    const name = `q_${q.id}`;
    switch (q.type) {
      case "short_answer":
      case "paragraph":
      case "email":
      case "number":
      case "phone":
      case "date":
      case "dropdown":
        if (form[name]) {
          form[name].addEventListener('input', () => validateField(q, form));
        }
        break;
      case "file":
        if (form[name]) {
          form[name].addEventListener('change', () => validateField(q, form));
        }
        break;
      case "checkbox":
      case "radio":
        const boxes = form.querySelectorAll(`[name="${name}"]`);
        boxes.forEach(box =>
          box.addEventListener('change', () => validateField(q, form))
        );
        break;
      case "date_range":
        if (form[`${name}_start`]) {
          form[`${name}_start`].addEventListener('change', () => validateField(q, form));
        }
        if (form[`${name}_end`]) {
          form[`${name}_end`].addEventListener('change', () => validateField(q, form));
        }
        break;
      case "boolean":
        if (form[name]) {
          form[name].addEventListener('change', () => validateField(q, form));
        }
        break;
      case "address":
        ["_line1", "_city", "_state", "_zip"].forEach(suffix => {
          if (form[`${name}${suffix}`]) {
            form[`${name}${suffix}`].addEventListener('input', () => validateField(q, form));
          }
        });
        break;
    }
  });
  
      
      form.onsubmit = async function (e) {
        e.preventDefault();
        let valid = true;
        config.questions.forEach(q => {
          if (!validateField(q, form)) valid = false;
        });
        if (!valid) {
          formStatus.textContent = "Please fix errors above before submitting.";
          formStatus.classList.remove('hidden', 'text-green-700');
          formStatus.classList.add('text-red-700');
          return;
        }
      
        const data = {};
        let errors = [];
      
        for (const q of config.questions) {
          const name = `q_${q.id}`;
          let value = null;
      
          switch (q.type) {
            case "short_answer":
            case "paragraph":
            case "address":
            case "section":
            case "static_text":
              value = form[name]?.value?.trim();
              break;
      
            case "email":
              value = form[name]?.value?.trim();
              if (q.required && (!value || !/^[\w-.]+@[\w-]+\.[\w-.]+$/.test(value))) {
                errors.push(`Please enter a valid email for: "${q.text}"`);
              }
              break;
      
            case "number":
              value = form[name]?.value?.trim();
              if (q.required && (value === "" || isNaN(Number(value)))) {
                errors.push(`Please enter a valid number for: "${q.text}"`);
              }
              break;
      
            case "phone":
              value = form[name]?.value?.trim();
              if (q.required && (!value || !/^[0-9+\-()\s]{7,}$/.test(value))) {
                errors.push(`Please enter a valid phone number for: "${q.text}"`);
              }
              break;
      
            case "checkbox":
              value = Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);
              if (q.required && value.length === 0) {
                errors.push(`Please check at least one option for: "${q.text}"`);
              }
              break;
      
            case "radio":
              value = form.querySelector(`input[name="${name}"]:checked`)?.value || "";
              if (q.required && !value) {
                errors.push(`Please select an option for: "${q.text}"`);
              }
              break;
      
            case "dropdown":
              value = form[name]?.value?.trim();
              if (q.required && !value) {
                errors.push(`Please select a value for: "${q.text}"`);
              }
              break;
      
            case "date":
              value = form[name]?.value?.trim();
              if (q.required && !value) {
                errors.push(`Please select a date for: "${q.text}"`);
              }
              break;
      
            case "date_range":
              const start = form[`${name}_start`]?.value?.trim();
              const end = form[`${name}_end`]?.value?.trim();
              value = { start, end };
              if (q.required && (!start || !end)) {
                errors.push(`Please select a valid start and end date for: "${q.text}"`);
              }
              if (start && end && new Date(start) > new Date(end)) {
                errors.push(`Start date cannot be after end date for: "${q.text}"`);
              }
              break;
      
            case "file":
              const files = form[name]?.files;
              value = files && files.length > 0 ? files : null;
              if (q.required && (!files || files.length === 0)) {
                errors.push(`Please upload a file for: "${q.text}"`);
              }
              if (q.maxFiles && files && files.length > q.maxFiles) {
                errors.push(`You can upload up to ${q.maxFiles} file(s) for: "${q.text}"`);
              }
              break;
      
            case "boolean":
              value = form[name]?.checked ? true : false;
              if (q.required && !form[name]?.checked) {
                errors.push(`Please check the box for: "${q.text}"`);
              }
              break;
      
            case "address":
              // For address, check line1, city, state, zip (if required)
              const line1 = form[`${name}_line1`]?.value?.trim();
              const city = form[`${name}_city`]?.value?.trim();
              const state = form[`${name}_state`]?.value?.trim();
              const zip = form[`${name}_zip`]?.value?.trim();
              value = { line1, city, state, zip };
              if (q.required && (!line1 || !city || !state || !zip)) {
                errors.push(`Please complete the address for: "${q.text}"`);
              }
              break;
            // Add more as needed!
          }
      
          data[q.id] = value;
        }
      
        if (errors.length) {
          formStatus.textContent = errors.join("\n");
          formStatus.classList.remove('hidden', 'text-green-700');
          formStatus.classList.add('text-red-700');
          return;
        }
      
        // TODO: Post data to backend here!
        // await fetch(`${window.API_URL}/api/public/applications/${programId}/submit`, {method:'POST', body:JSON.stringify(data)})
      
        formStatus.textContent = "Application submitted! Thank you for applying.";
        formStatus.classList.remove('hidden', 'text-red-700');
        formStatus.classList.add('text-green-700');
        form.reset();
      };
      
    } catch (err) {
      document.getElementById('applicationForm').innerHTML = '<div class="text-red-700">Could not load application. Please check your link or try again later.</div>';
    }
  });
  