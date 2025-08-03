// js/apply-address.js

function initAddressHelpers(form) {
  const cityInputs = Array.from(form.querySelectorAll('input[name$="_city"]'));
  cityInputs.forEach(cityInput => {
    const base = cityInput.name.replace(/_city$/, '');
    const stateSelect = form.querySelector(`[name="${base}_state"]`);
    const zipInput = form.querySelector(`[name="${base}_zip"]`);
    const datalist = document.getElementById(`${base}_city_list`);

    cityInput.addEventListener('input', async () => {
      const val = cityInput.value.trim();
      if (val.length < 2) return;
      try {
        const res = await fetch(`/api/zip-info?city=${encodeURIComponent(val)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.cities) {
          datalist.innerHTML = data.cities.map(c => `<option value="${c}">`).join('');
        }
        if (data.states && data.states.length) {
          stateSelect.innerHTML = data.states.map(s => `<option value="${s}">${s}</option>`).join('');
          if (data.states.length === 1) {
            stateSelect.value = data.states[0];
          } else {
            stateSelect.value = '';
          }
        }
      } catch {}
    });

    zipInput.addEventListener('blur', async () => {
      const zip = zipInput.value.trim();
      if (!zip) return;
      try {
        const res = await fetch(`/api/zip-info?zip=${encodeURIComponent(zip)}`);
        if (!res.ok) return;
        const data = await res.json();
        const errDiv = document.getElementById(`err_${base}`);
        if (data.states && stateSelect.value && !data.states.includes(stateSelect.value)) {
          errDiv.textContent = 'ZIP code does not match selected state.';
        } else if (errDiv.textContent === 'ZIP code does not match selected state.') {
          errDiv.textContent = '';
        }
      } catch {}
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAddressHelpers };
}

