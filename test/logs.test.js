const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('fetchLogs includes auth header', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/logs.js'), 'utf8');
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({ logs: [], total:0, page:1, pageSize:50 }) });
  const ensureMock = jest.fn().mockResolvedValue('abc.def');
  const ctx = {
    window: { API_URL: 'http://api.test', ensureValidToken: ensureMock, logToServer: jest.fn() },
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
  vm.runInContext(code, ctx);
  await ctx.fetchLogs({ programId: 'test' });
  expect(ensureMock).toHaveBeenCalled();
  const opts = fetchMock.mock.calls[0][1];
  expect(opts.headers.Authorization).toBe('Bearer abc.def');
});

test('loadPrograms fetches user programs', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/logs.js'), 'utf8');
  const payload = Buffer.from(JSON.stringify({ email: 'user@test.com' })).toString('base64');
  const token = `a.${payload}.c`;
  const fetchMock = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: () => ({ programs: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] })
  });
  const ensureMock = jest.fn().mockResolvedValue(token);
  const ctx = {
    window: { API_URL: 'http://api.test', ensureValidToken: ensureMock, logToServer: jest.fn() },
    document: {
      getElementById: jest.fn(id => {
        if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
        if (id === 'programId') return { innerHTML: '', appendChild: jest.fn(), addEventListener: jest.fn() };
        return { value: 'test', addEventListener: jest.fn() };
      }),
      querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
      addEventListener: jest.fn(),
      createElement: jest.fn(() => ({}))
    },
    fetch: fetchMock,
    console: { log: () => {} },
    atob: str => Buffer.from(str, 'base64').toString('binary'),
    URLSearchParams,
    alert: jest.fn()
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await ctx.loadPrograms();
  expect(fetchMock).toHaveBeenCalledWith(
    'http://api.test/programs/user%40test.com',
    { headers: { Authorization: `Bearer ${token}` } }
  );
});
