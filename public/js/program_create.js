document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('jwtToken')) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('createProgramForm');
  const msg = document.getElementById('createMsg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new URLSearchParams(new FormData(form));
    let resp;
    try {
      resp = await fetch('/create-program', {
        method: 'POST',
        headers: {
          'Cookie': document.cookie,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: data.toString()
      });
    } catch (err) {
      console.error('Network error creating program', err);
      msg.textContent = 'Unable to reach server.';
      msg.className = 'text-red-600';
      return;
    }
    if (resp.status === 201) {
      msg.textContent = 'Program created!';
      msg.className = 'text-green-700';
      setTimeout(() => window.location.href = 'dashboard.html', 500);
    } else {
      const text = await resp.text();
      msg.textContent = text || 'Error';
      msg.className = 'text-red-600';
    }
  });
});
