const fs = require("fs");
const path = require("path");
const vm = require("vm");
const code = fs.readFileSync(path.join(__dirname, "../public/js/console.js"), "utf8");

beforeEach(() => {
  jest.resetModules();
});

test('console page loads programs with credentials', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [{ programId: 'p1', programName: 'Test' }] }) });
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } },
    sessionStorage: { getItem: () => 'abc' },
    localStorage: { getItem: jest.fn(() => 'p1'), setItem: jest.fn() },
    document,
    fetch: fetchMock,
    console: { log: jest.fn(), error: jest.fn() },
    alert: jest.fn()
  };
  vm.createContext(ctx);
  const helper = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  vm.runInContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n' + helper, ctx);
  vm.runInContext(code, ctx);
  await ready();
  expect(fetchMock).toHaveBeenCalledWith(
    'http://api.test/programs',
    expect.objectContaining({ credentials: 'include', headers: expect.objectContaining({ Authorization: 'Bearer abc' }) })
  );
  expect(logoutBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
});

test('console alerts when API_URL missing', async () => {
  let ready;
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  global.window = { API_URL: '', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = jest.fn();
  global.console = { error: jest.fn(), log: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();
  expect(global.alert).toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('console handles fetch failure', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  const logToServer = jest.fn();
  global.window = { API_URL: 'http://api.test', logToServer, location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();
  expect(fetchMock).toHaveBeenCalled();
  expect(logToServer).toHaveBeenCalled();
});

test('console redirects on 401', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { error: jest.fn(), log: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();
  expect(global.window.location.href).toBe('login.html');
});

test('logout button click navigates to login page', async () => {
  let ready;
  let clickHandler;
  const logoutBtn = { addEventListener: jest.fn((ev, fn) => { if (ev === 'click') clickHandler = fn; }) };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [] }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();
  clickHandler();
  expect(global.window.location.href).toBe('login.html');
});

test('console handles non-401 failure without redirect', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 500 });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { error: jest.fn(), log: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();
  expect(global.window.location.href).toBe('');
});

test('updateNavLinks updates link hrefs with programId', async () => {
  let ready;
  const userMgmtLink = { href: '' };
  const configLink = { href: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return userMgmtLink;
      if (id === 'programs-config-link') return configLink;
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [{ programId: 'test-program-123' }] }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => 'test-program-123'), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();

  expect(userMgmtLink.href).toBe('user-management.html?programId=test-program-123');
  expect(configLink.href).toBe('programs-config.html?programId=test-program-123');
});

test('auto-selects first program when localStorage has stale programId', async () => {
  let ready;
  const userMgmtLink = { href: '' };
  const configLink = { href: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const setItemMock = jest.fn();
  const consoleLogMock = jest.fn();
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return userMgmtLink;
      if (id === 'programs-config-link') return configLink;
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  // json() must return a Promise
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ programId: 'new-program', programName: 'New Program' }] })
  });
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } },
    sessionStorage: { getItem: () => null },
    localStorage: { getItem: jest.fn(() => 'stale-old-program'), setItem: setItemMock },
    document,
    fetch: fetchMock,
    console: { log: consoleLogMock, error: jest.fn() },
    alert: jest.fn(),
    Promise: Promise
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await ready();

  // Should auto-select the first available program since 'stale-old-program' doesn't exist
  expect(setItemMock).toHaveBeenCalledWith('lastSelectedProgramId', 'new-program');
  expect(consoleLogMock).toHaveBeenCalledWith('Auto-selected program:', 'new-program');
});

test('does not auto-select when current programId is valid', async () => {
  let ready;
  const userMgmtLink = { href: '' };
  const configLink = { href: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const setItemMock = jest.fn();
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return userMgmtLink;
      if (id === 'programs-config-link') return configLink;
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  // Return programs where one matches the stored programId
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [
      { programId: 'program-1', programName: 'Program 1' },
      { programId: 'program-2', programName: 'Program 2' }
    ]})
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  // Return a valid programId that matches one of the programs
  global.localStorage = { getItem: jest.fn(() => 'program-2'), setItem: setItemMock };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();

  // Should NOT call setItem because programId is already valid
  expect(setItemMock).not.toHaveBeenCalled();
});

