let funcs;

describe('branding-contact.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { location: { search: '?programId=42', href: '' }, API_URL: 'http://api.test' };
    const elements = {
      programNameLabel: { textContent: '' },
      welcomeMessage: { value: '' },
      logoUrl: { value: '' },
      iconUrl: { value: '' },
      bannerUrl: { value: '' },
      primaryColor: { value: '' },
      secondaryColor: { value: '' },
      backgroundColor: { value: '' },
      contactEmail: { value: '' },
      contactPhone: { value: '' },
      contactWebsite: { value: '' },
      contactFacebook: { value: '' },
      errorMsg: { style: { display: 'none' }, textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      successMsg: { style: { display: 'none' }, textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      logoutBtn: { addEventListener: jest.fn() }
    };
    const listeners = {};
    global.document = {
      getElementById: id => elements[id],
      addEventListener: (ev, fn) => { (listeners[ev] || (listeners[ev] = [])).push(fn); },
      querySelectorAll: jest.fn(() => [ { disabled: false }, { disabled: false } ])
    };
    funcs = require('../public/js/branding-contact.js');
    global.elements = elements;
    global.listeners = listeners;
  });

  test('getProgramIdFromUrl reads query', () => {
    expect(funcs.getProgramIdFromUrl()).toBe('42');
  });

  test('loadConfig populates fields', () => {
    funcs.loadConfig({
      welcomeMessage: 'hi',
      logoUrl: 'a',
      iconUrl: 'b',
      bannerUrl: 'c',
      colorPrimary: '#111',
      colorSecondary: '#222',
      colorBackground: '#333',
      contactEmail: 'e',
      contactPhone: 'p',
      contactWebsite: 'w',
      contactFacebook: 'f'
    });
    expect(document.getElementById('logoUrl').value).toBe('a');
    expect(document.getElementById('primaryColor').value).toBe('#111');
    expect(document.getElementById('contactFacebook').value).toBe('f');
  });

  test('resetForm clears fields to defaults', () => {
    // populate some values first
    document.getElementById('welcomeMessage').value = 'x';
    document.getElementById('primaryColor').value = '#000';
    funcs.resetForm();
    expect(document.getElementById('welcomeMessage').value).toBe('');
    expect(document.getElementById('primaryColor').value).toBe('#0C2340');
  });

  test('loadBrandingContactFromApi loads data', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ logoUrl: 'logo' }) }));
    await funcs.loadBrandingContactFromApi();
    expect(global.fetch).toHaveBeenCalled();
    expect(elements.logoUrl.value).toBe('logo');
  });

  test('saveConfig posts data', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    await funcs.saveConfig();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/branding-contact/42'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(elements.successMsg.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('loadBrandingContactFromApi handles failure', async () => {
    elements.welcomeMessage.value = 'x';
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    await funcs.loadBrandingContactFromApi();
    expect(elements.welcomeMessage.value).toBe('');
  });

  test('loadBrandingContactFromApi handles fetch error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('fail')));
    await funcs.loadBrandingContactFromApi();
    expect(elements.errorMsg.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('saveConfig handles failure', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    await funcs.saveConfig();
    expect(elements.errorMsg.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('saveConfig handles fetch error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('boom')));
    await funcs.saveConfig();
    expect(elements.errorMsg.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('DOMContentLoaded handler without programId disables form', async () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      errorMsg: { style: { display: 'none' }, textContent: '', classList: { add: jest.fn(), remove: jest.fn() } }
    };
    const formEls = [{ disabled: false }];
    const domListeners = {};
    global.window = { location: { search: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => formEls,
      addEventListener: (ev, fn) => { (domListeners[ev] || (domListeners[ev] = [])).push(fn); }
    };
    require('../public/js/branding-contact.js');
    await domListeners['DOMContentLoaded'][0]();
    expect(els.errorMsg.textContent).toContain('Missing');
    expect(formEls[0].disabled).toBe(true);
  });

  test('logout button handler redirects', () => {
    listeners['DOMContentLoaded'][1]();
    elements.logoutBtn.addEventListener.mock.calls[0][1]();
    expect(global.window.location.href).toBe('login.html');
  });
});

