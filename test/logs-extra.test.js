const path = require('path');
const fs = require('fs');
const vm = require('vm');

beforeEach(() => {
  jest.resetModules();
});

function loadModule(context){
  const code = fs.readFileSync(path.join(__dirname,'../public/js/logs.js'),'utf8');
  const helper = fs.readFileSync(path.join(__dirname,'../public/js/authHelper.js'),'utf8');
  vm.createContext(context);
  vm.runInContext('var window = globalThis.window; var sessionStorage = globalThis.sessionStorage;\n'+helper, context);
  vm.runInContext(code, context);
  return context;
}

test('getFilters converts values and trims search', () => {
  const startEl = { value: '2023-01-01' };
  const endEl = { value: '2023-01-02' };
  const doc = {
    getElementById: jest.fn(id => {
      switch(id){
        case 'level': return { value: 'warn' };
        case 'source': return { value: 'server' };
        case 'start': return startEl;
        case 'end': return endEl;
        case 'search': return { value: ' test ' };
        case 'programId': return { value: 'p1' };
        case 'apply':
        case 'filters':
          return { addEventListener: jest.fn() };
        default: return { addEventListener: jest.fn(), value:'' };
      }
    }),
    querySelector: jest.fn(() => ({ innerHTML:'', appendChild: jest.fn() })),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn()
  };
  const ctx = {
    window: { API_URL:'http://api' },
    document: doc,
    fetch: jest.fn(),
    console: { log: jest.fn(), error: jest.fn() },
    sessionStorage: {},
    URLSearchParams,
    alert: jest.fn()
  };
  loadModule(ctx);
  const filters = ctx.getFilters();
  const expectedStart = new Date('2023-01-01T00:00:00').toISOString();
  const expectedEnd = new Date('2023-01-02T23:59:59').toISOString();
  expect(filters.start).toBe(expectedStart);
  expect(filters.end).toBe(expectedEnd);
  expect(filters.level).toBe('warn');
  expect(filters.source).toBe('server');
  expect(filters.search).toBe('test');
});

test('loadPrograms handles non-ok response', async () => {
  const doc = {
    getElementById: jest.fn(id => ({ addEventListener: jest.fn(), innerHTML:'', appendChild: jest.fn() })),
    querySelector: jest.fn(() => ({ innerHTML:'', appendChild: jest.fn() })),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok:false });
  const ctx = {
    window:{ API_URL:'http://api.test' },
    document: doc,
    fetch: fetchMock,
    console:{ log: jest.fn(), error: jest.fn() },
    sessionStorage:{ getItem: ()=>'t' },
    alert: jest.fn()
  };
  loadModule(ctx);
  const res = await ctx.loadPrograms();
  expect(res).toEqual([]);
});

test('fetchLogs handles server error', async () => {
  const tbody = { innerHTML:'', appendChild: jest.fn() };
  const pager = { innerHTML:'', appendChild: jest.fn() };
  const doc = {
    querySelector: jest.fn(() => tbody),
    getElementById: jest.fn(id => {
      if(id==='pager') return pager;
      return { value:'p1', addEventListener: jest.fn() };
    }),
    createElement: jest.fn(() => ({ setAttribute: jest.fn() })),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok:false, status:500 });
  const ctx = {
    window:{ API_URL:'http://api.test', logToServer: jest.fn(), location:{ href:'' } },
    document: doc,
    fetch: fetchMock,
    console:{ log: jest.fn(), error: jest.fn() },
    URLSearchParams,
    sessionStorage:{ getItem: ()=>'abc' },
    alert: jest.fn()
  };
  loadModule(ctx);
  await ctx.fetchLogs({ programId:'p1' });
  expect(fetchMock).toHaveBeenCalled();
  expect(pager.appendChild).not.toHaveBeenCalled();
});

test('loadPrograms populates selector on success', async () => {
  const select = { innerHTML:'', appendChild: jest.fn() };
  const applyBtn = { addEventListener: jest.fn() };
  const filtersForm = { addEventListener: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'apply') return applyBtn;
      if (id === 'filters') return filtersForm;
      return select;
    }),
    querySelector: jest.fn(() => ({ innerHTML:'', appendChild: jest.fn() })),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({ value:'', textContent:'', appendChild: jest.fn() }))
  };
  const programs = [{ programId:'1', programName:'P1' }, { programId:'2', programName:'P2' }];
  const fetchMock = jest.fn().mockResolvedValue({ ok:true, json: async () => ({ programs }) });
  const ctx = {
    window:{ API_URL:'http://api.test' },
    document: doc,
    fetch: fetchMock,
    console:{ log: jest.fn(), error: jest.fn() },
    sessionStorage:{ getItem: ()=>'user1' },
    alert: jest.fn()
  };
  loadModule(ctx);
  const res = await ctx.loadPrograms();
  expect(res.length).toBe(2);
  expect(select.appendChild).toHaveBeenCalledTimes(2);
});

