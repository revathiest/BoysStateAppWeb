const {
  getAuthHeaders,
  clearAuthToken,
  storeAuthToken,
  storeUser,
  getUsername,
  parseJwt,
  isTokenExpired,
  requireAuth
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

  test('storeAuthToken sets token', () => {
    storeAuthToken('t');
    expect(sessionStorage.getItem('authToken')).toBe('t');
  });

  test('clearAuthToken removes token', () => {
    sessionStorage.setItem('authToken', 'x');
    clearAuthToken();
    expect(sessionStorage.getItem('authToken')).toBeUndefined();
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

  test('requireAuth does nothing with valid token', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';
    storage.authToken = token;
    global.window = { location: { href: '', pathname: '/dashboard.html' } };
    global.document = { addEventListener: (ev, fn) => fn() };
    requireAuth();
    expect(global.window.location.href).toBe('');
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
});
