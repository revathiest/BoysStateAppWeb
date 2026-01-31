const fs = require('fs');
const path = require('path');
const vm = require('vm');
const code = fs.readFileSync(path.join(__dirname, '../public/js/programs-config.js'), 'utf8');

let funcs;

describe('programs-config.js', () => {
  let brandingLink, groupingsLink, partiesLink, positionsLink, staffLink, parentsLink, container;
  let yearsList, applicationConfigLink, yearConfigLink;

  beforeEach(() => {
    jest.resetModules();
    global.window = { API_URL: 'http://api.test' };
    brandingLink = { href: '' };
    groupingsLink = { href: '' };
    partiesLink = { href: '' };
    positionsLink = { href: '' };
    staffLink = { href: '' };
    parentsLink = { href: '' };
    applicationConfigLink = { href: '' };
    yearConfigLink = { href: '' };
    container = { innerHTML: '', addEventListener: jest.fn() };
    yearsList = { innerHTML: '' };
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
        if (id === 'applicationConfigLink') return applicationConfigLink;
        if (id === 'year-config-link') return yearConfigLink;
        if (id === 'years-list') return yearsList;
        if (id === 'current-program-id') return { value: 'p1' };
        return null;
      },
      querySelectorAll: () => [],
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => 'u'), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.console = { log: jest.fn(), error: jest.fn() };
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

  test('renderProgramSelector uses name fallback for single program', () => {
    // Test program with 'name' instead of 'programName' and 'id' instead of 'programId'
    funcs.renderProgramSelector([{ id: 'prog-id', name: 'Legacy Name' }], 'prog-id');
    expect(global.container.innerHTML).toContain('Legacy Name');
    expect(global.brandingLink.href).toBe('branding-contact.html?programId=prog-id');
  });

  test('renderProgramSelector uses name/id fallbacks for multiple programs', () => {
    funcs.renderProgramSelector([
      { id: 'p1', name: 'Name1' },
      { id: 'p2', name: 'Name2' }
    ], 'p2');
    expect(global.container.innerHTML).toContain('Name1');
    expect(global.container.innerHTML).toContain('Name2');
    expect(global.container.innerHTML).toContain('selected');
  });

  test('renderProgramSelector falls back to first program when selectedProgramId is null', () => {
    let programSelect = { addEventListener: jest.fn() };
    global.document.getElementById = id => {
      if (id === 'program-selector') return container;
      if (id === 'program-select') return programSelect;
      if (id === 'brandingLink') return brandingLink;
      if (id === 'groupingsLink') return groupingsLink;
      if (id === 'partiesLink') return partiesLink;
      if (id === 'positionsLink') return positionsLink;
      if (id === 'applicationConfigLink') return applicationConfigLink;
      if (id === 'year-config-link') return yearConfigLink;
      if (id === 'years-list') return yearsList;
      return null;
    };
    funcs.renderProgramSelector([
      { programId: 'p1', programName: 'P1' },
      { programId: 'p2', programName: 'P2' }
    ], null);  // No selected program
    expect(brandingLink.href).toBe('branding-contact.html?programId=p1');
  });

  test('updateConfigLinks updates all link types', () => {
    funcs.updateConfigLinks('test-prog');
    expect(brandingLink.href).toBe('branding-contact.html?programId=test-prog');
    expect(applicationConfigLink.href).toBe('application-config.html?programId=test-prog');
    expect(partiesLink.href).toBe('programs-parties.html?programId=test-prog');
    expect(yearConfigLink.href).toBe('programs-year-config.html?programId=test-prog');
    expect(groupingsLink.href).toBe('programs-groupings.html?programId=test-prog');
    expect(positionsLink.href).toBe('programs-positions.html?programId=test-prog');
  });

  test('updateConfigLinks does nothing with empty programId', () => {
    brandingLink.href = 'original';
    funcs.updateConfigLinks('');
    expect(brandingLink.href).toBe('original');
  });

  test('updateConfigLinks does nothing with null programId', () => {
    brandingLink.href = 'original';
    funcs.updateConfigLinks(null);
    expect(brandingLink.href).toBe('original');
  });

  test('updateConfigLinks handles missing link elements', () => {
    // Set up document to return null for all links
    global.document.getElementById = id => {
      if (id === 'years-list') return yearsList;
      return null;  // All links missing
    };
    // Should not throw
    funcs.updateConfigLinks('test-prog');
    expect(global.window.selectedProgramId).toBe('test-prog');
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

  test('fetchProgramsAndRenderSelector handles non-ok response', async () => {
    global.localStorage.getItem = jest.fn(() => 'user');
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    await funcs.fetchProgramsAndRenderSelector();
    expect(global.container.innerHTML).toContain('Error loading programs');
  });

  test('fetchProgramsAndRenderSelector corrects stale localStorage', async () => {
    const setItemMock = jest.fn();
    global.localStorage = {
      getItem: jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'stale-program-id';
        return null;
      }),
      setItem: setItemMock
    };
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ programs: [{ programId: 'actual-program', programName: 'Actual' }] })
    }));
    await funcs.fetchProgramsAndRenderSelector();
    // Should update localStorage with the actual program since stale one doesn't exist
    expect(setItemMock).toHaveBeenCalledWith('lastSelectedProgramId', 'actual-program');
  });

  test('fetchProgramsAndRenderSelector keeps valid localStorage', async () => {
    const setItemMock = jest.fn();
    global.localStorage = {
      getItem: jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'valid-program';
        return null;
      }),
      setItem: setItemMock
    };
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ programs: [
        { programId: 'valid-program', programName: 'Valid' },
        { programId: 'other-program', programName: 'Other' }
      ]})
    }));
    await funcs.fetchProgramsAndRenderSelector();
    // Should NOT update localStorage since valid-program exists in the list
    expect(setItemMock).not.toHaveBeenCalledWith('lastSelectedProgramId', expect.anything());
  });

  test('loadProgramYears shows empty state when no years', async () => {
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    }));
    await funcs.loadProgramYears('p1');
    expect(yearsList.innerHTML).toContain('No years configured');
  });

  test('loadProgramYears renders single year', async () => {
    global.localStorage.getItem = jest.fn(() => null);
    global.localStorage.setItem = jest.fn();
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ year: 2024 }])
    }));
    await funcs.loadProgramYears('p1');
    expect(yearsList.innerHTML).toContain('2024');
    expect(yearsList.innerHTML).toContain('Current Year');
  });

  test('loadProgramYears renders dropdown for multiple years', async () => {
    const yearSelector = { addEventListener: jest.fn() };
    global.document.getElementById = id => {
      if (id === 'years-list') return yearsList;
      if (id === 'year-selector') return yearSelector;
      return null;
    };
    global.localStorage.getItem = jest.fn(key => {
      if (key === 'selectedYear_p1') return '2024';
      return null;
    });
    global.localStorage.setItem = jest.fn();
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ year: 2024 }, { year: 2025 }])
    }));
    await funcs.loadProgramYears('p1');
    expect(yearsList.innerHTML).toContain('<select');
    expect(yearsList.innerHTML).toContain('2024');
    expect(yearsList.innerHTML).toContain('2025');
  });

  test('loadProgramYears handles fetch error', async () => {
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    await funcs.loadProgramYears('p1');
    expect(yearsList.innerHTML).toContain('Failed to load years');
  });

  test('loadProgramYears handles non-ok response', async () => {
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    await funcs.loadProgramYears('p1');
    expect(yearsList.innerHTML).toContain('Failed to load years');
  });

  test('loadProgramYears does nothing without programId', async () => {
    global.fetch = jest.fn();
    await funcs.loadProgramYears(null);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('loadProgramYears does nothing without years-list element', async () => {
    global.document.getElementById = () => null;
    global.fetch = jest.fn();
    await funcs.loadProgramYears('p1');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('getSelectedYear returns stored year', () => {
    global.localStorage.getItem = jest.fn(key => {
      if (key === 'lastSelectedProgramId') return 'prog1';
      if (key === 'selectedYear_prog1') return '2024';
      return null;
    });
    expect(funcs.getSelectedYear('prog1')).toBe(2024);
  });

  test('getSelectedYear uses window.selectedProgramId as fallback', () => {
    global.window.selectedProgramId = 'fallback-prog';
    global.localStorage.getItem = jest.fn(key => {
      if (key === 'selectedYear_fallback-prog') return '2025';
      return null;
    });
    expect(funcs.getSelectedYear()).toBe(2025);
  });

  test('getSelectedYear uses lastSelectedProgramId as second fallback', () => {
    global.window.selectedProgramId = undefined;
    global.localStorage.getItem = jest.fn(key => {
      if (key === 'lastSelectedProgramId') return 'stored-prog';
      if (key === 'selectedYear_stored-prog') return '2023';
      return null;
    });
    expect(funcs.getSelectedYear()).toBe(2023);
  });

  test('getSelectedYear returns null when no programId available', () => {
    global.window.selectedProgramId = undefined;
    global.localStorage.getItem = jest.fn(() => null);
    expect(funcs.getSelectedYear()).toBeNull();
  });

  test('program-select change handler updates config links', () => {
    let changeHandler;
    const programSelect = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'change') changeHandler = handler;
      })
    };
    global.document.getElementById = id => {
      if (id === 'program-selector') return container;
      if (id === 'program-select') return programSelect;
      if (id === 'brandingLink') return brandingLink;
      if (id === 'groupingsLink') return groupingsLink;
      if (id === 'partiesLink') return partiesLink;
      if (id === 'positionsLink') return positionsLink;
      if (id === 'applicationConfigLink') return applicationConfigLink;
      if (id === 'year-config-link') return yearConfigLink;
      if (id === 'years-list') return yearsList;
      return null;
    };

    funcs.renderProgramSelector([
      { programId: 'p1', programName: 'P1' },
      { programId: 'p2', programName: 'P2' }
    ], 'p1');

    // Simulate change event
    expect(changeHandler).toBeDefined();
    changeHandler({ target: { value: 'p2' } });
    expect(brandingLink.href).toBe('branding-contact.html?programId=p2');
  });

  test('program-selector change handler updates localStorage', async () => {
    let containerChangeHandler;
    const setItemMock = jest.fn();
    container.addEventListener = jest.fn((event, handler) => {
      if (event === 'change') containerChangeHandler = handler;
    });
    global.localStorage = {
      getItem: jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'p1';
        return null;
      }),
      setItem: setItemMock
    };
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ programs: [{ programId: 'p1', programName: 'Prog1' }] })
    }));

    await funcs.fetchProgramsAndRenderSelector();

    // Simulate change event on program-selector container
    expect(containerChangeHandler).toBeDefined();
    containerChangeHandler({ target: { value: 'new-prog' } });
    expect(setItemMock).toHaveBeenCalledWith('lastSelectedProgramId', 'new-prog');
  });

  test('year-selector change handler updates localStorage and dispatches event', async () => {
    let yearChangeHandler;
    const yearSelector = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'change') yearChangeHandler = handler;
      })
    };
    const dispatchEventMock = jest.fn();
    global.document = {
      ...global.document,
      getElementById: id => {
        if (id === 'years-list') return yearsList;
        if (id === 'year-selector') return yearSelector;
        return null;
      },
      dispatchEvent: dispatchEventMock
    };
    const setItemMock = jest.fn();
    global.localStorage = {
      getItem: jest.fn(key => {
        if (key === 'selectedYear_p1') return '2024';
        return null;
      }),
      setItem: setItemMock
    };
    global.getAuthHeaders = () => ({});
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ year: 2024 }, { year: 2025 }])
    }));

    await funcs.loadProgramYears('p1');

    // Simulate year change
    expect(yearChangeHandler).toBeDefined();
    yearChangeHandler({ target: { value: '2025' } });
    expect(setItemMock).toHaveBeenCalledWith('selectedYear_p1', '2025');
    expect(global.window.selectedYear).toBe(2025);
    expect(dispatchEventMock).toHaveBeenCalled();
  });
});

