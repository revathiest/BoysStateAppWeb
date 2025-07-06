function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function clearAuthToken() {
  localStorage.removeItem('authToken');
}

function storeAuthToken(token) {
  if (token) localStorage.setItem('authToken', token);
}
