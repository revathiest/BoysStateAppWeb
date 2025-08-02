const { validateField } = require('../public/js/apply-validation.js');

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
});
