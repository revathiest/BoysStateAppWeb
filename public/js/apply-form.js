// js/apply-form.js

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
              <input type="text" name="${name}_city" list="${name}_city_list" placeholder="City" class="flex-1 border rounded px-3 py-2" ${required}>
              <datalist id="${name}_city_list"></datalist>
              <select name="${name}_state" class="w-20 border rounded px-3 py-2" ${required}></select>
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderApplicationForm };
}

