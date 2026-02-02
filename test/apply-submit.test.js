const { handleFormSubmit } = require('../public/js/apply-submit.js');

describe('handleFormSubmit', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    global.getProgramId = jest.fn().mockReturnValue('p1');
    global.getApplicationParams = jest.fn().mockReturnValue({ programId: 'p1', year: 2025, type: 'delegate' });
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
    const form = { q_1: { value: 'A' }, reset: jest.fn(), style: {} };
    const formStatus = { textContent: '', innerHTML: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = { questions: [{ id: 1, type: 'short_answer', text: 'Name', required: true }] };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/application/responses'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(formStatus.innerHTML).toContain('Application Submitted Successfully');
    expect(form.style.display).toBe('none');
  });

  test('includes address answers in payload', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    const form = {
      q_addr_line1: { value: '123 Main St' },
      q_addr_line2: { value: 'Apt 4' },
      q_addr_city: { value: 'Springfield' },
      q_addr_state: { value: 'IL' },
      q_addr_zip: { value: '62704' },
      reset: jest.fn(),
      style: {}
    };
    const formStatus = { textContent: '', innerHTML: '', classList: { remove: jest.fn(), add: jest.fn() } };
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
      reset: jest.fn(),
      style: {}
    };
    const formStatus = { textContent: '', innerHTML: '', classList: { remove: jest.fn(), add: jest.fn() } };
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
      reset: jest.fn(),
      style: {}
    };
    const optConfig = { questions: config.questions.map(q => ({ ...q, required: false })) };
    await handleFormSubmit({ preventDefault(){} }, optForm, optConfig, formStatus);
    expect(global.fetch).toHaveBeenCalled();
  });

  test('validates date_range when start is after end', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    const form = {
      q_range_start: { value: '2024-12-31' },
      q_range_end: { value: '2024-01-01' },
      reset: jest.fn(),
      style: {}
    };
    const formStatus = { textContent: '', innerHTML: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = {
      questions: [{ id: 'range', type: 'date_range', text: 'Date Range', required: false }]
    };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(formStatus.textContent).toContain('Start date cannot be after end date');
  });

  test('validates file when exceeds maxFiles', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    const form = {
      q_file: { files: [{ name: 'f1' }, { name: 'f2' }, { name: 'f3' }] },
      reset: jest.fn(),
      style: {}
    };
    const formStatus = { textContent: '', innerHTML: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = {
      questions: [{ id: 'file', type: 'file', text: 'Upload', required: false, maxFiles: 2 }]
    };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(formStatus.textContent).toContain('up to 2 file(s)');
  });

  test('handles submission failure with server error', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const form = {
      q_1: { value: 'A' },
      reset: jest.fn(),
      style: {}
    };
    const formStatus = { textContent: '', innerHTML: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = { questions: [{ id: 1, type: 'short_answer', text: 'Name', required: false }] };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(formStatus.textContent).toContain('Submission failed');
    expect(formStatus.classList.add).toHaveBeenCalledWith('text-red-700');
  });

  test('handles submission failure with network error', async () => {
    global.validateField = jest.fn().mockReturnValue(true);
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    const form = {
      q_1: { value: 'A' },
      reset: jest.fn(),
      style: {}
    };
    const formStatus = { textContent: '', innerHTML: '', classList: { remove: jest.fn(), add: jest.fn() } };
    const config = { questions: [{ id: 1, type: 'short_answer', text: 'Name', required: false }] };
    await handleFormSubmit({ preventDefault(){} }, form, config, formStatus);
    expect(formStatus.textContent).toContain('Submission failed');
    expect(formStatus.classList.add).toHaveBeenCalledWith('text-red-700');
  });
});

