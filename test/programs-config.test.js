let funcs;

describe('programs-config.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { API_URL: 'http://api.test' };
    const brandingLink = { href: '' };
    const groupingsLink = { href: '' };
    const partiesLink = { href: '' };
    const positionsLink = { href: '' };
    const staffLink = { href: '' };
    const parentsLink = { href: '' };
    const container = { innerHTML: '', addEventListener: jest.fn() };
    global.document = {
      getElementById: id => {
        if (id === 'program-selector') return container;
        if (id === 'program-select') return { addEventListener: jest.fn() };
        if (id === 'brandingLink') return brandingLink;
        if (id === 'groupingsLink') return groupingsLink;
        if (id === 'partiesLink') return partiesLink;
        if (id === 'positionsLink') return positionsLink;
        if (id === 'staffLink') return staffLink;
        if (id === 'parentsLink') return parentsLink;
        if (id === 'years-list') return { innerHTML: '' };
        if (id === 'current-program-id') return { value: 'p1' };
        return null;
      },
      querySelectorAll: () => [],
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => 'u'), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    funcs = require('../public/js/programs-config.js');
    global.brandingLink = brandingLink;
    global.container = container;
  });

  test('getUsername reads storage', () => {
    expect(funcs.getUsername()).toBe('u');
  });

  test('renderProgramSelector renders single program', () => {
    funcs.renderProgramSelector([{ programId: 'p1', programName: 'Prog' }], 'p1');
    expect(global.container.innerHTML).toContain('Prog');
    expect(global.brandingLink.href).toBe('branding-contact.html?programId=p1');
  });

  test('renderProgramSelector renders dropdown for multiple programs', () => {
    funcs.renderProgramSelector([
      { programId: 'p1', programName: 'P1' },
      { programId: 'p2', programName: 'P2' }
    ], 'p2');
    expect(global.container.innerHTML).toContain('<select');
    expect(global.brandingLink.href).toBe('branding-contact.html?programId=p2');
  });

  test('renderProgramSelector handles no programs', () => {
    funcs.renderProgramSelector([], null);
    expect(global.container.innerHTML).toContain('No programs found');
  });

  test('updateConfigLinks updates hrefs', () => {
    funcs.updateConfigLinks('xyz');
    expect(global.brandingLink.href).toBe('branding-contact.html?programId=xyz');
    expect(global.window.selectedProgramId).toBe('xyz');
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

  test('getUsername falls back to sessionStorage', () => {
    global.localStorage.getItem = jest.fn(() => null);
    global.sessionStorage.getItem = jest.fn(() => 'sess');
    expect(funcs.getUsername()).toBe('sess');
  });

  test('fetchProgramsAndRenderSelector shows message when no user', async () => {
    global.localStorage.getItem = jest.fn(() => null);
    await funcs.fetchProgramsAndRenderSelector();
    expect(global.container.innerHTML).toContain('No user found');
  });

  test('fetchProgramsAndRenderSelector handles errors', async () => {
    global.localStorage.getItem = jest.fn(() => 'user');
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.reject(new Error('fail')));
    await funcs.fetchProgramsAndRenderSelector();
    expect(global.container.innerHTML).toContain('Error loading programs');
  });
});

