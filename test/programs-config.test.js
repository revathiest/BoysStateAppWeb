let funcs;

describe('programs-config.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { API_URL: 'http://api.test' };
    const link = { href: 'page?programId=YOUR_PROGRAM_ID' };
    const container = { innerHTML: '' };
    global.document = {
      getElementById: id => (id === 'program-selector' ? container : null),
      querySelectorAll: () => [link],
      addEventListener: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => 'u'), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    funcs = require('../public/js/programs-config.js');
    global.link = link;
    global.container = container;
  });

  test('getUsername reads storage', () => {
    expect(funcs.getUsername()).toBe('u');
  });

  test('renderProgramSelector renders single program', () => {
    funcs.renderProgramSelector([{ programId: 'p1', programName: 'Prog' }], 'p1');
    expect(global.container.innerHTML).toContain('Prog');
    expect(global.link.href).toBe('page?programId=p1');
  });
});

