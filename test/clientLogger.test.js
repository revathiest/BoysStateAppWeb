const path = require('path');

test('client logger posts console output', () => {
  const fetchMock = jest.fn().mockResolvedValue({});
  const localStorage = { getItem: jest.fn().mockReturnValue('a.b.c') };
  global.window = { API_URL: 'http://api.test' };
  global.localStorage = localStorage;
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.log('hi');
  expect(fetchMock).toHaveBeenCalled();
  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api.test/logs');
  const body = JSON.parse(opts.body);
  expect(body.message).toContain('hi');
  expect(body.level).toBe('info');
  expect(opts.headers.Authorization).toBe('Bearer a.b.c');
});

test('logger respects missing token', () => {
  jest.resetModules();
  const fetchMock = jest.fn();
  global.window = { API_URL: 'http://api.test' };
  global.localStorage = { getItem: () => null };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.log('skip');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('logger reads programId from token', () => {
  jest.resetModules();
  const payload = Buffer.from(JSON.stringify({ programId: 'xyz' })).toString('base64');
  const token = `a.${payload}.c`;
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test' };
  global.localStorage = { getItem: () => token };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.warn('warn');
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.programId).toBe('xyz');
  expect(body.level).toBe('warn');
});

test('logger handles localStorage errors', () => {
  jest.resetModules();
  const fetchMock = jest.fn();
  global.window = { API_URL: 'http://api.test' };
  global.localStorage = { getItem: () => { throw new Error('fail'); } };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  console.log('x');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('logger stringifies circular objects', () => {
  jest.resetModules();
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test' };
  global.localStorage = { getItem: () => 'a.b.c' };
  global.fetch = fetchMock;
  global.console = { log: () => {}, warn: () => {}, error: () => {} };
  require('../public/js/clientLogger.js');
  const circ = {}; circ.self = circ;
  console.log(circ);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.message).toBe('[object Object]');
});
