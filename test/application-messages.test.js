const { showError, clearError, showSuccess } = require('../public/js/application-messages.js');

describe('application-messages.js', () => {
  let errorBox, successBox;
  beforeEach(() => {
    jest.useFakeTimers();
    errorBox = { textContent: '', style: { display: 'none' } };
    successBox = { textContent: '', style: { display: 'none' } };
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
    expect(errorBox.style.display).toBe('block');
  });

  test('clearError hides message', () => {
    errorBox.textContent = 'err';
    errorBox.style.display = 'block';
    clearError();
    expect(errorBox.textContent).toBe('');
    expect(errorBox.style.display).toBe('none');
  });

  test('showSuccess displays then hides message', () => {
    showSuccess('yay');
    expect(successBox.textContent).toBe('yay');
    expect(successBox.style.display).toBe('block');
    jest.runAllTimers();
    expect(successBox.style.display).toBe('none');
    expect(successBox.textContent).toBe('');
  });
});
