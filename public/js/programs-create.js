document.getElementById('createProgramForm').onsubmit = async function(e) {
    e.preventDefault();
    document.getElementById('formError').classList.add('hidden');
    document.getElementById('formSuccess').classList.add('hidden');
  
    const name = document.getElementById('name').value.trim();
    const year = document.getElementById('year').value.trim();
  
    if (!name || !year) {
      showError("Program name and year are required.");
      return;
    }
    if (isNaN(Number(year))) {
      showError("Year must be a number.");
      return;
    }
  
    // Use the global API URL from config.js
    const apiBaseUrl = window.API_URL || "http://localhost:3000";
  
    document.getElementById('createBtn').disabled = true;
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (typeof getAuthHeaders === 'function') {
        Object.assign(headers, getAuthHeaders());
      }
      const res = await fetch(`${apiBaseUrl}/programs`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name,
          year: Number(year)
        })
      });
  
      if (res.status === 201) {
        const data = await res.json();
        showSuccess(`Program created! <br><span class="font-mono text-xs">ID: ${data.id}</span><br>Name: <b>${data.name}</b> (${data.year})`);
        document.getElementById('name').value = '';
        document.getElementById('year').value = '';
      } else {
        const err = await res.json();
        showError(err.error || "Failed to create program.");
      }
    } catch {
      showError("Network/server error.");
    }
    document.getElementById('createBtn').disabled = false;
  };
  
  function showError(msg) {
    const el = document.getElementById('formError');
    el.innerHTML = msg;
    el.classList.remove('hidden');
  }
  function showSuccess(msg) {
    const el = document.getElementById('formSuccess');
    el.innerHTML = msg;
    el.classList.remove('hidden');
  }
