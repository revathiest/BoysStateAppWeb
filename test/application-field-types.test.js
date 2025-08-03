const { FIELD_TYPES, renderFieldTypeOptions } = require('../public/js/application-field-types.js');

describe('application-field-types.js', () => {
  test('FIELD_TYPES includes expected entries', () => {
    const values = FIELD_TYPES.map(t => t.value);
    expect(values).toContain('short_answer');
    expect(values).toContain('address');
  });

  test('renderFieldTypeOptions renders all options and selects value', () => {
    const html = renderFieldTypeOptions('phone');
    const optionCount = (html.match(/<option/g) || []).length;
    expect(optionCount).toBe(FIELD_TYPES.length);
    expect(html).toContain('<option value="phone" selected>Phone Number</option>');
  });
});
