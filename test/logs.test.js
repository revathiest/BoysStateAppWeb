const fs = require("fs");
const path = require("path");
const vm = require("vm");
const code = fs.readFileSync(path.join(__dirname, "../public/js/logs.js"), "utf8");

beforeEach(() => {
  jest.resetModules();
});

test('fetchLogs uses credentials include', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({ logs: [], total:0, page:1, pageSize:50 }) });
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
    sessionStorage: { getItem: () => 'abc' },
    sessionStorage: { getItem: () => 'abc' },
    document: {
      getElementById: jest.fn(id => {
        if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
        return { value: 'test', addEventListener: jest.fn() };
      }),
      querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
      addEventListener: jest.fn(),
      createElement: jest.fn(() => ({}))
    },
    fetch: fetchMock,
    console: { log: () => {} },
    URLSearchParams,
    alert: jest.fn()
  };
  vm.createContext(ctx);
  const helper = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  vm.runInNewContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n' + helper, ctx);
  vm.runInNewContext(code, ctx);
  await ctx.fetchLogs({ programId: 'test' });
  const opts = fetchMock.mock.calls[0][1];
  expect(opts.credentials).toBe('include');
  expect(opts.headers.Authorization).toBe('Bearer abc');
});

test('loadPrograms fetches user programs', async () => {
  const fetchMock = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: () => ({ programs: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] })
  });
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
      if (id === 'programId') return { innerHTML: '', appendChild: jest.fn(), addEventListener: jest.fn() };
      return { value: 'test', addEventListener: jest.fn() };
    }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
    sessionStorage: { getItem: () => 'abc' },
    document,
    fetch: fetchMock,
    console: { log: jest.fn() },
    URLSearchParams
  };
  vm.createContext(ctx);
  const helper2 = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  vm.runInNewContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n' + helper2, ctx);
  vm.runInNewContext(code, ctx);
  const result = await ctx.loadPrograms();
  expect(Array.isArray(result)).toBe(true);
});

test('loadPrograms handles failure', async () => {
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  const document = {
    getElementById: jest.fn(() => ({ appendChild: jest.fn(), innerHTML: '', addEventListener: jest.fn() })),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
    sessionStorage: { getItem: () => 'abc' },
    document,
    fetch: fetchMock,
    console: { log: jest.fn(), error: jest.fn() },
    URLSearchParams
  };
  vm.createContext(ctx);
  const helper = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  vm.runInNewContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n' + helper, ctx);
  vm.runInNewContext(code, ctx);
  const result = await ctx.loadPrograms();
  expect(result).toEqual([]);
});

test('loadPrograms returns [] when response not ok', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: false, json: () => ({}) });
  const document = {
    getElementById: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn(), addEventListener: jest.fn() })),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
    sessionStorage: { getItem: () => 'abc' },
    document,
    fetch: fetchMock,
    console: { log: jest.fn(), error: jest.fn() },
    URLSearchParams
  };
  vm.createContext(ctx);
  const helper = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  vm.runInNewContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n' + helper, ctx);
  vm.runInNewContext(code, ctx);
  const result = await ctx.loadPrograms();
  expect(result).toEqual([]);
});

test('loadPrograms via require handles non-ok', async () => {
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  const select = { innerHTML: '', appendChild: jest.fn() };
  global.document = {
    getElementById: jest.fn(id => (id === 'programId' ? select : { addEventListener: jest.fn(), value: '' })),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  const mod = require('../public/js/logs.js');
  const res = await mod.loadPrograms();
  expect(res).toEqual([]);
});

test('loadPrograms via require populates select', async () => {
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  const select = { innerHTML: '', appendChild: jest.fn() };
  global.document = {
    getElementById: id => (id === 'programId' ? select : { addEventListener: jest.fn(), value: '' }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.getUsername = () => 'u';
  global.getAuthHeaders = () => ({});
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [{ programId: '1', name: 'A' }] }) });
  const mod = require('../public/js/logs.js');
  const res = await mod.loadPrograms();
  expect(select.appendChild).toHaveBeenCalled();
  expect(res.length).toBe(1);
});

test('fetchLogs redirects on 401', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ status: 401 });
  const document = {
    getElementById: jest.fn(() => ({ value: 'p', addEventListener: jest.fn() })),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = fetchMock;
  const mod = require('../public/js/logs.js');
  await mod.fetchLogs({ programId: 'p' });
  expect(global.window.location.href).toBe('login.html');
});

