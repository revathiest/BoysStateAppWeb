const fs = require("fs");
const path = require("path");
const vm = require("vm");
const code = fs.readFileSync(path.join(__dirname, "../public/js/programs-create.js"), "utf8");

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('program creation posts JSON with credentials', async () => {
  const form = {};
  const nameInput = { value: 'Test Program' };
  const yearInput = { value: '2024' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return createBtn;
        case 'formError': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 201, json: () => ({ id: 1, name: 'Test Program', year: 2024 }) });
  const ctx = { window: { API_URL: 'http://api.test' }, sessionStorage: { getItem: () => 'abc' }, document: doc, fetch: fetchMock, console: { error: jest.fn() } };
  vm.createContext(ctx);
  const helper = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  vm.runInContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n' + helper, ctx);
  vm.runInContext(code, ctx);
  await form.onsubmit({ preventDefault: () => {} });
  expect(fetchMock).toHaveBeenCalledWith(
    'http://api.test/programs',
    expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({ Authorization: 'Bearer abc' })
    })
  );
});

test('program creation success clears fields', async () => {
  const form = {};
  const nameInput = { value: 'X' };
  const yearInput = { value: '2024' };
  const successEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'formSuccess': return successEl;
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 201, json: () => ({ id: 1, name: 'X', year: 2024 }) });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.fetch = fetchMock;
  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });
  expect(successEl.innerHTML).toContain('Program created');
  expect(nameInput.value).toBe('');
  expect(yearInput.value).toBe('');
});

test('program creation uses auth headers when provided', async () => {
  const form = {};
  const nameInput = { value: 'N' };
  const yearInput = { value: '2024' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 400, json: () => ({ error: 'bad' }) });
  const headersFn = jest.fn(() => ({ Authorization: 'Bearer t' }));
  global.window = { API_URL: 'http://api.test' };
  global.getAuthHeaders = headersFn;
  global.document = doc;
  global.fetch = fetchMock;
  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });
  expect(headersFn).toHaveBeenCalled();
});

test('program creation validates required fields', async () => {
  const form = {};
  const nameInput = { value: '' };
  const yearInput = { value: '' };
  const errorEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.fetch = jest.fn();
  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });
  expect(errorEl.innerHTML).toContain('required');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('program creation validates numeric year', async () => {
  const form = {};
  const nameInput = { value: 'Name' };
  const yearInput = { value: 'abcd' };
  const errorEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.fetch = jest.fn();
  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });
  expect(errorEl.innerHTML).toContain('Year must');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('program creation shows server error', async () => {
  const form = {};
  const nameInput = { value: 'P' };
  const yearInput = { value: '2024' };
  const errorEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 400, json: () => ({ error: 'bad' }) });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.fetch = fetchMock;
  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });
  expect(errorEl.innerHTML).toContain('bad');
});

test('program creation handles network error', async () => {
  const form = {};
  const nameInput = { value: 'N' };
  const yearInput = { value: '2024' };
  const successEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const errorEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return successEl;
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('fail'));
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.fetch = fetchMock;
  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });
  expect(errorEl.innerHTML).toContain('Network');
});

test('showSuccess and showError modify DOM', () => {
  const successEl = { classList: { remove: jest.fn() }, innerHTML: '' };
  const errorEl = { classList: { remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'formSuccess') return successEl;
      if (id === 'formError') return errorEl;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn()
  };
  const ctx = { window: { API_URL: 'http://api.test' }, document: doc };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  ctx.showSuccess('yay');
  expect(successEl.innerHTML).toBe('yay');
  expect(successEl.classList.remove).toHaveBeenCalledWith('hidden');
  ctx.showError('bad');
  expect(errorEl.innerHTML).toBe('bad');
  expect(errorEl.classList.remove).toHaveBeenCalledWith('hidden');
});

test('checkExistingPrograms shows message when user has programs', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ programId: 'p1', programName: 'Existing Program' }] })
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.getAuthHeaders = () => ({ Authorization: 'Bearer token' });

  require('../public/js/programs-create.js');
  domContentLoadedHandler();

  // Wait for async checkExistingPrograms to complete
  await fetchMock.mock.results[0].value;
  await Promise.resolve();

  expect(form.innerHTML).toContain('You already have a program');
  expect(form.innerHTML).toContain('Existing Program');
});

test('checkExistingPrograms uses name fallback when programName not present', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [{ id: 'p1', name: 'Legacy Name' }] })
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.getAuthHeaders = () => ({});

  require('../public/js/programs-create.js');
  domContentLoadedHandler();

  // Wait for async checkExistingPrograms to complete
  await fetchMock.mock.results[0].value;
  await Promise.resolve();

  expect(form.innerHTML).toContain('Legacy Name');
});

