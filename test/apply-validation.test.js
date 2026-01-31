const { validateField, addValidationListeners, formatPhoneNumber, isValidPhoneNumber } = require('../public/js/apply-validation.js');

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

describe('phone utilities', () => {
  test('formatPhoneNumber formats various lengths', () => {
    expect(formatPhoneNumber('')).toBe('');
    expect(formatPhoneNumber('1')).toBe('(1');
    expect(formatPhoneNumber('1234')).toBe('(123) 4');
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
  });

  test('isValidPhoneNumber validates correctly', () => {
    expect(isValidPhoneNumber('(123) 456-7890')).toBe(true);
    expect(isValidPhoneNumber('1234567')).toBe(false);
    expect(isValidPhoneNumber('')).toBe(false);
  });
});

describe('addValidationListeners callback execution', () => {
  beforeEach(() => {
    global.document = { getElementById: jest.fn(() => ({ textContent: '' })) };
  });

  afterEach(() => {
    delete global.document;
  });

  test('short_answer input callback triggers validation', () => {
    let inputCallback;
    const field = {
      value: 'test',
      addEventListener: jest.fn((event, cb) => { if (event === 'input') inputCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'short_answer', required: true }] };

    addValidationListeners(form, config);
    expect(inputCallback).toBeDefined();
    inputCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('paragraph input callback triggers validation', () => {
    let inputCallback;
    const field = {
      value: 'text',
      addEventListener: jest.fn((event, cb) => { if (event === 'input') inputCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'paragraph', required: true }] };

    addValidationListeners(form, config);
    inputCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('email input callback triggers validation', () => {
    let inputCallback;
    const field = {
      value: 'test@example.com',
      addEventListener: jest.fn((event, cb) => { if (event === 'input') inputCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'email', required: true }] };

    addValidationListeners(form, config);
    inputCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('number input callback triggers validation', () => {
    let inputCallback;
    const field = {
      value: '42',
      addEventListener: jest.fn((event, cb) => { if (event === 'input') inputCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'number', required: true }] };

    addValidationListeners(form, config);
    inputCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('date input callback triggers validation', () => {
    let inputCallback;
    const field = {
      value: '2024-01-01',
      addEventListener: jest.fn((event, cb) => { if (event === 'input') inputCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'date', required: true }] };

    addValidationListeners(form, config);
    inputCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('dropdown input callback triggers validation', () => {
    let inputCallback;
    const field = {
      value: 'option1',
      addEventListener: jest.fn((event, cb) => { if (event === 'input') inputCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'dropdown', required: true }] };

    addValidationListeners(form, config);
    inputCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('phone input callback formats value and triggers validation', () => {
    let inputCallback;
    const field = {
      value: '1234567890',
      addEventListener: jest.fn((event, cb) => { if (event === 'input') inputCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'phone', required: true }] };

    addValidationListeners(form, config);
    inputCallback();
    expect(field.value).toBe('(123) 456-7890');
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('file change callback triggers validation', () => {
    let changeCallback;
    const field = {
      files: [{ name: 'test.pdf' }],
      addEventListener: jest.fn((event, cb) => { if (event === 'change') changeCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'file', required: true }] };

    addValidationListeners(form, config);
    changeCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('checkbox change callback triggers validation', () => {
    let changeCallback;
    const checkbox = {
      addEventListener: jest.fn((event, cb) => { if (event === 'change') changeCallback = cb; })
    };
    const form = { querySelectorAll: jest.fn(() => [checkbox, checkbox]) };
    const config = { questions: [{ id: 1, type: 'checkbox', required: true }] };

    addValidationListeners(form, config);
    // Should have been called twice (once per checkbox)
    expect(checkbox.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    changeCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('radio change callback triggers validation', () => {
    let changeCallback;
    const radio = {
      addEventListener: jest.fn((event, cb) => { if (event === 'change') changeCallback = cb; })
    };
    const form = {
      querySelectorAll: jest.fn(() => [radio]),
      querySelector: jest.fn(() => radio) // For validateField to check selected radio
    };
    const config = { questions: [{ id: 1, type: 'radio', required: true }] };

    addValidationListeners(form, config);
    changeCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('date_range start change callback triggers validation', () => {
    let startCallback;
    const startField = {
      value: '2024-01-01',
      addEventListener: jest.fn((event, cb) => { if (event === 'change') startCallback = cb; })
    };
    const endField = {
      value: '2024-01-02',
      addEventListener: jest.fn()
    };
    const form = { q_1_start: startField, q_1_end: endField };
    const config = { questions: [{ id: 1, type: 'date_range', required: true }] };

    addValidationListeners(form, config);
    startCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('date_range end change callback triggers validation', () => {
    let endCallback;
    const startField = {
      value: '2024-01-01',
      addEventListener: jest.fn()
    };
    const endField = {
      value: '2024-01-02',
      addEventListener: jest.fn((event, cb) => { if (event === 'change') endCallback = cb; })
    };
    const form = { q_1_start: startField, q_1_end: endField };
    const config = { questions: [{ id: 1, type: 'date_range', required: true }] };

    addValidationListeners(form, config);
    endCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('boolean change callback triggers validation', () => {
    let changeCallback;
    const field = {
      checked: true,
      addEventListener: jest.fn((event, cb) => { if (event === 'change') changeCallback = cb; })
    };
    const form = { q_1: field };
    const config = { questions: [{ id: 1, type: 'boolean', required: true }] };

    addValidationListeners(form, config);
    changeCallback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');
  });

  test('address field input callbacks trigger validation', () => {
    let line1Callback, cityCallback, stateCallback, zipCallback;
    const form = {
      q_1_line1: { value: '123 Main', addEventListener: jest.fn((e, cb) => { if (e === 'input') line1Callback = cb; }) },
      q_1_city: { value: 'Town', addEventListener: jest.fn((e, cb) => { if (e === 'input') cityCallback = cb; }) },
      q_1_state: { value: 'ST', addEventListener: jest.fn((e, cb) => { if (e === 'input') stateCallback = cb; }) },
      q_1_zip: { value: '12345', addEventListener: jest.fn((e, cb) => { if (e === 'input') zipCallback = cb; }) }
    };
    const config = { questions: [{ id: 1, type: 'address', required: true }] };

    addValidationListeners(form, config);

    line1Callback();
    expect(document.getElementById).toHaveBeenCalledWith('err_q_1');

    cityCallback();
    stateCallback();
    zipCallback();
    // All should trigger validation (getElementById called twice per callback: once for checking existing error, once for setting error)
    expect(document.getElementById).toHaveBeenCalled();
  });
});
