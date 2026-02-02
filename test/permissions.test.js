const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Read the permissions.js code
const code = fs.readFileSync(path.join(__dirname, '../public/js/permissions.js'), 'utf8');

beforeEach(() => {
  jest.resetModules();
});

function createContext(overrides = {}) {
  const sessionStore = {};
  // Create a sessionStorage-like object that supports Object.keys()
  const sessionStorageProxy = new Proxy(sessionStore, {
    get(target, prop) {
      if (prop === 'getItem') return (key) => target[key] || null;
      if (prop === 'setItem') return (key, value) => { target[key] = value; };
      if (prop === 'removeItem') return (key) => { delete target[key]; };
      return target[prop];
    },
    ownKeys(target) {
      return Object.keys(target);
    },
    getOwnPropertyDescriptor(target, prop) {
      return Object.getOwnPropertyDescriptor(target, prop);
    }
  });
  const ctx = {
    window: { API_URL: 'http://api.test', location: { href: '' }, ...overrides.window },
    sessionStorage: sessionStorageProxy,
    fetch: overrides.fetch || jest.fn(),
    document: overrides.document || { querySelectorAll: jest.fn(() => []) },
    console: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), ...overrides.console },
    getAuthHeaders: overrides.getAuthHeaders || jest.fn(() => ({ Authorization: 'Bearer test-token' })),
    Object,
    Array,
    JSON,
    Promise,
    Error,
    setTimeout,
    // Store reference to sessionStore for tests
    _sessionStore: sessionStore
  };
  vm.createContext(ctx);
  return ctx;
}

function loadInContext(ctx) {
  vm.runInContext(code, ctx);
}

