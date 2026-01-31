const {
  getAuthHeaders,
  clearAuthToken,
  storeAuthToken,
  storeUser,
  getUsername,
  parseJwt,
  isTokenExpired,
  requireAuth,
  updateLastActivity,
  isInactive
} = require('../public/js/authHelper.js');

describe('auth helper functions', () => {
  let storage;
  beforeEach(() => {
    storage = {};
    global.sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };
  });

  test('storeAuthToken sets token and activity timestamp', () => {
    storeAuthToken('t');
    expect(sessionStorage.getItem('authToken')).toBe('t');
    expect(sessionStorage.getItem('lastActivity')).toBeTruthy();
  });

  test('clearAuthToken removes token and activity', () => {
    sessionStorage.setItem('authToken', 'x');
    sessionStorage.setItem('lastActivity', Date.now().toString());
    clearAuthToken();
    expect(sessionStorage.getItem('authToken')).toBeUndefined();
    expect(sessionStorage.getItem('lastActivity')).toBeUndefined();
  });

  test('getAuthHeaders with token', () => {
    sessionStorage.setItem('authToken', 'abc');
    expect(getAuthHeaders()).toEqual({ Authorization: 'Bearer abc' });
  });

  test('getAuthHeaders without token', () => {
    expect(getAuthHeaders()).toEqual({});
  });

  test('storeAuthToken ignores empty values', () => {
    storeAuthToken('');
    expect(sessionStorage.getItem('authToken')).toBeUndefined();
  });

  test('storeUser and getUsername work together', () => {
    storeUser('alice');
    expect(getUsername()).toBe('alice');
    storeUser();
    expect(getUsername()).toBe('alice');
  });

  test('parseJwt returns payload', () => {
    const token = 'x.' + Buffer.from(JSON.stringify({ foo: 1 })).toString('base64') + '.y';
    expect(parseJwt(token).foo).toBe(1);
  });

  test('parseJwt handles malformed token', () => {
    expect(parseJwt('bad')).toBeNull();
  });

  test('isTokenExpired detects expired token', () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';
    expect(isTokenExpired(token)).toBe(true);
  });

  test('isTokenExpired detects valid token', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';
    expect(isTokenExpired(token)).toBe(false);
  });

  test('requireAuth redirects when no token', () => {
    global.window = { location: { href: '', pathname: '/dashboard.html' } };
    global.document = { addEventListener: (ev, fn) => fn() };
    requireAuth();
    expect(global.window.location.href).toBe('login.html');
  });

  test('requireAuth ignores login page', () => {
    global.window = { location: { href: '', pathname: '/login.html' } };
    global.document = { addEventListener: (ev, fn) => fn() };
    requireAuth();
    expect(global.window.location.href).toBe('');
  });

  test('requireAuth does nothing with valid token and updates activity', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';
    storage.authToken = token;
    storage.lastActivity = Date.now().toString();
    global.window = { location: { href: '', pathname: '/dashboard.html' } };
    global.document = { addEventListener: (ev, fn) => fn() };
    requireAuth();
    expect(global.window.location.href).toBe('');
    expect(sessionStorage.getItem('lastActivity')).toBeTruthy();
  });

  test('isTokenExpired returns true when token missing exp', () => {
    const token = 'x.' + Buffer.from(JSON.stringify({})).toString('base64') + '.y';
    expect(isTokenExpired(token)).toBe(true);
  });

  test('requireAuth redirects when token expired', () => {
    const exp = Math.floor(Date.now() / 1000) - 5;
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';
    storage.authToken = token;
    const loc = { href: '', pathname: '/dash.html' };
    global.window = { location: loc };
    global.document = { addEventListener: (ev, fn) => fn() };
    requireAuth();
    expect(loc.href).toBe('login.html');
  });

  test('requireAuth ignores index and register pages', () => {
    ['index.html', 'register.html', ''].forEach(page => {
      global.window = { location: { href: 'start', pathname: `/${page}` } };
      global.document = { addEventListener: (ev, fn) => fn() };
      requireAuth();
      expect(global.window.location.href).toBe('start');
    });
  });

  test('attaches requireAuth listener in browser context', () => {
    const fs = require('fs');
    const vm = require('vm');
    const code = fs.readFileSync(require.resolve('../public/js/authHelper.js'), 'utf8');
    const document = { addEventListener: jest.fn() };
    vm.runInNewContext(code, { document, window: {} });
    expect(document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
  });

  test('updateLastActivity sets timestamp', () => {
    const before = Date.now();
    updateLastActivity();
    const after = Date.now();
    const stored = parseInt(sessionStorage.getItem('lastActivity'), 10);
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(after);
  });

  test('isInactive returns false when no activity recorded', () => {
    expect(isInactive()).toBe(false);
  });

  test('isInactive returns false for recent activity', () => {
    sessionStorage.setItem('lastActivity', Date.now().toString());
    expect(isInactive()).toBe(false);
  });

  test('isInactive returns true after timeout period', () => {
    const thirtyOneMinutesAgo = Date.now() - (31 * 60 * 1000);
    sessionStorage.setItem('lastActivity', thirtyOneMinutesAgo.toString());
    expect(isInactive()).toBe(true);
  });

  test('requireAuth redirects when inactive', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600; // Valid token
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';
    storage.authToken = token;
    storage.lastActivity = (Date.now() - (31 * 60 * 1000)).toString(); // 31 minutes ago
    global.window = { location: { href: '', pathname: '/dashboard.html' } };
    global.document = { addEventListener: (ev, fn) => fn() };
    requireAuth();
    expect(global.window.location.href).toBe('login.html');
  });
});
