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

describe('authHelper.js browser context tests', () => {
  const fs = require('fs');
  const vm = require('vm');
  const code = fs.readFileSync(require.resolve('../public/js/authHelper.js'), 'utf8');

  test('setupActivityTracking registers event listeners and interval', () => {
    let domContentLoadedHandler;
    const eventListeners = [];
    let intervalCallback;

    const storage = {};
    const sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };

    const ctx = {
      document: {
        addEventListener: (event, handler, options) => {
          if (event === 'DOMContentLoaded') {
            domContentLoadedHandler = handler;
          } else {
            eventListeners.push({ event, handler, options });
          }
        }
      },
      window: { location: { href: '', pathname: '/login.html' } },
      sessionStorage,
      setInterval: (cb) => { intervalCallback = cb; return 123; },
      Date,
      JSON,
      console: { log: jest.fn() },
      atob: (s) => Buffer.from(s, 'base64').toString('utf-8')
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);

    // Trigger DOMContentLoaded which calls setupActivityTracking
    expect(domContentLoadedHandler).toBeDefined();
    domContentLoadedHandler();

    // Should register multiple event listeners for activity tracking
    expect(eventListeners.length).toBeGreaterThan(0);
    expect(eventListeners.some(e => e.event === 'click')).toBe(true);
    expect(eventListeners.some(e => e.event === 'mousedown')).toBe(true);
    expect(eventListeners.some(e => e.event === 'keypress')).toBe(true);

    // Should set up interval for inactivity checking
    expect(intervalCallback).toBeDefined();
  });

  test('throttledUpdate in setupActivityTracking updates activity', () => {
    let domContentLoadedHandler;
    let lastActivityUpdates = 0;
    const eventListeners = [];

    const storage = { lastActivity: Date.now().toString() };
    const sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => {
        storage[k] = v;
        if (k === 'lastActivity') lastActivityUpdates++;
      },
      removeItem: (k) => { delete storage[k]; }
    };

    const ctx = {
      document: {
        addEventListener: (event, handler, options) => {
          if (event === 'DOMContentLoaded') {
            domContentLoadedHandler = handler;
          } else {
            eventListeners.push({ event, handler, options });
          }
        }
      },
      window: { location: { href: '', pathname: '/login.html' } },
      sessionStorage,
      setInterval: jest.fn(),
      Date,
      JSON,
      console: { log: jest.fn() },
      atob: (s) => Buffer.from(s, 'base64').toString('utf-8')
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    domContentLoadedHandler();

    // Find a click handler from setupActivityTracking
    const clickHandler = eventListeners.find(h => h.event === 'click');
    expect(clickHandler).toBeDefined();

    // Trigger the handler
    const beforeUpdates = lastActivityUpdates;
    clickHandler.handler();
    expect(lastActivityUpdates).toBeGreaterThan(beforeUpdates);
  });

  test('interval checks for inactivity and redirects', () => {
    let domContentLoadedHandler;
    let intervalCallback;

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';
    const thirtyOneMinutesAgo = Date.now() - (31 * 60 * 1000);

    const storage = {
      authToken: token,
      lastActivity: thirtyOneMinutesAgo.toString()
    };
    const sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };

    const locationObj = { href: '', pathname: '/login.html' };
    const ctx = {
      document: {
        addEventListener: (event, handler) => {
          if (event === 'DOMContentLoaded') {
            domContentLoadedHandler = handler;
          }
        }
      },
      window: { location: locationObj },
      sessionStorage,
      setInterval: (cb) => { intervalCallback = cb; return 123; },
      Date,
      JSON,
      console: { log: jest.fn() },
      atob: (s) => Buffer.from(s, 'base64').toString('utf-8')
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    domContentLoadedHandler();

    // Trigger the interval callback
    expect(intervalCallback).toBeDefined();
    intervalCallback();

    // Should redirect due to inactivity
    expect(locationObj.href).toBe('login.html?timeout=inactive');
    expect(storage.authToken).toBeUndefined();
  });

  test('interval does nothing when user is active', () => {
    let domContentLoadedHandler;
    let intervalCallback;

    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = 'x.' + Buffer.from(JSON.stringify({ exp })).toString('base64') + '.y';

    const storage = {
      authToken: token,
      lastActivity: Date.now().toString() // Recent activity
    };
    const sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };

    const locationObj = { href: '', pathname: '/login.html' };
    const ctx = {
      document: {
        addEventListener: (event, handler) => {
          if (event === 'DOMContentLoaded') {
            domContentLoadedHandler = handler;
          }
        }
      },
      window: { location: locationObj },
      sessionStorage,
      setInterval: (cb) => { intervalCallback = cb; return 123; },
      Date,
      JSON,
      console: { log: jest.fn() },
      atob: (s) => Buffer.from(s, 'base64').toString('utf-8')
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    domContentLoadedHandler();

    // Trigger the interval callback
    intervalCallback();

    // Should NOT redirect since user is active
    expect(locationObj.href).toBe('');
    expect(storage.authToken).toBe(token);
  });

  test('interval does nothing when no token', () => {
    let domContentLoadedHandler;
    let intervalCallback;

    const storage = {};
    const sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };

    const locationObj = { href: '', pathname: '/login.html' };
    const ctx = {
      document: {
        addEventListener: (event, handler) => {
          if (event === 'DOMContentLoaded') {
            domContentLoadedHandler = handler;
          }
        }
      },
      window: { location: locationObj },
      sessionStorage,
      setInterval: (cb) => { intervalCallback = cb; return 123; },
      Date,
      JSON,
      console: { log: jest.fn() },
      atob: (s) => Buffer.from(s, 'base64').toString('utf-8')
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    domContentLoadedHandler();

    // Trigger the interval callback
    intervalCallback();

    // Should NOT redirect since there's no token
    expect(locationObj.href).toBe('');
  });

  test('throttledUpdate respects throttle interval', () => {
    let domContentLoadedHandler;
    let lastActivityUpdates = 0;
    const now = 1000000;
    let currentTime = now;
    const eventListeners = [];

    const storage = { lastActivity: now.toString() };
    const sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => {
        storage[k] = v;
        if (k === 'lastActivity') lastActivityUpdates++;
      },
      removeItem: (k) => { delete storage[k]; }
    };

    const mockDate = { now: () => currentTime };

    const ctx = {
      document: {
        addEventListener: (event, handler, options) => {
          if (event === 'DOMContentLoaded') {
            domContentLoadedHandler = handler;
          } else {
            eventListeners.push({ event, handler, options });
          }
        }
      },
      window: { location: { href: '', pathname: '/login.html' } },
      sessionStorage,
      setInterval: jest.fn(),
      Date: mockDate,
      JSON,
      console: { log: jest.fn() },
      atob: (s) => Buffer.from(s, 'base64').toString('utf-8')
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    domContentLoadedHandler();

    // Find a click handler from setupActivityTracking
    const clickHandler = eventListeners.find(h => h.event === 'click');
    expect(clickHandler).toBeDefined();

    // First call should update
    clickHandler.handler();
    const updatesAfterFirst = lastActivityUpdates;

    // Immediate second call should be throttled (not update)
    clickHandler.handler();
    expect(lastActivityUpdates).toBe(updatesAfterFirst);

    // After 1000ms, should update again
    currentTime = now + 1001;
    clickHandler.handler();
    expect(lastActivityUpdates).toBe(updatesAfterFirst + 1);
  });

  test('browser context exposes functions on window', () => {
    const storage = {};
    const sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };

    const windowObj = { location: { href: '', pathname: '/test.html' } };
    const ctx = {
      document: { addEventListener: jest.fn() },
      window: windowObj,
      sessionStorage,
      setInterval: jest.fn(),
      Date,
      JSON,
      console: { log: jest.fn() },
      atob: (s) => Buffer.from(s, 'base64').toString('utf-8')
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);

    // Check that functions are exposed on window
    expect(typeof windowObj.getAuthHeaders).toBe('function');
    expect(typeof windowObj.clearAuthToken).toBe('function');
    expect(typeof windowObj.storeAuthToken).toBe('function');
    expect(typeof windowObj.storeUser).toBe('function');
    expect(typeof windowObj.getUsername).toBe('function');
    expect(typeof windowObj.parseJwt).toBe('function');
    expect(typeof windowObj.isTokenExpired).toBe('function');
    expect(typeof windowObj.requireAuth).toBe('function');
    expect(typeof windowObj.updateLastActivity).toBe('function');
    expect(typeof windowObj.isInactive).toBe('function');
  });
});
