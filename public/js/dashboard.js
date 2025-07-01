document.addEventListener('DOMContentLoaded', async () => {
  if (!localStorage.getItem('jwtToken')) {
    window.location.href = 'login.html';
    return;
  }

  const res = await fetch('/api/programs', { headers: { 'Cookie': document.cookie } });
  if (res.status !== 200) {
    window.location.href = 'login.html';
    return;
  }
  const data = await res.json();
  document.getElementById('main-content').classList.remove('hidden');
  const listEl = document.getElementById('programList');
  if (!data.programs || data.programs.length === 0) {
    window.location.href = 'onboarding.html';
    return;
  }
  data.programs.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'bg-white shadow p-4 rounded-lg flex items-center justify-between';
    li.innerHTML = `<span>${p.programName}</span><span class="px-2 py-1 rounded text-white ${p.role === 'admin' ? 'bg-blue-700' : 'bg-yellow-500 text-blue-900'}">${p.role}</span>`;
    li.addEventListener('click', () => selectProgram(p));
    listEl.appendChild(li);
    if (idx === 0) selectProgram(p);
  });

  function selectProgram(p) {
    document.getElementById('userRole').textContent = `${data.username} - ${p.role}`;
    document.getElementById('features').classList.remove('hidden');
    if (p.role === 'counselor') {
      document.querySelectorAll('#features > div:nth-child(1)').forEach(el => el.classList.add('hidden'));
    } else {
      document.querySelectorAll('#features > div').forEach(el => el.classList.remove('hidden'));
    }
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    window.location.href = 'login.html';
  });
});
