const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('fetchLogs uses credentials include', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/logs.js'), 'utf8');
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({ logs: [], total:0, page:1, pageSize:50 }) });
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
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
  const opts = fetchMock.mock.calls[0][1];
  expect(opts.credentials).toBe('include');
});

test('loadPrograms fetches user programs', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/logs.js'), 'utf8');
  const fetchMock = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: () => ({ programs: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] })
  });
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
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
    URLSearchParams,
    alert: jest.fn()
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await ctx.loadPrograms();
  expect(fetchMock).toHaveBeenCalledWith(
    'http://api.test/programs',
    { credentials: 'include' }
  );
});
