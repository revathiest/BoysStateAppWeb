// email-templates.js

// Parse programId from URL
function getProgramIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('programId') || '';
}

const programId = getProgramIdFromUrl();
let currentTemplate = 'delegate_welcome';
let templates = {};
let hasUnsavedChanges = false;
let quillEditor = null;
let isHtmlMode = false;

// Show status message
function showStatus(message, isError = false) {
  const statusMsg = document.getElementById('statusMsg');
  statusMsg.textContent = message;
  statusMsg.className = `rounded-lg px-4 py-3 mb-6 ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
  statusMsg.classList.remove('hidden');

  setTimeout(() => {
    statusMsg.classList.add('hidden');
  }, 5000);
}

// Update enabled status display
function updateEnabledStatus(enabled) {
  const enabledStatus = document.getElementById('enabledStatus');
  const templateEnabled = document.getElementById('templateEnabled');
  templateEnabled.checked = enabled;
  enabledStatus.textContent = enabled ? '(Enabled)' : '(Disabled)';
  enabledStatus.className = `ml-2 text-sm ${enabled ? 'text-green-600 font-semibold' : 'text-gray-500'}`;
}

// Initialize Quill editor
function initQuillEditor() {
  if (quillEditor) return;

  // Check if Quill is available
  if (typeof Quill === 'undefined') {
    console.error('Quill library not loaded - falling back to HTML-only mode');
    // Show fallback message in editor container
    const editorContainer = document.getElementById('editorContainer');
    if (editorContainer) {
      editorContainer.innerHTML = `
        <div class="quill-fallback">
          <p class="text-red-600 font-semibold mb-2">Visual editor could not be loaded.</p>
          <p class="text-gray-600 text-sm">Please use HTML mode to edit the template body.</p>
        </div>
      `;
    }
    // Force HTML mode
    setViewMode(true);
    // Disable visual button
    const visualBtn = document.getElementById('viewVisualBtn');
    if (visualBtn) {
      visualBtn.disabled = true;
      visualBtn.classList.add('opacity-50', 'cursor-not-allowed');
      visualBtn.title = 'Visual editor could not be loaded';
    }
    return;
  }

  try {
    // Note: Removed color, background, and align options as they require
    // unsafe-inline styles in CSP. Basic formatting uses CSS classes instead.
    quillEditor = new Quill('#quillEditor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link'],
          ['clean']
        ]
      },
      placeholder: 'Compose your email template...'
    });

    // Track changes
    quillEditor.on('text-change', () => {
      markUnsaved();
      syncToTextarea();
    });

    console.log('Quill editor initialized successfully');
  } catch (err) {
    console.error('Failed to initialize Quill editor:', err);
    // Show error and fall back to HTML mode
    const editorContainer = document.getElementById('editorContainer');
    if (editorContainer) {
      editorContainer.innerHTML = `
        <div class="quill-fallback">
          <p class="text-red-600 font-semibold mb-2">Visual editor failed to load.</p>
          <p class="text-gray-600 text-sm">Please use HTML mode to edit the template body.</p>
        </div>
      `;
    }
    setViewMode(true);
    const visualBtn = document.getElementById('viewVisualBtn');
    if (visualBtn) {
      visualBtn.disabled = true;
      visualBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }
}

// Sync Quill content to hidden textarea
function syncToTextarea() {
  if (!quillEditor || isHtmlMode) return;
  const html = quillEditor.root.innerHTML;
  document.getElementById('templateBody').value = html;
}

// Sync textarea content to Quill
function syncToQuill() {
  if (!quillEditor || isHtmlMode) return;
  const html = document.getElementById('templateBody').value;
  quillEditor.root.innerHTML = html;
}

// Get body content (from either mode)
function getBodyContent() {
  if (isHtmlMode) {
    return document.getElementById('templateBody').value;
  } else {
    return quillEditor ? quillEditor.root.innerHTML : '';
  }
}

// Set body content (to both)
function setBodyContent(html) {
  document.getElementById('templateBody').value = html;
  if (quillEditor) {
    // Use Quill's clipboard API to properly parse and set HTML content
    // First clear the editor, then paste the HTML
    quillEditor.setContents([]);
    if (html && html.trim()) {
      quillEditor.clipboard.dangerouslyPasteHTML(0, html);
    }
  }
}

// Toggle between Visual and HTML mode
function setViewMode(htmlMode) {
  isHtmlMode = htmlMode;
  const editorContainer = document.getElementById('editorContainer');
  const textareaEl = document.getElementById('templateBody');
  const visualBtn = document.getElementById('viewVisualBtn');
  const htmlBtn = document.getElementById('viewHtmlBtn');

  if (htmlMode) {
    // Switch to HTML mode
    syncToTextarea(); // Save Quill content first
    editorContainer.classList.add('hidden');
    textareaEl.classList.remove('hidden');
    visualBtn.classList.remove('bg-legend-blue', 'text-white');
    visualBtn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
    htmlBtn.classList.add('bg-legend-blue', 'text-white');
    htmlBtn.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
  } else {
    // Switch to Visual mode
    syncToQuill(); // Load textarea content into Quill
    editorContainer.classList.remove('hidden');
    textareaEl.classList.add('hidden');
    htmlBtn.classList.remove('bg-legend-blue', 'text-white');
    htmlBtn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
    visualBtn.classList.add('bg-legend-blue', 'text-white');
    visualBtn.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
  }
}

// Render placeholders as clickable badges
function renderPlaceholders(placeholders) {
  const container = document.getElementById('placeholders');
  container.innerHTML = placeholders.map(p =>
    `<button type="button" class="placeholder-btn bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono hover:bg-blue-200 transition" data-placeholder="${p}">${p}</button>`
  ).join('');

  // Add click handlers to insert placeholders
  container.querySelectorAll('.placeholder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const placeholder = btn.dataset.placeholder;
      const subjectField = document.getElementById('templateSubject');

      // Check if subject field is focused
      if (document.activeElement === subjectField) {
        // Insert into subject field
        const start = subjectField.selectionStart;
        const end = subjectField.selectionEnd;
        const text = subjectField.value;
        subjectField.value = text.substring(0, start) + placeholder + text.substring(end);
        subjectField.focus();
        subjectField.setSelectionRange(start + placeholder.length, start + placeholder.length);
      } else if (isHtmlMode) {
        // Insert into HTML textarea
        const bodyField = document.getElementById('templateBody');
        const start = bodyField.selectionStart;
        const end = bodyField.selectionEnd;
        const text = bodyField.value;
        bodyField.value = text.substring(0, start) + placeholder + text.substring(end);
        bodyField.focus();
        bodyField.setSelectionRange(start + placeholder.length, start + placeholder.length);
      } else if (quillEditor) {
        // Insert into Quill editor at cursor
        const range = quillEditor.getSelection(true);
        if (range) {
          quillEditor.insertText(range.index, placeholder);
          quillEditor.setSelection(range.index + placeholder.length);
        } else {
          // No selection, insert at end
          const length = quillEditor.getLength();
          quillEditor.insertText(length - 1, placeholder);
        }
        quillEditor.focus();
      }
      markUnsaved();
    });
  });
}

// Load all templates from API
async function loadTemplates() {
  const API_URL = window.API_URL;
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.classList.add('hidden');

  try {
    const res = await fetch(`${API_URL}/api/programs/${programId}/email-templates`, {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });

    if (res.ok) {
      const data = await res.json();
      templates = {};
      data.templates.forEach(t => {
        templates[t.templateType] = t;
      });

      if (data.programName) {
        document.getElementById('programNameLabel').textContent = data.programName;
      }

      // Load the current template
      displayTemplate(currentTemplate);
    } else {
      errorMsg.textContent = 'Could not load email templates.';
      errorMsg.classList.remove('hidden');
    }
  } catch (e) {
    errorMsg.textContent = 'Could not load email templates.';
    errorMsg.classList.remove('hidden');
    console.error('Error loading email templates:', e);
  }
}

// Display a specific template in the editor
function displayTemplate(templateType) {
  const template = templates[templateType];
  if (!template) return;

  currentTemplate = templateType;

  // Update tab styles
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.template === templateType) {
      btn.classList.add('text-legend-blue', 'border-legend-blue');
      btn.classList.remove('text-gray-500', 'border-transparent');
    } else {
      btn.classList.remove('text-legend-blue', 'border-legend-blue');
      btn.classList.add('text-gray-500', 'border-transparent');
    }
  });

  // Fill form
  document.getElementById('templateName').textContent = template.name;
  document.getElementById('templateDescription').textContent = template.description;
  document.getElementById('templateSubject').value = template.subject;
  setBodyContent(template.body);
  updateEnabledStatus(template.enabled);

  // Render placeholders
  renderPlaceholders(template.placeholders);

  // Update customization status
  const statusEl = document.getElementById('customizationStatus');
  if (template.isCustomized) {
    statusEl.textContent = 'This template has been customized.';
    statusEl.classList.remove('text-gray-500');
    statusEl.classList.add('text-legend-blue');
  } else {
    statusEl.textContent = 'Using default template.';
    statusEl.classList.remove('text-legend-blue');
    statusEl.classList.add('text-gray-500');
  }

  // Hide preview
  document.getElementById('previewContainer').classList.add('hidden');
  hasUnsavedChanges = false;
}

// Mark that there are unsaved changes
function markUnsaved() {
  hasUnsavedChanges = true;
}

// Simple template rendering for preview
function renderPreviewTemplate(template, variables) {
  let rendered = template;

  // Replace simple placeholders
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(placeholder, value || '');
  }

  // Handle conditional blocks
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  rendered = rendered.replace(conditionalRegex, (_match, varName, content) => {
    const value = variables[varName];
    return value ? content : '';
  });

  return rendered;
}

// Show preview
function showPreview() {
  const subject = document.getElementById('templateSubject').value;
  const body = getBodyContent();

  // Sample variables for preview
  const sampleVars = {
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'John Smith',
    programName: document.getElementById('programNameLabel').textContent || 'Texas Boys State',
    programYear: new Date().getFullYear().toString(),
    staffRole: 'City Counselor',
    tempPassword: 'TempPass123!',
  };

  const renderedSubject = renderPreviewTemplate(subject, sampleVars);
  const renderedBody = renderPreviewTemplate(body, sampleVars);

  document.getElementById('previewSubject').textContent = renderedSubject;
  document.getElementById('previewBody').innerHTML = renderedBody;
  document.getElementById('previewContainer').classList.remove('hidden');
}

// Save template
async function saveTemplate() {
  if (!programId) return;

  const API_URL = window.API_URL;
  const subject = document.getElementById('templateSubject').value.trim();
  const body = getBodyContent().trim();
  const enabled = document.getElementById('templateEnabled').checked;

  if (!subject) {
    showStatus('Subject is required', true);
    document.getElementById('templateSubject').focus();
    return;
  }
  if (!body || body === '<p><br></p>') {
    showStatus('Body is required', true);
    if (!isHtmlMode && quillEditor) quillEditor.focus();
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/programs/${programId}/email-templates/${currentTemplate}`, {
      method: 'PUT',
      headers: {
        ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subject, body, enabled })
    });

    if (res.ok) {
      const data = await res.json();
      templates[currentTemplate] = {
        ...templates[currentTemplate],
        subject: data.subject,
        body: data.body,
        enabled: data.enabled,
        isCustomized: data.isCustomized,
      };
      showStatus('Template saved successfully!');
      hasUnsavedChanges = false;
      displayTemplate(currentTemplate);
    } else {
      const error = await res.json();
      showStatus(error.error || 'Failed to save template', true);
    }
  } catch (e) {
    showStatus('Could not save template', true);
    console.error('Error saving template:', e);
  }
}

