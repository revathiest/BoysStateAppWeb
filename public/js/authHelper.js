// Authentication tokens are stored as HTTP-only cookies by the backend.
// These helper functions remain for compatibility but no longer read or
// write any client-side storage.

function getAuthHeaders() {
  // Cookies will be sent automatically with `credentials: "include"`.
  return {};
}

function clearAuthToken() {
  // No-op: cookie tokens cannot be cleared from JavaScript.
}

function storeAuthToken() {
  // No-op: tokens are set by the server.
}
