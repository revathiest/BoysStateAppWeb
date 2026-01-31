describe('apply.js', () => {
  beforeEach(() => {
    jest.resetModules();
    // Clear globals
    delete global.window;
    delete global.document;
    delete global.console;
    delete global.getApplicationParams;
    delete global.fetchApplicationConfig;
    delete global.renderApplicationForm;
    delete global.addValidationListeners;
    delete global.handleFormSubmit;
    delete global.initAddressHelpers;
  });

  test('initializes form when programId present', async () => {
    let ready;
    const form = { onsubmit: null, innerHTML: '' };
    const formStatus = {};

    // Set up all globals BEFORE require (module has top-level code)
    global.window = { location: { href: 'http://test.com?programId=abc' } };
    global.console = { log: jest.fn(), error: jest.fn() };
    global.document = {
      getElementById: id => (id === 'applicationForm' ? form : id === 'formStatus' ? formStatus : { innerHTML: '' }),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; }
    };
    global.getApplicationParams = jest.fn().mockReturnValue({ programId: 'abc', year: '2024', type: 'delegate' });
    global.fetchApplicationConfig = jest.fn().mockResolvedValue({ questions: [] });
    global.renderApplicationForm = jest.fn();
    global.addValidationListeners = jest.fn();
    global.handleFormSubmit = jest.fn();
    global.initAddressHelpers = jest.fn();

    require('../public/js/apply.js');
    await ready();

    expect(global.fetchApplicationConfig).toHaveBeenCalledWith('abc', '2024', 'delegate');
    expect(global.renderApplicationForm).toHaveBeenCalled();
    expect(global.addValidationListeners).toHaveBeenCalled();
    expect(typeof form.onsubmit).toBe('function');
  });

  test('shows message when programId missing', async () => {
    let ready;
    const form = { innerHTML: '' };

    // Set up all globals BEFORE require
    global.window = { location: { href: 'http://test.com' } };
    global.console = { log: jest.fn(), error: jest.fn() };
    global.document = {
      getElementById: id => (id === 'applicationForm' ? form : { innerHTML: '' }),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; }
    };
    global.getApplicationParams = jest.fn().mockReturnValue({ programId: '', year: '', type: '' });

    require('../public/js/apply.js');
    await ready();
    expect(form.innerHTML).toContain('No program selected');
  });

  test('shows error when config fetch fails', async () => {
    let ready;
    const form = { innerHTML: '' };

    // Set up all globals BEFORE require
    global.window = { location: { href: 'http://test.com?programId=abc' } };
    global.console = { log: jest.fn(), error: jest.fn() };
    global.document = {
      getElementById: id => (id === 'applicationForm' ? form : { innerHTML: '' }),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; }
    };
    global.getApplicationParams = jest.fn().mockReturnValue({ programId: 'abc', year: '2024', type: 'delegate' });
    global.fetchApplicationConfig = jest.fn().mockRejectedValue(new Error('fail'));
    global.renderApplicationForm = jest.fn();
    global.addValidationListeners = jest.fn();
    global.handleFormSubmit = jest.fn();

    require('../public/js/apply.js');
    await ready();
    expect(form.innerHTML).toContain('Could not load application');
  });

  test('form.onsubmit calls handleFormSubmit', async () => {
    let ready;
    const form = { onsubmit: null, innerHTML: '' };
    const formStatus = {};
    const mockEvent = { preventDefault: jest.fn() };
    const config = { questions: [] };

    global.window = { location: { href: 'http://test.com?programId=abc' } };
    global.console = { log: jest.fn(), error: jest.fn() };
    global.document = {
      getElementById: id => (id === 'applicationForm' ? form : id === 'formStatus' ? formStatus : { innerHTML: '' }),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; }
    };
    global.getApplicationParams = jest.fn().mockReturnValue({ programId: 'abc', year: '2024', type: 'delegate' });
    global.fetchApplicationConfig = jest.fn().mockResolvedValue(config);
    global.renderApplicationForm = jest.fn();
    global.addValidationListeners = jest.fn();
    global.handleFormSubmit = jest.fn().mockResolvedValue(undefined);
    global.initAddressHelpers = jest.fn();

    require('../public/js/apply.js');
    await ready();

    // Now invoke the onsubmit handler
    expect(form.onsubmit).toBeDefined();
    await form.onsubmit(mockEvent);
    expect(global.handleFormSubmit).toHaveBeenCalledWith(mockEvent, form, config, formStatus);
  });

  test('initAddressHelpers failure is caught silently', async () => {
    let ready;
    const form = { onsubmit: null, innerHTML: '' };
    const formStatus = {};

    global.window = { location: { href: 'http://test.com?programId=abc' } };
    global.console = { log: jest.fn(), error: jest.fn() };
    global.document = {
      getElementById: id => (id === 'applicationForm' ? form : id === 'formStatus' ? formStatus : { innerHTML: '' }),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; }
    };
    global.getApplicationParams = jest.fn().mockReturnValue({ programId: 'abc', year: '2024', type: 'delegate' });
    global.fetchApplicationConfig = jest.fn().mockResolvedValue({ questions: [] });
    global.renderApplicationForm = jest.fn();
    global.addValidationListeners = jest.fn();
    global.handleFormSubmit = jest.fn();
    global.initAddressHelpers = jest.fn().mockImplementation(() => { throw new Error('init failed'); });

    require('../public/js/apply.js');
    // Should not throw
    await ready();
    expect(global.initAddressHelpers).toHaveBeenCalled();
    expect(form.onsubmit).toBeDefined();
  });
});
