// Authentication helpers using sessionStorage. The JWT token is saved
// under the `authToken` key and sent as a Bearer Authorization header
// on each request.

// Activity-based timeout: 30 minutes of inactivity
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// Refresh token when less than 5 minutes remain
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Flag to prevent concurrent refresh attempts
let isRefreshing = false;

function getAuthHeaders() {
  const token = sessionStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const data = parseJwt(token);
  if (!data || !data.exp) return true;
  return Date.now() >= data.exp * 1000;
}

function isTokenExpiringSoon(token) {
  const data = parseJwt(token);
  if (!data || !data.exp) return true;
  const timeUntilExpiry = (data.exp * 1000) - Date.now();
  return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS;
}

function updateLastActivity() {
  sessionStorage.setItem('lastActivity', Date.now().toString());
}

function getLastActivity() {
  const timestamp = sessionStorage.getItem('lastActivity');
  return timestamp ? parseInt(timestamp, 10) : null;
}

function isInactive() {
  const lastActivity = getLastActivity();
  if (!lastActivity) return false;
  const inactiveTime = Date.now() - lastActivity;
  return inactiveTime > INACTIVITY_TIMEOUT_MS;
}

function requireAuth() {
  const page = (window.location.pathname || '').split('/').pop();
  if (page === '' || page === 'index.html' || page === 'login.html' || page === 'register.html') {
    return;
  }
  const token = sessionStorage.getItem('authToken');

  // Check both token expiration AND inactivity
  if (!token || isTokenExpired(token) || isInactive()) {
    clearAuthToken();
    if (window.location) window.location.href = 'login.html';
  } else {
    // User is active, update activity timestamp
    updateLastActivity();
  }
}

function clearAuthToken() {
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('lastActivity');
  // Clear all permissions cache entries
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('permissions_')) {
      sessionStorage.removeItem(key);
    }
  });
}

function storeAuthToken(token) {
  if (token) {
    sessionStorage.setItem('authToken', token);
    updateLastActivity(); // Set initial activity timestamp on login
  }
}

// Refresh the token by calling the /refresh endpoint
async function refreshToken() {
  const token = sessionStorage.getItem('authToken');
  if (!token || isTokenExpired(token) || isInactive() || isRefreshing) {
    return false;
  }

  isRefreshing = true;
  try {
    const apiBase = window.API_URL || '';
    const response = await fetch(`${apiBase}/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        sessionStorage.setItem('authToken', data.token);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

// Check if token needs refresh and refresh if necessary
async function checkAndRefreshToken() {
  const token = sessionStorage.getItem('authToken');
  if (token && !isInactive() && isTokenExpiringSoon(token)) {
    await refreshToken();
  }
}

function storeUser(user){
  if (user) sessionStorage.setItem('user', user);
}

function getUsername(){
  return sessionStorage.getItem('user')
}

// Track user activity events to reset inactivity timer
function setupActivityTracking() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  let lastUpdateTime = 0;
  const THROTTLE_MS = 1000; // Throttle to once per second

  const throttledUpdate = () => {
    const now = Date.now();
    // Update immediately if enough time has passed since last update
    if (now - lastUpdateTime >= THROTTLE_MS) {
      lastUpdateTime = now;
      updateLastActivity();
      // Check if token needs refresh on each activity
      checkAndRefreshToken();
    }
  };

  events.forEach(event => {
    document.addEventListener(event, throttledUpdate, { passive: true });
  });

  // Also check for inactivity every minute
  setInterval(() => {
    const token = sessionStorage.getItem('authToken');
    if (token && isInactive()) {
      clearAuthToken();
      if (window.location) window.location.href = 'login.html?timeout=inactive';
    }
  }, 60000); // Check every minute

  // Initial check on setup - refresh if token is close to expiring
  checkAndRefreshToken();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAuthHeaders,
    clearAuthToken,
    storeAuthToken,
    storeUser,
    getUsername,
    parseJwt,
    isTokenExpired,
    isTokenExpiringSoon,
    requireAuth,
    updateLastActivity,
    isInactive,
    refreshToken,
    checkAndRefreshToken
  };
} else {
  // Expose functions globally for browser use
  window.getAuthHeaders = getAuthHeaders;
  window.clearAuthToken = clearAuthToken;
  window.storeAuthToken = storeAuthToken;
  window.storeUser = storeUser;
  window.getUsername = getUsername;
  window.parseJwt = parseJwt;
  window.isTokenExpired = isTokenExpired;
  window.isTokenExpiringSoon = isTokenExpiringSoon;
  window.requireAuth = requireAuth;
  window.updateLastActivity = updateLastActivity;
  window.isInactive = isInactive;
  window.refreshToken = refreshToken;
  window.checkAndRefreshToken = checkAndRefreshToken;

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      requireAuth();
      setupActivityTracking();
    });
  }
}
