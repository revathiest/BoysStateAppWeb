(function() {
'use strict';

const apiBase = window.API_URL || 'http://localhost:3000';

// State
let currentProgramId = null;
let currentProgramYearId = null;
let currentCsvContent = null;
let previewData = null;

// Get programId from URL or localStorage
function getProgramId() {
  const urlParams = new URLSearchParams(window.location.search);
  const fromUrl = urlParams.get('programId');
  if (fromUrl) {
    localStorage.setItem('lastSelectedProgramId', fromUrl);
    return fromUrl;
  }
  return localStorage.getItem('lastSelectedProgramId');
}

// Get selected operation type
function getOperationType() {
  const selected = document.querySelector('input[name="operationType"]:checked');
  return selected ? selected.value : 'delegates';
}

// Show error message
function showError(message) {
  const errorBox = document.getElementById('errorBox');
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  setTimeout(() => errorBox.classList.add('hidden'), 8000);
}

// Show success message
function showSuccess(message) {
  const successBox = document.getElementById('successBox');
  successBox.textContent = message;
  successBox.classList.remove('hidden');
  setTimeout(() => successBox.classList.add('hidden'), 5000);
}

// Escape HTML for safe rendering
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Update navigation links with programId
function updateNavLinks() {
  const programId = getProgramId();
  if (!programId) return;

  const backLink = document.getElementById('back-link');
  if (backLink) {
    backLink.href = `user-management.html?programId=${encodeURIComponent(programId)}`;
  }
}

// Load program years
async function loadYears() {
  const programId = getProgramId();
  if (!programId) {
    showError('No program selected');
    return;
  }
  currentProgramId = programId;

  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
  const yearSelect = document.getElementById('year-select');

  try {
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(programId)}/years`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load years');
    }

    const years = await response.json();

    if (years.length === 0) {
      yearSelect.innerHTML = '<option value="">No years available</option>';
      return;
    }

    // Sort by year descending
    years.sort((a, b) => b.year - a.year);

    yearSelect.innerHTML = years.map(y =>
      `<option value="${y.id}" data-year="${y.year}">${y.year}</option>`
    ).join('');

    // Select the first (most recent) year
    currentProgramYearId = years[0].id;

  } catch (err) {
    showError(err.message || 'Failed to load years');
    console.error('Error loading years:', err);
  }
}

// Download template
async function downloadTemplate() {
  if (!currentProgramId) {
    showError('No program selected');
    return;
  }

  const type = getOperationType();
  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

  try {
    const response = await fetch(`${apiBase}/programs/${encodeURIComponent(currentProgramId)}/bulk/template/${type}`, {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (err) {
    showError(err.message || 'Failed to download template');
    console.error('Error downloading template:', err);
  }
}

// Handle file selection
function handleFileSelect(file) {
  if (!file) return;

  if (!file.name.endsWith('.csv')) {
    showError('Please select a CSV file');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function(e) {
    currentCsvContent = e.target.result;
    document.getElementById('selectedFile').textContent = file.name;
    document.getElementById('selectedFile').classList.remove('hidden');

    // Preview the data
    await previewImport();
  };
  reader.readAsText(file);
}

// Preview import
async function previewImport() {
  if (!currentCsvContent || !currentProgramYearId) {
    showError('Please select a file and year');
    return;
  }

  const type = getOperationType();
  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

  try {
    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/bulk/preview/${type}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ csvContent: currentCsvContent }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to preview import');
    }

    previewData = await response.json();
    renderPreview(previewData);

  } catch (err) {
    showError(err.message || 'Failed to preview import');
    console.error('Error previewing import:', err);
  }
}

// Render preview
function renderPreview(data) {
  const previewSection = document.getElementById('previewSection');
  previewSection.classList.remove('hidden');

  const type = getOperationType();

  // Update stats
  document.getElementById('statTotal').textContent = data.totalRows;
  document.getElementById('statValid').textContent = data.validRows;
  document.getElementById('statNew').textContent = data.newUsers;
  document.getElementById('statExisting').textContent = data.existingUsers;

  // Show/hide parent stats based on type
  const parentsContainer = document.getElementById('statParentsContainer');
  if (type === 'delegates') {
    parentsContainer.classList.remove('hidden');
    document.getElementById('statParents').textContent = data.newParents || 0;
  } else {
    parentsContainer.classList.add('hidden');
  }

  // Show errors
  const errorsSection = document.getElementById('previewErrors');
  const errorList = document.getElementById('errorList');
  if (data.errors && data.errors.length > 0) {
    errorsSection.classList.remove('hidden');
    errorList.innerHTML = data.errors.map(e =>
      `<div class="text-red-700 mb-1">Row ${e.row}: <strong>${escapeHtml(e.field)}</strong> - ${escapeHtml(e.message)}</div>`
    ).join('');
  } else {
    errorsSection.classList.add('hidden');
  }

  // Show warnings
  const warningsSection = document.getElementById('previewWarnings');
  const warningList = document.getElementById('warningList');
  if (data.warnings && data.warnings.length > 0) {
    warningsSection.classList.remove('hidden');
    warningList.innerHTML = data.warnings.map(w =>
      `<div class="text-yellow-700 mb-1">Row ${w.row}: <strong>${escapeHtml(w.field)}</strong> - ${escapeHtml(w.message)}</div>`
    ).join('');
  } else {
    warningsSection.classList.add('hidden');
  }

  // Render table header
  const tableHead = document.getElementById('previewTableHead');
  if (data.headers && data.headers.length > 0) {
    tableHead.innerHTML = `<tr>${data.headers.map(h => `<th class="px-3 py-2 text-left font-semibold text-gray-700">${escapeHtml(h)}</th>`).join('')}<th class="px-3 py-2 text-left font-semibold text-gray-700">Status</th></tr>`;
  }

  // Render table body
  const tableBody = document.getElementById('previewTableBody');
  if (data.preview && data.preview.length > 0) {
    tableBody.innerHTML = data.preview.map(row => {
      const statusClass = row.valid
        ? (row.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')
        : 'bg-red-100 text-red-700';
      const statusText = row.valid
        ? (row.status === 'new' ? 'New' : 'Existing')
        : 'Invalid';

      const cells = data.headers.map(h => `<td class="px-3 py-2 border-b">${escapeHtml(row.data[h] || '')}</td>`).join('');
      return `<tr class="${!row.valid ? 'opacity-50' : ''}">${cells}<td class="px-3 py-2 border-b"><span class="px-2 py-1 rounded text-xs font-medium ${statusClass}">${statusText}</span></td></tr>`;
    }).join('');
  }

  // Disable import button if no valid rows
  const importBtn = document.getElementById('importBtn');
  if (data.validRows === 0) {
    importBtn.disabled = true;
    importBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    importBtn.disabled = false;
    importBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  // Scroll to preview
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

// Execute import
async function executeImport() {
  if (!currentCsvContent || !currentProgramYearId || !previewData) {
    showError('Please preview the data first');
    return;
  }

  if (previewData.validRows === 0) {
    showError('No valid rows to import');
    return;
  }

  const type = getOperationType();
  const sendEmails = document.getElementById('sendEmailsCheckbox').checked;
  const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

  // Show progress
  document.getElementById('previewSection').classList.add('hidden');
  document.getElementById('progressSection').classList.remove('hidden');
  const progressBar = document.getElementById('progressBar');
  progressBar.classList.remove('w-0', 'w-full');
  progressBar.classList.add('w-1/2');
  document.getElementById('progressText').textContent = 'Importing data...';

  try {
    const response = await fetch(`${apiBase}/program-years/${currentProgramYearId}/bulk/import/${type}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ csvContent: currentCsvContent, sendEmails }),
    });

    progressBar.classList.remove('w-0', 'w-1/2');
    progressBar.classList.add('w-full');

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to import data');
    }

    const results = await response.json();
    renderResults(results);

  } catch (err) {
    document.getElementById('progressSection').classList.add('hidden');
    showError(err.message || 'Failed to import data');
    console.error('Error importing data:', err);
  }
}

