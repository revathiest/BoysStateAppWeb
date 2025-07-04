// Always use the API base URL from config.js if present
const apiBase =
  (typeof window.API_URL !== 'undefined' && window.API_URL) ||
  (typeof window.apiBase !== 'undefined' && window.apiBase) ||
  "";

  function getFilters() {
    let level = document.getElementById('level').value;
    let source = document.getElementById('source').value;
  
    return {
      programId: document.getElementById('programId').value, // "unknown" is valid!
      start: document.getElementById('start').value,
      end: document.getElementById('end').value,
      level: level === 'all' ? undefined : level,
      source: source === 'all' ? undefined : source,
      search: document.getElementById('search').value.trim(),
      // Add page and pageSize here for pagination if needed
    };
  }
  

async function fetchLogs(params = {}) {
  const token = window.ensureValidToken ? await window.ensureValidToken(apiBase) : localStorage.getItem('jwtToken');
  if (!token) {
    if (window.location) window.location.href = 'login.html';
    return;
  }
  // Always require programId (e.g., "unknown" is valid)
  if (!params.programId) {
    alert('Program ID is required.');
    if (window.logToServer) {
      window.logToServer('No programId selected for log fetch', { level: 'warn', params });
    }
    return;
  }

  // Date logic (convert to dateFrom/dateTo for API)
  if (params.start) {
    params.dateFrom = params.start + 'T00:00:00Z';
    delete params.start;
  }
  if (params.end) {
    params.dateTo = params.end + 'T23:59:59Z';
    delete params.end;
  }
  // Remove only undefined/null fields (leave empty string and "unknown")
  Object.keys(params).forEach(key => {
    if (params[key] === undefined || params[key] === null) delete params[key];
  });

  // Default pagination (first page, 50 per page)
  if (!params.page) params.page = 1;
  if (!params.pageSize) params.pageSize = 50;

  console.log('Params for URL:', params);
  const query = new URLSearchParams(params).toString();
  console.log('Query string:', query);
  const url = `${apiBase}/logs?${query}`;
  console.log('Final fetch URL:', url);
  

  // Log the outgoing request
  if (window.logToServer) {
    window.logToServer('Fetching logs', {
      level: 'info',
      source: 'logs.js',
      params,
      url,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  // For quick debugging, also show in the console:
  console.log('Fetching logs from:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (window.logToServer) {
      window.logToServer('Logs API response', {
        level: 'info',
        source: 'logs.js',
        status: response.status
      });
    }

    if (!response.ok) throw new Error('API error');
    const apiResp = await response.json();

    if (window.logToServer) {
      window.logToServer('Logs API response body', {
        level: 'info',
        source: 'logs.js',
        apiResp
      });
    }

    const { logs, total, page, pageSize } = apiResp;
    renderLogs(logs || []);
    renderPager(page, pageSize, total);

  } catch (err) {
    if (window.logToServer) {
      window.logToServer('Logs API error', {
        level: 'error',
        source: 'logs.js',
        error: err
      });
    }
    renderLogs([]);
  }
}

function renderLogs(logs) {
  const tbody = document.querySelector('#logTable tbody');
  tbody.innerHTML = '';
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-gray-400">No logs found.</td></tr>`;
    return;
  }
  for (const log of logs) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2 whitespace-nowrap">${log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
      <td class="px-4 py-2 whitespace-nowrap">${log.level || ''}</td>
      <td class="px-4 py-2 whitespace-nowrap">${log.source || ''}</td>
      <td class="px-4 py-2">${log.message || ''}</td>
    `;
    tbody.appendChild(row);
  }
}

// Render pager based on total logs/pages
function renderPager(page, pageSize, total) {
  const pager = document.getElementById('pager');
  pager.innerHTML = '';
  if (!total || total <= pageSize) return;
  const totalPages = Math.ceil(total / pageSize);
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `px-2 py-1 rounded ${p === page ? 'bg-legend-blue text-white font-bold' : 'bg-gray-200 text-gray-700'} mx-1`;
    btn.textContent = p;
    btn.onclick = () => {
      fetchLogs({ ...getFilters(), page: p });
    };
    pager.appendChild(btn);
  }
}

document.getElementById('apply').addEventListener('click', () => {
  fetchLogs(getFilters());
});

// Support Enter key in filter form
document.getElementById('filters').addEventListener('submit', e => {
  e.preventDefault();
  fetchLogs(getFilters());
});

// On first load, show first page of logs
document.addEventListener('DOMContentLoaded', async () => {
  const apiBaseLocal =
    (typeof window.API_URL === 'string' && window.API_URL.trim()) ||
    (typeof window.apiBase !== 'undefined' && window.apiBase) ||
    '';
  if (!apiBaseLocal) {
    alert('Configuration error: API_URL is not set. Please contact the site administrator.');
    return;
  }

  let token = null;
  if (window.ensureValidToken) {
    token = await window.ensureValidToken(apiBaseLocal);
  }
  if (!token && typeof localStorage !== 'undefined') {
    try { token = localStorage.getItem('jwtToken'); } catch {}
  }
  if (!token) {
    if (window.location) window.location.href = 'login.html';
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && typeof logoutBtn.addEventListener === 'function') {
    logoutBtn.addEventListener('click', () => {
      if (typeof localStorage !== 'undefined') {
        try { localStorage.removeItem('jwtToken'); } catch {}
      }
      if (window.location) window.location.href = 'login.html';
    });
  }
  
  document.getElementById("download").addEventListener("click", function() {
    // 1. Get table rows (only those currently shown)
    const table = document.getElementById("logTable");
    const rows = table.querySelectorAll("tr");
  
    // 2. Build CSV string
    let csv = '';
    // Optional: build headers from first row (thead)
    const headerCells = table.querySelectorAll("thead th");
    let headers = [];
    headerCells.forEach(th => headers.push(th.textContent.trim()));
    csv += headers.join(",") + "\n";
  
    // Table body rows
    const bodyRows = table.querySelectorAll("tbody tr");
    bodyRows.forEach(row => {
      let rowData = [];
      row.querySelectorAll("td").forEach(cell => {
        // Escape commas, double quotes, and line breaks in cell values
        let val = cell.textContent.replace(/"/g, '""').replace(/\n/g, ' ');
        if(val.includes(",") || val.includes('"')) {
          val = `"${val}"`;
        }
        rowData.push(val.trim());
      });
      csv += rowData.join(",") + "\n";
    });
  
    // 3. Download the CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
  

  fetchLogs(getFilters());
});