test('auto-selects first program when programId is stale (require-based)', async () => {
  let ready;
  const userMgmtLink = { href: '' };
  const configLink = { href: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const setItemMock = jest.fn();
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return userMgmtLink;
      if (id === 'programs-config-link') return configLink;
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  // Return program that does NOT match the stored programId
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ programId: 'new-program-abc', programName: 'New Program' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  // Stale programId that doesn't match any programs
  global.localStorage = { getItem: jest.fn(() => 'old-stale-program-id'), setItem: setItemMock };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();

  // Should auto-select the first available program since stored programId doesn't exist
  expect(setItemMock).toHaveBeenCalledWith('lastSelectedProgramId', 'new-program-abc');
  expect(global.console.log).toHaveBeenCalledWith('Auto-selected program:', 'new-program-abc');
});

test('uses id field when programId is not present (require-based)', async () => {
  let ready;
  const userMgmtLink = { href: '' };
  const configLink = { href: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const setItemMock = jest.fn();
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return userMgmtLink;
      if (id === 'programs-config-link') return configLink;
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  // Program uses 'id' instead of 'programId'
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ id: 'legacy-program-id', programName: 'Legacy Program' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  // Stale programId
  global.localStorage = { getItem: jest.fn(() => 'non-matching-id'), setItem: setItemMock };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();

  // Should use 'id' field since 'programId' is not present
  expect(setItemMock).toHaveBeenCalledWith('lastSelectedProgramId', 'legacy-program-id');
});

test('updateNavLinks does nothing when no programId in localStorage', async () => {
  let ready;
  const userMgmtLink = { href: 'original.html' };
  const configLink = { href: 'original.html' };
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return userMgmtLink;
      if (id === 'programs-config-link') return configLink;
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [] }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  // No programId in localStorage
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();

  // Links should remain unchanged when no programId
  expect(userMgmtLink.href).toBe('original.html');
  expect(configLink.href).toBe('original.html');
});

test('handles programs with id instead of programId', async () => {
  let ready;
  const setItemMock = jest.fn();
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  // Programs use 'id' instead of 'programId'
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ id: 'legacy-id-123', programName: 'Legacy Program' }] })
  });
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } },
    sessionStorage: { getItem: () => null },
    localStorage: { getItem: jest.fn(() => 'non-existent'), setItem: setItemMock },
    document,
    fetch: fetchMock,
    console: { log: jest.fn(), error: jest.fn() },
    alert: jest.fn()
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await ready();

  // Should handle 'id' field as fallback
  expect(setItemMock).toHaveBeenCalledWith('lastSelectedProgramId', 'legacy-id-123');
});

test('handles missing link elements in updateNavLinks', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      // Return null for the nav links to test the if (link) branch
      if (id === 'user-management-link') return null;
      if (id === 'programs-config-link') return null;
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ programId: 'test-prog' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => 'test-prog'), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  // Should not throw when link elements are missing
  require('../public/js/console.js');
  await ready();
  expect(fetchMock).toHaveBeenCalled();
});

test('handles null json response', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  // json() resolves to null (simulating empty/invalid response)
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(null)
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();

  // Should handle null data gracefully (programs = [])
  expect(global.console.log).toHaveBeenCalledWith('Console: Loaded programs array =', []);
});

test('handles missing logoutBtn element', async () => {
  let ready;
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      if (id === 'logoutBtn') return null; // No logout button
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  // Should not throw when logoutBtn is missing
  require('../public/js/console.js');
  await ready();
  expect(fetchMock).toHaveBeenCalled();
});

test('logs error to server when fetch fails and logToServer exists', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const logToServer = jest.fn();
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const networkError = new Error('Network failure');
  const fetchMock = jest.fn().mockRejectedValue(networkError);
  global.window = { API_URL: 'http://api.test', logToServer, location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();

  expect(global.console.error).toHaveBeenCalledWith('Network error while loading programs', networkError);
  expect(logToServer).toHaveBeenCalledWith('Network error while loading programs', expect.objectContaining({ level: 'error' }));
});

test('calls applyConsoleParentVisibility when function exists and programId is set', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const applyConsoleParentVisibilityMock = jest.fn().mockResolvedValue({ hasVisibleCards: true });
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'user-management-link') return { href: '' };
      if (id === 'programs-config-link') return { href: '' };
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ programId: 'p1', programName: 'Test' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.localStorage = { getItem: jest.fn((key) => key === 'lastSelectedProgramId' ? 'p1' : null), setItem: jest.fn() };
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();
  global.applyConsoleParentVisibility = applyConsoleParentVisibilityMock;

  require('../public/js/console.js');
  await ready();

  expect(applyConsoleParentVisibilityMock).toHaveBeenCalledWith('p1');

  delete global.applyConsoleParentVisibility;
});
