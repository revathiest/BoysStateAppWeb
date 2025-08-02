describe('apply.js', () => {
  test('initializes form when programId present', async () => {
    let ready;
    const form = { onsubmit: null, innerHTML: '' };
    const formStatus = {};
    global.document = {
      getElementById: id => (id === 'applicationForm' ? form : id === 'formStatus' ? formStatus : { innerHTML: '' }),
      addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') ready = fn; }
    };
    global.getProgramId = jest.fn().mockReturnValue('abc');
    global.fetchApplicationConfig = jest.fn().mockResolvedValue({ questions: [] });
    global.renderApplicationForm = jest.fn();
    global.addValidationListeners = jest.fn();
    global.handleFormSubmit = jest.fn();

    require('../public/js/apply.js');
    await ready();

    expect(global.fetchApplicationConfig).toHaveBeenCalledWith('abc');
    expect(global.renderApplicationForm).toHaveBeenCalled();
    expect(global.addValidationListeners).toHaveBeenCalled();
    expect(typeof form.onsubmit).toBe('function');
  });
});

