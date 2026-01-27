// application-messages.js

// Wrap in IIFE to keep globals clean
(function () {
  function showError(msg) {
    const box = document.getElementById('errorBox');
    if (box) {
      box.textContent = msg;
      box.classList.remove('hidden');
    }
  }

  function clearError() {
    const box = document.getElementById('errorBox');
    if (box) {
      box.textContent = '';
      box.classList.add('hidden');
    }
  }

  function showSuccess(msg) {
    const box = document.getElementById('successBox');
    if (box) {
      box.textContent = msg;
      box.classList.remove('hidden');
      setTimeout(() => {
        box.classList.add('hidden');
        box.textContent = '';
      }, 2000);
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showError, clearError, showSuccess };
  } else {
    window.showError = showError;
    window.clearError = clearError;
    window.showSuccess = showSuccess;
  }
})();
