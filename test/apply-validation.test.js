const { validateField, addValidationListeners, formatPhoneNumber } = require('../public/js/apply-validation.js');

describe('validateField', () => {
  beforeEach(() => {
    global.document = { getElementById: jest.fn(() => ({ textContent: '' })) };
  });

  afterEach(() => {
    delete global.document;
  });

  test('flags missing required short answer', () => {
    const q = { id: 1, type: 'short_answer', required: true };
    const form = { q_1: { value: '' } };
    const valid = validateField(q, form);
    expect(valid).toBe(false);
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
    expect(document.getElementById.mock.results[0].value.textContent).toBe('This field is required.');
  });

  test('accepts filled short answer', () => {
    const q = { id: 1, type: 'short_answer', required: true };
    const errEl = { textContent: 'old' };
    document.getElementById = jest.fn(() => errEl);
    const form = { q_1: { value: 'text' } };
    const valid = validateField(q, form);
    expect(valid).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('accepts valid email and clears error', () => {
    const q = { id: 2, type: 'email', required: true };
    const errEl = { textContent: 'old' };
    document.getElementById = jest.fn(() => errEl);
    const form = { q_2: { value: 'test@example.com' } };
    const valid = validateField(q, form);
    expect(valid).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('rejects invalid email', () => {
    const q = { id: 3, type: 'email', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    const form = { q_3: { value: 'invalid' } };
    const valid = validateField(q, form);
    expect(valid).toBe(false);
    expect(errEl.textContent).toBe('Please enter a valid email address.');
  });

  test('validates number fields', () => {
    const q = { id: 4, type: 'number', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { q_4: { value: '' } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please enter a valid number.');
    errEl.textContent = '';
    form = { q_4: { value: '42' } };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates phone numbers', () => {
    const q = { id: 5, type: 'phone', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { q_5: { value: 'abc' } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please enter a valid phone number.');
    errEl.textContent = '';
    form = { q_5: { value: '(123) 456-7890' } };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates optional phone numbers when provided', () => {
    const q = { id: 15, type: 'phone', required: false };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    const form = { q_15: { value: '123' } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please enter a valid phone number.');
  });

  test('validates checkboxes', () => {
    const q = { id: 6, type: 'checkbox', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { querySelectorAll: jest.fn(() => []) };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please check at least one option.');
    errEl.textContent = '';
    form = { querySelectorAll: jest.fn(() => [1]) };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates radio buttons', () => {
    const q = { id: 7, type: 'radio', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { querySelector: jest.fn(() => null) };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please select an option.');
    errEl.textContent = '';
    form = { querySelector: jest.fn(() => ({ })) };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates dropdowns', () => {
    const q = { id: 8, type: 'dropdown', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { q_8: { value: '' } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please select an option.');
    errEl.textContent = '';
    form = { q_8: { value: 'x' } };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('formats phone numbers', () => {
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    expect(formatPhoneNumber('(123)4567890')).toBe('(123) 456-7890');
  });

  test('validates dates', () => {
    const q = { id: 9, type: 'date', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { q_9: { value: '' } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please select a date.');
    errEl.textContent = '';
    form = { q_9: { value: '2024-01-01' } };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates date ranges', () => {
    const q = { id: 10, type: 'date_range', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { q_10_start: { value: '' }, q_10_end: { value: '' } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please select both start and end dates.');
    errEl.textContent = '';
    form = { q_10_start: { value: '2024-01-02' }, q_10_end: { value: '2024-01-01' } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Start date cannot be after end date.');
    errEl.textContent = '';
    form = { q_10_start: { value: '2024-01-01' }, q_10_end: { value: '2024-01-02' } };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates file inputs', () => {
    const q = { id: 11, type: 'file', required: true, maxFiles: 1 };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { q_11: { files: null } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please upload a file.');
    errEl.textContent = '';
    form = { q_11: { files: [1, 2] } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('You can upload up to 1 file(s).');
    errEl.textContent = '';
    form = { q_11: { files: [1] } };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates boolean checkbox', () => {
    const q = { id: 12, type: 'boolean', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = { q_12: { checked: false } };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please check this box.');
    errEl.textContent = '';
    form = { q_12: { checked: true } };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('validates address fields', () => {
    const q = { id: 13, type: 'address', required: true };
    const errEl = { textContent: '' };
    document.getElementById = jest.fn(() => errEl);
    let form = {
      q_13_line1: { value: '' },
      q_13_city: { value: '' },
      q_13_state: { value: '' },
      q_13_zip: { value: '' }
    };
    expect(validateField(q, form)).toBe(false);
    expect(errEl.textContent).toBe('Please complete the address.');
    errEl.textContent = '';
    form = {
      q_13_line1: { value: '1' },
      q_13_city: { value: 'Town' },
      q_13_state: { value: 'ST' },
      q_13_zip: { value: '12345' }
    };
    expect(validateField(q, form)).toBe(true);
    expect(errEl.textContent).toBe('');
  });

  test('skips error update when error element missing', () => {
    const q = { id: 99, type: 'short_answer', required: true };
    document.getElementById = jest.fn(() => null);
    const form = { q_99: { value: '' } };
    expect(validateField(q, form)).toBe(false);
    expect(document.getElementById).toHaveBeenCalledWith('err_q_99');
  });
});

describe('addValidationListeners', () => {
  test('adds listeners for various field types', () => {
    const boxes = [{ addEventListener: jest.fn() }, { addEventListener: jest.fn() }];
    const form = {
      q_1: { addEventListener: jest.fn() },
      q_2: { addEventListener: jest.fn() },
      querySelectorAll: jest.fn(() => boxes),
      q_4_start: { addEventListener: jest.fn() },
      q_4_end: { addEventListener: jest.fn() },
      q_phone: { addEventListener: jest.fn() },
      q_5: { addEventListener: jest.fn() },
      q_6_line1: { addEventListener: jest.fn() },
      q_6_city: { addEventListener: jest.fn() },
      q_6_state: { addEventListener: jest.fn() },
      q_6_zip: { addEventListener: jest.fn() }
    };
    const config = {
      questions: [
        { id: 1, type: 'short_answer' },
        { id: 2, type: 'file' },
        { id: 3, type: 'checkbox' },
        { id: 4, type: 'date_range' },
        { id: 'phone', type: 'phone' },
        { id: 5, type: 'boolean' },
        { id: 6, type: 'address' }
      ]
    };

    addValidationListeners(form, config);
    expect(form.q_1.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
    expect(form.q_2.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    boxes.forEach(box => {
      expect(box.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
    expect(form.q_4_start.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(form.q_4_end.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(form.q_phone.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
    expect(form.q_5.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    ['line1','city','state','zip'].forEach(s => {
      expect(form[`q_6_${s}`].addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
    });
  });

  test('handles missing fields gracefully', () => {
    const form = { querySelectorAll: jest.fn(() => []) };
    const config = {
      questions: [
        { id: 1, type: 'short_answer' },
        { id: 2, type: 'file' },
        { id: 3, type: 'date_range' },
        { id: 4, type: 'boolean' },
        { id: 5, type: 'address' }
      ]
    };
    addValidationListeners(form, config);
    // No listeners should be attached and no errors thrown
    expect(form.querySelectorAll).not.toHaveBeenCalled();
  });
});
