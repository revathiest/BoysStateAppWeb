// user-management.js - Landing page for user management features

// Get programId from URL or localStorage
function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('programId') || localStorage.getItem('lastSelectedProgramId');
}

// Update navigation links to include programId
function updateNavLinks() {
  const programId = getProgramId();
  if (!programId) return;

  const applicationReviewLink = document.getElementById('application-review-link');
  if (applicationReviewLink) {
    applicationReviewLink.href = `application-review.html?programId=${encodeURIComponent(programId)}`;
  }

  const staffLink = document.getElementById('staff-link');
  if (staffLink) {
    staffLink.href = `programs-staff.html?programId=${encodeURIComponent(programId)}`;
  }

  const delegatesLink = document.getElementById('delegates-link');
  if (delegatesLink) {
    delegatesLink.href = `programs-delegates.html?programId=${encodeURIComponent(programId)}`;
  }

  const bulkOperationsLink = document.getElementById('bulk-operations-link');
  if (bulkOperationsLink) {
    bulkOperationsLink.href = `bulk-operations.html?programId=${encodeURIComponent(programId)}`;
  }

  const parentsLink = document.getElementById('parents-link');
  if (parentsLink) {
    parentsLink.href = `programs-parents.html?programId=${encodeURIComponent(programId)}`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Update links with programId
  updateNavLinks();

  // Check if user has access to this page (any user_management permission)
  const programId = getProgramId();
  if (programId && typeof checkPageAccess === 'function') {
    const hasAccess = await checkPageAccess(programId, 'user_management.');
    if (!hasAccess) return; // Redirect handled by checkPageAccess
  }

  // Apply permissions to show/hide cards
  if (programId && typeof applyPermissions === 'function') {
    await applyPermissions(programId);
  }

  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }
});
