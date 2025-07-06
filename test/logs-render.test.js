let renderLogs, renderPager;

describe('logs rendering helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    global.window = {};
    global.document = {
      querySelector: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn() })),
      getElementById: jest.fn(() => ({ innerHTML: '', appendChild: jest.fn(), addEventListener: jest.fn() })),
      createElement: jest.fn(() => ({ setAttribute: jest.fn(), style: {}, appendChild: jest.fn() })),
      addEventListener: jest.fn()
    };
    ({ renderLogs, renderPager } = require('../public/js/logs.js'));
  });

  test('renderLogs shows no logs message', () => {
    const tbody = { innerHTML: '' };
    document.querySelector.mockReturnValueOnce(tbody);
    renderLogs([]);
    expect(tbody.innerHTML).toContain('No logs');
  });

  test('renderLogs appends rows', () => {
    const tbody = { innerHTML: '', appendChild: jest.fn() };
    document.querySelector.mockReturnValueOnce(tbody);
    const logs = [{ timestamp: Date.now(), level: 'info', source: 's', message: 'm' }];
    renderLogs(logs);
    expect(tbody.appendChild).toHaveBeenCalled();
  });

  test('renderPager creates buttons when multiple pages', () => {
    const pager = { innerHTML: '', appendChild: jest.fn() };
    document.getElementById.mockReturnValueOnce(pager);
    renderPager(2, 10, 30);
    expect(pager.appendChild).toHaveBeenCalled();
  });

  test('renderPager does nothing when one page', () => {
    const pager = { innerHTML: '', appendChild: jest.fn() };
    document.getElementById.mockReturnValueOnce(pager);
    renderPager(1, 50, 20);
    expect(pager.appendChild).not.toHaveBeenCalled();
  });
});
