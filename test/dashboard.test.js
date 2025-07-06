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
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/dashboard.js');
  await ready();
  expect(fetchMock).toHaveBeenCalledWith('http://api.test/programs', expect.objectContaining({ credentials: 'include' }));
  expect(logoutBtn.addEventListener).toHaveBeenCalled();
});
