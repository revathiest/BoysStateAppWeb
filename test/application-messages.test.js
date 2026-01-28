const { showError, clearError, showSuccess } = require('../public/js/application-messages.js');

describe('application-messages.js', () => {
  let errorBox, successBox;
  beforeEach(() => {
    jest.useFakeTimers();
    errorBox = { textContent: '', style: { display: 'none' }, classList: { add: jest.fn(), remove: jest.fn() } };
    successBox = { textContent: '', style: { display: 'none' }, classList: { add: jest.fn(), remove: jest.fn() } };
    global.document = {
      getElementById: id => (id === 'errorBox' ? errorBox : id === 'successBox' ? successBox : null)
    };
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('showError displays message', () => {
    showError('oops');
    expect(errorBox.textContent).toBe('oops');
    expect(errorBox.classList.remove).toHaveBeenCalledWith('hidden');
  });

  test('clearError hides message', () => {
    errorBox.textContent = 'err';
    clearError();
    expect(errorBox.textContent).toBe('');
    expect(errorBox.classList.add).toHaveBeenCalledWith('hidden');
  });

  test('showSuccess displays then hides message', () => {
    showSuccess('yay');
    expect(successBox.textContent).toBe('yay');
    expect(successBox.classList.remove).toHaveBeenCalledWith('hidden');
    jest.runAllTimers();
    expect(successBox.classList.add).toHaveBeenCalledWith('hidden');
    expect(successBox.textContent).toBe('');
  });
});