test('fetchLogs renders logs and pager', async () => {
  const logs = [{ timestamp: Date.now(), level: 'info', source: 's', message: 'm' }];
  const tbody = { innerHTML: '', appendChild: jest.fn() };
  const pager = { innerHTML: '', appendChild: jest.fn() };
  const document = {
    querySelector: jest.fn(sel => tbody),
    getElementById: jest.fn(id => {
      if (id === 'pager') return pager;
      if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
      return { value: 'p', addEventListener: jest.fn() };
    }),
    createElement: jest.fn(() => ({ setAttribute: jest.fn() })),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => ({ logs, total: 60, page: 2, pageSize: 50 })
  });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = fetchMock;
  global.console = { log: jest.fn() };
  const mod = require('../public/js/logs.js');
  await mod.fetchLogs({ programId: 'p', page: 2 });
  expect(fetchMock).toHaveBeenCalled();
  expect(tbody.appendChild).toHaveBeenCalled();
  expect(pager.appendChild).toHaveBeenCalled();
});

test('fetchLogs converts start/end to dateFrom/dateTo', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => ({ logs: [], total:0, page:1, pageSize:50 }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location:{ href:'' } };
  global.document = { getElementById: jest.fn(() => ({ value: 'p', addEventListener: jest.fn() })), querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })), addEventListener: jest.fn(), createElement: jest.fn(() => ({})) };
  global.fetch = fetchMock;
  const mod = require('../public/js/logs.js');
  await mod.fetchLogs({ programId: 'p', start: '2023-01-01', end: '2023-01-02' });
  const url = fetchMock.mock.calls[0][0];
  expect(url).toContain('dateFrom=');
  expect(url).toContain('dateTo=');
});


test('initialization triggers fetch and handlers on DOMContentLoaded', async () => {
  let domFn, downloadFn, applyFn, filterFn, logoutFn;
  const table = {
    querySelectorAll: jest.fn(sel => {
      if (sel === 'thead th') return [{ textContent: 'h1' }, { textContent: 'h2' }];
      if (sel === 'tbody tr') return [{ querySelectorAll: jest.fn(() => [{ textContent: 'a,b' }, { textContent: 'c' }]) }];
      return [];
    }),
    querySelector: jest.fn(),
  };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'apply') return { addEventListener: jest.fn((ev, fn) => { applyFn = fn; }) };
      if (id === 'filters') return { addEventListener: jest.fn((ev, fn) => { filterFn = fn; }) };
      if (id === 'logoutBtn') return { addEventListener: jest.fn((ev, fn) => { logoutFn = fn; }) };
      if (id === 'programId') return { addEventListener: jest.fn(), value: 'p' };
      if (id === 'download') return { addEventListener: jest.fn((ev, fn) => { downloadFn = fn; }) };
      if (id === 'logTable') return table;
      return { addEventListener: jest.fn(), value: '' };
    }),
    querySelector: jest.fn(() => table),
    createElement: jest.fn(() => ({ click: jest.fn() })),
    body: { appendChild: jest.fn(), removeChild: jest.fn() },
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') domFn = fn; })
  };
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: () => ({ programs: [] }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: () => ({ logs: [], total: 0, page:1, pageSize:50 }) })
    .mockResolvedValue({ ok: true, status:200, json: () => ({ logs: [], total:0, page:1, pageSize:50 }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location:{ href:'' } };
  global.document = document;
  global.fetch = fetchMock;
  global.URL = { createObjectURL: jest.fn(()=>'u'), revokeObjectURL: jest.fn() };
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/logs.js');
  await domFn();
  expect(fetchMock).toHaveBeenCalled();
  downloadFn();
  expect(table.querySelectorAll).toHaveBeenCalled();
  applyFn();
  filterFn({ preventDefault: jest.fn() });
  logoutFn();
  expect(window.location.href).toBe('login.html');
  expect(fetchMock.mock.calls.length).toBeGreaterThan(2);
});

test('DOMContentLoaded alerts when API_URL missing', async () => {
  let domFn;
  const document = {
    getElementById: jest.fn(() => ({ addEventListener: jest.fn(), value:'' })),
    querySelector: jest.fn(() => ({ })),
    addEventListener: jest.fn((ev, fn) => { if(ev==='DOMContentLoaded') domFn = fn; })
  };
  global.window = { API_URL: '', logToServer: jest.fn() };
  global.document = document;
  global.fetch = jest.fn();
  global.console = { error: jest.fn(), log: jest.fn() };
  global.alert = jest.fn();
  require('../public/js/logs.js');
  await domFn();
  expect(global.alert).toHaveBeenCalled();
});

