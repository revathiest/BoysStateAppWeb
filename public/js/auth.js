document.addEventListener('DOMContentLoaded', async () => {
  const apiBase = typeof window.API_URL === 'string' && window.API_URL.trim()
    ? window.API_URL
    : null;

  if (!apiBase) {
    alert("Configuration error: API_URL is not set. Please contact the site administrator.");
    // Optionally, you could also disable forms so they can't submit:
    document.querySelectorAll('form').forEach(f => f.querySelectorAll('button, input[type="submit"]').forEach(btn => btn.disabled = true));
    return; // Stop further script execution
  }

  const cancelLogin = document.getElementById('cancelLogin');
  if (cancelLogin) {
    cancelLogin.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  const cancelRegister = document.getElementById('cancelRegister');
  if (cancelRegister) {
    cancelRegister.addEventListener('click', () => {
      window.location.href = '/';
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      let resp;
      try {
        resp = await fetch(`${apiBase}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });
      } catch (err) {
        console.error('Network error during login', err);
        if (window.logToServer) {
          window.logToServer('Network error during login', { level: 'error', error: err });
        }
        document.getElementById('loginMessage').textContent =
          'Unable to reach server.';
        return;
      }

      let data = {};
      try {
        data = await resp.json();
      } catch (err) {
        console.error('Invalid JSON from login endpoint', err);
        if (window.logToServer) {
          window.logToServer('Invalid JSON from login endpoint', { level: 'error', error: err });
        }
      }
      const msg = document.getElementById('loginMessage');
      if (resp.ok) {
        if (window.logToServer) {
            window.logToServer("Login successful", { level: "info" });
          }
          if (typeof storeAuthToken === 'function') storeAuthToken(data.token);
          if (typeof storeUser === 'function') storeUser(email);
          msg.textContent = "Login successful!";
        msg.classList.remove('text-red-600');
        msg.classList.add('text-green-700');
        setTimeout(() => {
          window.location.href = '/console.html';
        }, 1000);
      } else {
        msg.textContent = data.error || 'Login failed.';
        msg.classList.remove('text-green-700');
        msg.classList.add('text-red-600');
      }
    });
  }
  

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      let resp;
      try {
        resp = await fetch(`${apiBase}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });
      } catch (err) {
        console.error('Network error during registration', err);
        if (window.logToServer) {
          window.logToServer('Network error during registration', { level: 'error', error: err });
        }
        document.getElementById('registerMessage').textContent =
          'Unable to reach server.';
        return;
      }

      let data = {};
      try {
        data = await resp.json();
      } catch (err) {
        console.error('Invalid JSON from registration endpoint', err);
        if (window.logToServer) {
          window.logToServer('Invalid JSON from registration endpoint', { level: 'error', error: err });
        }
      }
      const msg = document.getElementById('registerMessage');
      if (resp.status === 201) {
        msg.textContent = 'Registration successful! You can now log in.';
        msg.classList.remove('text-red-600');
        msg.classList.add('text-green-700');
      } else {
        msg.textContent = data.error || 'Registration failed.';
        msg.classList.remove('text-green-700');
        msg.classList.add('text-red-600');
      }
    });
  }
});
