let funcs;

describe('programs-config.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { API_URL: 'http://api.test' };
    const link = { href: 'page?programId=YOUR_PROGRAM_ID' };
    const container = { innerHTML: '', addEventListener: jest.fn() };
    global.document = {
      getElementById: id => {
        if (id === 'program-selector') return container;
        if (id === 'program-select') return { addEventListener: jest.fn() };
        return null;
      },
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

  test('renderProgramSelector renders dropdown for multiple programs', () => {
    const linkA = { href: 'a?programId=YOUR_PROGRAM_ID' };
    const linkB = { href: 'b?programId=YOUR_PROGRAM_ID' };
    document.querySelectorAll = () => [linkA, linkB];
    funcs.renderProgramSelector([
      { programId: 'p1', programName: 'P1' },
      { programId: 'p2', programName: 'P2' }
    ], 'p2');
    expect(global.container.innerHTML).toContain('<select');
    expect(linkA.href).toBe('a?programId=p2');
  });

  test('fetchProgramsAndRenderSelector fetches and renders', async () => {
    global.localStorage.getItem = jest.fn(() => 'user');
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ programs: [{ programId: 'p1', programName: 'Prog1' }] })
    }));
    await funcs.fetchProgramsAndRenderSelector();
    expect(global.fetch).toHaveBeenCalled();
    expect(global.container.innerHTML).toContain('Prog1');
  });
});

