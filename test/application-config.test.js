describe('application-config.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { location: { search: '' } };
    global.localStorage = { getItem: jest.fn(() => null) };
    global.document = { addEventListener: jest.fn(), getElementById: jest.fn() };
  });

  test('getProgramId reads from query', () => {
    window.location.search = '?programId=xyz';
    const mod = require('../public/js/application-config.js');
    expect(mod.getProgramId()).toBe('xyz');
  });

  test('renderFieldTypeOptions marks selected', () => {
    const mod = require('../public/js/application-config.js');
    const html = mod.renderFieldTypeOptions('email');
    expect(html).toContain('<option value="email" selected>Email</option>');
  });

  test('loads existing application and renders builder', async () => {
    jest.resetModules();
    let ready;
    const elements = {};
    const handlers = {};
    const makeEl = () => ({
      innerHTML: '',
      value: '',
      style: {},
      addEventListener: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      dataset: {},
      onclick: null,
      onsubmit: null,
      select: jest.fn(),
      setSelectionRange: jest.fn(),
      disabled: false,
      textContent: '',
      classList: { add: jest.fn(), remove: jest.fn() },
    });
    const builderRoot = makeEl();
    builderRoot.querySelectorAll = sel => {
      switch (sel) {
        case 'input[data-idx]':
          return [{ dataset: { idx: '0' }, value: '', addEventListener: (e, fn) => { handlers.inputIdx = fn; } }];
        case 'select[data-type-idx]':
          return [{ dataset: { typeIdx: '0' }, value: 'short_answer', addEventListener: (e, fn) => { handlers.typeChange = fn; } }];
        case 'input[data-required-idx]':
          return [{ dataset: { requiredIdx: '0' }, checked: false, addEventListener: (e, fn) => { handlers.reqChange = fn; } }];
        case 'button[data-remove]':
          return [{ dataset: { remove: '0' }, addEventListener: (e, fn) => { handlers.removeQuestion = fn; } }];
        case 'button[data-remove-opt]':
          return [{ dataset: { qidx: '0', removeOpt: '0' }, addEventListener: (e, fn) => { handlers.removeOpt = fn; } }];
        case 'button[data-add-opt]':
          return [{ dataset: { addOpt: '0' }, addEventListener: (e, fn) => { handlers.addOpt = fn; } }];
        case 'input[data-optidx]':
          return [{ dataset: { qidx: '0', optidx: '0' }, value: 'a', addEventListener: (e, fn) => { handlers.editOpt = fn; } }];
        case 'input[data-file-accept]':
          return [{ dataset: { fileAccept: '0' }, value: '', addEventListener: (e, fn) => { handlers.fileAccept = fn; } }];
        case 'input[data-file-maxfiles]':
          return [{ dataset: { fileMaxfiles: '0' }, value: '1', addEventListener: (e, fn) => { handlers.fileMax = fn; } }];
        default:
          return [];
      }
    };
    elements['application-builder-root'] = builderRoot;
    elements['add-opt-0'] = { value: 'c' };
    elements['publicApplicationUrl'] = makeEl();
    elements['copyStatus'] = makeEl();
    elements['create-application-form'] = makeEl();
    elements['create-form-card'] = makeEl();
    elements['year-select'] = makeEl();
    elements['type-select'] = makeEl();
    elements['create-new-application'] = makeEl();
    elements['new-application-form'] = makeEl();
    elements['new-app-year'] = makeEl();
    elements['new-app-type'] = makeEl();
    elements['copy-from-year'] = makeEl();
    elements['cancel-new-app'] = makeEl();
    elements['errorBox'] = makeEl();
    elements['successBox'] = makeEl();
    elements['current-selection'] = makeEl();
    elements['no-app-message'] = makeEl();
    elements['create-app-submit'] = makeEl();
    elements['year-error'] = makeEl();
    global.window = { API_URL: 'http://api.test', location: { search: '?programId=p1', origin: 'https://example.com' } };
    global.location = { origin: 'https://example.com' };
    elements['saveBtn'] = makeEl();
    global.document = {
      getElementById: id => elements[id] || (elements[id] = makeEl()),
      querySelectorAll: jest.fn(() => []),
      querySelector: sel => (sel === '#application-builder-form button[type="submit"]' ? elements['saveBtn'] : makeEl()),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; },
    };
    global.localStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn()
      // GET years
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ year: 2024 }]) })
      // GET application for year/type
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          title: 'Title',
          description: 'Desc',
          questions: [{ type: 'dropdown', text: 'Q1', order: 1, options: ['a', 'b'] }],
        }),
      })
      // Check existing application for delegate (when creating new year)
      .mockResolvedValueOnce({ ok: true })
      // Check existing application for staff (when creating new year)
      .mockResolvedValueOnce({ ok: false })
      // PUT save
      .mockResolvedValue({ ok: true });
    global.navigator = { clipboard: { writeText: jest.fn(() => Promise.resolve()) } };

    require('../public/js/application-config.js');
    await ready();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    expect(global.fetch.mock.calls[1][0]).toBe('http://api.test/api/programs/p1/application?year=2024&type=delegate');

    handlers.inputIdx({ target: { value: 'New' } });
    handlers.reqChange({});
    handlers.removeOpt({});
    handlers.addOpt({});
    handlers.editOpt({ target: { value: 'Edited' } });
    handlers.fileAccept({ target: { value: '.doc' } });
    handlers.fileMax({ target: { value: '2' } });
    handlers.typeChange({});
    handlers.removeQuestion({});

    document.getElementById('add-question-btn').onclick();
    document.getElementById('copyLinkBtn').onclick();
    await document.getElementById('application-builder-form').onsubmit({ preventDefault: jest.fn() });

    expect(global.fetch).toHaveBeenCalled();
    expect(elements['publicApplicationUrl'].value).toContain('apply.html?programId=p1');
    expect(elements['publicApplicationUrl'].value).not.toContain('year=');
    expect(elements['publicApplicationUrl'].value).not.toContain('type=');
    const token = new URL(elements['publicApplicationUrl'].value).searchParams.get('token');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    expect(decoded).toEqual({ year: 2024, type: 'delegate' });

    await new Promise(r => setTimeout(r, 0));

    const newAppClick = elements['create-new-application'].addEventListener.mock.calls.find(([ev]) => ev === 'click')[1];
    await newAppClick();
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch.mock.calls[3][1].method).toBe('HEAD');
    expect(global.fetch.mock.calls[4][1].method).toBe('HEAD');

    const yearInputHandler = elements['new-app-year'].addEventListener.mock.calls.find(([ev]) => ev === 'input')[1];
    elements['new-app-year'].value = '2025';
    yearInputHandler();
    expect(elements['copy-from-year'].innerHTML).not.toBe('');
    expect(elements['create-app-submit'].disabled).toBe(false);

    elements['new-app-year'].value = '';
    yearInputHandler();
    expect(elements['year-error'].textContent).toBe('Year required');
    expect(elements['create-app-submit'].disabled).toBe(true);
  });

  test('createOrCopyApplication creates year and copies from previous', async () => {
    const { createOrCopyApplication } = require('../public/js/application-config.js');
    global.window = { API_URL: 'http://api.test' };
    const fetchMock = jest.fn()
      // GET years (missing desired year)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ year: 2024 }]) })
      // POST create year
      .mockResolvedValueOnce({ ok: true })
      // GET application check (not found)
      .mockResolvedValueOnce({ ok: false })
      // GET previous application
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: 'Old', description: 'D', questions: [{ id: 1, type: 'short_answer', text: 'Q' }] }),
      })
      // POST create application
      .mockResolvedValueOnce({ ok: true });

    await createOrCopyApplication({ programId: 'p1', year: 2025, type: 'delegate', copyFromYear: 2024, fetchFn: fetchMock });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const body = JSON.parse(fetchMock.mock.calls[4][1].body);
    expect(body.year).toBe(2025);
    expect(body.questions[0].id).toBeUndefined();
  });

  test('createOrCopyApplication prevents duplicates', async () => {
    const { createOrCopyApplication } = require('../public/js/application-config.js');
    global.window = { API_URL: 'http://api.test' };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ year: 2025 }]) })
      .mockResolvedValueOnce({ ok: true });

    await expect(createOrCopyApplication({ programId: 'p1', year: 2025, type: 'delegate', fetchFn: fetchMock }))
      .rejects.toThrow('Application for this year and type already exists');
  });

  test('createOrCopyApplication creates without copy when year exists', async () => {
    const { createOrCopyApplication } = require('../public/js/application-config.js');
    global.window = { API_URL: 'http://api.test' };
    const fetchMock = jest.fn()
      // GET years (contains desired year)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ year: 2025 }]) })
      // GET application check (not found)
      .mockResolvedValueOnce({ ok: false })
      // POST create application
      .mockResolvedValueOnce({ ok: true });

    await createOrCopyApplication({ programId: 'p1', year: 2025, type: 'staff', fetchFn: fetchMock });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(body.type).toBe('staff');
    expect(body.questions).toEqual([]);
  });

  test('createOrCopyApplication handles missing previous year', async () => {
    const { createOrCopyApplication } = require('../public/js/application-config.js');
    global.window = { API_URL: 'http://api.test' };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ year: 2024 }]) }) // years
      .mockResolvedValueOnce({ ok: true }) // post create year
      .mockResolvedValueOnce({ ok: false }) // check not found
      .mockResolvedValueOnce({ ok: false }) // previous year missing
      .mockResolvedValueOnce({ ok: true }); // post create

    await createOrCopyApplication({ programId: 'p1', year: 2025, type: 'delegate', copyFromYear: 2024, fetchFn: fetchMock });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const body = JSON.parse(fetchMock.mock.calls[4][1].body);
    expect(body.questions).toEqual([]);
  });

  test('createOrCopyApplication handles year fetch failure', async () => {
    const { createOrCopyApplication } = require('../public/js/application-config.js');
    global.window = { API_URL: 'http://api.test' };
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('fail')) // years fetch fails
      .mockResolvedValueOnce({ ok: true }) // post create year
      .mockResolvedValueOnce({ ok: false }) // check not found
      .mockResolvedValueOnce({ ok: true }); // post create

    await createOrCopyApplication({ programId: 'p1', year: 2025, type: 'delegate', fetchFn: fetchMock });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

