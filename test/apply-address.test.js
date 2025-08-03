const { initAddressHelpers } = require('../public/js/apply-address.js');

test('city input populates state options and zip validates state', async () => {
  let cityHandler;
  let zipHandler;
  const cityInput = { name: 'q_1_city', value: '', addEventListener: (evt, cb) => { if (evt === 'input') cityHandler = cb; } };
  const stateSelect = { innerHTML: '', value: '' };
  const zipInput = { name: 'q_1_zip', value: '', addEventListener: (evt, cb) => { if (evt === 'blur') zipHandler = cb; } };
  const datalist = { innerHTML: '' };
  const errDiv = { textContent: '' };

  const form = {
    querySelectorAll: sel => sel === 'input[name$="_city"]' ? [cityInput] : [],
    querySelector: sel => {
      if (sel === '[name="q_1_state"]') return stateSelect;
      if (sel === '[name="q_1_zip"]') return zipInput;
      return null;
    }
  };

  const docMap = { 'q_1_city_list': datalist, 'err_q_1': errDiv };
  global.document = { getElementById: id => docMap[id] };

  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ cities: ['SPRINGFIELD'], states: ['IL', 'MO'] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ states: ['TX'], cities: ['CORPUS CHRISTI'] }) });

  initAddressHelpers(form);

  cityInput.value = 'Springfield';
  await cityHandler();
  expect(stateSelect.innerHTML).toContain('IL');
  expect(stateSelect.innerHTML).toContain('MO');

  stateSelect.value = 'IL';
  zipInput.value = '78401';
  await zipHandler();
  expect(errDiv.textContent).toBe('ZIP code does not match selected state.');
});

test('auto selects state and clears zip error when valid', async () => {
  let cityHandler;
  let zipHandler;
  const cityInput = { name: 'q_1_city', value: '', addEventListener: (evt, cb) => { if (evt === 'input') cityHandler = cb; } };
  const stateSelect = { innerHTML: '', value: '' };
  const zipInput = { name: 'q_1_zip', value: '', addEventListener: (evt, cb) => { if (evt === 'blur') zipHandler = cb; } };
  const datalist = { innerHTML: '' };
  const errDiv = { textContent: 'ZIP code does not match selected state.' };

  const form = {
    querySelectorAll: sel => sel === 'input[name$="_city"]' ? [cityInput] : [],
    querySelector: sel => {
      if (sel === '[name="q_1_state"]') return stateSelect;
      if (sel === '[name="q_1_zip"]') return zipInput;
      return null;
    }
  };

  const docMap = { 'q_1_city_list': datalist, 'err_q_1': errDiv };
  global.document = { getElementById: id => docMap[id] };

  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ cities: ['CORPUS CHRISTI'], states: ['TX'] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ states: ['TX'], cities: ['CORPUS CHRISTI'] }) });

  initAddressHelpers(form);

  cityInput.value = 'Corpus Christi';
  await cityHandler();
  expect(stateSelect.value).toBe('TX');

  stateSelect.value = 'TX';
  zipInput.value = '78401';
  await zipHandler();
  expect(errDiv.textContent).toBe('');
});

test('flags city mismatch when state matches', async () => {
  let cityHandler;
  let zipHandler;
  const cityInput = { name: 'q_1_city', value: '', addEventListener: (evt, cb) => { if (evt === 'input') cityHandler = cb; } };
  const stateSelect = { innerHTML: '', value: '' };
  const zipInput = { name: 'q_1_zip', value: '', addEventListener: (evt, cb) => { if (evt === 'blur') zipHandler = cb; } };
  const datalist = { innerHTML: '' };
  const errDiv = { textContent: '' };

  const form = {
    querySelectorAll: sel => sel === 'input[name$="_city"]' ? [cityInput] : [],
    querySelector: sel => {
      if (sel === '[name="q_1_state"]') return stateSelect;
      if (sel === '[name="q_1_zip"]') return zipInput;
      return null;
    }
  };

  const docMap = { 'q_1_city_list': datalist, 'err_q_1': errDiv };
  global.document = { getElementById: id => docMap[id] };

  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ cities: ['SPRINGFIELD'], states: ['IL', 'MO'] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ states: ['TX'], cities: ['CORPUS CHRISTI'] }) });

  initAddressHelpers(form);

  cityInput.value = 'Springfield';
  await cityHandler();
  stateSelect.value = 'TX';
  zipInput.value = '78401';
  await zipHandler();
  expect(errDiv.textContent).toBe('ZIP code does not match entered city.');
});

test('handles short inputs and failed fetches', async () => {
  let cityHandler;
  let zipHandler;
  const cityInput = { name: 'q_1_city', value: '', addEventListener: (evt, cb) => { if (evt === 'input') cityHandler = cb; } };
  const stateSelect = { innerHTML: '', value: '' };
  const zipInput = { name: 'q_1_zip', value: '', addEventListener: (evt, cb) => { if (evt === 'blur') zipHandler = cb; } };
  const datalist = { innerHTML: '' };
  const errDiv = { textContent: '' };

  const form = {
    querySelectorAll: sel => sel === 'input[name$="_city"]' ? [cityInput] : [],
    querySelector: sel => {
      if (sel === '[name="q_1_state"]') return stateSelect;
      if (sel === '[name="q_1_zip"]') return zipInput;
      return null;
    }
  };

  const docMap = { 'q_1_city_list': datalist, 'err_q_1': errDiv };
  global.document = { getElementById: id => docMap[id] };

  global.fetch = jest.fn();

  initAddressHelpers(form);

  cityInput.value = 'A';
  await cityHandler();
  expect(global.fetch).not.toHaveBeenCalled();

  global.fetch.mockResolvedValueOnce({ ok: false });
  cityInput.value = 'AB';
  await cityHandler();
  expect(global.fetch).toHaveBeenCalledTimes(1);

  global.fetch.mockClear();
  zipInput.value = '';
  await zipHandler();
  expect(global.fetch).not.toHaveBeenCalled();

  global.fetch.mockResolvedValueOnce({ ok: false });
  zipInput.value = '12345';
  await zipHandler();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
