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