test('checkExistingPrograms disables button when no username', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const errorEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'formError') return errorEl;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => null };
  global.localStorage = { getItem: () => null };
  global.console = { error: jest.fn() };

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  expect(createBtn.disabled).toBe(true);
  expect(errorEl.innerHTML).toContain('Unable to determine');
});

test('checkExistingPrograms handles fetch error gracefully', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('Network error'));
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  // Should log error but not disable form
  expect(global.console.error).toHaveBeenCalled();
  expect(createBtn.disabled).toBe(false);
});

test('checkExistingPrograms uses localStorage as username fallback', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [] })
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => null };
  global.localStorage = { getItem: () => 'localuser' };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('localuser'),
    expect.any(Object)
  );
});

test('checkExistingPrograms handles non-ok response', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: false
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  // Should not show "already have program" message
  expect(form.innerHTML).not.toContain('You already have a program');
});

test('DOMContentLoaded sets up logout button handler', async () => {
  let domContentLoadedHandler;
  let logoutClickHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = {
    addEventListener: jest.fn((event, handler) => {
      if (event === 'click') logoutClickHandler = handler;
    })
  };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [] })
  });
  global.window = { API_URL: 'http://api.test', location: { href: '' } };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.clearAuthToken = jest.fn();

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  // Trigger logout
  expect(logoutClickHandler).toBeDefined();
  logoutClickHandler();
  expect(global.clearAuthToken).toHaveBeenCalled();
  expect(global.window.location.href).toBe('login.html');
});

test('logout works when clearAuthToken is not defined', async () => {
  let domContentLoadedHandler;
  let logoutClickHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = {
    addEventListener: jest.fn((event, handler) => {
      if (event === 'click') logoutClickHandler = handler;
    })
  };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [] })
  });
  global.window = { API_URL: 'http://api.test', location: { href: '' } };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  // clearAuthToken not defined

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  // Should not throw when clearAuthToken is undefined
  logoutClickHandler();
  expect(global.window.location.href).toBe('login.html');
});

test('DOMContentLoaded handles missing logoutBtn', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return null;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [] })
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };

  require('../public/js/programs-create.js');
  // Should not throw
  await domContentLoadedHandler();
  expect(doc.getElementById).toHaveBeenCalledWith('logoutBtn');
});

test('successful program creation redirects after timeout', async () => {
  const form = {};
  const nameInput = { value: 'Test' };
  const yearInput = { value: '2024' };
  const successEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'formSuccess': return successEl;
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 201, json: () => ({ id: 1, name: 'Test', year: 2024 }) });
  global.window = { API_URL: 'http://api.test', location: { href: '' } };
  global.document = doc;
  global.fetch = fetchMock;
  global.setTimeout = jest.fn((cb) => cb());

  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });

  expect(global.setTimeout).toHaveBeenCalled();
  expect(global.window.location.href).toBe('console.html');
});

test('program creation shows default error when no error message', async () => {
  const form = {};
  const nameInput = { value: 'P' };
  const yearInput = { value: '2024' };
  const errorEl = { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'logoutBtn': return logoutBtn;
      }
      return {};
    }),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ status: 400, json: () => ({}) });  // No error message
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.fetch = fetchMock;
  require('../public/js/programs-create.js');
  await form.onsubmit({ preventDefault: () => {} });
  expect(errorEl.innerHTML).toContain('Failed to create program');
});

test('checkExistingPrograms uses getAuthHeaders when available', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [] })
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };
  global.getAuthHeaders = jest.fn(() => ({ Authorization: 'Bearer token' }));

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  expect(global.getAuthHeaders).toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: { Authorization: 'Bearer token' }
    })
  );
});

test('checkExistingPrograms handles empty programs array', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ programs: [] })
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  // Form should remain as-is (not replaced with "already have program" message)
  expect(form.innerHTML).toBe('');
});

test('checkExistingPrograms handles missing programs field in response', async () => {
  let domContentLoadedHandler;
  const form = { innerHTML: '' };
  const createBtn = { disabled: false };
  const logoutBtn = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'createProgramForm') return form;
      if (id === 'createBtn') return createBtn;
      if (id === 'logoutBtn') return logoutBtn;
      return {};
    }),
    addEventListener: jest.fn((event, handler) => {
      if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
    })
  };
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({})  // No programs field
  });
  global.window = { API_URL: 'http://api.test' };
  global.document = doc;
  global.sessionStorage = { getItem: () => 'testuser' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { error: jest.fn() };

  require('../public/js/programs-create.js');
  await domContentLoadedHandler();

  // Should default to empty array and not show message
  expect(form.innerHTML).not.toContain('You already have a program');
});
