// application-messages.js

// Wrap in IIFE to keep globals clean
(function () {
  function showError(msg) {
    const box = document.getElementById('errorBox');
    if (box) {
      box.textContent = msg;
      box.style.display = 'block';
    }
  }

  function clearError() {
    const box = document.getElementById('errorBox');
    if (box) {
      box.textContent = '';
      box.style.display = 'none';
    }
  }

  function showSuccess(msg) {
    const box = document.getElementById('successBox');
    if (box) {
      box.textContent = msg;
      box.style.display = 'block';
      setTimeout(() => {
        box.style.display = 'none';
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
