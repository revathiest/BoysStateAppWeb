beforeEach(() => {
  jest.resetModules();
});

test('fetchLogs uses credentials include', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: () => ({ logs: [], total:0, page:1, pageSize:50 }) });
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
      return { value: 'test', addEventListener: jest.fn() };
    }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = document;
  global.fetch = fetchMock;
  global.console = { log: () => {} };
  global.alert = jest.fn();

  const mod = require('../public/js/logs.js');
  await mod.fetchLogs({ programId: 'test' });
  const opts = fetchMock.mock.calls[0][1];
  expect(opts.credentials).toBe('include');
});

test('loadPrograms fetches user programs', async () => {
  const fetchMock = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: () => ({ programs: [{ id: '1', name: 'A' }, { id: '2', name: 'B' }] })
  });
  const document = {
    getElementById: jest.fn(id => {
      if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
      if (id === 'programId') return { innerHTML: '', appendChild: jest.fn(), addEventListener: jest.fn() };
      return { value: 'test', addEventListener: jest.fn() };
    }),
    querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({}))
  };
  global.window = { API_URL: 'http://api.test', logToServer: jest.fn() };
  global.document = document;
  global.fetch = fetchMock;
  global.console = { log: () => {} };
  global.alert = jest.fn();

  const mod = require('../public/js/logs.js');
  await mod.loadPrograms();
  expect(fetchMock).toHaveBeenCalledWith(
    'http://api.test/programs',
    expect.objectContaining({ credentials: 'include' })
  );
});
