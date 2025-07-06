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
