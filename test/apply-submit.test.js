const { handleFormSubmit } = require('../public/js/apply-submit.js');

describe('handleFormSubmit', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    global.getProgramId = jest.fn().mockReturnValue('p1');
    global.window = { API_URL: 'http://api.test' };
  });

  test('shows error when validation fails', async () => {
    global.validateField = jest.fn().mockReturnValue(false);
    const form = { };
    const formStatus = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = { questions: [{ id: 1, type: 'short_answer', text: 'Name', required: true }] };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(formStatus.textContent).toContain('Please fix errors');
  });

  test('submits when valid', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    const form = { q_1: { value: 'A' }, reset: jest.fn() };
    const formStatus = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = { questions: [{ id: 1, type: 'short_answer', text: 'Name', required: true }] };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/application/responses'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(formStatus.textContent).toContain('Application submitted');
    expect(form.reset).toHaveBeenCalled();
  });
});

