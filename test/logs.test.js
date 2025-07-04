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
        return { value: 'test' };
      }),
      querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
      addEventListener: jest.fn((ev, cb) => { if (ev === 'DOMContentLoaded') cb(); })
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
