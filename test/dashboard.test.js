const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('dashboard fetches user programs', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/dashboard.js'), 'utf8');
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
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn() },
    document: doc,
    fetch: fetchMock,
    console: { log: jest.fn(), error: jest.fn() },
    alert: jest.fn()
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await ready();
  expect(fetchMock).toHaveBeenCalledWith('http://api.test/programs', expect.objectContaining({ credentials: 'include' }));
  expect(logoutBtn.addEventListener).toHaveBeenCalled();
});