// Render results
function renderResults(results) {
  document.getElementById('progressSection').classList.add('hidden');
  document.getElementById('resultsSection').classList.remove('hidden');

  const type = getOperationType();

  // Update stats
  document.getElementById('resultSuccess').textContent = results.success;
  document.getElementById('resultFailed').textContent = results.failed;
  document.getElementById('resultSkipped').textContent = results.skipped;
  document.getElementById('resultEmails').textContent = results.emailsSent;

  // Show/hide parent stats based on type
  const parentsContainer = document.getElementById('resultParentsContainer');
  if (type === 'delegates') {
    parentsContainer.classList.remove('hidden');
    document.getElementById('resultParents').textContent = results.parentsCreated || 0;
  } else {
    parentsContainer.classList.add('hidden');
  }

  // Show errors
  const errorsSection = document.getElementById('importErrors');
  const errorList = document.getElementById('importErrorList');
  if (results.errors && results.errors.length > 0) {
    errorsSection.classList.remove('hidden');
    errorList.innerHTML = results.errors.map(e =>
      `<div class="text-red-700 mb-1">Row ${e.row} (${escapeHtml(e.email)}): ${escapeHtml(e.error)}</div>`
    ).join('');
  } else {
    errorsSection.classList.add('hidden');
  }

  // Show success message
  if (results.success > 0) {
    showSuccess(`Successfully imported ${results.success} records!`);
  }

  // Scroll to results
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Reset form for new import
function resetForm() {
  currentCsvContent = null;
  previewData = null;

  document.getElementById('selectedFile').classList.add('hidden');
  document.getElementById('selectedFile').textContent = '';
  document.getElementById('previewSection').classList.add('hidden');
  document.getElementById('progressSection').classList.add('hidden');
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('fileInput').value = '';

  // Reset progress bar
  const progressBar = document.getElementById('progressBar');
  progressBar.classList.remove('w-1/2', 'w-full');
  progressBar.classList.add('w-0');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Auth check
  if (typeof requireAuth === 'function') {
    requireAuth();
  }

  // Update nav links
  updateNavLinks();

  // Load years
  loadYears();

  // Year selector change
  document.getElementById('year-select').addEventListener('change', (e) => {
    currentProgramYearId = e.target.value ? parseInt(e.target.value) : null;
    // Reset if year changes after file was loaded
    if (currentCsvContent) {
      previewImport();
    }
  });

  // Operation type change
  document.querySelectorAll('input[name="operationType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Reset if type changes after file was loaded
      if (currentCsvContent) {
        previewImport();
      }
    });
  });

  // Download template button
  document.getElementById('downloadTemplateBtn').addEventListener('click', downloadTemplate);

  // File input
  const fileInput = document.getElementById('fileInput');
  document.getElementById('selectFileBtn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Drag and drop
  const dropZone = document.getElementById('dropZone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-legend-blue', 'bg-blue-50');
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-legend-blue', 'bg-blue-50');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-legend-blue', 'bg-blue-50');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  // Import button
  document.getElementById('importBtn').addEventListener('click', executeImport);

  // Cancel import button
  document.getElementById('cancelImportBtn').addEventListener('click', resetForm);

  // New import button
  document.getElementById('newImportBtn').addEventListener('click', resetForm);

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramId,
    getOperationType,
    escapeHtml,
    downloadTemplate,
    handleFileSelect,
    previewImport,
    executeImport,
    resetForm,
  };
}
})();
