const fs = require('fs');
const path = require('path');

let funcs;

describe('programs-year-config.js', () => {
  let mockElements;
  let mockFetch;

  beforeEach(() => {
    jest.resetModules();

    // Reset mock elements
    mockElements = {
      'year-position-modal': {
        classList: { add: jest.fn(), remove: jest.fn() },
        dataset: {},
      },
      'year-position-modal-title': { textContent: '' },
      'year-position-base-setting': { textContent: '' },
      'year-position-elected-select': { value: '' },
      'year-position-override-warning': {
        classList: { add: jest.fn(), remove: jest.fn() },
      },
      'year-select': { value: '2025' },
      'errorBox': {
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      },
      'successBox': {
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      },
      'positions-loading': { classList: { add: jest.fn(), remove: jest.fn() } },
      'positions-list': {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      },
      'positions-none': { classList: { add: jest.fn(), remove: jest.fn() } },
      'save-positions-btn': {
        classList: { add: jest.fn(), remove: jest.fn() },
        disabled: false,
        textContent: '',
      },
      'program-selector': { innerHTML: '' },
      'year-selector-container': { innerHTML: '' },
      'parties-loading': { classList: { add: jest.fn(), remove: jest.fn() } },
      'parties-list': { innerHTML: '', classList: { add: jest.fn(), remove: jest.fn() } },
      'parties-none': { classList: { add: jest.fn(), remove: jest.fn() } },
      'save-parties-btn': { classList: { add: jest.fn(), remove: jest.fn() } },
      'groupings-loading': { classList: { add: jest.fn(), remove: jest.fn() } },
      'groupings-list': { innerHTML: '', classList: { add: jest.fn(), remove: jest.fn() } },
      'groupings-none': { classList: { add: jest.fn(), remove: jest.fn() } },
      'save-groupings-btn': { classList: { add: jest.fn(), remove: jest.fn() } },
      'year-position-modal-close': { addEventListener: jest.fn() },
      'year-position-cancel-btn': { addEventListener: jest.fn() },
      'year-position-save-btn': { addEventListener: jest.fn() },
      'logoutBtn': { addEventListener: jest.fn() },
    };

    global.window = {
      API_URL: 'http://api.test',
      location: { search: '?programId=prog1' },
    };

    global.document = {
      getElementById: jest.fn(id => mockElements[id] || null),
      querySelectorAll: jest.fn(() => []),
      addEventListener: jest.fn(),
    };

    global.localStorage = {
      getItem: jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'prog1';
        if (key === 'selectedYear_prog1') return '2025';
        return null;
      }),
      setItem: jest.fn(),
    };

    global.sessionStorage = { getItem: jest.fn(() => null) };
    global.console = { log: jest.fn(), error: jest.fn(), warn: jest.fn() };

    // Mock fetch
    mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    global.fetch = mockFetch;

    // Mock getAuthHeaders
    global.getAuthHeaders = jest.fn(() => ({ Authorization: 'Bearer test-token' }));

    funcs = require('../public/js/programs-year-config.js');
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.sessionStorage;
    delete global.fetch;
    delete global.getAuthHeaders;
  });

  describe('getUsername', () => {
    test('returns username from localStorage', () => {
      expect(funcs.getUsername()).toBe('testuser');
    });

    test('falls back to sessionStorage', () => {
      global.localStorage.getItem = jest.fn(() => null);
      global.sessionStorage.getItem = jest.fn(() => 'sessionuser');
      jest.resetModules();
      global.window = { API_URL: 'http://api.test', location: { search: '' } };
      global.document = { getElementById: jest.fn(() => null), querySelectorAll: jest.fn(() => []), addEventListener: jest.fn() };
      const freshFuncs = require('../public/js/programs-year-config.js');
      expect(freshFuncs.getUsername()).toBe('sessionuser');
    });
  });

  describe('getProgramId', () => {
    test('gets programId from URL params', () => {
      expect(funcs.getProgramId()).toBe('prog1');
    });

    test('falls back to localStorage when not in URL', () => {
      global.window.location.search = '';
      jest.resetModules();
      global.window = { API_URL: 'http://api.test', location: { search: '' } };
      global.document = { getElementById: jest.fn(() => null), querySelectorAll: jest.fn(() => []), addEventListener: jest.fn() };
      global.localStorage = { getItem: jest.fn(() => 'fromStorage'), setItem: jest.fn() };
      global.sessionStorage = { getItem: jest.fn(() => null) };
      const freshFuncs = require('../public/js/programs-year-config.js');
      expect(freshFuncs.getProgramId()).toBe('fromStorage');
    });
  });

  describe('showError', () => {
    test('displays error message and hides success', () => {
      funcs.showError('Test error');
      expect(mockElements['errorBox'].textContent).toBe('Test error');
      expect(mockElements['errorBox'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['successBox'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('showSuccess', () => {
    test('displays success message and hides error', () => {
      funcs.showSuccess('Test success');
      expect(mockElements['successBox'].textContent).toBe('Test success');
      expect(mockElements['successBox'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['errorBox'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('closeYearPositionModal', () => {
    test('hides the modal', () => {
      funcs.closeYearPositionModal();
      expect(mockElements['year-position-modal'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('saveYearPositionSettings', () => {
    test('sends PUT request with inherit value (null)', async () => {
      mockElements['year-position-modal'].dataset.pypId = '123';
      mockElements['year-position-elected-select'].value = 'inherit';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await funcs.saveYearPositionSettings();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/program-year-positions/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ isElected: null }),
        })
      );
    });

    test('sends PUT request with elected value (true)', async () => {
      mockElements['year-position-modal'].dataset.pypId = '456';
      mockElements['year-position-elected-select'].value = 'true';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await funcs.saveYearPositionSettings();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/program-year-positions/456',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ isElected: true }),
        })
      );
    });

    test('sends PUT request with appointed value (false)', async () => {
      mockElements['year-position-modal'].dataset.pypId = '789';
      mockElements['year-position-elected-select'].value = 'false';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await funcs.saveYearPositionSettings();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/program-year-positions/789',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ isElected: false }),
        })
      );
    });

    test('shows success message on successful save', async () => {
      mockElements['year-position-modal'].dataset.pypId = '123';
      mockElements['year-position-elected-select'].value = 'inherit';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await funcs.saveYearPositionSettings();

      expect(mockElements['successBox'].textContent).toBe('Year position settings saved successfully');
      expect(mockElements['year-position-modal'].classList.add).toHaveBeenCalledWith('hidden');
    });

    test('shows error on API failure', async () => {
      mockElements['year-position-modal'].dataset.pypId = '123';
      mockElements['year-position-elected-select'].value = 'inherit';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await funcs.saveYearPositionSettings();

      expect(mockElements['errorBox'].textContent).toBe('Server error');
    });

    test('includes auth headers when getAuthHeaders is available', async () => {
      mockElements['year-position-modal'].dataset.pypId = '123';
      mockElements['year-position-elected-select'].value = 'inherit';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await funcs.saveYearPositionSettings();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML special characters', () => {
      expect(funcs.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    test('escapes ampersand', () => {
      expect(funcs.escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('does not escape single quotes', () => {
      // The function uses ('' + str) pattern which doesn't escape single quotes
      expect(funcs.escapeHtml("It's")).toBe("It's");
    });

    test('converts non-string input to string', () => {
      // The function uses ('' + str) which converts values to strings
      expect(funcs.escapeHtml(null)).toBe('null');
      expect(funcs.escapeHtml(undefined)).toBe('undefined');
      expect(funcs.escapeHtml(123)).toBe('123');
    });
  });

  describe('clearMessages', () => {
    test('hides both error and success boxes', () => {
      funcs.clearMessages();
      expect(mockElements['errorBox'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['successBox'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('getSelectedYear', () => {
    test('returns year from localStorage', () => {
      expect(funcs.getSelectedYear()).toBe(2025);
    });

    test('returns null when no year stored', () => {
      global.localStorage.getItem = jest.fn(() => null);
      jest.resetModules();
      global.window = { API_URL: 'http://api.test', location: { search: '' } };
      global.document = { getElementById: jest.fn(() => null), querySelectorAll: jest.fn(() => []), addEventListener: jest.fn() };
      global.sessionStorage = { getItem: jest.fn(() => null) };
      const freshFuncs = require('../public/js/programs-year-config.js');
      expect(freshFuncs.getSelectedYear()).toBe(null);
    });
  });

  describe('buildGroupingTree', () => {
    test('builds tree structure from flat groupings', () => {
      const groupings = [
        { id: 1, name: 'State', parentGroupingId: null },
        { id: 2, name: 'County A', parentGroupingId: 1 },
        { id: 3, name: 'City 1', parentGroupingId: 2 },
      ];
      const result = funcs.buildGroupingTree(groupings);
      // Function returns { rootNodes, groupingMap }
      expect(result.rootNodes.length).toBe(1);
      expect(result.rootNodes[0].name).toBe('State');
      expect(result.rootNodes[0].children.length).toBe(1);
      expect(result.rootNodes[0].children[0].name).toBe('County A');
      expect(result.groupingMap).toBeInstanceOf(Map);
      expect(result.groupingMap.size).toBe(3);
    });

    test('handles empty array', () => {
      const result = funcs.buildGroupingTree([]);
      expect(result.rootNodes).toEqual([]);
      expect(result.groupingMap).toBeInstanceOf(Map);
      expect(result.groupingMap.size).toBe(0);
    });

    test('handles multiple root nodes', () => {
      const groupings = [
        { id: 1, name: 'Root1', parentGroupingId: null },
        { id: 2, name: 'Root2', parentGroupingId: null },
      ];
      const result = funcs.buildGroupingTree(groupings);
      expect(result.rootNodes.length).toBe(2);
    });
  });

  describe('getAncestorIds', () => {
    test('returns ancestor IDs for nested grouping', () => {
      // Build a proper Map structure as expected by the function
      const groupingMap = new Map();
      groupingMap.set(1, { id: 1, name: 'State', parentGroupingId: null, children: [] });
      groupingMap.set(2, { id: 2, name: 'County', parentGroupingId: 1, children: [] });
      groupingMap.set(3, { id: 3, name: 'City', parentGroupingId: 2, children: [] });

      const ancestors = funcs.getAncestorIds(3, groupingMap);
      expect(ancestors).toContain(1);
      expect(ancestors).toContain(2);
      expect(ancestors.length).toBe(2);
    });

    test('returns empty array for root node', () => {
      const groupingMap = new Map();
      groupingMap.set(1, { id: 1, name: 'State', parentGroupingId: null, children: [] });

      const ancestors = funcs.getAncestorIds(1, groupingMap);
      expect(ancestors).toEqual([]);
    });
  });

  describe('getDescendantIds', () => {
    test('returns descendant IDs for parent grouping', () => {
      // Build tree structure with children property
      const county = { id: 2, name: 'County', parentGroupingId: 1, children: [] };
      const city = { id: 3, name: 'City', parentGroupingId: 2, children: [] };
      county.children = [city];
      const state = { id: 1, name: 'State', parentGroupingId: null, children: [county] };

      const groupingMap = new Map();
      groupingMap.set(1, state);
      groupingMap.set(2, county);
      groupingMap.set(3, city);

      const descendants = funcs.getDescendantIds(1, groupingMap);
      expect(descendants).toContain(2);
      expect(descendants).toContain(3);
      expect(descendants.length).toBe(2);
    });

    test('returns empty array for leaf node', () => {
      const city = { id: 2, name: 'City', parentGroupingId: 1, children: [] };
      const state = { id: 1, name: 'State', parentGroupingId: null, children: [city] };

      const groupingMap = new Map();
      groupingMap.set(1, state);
      groupingMap.set(2, city);

      const descendants = funcs.getDescendantIds(2, groupingMap);
      expect(descendants).toEqual([]);
    });
  });

  describe('openYearPositionModal', () => {
    test('shows error when position data not found', () => {
      funcs.openYearPositionModal(999, []);
      expect(mockElements['errorBox'].textContent).toBe('Position data not found');
    });

    test('shows error when yearPositionData not populated', () => {
      // Even with base positions, function requires yearPositionData Map to be populated
      const positions = [
        { id: 1, name: 'Governor', isElected: true },
      ];

      funcs.openYearPositionModal(1, positions);

      // Should show error because yearPositionData Map is empty
      expect(mockElements['errorBox'].textContent).toBe('Position data not found');
    });

    test('shows error with empty positions array', () => {
      funcs.openYearPositionModal(123, []);
      expect(mockElements['errorBox'].textContent).toBe('Position data not found');
    });
  });

  describe('getProgramYearId', () => {
    test('returns program year id when found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 100, year: 2024 },
          { id: 101, year: 2025 },
        ]),
      });

      const result = await funcs.getProgramYearId('prog1', 2025);
      expect(result).toBe(101);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/programs/prog1/years',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    test('returns null when year not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 100, year: 2024 },
        ]),
      });

      const result = await funcs.getProgramYearId('prog1', 2099);
      expect(result).toBe(null);
    });

    test('returns null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await funcs.getProgramYearId('prog1', 2025);
      expect(result).toBe(null);
    });

    test('returns null on fetch exception', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await funcs.getProgramYearId('prog1', 2025);
      expect(result).toBe(null);
    });
  });

  describe('updateNavLinks', () => {
    test('updates links with programId', () => {
      const mockLink = {
        getAttribute: jest.fn(() => 'programs-parties.html'),
        href: '',
      };
      global.document.getElementById = jest.fn(id => {
        if (id === 'back-link') return mockLink;
        return mockElements[id] || null;
      });

      funcs.updateNavLinks();

      expect(mockLink.href).toBe('programs-parties.html?programId=prog1');
    });

    test('does nothing when no programId', () => {
      global.window.location.search = '';
      global.localStorage.getItem = jest.fn(() => null);
      jest.resetModules();
      global.window = { API_URL: 'http://api.test', location: { search: '' } };
      global.document = { getElementById: jest.fn(() => null), querySelectorAll: jest.fn(() => []), addEventListener: jest.fn() };
      global.sessionStorage = { getItem: jest.fn(() => null) };

      const freshFuncs = require('../public/js/programs-year-config.js');
      // Should not throw
      freshFuncs.updateNavLinks();
    });
  });

  describe('loadYears', () => {
    test('fetches years from API', async () => {
      mockElements['year-select'] = {
        innerHTML: '',
        value: '',
        addEventListener: jest.fn(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, year: 2024 },
          { id: 2, year: 2025 },
        ]),
      });

      await funcs.loadYears();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.test/programs/prog1/years',
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });

    test('shows error when no years configured', async () => {
      mockElements['year-select'] = {
        innerHTML: '',
        value: '',
        addEventListener: jest.fn(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await funcs.loadYears();

      expect(mockElements['year-select'].innerHTML).toBe('<option value="">No years configured</option>');
      expect(mockElements['errorBox'].textContent).toBe('No years configured for this program. Please add a year first.');
    });

    test('does nothing when no programId', async () => {
      global.window.location.search = '';
      global.localStorage.getItem = jest.fn(() => null);
      jest.resetModules();
      global.window = { API_URL: 'http://api.test', location: { search: '' } };
      global.document = { getElementById: jest.fn(() => null), querySelectorAll: jest.fn(() => []), addEventListener: jest.fn() };
      global.sessionStorage = { getItem: jest.fn(() => null) };

      const freshFuncs = require('../public/js/programs-year-config.js');
      await freshFuncs.loadYears();
      // Should not throw or make fetch calls
    });
  });

  describe('loadParties', () => {
    test('loads parties and updates UI', async () => {
      mockElements['parties-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Federalist', color: '#FF0000' },
          { id: 2, name: 'Nationalist', color: '#0000FF' },
        ]),
      });

      await funcs.loadParties();

      expect(mockElements['parties-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadGroupings', () => {
    test('loads groupings and updates UI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'State', parentGroupingId: null },
          { id: 2, name: 'County A', parentGroupingId: 1 },
        ]),
      });

      await funcs.loadGroupings();

      expect(mockElements['groupings-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadPositions', () => {
    test('loads positions and updates UI', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Governor', isElected: true },
          { id: 2, name: 'Mayor', isElected: false },
        ]),
      });

      await funcs.loadPositions();

      expect(mockElements['positions-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('savePartyActivations', () => {
    test('sends POST request with activated party IDs', async () => {
      // Set up mock checkbox elements
      const checkbox1 = { checked: true, value: '1' };
      const checkbox2 = { checked: false, value: '2' };
      mockElements['parties-list'].querySelectorAll = jest.fn(() => [checkbox1, checkbox2]);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await funcs.savePartyActivations();

      // Should have called fetch for program years and then the activation endpoint
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('saveGroupingActivations', () => {
    test('sends POST request with activated grouping IDs', async () => {
      const checkbox1 = { checked: true, dataset: { groupingId: '1' } };
      mockElements['groupings-list'].querySelectorAll = jest.fn(() => [checkbox1]);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await funcs.saveGroupingActivations();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('savePositionActivations', () => {
    test('sends POST request with activated position IDs', async () => {
      const checkbox1 = { checked: true, value: '1' };
      mockElements['positions-list'].querySelectorAll = jest.fn(() => [checkbox1]);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await funcs.savePositionActivations();

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('renderGroupingTree', () => {
    test('returns empty string when no groupings', () => {
      const html = funcs.renderGroupingTree([], []);
      expect(html).toBe('');
    });

    test('renders tree with groupings', () => {
      const tree = [
        { id: 1, name: 'State', groupingType: { defaultName: 'State' }, children: [] },
      ];

      const html = funcs.renderGroupingTree(tree, [1]);

      expect(html).toContain('State');
      expect(html).toContain('checked');
    });

    test('renders unchecked grouping when not activated', () => {
      const tree = [
        { id: 1, name: 'State', groupingType: { defaultName: 'State' }, children: [] },
      ];

      const html = funcs.renderGroupingTree(tree, []);

      expect(html).toContain('State');
      expect(html).not.toContain('checked');
    });

    test('renders nested children', () => {
      const tree = [
        {
          id: 1,
          name: 'State',
          groupingType: { defaultName: 'State' },
          children: [
            { id: 2, name: 'County A', groupingType: { defaultName: 'County' }, children: [] },
          ],
        },
      ];

      const html = funcs.renderGroupingTree(tree, [1, 2]);

      expect(html).toContain('State');
      expect(html).toContain('County A');
    });
  });

  describe('loadYearConfiguration', () => {
    test('calls loadParties, loadGroupings, and loadPositions', async () => {
      // Mock all API calls needed
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ programs: [{ programId: 'prog1', programName: 'Test Program' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        });

      await funcs.loadYearConfiguration(2025);

      // Should have made API calls
      expect(mockFetch).toHaveBeenCalled();
    });

    test('does nothing when no programId', async () => {
      global.window.location.search = '';
      global.localStorage.getItem = jest.fn(() => null);
      jest.resetModules();
      global.window = { API_URL: 'http://api.test', location: { search: '' } };
      global.document = { getElementById: jest.fn(() => null), querySelectorAll: jest.fn(() => []), addEventListener: jest.fn() };
      global.sessionStorage = { getItem: jest.fn(() => null) };

      const freshFuncs = require('../public/js/programs-year-config.js');
      await freshFuncs.loadYearConfiguration(2025);
      // Should not throw
    });

    test('does nothing when no year', async () => {
      await funcs.loadYearConfiguration(null);
      // Should not throw
    });
  });

  describe('error handling', () => {
    test('loadYears shows error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await funcs.loadYears();

      expect(mockElements['errorBox'].textContent).toBe('Failed to load years');
    });

    test('loadParties shows error on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await funcs.loadParties();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });

    test('loadGroupings shows error on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await funcs.loadGroupings();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });

    test('loadPositions shows error on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await funcs.loadPositions();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });

    test('saveYearPositionSettings shows default error on network failure', async () => {
      mockElements['year-position-modal'].dataset.pypId = '123';
      mockElements['year-position-elected-select'].value = 'inherit';

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await funcs.saveYearPositionSettings();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });
  });

  describe('loadParties success path', () => {
    test('hides loading div after fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await funcs.loadParties('prog1', 2025);

      // loadParties hides loading div when done
      expect(mockElements['parties-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadGroupings success path', () => {
    test('hides loading div after fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await funcs.loadGroupings('prog1', 2025);

      expect(mockElements['groupings-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadPositions success path', () => {
    test('hides loading div after fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await funcs.loadPositions('prog1', 2025);

      expect(mockElements['positions-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('savePartyActivations error handling', () => {
    test('shows error when program year ID cannot be fetched', async () => {
      // Mock localStorage to return null for selectedYear
      global.localStorage.getItem = jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'prog1';
        if (key === 'selectedYear_prog1') return null;
        return null;
      });

      await funcs.savePartyActivations();

      expect(mockElements['errorBox'].textContent).toBe('Failed to get program year ID');
    });
  });

  describe('saveGroupingActivations error handling', () => {
    test('shows error when program year ID cannot be fetched', async () => {
      global.localStorage.getItem = jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'prog1';
        if (key === 'selectedYear_prog1') return null;
        return null;
      });

      await funcs.saveGroupingActivations();

      expect(mockElements['errorBox'].textContent).toBe('Failed to get program year ID');
    });
  });

  describe('savePositionActivations error handling', () => {
    test('shows error when program year ID cannot be fetched', async () => {
      global.localStorage.getItem = jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'prog1';
        if (key === 'selectedYear_prog1') return null;
        return null;
      });

      await funcs.savePositionActivations();

      expect(mockElements['errorBox'].textContent).toBe('Failed to get program year ID');
    });
  });

  describe('renderProgramSelector', () => {
    test('renders error when no programId', () => {
      funcs.renderProgramSelector(null, 'Test Program', 2025);
      expect(mockElements['program-selector'].innerHTML).toContain('No program selected');
    });

    test('renders error when no programName', () => {
      funcs.renderProgramSelector('prog1', null, 2025);
      expect(mockElements['program-selector'].innerHTML).toContain('No program selected');
    });

    test('renders program info with year', () => {
      funcs.renderProgramSelector('prog1', 'Test Program', 2025);
      expect(mockElements['program-selector'].innerHTML).toContain('Test Program');
      expect(mockElements['program-selector'].innerHTML).toContain('2025');
    });

    test('renders program info without year', () => {
      funcs.renderProgramSelector('prog1', 'Test Program', null);
      expect(mockElements['program-selector'].innerHTML).toContain('Test Program');
    });
  });

  describe('loadYears with auto-selection', () => {
    test('auto-selects first year when none stored', async () => {
      // Mock localStorage to have no selectedYear
      global.localStorage.getItem = jest.fn(key => {
        if (key === 'user') return 'testuser';
        if (key === 'lastSelectedProgramId') return 'prog1';
        if (key === 'selectedYear_prog1') return null;
        return null;
      });

      mockElements['year-select'] = {
        innerHTML: '',
        value: '',
        addEventListener: jest.fn(),
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 1, year: 2024 }, { id: 2, year: 2025 }]),
        })
        // Additional calls for loadYearConfiguration
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([]),
        });

      await funcs.loadYears();

      // Should have stored the first year
      expect(global.localStorage.setItem).toHaveBeenCalledWith('selectedYear_prog1', '2024');
    });
  });

  describe('loadParties rendering', () => {
    test('hides loading and shows list or none message', async () => {
      mockElements['parties-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await funcs.loadParties();

      // Either parties-list or parties-none should be shown
      expect(mockElements['parties-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadGroupings rendering', () => {
    test('hides loading after fetch', async () => {
      mockElements['groupings-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await funcs.loadGroupings();

      expect(mockElements['groupings-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadPositions rendering', () => {
    test('hides loading after fetch', async () => {
      mockElements['positions-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await funcs.loadPositions();

      expect(mockElements['positions-loading'].classList.add).toHaveBeenCalledWith('hidden');
    });
  });

  describe('savePartyActivations success', () => {
    test('saves activations and shows success', async () => {
      const checkbox1 = { checked: true, value: '1' };
      const checkbox2 = { checked: true, value: '2' };
      mockElements['parties-list'].querySelectorAll = jest.fn(() => [checkbox1, checkbox2]);
      mockElements['save-parties-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await funcs.savePartyActivations();

      expect(mockElements['successBox'].textContent).toContain('activated');
    });
  });

  describe('saveGroupingActivations success', () => {
    test('saves activations and shows success', async () => {
      const checkbox1 = { checked: true, dataset: { groupingId: '1' } };
      mockElements['groupings-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-groupings-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await funcs.saveGroupingActivations();

      expect(mockElements['successBox'].textContent).toContain('activated');
    });
  });

  describe('savePositionActivations success', () => {
    test('saves activations and shows success', async () => {
      const checkbox1 = { checked: true, value: '1' };
      mockElements['positions-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-positions-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await funcs.savePositionActivations();

      expect(mockElements['successBox'].textContent).toContain('activated');
    });
  });

  describe('save activation API errors', () => {
    test('savePartyActivations shows error on API failure', async () => {
      const checkbox1 = { checked: true, value: '1' };
      mockElements['parties-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-parties-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Save failed' }),
        });

      await funcs.savePartyActivations();

      expect(mockElements['errorBox'].textContent).toBe('Save failed');
    });

    test('saveGroupingActivations shows error on API failure', async () => {
      const checkbox1 = { checked: true, dataset: { groupingId: '1' } };
      mockElements['groupings-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-groupings-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Save failed' }),
        });

      await funcs.saveGroupingActivations();

      expect(mockElements['errorBox'].textContent).toBe('Save failed');
    });

    test('savePositionActivations shows error on API failure', async () => {
      const checkbox1 = { checked: true, value: '1' };
      mockElements['positions-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-positions-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Save failed' }),
        });

      await funcs.savePositionActivations();

      expect(mockElements['errorBox'].textContent).toBe('Save failed');
    });
  });

  describe('updateNavLinks', () => {
    test('updates multiple links', () => {
      const mockLinks = {};
      ['back-link', 'manage-parties-link', 'manage-groupings-link', 'manage-positions-link'].forEach(id => {
        mockLinks[id] = {
          getAttribute: jest.fn(() => 'page.html'),
          href: '',
        };
      });

      global.document.getElementById = jest.fn(id => mockLinks[id] || mockElements[id] || null);

      funcs.updateNavLinks();

      Object.values(mockLinks).forEach(link => {
        expect(link.href).toContain('?programId=prog1');
      });
    });
  });

  describe('loadYears API error', () => {
    test('shows error on network failure', async () => {
      mockElements['year-select'] = {
        innerHTML: '',
        value: '',
        addEventListener: jest.fn(),
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await funcs.loadYears();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });
  });

  describe('renderGroupingTree with customName', () => {
    test('uses customName when available', () => {
      const tree = [
        { id: 1, name: 'State', groupingType: { defaultName: 'State', customName: 'Custom State' }, children: [] },
      ];

      const html = funcs.renderGroupingTree(tree, [1]);

      expect(html).toContain('Custom State');
    });

    test('renders deeply nested tree', () => {
      const tree = [
        {
          id: 1,
          name: 'State',
          groupingType: { defaultName: 'State' },
          children: [
            {
              id: 2,
              name: 'County',
              groupingType: { defaultName: 'County' },
              children: [
                {
                  id: 3,
                  name: 'City',
                  groupingType: { defaultName: 'City' },
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      const html = funcs.renderGroupingTree(tree, [1, 2, 3]);

      expect(html).toContain('State');
      expect(html).toContain('County');
      expect(html).toContain('City');
    });
  });

  describe('loadYearConfiguration error handling', () => {
    test('handles user-programs API error gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([]),
        });

      await funcs.loadYearConfiguration(2025);

      // Should not throw, should continue loading
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getAncestorIds edge cases', () => {
    test('returns empty array for unknown grouping', () => {
      const groupingMap = new Map();
      groupingMap.set(1, { id: 1, name: 'State', parentGroupingId: null, children: [] });

      const ancestors = funcs.getAncestorIds(999, groupingMap);
      expect(ancestors).toEqual([]);
    });
  });

  describe('getDescendantIds edge cases', () => {
    test('returns empty array for unknown grouping', () => {
      const groupingMap = new Map();
      groupingMap.set(1, { id: 1, name: 'State', parentGroupingId: null, children: [] });

      const descendants = funcs.getDescendantIds(999, groupingMap);
      expect(descendants).toEqual([]);
    });
  });

  describe('loadParties 404/204 handling', () => {
    test('shows none div when parties response is 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await funcs.loadParties();

      expect(mockElements['parties-loading'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['parties-none'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('shows none div when parties response is 204', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 204,
      });

      await funcs.loadParties();

      expect(mockElements['parties-loading'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['parties-none'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('throws error on other non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await funcs.loadParties();

      expect(mockElements['errorBox'].textContent).toBe('Failed to load parties');
    });

    test('shows none div when all parties are retired', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Retired Party', status: 'retired' },
        ]),
      });

      await funcs.loadParties();

      expect(mockElements['parties-none'].classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadGroupings 404/204 handling', () => {
    test('shows none div when groupings response is 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await funcs.loadGroupings();

      expect(mockElements['groupings-loading'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['groupings-none'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('shows none div when groupings response is 204', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 204,
      });

      await funcs.loadGroupings();

      expect(mockElements['groupings-loading'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['groupings-none'].classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadPositions 404/204 handling', () => {
    test('shows none div when positions response is 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await funcs.loadPositions();

      expect(mockElements['positions-loading'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['positions-none'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('shows none div when positions response is 204', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 204,
      });

      await funcs.loadPositions();

      expect(mockElements['positions-loading'].classList.add).toHaveBeenCalledWith('hidden');
      expect(mockElements['positions-none'].classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('save activations network errors', () => {
    test('savePartyActivations handles network error', async () => {
      const checkbox1 = { checked: true, value: '1' };
      mockElements['parties-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-parties-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await funcs.savePartyActivations();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });

    test('saveGroupingActivations handles network error', async () => {
      const checkbox1 = { checked: true, dataset: { groupingId: '1' } };
      mockElements['groupings-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-groupings-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await funcs.saveGroupingActivations();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });

    test('savePositionActivations handles network error', async () => {
      const checkbox1 = { checked: true, value: '1' };
      mockElements['positions-list'].querySelectorAll = jest.fn(() => [checkbox1]);
      mockElements['save-positions-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await funcs.savePositionActivations();

      expect(mockElements['errorBox'].textContent).toBe('Network error');
    });
  });

  describe('buildGroupingTree displayOrder sorting', () => {
    test('sorts nodes by displayOrder when different', () => {
      const groupings = [
        { id: 1, name: 'B Node', parentGroupingId: null, displayOrder: 2 },
        { id: 2, name: 'A Node', parentGroupingId: null, displayOrder: 1 },
        { id: 3, name: 'C Node', parentGroupingId: null, displayOrder: 3 },
      ];
      const result = funcs.buildGroupingTree(groupings);
      expect(result.rootNodes[0].name).toBe('A Node');
      expect(result.rootNodes[1].name).toBe('B Node');
      expect(result.rootNodes[2].name).toBe('C Node');
    });

    test('sorts by name when displayOrder is the same', () => {
      const groupings = [
        { id: 1, name: 'Zebra', parentGroupingId: null, displayOrder: 1 },
        { id: 2, name: 'Apple', parentGroupingId: null, displayOrder: 1 },
        { id: 3, name: 'Middle', parentGroupingId: null, displayOrder: 1 },
      ];
      const result = funcs.buildGroupingTree(groupings);
      expect(result.rootNodes[0].name).toBe('Apple');
      expect(result.rootNodes[1].name).toBe('Middle');
      expect(result.rootNodes[2].name).toBe('Zebra');
    });

    test('sorts children by displayOrder', () => {
      const groupings = [
        { id: 1, name: 'Parent', parentGroupingId: null, displayOrder: 1 },
        { id: 2, name: 'Child B', parentGroupingId: 1, displayOrder: 2 },
        { id: 3, name: 'Child A', parentGroupingId: 1, displayOrder: 1 },
      ];
      const result = funcs.buildGroupingTree(groupings);
      expect(result.rootNodes[0].children[0].name).toBe('Child A');
      expect(result.rootNodes[0].children[1].name).toBe('Child B');
    });

    test('handles null displayOrder as 0', () => {
      const groupings = [
        { id: 1, name: 'With Order', parentGroupingId: null, displayOrder: 1 },
        { id: 2, name: 'No Order', parentGroupingId: null, displayOrder: null },
      ];
      const result = funcs.buildGroupingTree(groupings);
      // null displayOrder should be treated as 0, so it comes first
      expect(result.rootNodes[0].name).toBe('No Order');
      expect(result.rootNodes[1].name).toBe('With Order');
    });
  });

  describe('renderGroupingTree indentation levels', () => {
    test('renders very deeply nested tree with max indentation', () => {
      // Build a tree with 7 levels to test margin class capping
      const level0 = { id: 1, name: 'Level 0', groupingType: { defaultName: 'L0' }, children: [] };
      const level1 = { id: 2, name: 'Level 1', groupingType: { defaultName: 'L1' }, children: [] };
      const level2 = { id: 3, name: 'Level 2', groupingType: { defaultName: 'L2' }, children: [] };
      const level3 = { id: 4, name: 'Level 3', groupingType: { defaultName: 'L3' }, children: [] };
      const level4 = { id: 5, name: 'Level 4', groupingType: { defaultName: 'L4' }, children: [] };
      const level5 = { id: 6, name: 'Level 5', groupingType: { defaultName: 'L5' }, children: [] };
      const level6 = { id: 7, name: 'Level 6', groupingType: { defaultName: 'L6' }, children: [] };

      level5.children = [level6];
      level4.children = [level5];
      level3.children = [level4];
      level2.children = [level3];
      level1.children = [level2];
      level0.children = [level1];

      const html = funcs.renderGroupingTree([level0], [1, 2, 3, 4, 5, 6, 7]);

      expect(html).toContain('Level 0');
      expect(html).toContain('Level 6');
      // Should have ml-24 for deepest levels (capped)
      expect(html).toContain('ml-24');
    });

    test('renders grouping without groupingType', () => {
      const tree = [
        { id: 1, name: 'No Type', groupingType: null, children: [] },
      ];

      const html = funcs.renderGroupingTree(tree, []);

      expect(html).toContain('No Type');
    });

    test('renders grouping with only defaultName', () => {
      const tree = [
        { id: 1, name: 'State', groupingType: { defaultName: 'State Level' }, children: [] },
      ];

      const html = funcs.renderGroupingTree(tree, []);

      expect(html).toContain('State Level');
    });
  });

  describe('loadParties with active parties and colors', () => {
    test('renders parties with colors and checkboxes', async () => {
      const mockColorIndicator = { style: {}, dataset: { color: '#FF0000' } };
      mockElements['parties-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn((selector) => {
          if (selector === '.party-color-indicator') {
            return [mockColorIndicator];
          }
          return [];
        }),
      };

      // First call: get parties
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Federalist', color: '#FF0000', status: 'active' },
          { id: 2, name: 'Nationalist', color: '#0000FF', status: 'active' },
        ]),
      });
      // Second call: get program year ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      // Third call: get activated parties
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ partyId: 1 }]),
      });

      await funcs.loadParties('prog1', 2025);

      expect(mockElements['parties-list'].innerHTML).toContain('Federalist');
      expect(mockElements['parties-list'].innerHTML).toContain('Nationalist');
      expect(mockElements['parties-list'].classList.remove).toHaveBeenCalledWith('hidden');
      expect(mockElements['save-parties-btn'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('handles empty activated parties response', async () => {
      mockElements['parties-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Party', status: 'active' },
        ]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      // Activated parties fetch fails
      mockFetch.mockRejectedValueOnce(new Error('No activated parties'));

      await funcs.loadParties('prog1', 2025);

      // Should still render parties even if activated fetch fails
      expect(mockElements['parties-list'].innerHTML).toContain('Party');
    });
  });

  describe('loadGroupings with grouping tree', () => {
    test('renders groupings with tree structure and cascade handlers', async () => {
      const mockListenerFn = jest.fn();
      mockElements['groupings-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        addEventListener: mockListenerFn,
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'State', parentGroupingId: null, status: 'active', groupingType: { defaultName: 'State' } },
          { id: 2, name: 'County', parentGroupingId: 1, status: 'active', groupingType: { defaultName: 'County' } },
        ]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ groupingId: 1 }]),
      });

      await funcs.loadGroupings('prog1', 2025);

      expect(mockElements['groupings-list'].innerHTML).toContain('State');
      expect(mockElements['groupings-list'].classList.remove).toHaveBeenCalledWith('hidden');
      // Cascade handlers should be set up
      expect(mockListenerFn).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('handles failed activated groupings fetch', async () => {
      mockElements['groupings-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        addEventListener: jest.fn(),
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'State', parentGroupingId: null, status: 'active' },
        ]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      mockFetch.mockRejectedValueOnce(new Error('Failed to get activated'));

      await funcs.loadGroupings('prog1', 2025);

      // Should still render groupings even if activated fetch fails
      expect(mockElements['groupings-list'].classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('loadPositions with year overrides', () => {
    test('renders positions with grouping types and edit buttons', async () => {
      const mockEditBtns = [];
      mockElements['positions-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn((selector) => {
          if (selector === '.year-position-edit-btn') return mockEditBtns;
          return [];
        }),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Governor', isElected: true, groupingTypeId: null },
          { id: 2, name: 'Mayor', isElected: false, groupingTypeId: 1 },
        ]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 1, defaultName: 'City', level: 1 }]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 10, positionId: 1, isElected: null, position: { isElected: true, name: 'Governor' } },
        ]),
      });

      await funcs.loadPositions('prog1', 2025);

      expect(mockElements['positions-list'].innerHTML).toContain('Governor');
      expect(mockElements['positions-list'].classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('renders positions with year override badges', async () => {
      mockElements['positions-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Governor', isElected: true, groupingTypeId: null },
        ]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      // Position has year override to appointed (false)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 10, positionId: 1, isElected: false, position: { isElected: true, name: 'Governor' } },
        ]),
      });

      await funcs.loadPositions('prog1', 2025);

      // Should show year override badge for appointed
      expect(mockElements['positions-list'].innerHTML).toContain('Appointed (year override)');
    });

    test('renders positions with elected year override badges', async () => {
      mockElements['positions-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Clerk', isElected: false, groupingTypeId: null },
        ]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      // Position has year override to elected (true)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 10, positionId: 1, isElected: true, position: { isElected: false, name: 'Clerk' } },
        ]),
      });

      await funcs.loadPositions('prog1', 2025);

      // Should show year override badge for elected
      expect(mockElements['positions-list'].innerHTML).toContain('Elected (year override)');
    });

    test('handles failed activated positions fetch', async () => {
      mockElements['positions-list'] = {
        innerHTML: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        querySelectorAll: jest.fn(() => []),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 1, name: 'Governor', isElected: true },
        ]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 100, year: 2025 }]),
      });
      mockFetch.mockRejectedValueOnce(new Error('Failed to get activated'));

      await funcs.loadPositions('prog1', 2025);

      // Should still render positions
      expect(mockElements['positions-list'].classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('savePositionActivations with checkboxes', () => {
    test('correctly maps position IDs from checkboxes', async () => {
      const checkbox1 = { checked: true, dataset: { positionId: '1' } };
      const checkbox2 = { checked: false, dataset: { positionId: '2' } };
      const checkbox3 = { checked: true, dataset: { positionId: '3' } };

      global.document.querySelectorAll = jest.fn(() => [checkbox1, checkbox2, checkbox3]);
      mockElements['save-positions-btn'] = {
        disabled: false,
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 100, year: 2025 }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await funcs.savePositionActivations();

      // Should include positionIds 1 and 3 (checked ones)
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      expect(body.positionIds).toContain(1);
      expect(body.positionIds).toContain(3);
      expect(body.positionIds).not.toContain(2);
    });
  });

  describe('savePartyActivations and saveGroupingActivations missing programId/year', () => {
    test('savePartyActivations shows error when no programId', async () => {
      global.window.location.search = '';
      global.localStorage.getItem = jest.fn(() => null);

      await funcs.savePartyActivations();

      expect(mockElements['errorBox'].textContent).toBe('Program or year not selected');
    });

    test('saveGroupingActivations shows error when no programId', async () => {
      global.window.location.search = '';
      global.localStorage.getItem = jest.fn(() => null);

      await funcs.saveGroupingActivations();

      expect(mockElements['errorBox'].textContent).toBe('Program or year not selected');
    });

    test('savePositionActivations shows error when no programId', async () => {
      global.window.location.search = '';
      global.localStorage.getItem = jest.fn(() => null);

      await funcs.savePositionActivations();

      expect(mockElements['errorBox'].textContent).toBe('Program or year not selected');
    });
  });
});