describe('permissions.js', () => {
  describe('cachePermissions and getCachedPermissions', () => {
    test('caches and retrieves permissions from sessionStorage', () => {
      const ctx = createContext();
      loadInContext(ctx);

      const permData = { permissions: ['console.user_management'], isAdmin: false, roleName: 'Counselor' };
      ctx._sessionStore['permissions_prog-1'] = JSON.stringify(permData);

      const cached = vm.runInContext('getCachedPermissions("prog-1")', ctx);
      expect(cached).toEqual(permData);
    });

    test('returns null for uncached program', () => {
      const ctx = createContext();
      loadInContext(ctx);

      const cached = vm.runInContext('getCachedPermissions("nonexistent")', ctx);
      expect(cached).toBeNull();
    });

    test('returns null for invalid JSON in cache', () => {
      const ctx = createContext();
      ctx._sessionStore['permissions_prog-1'] = 'invalid json{';
      loadInContext(ctx);

      const cached = vm.runInContext('getCachedPermissions("prog-1")', ctx);
      expect(cached).toBeNull();
    });
  });

  describe('clearPermissionsCache', () => {
    test('clears specific program cache', () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({ permissions: ['a'] });
      ctx._sessionStore['permissions_prog-2'] = JSON.stringify({ permissions: ['b'] });

      vm.runInContext('clearPermissionsCache("prog-1")', ctx);

      expect(ctx._sessionStore['permissions_prog-1']).toBeUndefined();
      expect(ctx._sessionStore['permissions_prog-2']).toBeDefined();
    });

    test('clears all permission caches when no programId provided', () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({ permissions: ['a'] });
      ctx._sessionStore['permissions_prog-2'] = JSON.stringify({ permissions: ['b'] });
      ctx._sessionStore['other_key'] = 'should remain';

      vm.runInContext('clearPermissionsCache()', ctx);

      expect(ctx._sessionStore['permissions_prog-1']).toBeUndefined();
      expect(ctx._sessionStore['permissions_prog-2']).toBeUndefined();
      expect(ctx._sessionStore['other_key']).toBe('should remain');
    });
  });

  describe('getUserPermissions', () => {
    test('returns cached permissions if available', async () => {
      const fetchMock = jest.fn();
      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      const permData = { permissions: ['console.elections'], isAdmin: false };
      ctx._sessionStore['permissions_prog-1'] = JSON.stringify(permData);

      const result = await vm.runInContext('getUserPermissions("prog-1")', ctx);

      expect(result).toEqual(permData);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('fetches from API when not cached', async () => {
      const permData = { permissions: ['console.user_management'], isAdmin: true, roleName: 'Admin' };
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(permData)
      });

      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      const result = await vm.runInContext('getUserPermissions("prog-1")', ctx);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://api.test/programs/prog-1/my-permissions',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
          credentials: 'include'
        })
      );
      expect(result).toEqual(permData);
    });

    test('caches fetched permissions', async () => {
      const permData = { permissions: ['console.elections'], isAdmin: false };
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(permData)
      });

      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      await vm.runInContext('getUserPermissions("prog-1")', ctx);

      expect(ctx._sessionStore['permissions_prog-1']).toBe(JSON.stringify(permData));
    });

    test('returns null on API error', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 403 });

      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      const result = await vm.runInContext('getUserPermissions("prog-1")', ctx);

      expect(result).toBeNull();
      expect(ctx.console.error).toHaveBeenCalled();
    });

    test('returns null on network error', async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error('Network error'));

      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      const result = await vm.runInContext('getUserPermissions("prog-1")', ctx);

      expect(result).toBeNull();
      expect(ctx.console.error).toHaveBeenCalled();
    });

    test('warns and returns null when no programId provided', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      const result = await vm.runInContext('getUserPermissions(null)', ctx);

      expect(result).toBeNull();
      expect(ctx.console.warn).toHaveBeenCalledWith('getUserPermissions called without programId');
    });
  });

  describe('hasPermission', () => {
    test('returns true when user has permission', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['console.elections', 'console.user_management'],
        isAdmin: false
      });

      const result = await vm.runInContext('hasPermission("prog-1", "console.elections")', ctx);
      expect(result).toBe(true);
    });

    test('returns false when user lacks permission', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['console.elections'],
        isAdmin: false
      });

      const result = await vm.runInContext('hasPermission("prog-1", "console.user_management")', ctx);
      expect(result).toBe(false);
    });

    test('returns false when permissions cannot be loaded', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 403 });
      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      const result = await vm.runInContext('hasPermission("prog-1", "console.elections")', ctx);
      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    test('returns true when user has at least one permission', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['console.elections'],
        isAdmin: false
      });

      const result = await vm.runInContext('hasAnyPermission("prog-1", ["console.user_management", "console.elections"])', ctx);
      expect(result).toBe(true);
    });

    test('returns false when user has none of the permissions', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['console.audit_logs'],
        isAdmin: false
      });

      const result = await vm.runInContext('hasAnyPermission("prog-1", ["console.user_management", "console.elections"])', ctx);
      expect(result).toBe(false);
    });
  });

  describe('applyPermissions', () => {
    test('hides elements user lacks permission for', async () => {
      const element1 = {
        getAttribute: jest.fn(() => 'console.user_management'),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: {}
      };
      const element2 = {
        getAttribute: jest.fn(() => 'console.elections'),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: {}
      };
      const document = {
        querySelectorAll: jest.fn(() => [element1, element2])
      };

      const ctx = createContext({ document });
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['console.user_management'],
        isAdmin: false
      });

      const result = await vm.runInContext('applyPermissions("prog-1")', ctx);

      // element1 should be shown (has permission)
      expect(element1.classList.remove).toHaveBeenCalledWith('hidden');
      expect(element1.style.display).toBe('');

      // element2 should be hidden (lacks permission)
      expect(element2.classList.add).toHaveBeenCalledWith('hidden');
      expect(element2.style.display).toBe('none');

      expect(result.hasVisibleCards).toBe(true);
    });

    test('shows all elements for admin users', async () => {
      const element1 = {
        getAttribute: jest.fn(() => 'console.user_management'),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: {}
      };
      const element2 = {
        getAttribute: jest.fn(() => 'console.elections'),
        classList: { add: jest.fn(), remove: jest.fn() },
        style: {}
      };
      const document = {
        querySelectorAll: jest.fn(() => [element1, element2])
      };

      const ctx = createContext({ document });
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: [],
        isAdmin: true
      });

      const result = await vm.runInContext('applyPermissions("prog-1")', ctx);

      // Both elements should be shown (admin)
      expect(element1.classList.remove).toHaveBeenCalledWith('hidden');
      expect(element2.classList.remove).toHaveBeenCalledWith('hidden');
      expect(result.isAdmin).toBe(true);
    });

    test('tracks visible groups correctly', async () => {
      const elements = [
        { getAttribute: () => 'console.user_management', classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        { getAttribute: () => 'user_management.delegates', classList: { add: jest.fn(), remove: jest.fn() }, style: {} },
        { getAttribute: () => 'program_config.branding', classList: { add: jest.fn(), remove: jest.fn() }, style: {} }
      ];
      const document = { querySelectorAll: jest.fn(() => elements) };

      const ctx = createContext({ document });
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['console.user_management', 'user_management.delegates'],
        isAdmin: false
      });

      const result = await vm.runInContext('applyPermissions("prog-1")', ctx);

      expect(result.visibleGroups.console).toContain('console.user_management');
      expect(result.visibleGroups.user_management).toContain('user_management.delegates');
      expect(result.visibleGroups.program_config).toHaveLength(0);
    });

    test('warns and returns empty result when no programId', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      const result = await vm.runInContext('applyPermissions(null)', ctx);

      expect(ctx.console.warn).toHaveBeenCalled();
      expect(result.hasVisibleCards).toBe(false);
    });
  });

  describe('checkPageAccess', () => {
    test('returns true and does not redirect for admin users', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: [],
        isAdmin: true
      });

      const result = await vm.runInContext('checkPageAccess("prog-1", "user_management.")', ctx);

      expect(result).toBe(true);
      expect(ctx.window.location.href).toBe('');
    });

    test('returns true when user has matching permission', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['user_management.delegates', 'user_management.staff'],
        isAdmin: false
      });

      const result = await vm.runInContext('checkPageAccess("prog-1", "user_management.")', ctx);

      expect(result).toBe(true);
      expect(ctx.window.location.href).toBe('');
    });

    test('redirects when user lacks matching permissions', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: ['console.elections'],
        isAdmin: false
      });

      const result = await vm.runInContext('checkPageAccess("prog-1", "user_management.")', ctx);

      expect(result).toBe(false);
      expect(ctx.window.location.href).toBe('console.html');
    });

    test('redirects when permissions cannot be loaded', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 403 });
      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      const result = await vm.runInContext('checkPageAccess("prog-1", "user_management.")', ctx);

      expect(result).toBe(false);
      expect(ctx.window.location.href).toBe('console.html');
    });
  });

  describe('getUserRoleName', () => {
    test('returns role name from permissions data', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: [],
        isAdmin: false,
        roleName: 'Counselor'
      });

      const result = await vm.runInContext('getUserRoleName("prog-1")', ctx);
      expect(result).toBe('Counselor');
    });

    test('returns "No Role Assigned" when no role', async () => {
      const ctx = createContext();
      loadInContext(ctx);

      ctx._sessionStore['permissions_prog-1'] = JSON.stringify({
        permissions: [],
        isAdmin: false,
        roleName: null
      });

      const result = await vm.runInContext('getUserRoleName("prog-1")', ctx);
      expect(result).toBe('No Role Assigned');
    });

    test('returns "Unknown" when permissions cannot be loaded', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 403 });
      const ctx = createContext({ fetch: fetchMock });
      loadInContext(ctx);

      const result = await vm.runInContext('getUserRoleName("prog-1")', ctx);
      expect(result).toBe('Unknown');
    });
  });

  describe('window exports', () => {
    test('exposes functions on window object for browser', () => {
      const ctx = createContext();
      loadInContext(ctx);

      expect(typeof ctx.window.getUserPermissions).toBe('function');
      expect(typeof ctx.window.hasPermission).toBe('function');
      expect(typeof ctx.window.hasAnyPermission).toBe('function');
      expect(typeof ctx.window.applyPermissions).toBe('function');
      expect(typeof ctx.window.applyConsoleParentVisibility).toBe('function');
      expect(typeof ctx.window.checkPageAccess).toBe('function');
      expect(typeof ctx.window.clearPermissionsCache).toBe('function');
      expect(typeof ctx.window.getUserRoleName).toBe('function');
    });
  });
});
