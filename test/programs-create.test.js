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
