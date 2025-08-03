const { initAddressHelpers } = require('../public/js/apply-address.js');

global.window = global.window || {};

test('validates zip, city, and state combinations', async () => {
  let zipHandler;
  const cityInput = { name: 'q_1_city', value: '', addEventListener: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() } };
  const stateSelect = { innerHTML: '', value: '', addEventListener: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() } };
  const zipInput = { name: 'q_1_zip', value: '', addEventListener: (evt, cb) => { if (evt === 'blur') zipHandler = cb; }, classList: { add: jest.fn(), remove: jest.fn() } };
  const errDiv = { textContent: '' };
  const form = {
    querySelectorAll: () => [cityInput],
    querySelector: sel => sel === "[name='q_1_state']" ? stateSelect : sel === "[name='q_1_zip']" ? zipInput : null
  };
  global.document = { getElementById: () => errDiv };
  window._zipCityDataPromise = Promise.resolve([
    { zip: '78401', city: 'CORPUS CHRISTI', state: 'TX' }
  ]);

  initAddressHelpers(form);
  await window._zipCityDataPromise;

  cityInput.value = 'Corpus Christi';
  stateSelect.value = 'TX';
  zipInput.value = '12345';
  await zipHandler();
  expect(errDiv.textContent).toBe('ZIP, city, and state do not match our records.');

  zipInput.value = '78401';
  await zipHandler();
  expect(errDiv.textContent).toBe('');
});
