// programs-roles.js - Role management page logic

// Use existing apiBase if already declared by another script, otherwise define it
const rolesApiBase = window.API_URL || "";

let programId = null;
let allPermissions = [];
let permissionGroups = {};
let currentRoles = [];
let editingRoleId = null;
let deletingRoleId = null;

// Get programId from URL or localStorage
function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('programId') || localStorage.getItem('lastSelectedProgramId');
}

// Fetch available permission keys and groups
async function fetchPermissions() {
  try {
    const response = await fetch(`${rolesApiBase}/permissions`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load permissions');
    const data = await response.json();

    allPermissions = data.permissions || [];
    permissionGroups = data.groups || {};

    renderPermissionCheckboxes();
  } catch (err) {
    console.error('Error loading permissions:', err);
  }
}

// Render permission checkboxes in the modal
function renderPermissionCheckboxes() {
  const container = document.getElementById('permissions-list');
  container.innerHTML = '';

  Object.entries(permissionGroups).forEach(([groupKey, group]) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'bg-gray-50 rounded-lg p-4';

    const groupLabel = document.createElement('h4');
    groupLabel.className = 'font-semibold text-gray-800 mb-3';
    groupLabel.textContent = group.label;
    groupDiv.appendChild(groupLabel);

    const checkboxesDiv = document.createElement('div');
    checkboxesDiv.className = 'grid grid-cols-1 md:grid-cols-2 gap-2';

    group.permissions.forEach(perm => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'permissions';
      checkbox.value = perm.key;
      checkbox.className = 'w-4 h-4 text-legend-blue focus:ring-2 focus:ring-legend-blue rounded';

      const span = document.createElement('span');
      span.className = 'text-sm text-gray-700';
      span.textContent = perm.label;

      label.appendChild(checkbox);
      label.appendChild(span);
      checkboxesDiv.appendChild(label);
    });

    groupDiv.appendChild(checkboxesDiv);
    container.appendChild(groupDiv);
  });
}