test('fetchLogs redirects on unauthorized', async () => {
  const tbody = { innerHTML:'', appendChild: jest.fn() };
  const pager = { innerHTML:'', appendChild: jest.fn() };
  const doc = {
    querySelector: jest.fn(() => tbody),
    getElementById: jest.fn(id => { if(id==='pager') return pager; return { value:'p1', addEventListener: jest.fn() }; }),
    createElement: jest.fn(() => ({ setAttribute: jest.fn(), appendChild: jest.fn(), textContent:'' })),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockResolvedValue({ ok:false, status:401 });
  const ctx = {
    window:{ API_URL:'http://api.test', logToServer: jest.fn(), location:{ href:'' } },
    document: doc,
    fetch: fetchMock,
    console:{ log: jest.fn(), error: jest.fn() },
    URLSearchParams,
    sessionStorage:{ getItem: ()=>'abc' },
    alert: jest.fn()
  };
  loadModule(ctx);
  await ctx.fetchLogs({ programId:'p1' });
  expect(ctx.window.location.href).toBe('login.html');
});

test('getFilters returns undefined for level and source when set to all', () => {
  const doc = {
    getElementById: jest.fn(id => {
      switch(id){
        case 'level': return { value: 'all' };
        case 'source': return { value: 'all' };
        case 'start': return { value: '' };
        case 'end': return { value: '' };
        case 'search': return { value: '' };
        case 'programId': return { value: 'p1' };
        case 'apply':
        case 'filters':
          return { addEventListener: jest.fn() };
        default: return { addEventListener: jest.fn(), value:'' };
      }
    }),
    querySelector: jest.fn(() => ({ innerHTML:'', appendChild: jest.fn() })),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn()
  };
  const ctx = {
    window: { API_URL:'http://api' },
    document: doc,
    fetch: jest.fn(),
    console: { log: jest.fn(), error: jest.fn() },
    sessionStorage: {},
    URLSearchParams,
    alert: jest.fn()
  };
  loadModule(ctx);
  const filters = ctx.getFilters();
  // When level and source are 'all', they should be undefined
  expect(filters.level).toBeUndefined();
  expect(filters.source).toBeUndefined();
});

test('loadPrograms uses program.name and program.id fallbacks', async () => {
  const select = { innerHTML:'', appendChild: jest.fn() };
  const doc = {
    getElementById: jest.fn(id => {
      if (id === 'apply' || id === 'filters') return { addEventListener: jest.fn() };
      if (id === 'programId') return select;
      return { addEventListener: jest.fn(), value: '' };
    }),
    querySelector: jest.fn(() => ({ innerHTML:'', appendChild: jest.fn() })),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({ value:'', textContent:'' }))
  };
  // Programs with only name and id (not programName and programId)
  const programs = [{ id:'id1', name:'Name1' }, { id:'id2', name:'Name2' }];
  const fetchMock = jest.fn().mockResolvedValue({ ok:true, json: async () => ({ programs }) });
  const ctx = {
    window:{ API_URL:'http://api.test' },
    document: doc,
    fetch: fetchMock,
    console:{ log: jest.fn(), error: jest.fn() },
    sessionStorage:{ getItem: ()=>'user1' },
    alert: jest.fn()
  };
  loadModule(ctx);
  const res = await ctx.loadPrograms();
  expect(res.length).toBe(2);
  expect(select.appendChild).toHaveBeenCalledTimes(2);
});

test('fetchLogs error handling without logToServer', async () => {
  const tbody = { innerHTML:'', appendChild: jest.fn() };
  const pager = { innerHTML:'', appendChild: jest.fn() };
  const doc = {
    querySelector: jest.fn(() => tbody),
    getElementById: jest.fn(id => {
      if(id==='pager') return pager;
      return { value:'p1', addEventListener: jest.fn() };
    }),
    createElement: jest.fn(() => ({ setAttribute: jest.fn() })),
    addEventListener: jest.fn()
  };
  const fetchMock = jest.fn().mockRejectedValue(new Error('Network error'));
  const ctx = {
    window:{ API_URL:'http://api.test', location:{ href:'' } }, // no logToServer
    document: doc,
    fetch: fetchMock,
    console:{ log: jest.fn(), error: jest.fn() },
    URLSearchParams,
    sessionStorage:{ getItem: ()=>'abc' },
    alert: jest.fn()
  };
  loadModule(ctx);
  await ctx.fetchLogs({ programId:'p1' });
  // Should render empty logs on error
  expect(tbody.innerHTML).toContain('No logs');
});
