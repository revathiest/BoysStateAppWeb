/* istanbul ignore file */
// js/apply-submit.js

async function handleFormSubmit(e, form, config, formStatus) {
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

    const answers = [];
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
          value = files && files.length > 0 ? Array.from(files).map(f => f.name) : null;
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

      answers.push({ questionId: q.id, value });
    }

    if (errors.length) {
      formStatus.textContent = errors.join("\n");
      formStatus.classList.remove('hidden', 'text-green-700');
      formStatus.classList.add('text-red-700');
      return;
    }

    const programId = getProgramId();
    try {
      const response = await fetch(`${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers })
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      formStatus.textContent = "Application submitted! Thank you for applying.";
      formStatus.classList.remove('hidden', 'text-red-700');
      formStatus.classList.add('text-green-700');
      form.reset();
    } catch (err) {
      formStatus.textContent = "Submission failed. Please try again later.";
      formStatus.classList.remove('hidden', 'text-green-700');
      formStatus.classList.add('text-red-700');
    }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleFormSubmit };
}

