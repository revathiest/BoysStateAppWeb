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
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
    sessionStorage: { getItem: () => 'abc' },
    document: doc,
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
  expect(logoutBtn.addEventListener).toHaveBeenCalled();
});
