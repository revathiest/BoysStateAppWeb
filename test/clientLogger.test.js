
test('client logger posts console output', () => {
  const fetchMock = jest.fn().mockResolvedValue({});
  global.window = { API_URL: 'http://api.test' };
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
  expect(opts.credentials).toBe('include');
  expect(opts.headers.Authorization).toBeUndefined();
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
