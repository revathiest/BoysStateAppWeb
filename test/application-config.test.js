describe('application-config.js', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = { location: { search: '' } };
    global.localStorage = { getItem: jest.fn(() => null) };
    global.document = { addEventListener: jest.fn() };
  });

  test('getProgramId reads from query', () => {
    window.location.search = '?programId=xyz';
    const mod = require('../public/js/application-config.js');
    expect(mod.getProgramId()).toBe('xyz');
  });

  test('renderFieldTypeOptions marks selected', () => {
    const mod = require('../public/js/application-config.js');
    const html = mod.renderFieldTypeOptions('email');
    expect(html).toContain('<option value="email" selected>Email</option>');
  });
});

