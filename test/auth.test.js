beforeEach(() => {
  jest.resetModules();
});

test('login form posts credentials', async () => {
  let loginHandler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') loginHandler = fn; }) };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'loginForm': return loginForm;
        case 'loginEmail': return { value: 'user@example.com' };
        case 'loginPassword': return { value: 'secret' };
        case 'loginMessage': return { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
        case 'cancelLogin': return null;
        case 'cancelRegister': return null;
        case 'registerForm': return null;
      }
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') fn(); })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({}) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await loginHandler({ preventDefault: () => {} });
  expect(fetchMock).toHaveBeenCalledWith('http://api.test/login', expect.objectContaining({ credentials: 'include' }));
});
