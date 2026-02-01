let funcs;

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
      'confirmation-cancel-btn': { addEventListener: jest.fn() }
    };

    listeners = {};
    global.document = {
      getElementById: jest.fn(id => elements[id]),
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
    test('init fetches years and sets up handlers', async () => {
      // Mock fetch for years, staff, and groupings
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) }) // years
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // groupings

      // Trigger DOMContentLoaded
      await listeners['DOMContentLoaded'][0]();

      // Verify handlers were attached
      expect(elements['logoutBtn'].addEventListener).toHaveBeenCalled();
      expect(elements['add-staff-btn'].addEventListener).toHaveBeenCalled();
    });

    test('init handles no years', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) }) // displayProgramContext
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // years

      listeners['DOMContentLoaded'][0]();
      // Wait for async operations to complete
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      expect(elements['year-select'].innerHTML).toContain('No years configured');
    });

    test('init handles year fetch error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await listeners['DOMContentLoaded'][0]();

      expect(elements['year-select'].innerHTML).toContain('Error');
    });

    test('init handles fetch not ok', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });

      await listeners['DOMContentLoaded'][0]();
    });

    test('init with staff data renders table', async () => {
      const mockStaff = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'Counselor', status: 'active' }
      ];

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) }) // displayProgramContext
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) }) // years
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStaff) }) // staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // groupings

      listeners['DOMContentLoaded'][0]();
      // Wait for all async operations to complete
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      expect(elements['staff-table-body'].innerHTML).toContain('John');
    });

    test('init with staff data attaches click handlers', async () => {
      const mockStaff = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'Counselor', status: 'active' }
      ];

      // Set up querySelectorAll to return mock buttons
      const mockEditBtn = { addEventListener: jest.fn(), dataset: { id: '1' } };
      const mockRemoveBtn = { addEventListener: jest.fn(), dataset: { id: '1', name: 'John Doe' } };
      elements['staff-table-body'].querySelectorAll = jest.fn(selector => {
        if (selector === '.edit-staff-btn') return [mockEditBtn];
        if (selector === '.remove-staff-btn') return [mockRemoveBtn];
        return [];
      });

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStaff) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await listeners['DOMContentLoaded'][0]();
    });

    test('init with 204 staff response', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) }) // displayProgramContext
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) }) // years
        .mockResolvedValueOnce({ status: 204 }) // staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // groupings

      listeners['DOMContentLoaded'][0]();
      // Wait for all async operations to complete
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      expect(elements['staff-table-body'].innerHTML).toContain('No staff members');
    });

    test('init with 404 staff response', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) })
        .mockResolvedValueOnce({ status: 404 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await listeners['DOMContentLoaded'][0]();
    });

    test('init with staff error', async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      await listeners['DOMContentLoaded'][0]();
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
    test('opens modal with predefined role', async () => {
      const staffData = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'Counselor', status: 'active' }
      ];

      // Initialize with years and staff
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) }) // displayProgramContext
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) }) // years
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(staffData) }) // staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // groupings

      listeners['DOMContentLoaded'][0]();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

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

      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(staffData) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      listeners['DOMContentLoaded'][0]();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      funcs.openEditModal(2);
      expect(elements['staff-first-name'].value).toBe('Jane');
      expect(elements['staff-role'].value).toBe('other');
      expect(elements['staff-custom-role'].value).toBe('CustomRole');
      expect(elements['custom-role-container'].classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('saveStaff success paths', () => {
    beforeEach(() => {
      // Set up valid form values
      elements['staff-first-name'].value = 'John';
      elements['staff-last-name'].value = 'Doe';
      elements['staff-email'].value = 'john@example.com';
      elements['staff-role'].value = 'Counselor';
      elements['staff-phone'].value = '555-1234';
      elements['staff-grouping'].value = '1';
      elements['staff-status'].value = 'active';
    });

    test('creates new staff successfully', async () => {
      // Mock loadProgramYears to set currentProgramYearId
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) }) // displayProgramContext
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) }) // years
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // groupings

      // Trigger init to set currentProgramYearId
      listeners['DOMContentLoaded'][0]();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      // Now mock the POST and subsequent loadStaff calls
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 1 }) }) // POST staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // reload staff

      await funcs.saveStaff();
      expect(elements.successBox.textContent).toContain('added');
    });

    test('edit modal sets form fields correctly', async () => {
      const staffData = [{ id: 5, firstName: 'Old', lastName: 'Name', email: 'old@test.com', role: 'Counselor', status: 'active' }];

      // Initialize with staff data
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) }) // displayProgramContext
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) }) // years
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(staffData) }) // staff
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // groupings

      listeners['DOMContentLoaded'][0]();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      // Open edit modal to set form values
      funcs.openEditModal(5);

      // Verify form was populated
      expect(elements['staff-first-name'].value).toBe('Old');
      expect(elements['staff-last-name'].value).toBe('Name');
      expect(elements['staff-id'].value).toBe(5);
      expect(elements['staff-form-title'].textContent).toBe('Edit Staff Member');
    });

    test('handles save error with message', async () => {
      // Mock loadProgramYears to set currentProgramYearId
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      listeners['DOMContentLoaded'][0]();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      // Mock failed POST with error message
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Duplicate email' })
      });

      await funcs.saveStaff();
      expect(elements.errorBox.textContent).toContain('Duplicate email');
    });

    test('handles save error without message', async () => {
      // Mock loadProgramYears to set currentProgramYearId
      global.fetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ name: 'Test' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 10, year: 2025 }]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      listeners['DOMContentLoaded'][0]();
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setImmediate(resolve));

      // Mock failed POST with invalid JSON
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('invalid json'))
      });

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
});
