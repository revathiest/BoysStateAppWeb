// Authentication helpers using sessionStorage. The JWT token is saved
// under the `authToken` key and sent as a Bearer Authorization header
// on each request.

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

function requireAuth() {
  const page = (window.location.pathname || '').split('/').pop();
  if (page === '' || page === 'index.html' || page === 'login.html' || page === 'register.html') {
    return;
  }
  const token = sessionStorage.getItem('authToken');
  if (!token || isTokenExpired(token)) {
    clearAuthToken();
    if (window.location) window.location.href = 'login.html';
  }
}

function clearAuthToken() {
  sessionStorage.removeItem('authToken');
}

function storeAuthToken(token) {
  if (token) sessionStorage.setItem('authToken', token);
}

function storeUser(user){
  if (user) sessionStorage.setItem('user', user);
}

function getUsername(){
  return sessionStorage.getItem('user')
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
    requireAuth
  };
} else if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('DOMContentLoaded', requireAuth);
}
