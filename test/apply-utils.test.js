const { getProgramId, fetchApplicationConfig, getApplicationParams } = require('../public/js/apply-utils.js');

describe('apply-utils', () => {
  afterEach(() => {
    delete global.window;
    delete global.fetch;
  });

  test('getProgramId returns value from query string', () => {
    global.window = { location: { search: '?programId=test123&foo=bar' } };
    expect(getProgramId()).toBe('test123');
  });

  test('getApplicationParams decodes token', () => {
    const token = Buffer.from(JSON.stringify({ year: '2024', type: 'delegate' })).toString('base64');
    global.window = { location: { search: `?programId=p1&token=${token}` } };
    expect(getApplicationParams()).toEqual({ programId: 'p1', year: '2024', type: 'delegate' });
  });

  test('fetchApplicationConfig returns JSON data', async () => {
    const data = { a: 1 };
    global.window = { API_URL: 'http://api.example' };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => data });
    const result = await fetchApplicationConfig('prog', '2024', 'delegate');
    expect(fetch).toHaveBeenCalledWith('http://api.example/api/programs/prog/application?year=2024&type=delegate', { method: 'GET' });
    expect(result).toEqual(data);
  });

  test('fetchApplicationConfig throws on failure', async () => {
    global.window = { API_URL: 'http://api.example' };
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    await expect(fetchApplicationConfig('prog', '2024', 'delegate')).rejects.toThrow('Could not load application configuration.');
  });

  test('getApplicationParams handles malformed token', () => {
    // Malformed token that can't be decoded as JSON
    global.window = { location: { search: '?programId=p1&token=invalidbase64!!!' } };
    const result = getApplicationParams();
    expect(result.programId).toBe('p1');
    // year and type should be undefined since token decode fails
    expect(result.year).toBeUndefined();
    expect(result.type).toBeUndefined();
  });

  test('getApplicationParams handles empty token', () => {
    global.window = { location: { search: '?programId=p1' } };
    const result = getApplicationParams();
    expect(result.programId).toBe('p1');
    expect(result.year).toBeUndefined();
    expect(result.type).toBeUndefined();
  });

  test('fetchApplicationConfig omits query params when year/type not provided', async () => {
    const data = { b: 2 };
    global.window = { API_URL: 'http://api.example' };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => data });
    const result = await fetchApplicationConfig('prog');
    // URL should NOT have query params
    expect(fetch).toHaveBeenCalledWith('http://api.example/api/programs/prog/application', { method: 'GET' });
    expect(result).toEqual(data);
  });
});