// Fetch roles for the program
async function fetchRoles() {
  const listContainer = document.getElementById('roles-list');

  try {
    const response = await fetch(`${rolesApiBase}/programs/${encodeURIComponent(programId)}/roles`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to load roles');
    currentRoles = await response.json();

    renderRolesList();
  } catch (err) {
    listContainer.innerHTML = `<div class="text-red-600">Error loading roles: ${err.message}</div>`;
    console.error('Error loading roles:', err);
  }
}

// Render the roles list
function renderRolesList() {
  const listContainer = document.getElementById('roles-list');

  if (currentRoles.length === 0) {
    listContainer.innerHTML = '<div class="text-gray-500 italic">No roles configured. Click "Add Role" to create one.</div>';
    return;
  }

  listContainer.innerHTML = currentRoles.map(role => `
    <div class="bg-white rounded-xl shadow p-5 border-l-4 ${role.isDefault ? 'border-legend-blue' : 'border-legend-gold'}">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-lg font-semibold text-legend-blue">${escapeHtml(role.name)}</h3>
            ${role.isDefault ? '<span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">Default</span>' : ''}
            ${!role.isActive ? '<span class="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded">Inactive</span>' : ''}
          </div>
          ${role.description ? `<p class="text-gray-600 text-sm mb-2">${escapeHtml(role.description)}</p>` : ''}
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span>${role.permissions.length} permission${role.permissions.length !== 1 ? 's' : ''}</span>
            <span>${role.assignedCount} user${role.assignedCount !== 1 ? 's' : ''} assigned</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button data-action="edit" data-role-id="${role.id}" class="text-legend-blue hover:text-blue-800 font-medium text-sm">
            Edit
          </button>
          ${!role.isDefault ? `
            <button data-action="delete" data-role-id="${role.id}" data-role-name="${escapeHtml(role.name)}" class="text-red-600 hover:text-red-800 font-medium text-sm">
              Delete
            </button>
          ` : ''}
        </div>
      </div>
      ${role.permissions.length > 0 ? `
        <div class="mt-3 pt-3 border-t border-gray-100">
          <div class="flex flex-wrap gap-1">
            ${role.permissions.slice(0, 5).map(p => `
              <span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">${getPermissionLabel(p)}</span>
            `).join('')}
            ${role.permissions.length > 5 ? `
              <span class="text-gray-500 text-xs px-2 py-1">+${role.permissions.length - 5} more</span>
            ` : ''}
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Get human-readable label for a permission key
function getPermissionLabel(permissionKey) {
  for (const group of Object.values(permissionGroups)) {
    const found = group.permissions.find(p => p.key === permissionKey);
    if (found) return found.label;
  }
  return permissionKey;
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Open modal to add a new role
function openAddModal() {
  editingRoleId = null;
  document.getElementById('modal-title').textContent = 'Add Role';
  document.getElementById('role-id').value = '';
  document.getElementById('role-name').value = '';
  document.getElementById('role-description').value = '';
  document.getElementById('form-error').classList.add('hidden');

  // Uncheck all permissions
  document.querySelectorAll('#permissions-list input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });

  document.getElementById('role-modal').classList.remove('hidden');
}

// Open modal to edit an existing role
function editRole(roleId) {
  const role = currentRoles.find(r => r.id === roleId);
  if (!role) return;

  editingRoleId = roleId;
  document.getElementById('modal-title').textContent = 'Edit Role';
  document.getElementById('role-id').value = role.id;
  document.getElementById('role-name').value = role.name;
  document.getElementById('role-description').value = role.description || '';
  document.getElementById('form-error').classList.add('hidden');

  // Set permission checkboxes
  document.querySelectorAll('#permissions-list input[type="checkbox"]').forEach(cb => {
    cb.checked = role.permissions.includes(cb.value);
  });

  document.getElementById('role-modal').classList.remove('hidden');
}

// Close the role modal
function closeModal() {
  document.getElementById('role-modal').classList.add('hidden');
  editingRoleId = null;
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('role-name').value.trim();
  const description = document.getElementById('role-description').value.trim();
  const errorDiv = document.getElementById('form-error');

  // Get selected permissions
  const permissions = Array.from(
    document.querySelectorAll('#permissions-list input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  if (!name) {
    errorDiv.textContent = 'Role name is required';
    errorDiv.classList.remove('hidden');
    return;
  }

  try {
    let response;
    if (editingRoleId) {
      // Update existing role
      response = await fetch(`${rolesApiBase}/programs/${encodeURIComponent(programId)}/roles/${editingRoleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ name, description, permissions }),
      });
    } else {
      // Create new role
      response = await fetch(`${rolesApiBase}/programs/${encodeURIComponent(programId)}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({ name, description, permissions }),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save role');
    }

    closeModal();
    showStatus(editingRoleId ? 'Role updated successfully' : 'Role created successfully', 'success');
    await fetchRoles();

    // Clear permissions cache so changes take effect immediately
    if (typeof clearPermissionsCache === 'function') {
      clearPermissionsCache(programId);
    }
  } catch (err) {
    errorDiv.textContent = err.message;
    errorDiv.classList.remove('hidden');
  }
}

// Show delete confirmation modal
function confirmDeleteRole(roleId, roleName) {
  deletingRoleId = roleId;
  document.getElementById('delete-role-name').textContent = roleName;
  document.getElementById('delete-modal').classList.remove('hidden');
}

// Close delete modal
function closeDeleteModal() {
  document.getElementById('delete-modal').classList.add('hidden');
  deletingRoleId = null;
}

// Handle delete confirmation
async function handleDelete() {
  if (!deletingRoleId) return;

  try {
    const response = await fetch(`${rolesApiBase}/programs/${encodeURIComponent(programId)}/roles/${deletingRoleId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete role');
    }

    closeDeleteModal();
    showStatus('Role deleted successfully', 'success');
    await fetchRoles();

    // Clear permissions cache
    if (typeof clearPermissionsCache === 'function') {
      clearPermissionsCache(programId);
    }
  } catch (err) {
    closeDeleteModal();
    showStatus(err.message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('status-message');
  statusDiv.textContent = message;
  statusDiv.classList.remove('hidden', 'text-green-700', 'text-red-600');
  statusDiv.classList.add(type === 'success' ? 'text-green-700' : 'text-red-600');

  setTimeout(() => {
    statusDiv.classList.add('hidden');
  }, 4000);
}

// Update back link with programId
function updateBackLink() {
  const backLink = document.getElementById('back-link');
  if (backLink && programId) {
    backLink.href = `programs-config.html?programId=${encodeURIComponent(programId)}`;
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  programId = getProgramId();

  if (!programId) {
    window.location.href = 'console.html';
    return;
  }

  updateBackLink();

  // Check if user has access to this page
  if (typeof hasPermission === 'function') {
    const canAccess = await hasPermission(programId, 'program_config.roles');
    if (!canAccess) {
      window.location.href = `programs-config.html?programId=${encodeURIComponent(programId)}`;
      return;
    }
  }

  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

  // Event listeners
  document.getElementById('add-role-btn').addEventListener('click', openAddModal);
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('role-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);
  document.getElementById('confirm-delete-btn').addEventListener('click', handleDelete);

  // Close modals on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
    }
  });

  // Close modals on backdrop click
  document.getElementById('role-modal').addEventListener('click', (e) => {
    if (e.target.id === 'role-modal') closeModal();
  });
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
  });

  // Event delegation for roles list (edit/delete buttons)
  document.getElementById('roles-list').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const roleId = parseInt(button.dataset.roleId, 10);

    if (action === 'edit') {
      editRole(roleId);
    } else if (action === 'delete') {
      const roleName = button.dataset.roleName;
      confirmDeleteRole(roleId, roleName);
    }
  });

  // Load data
  await fetchPermissions();
  await fetchRoles();
});

