const fs = require("fs");
const path = require("path");
const vm = require("vm");
const code = fs.readFileSync(path.join(__dirname, "../public/js/dashboard.js"), "utf8");

beforeEach(() => {
  jest.resetModules();
});

test('dashboard fetches user programs', async () => {
  let ready;
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'programList') return { appendChild: jest.fn() };
      if (id === 'features') return { classList: { remove: jest.fn(), add: jest.fn() } };
      if (id === 'userRole') return { textContent: '' };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    status: 200,
    json: () => ({ username: 'u', programs: [{ programName: 'P', role: 'admin' }] })
  });
  const storage = { authToken: 'abc', lastActivity: Date.now().toString() };
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } },
    sessionStorage: {
      getItem: (key) => storage[key] || null,
      setItem: (key, val) => { storage[key] = val; },
      removeItem: (key) => { delete storage[key]; },
      keys: () => Object.keys(storage),
      [Symbol.iterator]: function* () { yield* Object.keys(storage); }
    },
    document: doc,
    fetch: fetchMock,
    console: { log: jest.fn(), error: jest.fn() },
    alert: jest.fn(),
    Object: Object
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
  expect(logoutBtn.addEventListener).toHaveBeenCalled();
  const clickHandler = logoutBtn.addEventListener.mock.calls[0][1];
  clickHandler();
  expect(ctx.window.location.href).toBe('login.html');
});

test('dashboard alerts when API_URL missing', async () => {
  let ready;
  const doc = {
    getElementById: jest.fn(() => ({ classList: { remove: jest.fn(), add: jest.fn() }, appendChild: jest.fn() })),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  global.window = { API_URL: '', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = jest.fn();
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(global.alert).toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('dashboard handles network error', async () => {
  let ready;
  const mainContent = { classList: { remove: jest.fn() }, innerHTML: '' };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'main-content') return mainContent;
      if (id === 'features') return { classList: { remove: jest.fn(), add: jest.fn() } };
      if (id === 'userRole') return { textContent: '' };
      if (id === 'programList') return { appendChild: jest.fn() };
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(fetchMock).toHaveBeenCalled();
  expect(mainContent.innerHTML).toContain('Unable');
});

test('dashboard handles network error without logger', async () => {
  let ready;
  const mainContent = { classList: { remove: jest.fn() }, innerHTML: '' };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'main-content') return mainContent;
      if (id === 'features') return { classList: { remove: jest.fn(), add: jest.fn() } };
      if (id === 'userRole') return { textContent: '' };
      if (id === 'programList') return { appendChild: jest.fn() };
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  global.window = { API_URL: 'http://api.test', location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(fetchMock).toHaveBeenCalled();
  expect(mainContent.innerHTML).toContain('Unable');
});

test('dashboard redirects on 401', async () => {
  let ready;
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'main-content') return { classList: { remove: jest.fn() }, innerHTML: '' };
      if (id === 'programList') return { appendChild: jest.fn() };
      if (id === 'features') return { classList: { remove: jest.fn(), add: jest.fn() } };
      if (id === 'userRole') return { textContent: '' };
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 401 });
  const clearAuthToken = jest.fn();
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.clearAuthToken = clearAuthToken;
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(clearAuthToken).toHaveBeenCalled();
  expect(global.window.location.href).toBe('login.html');
});

test('dashboard hides features for counselor role', async () => {
  let ready;
  const features = { classList: { remove: jest.fn(), add: jest.fn() } };
  const listEl = { appendChild: jest.fn() };
  let logoutHandler;
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return { addEventListener: jest.fn((e,fn)=>{logoutHandler=fn;}) };
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'programList') return listEl;
      if (id === 'features') return features;
      if (id === 'userRole') return { textContent: '' };
      return null;
    }),
    querySelectorAll: jest.fn(sel => sel === '#features > div:nth-child(1)' ? [{ classList: { add: features.classList.add, remove: jest.fn() } }] : []),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    status: 200,
    json: () => ({ username: 'u', programs: [{ programName: 'P', role: 'counselor' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(features.classList.add).toHaveBeenCalled();
});

test('dashboard shows features for admin role', async () => {
  let ready;
  let logoutHandler;
  const features = { classList: { remove: jest.fn(), add: jest.fn() } };
  const listEl = { appendChild: jest.fn() };
  const logoutBtn = { addEventListener: jest.fn((e,fn)=>{ logoutHandler = fn; }) };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return logoutBtn;
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'programList') return listEl;
      if (id === 'features') return features;
      if (id === 'userRole') return { textContent: '' };
      return null;
    }),
    querySelectorAll: jest.fn(() => [{ classList: { remove: features.classList.remove } }]),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    status: 200,
    json: () => ({ username: 'u', programs: [{ programName: 'P', role: 'admin' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(features.classList.remove).toHaveBeenCalled();
  logoutHandler();
  expect(global.window.location.href).toBe('login.html');
});

test('dashboard handles invalid JSON', async () => {
  let ready;
  const mainContent = { classList: { remove: jest.fn() }, innerHTML: '' };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'main-content') return mainContent;
      if (id === 'programList') return { appendChild: jest.fn() };
      if (id === 'features') return { classList: { remove: jest.fn(), add: jest.fn() } };
      if (id === 'userRole') return { textContent: '' };
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({ addEventListener: jest.fn() })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    status: 200,
    json: () => { throw new Error('bad'); }
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(mainContent.innerHTML).toContain('Unexpected');
});

test('dashboard stores programId in localStorage when program is selected', async () => {
  let ready;
  let clickHandler;
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn()
  };
  const features = { classList: { remove: jest.fn(), add: jest.fn() } };
  const programListEl = { appendChild: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'programList') return programListEl;
      if (id === 'features') return features;
      if (id === 'userRole') return { textContent: '' };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({
      addEventListener: jest.fn((evt, fn) => {
        if (evt === 'click') clickHandler = fn;
      })
    })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    status: 200,
    json: () => ({ username: 'u', programs: [{ programId: 'prog-123', programName: 'Test Program', role: 'admin' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.localStorage = localStorageMock;
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();

  // Simulate clicking on a program card
  expect(clickHandler).toBeDefined();
  clickHandler();

  // Verify programId was stored
  expect(localStorageMock.setItem).toHaveBeenCalledWith('lastSelectedProgramId', 'prog-123');
  expect(global.window.selectedProgramId).toBe('prog-123');
});

test('dashboard handles program with id instead of programId', async () => {
  let ready;
  let clickHandler;
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn()
  };
  const features = { classList: { remove: jest.fn(), add: jest.fn() } };
  const programListEl = { appendChild: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      if (id === 'main-content') return { classList: { remove: jest.fn() } };
      if (id === 'programList') return programListEl;
      if (id === 'features') return features;
      if (id === 'userRole') return { textContent: '' };
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    createElement: jest.fn(() => ({
      addEventListener: jest.fn((evt, fn) => {
        if (evt === 'click') clickHandler = fn;
      })
    })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    status: 200,
    json: () => ({ username: 'u', programs: [{ id: 'alt-prog-456', programName: 'Alt Program', role: 'admin' }] })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.localStorage = localStorageMock;
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();

  // Simulate clicking on a program card
  expect(clickHandler).toBeDefined();
  clickHandler();

  // Verify id was used as fallback
  expect(localStorageMock.setItem).toHaveBeenCalledWith('lastSelectedProgramId', 'alt-prog-456');
  expect(global.window.selectedProgramId).toBe('alt-prog-456');
});
