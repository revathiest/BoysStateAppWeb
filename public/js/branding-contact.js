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
  
    try {debugger;
    
        const API_URL = window.API_URL;
      // LOG the URL and headers being fetched:
      console.log("Fetching program:", `/programs/${programId}`);
      const res = await fetch(`${API_URL}/programs/${programId}`, {
        headers: typeof getAuthHeaders === "function" ? getAuthHeaders() : {}
      });
  
      // LOG status and body
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
        loadConfig();
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
  
  
  // Preview image handlers
  function previewImage(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    input.addEventListener('change', function() {
      const file = input.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          preview.src = e.target.result;
          preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        preview.src = '';
        preview.style.display = 'none';
      }
    });
  }
  previewImage('logoUpload', 'logoPreview');
  previewImage('iconUpload', 'iconPreview');
  previewImage('bannerUpload', 'bannerPreview');
  
  // Reset form to default state
  function resetForm() {
    document.getElementById('programName').value = '';
    document.getElementById('welcomeMessage').value = '';
    ['logoUpload','iconUpload','bannerUpload'].forEach(id => {
      document.getElementById(id).value = '';
      const preview = document.getElementById(id.replace('Upload', 'Preview'));
      preview.src = '';
      preview.style.display = 'none';
    });
    document.getElementById('primaryColor').value = '#0C2340';
    document.getElementById('secondaryColor').value = '#F3C300';
    document.getElementById('backgroundColor').value = '#FFFFFF';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactWebsite').value = '';
    document.getElementById('contactFacebook').value = '';
  }
  
  // Load config from backend (stub/demo version)
  function loadConfig() {
    // TODO: replace with actual fetch call to your API:
    // fetch(`/api/programs/${programId}/branding`).then(r => r.json()).then(config => { ... });
    // For now, use demo/default values:
    const demo = {
      name: "Texas Boys State 2025",
      welcomeMessage: "Welcome to Texas Boys State!",
      logoUrl: "",
      iconUrl: "",
      bannerUrl: "",
      colors: {
        primary: "#0C2340",
        secondary: "#F3C300",
        background: "#FFFFFF"
      },
      contact: {
        email: "help@texasboysstate.org",
        phone: "(512) 555-1234",
        website: "https://texasboysstate.org",
        facebook: "https://facebook.com/texasboysstate"
      }
    };
    document.getElementById('programName').value = demo.name || '';
    document.getElementById('welcomeMessage').value = demo.welcomeMessage || '';
    if (demo.logoUrl) {
      document.getElementById('logoPreview').src = demo.logoUrl;
      document.getElementById('logoPreview').style.display = 'block';
    }
    if (demo.iconUrl) {
      document.getElementById('iconPreview').src = demo.iconUrl;
      document.getElementById('iconPreview').style.display = 'block';
    }
    if (demo.bannerUrl) {
      document.getElementById('bannerPreview').src = demo.bannerUrl;
      document.getElementById('bannerPreview').style.display = 'block';
    }
    document.getElementById('primaryColor').value = demo.colors.primary;
    document.getElementById('secondaryColor').value = demo.colors.secondary;
    document.getElementById('backgroundColor').value = demo.colors.background;
    document.getElementById('contactEmail').value = demo.contact.email;
    document.getElementById('contactPhone').value = demo.contact.phone;
    document.getElementById('contactWebsite').value = demo.contact.website;
    document.getElementById('contactFacebook').value = demo.contact.facebook;
  }
  
  // Save config to backend (stub/demo version)
  function saveConfig() {
    if (!programId) return;
    const config = {
      name: document.getElementById('programName').value.trim(),
      welcomeMessage: document.getElementById('welcomeMessage').value.trim(),
      logoUrl: document.getElementById('logoPreview').src || "",
      iconUrl: document.getElementById('iconPreview').src || "",
      bannerUrl: document.getElementById('bannerPreview').src || "",
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
    // fetch(`/api/programs/${programId}/branding`, { method: "PUT", headers: {...}, body: JSON.stringify(config) })
  }

  // On load
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.location.href = 'login.html'; // Redirect to login or home
      });
    }
    fetchProgramsAndRenderSelector();
  });
  