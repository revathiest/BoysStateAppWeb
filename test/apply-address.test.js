const { initAddressHelpers, US_STATES } = require('../public/js/apply-address.js');

describe('apply-address.js', () => {
  test('US_STATES contains all 50 states plus territories', () => {
    expect(US_STATES).toContain('TX');
    expect(US_STATES).toContain('CA');
    expect(US_STATES).toContain('NY');
    expect(US_STATES).toContain('FL');
    expect(US_STATES).toContain('DC'); // DC
    expect(US_STATES).toContain('PR'); // Puerto Rico
    expect(US_STATES.length).toBe(56); // 50 states + DC + 5 territories
  });

  test('initAddressHelpers populates state dropdowns', () => {
    const stateSelect1 = { innerHTML: '' };
    const stateSelect2 = { innerHTML: '' };
    const form = {
      querySelectorAll: (selector) => {
        if (selector === "select[name$='_state']") {
          return [stateSelect1, stateSelect2];
        }
        return [];
      }
    };

    initAddressHelpers(form);

    // Both dropdowns should be populated with states
    expect(stateSelect1.innerHTML).toContain('<option value="">State</option>');
    expect(stateSelect1.innerHTML).toContain('<option value="TX">TX</option>');
    expect(stateSelect1.innerHTML).toContain('<option value="CA">CA</option>');
    expect(stateSelect2.innerHTML).toContain('<option value="NY">NY</option>');
  });

  test('initAddressHelpers handles empty form', () => {
    const form = {
      querySelectorAll: () => []
    };

    // Should not throw
    expect(() => initAddressHelpers(form)).not.toThrow();
  });

  test('initAddressHelpers handles form with no state dropdowns', () => {
    const textInput = { innerHTML: '', name: 'other_field' };
    const form = {
      querySelectorAll: (selector) => {
        if (selector === "select[name$='_state']") {
          return [];
        }
        return [textInput];
      }
    };

    // Should not throw and should not modify non-state elements
    expect(() => initAddressHelpers(form)).not.toThrow();
  });
});