test('loadPrograms uses fallback properties (id/name instead of programId/programName)', async () => {
  const select = { innerHTML: '', appendChild: jest.fn() };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = {
    getElementById: id => (id === 'programId' ? select : { addEventListener: jest.fn(), value: '' }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({ value: '', textContent: '' }))
  };
  global.getUsername = () => 'u';
  global.getAuthHeaders = () => ({});
  // Programs with only id/name, not programId/programName
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [{ id: '123', name: 'TestProg' }] }) });
  const mod = require('../public/js/logs.js');
  const res = await mod.loadPrograms();
  expect(select.appendChild).toHaveBeenCalled();
  expect(res.length).toBe(1);
});

test('loadPrograms handles missing select element', async () => {
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = {
    getElementById: id => (id === 'programId' ? null : { addEventListener: jest.fn(), value: '' }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.getUsername = () => 'u';
  global.getAuthHeaders = () => ({});
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [{ id: '1', name: 'A' }] }) });
  const mod = require('../public/js/logs.js');
  const res = await mod.loadPrograms();
  // Should not throw and should return the programs
  expect(res.length).toBe(1);
});

test('loadPrograms without logToServer defined', async () => {
  global.window = { API_URL: 'http://api.test' }; // no logToServer
  global.document = {
    getElementById: () => ({ addEventListener: jest.fn(), innerHTML: '', appendChild: jest.fn() }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.getUsername = () => 'u';
  global.getAuthHeaders = () => ({});
  global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
  const mod = require('../public/js/logs.js');
  const res = await mod.loadPrograms();
  // Should handle error gracefully without logToServer
  expect(res).toEqual([]);
});

test('loadPrograms when getAuthHeaders is not a function', async () => {
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = {
    getElementById: () => ({ addEventListener: jest.fn(), innerHTML: '', appendChild: jest.fn() }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.getUsername = () => 'u';
  global.getAuthHeaders = 'not a function'; // Not a function
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ programs: [] }) });
  const mod = require('../public/js/logs.js');
  const res = await mod.loadPrograms();
  expect(res).toEqual([]);
  // Should use empty headers when getAuthHeaders is not a function
  expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: {} }));
});

test('fetchLogs without logToServer defined', async () => {
  const tbody = { innerHTML: '', appendChild: jest.fn() };
  const pager = { innerHTML: '', appendChild: jest.fn() };
  global.window = { API_URL: 'http://api.test', location: { href: '' } }; // no logToServer
  global.document = {
    querySelector: () => tbody,
    getElementById: id => (id === 'pager' ? pager : { value: 'p', addEventListener: jest.fn() }),
    createElement: jest.fn(() => ({ setAttribute: jest.fn() })),
    addEventListener: jest.fn()
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => ({ logs: [], total: 0, page: 1, pageSize: 50 }) });
  global.getAuthHeaders = () => ({});
  const mod = require('../public/js/logs.js');
  await mod.fetchLogs({ programId: 'p' });
  expect(global.fetch).toHaveBeenCalled();
});

test('fetchLogs when getAuthHeaders is not a function', async () => {
  const tbody = { innerHTML: '', appendChild: jest.fn() };
  const pager = { innerHTML: '', appendChild: jest.fn() };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = {
    querySelector: () => tbody,
    getElementById: id => (id === 'pager' ? pager : { value: 'p', addEventListener: jest.fn() }),
    createElement: jest.fn(() => ({ setAttribute: jest.fn() })),
    addEventListener: jest.fn()
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => ({ logs: [], total: 0, page: 1, pageSize: 50 }) });
  global.getAuthHeaders = 'not a function';
  const mod = require('../public/js/logs.js');
  await mod.fetchLogs({ programId: 'p' });
  // Should use empty headers
  expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: {} }));
});

test('renderLogs handles logs with missing fields', () => {
  const tbody = { innerHTML: '', appendChild: jest.fn() };
  global.window = { API_URL: 'http://api.test' };
  global.document = {
    querySelector: () => tbody,
    getElementById: () => ({ addEventListener: jest.fn(), innerHTML: '', appendChild: jest.fn() }),
    createElement: jest.fn(() => ({ innerHTML: '' })),
    addEventListener: jest.fn()
  };
  global.console = { log: jest.fn() };
  const mod = require('../public/js/logs.js');
  // Logs with missing fields (no timestamp, level, source, message)
  mod.renderLogs([{ /* empty */ }, { timestamp: null, level: null, source: null, message: null }]);
  expect(tbody.appendChild).toHaveBeenCalledTimes(2);
});

