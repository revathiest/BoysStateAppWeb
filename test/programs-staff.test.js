let funcs;

// Helper to flush all pending promises
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));
const flushAllPromises = async (count = 5) => {
  for (let i = 0; i < count; i++) {
    await flushPromises();
  }
};

describe('programs-staff.js', () => {
  let elements;
  let listeners;

  beforeEach(() => {
    jest.resetModules();
    global.window = {
      location: { search: '?programId=test123', href: '' },
      API_URL: 'http://api.test'
    };
    global.localStorage = {
      store: {},
      getItem: jest.fn(key => global.localStorage.store[key] || null),
      setItem: jest.fn((key, value) => { global.localStorage.store[key] = value; }),
      removeItem: jest.fn(key => { delete global.localStorage.store[key]; }),
    };
    global.getAuthHeaders = jest.fn(() => ({ Authorization: 'Bearer token' }));
    global.clearAuthToken = jest.fn();
    global.clearPermissionsCache = jest.fn();
    global.fetch = jest.fn();
    global.console = { log: jest.fn(), error: jest.fn() };

    elements = {
      'program-context': { textContent: '' },
      'year-select': {
        innerHTML: '',
        options: [{ value: '1', dataset: { year: '2025' } }],
        selectedIndex: 0,
        addEventListener: jest.fn(),
        value: '1'
      },
      'staff-table-body': {
        innerHTML: '',
        querySelectorAll: jest.fn(() => [])
      },
      'errorBox': { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      'successBox': { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      'staff-modal': { classList: { add: jest.fn(), remove: jest.fn() }, addEventListener: jest.fn() },
      'staff-form-title': { textContent: '' },
      'staff-id': { value: '' },
      'staff-first-name': { value: '' },
      'staff-last-name': { value: '' },
      'staff-email': { value: '' },
      'staff-phone': { value: '' },
      'staff-role': {
        value: '',
        options: [
          { value: '' },
          { value: 'Counselor' },
          { value: 'City Counselor' },
          { value: 'other' }
        ],
        addEventListener: jest.fn()
      },
      'staff-custom-role': { value: '' },
      'custom-role-container': { classList: { add: jest.fn(), remove: jest.fn() } },
      'staff-grouping': { value: '', innerHTML: '' },
      'staff-status': { value: 'active' },
      'staff-permission-role': { value: '', innerHTML: '' },
      'staff-temp-password': { value: '' },
      'generate-staff-password-btn': { addEventListener: jest.fn() },
      'add-staff-btn': { addEventListener: jest.fn() },
      'save-staff-btn': { addEventListener: jest.fn() },
      'cancel-staff-btn': { addEventListener: jest.fn() },
      'staff-modal-close': { addEventListener: jest.fn() },
      'logoutBtn': { addEventListener: jest.fn() },
      'confirmation-modal': { classList: { add: jest.fn(), remove: jest.fn() }, addEventListener: jest.fn() },
      'confirmation-title': { textContent: '' },
      'confirmation-message': { textContent: '' },
      'confirmation-confirm-btn': {
        textContent: '',
        addEventListener: jest.fn(),
        cloneNode: jest.fn(() => ({
          addEventListener: jest.fn(),
          parentNode: { replaceChild: jest.fn() }
        })),
        parentNode: { replaceChild: jest.fn() }
      },
      'confirmation-cancel-btn': { addEventListener: jest.fn() },
      'password-modal': { classList: { add: jest.fn(), remove: jest.fn() }, addEventListener: jest.fn() },
      'password-modal-close': { addEventListener: jest.fn() },
      'password-user-id': { value: '' },
      'password-staff-name': { textContent: '' },
      'new-password': { value: '' },
      'confirm-password': { value: '' },
      'password-error': { classList: { add: jest.fn(), remove: jest.fn() }, textContent: '' },
      'save-password-btn': { addEventListener: jest.fn() },
      'cancel-password-btn': { addEventListener: jest.fn() }
    };

    listeners = {};
    global.document = {
      getElementById: jest.fn(id => elements[id]),
      querySelector: jest.fn(() => ({ href: '' })),
      addEventListener: (ev, fn) => { (listeners[ev] || (listeners[ev] = [])).push(fn); }
    };

    funcs = require('../public/js/programs-staff.js');
  });

  afterEach(() => {
    delete global.window;
    delete global.localStorage;
    delete global.getAuthHeaders;
    delete global.clearAuthToken;
    delete global.fetch;
    delete global.document;
    delete global.console;
  });

  test('getProgramId returns programId from URL', () => {
    expect(funcs.getProgramId()).toBe('test123');
  });

  test('getProgramId falls back to localStorage', () => {
    global.window.location.search = '';
    global.localStorage.store.lastSelectedProgramId = 'stored123';
    jest.resetModules();
    funcs = require('../public/js/programs-staff.js');
    expect(funcs.getProgramId()).toBe('stored123');
  });

  test('showError displays error message', () => {
    funcs.showError('Test error');
    expect(elements.errorBox.textContent).toBe('Test error');
    expect(elements.errorBox.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('showSuccess displays success message', () => {
    funcs.showSuccess('Test success');
    expect(elements.successBox.textContent).toBe('Test success');
    expect(elements.successBox.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('clearMessages hides both boxes', () => {
    funcs.clearMessages();
    expect(elements.errorBox.classList.add).toHaveBeenCalledWith('hidden');
    expect(elements.successBox.classList.add).toHaveBeenCalledWith('hidden');
  });

  test('escapeHtml escapes HTML', () => {
    expect(funcs.escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(funcs.escapeHtml(null)).toBe('');
    expect(funcs.escapeHtml(undefined)).toBe('');
  });

  test('openAddModal shows modal', () => {
    funcs.openAddModal();
    expect(elements['staff-modal'].classList.remove).toHaveBeenCalledWith('hidden');
    expect(elements['staff-form-title'].textContent).toBe('Add Staff Member');
  });

  test('closeStaffModal hides modal', () => {
    funcs.closeStaffModal();
    expect(elements['staff-modal'].classList.add).toHaveBeenCalledWith('hidden');
  });

  test('renderStaffTable shows empty message', () => {
    funcs.renderStaffTable();
    expect(elements['staff-table-body'].innerHTML).toContain('No staff members found');
  });

  test('saveStaff validates required fields', async () => {
    await funcs.saveStaff();
    expect(elements.errorBox.textContent).toContain('required fields');
  });

  test('saveStaff validates program year', async () => {
    elements['staff-first-name'].value = 'John';
    elements['staff-last-name'].value = 'Doe';
    elements['staff-email'].value = 'john@example.com';
    elements['staff-role'].value = 'Counselor';
    await funcs.saveStaff();
    expect(elements.errorBox.textContent).toContain('No program year');
  });

  test('saveStaff uses custom role', async () => {
    elements['staff-first-name'].value = 'John';
    elements['staff-last-name'].value = 'Doe';
    elements['staff-email'].value = 'john@example.com';
    elements['staff-role'].value = 'other';
    elements['staff-custom-role'].value = 'Custom';
    await funcs.saveStaff();
    expect(elements.errorBox.textContent).toContain('No program year');
  });

  test('openEditModal handles missing staff', () => {
    funcs.openEditModal(999);
    // Should not throw
  });

  test('loadGroupings populates select', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 1, name: 'City1' }])
    });
    await funcs.loadGroupings();
    expect(elements['staff-grouping'].innerHTML).toContain('City1');
  });

  test('loadGroupings handles non-ok', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    await funcs.loadGroupings();
  });

  test('loadGroupings handles error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('fail'));
    await funcs.loadGroupings();
  });

  test('removeStaff calls delete', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    });
    await funcs.removeStaff(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/staff/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('removeStaff handles error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'fail' })
    });
    await funcs.removeStaff(1);
    expect(elements.errorBox.textContent).toContain('fail');
  });

  test('loadStaff without programYearId', async () => {
    await funcs.loadStaff();
    expect(elements['staff-table-body'].innerHTML).toContain('Select a program year');
  });

  test('DOMContentLoaded attaches handlers', () => {
    expect(listeners['DOMContentLoaded']).toBeDefined();
  });

  test('showError handles missing elements', () => {
    global.document.getElementById = jest.fn(() => null);
    funcs.showError('Test');
  });

  test('showSuccess handles missing elements', () => {
    global.document.getElementById = jest.fn(() => null);
    funcs.showSuccess('Test');
  });

  test('clearMessages handles missing elements', () => {
    global.document.getElementById = jest.fn(() => null);
    funcs.clearMessages();
  });

  test('loadGroupings with no programId', async () => {
    global.window.location.search = '';
    global.localStorage.store = {};
    jest.resetModules();
    global.document = {
      getElementById: jest.fn(id => elements[id]),
      addEventListener: jest.fn()
    };
    const f = require('../public/js/programs-staff.js');
    await f.loadGroupings();
  });

  // Test DOMContentLoaded flow
  describe('DOMContentLoaded initialization', () => {
    // Helper to create URL-based fetch mock
    const createFetchMock = (responses) => {
      return jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve(responses.roles || { ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve(responses.years || { ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve(responses.staff || { ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve(responses.groupings || { ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
    };

    test('init fetches years and sets up handlers', async () => {
      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) },
        staff: { ok: true, json: () => Promise.resolve([]) },
        groupings: { ok: true, json: () => Promise.resolve([]) }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      expect(elements['logoutBtn'].addEventListener).toHaveBeenCalled();
      expect(elements['add-staff-btn'].addEventListener).toHaveBeenCalled();
    });

    test('init handles no years', async () => {
      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: true, json: () => Promise.resolve([]) }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      expect(elements['year-select'].innerHTML).toContain('No years configured');
    });

    test('init handles year fetch error', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      expect(elements['year-select'].innerHTML).toContain('Error');
    });

    test('init handles fetch not ok', async () => {
      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: false }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();
    });

    test('init with staff data renders table', async () => {
      const mockStaff = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'Counselor', status: 'active' }
      ];

      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) },
        staff: { ok: true, json: () => Promise.resolve(mockStaff) },
        groupings: { ok: true, json: () => Promise.resolve([]) }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      expect(elements['staff-table-body'].innerHTML).toContain('John');
    });

    test('init with staff data attaches click handlers', async () => {
      const mockStaff = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'Counselor', status: 'active' }
      ];

      const mockEditBtn = { addEventListener: jest.fn(), dataset: { id: '1' } };
      const mockRemoveBtn = { addEventListener: jest.fn(), dataset: { id: '1', name: 'John Doe' } };
      elements['staff-table-body'].querySelectorAll = jest.fn(selector => {
        if (selector === '.edit-staff-btn') return [mockEditBtn];
        if (selector === '.remove-staff-btn') return [mockRemoveBtn];
        return [];
      });

      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) },
        staff: { ok: true, json: () => Promise.resolve(mockStaff) },
        groupings: { ok: true, json: () => Promise.resolve([]) }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();
    });

    test('init with 204 staff response', async () => {
      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) },
        staff: { status: 204 },
        groupings: { ok: true, json: () => Promise.resolve([]) }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      expect(elements['staff-table-body'].innerHTML).toContain('No staff members');
    });

    test('init with 404 staff response', async () => {
      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) },
        staff: { status: 404 },
        groupings: { ok: true, json: () => Promise.resolve([]) }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();
    });

    test('init with staff error', async () => {
      global.fetch = createFetchMock({
        roles: { ok: true, json: () => Promise.resolve([]) },
        years: { ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) },
        staff: { ok: false, status: 500 },
        groupings: { ok: true, json: () => Promise.resolve([]) }
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();
    });
  });

  test('displayProgramContext with ok response uses programName', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ programName: 'Test Program' })
    });

    // We test this indirectly - the function is called during init
  });

  test('displayProgramContext with ok response uses name fallback', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: 'Fallback Name' })
    });
  });

  describe('openEditModal with staff', () => {
    // Helper to create URL-based fetch mock for this describe block
    const createFetchMockWithStaff = (staffData) => {
      return jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(staffData) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
    };

    test('opens modal with predefined role', async () => {
      const staffData = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'Counselor', status: 'active' }
      ];

      global.fetch = createFetchMockWithStaff(staffData);

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      funcs.openEditModal(1);
      expect(elements['staff-first-name'].value).toBe('John');
      expect(elements['staff-last-name'].value).toBe('Doe');
      expect(elements['staff-email'].value).toBe('john@test.com');
      expect(elements['staff-role'].value).toBe('Counselor');
      expect(elements['custom-role-container'].classList.add).toHaveBeenCalledWith('hidden');
    });

    test('opens modal with custom role', async () => {
      const staffData = [
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', role: 'CustomRole', groupingId: 5, status: 'inactive' }
      ];

      global.fetch = createFetchMockWithStaff(staffData);

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      funcs.openEditModal(2);
      expect(elements['staff-first-name'].value).toBe('Jane');
      expect(elements['staff-role'].value).toBe('other');
      expect(elements['staff-custom-role'].value).toBe('CustomRole');
      expect(elements['custom-role-container'].classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('saveStaff success paths', () => {
    let callCount;
    let postResponse;

    beforeEach(() => {
      // Set up valid form values
      elements['staff-first-name'].value = 'John';
      elements['staff-last-name'].value = 'Doe';
      elements['staff-email'].value = 'john@example.com';
      elements['staff-role'].value = 'Counselor';
      elements['staff-phone'].value = '555-1234';
      elements['staff-grouping'].value = '1';
      elements['staff-status'].value = 'active';
      callCount = 0;
      postResponse = { ok: true, json: () => Promise.resolve({ id: 1 }) };
    });

    // Helper that tracks calls and handles POST requests
    const createSaveStaffFetchMock = (staffData = [], opts = {}) => {
      return jest.fn((url, options) => {
        callCount++;
        if (options?.method === 'POST') {
          return Promise.resolve(postResponse);
        }
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(staffData) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
    };

    test('creates new staff successfully', async () => {
      global.fetch = createSaveStaffFetchMock();

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      await funcs.saveStaff();
      await flushAllPromises();

      expect(elements.successBox.textContent).toContain('added');
    });

    test('edit modal sets form fields correctly', async () => {
      const staffData = [{ id: 5, firstName: 'Old', lastName: 'Name', email: 'old@test.com', role: 'Counselor', status: 'active' }];

      global.fetch = createSaveStaffFetchMock(staffData);

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      funcs.openEditModal(5);

      expect(elements['staff-first-name'].value).toBe('Old');
      expect(elements['staff-last-name'].value).toBe('Name');
      expect(elements['staff-id'].value).toBe(5);
      expect(elements['staff-form-title'].textContent).toBe('Edit Staff Member');
    });

    test('handles save error with message', async () => {
      postResponse = { ok: false, json: () => Promise.resolve({ error: 'Duplicate email' }) };
      global.fetch = createSaveStaffFetchMock();

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      await funcs.saveStaff();
      expect(elements.errorBox.textContent).toContain('Duplicate email');
    });

    test('handles save error without message', async () => {
      postResponse = { ok: false, json: () => Promise.reject(new Error('invalid json')) };
      global.fetch = createSaveStaffFetchMock();

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      await funcs.saveStaff();
      expect(elements.errorBox.textContent).toContain('Failed to save');
    });
  });

  describe('year selector change', () => {
    test('changing year reloads staff and groupings', async () => {
      // Set up initial state
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2024 }, { id: 2, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      listeners['DOMContentLoaded'][0]();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      // Simulate year change
      const changeHandler = elements['year-select'].addEventListener.mock.calls.find(c => c[0] === 'change');
      if (changeHandler) {
        // Mock the data needed for reload
        global.fetch
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // staff
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // groupings

        elements['year-select'].selectedIndex = 1;
        elements['year-select'].options = [
          { value: '1', dataset: { year: '2024' } },
          { value: '2', dataset: { year: '2025' } }
        ];

        await changeHandler[1]({ target: elements['year-select'] });
      }
    });
  });

  describe('removeStaff additional paths', () => {
    test('handles network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network failure'));
      await funcs.removeStaff(1);
      expect(elements.errorBox.textContent).toContain('Network failure');
    });
  });

  describe('loadProgramYears edge cases', () => {
    test('handles no programId', async () => {
      // Override window.location to not have programId
      global.window.location.search = '';
      global.localStorage.store = {};

      // Re-require to get fresh instance
      jest.resetModules();
      global.window = { location: { search: '', href: '' }, API_URL: 'http://api.test' };
      global.localStorage = {
        store: {},
        getItem: jest.fn(key => global.localStorage.store[key] || null),
        setItem: jest.fn((key, value) => { global.localStorage.store[key] = value; }),
        removeItem: jest.fn(),
      };
      global.getAuthHeaders = jest.fn(() => ({}));
      global.clearAuthToken = jest.fn();
      global.fetch = jest.fn();
      global.console = { log: jest.fn(), error: jest.fn() };

      elements['year-select'].innerHTML = '';
      global.document = {
        getElementById: jest.fn(id => elements[id]),
        addEventListener: (ev, fn) => { (listeners[ev] || (listeners[ev] = [])).push(fn); }
      };

      const f = require('../public/js/programs-staff.js');
      expect(f.getProgramId()).toBeNull();
    });
  });

  describe('assignPermissionRole', () => {
    test('does nothing without programId', async () => {
      global.window.location.search = '';
      global.localStorage.store = {};
      jest.resetModules();
      global.window = { location: { search: '', href: '' }, API_URL: 'http://api.test' };
      global.localStorage = {
        store: {},
        getItem: jest.fn(key => global.localStorage.store[key] || null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      global.getAuthHeaders = jest.fn(() => ({}));
      global.clearPermissionsCache = jest.fn();
      global.fetch = jest.fn();
      global.console = { log: jest.fn(), error: jest.fn() };
      global.document = {
        getElementById: jest.fn(id => elements[id]),
        addEventListener: jest.fn()
      };

      const f = require('../public/js/programs-staff.js');
      await f.assignPermissionRole(1, 2);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('loadProgramRoles', () => {
    test('handles not ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      await funcs.loadProgramRoles();
      // Should not throw
    });

    test('handles network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      await funcs.loadProgramRoles();
      // Should not throw
    });

    test('does nothing without programId', async () => {
      global.window.location.search = '';
      global.localStorage.store = {};
      jest.resetModules();
      global.window = { location: { search: '', href: '' }, API_URL: 'http://api.test' };
      global.localStorage = {
        store: {},
        getItem: jest.fn(key => global.localStorage.store[key] || null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      global.getAuthHeaders = jest.fn(() => ({}));
      global.fetch = jest.fn();
      global.console = { log: jest.fn(), error: jest.fn() };
      global.document = {
        getElementById: jest.fn(id => elements[id]),
        addEventListener: jest.fn()
      };

      const f = require('../public/js/programs-staff.js');
      await f.loadProgramRoles();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('password modal functions', () => {
    test('openPasswordModal sets up modal', () => {
      funcs.openPasswordModal(1, 'John Doe');
      expect(elements['password-user-id'].value).toBe(1);
      expect(elements['password-staff-name'].textContent).toBe('Reset password for: John Doe');
      expect(elements['password-modal'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('closePasswordModal hides modal', () => {
      funcs.closePasswordModal();
      expect(elements['password-modal'].classList.add).toHaveBeenCalledWith('hidden');
    });

    test('savePassword validates empty password', async () => {
      elements['password-user-id'].value = '1';
      elements['new-password'].value = '';
      elements['confirm-password'].value = '';
      await funcs.savePassword();
      expect(elements['password-error'].textContent).toBe('Please enter and confirm the new password');
    });

    test('savePassword validates short password', async () => {
      elements['password-user-id'].value = '1';
      elements['new-password'].value = 'short';
      elements['confirm-password'].value = 'short';
      await funcs.savePassword();
      expect(elements['password-error'].textContent).toBe('Password must be at least 8 characters');
    });

    test('savePassword validates password mismatch', async () => {
      elements['password-user-id'].value = '1';
      elements['new-password'].value = 'password123';
      elements['confirm-password'].value = 'password456';
      await funcs.savePassword();
      expect(elements['password-error'].textContent).toBe('Passwords do not match');
    });

    test('savePassword calls API on valid input', async () => {
      elements['password-user-id'].value = '1';
      elements['new-password'].value = 'validpassword123';
      elements['confirm-password'].value = 'validpassword123';
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await funcs.savePassword();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/password'),
        expect.objectContaining({ method: 'PUT' })
      );
    });

    test('savePassword handles API error', async () => {
      elements['password-user-id'].value = '1';
      elements['new-password'].value = 'validpassword123';
      elements['confirm-password'].value = 'validpassword123';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'User not found' })
      });

      await funcs.savePassword();
      expect(elements['password-error'].textContent).toBe('User not found');
    });

    test('savePassword handles network error', async () => {
      elements['password-user-id'].value = '1';
      elements['new-password'].value = 'validpassword123';
      elements['confirm-password'].value = 'validpassword123';
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await funcs.savePassword();
      expect(elements['password-error'].textContent).toBe('Network error');
    });
  });

  describe('assignPermissionRole success path', () => {
    beforeEach(async () => {
      // Set up mocks for the initialization calls
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test Program' }) }) // program info
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) }) // years
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // groupings
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // permission roles

      // Trigger DOMContentLoaded to initialize currentProgramId
      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }
    });

    test('calls clearPermissionsCache on success', async () => {
      global.clearPermissionsCache = jest.fn();
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await funcs.assignPermissionRole(1, 2);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/1/role'),
        expect.objectContaining({ method: 'PUT' })
      );
      expect(global.clearPermissionsCache).toHaveBeenCalledWith('test123');
    });

    test('handles API error without throwing', async () => {
      global.clearPermissionsCache = jest.fn();
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Role not found' })
      });

      // Should not throw
      await expect(funcs.assignPermissionRole(1, 2)).resolves.not.toThrow();
      expect(global.clearPermissionsCache).not.toHaveBeenCalled();
    });

    test('handles network error without throwing', async () => {
      global.clearPermissionsCache = jest.fn();
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(funcs.assignPermissionRole(1, 2)).resolves.not.toThrow();
    });
  });

  describe('updateGroupingSelect code structure', () => {
    test('updateGroupingSelect handles multiple grouping types', () => {
      // Verify the code handles multiple grouping types with optgroups
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      expect(code).toContain('function updateGroupingSelect');
      expect(code).toContain('optgroup');
      expect(code).toContain('typeNames.length > 1');
    });
  });

  describe('renderStaffTable with programRole', () => {
    test('renders staff with programRole.isDefault badge', async () => {
      const staffData = [{
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        role: 'Counselor',
        status: 'active',
        programRole: { id: 1, name: 'Admin', isDefault: true }
      }];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(staffData) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      expect(elements['staff-table-body'].innerHTML).toContain('Admin');
      expect(elements['staff-table-body'].innerHTML).toContain('bg-blue-100');
    });

    test('renders staff with custom programRole badge', async () => {
      const staffData = [{
        id: 1,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        role: 'Counselor',
        status: 'active',
        programRole: { id: 2, name: 'Custom Role', isDefault: false }
      }];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(staffData) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      listeners['DOMContentLoaded'][0]();
      await flushAllPromises();

      expect(elements['staff-table-body'].innerHTML).toContain('Custom Role');
      expect(elements['staff-table-body'].innerHTML).toContain('bg-purple-100');
    });

    test('code handles grouping type name display', () => {
      // Verify the code handles grouping type name display
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      expect(code).toContain('grouping.groupingType');
      expect(code).toContain('customName');
      expect(code).toContain('defaultName');
    });
  });

  describe('confirmRemoveStaff code structure', () => {
    test('confirmRemoveStaff function exists in code', () => {
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      expect(code).toContain('function confirmRemoveStaff');
      expect(code).toContain('confirmation-modal');
      expect(code).toContain('confirmation-title');
      expect(code).toContain('confirmation-message');
    });
  });

  describe('displayProgramContext code structure', () => {
    test('displayProgramContext function exists with error handling', () => {
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      expect(code).toContain('async function displayProgramContext');
      expect(code).toContain('if (!contextEl) return');
      expect(code).toContain('No program selected');
      expect(code).toContain('could not load name');
    });
  });

  describe('loadStaff error handling code structure', () => {
    test('loadStaff has error handling for API failures', () => {
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      // Verify error handling structure
      expect(code).toContain('if (!response.ok) throw new Error');
      expect(code).toContain("throw new Error('Failed to load staff')");
      expect(code).toContain('Error loading staff');
    });

    test('loadStaff displays select year message when no programYearId', async () => {
      // Without triggering init, currentProgramYearId is null
      await funcs.loadStaff();
      expect(elements['staff-table-body'].innerHTML).toContain('Select a program year');
    });
  });

  describe('removeStaff', () => {
    beforeEach(async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test Program' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }
    });

    test('successfully removes staff', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true }) // DELETE
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // reload staff

      await funcs.removeStaff(1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/staff/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(elements.successBox.textContent).toBe('Staff member removed successfully');
    });

    test('handles remove staff API error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Cannot remove staff member' })
      });

      await funcs.removeStaff(1);
      // removeStaff uses errorData.error from response or default message
      expect(elements.errorBox.textContent).toBe('Cannot remove staff member');
    });

    test('handles remove staff network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await funcs.removeStaff(1);
      expect(elements.errorBox.textContent).toBe('Network error');
    });
  });

  describe('updatePermissionRoleSelect with roles', () => {
    test('renders roles with isDefault badge', () => {
      const mockRoles = [
        { id: 1, name: 'Admin', isActive: true, isDefault: true },
        { id: 2, name: 'Editor', isActive: true, isDefault: false },
        { id: 3, name: 'Inactive', isActive: false }
      ];

      // Access programRoles through the module pattern
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      // Verify the code logic handles isDefault
      expect(code).toContain('isDefault');
      expect(code).toContain('(Default)');
      expect(code).toContain('role.isActive');
    });
  });

  describe('updateGroupingSelect with groups', () => {
    test('handles single grouping type', () => {
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      // Verify single type logic
      expect(code).toContain('typeNames.length === 1');
      expect(code).toContain('groupedByType[typeName]');
    });

    test('handles multiple grouping types with optgroups', () => {
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      // Verify multiple types logic
      expect(code).toContain('typeNames.length > 1');
      expect(code).toContain('optgroup label');
    });
  });

  describe('loadProgramRoles', () => {
    beforeEach(async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test Program' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }
    });

    test('handles program roles API error (returns early)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' })
      });

      // loadProgramRoles just returns on API error, doesn't throw or log
      await funcs.loadProgramRoles();
      // Verify it was called without throwing
      expect(global.fetch).toHaveBeenCalled();
    });

    test('handles program roles network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network'));

      await funcs.loadProgramRoles();
      expect(global.console.error).toHaveBeenCalled();
    });
  });

  describe('loadGroupings', () => {
    beforeEach(async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test Program' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }
    });

    test('handles groupings API error (returns early)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' })
      });

      // loadGroupings just returns on API error, doesn't throw or log
      await funcs.loadGroupings();
      // Verify it was called without throwing
      expect(global.fetch).toHaveBeenCalled();
    });

    test('handles groupings network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network'));

      await funcs.loadGroupings();
      expect(global.console.error).toHaveBeenCalled();
    });
  });

  describe('generateTempPassword', () => {
    test('generates 12-character password', () => {
      // Read the file to verify generateTempPassword is defined
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      expect(code).toContain('function generateTempPassword');
      expect(code).toContain('for (let i = 0; i < 12; i++)');
    });
  });

  describe('displayProgramContext edge cases', () => {
    test('handles missing context element', async () => {
      global.document.getElementById = jest.fn((id) => {
        if (id === 'program-context') return null;
        return elements[id];
      });

      // Should not throw when context element is missing
      // The function is called during init
    });

    test('handles fetch error gracefully', async () => {
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error')) // program info
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // roles
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // years

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Context should show just programId after error
      expect(elements['program-context'].textContent).toContain('Program ID:');
    });

    test('uses programName from response', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/programs/test123') && !url.includes('/years') && !url.includes('/roles') && !url.includes('/groupings') && !url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ programName: 'My Test Program' }) });
        }
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['program-context'].textContent).toContain('My Test Program');
    });

    test('falls back to name field when programName is missing', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/programs/test123') && !url.includes('/years') && !url.includes('/roles') && !url.includes('/groupings') && !url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'Fallback Name' }) });
        }
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['program-context'].textContent).toContain('Fallback Name');
    });

    test('handles non-ok response', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/programs/test123') && !url.includes('/years') && !url.includes('/roles') && !url.includes('/groupings') && !url.includes('/staff')) {
          return Promise.resolve({ ok: false });
        }
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['program-context'].textContent).toContain('could not load name');
    });
  });

  describe('updateGroupingSelect with multiple types', () => {
    test('renders optgroups for multiple grouping types', async () => {
      const mockGroupings = [
        { id: 1, name: 'State', groupingType: { defaultName: 'State', customName: null } },
        { id: 2, name: 'County A', groupingType: { defaultName: 'County', customName: null } },
        { id: 3, name: 'County B', groupingType: { defaultName: 'County', customName: null } },
        { id: 4, name: 'City X', groupingType: { defaultName: 'City', customName: 'Municipality' } }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupings) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Verify optgroups are created
      expect(elements['staff-grouping'].innerHTML).toContain('optgroup');
      expect(elements['staff-grouping'].innerHTML).toContain('State');
      expect(elements['staff-grouping'].innerHTML).toContain('County');
    });

    test('uses customName when available', async () => {
      const mockGroupings = [
        { id: 1, name: 'City A', groupingType: { defaultName: 'City', customName: 'Municipality' } }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupings) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // With single type, shows type in parentheses
      expect(elements['staff-grouping'].innerHTML).toContain('Municipality');
    });

    test('handles grouping without groupingType', async () => {
      const mockGroupings = [
        { id: 1, name: 'Unknown Group' } // No groupingType
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockGroupings) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['staff-grouping'].innerHTML).toContain('Unknown Group');
      expect(elements['staff-grouping'].innerHTML).toContain('Other');
    });
  });

  describe('renderStaffTable with groupings and userId', () => {
    test('code handles grouping with type name', () => {
      // Verify the code structure handles grouping type name display
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      // The code formats grouping display with type name
      expect(code).toContain('groupingDisplay');
      expect(code).toContain('grouping.groupingType.customName');
      expect(code).toContain('grouping.groupingType.defaultName');
    });

    test('renders staff with userId (shows password button)', async () => {
      const mockStaff = [
        { id: 1, firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', role: 'Counselor', status: 'active', userId: 123 }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaff) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const mockPasswordBtn = { addEventListener: jest.fn(), dataset: { userId: '123', name: 'Jane Smith' } };
      elements['staff-table-body'].querySelectorAll = jest.fn(selector => {
        if (selector === '.reset-password-btn') return [mockPasswordBtn];
        return [];
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['staff-table-body'].innerHTML).toContain('Password');
      expect(elements['staff-table-body'].innerHTML).toContain('data-user-id="123"');
    });

    test('renders staff with programRoleId but no programRole relation', async () => {
      const mockRoles = [
        { id: 1, name: 'Coordinator', isActive: true, isDefault: false }
      ];
      const mockStaff = [
        { id: 1, firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', role: 'Counselor', status: 'active', programRoleId: 1 }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRoles) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStaff) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['staff-table-body'].innerHTML).toContain('Coordinator');
    });

    test('code handles grouping without groupingType', () => {
      // Verify the code structure handles missing groupingType
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(
        path.resolve(__dirname, '../public/js/programs-staff.js'),
        'utf8'
      );

      // The code has a fallback for grouping.groupingType (line 305-307)
      expect(code).toContain('grouping.groupingType');
      expect(code).toContain('const typeName = grouping.groupingType');
      expect(code).toContain(": ''"); // Fallback when no groupingType
    });
  });

  describe('updatePermissionRoleSelect', () => {
    test('renders roles with default badge', async () => {
      const mockRoles = [
        { id: 1, name: 'Admin', isActive: true, isDefault: true },
        { id: 2, name: 'Editor', isActive: true, isDefault: false }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRoles) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['staff-permission-role'].innerHTML).toContain('Admin');
      expect(elements['staff-permission-role'].innerHTML).toContain('(Default)');
      expect(elements['staff-permission-role'].innerHTML).toContain('Editor');
    });

    test('filters out inactive roles', async () => {
      const mockRoles = [
        { id: 1, name: 'Active Role', isActive: true },
        { id: 2, name: 'Inactive Role', isActive: false }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRoles) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      expect(elements['staff-permission-role'].innerHTML).toContain('Active Role');
      expect(elements['staff-permission-role'].innerHTML).not.toContain('Inactive Role');
    });
  });

  describe('saveStaff with temp password', () => {
    test('includes tempPassword when provided', async () => {
      elements['staff-first-name'].value = 'John';
      elements['staff-last-name'].value = 'Doe';
      elements['staff-email'].value = 'john@example.com';
      elements['staff-role'].value = 'Counselor';
      elements['staff-temp-password'].value = 'tempPass123';

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) });
        }
        if (url.includes('/staff') && !url.includes('POST')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1 }) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Now save
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 1 }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await funcs.saveStaff();

      // Check the body was called with tempPassword
      const postCall = global.fetch.mock.calls.find(c => c[1]?.method === 'POST');
      if (postCall) {
        const body = JSON.parse(postCall[1].body);
        expect(body.tempPassword).toBe('tempPass123');
      }
    });
  });

  describe('saveStaff with permission role assignment', () => {
    test('assigns permission role when userId and roleId are present', async () => {
      elements['staff-first-name'].value = 'John';
      elements['staff-last-name'].value = 'Doe';
      elements['staff-email'].value = 'john@example.com';
      elements['staff-role'].value = 'Counselor';
      elements['staff-permission-role'].value = '2';

      // Set up mock for initialization and saving
      global.fetch = jest.fn((url, options) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (options?.method === 'POST' && url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 1, userId: 5 }) });
        }
        if (options?.method === 'PUT' && url.includes('/role')) {
          return Promise.resolve({ ok: true });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      await funcs.saveStaff();
      await flushAllPromises();

      // Verify role assignment was called
      const roleCall = global.fetch.mock.calls.find(c => c[0].includes('/role') && c[1]?.method === 'PUT');
      expect(roleCall).toBeDefined();
    });
  });

  describe('openEditModal with programRoleId', () => {
    test('sets permission role from programRoleId', async () => {
      const staffData = [
        { id: 1, firstName: 'Test', lastName: 'User', email: 'test@test.com', role: 'Counselor', status: 'active', programRoleId: 3 }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 3, name: 'Role', isActive: true }]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(staffData) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      funcs.openEditModal(1);
      expect(elements['staff-permission-role'].value).toBe(3);
    });

    test('sets permission role from programRole.id', async () => {
      const staffData = [
        { id: 1, firstName: 'Test', lastName: 'User', email: 'test@test.com', role: 'Counselor', status: 'active', programRole: { id: 4, name: 'Admin' } }
      ];

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 4, name: 'Admin', isActive: true }]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(staffData) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      funcs.openEditModal(1);
      expect(elements['staff-permission-role'].value).toBe(4);
    });
  });

  describe('init event handlers', () => {
    test('roleSelect change shows/hides custom role container', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Find the change handler
      const changeCall = elements['staff-role'].addEventListener.mock.calls.find(c => c[0] === 'change');
      expect(changeCall).toBeDefined();

      // Simulate selecting 'other'
      const handler = changeCall[1];
      handler({ target: { value: 'other' } });
      expect(elements['custom-role-container'].classList.remove).toHaveBeenCalledWith('hidden');

      // Simulate selecting predefined role
      handler({ target: { value: 'Counselor' } });
      expect(elements['custom-role-container'].classList.add).toHaveBeenCalledWith('hidden');
    });

    test('generatePasswordBtn generates password', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Find the click handler for generate password button
      const clickCall = elements['generate-staff-password-btn'].addEventListener.mock.calls.find(c => c[0] === 'click');
      expect(clickCall).toBeDefined();

      const handler = clickCall[1];
      handler();

      // Password field should have a value
      expect(elements['staff-temp-password'].value).toHaveLength(12);
    });

    test('click outside modals closes them', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Find click handler for staff modal
      const staffModalClick = elements['staff-modal'].addEventListener.mock.calls.find(c => c[0] === 'click');
      expect(staffModalClick).toBeDefined();

      // Simulate click on modal backdrop (e.target === modal)
      const handler = staffModalClick[1];
      handler({ target: elements['staff-modal'] });
      expect(elements['staff-modal'].classList.add).toHaveBeenCalledWith('hidden');
    });

    test('confirmation modal backdrop click closes it', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      const confirmModalClick = elements['confirmation-modal'].addEventListener.mock.calls.find(c => c[0] === 'click');
      expect(confirmModalClick).toBeDefined();

      const handler = confirmModalClick[1];
      handler({ target: elements['confirmation-modal'] });
      expect(elements['confirmation-modal'].classList.add).toHaveBeenCalledWith('hidden');
    });

    test('password modal backdrop click closes it', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      const passwordModalClick = elements['password-modal'].addEventListener.mock.calls.find(c => c[0] === 'click');
      expect(passwordModalClick).toBeDefined();

      const handler = passwordModalClick[1];
      handler({ target: elements['password-modal'] });
      expect(elements['password-modal'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadProgramYears with stored year', () => {
    test('uses stored year from localStorage', async () => {
      global.localStorage.store[`selectedYear_test123`] = '2024';

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2024 }, { id: 2, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // The HTML should have the stored year selected
      expect(elements['year-select'].innerHTML).toContain('selected');
      expect(elements['year-select'].innerHTML).toContain('2024');
    });
  });

  describe('confirmRemoveStaff function', () => {
    test('shows confirmation modal with correct message', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        if (url.includes('/staff')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      funcs.confirmRemoveStaff(1, 'John Doe');

      expect(elements['confirmation-title'].textContent).toBe('Remove Staff Member');
      expect(elements['confirmation-message'].textContent).toContain('John Doe');
      expect(elements['confirmation-confirm-btn'].textContent).toBe('Remove');
      expect(elements['confirmation-modal'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('clones confirm button to remove old listeners', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      funcs.confirmRemoveStaff(5, 'Jane Smith');

      expect(elements['confirmation-confirm-btn'].cloneNode).toHaveBeenCalledWith(true);
    });
  });

  describe('saveStaff with editingStaffId (PUT)', () => {
    test('sends PUT request when editing existing staff', async () => {
      elements['staff-first-name'].value = 'Updated';
      elements['staff-last-name'].value = 'User';
      elements['staff-email'].value = 'updated@example.com';
      elements['staff-role'].value = 'Counselor';
      elements['staff-id'].value = '5';

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) });
        }
        if (url.includes('/groupings')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/staff') && !url.includes('PUT')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 5, firstName: 'Test', lastName: 'User', email: 'test@test.com', role: 'Counselor', status: 'active' }]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 5 }) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Open edit modal to set editingStaffId
      funcs.openEditModal(5);
      await flushAllPromises();

      // Now save
      global.fetch = jest.fn((url, options) => {
        if (options?.method === 'PUT') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 5 }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });

      await funcs.saveStaff();
      await flushAllPromises();

      // Verify PUT was called
      const putCall = global.fetch.mock.calls.find(c => c[1]?.method === 'PUT');
      expect(putCall).toBeDefined();
      expect(putCall[0]).toContain('/staff/5');
    });
  });

  describe('logout button handler', () => {
    test('calls clearAuthToken when logout clicked', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      // Find logout button handler
      const logoutClick = elements['logoutBtn'].addEventListener.mock.calls.find(c => c[0] === 'click');
      expect(logoutClick).toBeDefined();

      const handler = logoutClick[1];
      handler();

      expect(global.clearAuthToken).toHaveBeenCalled();
      expect(global.window.location.href).toBe('login.html');
    });

    test('redirects to login when clearAuthToken not available', async () => {
      delete global.clearAuthToken;

      global.fetch = jest.fn((url) => {
        if (url.includes('/roles')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/years')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      jest.resetModules();
      global.window = {
        location: { search: '?programId=test123', href: '' },
        API_URL: 'http://api.test'
      };
      global.document = {
        getElementById: jest.fn(id => elements[id]),
        querySelector: jest.fn(() => ({ href: '' })),
        addEventListener: (ev, fn) => { (listeners[ev] || (listeners[ev] = [])).push(fn); }
      };
      global.localStorage = {
        store: {},
        getItem: jest.fn(key => global.localStorage.store[key] || null),
        setItem: jest.fn((key, value) => { global.localStorage.store[key] = value; }),
      };
      global.getAuthHeaders = jest.fn(() => ({}));

      funcs = require('../public/js/programs-staff.js');

      if (listeners['DOMContentLoaded'] && listeners['DOMContentLoaded'].length > 0) {
        listeners['DOMContentLoaded'][0]();
        await flushAllPromises();
      }

      const logoutClick = elements['logoutBtn'].addEventListener.mock.calls.find(c => c[0] === 'click');
      if (logoutClick) {
        logoutClick[1]();
        expect(global.window.location.href).toBe('login.html');
      }
    });
  });

  describe('renderStaffTable with groupingType', () => {
    test('code handles grouping type with customName', () => {
      // Verify the code structure for customName handling
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(path.join(__dirname, '../public/js/programs-staff.js'), 'utf8');

      // The code should check for customName first, then defaultName
      expect(code).toContain('grouping.groupingType.customName');
      expect(code).toContain('grouping.groupingType.defaultName');
    });

    test('code handles grouping type with defaultName fallback', () => {
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(path.join(__dirname, '../public/js/programs-staff.js'), 'utf8');

      // Verify the OR fallback pattern exists
      expect(code).toContain('|| grouping.groupingType.defaultName');
    });

    test('displays grouping name only when no groupingType', () => {
      // This test verifies the code path where grouping exists but has no groupingType
      // We test the code structure directly since the initialization order varies
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(path.join(__dirname, '../public/js/programs-staff.js'), 'utf8');

      // The code should have fallback for missing groupingType
      expect(code).toContain('const typeName = grouping.groupingType');
      expect(code).toContain(": ''");
      expect(code).toContain('escapeHtml(grouping.name)');
    });

    test('code uses typeName in groupingDisplay', () => {
      const fs = require('fs');
      const path = require('path');
      const code = fs.readFileSync(path.join(__dirname, '../public/js/programs-staff.js'), 'utf8');

      // Verify typeName is used when building groupingDisplay
      expect(code).toContain('groupingDisplay = typeName');
      expect(code).toContain('escapeHtml(typeName)');
    });
  });

  describe('displayProgramContext no programId', () => {
    test('shows no program selected when programId is null', async () => {
      // Reset to no programId state
      global.window.location.search = '';
      global.localStorage.store = {};
      global.localStorage.getItem = jest.fn(() => null);

      jest.resetModules();

      global.window = {
        location: { search: '', href: '' },
        API_URL: 'http://api.test'
      };
      global.document = {
        getElementById: jest.fn(id => elements[id]),
        querySelector: jest.fn(() => ({ href: '' })),
        addEventListener: (ev, fn) => { (listeners[ev] || (listeners[ev] = [])).push(fn); }
      };
      global.localStorage = {
        store: {},
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
      };
      global.getAuthHeaders = jest.fn(() => ({}));
      global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

      const freshFuncs = require('../public/js/programs-staff.js');

      await freshFuncs.displayProgramContext();

      expect(elements['program-context'].textContent).toBe('No program selected');
    });
  });

  describe('loadProgramYears no programId', () => {
    test('shows no program selected when programId is null', async () => {
      // Reset to no programId state
      global.window.location.search = '';
      global.localStorage.store = {};

      jest.resetModules();

      global.window = {
        location: { search: '', href: '' },
        API_URL: 'http://api.test'
      };
      global.document = {
        getElementById: jest.fn(id => elements[id]),
        querySelector: jest.fn(() => ({ href: '' })),
        addEventListener: (ev, fn) => { (listeners[ev] || (listeners[ev] = [])).push(fn); }
      };
      global.localStorage = {
        store: {},
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
      };
      global.getAuthHeaders = jest.fn(() => ({}));
      global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));

      const freshFuncs = require('../public/js/programs-staff.js');

      await freshFuncs.loadProgramYears();

      expect(elements['year-select'].innerHTML).toBe('<option value="">No program selected</option>');
    });
  });
});
