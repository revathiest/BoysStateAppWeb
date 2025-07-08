// programs-config.js

const apiBase = window.API_URL || ""; // Or your own config mechanism

// Get username from localStorage/sessionStorage/JWT -- adjust as needed
function getUsername() {
  // Try localStorage, sessionStorage, or parse from JWT if you store it
  return localStorage.getItem("user") || sessionStorage.getItem("user");
}

// Get auth headers (if you use JWT Bearer tokens)
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Render the program selector (dropdown or label)
function renderProgramSelector(programs, selectedProgramId) {
  const container = document.getElementById("program-selector");
  container.innerHTML = "";

  if (programs.length === 1) {
    const p = programs[0];
    container.innerHTML = `
      <div class="mb-2 flex items-center">
        <span class="font-bold text-blue-900 mr-2">Program:</span>
        <span class="text-lg text-legend-gold">${p.programName || p.name}</span>
        <input type="hidden" id="current-program-id" value="${p.programId || p.id}">
      </div>
    `;
    updateConfigLinks(p.programId || p.id);
  } else if (programs.length > 1) {
    // Dropdown menu
    const options = programs
      .map(
        (p) =>
          `<option value="${p.programId || p.id}" ${
            (p.programId || p.id) === selectedProgramId ? "selected" : ""
          }>${p.programName || p.name}</option>`
      )
      .join("");
    container.innerHTML = `
      <label class="font-bold text-blue-900 mr-2" for="program-select">Program:</label>
      <select id="program-select" class="border rounded px-2 py-1 focus:outline-none">
        ${options}
      </select>
    `;
    document
      .getElementById("program-select")
      .addEventListener("change", (e) => {
        updateConfigLinks(e.target.value);
      });
    // Set the links initially
    updateConfigLinks(selectedProgramId || (programs[0].programId || programs[0].id));
  } else {
    // No programs found
    container.innerHTML = `<div class="text-red-600 font-semibold">No programs found for this user.</div>`;
  }
}

// Update all config links with selected programId
function updateConfigLinks(programId) {
  document
    .querySelectorAll('a[href*="YOUR_PROGRAM_ID"]')
    .forEach((link) => {
      link.href = link.href.replace(/YOUR_PROGRAM_ID/g, programId);
    });
  // Store for other navigation
  window.selectedProgramId = programId;
}

async function fetchProgramsAndRenderSelector() {
  const username = getUsername();
  if (!username) {
    document.getElementById("program-selector").innerHTML =
      "<span class='text-red-600 font-semibold'>No user found. Please log in again.</span>";
    return;
  }

  try {
    const response = await fetch(
      `${apiBase}/user-programs/${encodeURIComponent(username)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
      }
    );
    if (!response.ok) throw new Error("Failed to fetch programs.");
    const data = await response.json();
    // API returns { username, programs: [...] }
    const programs = data.programs || [];
    let lastSelected = localStorage.getItem("lastSelectedProgramId");
    let selected = lastSelected && programs.some(p => (p.programId || p.id) === lastSelected)
      ? lastSelected
      : programs[0]?.programId || programs[0]?.id;

    renderProgramSelector(programs, selected);

    // If you want to remember user selection
    document.getElementById("program-selector").addEventListener("change", (e) => {
      localStorage.setItem("lastSelectedProgramId", e.target.value);
    });

  } catch (e) {
    document.getElementById("program-selector").innerHTML =
      `<span class='text-red-600 font-semibold'>Error loading programs: ${e.message}</span>`;
  }
}

// On load
document.addEventListener("DOMContentLoaded", () => {
  fetchProgramsAndRenderSelector();
});
