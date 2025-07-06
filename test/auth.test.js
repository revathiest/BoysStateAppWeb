const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('login form posts credentials', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/auth.js'), 'utf8');
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
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } },
    document: doc,
    fetch: fetchMock,
    console: { error: jest.fn() },
    alert: jest.fn(),
    setTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await loginHandler({ preventDefault: () => {} });
  expect(fetchMock).toHaveBeenCalledWith('http://api.test/login', expect.objectContaining({ credentials: 'include' }));
});
