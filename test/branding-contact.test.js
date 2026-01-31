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

  test('DOMContentLoaded with programId loads program and branding', async () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      errorMsg: { style: { display: 'none' }, textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
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
      logoutBtn: { addEventListener: jest.fn() },
      saveBtn: { addEventListener: jest.fn() },
      cancelBtn: { addEventListener: jest.fn() }
    };
    const formEls = [{ disabled: false }];
    const domListeners = {};
    global.window = { location: { search: '?programId=test123', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => formEls,
      addEventListener: (ev, fn) => { (domListeners[ev] || (domListeners[ev] = [])).push(fn); }
    };
    global.getAuthHeaders = () => ({ Authorization: 'Bearer token' });
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        clone: () => ({ text: () => Promise.resolve('{"name":"Test Program","year":2024}') })
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ logoUrl: 'test-logo.png' }) });

    require('../public/js/branding-contact.js');
    await domListeners['DOMContentLoaded'][0]();

    expect(els.programNameLabel.textContent).toBe('Test Program (2024)');
    expect(formEls[0].disabled).toBe(false);
    expect(els.logoUrl.value).toBe('test-logo.png');
  });

  test('DOMContentLoaded with program not found', async () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      errorMsg: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } }
    };
    const formEls = [{ disabled: false }];
    const domListeners = {};
    global.window = { location: { search: '?programId=bad123', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => formEls,
      addEventListener: (ev, fn) => { (domListeners[ev] || (domListeners[ev] = [])).push(fn); }
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      clone: () => ({ text: () => Promise.resolve('Not found') })
    });

    require('../public/js/branding-contact.js');
    await domListeners['DOMContentLoaded'][0]();

    expect(els.programNameLabel.textContent).toContain('not found');
    expect(els.errorMsg.textContent).toContain('not found');
    expect(formEls[0].disabled).toBe(true);
  });

  test('DOMContentLoaded handles fetch error', async () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      errorMsg: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } }
    };
    const formEls = [{ disabled: false }];
    const domListeners = {};
    global.window = { location: { search: '?programId=err123', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => formEls,
      addEventListener: (ev, fn) => { (domListeners[ev] || (domListeners[ev] = [])).push(fn); }
    };
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    require('../public/js/branding-contact.js');
    await domListeners['DOMContentLoaded'][0]();

    expect(els.programNameLabel.textContent).toContain('Failed to load');
    expect(els.errorMsg.textContent).toContain('Could not load');
    expect(formEls[0].disabled).toBe(true);
  });

  test('saveConfig returns early without programId', async () => {
    jest.resetModules();
    global.window = { location: { search: '', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: () => ({ value: '', classList: { add: jest.fn(), remove: jest.fn() }, addEventListener: jest.fn() }),
      querySelectorAll: () => [],
      addEventListener: jest.fn()
    };
    global.fetch = jest.fn();
    const mod = require('../public/js/branding-contact.js');
    await mod.saveConfig();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('saveConfig uses alert when successMsg missing', async () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      welcomeMessage: { value: 'hi' },
      logoUrl: { value: '' },
      iconUrl: { value: '' },
      bannerUrl: { value: '' },
      primaryColor: { value: '#000' },
      secondaryColor: { value: '#111' },
      backgroundColor: { value: '#222' },
      contactEmail: { value: '' },
      contactPhone: { value: '' },
      contactWebsite: { value: '' },
      contactFacebook: { value: '' },
      errorMsg: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
      successMsg: null, // Missing successMsg element
      logoutBtn: { addEventListener: jest.fn() }
    };
    global.window = { location: { search: '?programId=abc', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => [],
      addEventListener: jest.fn()
    };
    global.alert = jest.fn();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // Save response
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // Reload response

    const mod = require('../public/js/branding-contact.js');
    await mod.saveConfig();
    expect(global.alert).toHaveBeenCalledWith('Saved!');
  });

  test('saveBtn and cancelBtn handlers are attached', () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      errorMsg: { classList: { add: jest.fn(), remove: jest.fn() } },
      logoutBtn: { addEventListener: jest.fn() },
      saveBtn: { addEventListener: jest.fn() },
      cancelBtn: { addEventListener: jest.fn() }
    };
    const domListeners = {};
    global.window = { location: { search: '?programId=x', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => [],
      addEventListener: (ev, fn) => { (domListeners[ev] || (domListeners[ev] = [])).push(fn); }
    };

    require('../public/js/branding-contact.js');
    // Call the second DOMContentLoaded handler (button setup)
    domListeners['DOMContentLoaded'][1]();

    expect(els.saveBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    expect(els.cancelBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
  });

  test('program label shows fallback when name missing', async () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      errorMsg: { classList: { add: jest.fn(), remove: jest.fn() } },
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
      logoutBtn: { addEventListener: jest.fn() }
    };
    const formEls = [{ disabled: false }];
    const domListeners = {};
    global.window = { location: { search: '?programId=xyz', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => formEls,
      addEventListener: (ev, fn) => { (domListeners[ev] || (domListeners[ev] = [])).push(fn); }
    };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        clone: () => ({ text: () => Promise.resolve('{}') }) // No name field
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    require('../public/js/branding-contact.js');
    await domListeners['DOMContentLoaded'][0]();

    expect(els.programNameLabel.textContent).toBe('Program xyz');
  });

  test('getAuthHeaders fallback when not a function', async () => {
    jest.resetModules();
    const els = {
      programNameLabel: { textContent: '' },
      errorMsg: { classList: { add: jest.fn(), remove: jest.fn() } },
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
      logoutBtn: { addEventListener: jest.fn() }
    };
    const formEls = [{ disabled: false }];
    const domListeners = {};
    global.window = { location: { search: '?programId=test', href: '' }, API_URL: 'http://api.test' };
    global.document = {
      getElementById: id => els[id],
      querySelectorAll: () => formEls,
      addEventListener: (ev, fn) => { (domListeners[ev] || (domListeners[ev] = [])).push(fn); }
    };
    global.getAuthHeaders = 'not a function';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        clone: () => ({ text: () => Promise.resolve('{"name":"Test"}') })
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    require('../public/js/branding-contact.js');
    await domListeners['DOMContentLoaded'][0]();

    // Should use empty headers
    expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: {} }));
  });
});

