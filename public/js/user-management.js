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
}

document.addEventListener('DOMContentLoaded', () => {
  // Update links with programId
  updateNavLinks();

  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }
});
