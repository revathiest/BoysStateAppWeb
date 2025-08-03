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

  test('includes address answers in payload', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    const form = {
      q_addr_line1: { value: '123 Main St' },
      q_addr_line2: { value: 'Apt 4' },
      q_addr_city: { value: 'Springfield' },
      q_addr_state: { value: 'IL' },
      q_addr_zip: { value: '62704' },
      reset: jest.fn()
    };
    const formStatus = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = { questions: [{ id: 'addr', type: 'address', text: 'Address', required: true }] };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(global.fetch).toHaveBeenCalled();
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      answers: [
        {
          questionId: 'addr',
          value: {
            line1: '123 Main St',
            line2: 'Apt 4',
            city: 'Springfield',
            state: 'IL',
            zip: '62704'
          }
        }
      ]
    });
  });

  test('handles multiple question types and validations', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    const form = {
      q_short: { value: '' },
      q_email: { value: 'bad' },
      q_number: { value: '' },
      q_phone: { value: 'abc' },
      q_dropdown: { value: '' },
      q_date: { value: '' },
      q_range_start: { value: '' },
      q_range_end: { value: '' },
      q_file: { files: [] },
      q_bool: { checked: false },
      q_addr_line1: { value: '' },
      q_addr_city: { value: '' },
      q_addr_state: { value: '' },
      q_addr_zip: { value: '' },
      querySelectorAll: jest.fn().mockReturnValue([]),
      querySelector: jest.fn().mockReturnValue(null),
      reset: jest.fn()
    };
    const formStatus = { textContent: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = {
      questions: [
        { id: 'short', type: 'short_answer', text: 'Short', required: true },
        { id: 'email', type: 'email', text: 'Email', required: true },
        { id: 'number', type: 'number', text: 'Number', required: true },
        { id: 'phone', type: 'phone', text: 'Phone', required: true },
        { id: 'check', type: 'checkbox', text: 'Check', required: true },
        { id: 'radio', type: 'radio', text: 'Radio', required: true },
        { id: 'dropdown', type: 'dropdown', text: 'Dropdown', required: true },
        { id: 'date', type: 'date', text: 'Date', required: true },
        { id: 'range', type: 'date_range', text: 'Range', required: true },
        { id: 'file', type: 'file', text: 'File', required: true },
        { id: 'bool', type: 'boolean', text: 'Bool', required: true },
        { id: 'addr', type: 'address', text: 'Addr', required: true }
      ]
    };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(formStatus.textContent).toContain('Please');

    // Now test optional fields to cover false branches
    const optForm = {
      q_short: { value: 'a' },
      q_email: { value: 'test@example.com' },
      q_number: { value: '1' },
      q_phone: { value: '(123) 456-7890' },
      q_dropdown: { value: 'x' },
      q_date: { value: '2024-01-01' },
      q_range_start: { value: '2024-01-01' },
      q_range_end: { value: '2024-01-02' },
      q_file: { files: [{ name: 'f' }] },
      q_bool: { checked: true },
      q_addr_line1: { value: 'l1' },
      q_addr_city: { value: 'c' },
      q_addr_state: { value: 's' },
      q_addr_zip: { value: 'z' },
      querySelectorAll: jest.fn().mockReturnValue([{ value: 'v', checked: true }]),
      querySelector: jest.fn().mockReturnValue({ value: 'v' }),
      reset: jest.fn()
    };
    const optConfig = { questions: config.questions.map(q => ({ ...q, required: false })) };
    await handleFormSubmit({ preventDefault(){} }, optForm, optConfig, formStatus);
    expect(global.fetch).toHaveBeenCalled();
  });
});

