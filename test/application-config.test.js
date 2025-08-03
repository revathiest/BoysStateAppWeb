describe('application-config.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { location: { search: '' } };
    global.localStorage = { getItem: jest.fn(() => null) };
    global.document = { addEventListener: jest.fn() };
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
    global.window = { API_URL: 'http://api.test', location: { search: '?programId=p1', origin: 'https://example.com' } };
    global.location = { origin: 'https://example.com' };
    global.document = {
      getElementById: id => elements[id] || (elements[id] = makeEl()),
      querySelectorAll: jest.fn(() => []),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; },
    };
    global.localStorage = { getItem: jest.fn(() => null) };
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        title: 'Title',
        description: 'Desc',
        questions: [{ type: 'dropdown', text: 'Q1', order: 1, options: ['a', 'b'] }],
      }),
    }));
    global.navigator = { clipboard: { writeText: jest.fn(() => Promise.resolve()) } };
    global.alert = jest.fn();

    require('../public/js/application-config.js');
    await ready();
    await Promise.resolve();

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
  });
});

