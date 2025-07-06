const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('console page loads programs with credentials', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/console.js'), 'utf8');
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
  const ctx = {
    window: { API_URL: 'http://api.test', logToServer: jest.fn(), location: { href: '' } },
    document,
    fetch: fetchMock,
    console: { log: jest.fn(), error: jest.fn() },
    alert: jest.fn()
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await ready();
  expect(fetchMock).toHaveBeenCalledWith('http://api.test/programs', { credentials: 'include' });
  expect(logoutBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
});
