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

test('register form submits and shows success', async () => {
  let handler;
  const registerForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch(id) {
        case 'registerForm': return registerForm;
        case 'regEmail': return { value: 'a@b.com' };
        case 'regPassword': return { value: 'p' };
        case 'registerMessage': return msgEl;
        case 'cancelLogin': return null;
        case 'cancelRegister': return null;
        case 'loginForm': return null;
      }
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') fn(); })
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 201, json: () => ({ id:1 }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(fetchMock).toHaveBeenCalledWith('http://api.test/register', expect.objectContaining({ credentials: 'include' }));
  expect(msgEl.textContent).toContain('successful');
});

test('login handles network error', async () => {
  let handler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch(id) {
        case 'loginForm': return loginForm;
        case 'loginEmail': return { value: 'x' };
        case 'loginPassword': return { value: 'y' };
        case 'loginMessage': return msgEl;
        case 'cancelLogin': return null;
        case 'cancelRegister': return null;
        case 'registerForm': return null;
      }
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') fn(); })
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(msgEl.textContent).toContain('Unable');
});

test('alerts when API_URL missing', async () => {
  const doc = {
    getElementById: jest.fn(() => ({ disabled: false })),
    querySelectorAll: jest.fn(() => [{querySelectorAll: jest.fn(() => [])}]),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') fn(); })
  };
  global.window = { API_URL: '', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = jest.fn();
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  expect(global.alert).toHaveBeenCalled();
});

test('login failure shows message', async () => {
  let handler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch(id) {
        case 'loginForm': return loginForm;
        case 'loginEmail': return { value: 'x' };
        case 'loginPassword': return { value: 'y' };
        case 'loginMessage': return msgEl;
        case 'cancelLogin': return null;
        case 'cancelRegister': return null;
        case 'registerForm': return null;
      }
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') fn(); })
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok: false, json: () => ({ error: 'bad' }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(msgEl.textContent).toBe('bad');
});

test('register handles network error', async () => {
  let handler;
  const registerForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch(id){
        case 'registerForm': return registerForm;
        case 'regEmail': return { value: 'a@b.com' };
        case 'regPassword': return { value: 'p' };
        case 'registerMessage': return msgEl;
        case 'cancelLogin': return null;
        case 'cancelRegister': return null;
        case 'loginForm': return null;
      }
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') fn(); })
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(msgEl.textContent).toContain('Unable');
});

test('register handles bad response', async () => {
  let handler;
  const registerForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch(id){
        case 'registerForm': return registerForm;
        case 'regEmail': return { value: 'a@b.com' };
        case 'regPassword': return { value: 'p' };
        case 'registerMessage': return msgEl;
        case 'cancelLogin': return null;
        case 'cancelRegister': return null;
        case 'loginForm': return null;
      }
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn((ev, fn) => { if (ev === 'DOMContentLoaded') fn(); })
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 400, json: () => ({ error: 'nope' }) });
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location:{ href:'' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(msgEl.textContent).toBe('nope');
});
