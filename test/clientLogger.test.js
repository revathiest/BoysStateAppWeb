const path = require('path');
const fs = require('fs');
const vm = require('vm');
test('client logger posts console output', () => {
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test' };
  global.sessionStorage = { getItem: () => 'abc' };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  const helper = fs.readFileSync(path.join(__dirname, '../public/js/authHelper.js'), 'utf8');
  eval('var window = global.window; var sessionStorage = global.sessionStorage;\n' + helper);
  const logger = fs.readFileSync(path.join(__dirname, '../public/js/clientLogger.js'), 'utf8');
  eval('var window = global.window; var sessionStorage = global.sessionStorage;\n' + logger);
  console.log('hi');
  expect(fetchMock).toHaveBeenCalled();
  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api.test/logs');
  const body = JSON.parse(opts.body);
  expect(body.message).toContain('hi');
  expect(body.level).toBe('info');
  expect(opts.credentials).toBe('include');
  expect(opts.headers.Authorization).toBe('Bearer abc');
});

test('logger skips when API_URL missing', () => {
  jest.resetModules();
  const fetchMock = jest.fn();
  global.window = { };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.log('skip');
  expect(fetchMock).not.toHaveBeenCalled();
});



test('logger stringifies circular objects', () => {
  jest.resetModules();
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test' };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  const circ = {}; circ.self = circ;
  console.log(circ);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.message).toBe('[object Object]');
});

test('logger uses provided programId without auth headers', () => {
  jest.resetModules();
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test' }; // no getAuthHeaders
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  window.logToServer('msg', { programId: 'abc', level: 'warn' });
  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api.test/logs');
  const body = JSON.parse(opts.body);
  expect(body.programId).toBe('abc');
  expect(opts.headers.Authorization).toBeUndefined();
});

test('logger derives programId from window values', () => {
  jest.resetModules();
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test', programId: 'p1' };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.log('hi');
  let body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.programId).toBe('p1');

  jest.resetModules();
  const fetchMock2 = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test', selectedProgramId: 'p2' };
  global.fetch = fetchMock2;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.log('hi');
  body = JSON.parse(fetchMock2.mock.calls[0][1].body);
  expect(body.programId).toBe('p2');
});

test('logger stringifies plain objects', () => {
  jest.resetModules();
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test' };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.log({ foo: 'bar' });
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.message).toBe('{"foo":"bar"}');
});
