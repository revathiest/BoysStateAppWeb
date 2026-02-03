// permissions.js - Frontend permission checking and UI visibility control

// Use unique variable name to avoid conflicts with other scripts
const permissionsApiBase = window.API_URL || "";

// Cache key prefix
const PERMISSIONS_CACHE_PREFIX = 'permissions_';

/**
 * Get cached permissions for a program
 */
function getCachedPermissions(programId) {
  const cached = sessionStorage.getItem(`${PERMISSIONS_CACHE_PREFIX}${programId}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Cache permissions for a program
 */
function cachePermissions(programId, data) {
  sessionStorage.setItem(`${PERMISSIONS_CACHE_PREFIX}${programId}`, JSON.stringify(data));
}

/**
 * Clear cached permissions for a program (call when role changes)
 */
function clearPermissionsCache(programId) {
  if (programId) {
    sessionStorage.removeItem(`${PERMISSIONS_CACHE_PREFIX}${programId}`);
  } else {
    // Clear all permission caches
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(PERMISSIONS_CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

/**
 * Fetch user's permissions for a program from the API
 */
async function fetchUserPermissions(programId) {
  try {
    const response = await fetch(`${permissionsApiBase}/programs/${encodeURIComponent(programId)}/my-permissions`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Failed to fetch permissions:', response.status);
      return null;
    }

    const data = await response.json();
    cachePermissions(programId, data);
    return data;
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return null;
  }
}

/**
 * Get user's permissions for a program (cached or fresh)
 */
async function getUserPermissions(programId) {
  if (!programId) {
    console.warn('getUserPermissions called without programId');
    return null;
  }

  // Check cache first
  const cached = getCachedPermissions(programId);
  if (cached) {
    return cached;
  }

  // Fetch from API
  return fetchUserPermissions(programId);
}

/**
 * Check if user has a specific permission
 */
async function hasPermission(programId, permission) {
  const data = await getUserPermissions(programId);
  if (!data) return false;
  return data.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
async function hasAnyPermission(programId, permissions) {
  const data = await getUserPermissions(programId);
  if (!data) return false;
  return permissions.some(p => data.permissions.includes(p));
}

/**
 * Apply permissions to page elements.
 * Hides elements with data-permission attribute if user lacks that permission.
 * Returns object with visibility info for parent page decisions.
 */
async function applyPermissions(programId) {
  // Find all elements with data-permission attribute first
  const elements = document.querySelectorAll('[data-permission]');

  // Helper to mark all elements as checked but hidden (secure default)
  const markCheckedButHidden = (reason) => {
    console.warn(`applyPermissions: ${reason}`);
    elements.forEach(el => {
      el.classList.add('permission-checked');
      // Don't show - leave hidden for security
    });
    return { hasVisibleCards: false, visibleGroups: {}, error: reason };
  };

  if (!programId) {
    return markCheckedButHidden('no programId provided');
  }

  const permData = await getUserPermissions(programId);
  if (!permData) {
    return markCheckedButHidden(`could not load permissions for program ${programId}`);
  }

  const userPermissions = permData.permissions || [];
  const isAdmin = permData.isAdmin || false;

  // Track which permission groups have visible cards
  const visibleGroups = {
    console: [],
    user_management: [],
    program_config: [],
  };

  let totalVisibleCards = 0;

  elements.forEach(el => {
    const permission = el.getAttribute('data-permission');
    const hasAccess = isAdmin || userPermissions.includes(permission);

    // Mark element as checked (removes the CSS hiding rule)
    el.classList.add('permission-checked');

    if (hasAccess) {
      el.classList.remove('hidden');
      el.style.display = '';
      totalVisibleCards++;

      // Track which group this permission belongs to
      if (permission.startsWith('console.')) {
        visibleGroups.console.push(permission);
      } else if (permission.startsWith('user_management.')) {
        visibleGroups.user_management.push(permission);
      } else if (permission.startsWith('program_config.')) {
        visibleGroups.program_config.push(permission);
      }
    } else {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  });

  return {
    hasVisibleCards: totalVisibleCards > 0,
    visibleGroups,
    isAdmin,
    permissions: userPermissions,
  };
}

/**
 * Apply parent card visibility based on child page permissions.
 * Call this on console.html to show/hide User Management/Program Config cards
 * based on whether user has any permissions in those sections.
 *
 * Parent cards are shown if user has ANY child permission, even without the
 * explicit parent permission (e.g., user_management.delegates grants access
 * to console.user_management card).
 */
async function applyConsoleParentVisibility(programId) {
  const result = await applyPermissions(programId);
  const userPermissions = result.permissions || [];

  // Check if user has any permissions in each category (from their actual permissions, not page elements)
  const hasUserMgmtPermissions = userPermissions.some(p => p.startsWith('user_management.'));
  const hasProgramConfigPermissions = userPermissions.some(p => p.startsWith('program_config.'));

  // User Management card: show if user has any user_management.* permissions
  const userMgmtCard = document.querySelector('[data-permission="console.user_management"]');
  if (userMgmtCard) {
    if (result.isAdmin || hasUserMgmtPermissions) {
      // Show card - user has child permissions or is admin
      userMgmtCard.classList.remove('hidden');
      userMgmtCard.classList.add('permission-checked');
      userMgmtCard.style.display = '';
    } else {
      // Hide card - no child permissions
      userMgmtCard.classList.add('hidden');
      userMgmtCard.style.display = 'none';
    }
  }

  // Program Config card: show if user has any program_config.* permissions
  const programConfigCard = document.querySelector('[data-permission="console.program_config"]');
  if (programConfigCard) {
    if (result.isAdmin || hasProgramConfigPermissions) {
      // Show card - user has child permissions or is admin
      programConfigCard.classList.remove('hidden');
      programConfigCard.classList.add('permission-checked');
      programConfigCard.style.display = '';
    } else {
      // Hide card - no child permissions
      programConfigCard.classList.add('hidden');
      programConfigCard.style.display = 'none';
    }
  }

  return result;
}

/**
 * Check if user should be redirected from a page (no visible cards).
 * Call this on child pages to redirect if user has no access.
 */
async function checkPageAccess(programId, requiredPermissionPrefix) {
  const permData = await getUserPermissions(programId);
  if (!permData) {
    // Can't verify permissions, redirect to console
    window.location.href = 'console.html';
    return false;
  }

  if (permData.isAdmin) {
    return true; // Admins always have access
  }

  // Check if user has any permission starting with the prefix
  const hasAccess = permData.permissions.some(p => p.startsWith(requiredPermissionPrefix));

  if (!hasAccess) {
    window.location.href = 'console.html';
    return false;
  }

  return true;
}

/**
 * Get the current user's role name for display
 */
async function getUserRoleName(programId) {
  const permData = await getUserPermissions(programId);
  if (!permData) return 'Unknown';
  return permData.roleName || 'No Role Assigned';
}

// Export for browser and module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getUserPermissions,
    hasPermission,
    hasAnyPermission,
    applyPermissions,
    applyConsoleParentVisibility,
    checkPageAccess,
    clearPermissionsCache,
    getUserRoleName,
  };
} else {
  window.getUserPermissions = getUserPermissions;
  window.hasPermission = hasPermission;
  window.hasAnyPermission = hasAnyPermission;
  window.applyPermissions = applyPermissions;
  window.applyConsoleParentVisibility = applyConsoleParentVisibility;
  window.checkPageAccess = checkPageAccess;
  window.clearPermissionsCache = clearPermissionsCache;
  window.getUserRoleName = getUserRoleName;
}
