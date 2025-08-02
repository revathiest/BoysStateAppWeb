const path = require('path');

describe('config.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = {};
  });

  test('sets API_URL on window', () => {
    require(path.join('..', 'public/js/config.js'));
    expect(global.window.API_URL).toBe('https://boysstateappservices.up.railway.app');
  });
});

