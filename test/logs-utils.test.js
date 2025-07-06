beforeEach(() => {
  jest.resetModules();
});

test('toISODateString converts local date to ISO', () => {
  const stubEl = { addEventListener: jest.fn(), classList: { remove: jest.fn(), add: jest.fn() }, innerHTML: '', appendChild: jest.fn() };
  global.window = {};
  global.document = {
    addEventListener: jest.fn(),
    getElementById: jest.fn(() => stubEl),
    querySelector: jest.fn(() => stubEl),
    querySelectorAll: jest.fn(() => [])
  };
  global.console = { log: () => {}, error: () => {} };
  global.fetch = jest.fn();
  global.alert = jest.fn();

  const mod = require('../public/js/logs.js');

  const expectedStart = new Date('2023-01-01T00:00:00').toISOString();
  const expectedEnd = new Date('2023-01-01T23:59:59').toISOString();

  expect(mod.toISODateString('2023-01-01')).toBe(expectedStart);
  expect(mod.toISODateString('2023-01-01', true)).toBe(expectedEnd);
});

test('toISODateString handles undefined and ISO input', () => {
  jest.resetModules();
  global.window = {};
  global.document = {
    getElementById: jest.fn(() => ({ addEventListener: jest.fn() })),
    querySelector: jest.fn(() => ({ })),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn()
  };
  const mod = require('../public/js/logs.js');
  expect(mod.toISODateString(undefined)).toBeUndefined();
  expect(mod.toISODateString('2023-01-01T10:00:00')).toBe('2023-01-01T10:00:00');
});
