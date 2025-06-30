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

document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('main-content');
  if (main) {
    main.classList.remove('hidden');
  }
});
