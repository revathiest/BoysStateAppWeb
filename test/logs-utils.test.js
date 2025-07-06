const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('toISODateString converts local date to ISO', () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/logs.js'), 'utf8');
  const stubEl = { addEventListener: jest.fn(), classList: { remove: jest.fn(), add: jest.fn() }, innerHTML: '', appendChild: jest.fn() };
  const ctx = {
    window: {},
    document: {
      addEventListener: jest.fn(),
      getElementById: jest.fn(() => stubEl),
      querySelector: jest.fn(() => stubEl),
      querySelectorAll: jest.fn(() => [])
    },
    console: { log: () => {}, error: () => {} },
    fetch: jest.fn(),
    alert: jest.fn(),
    URLSearchParams,
    setTimeout
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  expect(ctx.toISODateString('2023-01-01')).toMatch(/^2023-01-01T00:00:00/);
  expect(ctx.toISODateString('2023-01-01', true)).toMatch(/^2023-01-01T23:59:59/);
});
