describe('apply.js', () => {
  test('initializes form when programId present', async () => {
    jest.resetModules();
    let ready;
    const form = { onsubmit: null, innerHTML: '' };
    const formStatus = {};
    global.document = {
      getElementById: id => (id === 'applicationForm' ? form : id === 'formStatus' ? formStatus : { innerHTML: '' }),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; }
    };
    global.getApplicationParams = jest.fn().mockReturnValue({ programId: 'abc', year: '2024', type: 'delegate' });
    global.fetchApplicationConfig = jest.fn().mockResolvedValue({ questions: [] });
    global.renderApplicationForm = jest.fn();
    global.addValidationListeners = jest.fn();
    global.handleFormSubmit = jest.fn();

    require('../public/js/apply.js');
    await ready();

    expect(global.fetchApplicationConfig).toHaveBeenCalledWith('abc', '2024', 'delegate');
    expect(global.renderApplicationForm).toHaveBeenCalled();
    expect(global.addValidationListeners).toHaveBeenCalled();
    expect(typeof form.onsubmit).toBe('function');
  });

  test('shows message when programId missing', async () => {
    jest.resetModules();
    let ready;
    const form = { innerHTML: '' };
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
    jest.resetModules();
    let ready;
    const form = { innerHTML: '' };
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
});

