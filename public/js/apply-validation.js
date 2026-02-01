// js/apply-validation.js

function formatPhoneNumber(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length < 4) return `(${digits}`;
    if (digits.length < 7) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

function isValidPhoneNumber(value) {
    return value ? value.replace(/\D/g, '').length === 10 : false;
}

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
        const validDigits = isValidPhoneNumber(phone);
        if ((q.required && !validDigits) || (!q.required && phone && !validDigits)) {
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

function addValidationListeners(form, config) {
    config.questions.forEach(q => {
        const name = `q_${q.id}`;
        switch (q.type) {
      case "short_answer":
      case "paragraph":
      case "email":
      case "number":
      case "date":
      case "dropdown":
        if (form[name]) {
          form[name].addEventListener('input', () => validateField(q, form));
        }
        break;
      case "phone":
        if (form[name]) {
          const el = form[name];
          el.addEventListener('input', () => {
            el.value = formatPhoneNumber(el.value);
            validateField(q, form);
          });
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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validateField, addValidationListeners, formatPhoneNumber, isValidPhoneNumber };
}