// Reset template to default
async function resetTemplate() {
  if (!programId) return;

  const API_URL = window.API_URL;

  try {
    const res = await fetch(`${API_URL}/api/programs/${programId}/email-templates/${currentTemplate}/reset`, {
      method: 'POST',
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });

    if (res.ok) {
      const data = await res.json();
      templates[currentTemplate] = {
        ...templates[currentTemplate],
        subject: data.subject,
        body: data.body,
        enabled: data.enabled,
        isCustomized: data.isCustomized,
      };
      showStatus('Template reset to default');
      hasUnsavedChanges = false;
      displayTemplate(currentTemplate);
      document.getElementById('resetModal').classList.add('hidden');
    } else {
      const error = await res.json();
      showStatus(error.error || 'Failed to reset template', true);
    }
  } catch (e) {
    showStatus('Could not reset template', true);
    console.error('Error resetting template:', e);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
  const programNameLabel = document.getElementById('programNameLabel');
  const errorMsg = document.getElementById('errorMsg');
  const formEls = document.querySelectorAll('input, select, button, textarea');

  // Initialize Quill editor
  initQuillEditor();

  if (!programId) {
    errorMsg.textContent = 'Missing ?programId= in the URL!';
    errorMsg.classList.remove('hidden');
    formEls.forEach(el => el.disabled = true);
    programNameLabel.textContent = '';
    return;
  }

  // Loading indicator
  programNameLabel.textContent = 'Loading program...';
  errorMsg.classList.add('hidden');

  try {
    const API_URL = window.API_URL;
    const res = await fetch(`${API_URL}/programs/${programId}`, {
      headers: typeof getAuthHeaders === 'function' ? getAuthHeaders() : {}
    });

    if (res.ok) {
      const program = await res.json();
      const label = program.name
        ? `${program.name}${program.year ? ' (' + program.year + ')' : ''}`
        : `Program ${programId}`;
      programNameLabel.textContent = label;
      errorMsg.classList.add('hidden');

      // Load templates
      await loadTemplates();
    } else {
      programNameLabel.textContent = `Program not found (${programId})`;
      errorMsg.textContent = 'Program not found!';
      errorMsg.classList.remove('hidden');
      formEls.forEach(el => el.disabled = true);
    }
  } catch (e) {
    programNameLabel.textContent = `Failed to load program (${programId})`;
    errorMsg.textContent = 'Could not load program info.';
    errorMsg.classList.remove('hidden');
    formEls.forEach(el => el.disabled = true);
  }

  // Event listeners
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

  // View mode toggle buttons
  const viewVisualBtn = document.getElementById('viewVisualBtn');
  const viewHtmlBtn = document.getElementById('viewHtmlBtn');

  if (viewVisualBtn) {
    viewVisualBtn.addEventListener('click', () => setViewMode(false));
  }
  if (viewHtmlBtn) {
    viewHtmlBtn.addEventListener('click', () => setViewMode(true));
  }

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Switch templates anyway?')) {
          return;
        }
      }
      displayTemplate(btn.dataset.template);
    });
  });

  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveTemplate);
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.location.href = `programs-config.html?programId=${encodeURIComponent(programId)}`;
    });
  }

  // Preview button
  const previewBtn = document.getElementById('previewBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', showPreview);
  }

  // Reset button and modal
  const resetBtn = document.getElementById('resetBtn');
  const resetModal = document.getElementById('resetModal');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetModal.classList.remove('hidden');
    });
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener('click', () => {
      resetModal.classList.add('hidden');
    });
  }

  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', resetTemplate);
  }

  // Close modal on backdrop click
  if (resetModal) {
    resetModal.addEventListener('click', (e) => {
      if (e.target === resetModal) {
        resetModal.classList.add('hidden');
      }
    });
  }

  // Enable toggle listener
  const templateEnabled = document.getElementById('templateEnabled');
  if (templateEnabled) {
    templateEnabled.addEventListener('change', () => {
      updateEnabledStatus(templateEnabled.checked);
      markUnsaved();
    });
  }

  // Mark unsaved on field changes
  const subjectField = document.getElementById('templateSubject');
  const bodyField = document.getElementById('templateBody');

  if (subjectField) {
    subjectField.addEventListener('input', markUnsaved);
  }
  if (bodyField) {
    bodyField.addEventListener('input', () => {
      markUnsaved();
      // If in HTML mode and user edits textarea, we don't auto-sync to Quill
      // They'll sync when switching back to visual mode
    });
  }

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProgramIdFromUrl,
    loadTemplates,
    displayTemplate,
    saveTemplate,
    resetTemplate,
    showStatus,
    showPreview,
    renderPreviewTemplate,
    updateEnabledStatus,
    getBodyContent,
    setBodyContent
  };
}
