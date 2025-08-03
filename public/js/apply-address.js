// public/js/apply-address.js

function initAddressHelpers(form) {
  // One-time load of the zip/city/state database
  if (!window._zipCityDataPromise) {
    window._zipCityDataPromise = fetch('/docs/zipData.json').then(r => r.json());
  }

  window._zipCityDataPromise.then(zipData => {
    Array.from(form.querySelectorAll("input[name$='_city']")).forEach(cityInput => {
      const base = cityInput.name.replace(/_city$/, '');
      const stateSelect = form.querySelector(`[name='${base}_state']`);
      const zipInput = form.querySelector(`[name='${base}_zip']`);
      const errDiv = document.getElementById(`err_${base}`) || document.createElement('div');
      if (!stateSelect || !zipInput) return;

      // --- City typeahead ---
      let dropdown;
      function showSuggestions(list) {
        removeSuggestions();
        if (!list.length) return;
        dropdown = document.createElement('div');
        dropdown.className = "absolute z-50 bg-white border rounded shadow mt-1 max-h-40 overflow-auto";
        dropdown.style.width = cityInput.offsetWidth + "px";
        dropdown.style.left = cityInput.offsetLeft + "px";
        dropdown.style.top = (cityInput.offsetTop + cityInput.offsetHeight) + "px";
        list.forEach(city => {
          const item = document.createElement('div');
          item.textContent = city;
          item.className = "cursor-pointer px-3 py-1 hover:bg-blue-100";
          item.onclick = () => {
            cityInput.value = city;
            removeSuggestions();
            filterStates(city);
            validateAll();
          };
          dropdown.appendChild(item);
        });
        cityInput.parentNode.appendChild(dropdown);
      }
      function removeSuggestions() {
        if (dropdown) {
          dropdown.remove();
          dropdown = null;
        }
      }
      cityInput.addEventListener('input', function() {
        const val = cityInput.value.trim().toUpperCase();
        const stateVal = stateSelect.value;
        if (val.length < 2) return removeSuggestions();
        let filtered = zipData.filter(z =>
          z.city.startsWith(val) &&
          (!stateVal || z.state === stateVal)
        );
        let uniqueCities = [...new Set(filtered.map(z => z.city))];
        showSuggestions(uniqueCities.slice(0, 8));
      });
      cityInput.addEventListener('blur', function() {
        setTimeout(removeSuggestions, 200); // let click happen first
        validateAll();
      });

      // --- State dropdown filtering ---
      function filterStates(city) {
        if (!city) return;
        const matching = zipData.filter(z => z.city === city.toUpperCase());
        const uniqueStates = [...new Set(matching.map(z => z.state))];
        stateSelect.innerHTML = '<option value="">State</option>' +
          uniqueStates.map(s => `<option value="${s}">${s}</option>`).join('');
        if (uniqueStates.length === 1) stateSelect.value = uniqueStates[0];
      }

      stateSelect.addEventListener('change', function() {
        // When state changes, re-validate city and filter city suggestions
        const stateVal = stateSelect.value;
        const cityVal = cityInput.value.trim().toUpperCase();
        if (cityVal) {
          const cities = zipData.filter(z => (!stateVal || z.state === stateVal) && z.city.startsWith(cityVal));
          if (cities.length === 0) {
            errDiv.textContent = "No cities found for selected state.";
            cityInput.classList.add('border-red-500');
          } else {
            errDiv.textContent = "";
            cityInput.classList.remove('border-red-500');
          }
        }
        validateAll();
      });

      // --- ZIP validation ---
      zipInput.addEventListener('blur', function() {
        validateAll();
      });

      function validateAll() {
        const zip = zipInput.value.trim();
        const city = cityInput.value.trim().toUpperCase();
        const state = stateSelect.value.trim().toUpperCase();

        let error = "";

        if (zip && city && state) {
          const found = zipData.some(z => z.zip === zip && z.city === city && z.state === state);
          if (!found) {
            error = "ZIP, city, and state do not match our records.";
          }
        } else if (zip && (city || state)) {
          // Validate partials
          const matches = zipData.filter(z => z.zip === zip);
          if (!matches.length) {
            error = "Unknown ZIP code.";
          } else {
            if (city && !matches.some(z => z.city === city)) error = "ZIP does not match city.";
            if (state && !matches.some(z => z.state === state)) error = "ZIP does not match state.";
          }
        }
        errDiv.textContent = error;
        if (error) {
          zipInput.classList.add('border-red-500');
          cityInput.classList.add('border-red-500');
          stateSelect.classList.add('border-red-500');
        } else {
          zipInput.classList.remove('border-red-500');
          cityInput.classList.remove('border-red-500');
          stateSelect.classList.remove('border-red-500');
        }
      }
    });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAddressHelpers };
}
