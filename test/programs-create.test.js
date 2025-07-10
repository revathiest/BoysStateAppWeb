const fs = require("fs");
const path = require("path");
const vm = require("vm");
const code = fs.readFileSync(path.join(__dirname, "../public/js/programs-create.js"), "utf8");

beforeEach(() => {
  jest.resetModules();
});

test('program creation posts JSON with credentials', async () => {
  const form = {};
  const nameInput = { value: 'Test Program' };
  const yearInput = { value: '2024' };
  const createBtn = { disabled: false };
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return createBtn;
        case 'formError': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
      }
      return {};
    })
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
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'formSuccess': return successEl;
      }
      return {};
    })
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
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
      }
      return {};
    })
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
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
      }
      return {};
    })
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
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
      }
      return {};
    })
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
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return { classList: { add: jest.fn(), remove: jest.fn() }, innerHTML: '' };
      }
      return {};
    })
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
  const doc = {
    getElementById: jest.fn(id => {
      switch (id) {
        case 'createProgramForm': return form;
        case 'name': return nameInput;
        case 'year': return yearInput;
        case 'createBtn': return { disabled: false };
        case 'formError': return errorEl;
        case 'formSuccess': return successEl;
      }
      return {};
    })
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
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'formSuccess') return successEl;
      if (id === 'formError') return errorEl;
      return {};
    })
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
