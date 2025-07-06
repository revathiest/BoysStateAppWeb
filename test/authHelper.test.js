const { getAuthHeaders, clearAuthToken, storeAuthToken } = require('../public/js/authHelper.js');

describe('auth helper functions', () => {
  let storage;
  beforeEach(() => {
    storage = {};
    global.sessionStorage = {
      getItem: (k) => storage[k],
      setItem: (k, v) => { storage[k] = v; },
      removeItem: (k) => { delete storage[k]; }
    };
  });

  test('storeAuthToken sets token', () => {
    storeAuthToken('t');
    expect(sessionStorage.getItem('authToken')).toBe('t');
  });

  test('clearAuthToken removes token', () => {
    sessionStorage.setItem('authToken', 'x');
    clearAuthToken();
    expect(sessionStorage.getItem('authToken')).toBeUndefined();
  });

  test('getAuthHeaders with token', () => {
    sessionStorage.setItem('authToken', 'abc');
    expect(getAuthHeaders()).toEqual({ Authorization: 'Bearer abc' });
  });

  test('getAuthHeaders without token', () => {
    expect(getAuthHeaders()).toEqual({});
  });
});
