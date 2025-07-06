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
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = document;
  global.fetch = fetchMock;
  global.console = { log: jest.fn(), error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/console.js');
  await ready();
  expect(fetchMock).toHaveBeenCalledWith('http://api.test/programs', expect.objectContaining({ credentials: 'include' }));
  expect(logoutBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
});
