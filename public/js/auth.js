let jwtToken = null; // Store in memory by default

document.addEventListener('DOMContentLoaded', () => {

  if (localStorage.getItem('jwtToken')) {
    window.location.href = 'dashboard.html';
  }

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
      const resp = await fetch(`${apiBase}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      const msg = document.getElementById('loginMessage');
      if (resp.status === 200 && data.token) {
        jwtToken = data.token;
        localStorage.setItem('jwtToken', data.token);
        console.log("JWT stored:", data.token); // Add this
        msg.textContent = 'Login successful!';
        msg.classList.remove('text-red-600');
        msg.classList.add('text-green-700');
        setTimeout(() => {
          window.location.href = '/public/dashboard.html';
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
      const resp = await fetch(`${apiBase}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
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
