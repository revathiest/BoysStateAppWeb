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

test('handles partial matches and suggestions', async () => {
  const handlers = {};
  const cityInput = {
    name: 'q_1_city',
    value: '',
    offsetWidth: 100,
    offsetLeft: 0,
    offsetTop: 0,
    offsetHeight: 20,
    parentNode: { appendChild: jest.fn() },
    classList: { add: jest.fn(), remove: jest.fn() },
    addEventListener: (ev, cb) => { handlers[ev] = cb; }
  };
  const stateSelect = {
    innerHTML: '',
    value: '',
    classList: { add: jest.fn(), remove: jest.fn() },
    addEventListener: (ev, cb) => { handlers['state-' + ev] = cb; }
  };
  const zipInput = {
    name: 'q_1_zip',
    value: '',
    classList: { add: jest.fn(), remove: jest.fn() },
    addEventListener: (ev, cb) => { handlers['zip-' + ev] = cb; }
  };
  const errDiv = { textContent: '' };
  const form = {
    querySelectorAll: () => [cityInput],
    querySelector: sel => sel === "[name='q_1_state']" ? stateSelect : sel === "[name='q_1_zip']" ? zipInput : null
  };
  const created = [];
  global.document = {
    getElementById: () => errDiv,
    createElement: jest.fn(tag => {
      const el = {
        style: {},
        className: '',
        appendChild(child) { (this.children || (this.children = [])).push(child); },
        remove: jest.fn()
      };
      created.push(el);
      return el;
    })
  };

  window._zipCityDataPromise = Promise.resolve([
    { zip: '78401', city: 'CORPUS CHRISTI', state: 'TX' },
    { zip: '78701', city: 'AUSTIN', state: 'TX' }
  ]);

  initAddressHelpers(form);
  await window._zipCityDataPromise;

  // Unknown ZIP
  cityInput.value = '';
  stateSelect.value = 'TX';
  zipInput.value = '00000';
  await handlers['zip-blur']();
  expect(errDiv.textContent).toBe('Unknown ZIP code.');

  // ZIP does not match city
  cityInput.value = 'AUSTIN';
  stateSelect.value = '';
  zipInput.value = '78401';
  await handlers['zip-blur']();
  expect(errDiv.textContent).toBe('ZIP does not match city.');

  // ZIP does not match state
  cityInput.value = '';
  stateSelect.value = 'CA';
  zipInput.value = '78401';
  await handlers['zip-blur']();
  expect(errDiv.textContent).toBe('ZIP does not match state.');

  // Show suggestions and select
  cityInput.value = 'CO';
  stateSelect.value = '';
  handlers['input']();
  const item = created.find(e => typeof e.onclick === 'function');
  zipInput.value = '78401';
  item.onclick();
  expect(errDiv.textContent).toBe('');

  // City blur triggers removeSuggestions
  jest.useFakeTimers();
  handlers['blur']();
  jest.runAllTimers();
  jest.useRealTimers();

  // State change with valid city
  cityInput.value = 'CORPUS CHRISTI';
  stateSelect.value = 'TX';
  await handlers['state-change']();
  expect(errDiv.textContent).toBe('');

  // State change with no matching cities
  cityInput.classList.add.mockClear();
  cityInput.value = 'BOGUS';
  stateSelect.value = 'TX';
  zipInput.value = '';
  await handlers['state-change']();
  expect(cityInput.classList.add).toHaveBeenCalledWith('border-red-500');
});
