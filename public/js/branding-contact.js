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
    errorMsg.style.display = 'block';
    formEls.forEach(el => el.disabled = true);
    programNameLabel.textContent = "";
    return;
  }

  // Loading indicator
  programNameLabel.textContent = "Loading program…";
  errorMsg.style.display = 'none';
  formEls.forEach(el => el.disabled = true);

  try {
    const API_URL = window.API_URL;
    console.log("Fetching program:", `/programs/${programId}`);
    const res = await fetch(`${API_URL}/programs/${programId}`, {
      headers: typeof getAuthHeaders === "function" ? getAuthHeaders() : {}
    });

    const raw = await res.clone().text();
    console.log("API status:", res.status, "API response:", raw);

    if (res.ok) {
      const program = JSON.parse(raw);
      const label = program.name
        ? `${program.name}${program.year ? " (" + program.year + ")" : ""}`
        : `Program ${programId}`;
      programNameLabel.textContent = label;
      errorMsg.style.display = 'none';
      formEls.forEach(el => el.disabled = false);
      //loadConfig(program.branding || {});
    } else {
      programNameLabel.textContent = `Program not found (${programId})`;
      errorMsg.textContent = "Program not found!";
      errorMsg.style.display = 'block';
      formEls.forEach(el => el.disabled = true);
    }
  } catch (e) {
    programNameLabel.textContent = `Failed to load program (${programId})`;
    errorMsg.textContent = "Could not load program info.";
    errorMsg.style.display = 'block';
    formEls.forEach(el => el.disabled = true);
  }
});

// Reset form to default state
function resetForm() {
  document.getElementById('programName').value = '';
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
  debugger;
  document.getElementById('programName').value = config.name || '';
  document.getElementById('welcomeMessage').value = config.welcomeMessage || '';
  document.getElementById('logoUrl').value = config.logoUrl || '';
  document.getElementById('iconUrl').value = config.iconUrl || '';
  document.getElementById('bannerUrl').value = config.bannerUrl || '';
  document.getElementById('primaryColor').value = config.colors?.primary || '#0C2340';
  document.getElementById('secondaryColor').value = config.colors?.secondary || '#F3C300';
  document.getElementById('backgroundColor').value = config.colors?.background || '#FFFFFF';
  document.getElementById('contactEmail').value = config.contact?.email || '';
  document.getElementById('contactPhone').value = config.contact?.phone || '';
  document.getElementById('contactWebsite').value = config.contact?.website || '';
  document.getElementById('contactFacebook').value = config.contact?.facebook || '';
}

// Save config to backend (stub/demo version)
function saveConfig() {
  if (!programId) return;
  const config = {
    name: document.getElementById('programName').value.trim(),
    welcomeMessage: document.getElementById('welcomeMessage').value.trim(),
    logoUrl: document.getElementById('logoUrl').value.trim(),
    iconUrl: document.getElementById('iconUrl').value.trim(),
    bannerUrl: document.getElementById('bannerUrl').value.trim(),
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
  alert("Saving for programId = " + programId + ":\n\n" + JSON.stringify(config, null, 2));
  // TODO: send to API endpoint here...
  // fetch(`${API_URL}/programs/${programId}/branding`, { method: "PUT", headers: {...}, body: JSON.stringify(config) })
}

// Logout button handler
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  }
});
