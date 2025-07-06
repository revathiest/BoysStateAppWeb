// Authentication helpers using sessionStorage. The JWT token is saved
// under the `authToken` key and sent as a Bearer Authorization header
// on each request.

function getAuthHeaders() {
  const token = sessionStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function clearAuthToken() {
  sessionStorage.removeItem('authToken');
}

function storeAuthToken(token) {
  if (token) sessionStorage.setItem('authToken', token);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getAuthHeaders, clearAuthToken, storeAuthToken };
}
