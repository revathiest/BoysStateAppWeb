tailwind.config = {
  theme: {
    extend: {
      colors: {
        'legend-blue': '#1B3D6D',
        'legend-gold': '#FFD700'
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {console.log("On console.html, jwtToken:", localStorage.getItem('jwtToken'));
if (!localStorage.getItem('jwtToken')) {
  window.location.href = 'login.html';
  return;
}

document.getElementById('main-content').classList.remove('hidden');

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('jwtToken');
      jwtToken = null;
      window.location.href = 'login.html'; // Redirect to login or home
    });
  }

  // Optionally: Block access if not logged in
  if (!localStorage.getItem('jwtToken')) {
    window.location.href = 'login.html';
  }
});

