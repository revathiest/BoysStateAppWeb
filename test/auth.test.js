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

test('cancel buttons navigate home', () => {
  let ready;
  let loginHandler;
  let registerHandler;
  const cancelLogin = { addEventListener: jest.fn((ev, fn) => { if(ev==='click') loginHandler = fn; }) };
  const cancelRegister = { addEventListener: jest.fn((ev, fn) => { if(ev==='click') registerHandler = fn; }) };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'cancelLogin') return cancelLogin;
      if (id === 'cancelRegister') return cancelRegister;
      return null;
    }),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn((ev, fn) => { if(ev==='DOMContentLoaded') ready = fn; })
  };
  global.window = { API_URL: 'http://api.test', location: { href: '' }, logToServer: jest.fn() };
  global.document = doc;
  global.fetch = jest.fn();
  global.alert = jest.fn();

  require('../public/js/auth.js');
  ready();
  loginHandler();
  expect(global.window.location.href).toBe('/');
  registerHandler();
  expect(global.window.location.href).toBe('/');
});

test('login success stores token and user', async () => {
  let handler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'loginForm': return loginForm;
        case 'loginEmail': return { value: 'user@example.com' };
        case 'loginPassword': return { value: 'secret' };
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
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({ token: 't' }) });
  const storeAuthToken = jest.fn();
  const storeUser = jest.fn();
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();
  global.storeAuthToken = storeAuthToken;
  global.storeUser = storeUser;

  jest.useFakeTimers();
  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  jest.runAllTimers();
  expect(storeAuthToken).toHaveBeenCalledWith('t');
  expect(storeUser).toHaveBeenCalledWith('user@example.com');
  expect(global.window.location.href).toBe('/console.html');
  jest.useRealTimers();
});

test('login handles invalid JSON without server logging', async () => {
  let handler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
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
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => { throw new Error('bad'); } });
  global.window = { API_URL: 'http://api.test', location: { href: '' } }; // no logToServer
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(global.console.error).toHaveBeenCalled();
});

test('register handles invalid JSON without server logging', async () => {
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
  const fetchMock = jest.fn().mockResolvedValue({ status: 201, json: () => { throw new Error('bad'); } });
  global.window = { API_URL: 'http://api.test', location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(global.console.error).toHaveBeenCalled();
});

test('login handles invalid JSON with server logging', async () => {
  let handler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const logToServerMock = jest.fn();
  const doc = {
    getElementById: jest.fn(id => {
      switch(id){
        case 'loginForm': return loginForm;
        case 'loginEmail': return { value: 'a@b.com' };
        case 'loginPassword': return { value: 'p' };
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
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => { throw new Error('bad json'); } });
  global.window = { API_URL: 'http://api.test', location: { href: '' }, logToServer: logToServerMock };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(global.console.error).toHaveBeenCalled();
  expect(logToServerMock).toHaveBeenCalledWith('Invalid JSON from login endpoint', expect.objectContaining({ level: 'error' }));
});

test('register handles invalid JSON with server logging', async () => {
  let handler;
  const registerForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const logToServerMock = jest.fn();
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
  const fetchMock = jest.fn().mockResolvedValue({ status: 201, json: () => { throw new Error('bad json'); } });
  global.window = { API_URL: 'http://api.test', location: { href: '' }, logToServer: logToServerMock };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(global.console.error).toHaveBeenCalled();
  expect(logToServerMock).toHaveBeenCalledWith('Invalid JSON from registration endpoint', expect.objectContaining({ level: 'error' }));
});

test('login handles network error with server logging', async () => {
  let handler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const logToServerMock = jest.fn();
  const doc = {
    getElementById: jest.fn(id => {
      switch(id){
        case 'loginForm': return loginForm;
        case 'loginEmail': return { value: 'a@b.com' };
        case 'loginPassword': return { value: 'p' };
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
  const fetchMock = jest.fn().mockRejectedValue(new Error('network fail'));
  global.window = { API_URL: 'http://api.test', location: { href: '' }, logToServer: logToServerMock };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(global.console.error).toHaveBeenCalled();
  expect(logToServerMock).toHaveBeenCalledWith('Network error during login', expect.objectContaining({ level: 'error' }));
});

test('register handles network error with server logging', async () => {
  let handler;
  const registerForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const logToServerMock = jest.fn();
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
  const fetchMock = jest.fn().mockRejectedValue(new Error('network fail'));
  global.window = { API_URL: 'http://api.test', location: { href: '' }, logToServer: logToServerMock };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(global.console.error).toHaveBeenCalled();
  expect(logToServerMock).toHaveBeenCalledWith('Network error during registration', expect.objectContaining({ level: 'error' }));
});

test('login shows default error when data.error is empty', async () => {
  let handler;
  const loginForm = { addEventListener: jest.fn((ev, fn) => { if (ev === 'submit') handler = fn; }) };
  const msgEl = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
  const doc = {
    getElementById: jest.fn(id => {
      switch(id){
        case 'loginForm': return loginForm;
        case 'loginEmail': return { value: 'a@b.com' };
        case 'loginPassword': return { value: 'p' };
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
  const fetchMock = jest.fn().mockResolvedValue({ ok: false, json: () => ({}) });
  global.window = { API_URL: 'http://api.test', location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(msgEl.textContent).toBe('Login failed.');
});

test('register shows default error when data.error is empty', async () => {
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
  const fetchMock = jest.fn().mockResolvedValue({ status: 400, json: () => ({}) });
  global.window = { API_URL: 'http://api.test', location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.alert = jest.fn();

  require('../public/js/auth.js');
  await handler({ preventDefault: () => {} });
  expect(msgEl.textContent).toBe('Registration failed.');
});
