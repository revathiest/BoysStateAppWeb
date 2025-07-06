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
  vm.createContext(ctx);
  const helper2 = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  vm.runInNewContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n' + helper2, ctx);
  vm.runInNewContext(code, ctx);
  const result = await ctx.loadPrograms();
  expect(Array.isArray(result)).toBe(true);
});

test('fetchLogs alerts when missing programId', async () => {
  const fetchMock = jest.fn();
  const document = {
    getElementById: jest.fn(() => ({ value: 'x', addEventListener: jest.fn() })),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = document;
  global.fetch = fetchMock;
  global.alert = jest.fn();
  const mod = require('../public/js/logs.js');
  await mod.fetchLogs({});
  expect(global.alert).toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
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


test('initialization triggers fetch on DOMContentLoaded', async () => {
  let domFn;
  let downloadFn;
  const table = {
    querySelectorAll: jest.fn(sel => {
      if (sel === 'thead th') return [{ textContent: 'h1' }, { textContent: 'h2' }];
      if (sel === 'tbody tr') return [{ querySelectorAll: jest.fn(() => [{ textContent: 'a' }, { textContent: 'b' }]) }];
      return [];
    }),
    querySelector: jest.fn(),
  };
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
      if (id === 'logoutBtn') return { addEventListener: jest.fn() };
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
    .mockResolvedValueOnce({ ok: true, status: 200, json: () => ({ logs: [], total: 0, page:1, pageSize:50 }) });
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
