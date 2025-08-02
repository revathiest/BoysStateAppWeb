let funcs;

describe('branding-contact.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { location: { search: '?programId=42' } };
    const elements = {
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
      contactFacebook: { value: '' }
    };
    global.document = {
      getElementById: id => elements[id],
      addEventListener: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    };
    funcs = require('../public/js/branding-contact.js');
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
});

