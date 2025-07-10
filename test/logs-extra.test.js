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
