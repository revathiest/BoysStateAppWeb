// Parse programId from URL
function getProgramIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('programId') || '';
}
const programId = getProgramIdFromUrl();

document.addEventListener("DOMContentLoaded", async function() {
  const programNameLabel = document.getElementById('programNameLabel');
  const errorMsg = document.getElementById('errorMsg');
  const formEls = document.querySelectorAll('input, button.save, button.cancel');

  if (!programId) {
    errorMsg.textContent = "Missing ?programId= in the URL!";
    errorMsg.classList.remove('hidden');
    formEls.forEach(el => el.disabled = true);
    programNameLabel.textContent = "";
    return;
  }

  // Loading indicator
  programNameLabel.textContent = "Loading program…";
  errorMsg.classList.add('hidden');
  formEls.forEach(el => el.disabled = true);

  try {
    const API_URL = window.API_URL;
    // Get program label info
    const res = await fetch(`${API_URL}/programs/${programId}`, {
      headers: typeof getAuthHeaders === "function" ? getAuthHeaders() : {}
    });

    const raw = await res.clone().text();
    if (res.ok) {
      const program = JSON.parse(raw);
      const label = program.name
        ? `${program.name}${program.year ? " (" + program.year + ")" : ""}`
        : `Program ${programId}`;
      programNameLabel.textContent = label;
      errorMsg.classList.add('hidden');
      formEls.forEach(el => el.disabled = false);
      // --- CHANGED: Fetch branding/contact data ---
      await loadBrandingContactFromApi(); // CHANGED
    } else {
      programNameLabel.textContent = `Program not found (${programId})`;
      errorMsg.textContent = "Program not found!";
      errorMsg.classList.remove('hidden');
      formEls.forEach(el => el.disabled = true);
    }
  } catch (e) {
    programNameLabel.textContent = `Failed to load program (${programId})`;
    errorMsg.textContent = "Could not load program info.";
    errorMsg.classList.remove('hidden');
    formEls.forEach(el => el.disabled = true);
  }
});

// --- CHANGED: Load from new endpoint ---
async function loadBrandingContactFromApi() {
  const API_URL = window.API_URL;
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.classList.add('hidden');

  try {
    const res = await fetch(`${API_URL}/api/branding-contact/${programId}`, {
      headers: typeof getAuthHeaders === "function" ? getAuthHeaders() : {}
    });
    if (res.ok) {
      const config = await res.json();
      loadConfig(config);
    } else {
      // If not found, just clear the form (could show an error if you prefer)
      resetForm();
    }
  } catch (e) {
    errorMsg.textContent = "Could not load branding/contact config.";
    errorMsg.classList.remove('hidden');
  }
}

// Reset form to default state
function resetForm() {
  document.getElementById('welcomeMessage').value = '';
  document.getElementById('logoUrl').value = '';
  document.getElementById('iconUrl').value = '';
  document.getElementById('bannerUrl').value = '';
  document.getElementById('primaryColor').value = '#0C2340';
  document.getElementById('secondaryColor').value = '#F3C300';
  document.getElementById('backgroundColor').value = '#FFFFFF';
  document.getElementById('contactEmail').value = '';
  document.getElementById('contactPhone').value = '';
  document.getElementById('contactWebsite').value = '';
  document.getElementById('contactFacebook').value = '';
}

// Load config from backend (or demo)
function loadConfig(config) {
  // Just map flat fields to your inputs
  document.getElementById('welcomeMessage').value = config.welcomeMessage || '';
  document.getElementById('logoUrl').value = config.logoUrl || '';
  document.getElementById('iconUrl').value = config.iconUrl || '';
  document.getElementById('bannerUrl').value = config.bannerUrl || '';
  document.getElementById('primaryColor').value = config.colorPrimary || '#0C2340';
  document.getElementById('secondaryColor').value = config.colorSecondary || '#F3C300';
  document.getElementById('backgroundColor').value = config.colorBackground || '#FFFFFF';
  document.getElementById('contactEmail').value = config.contactEmail || '';
  document.getElementById('contactPhone').value = config.contactPhone || '';
  document.getElementById('contactWebsite').value = config.contactWebsite || '';
  document.getElementById('contactFacebook').value = config.contactFacebook || '';
}


// --- CHANGED: Save config to backend via PUT ---
async function saveConfig() {
  if (!programId) return;
  const API_URL = window.API_URL;
  const errorMsg = document.getElementById('errorMsg');
  const successMsg = document.getElementById('successMsg');
  errorMsg.classList.add('hidden');
  if (successMsg) successMsg.classList.add('hidden');

  const config = {
    welcomeMessage: document.getElementById('welcomeMessage').value.trim(),
    branding: {
      logoUrl: document.getElementById('logoUrl').value.trim(),
      iconUrl: document.getElementById('iconUrl').value.trim(),
      bannerUrl: document.getElementById('bannerUrl').value.trim()
    },
    colors: {
      primary: document.getElementById('primaryColor').value,
      secondary: document.getElementById('secondaryColor').value,
      background: document.getElementById('backgroundColor').value
    },
    contact: {
      email: document.getElementById('contactEmail').value.trim(),
      phone: document.getElementById('contactPhone').value.trim(),
      website: document.getElementById('contactWebsite').value.trim(),
      facebook: document.getElementById('contactFacebook').value.trim()
    }
  };

  try {
    const res = await fetch(`${API_URL}/api/branding-contact/${programId}`, {
      method: 'PUT',
      headers: {
        ...((typeof getAuthHeaders === "function") ? getAuthHeaders() : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      if (successMsg) {
        successMsg.textContent = "Saved!";
        successMsg.classList.remove('hidden');
      } else {
        alert("Saved!");
      }
      // Optionally re-load
      await loadBrandingContactFromApi();
    } else {
      errorMsg.textContent = "Failed to save. Please try again.";
      errorMsg.classList.remove('hidden');
    }
  } catch (e) {
    errorMsg.textContent = "Could not save branding/contact config.";
    errorMsg.classList.remove('hidden');
  }
}

// Logout button handler
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

  // Save and Cancel button handlers
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveConfig);
  }

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetForm);
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getProgramIdFromUrl, loadConfig, resetForm, loadBrandingContactFromApi, saveConfig };
}