describe('programs-config.js DOMContentLoaded and year management (require-based)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('DOMContentLoaded sets up logout button and calls init functions', async () => {
    let domContentLoadedHandler;
    let logoutClickHandler;
    const logoutBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') logoutClickHandler = handler;
      })
    };
    const container = { innerHTML: '', addEventListener: jest.fn() };
    const yearsList = { innerHTML: '' };

    global.window = { API_URL: 'http://api.test', location: { href: '' } };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return logoutBtn;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return yearsList;
        if (id === 'add-year-btn') return null;
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.reject(new Error('no user')));
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});
    global.clearAuthToken = jest.fn();

    require('../public/js/programs-config.js');

    expect(domContentLoadedHandler).toBeDefined();
    await domContentLoadedHandler();

    // Trigger logout click
    expect(logoutClickHandler).toBeDefined();
    logoutClickHandler();
    expect(global.clearAuthToken).toHaveBeenCalled();
    expect(global.window.location.href).toBe('login.html');
  });

  test('DOMContentLoaded handles missing logoutBtn', async () => {
    let domContentLoadedHandler;
    const container = { innerHTML: '', addEventListener: jest.fn() };

    global.window = { API_URL: 'http://api.test', location: { href: '' } };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return null;
        if (id === 'add-year-btn') return null;
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.reject(new Error('no user')));
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');

    // Should not throw when logoutBtn is missing
    await domContentLoadedHandler();
    expect(global.document.getElementById).toHaveBeenCalledWith('logoutBtn');
  });

  test('setupYearManagement sets up add/save/cancel button handlers', async () => {
    let domContentLoadedHandler;
    let addYearClickHandler;
    let saveYearClickHandler;
    let cancelYearClickHandler;
    let yearInputKeyHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '2025',
      focus: jest.fn(),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'keypress') yearInputKeyHandler = handler;
      })
    };
    const addYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') addYearClickHandler = handler;
      })
    };
    const saveYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') saveYearClickHandler = handler;
      }),
      click: jest.fn()
    };
    const cancelYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') cancelYearClickHandler = handler;
      })
    };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const copyCheckbox = { checked: false };
    const container = { innerHTML: '', addEventListener: jest.fn() };
    const yearsList = { innerHTML: '' };

    global.window = { API_URL: 'http://api.test', location: { href: '' }, selectedProgramId: 'prog1' };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return yearsList;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        if (id === 'copy-from-previous-checkbox') return copyCheckbox;
        if (id === 'current-program-id') return { value: 'prog1' };
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.reject(new Error('no user')));
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Test add year button shows form
    expect(addYearClickHandler).toBeDefined();
    addYearClickHandler();
    expect(addYearForm.classList.toggle).toHaveBeenCalledWith('hidden');
    expect(newYearInput.focus).toHaveBeenCalled();

    // Test cancel button hides form
    expect(cancelYearClickHandler).toBeDefined();
    cancelYearClickHandler();
    expect(addYearForm.classList.add).toHaveBeenCalledWith('hidden');
    expect(newYearInput.value).toBe('');

    // Test Enter key triggers save
    expect(yearInputKeyHandler).toBeDefined();
    const preventDefaultMock = jest.fn();
    yearInputKeyHandler({ key: 'Enter', preventDefault: preventDefaultMock });
    expect(preventDefaultMock).toHaveBeenCalled();
    expect(saveYearBtn.click).toHaveBeenCalled();
  });

  test('saveNewYear shows error when year is empty', async () => {
    let domContentLoadedHandler;
    let saveYearClickHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '',  // Empty year
      focus: jest.fn(),
      addEventListener: jest.fn()
    };
    const addYearBtn = { addEventListener: jest.fn() };
    const saveYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') saveYearClickHandler = handler;
      })
    };
    const cancelYearBtn = { addEventListener: jest.fn() };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const container = { innerHTML: '', addEventListener: jest.fn() };

    global.window = { API_URL: 'http://api.test', location: { href: '' }, selectedProgramId: null };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return null;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        if (id === 'current-program-id') return null;
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.reject(new Error('no user')));
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Click save with empty year
    saveYearClickHandler();
    expect(yearFormStatus.textContent).toBe('Please enter a valid year');
    expect(yearFormStatus.classList.add).toHaveBeenCalledWith('text-red-600');
  });

  test('saveNewYear calls API and reloads years on success', async () => {
    let domContentLoadedHandler;
    let saveYearClickHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '2025',
      focus: jest.fn(),
      addEventListener: jest.fn()
    };
    const addYearBtn = { addEventListener: jest.fn() };
    const saveYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') saveYearClickHandler = handler;
      })
    };
    const cancelYearBtn = { addEventListener: jest.fn() };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const copyCheckbox = { checked: false };
    const container = { innerHTML: '', addEventListener: jest.fn() };
    const yearsList = { innerHTML: '' };

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false })  // First call for fetchProgramsAndRenderSelector
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })  // saveNewYear POST
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ year: 2025 }]) });  // loadProgramYears reload

    global.window = { API_URL: 'http://api.test', location: { href: '' }, selectedProgramId: 'prog1' };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return yearsList;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        if (id === 'copy-from-previous-checkbox') return copyCheckbox;
        if (id === 'current-program-id') return { value: 'prog1' };
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(key => key === 'user' ? 'testuser' : null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = fetchMock;
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Click save
    await saveYearClickHandler();

    // Wait for async operations
    await new Promise(r => setTimeout(r, 50));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/programs/prog1/years'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('saveNewYear handles API error', async () => {
    let domContentLoadedHandler;
    let saveYearClickHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '2025',
      focus: jest.fn(),
      addEventListener: jest.fn()
    };
    const addYearBtn = { addEventListener: jest.fn() };
    const saveYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') saveYearClickHandler = handler;
      })
    };
    const cancelYearBtn = { addEventListener: jest.fn() };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const copyCheckbox = { checked: true };  // Test with copy checkbox checked
    const container = { innerHTML: '', addEventListener: jest.fn() };
    const yearsList = { innerHTML: '' };

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false })  // fetchProgramsAndRenderSelector
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Year already exists' })
      });

    global.window = { API_URL: 'http://api.test', location: { href: '' }, selectedProgramId: 'prog1' };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return yearsList;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        if (id === 'copy-from-previous-checkbox') return copyCheckbox;
        if (id === 'current-program-id') return { value: 'prog1' };
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(key => key === 'user' ? 'testuser' : null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = fetchMock;
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Click save
    await saveYearClickHandler();

    // Wait for async operations
    await new Promise(r => setTimeout(r, 50));

    expect(yearFormStatus.textContent).toBe('Year already exists');
    expect(yearFormStatus.classList.add).toHaveBeenCalledWith('text-red-600');
  });

  test('logout button works when clearAuthToken is not defined', async () => {
    let domContentLoadedHandler;
    let logoutClickHandler;
    const logoutBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') logoutClickHandler = handler;
      })
    };
    const container = { innerHTML: '', addEventListener: jest.fn() };

    global.window = { API_URL: 'http://api.test', location: { href: '' } };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return logoutBtn;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return null;
        if (id === 'add-year-btn') return null;
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.reject(new Error('no user')));
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});
    // clearAuthToken intentionally not defined

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Trigger logout click - should not throw even without clearAuthToken
    logoutClickHandler();
    expect(global.window.location.href).toBe('login.html');
  });

  test('saveNewYear with copyFromPreviousYear shows correct success message', async () => {
    let domContentLoadedHandler;
    let saveYearClickHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '2025',
      focus: jest.fn(),
      addEventListener: jest.fn()
    };
    const addYearBtn = { addEventListener: jest.fn() };
    const saveYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') saveYearClickHandler = handler;
      })
    };
    const cancelYearBtn = { addEventListener: jest.fn() };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const copyCheckbox = { checked: true };  // Copy from previous year
    const container = { innerHTML: '', addEventListener: jest.fn() };
    const yearsList = { innerHTML: '' };

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false })  // fetchProgramsAndRenderSelector
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })  // saveNewYear POST
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ year: 2025 }]) });  // loadProgramYears reload

    global.window = { API_URL: 'http://api.test', location: { href: '' }, selectedProgramId: 'prog1' };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return yearsList;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        if (id === 'copy-from-previous-checkbox') return copyCheckbox;
        if (id === 'current-program-id') return { value: 'prog1' };
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(key => key === 'user' ? 'testuser' : null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = fetchMock;
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Click save
    await saveYearClickHandler();

    // Wait for async operations
    await new Promise(r => setTimeout(r, 50));

    expect(yearFormStatus.textContent).toBe('Year added successfully! Copied configuration from previous year.');
    expect(yearFormStatus.classList.add).toHaveBeenCalledWith('text-green-700');
  });

  test('saveNewYear catches error without message property', async () => {
    let domContentLoadedHandler;
    let saveYearClickHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '2025',
      focus: jest.fn(),
      addEventListener: jest.fn()
    };
    const addYearBtn = { addEventListener: jest.fn() };
    const saveYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') saveYearClickHandler = handler;
      })
    };
    const cancelYearBtn = { addEventListener: jest.fn() };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const copyCheckbox = { checked: false };
    const container = { innerHTML: '', addEventListener: jest.fn() };
    const yearsList = { innerHTML: '' };

    // Fetch throws an error without a message property
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false })  // fetchProgramsAndRenderSelector
      .mockRejectedValueOnce({});  // saveNewYear throws error without message

    global.window = { API_URL: 'http://api.test', location: { href: '' }, selectedProgramId: 'prog1' };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return yearsList;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        if (id === 'copy-from-previous-checkbox') return copyCheckbox;
        if (id === 'current-program-id') return { value: 'prog1' };
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(key => key === 'user' ? 'testuser' : null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = fetchMock;
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Click save
    await saveYearClickHandler();

    // Wait for async operations
    await new Promise(r => setTimeout(r, 50));

    expect(yearFormStatus.textContent).toBe('Failed to create year');
    expect(yearFormStatus.classList.add).toHaveBeenCalledWith('text-red-600');
  });

  test('cancelYearBtn handles missing copy checkbox', async () => {
    let domContentLoadedHandler;
    let cancelYearClickHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '2025',
      focus: jest.fn(),
      addEventListener: jest.fn()
    };
    const addYearBtn = { addEventListener: jest.fn() };
    const saveYearBtn = { addEventListener: jest.fn() };
    const cancelYearBtn = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'click') cancelYearClickHandler = handler;
      })
    };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const container = { innerHTML: '', addEventListener: jest.fn() };

    global.window = { API_URL: 'http://api.test', location: { href: '' } };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return null;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        if (id === 'copy-from-previous-checkbox') return null;  // Missing checkbox
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.reject(new Error('no user')));
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Click cancel - should not throw even without copy checkbox
    cancelYearClickHandler();
    expect(addYearForm.classList.add).toHaveBeenCalledWith('hidden');
  });

  test('Enter key on non-Enter key does nothing', async () => {
    let domContentLoadedHandler;
    let yearInputKeyHandler;

    const addYearForm = { classList: { toggle: jest.fn(), add: jest.fn() } };
    const newYearInput = {
      value: '2025',
      focus: jest.fn(),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'keypress') yearInputKeyHandler = handler;
      })
    };
    const addYearBtn = { addEventListener: jest.fn() };
    const saveYearBtn = {
      addEventListener: jest.fn(),
      click: jest.fn()
    };
    const cancelYearBtn = { addEventListener: jest.fn() };
    const yearFormStatus = { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' };
    const container = { innerHTML: '', addEventListener: jest.fn() };

    global.window = { API_URL: 'http://api.test', location: { href: '' }, selectedProgramId: 'prog1' };
    global.document = {
      getElementById: jest.fn(id => {
        if (id === 'logoutBtn') return null;
        if (id === 'program-selector') return container;
        if (id === 'years-list') return null;
        if (id === 'add-year-btn') return addYearBtn;
        if (id === 'add-year-form') return addYearForm;
        if (id === 'save-year-btn') return saveYearBtn;
        if (id === 'cancel-year-btn') return cancelYearBtn;
        if (id === 'new-year-input') return newYearInput;
        if (id === 'year-form-status') return yearFormStatus;
        return null;
      }),
      addEventListener: jest.fn((event, handler) => {
        if (event === 'DOMContentLoaded') domContentLoadedHandler = handler;
      }),
      dispatchEvent: jest.fn()
    };
    global.localStorage = { getItem: jest.fn(() => null), setItem: jest.fn() };
    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.reject(new Error('no user')));
    global.console = { log: jest.fn(), error: jest.fn() };
    global.getAuthHeaders = () => ({});

    require('../public/js/programs-config.js');
    await domContentLoadedHandler();

    // Press a different key
    const preventDefaultMock = jest.fn();
    yearInputKeyHandler({ key: 'a', preventDefault: preventDefaultMock });

    // Should not trigger save
    expect(preventDefaultMock).not.toHaveBeenCalled();
    expect(saveYearBtn.click).not.toHaveBeenCalled();
  });
});
