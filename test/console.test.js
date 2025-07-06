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
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({}) });
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } },
    sessionStorage: { getItem: () => 'abc' },
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
    getElementById: jest.fn(id => null),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  global.window = { API_URL: '', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = jest.fn();
  global.console = { error: jest.fn() };
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
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  const logToServer = jest.fn();
  global.window = { API_URL: 'http://api.test', logToServer, location: { href: '' } };
  global.document = document;
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
      return null;
    }),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = fetchMock;
  global.console = { error: jest.fn(), log: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();
  expect(global.window.location.href).toBe('login.html');
});
