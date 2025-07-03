(async function(){
  const apiBase = window.API_URL;
  let token = await window.ensureValidToken(apiBase);
  if(!token){
    window.location.href = 'login.html';
    return;
  }

  const tbody = document.querySelector('#logTable tbody');
  const pager = document.getElementById('pager');

  async function fetchLogs(page=1){
    const params = new URLSearchParams();
    const start = document.getElementById('start').value;
    const end = document.getElementById('end').value;
    const search = document.getElementById('search').value;
    const source = document.getElementById('source').value;
    const levelSel = Array.from(document.getElementById('level').selectedOptions).map(o=>o.value);
    if(start) params.set('start', new Date(start).toISOString());
    if(end) params.set('end', new Date(end).toISOString());
    if(search) params.set('search', search);
    if(source) params.set('source', source);
    levelSel.forEach(l=>params.append('level', l));
    params.set('page', page);
    const res = await fetch(`${apiBase}/api/logs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    render(data.items);
    renderPager(page, data.total);
  }

  function render(items){
    tbody.innerHTML = '';
    items.forEach(i=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="px-2 py-1 whitespace-nowrap">${i.timestamp}</td>`+
                     `<td class="px-2 py-1">${i.level}</td>`+
                     `<td class="px-2 py-1">${i.source}</td>`+
                     `<td class="px-2 py-1 truncate max-w-xs">${i.message}</td>`;
      tr.addEventListener('click', ()=>alert(i.message + (i.error ? '\n'+i.error : '')));
      tbody.appendChild(tr);
    });
  }

  function renderPager(page,total){
    const pageSize = 50;
    const pages = Math.ceil(total/pageSize) || 1;
    pager.innerHTML = '';
    const prev = document.createElement('button');
    prev.textContent = '<';
    prev.disabled = page<=1;
    prev.addEventListener('click',()=>fetchLogs(page-1));
    pager.appendChild(prev);
    const span = document.createElement('span');
    span.textContent = `${page} / ${pages}`;
    pager.appendChild(span);
    const next = document.createElement('button');
    next.textContent = '>';
    next.disabled = page>=pages;
    next.addEventListener('click',()=>fetchLogs(page+1));
    pager.appendChild(next);
  }

  document.getElementById('apply').addEventListener('click',()=>fetchLogs());
  fetchLogs();
})();