test('renderPager on first page (no prev buttons)', () => {
  const pager = { innerHTML: '', appendChild: jest.fn() };
  global.window = { API_URL: 'http://api.test' };
  global.document = {
    getElementById: id => (id === 'pager' ? pager : { addEventListener: jest.fn(), value: '' }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    createElement: jest.fn(() => ({ setAttribute: jest.fn(), style: {}, className: '' })),
    addEventListener: jest.fn()
  };
  global.getFilters = () => ({});
  const mod = require('../public/js/logs.js');
  // First page - should not have prev buttons
  mod.renderPager(1, 10, 100);
  // Should have page buttons but not prev (« ‹) buttons
  expect(pager.appendChild).toHaveBeenCalled();
});

test('renderPager on last page (no next buttons)', () => {
  const pager = { innerHTML: '', appendChild: jest.fn() };
  global.window = { API_URL: 'http://api.test' };
  global.document = {
    getElementById: id => (id === 'pager' ? pager : { addEventListener: jest.fn(), value: '' }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    createElement: jest.fn(() => ({ setAttribute: jest.fn(), style: {}, className: '' })),
    addEventListener: jest.fn()
  };
  global.getFilters = () => ({});
  const mod = require('../public/js/logs.js');
  // Last page (page 10 of 10 with pageSize 10 and total 100)
  mod.renderPager(10, 10, 100);
  expect(pager.appendChild).toHaveBeenCalled();
});

test('renderPager adjusts start when near end', () => {
  const pager = { innerHTML: '', appendChild: jest.fn() };
  global.window = { API_URL: 'http://api.test' };
  global.document = {
    getElementById: id => (id === 'pager' ? pager : { addEventListener: jest.fn(), value: '' }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    createElement: jest.fn(() => ({ setAttribute: jest.fn(), style: {}, className: '' })),
    addEventListener: jest.fn()
  };
  global.getFilters = () => ({});
  const mod = require('../public/js/logs.js');
  // Page 9 of 10 - should trigger the start adjustment logic (end - start < maxPagesToShow - 1)
  mod.renderPager(9, 10, 100);
  expect(pager.appendChild).toHaveBeenCalled();
});

test('DOMContentLoaded with missing logoutBtn', async () => {
  let domFn;
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'logoutBtn') return null; // no logout button
      if (id === 'programId') return { addEventListener: jest.fn(), value: 'p' };
      if (id === 'download') return { addEventListener: jest.fn() };
      return { addEventListener: jest.fn(), value: '' };
    }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn(), querySelectorAll: jest.fn(() => []) })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') domFn = fn; }),
    body: { appendChild: jest.fn(), removeChild: jest.fn() }
  };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: () => ({ programs: [] }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: () => ({ logs: [], total: 0, page: 1, pageSize: 50 }) });
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();
  require('../public/js/logs.js');
  await domFn();
  // Should not throw when logoutBtn is null
  expect(global.fetch).toHaveBeenCalled();
});

test('programSel change handler triggers fetchLogs', async () => {
  let domFn;
  let programChangeHandler;
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'programId') return {
        addEventListener: jest.fn((ev, fn) => { if (ev === 'change') programChangeHandler = fn; }),
        value: 'p'
      };
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      if (id === 'download') return { addEventListener: jest.fn() };
      return { addEventListener: jest.fn(), value: '' };
    }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn(), querySelectorAll: jest.fn(() => []) })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') domFn = fn; }),
    body: { appendChild: jest.fn(), removeChild: jest.fn() }
  };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: () => ({ programs: [] }) })
    .mockResolvedValue({ ok: true, status: 200, json: () => ({ logs: [], total: 0, page: 1, pageSize: 50 }) });
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();
  global.getUsername = () => 'u';
  global.getAuthHeaders = () => ({});
  require('../public/js/logs.js');
  await domFn();
  // Trigger program change handler
  expect(programChangeHandler).toBeDefined();
  programChangeHandler();
  expect(global.fetch.mock.calls.length).toBeGreaterThan(1);
});

test('DOMContentLoaded uses window.apiBase fallback', async () => {
  let domFn;
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'programId') return { addEventListener: jest.fn(), value: 'p' };
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
      if (id === 'download') return { addEventListener: jest.fn() };
      return { addEventListener: jest.fn(), value: '' };
    }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn(), querySelectorAll: jest.fn(() => []) })),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') domFn = fn; }),
    body: { appendChild: jest.fn(), removeChild: jest.fn() }
  };
  // API_URL not set, but apiBase is
  global.window = { apiBase: 'http://fallback.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: () => ({ programs: [] }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: () => ({ logs: [], total: 0, page: 1, pageSize: 50 }) });
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();
  global.getUsername = () => 'u';
  global.getAuthHeaders = () => ({});
  require('../public/js/logs.js');
  await domFn();
  // Should proceed without alerting
  expect(global.alert).not.toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalled();
});
