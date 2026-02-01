// Always use the API base URL from config.js if present
const apiBase =
  (typeof window.API_URL !== 'undefined' && window.API_URL) ||
  (typeof window.apiBase !== 'undefined' && window.apiBase) ||
  "";

async function loadPrograms() {
  try {
    const res = await fetch(`${apiBase}/user-programs/${getUsername()}`, {
      credentials: 'include',
      headers: typeof getAuthHeaders === "function" ? getAuthHeaders() : {}
    });
    if (!res.ok) return [];

    // Get the programs property (array) from the API response
    const data = (await res.json().catch(() => null)) || {};
    const programs = Array.isArray(data.programs) ? data.programs : [];

    const select = document.getElementById('programId');
    if (select) {
      select.innerHTML = '';
      programs.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.programId || p.id || p.programName || p.name;
        opt.textContent = p.programName || p.name || opt.value;
        select.appendChild(opt);
      });
    }
    return programs;
  } catch (err) {
    if (window.logToServer) {
      window.logToServer('Failed to load programs', { level: 'error', error: err });
    }
    return [];
  }
}

function toISODateString(dateVal, isEndOfDay = false) {
  if (!dateVal) return undefined;
  // If already has a time, just return as is (assume already UTC)
  if (dateVal.includes('T')) return dateVal;
  // Otherwise, append time and convert to ISO using local timezone
  const base = isEndOfDay ? 'T23:59:59' : 'T00:00:00';
  return new Date(dateVal + base).toISOString();
}

  function getFilters() {
    let level = document.getElementById('level').value;
    let source = document.getElementById('source').value;
    let startVal = document.getElementById('start').value;
    let endVal = document.getElementById('end').value;

    console.log('DEBUG: startVal raw:', startVal, '| endVal raw:', endVal);

      // Convert local date ("YYYY-MM-DD") to UTC start/end of day
      let startUTC = toISODateString(startVal, false); // Start of day
      let endUTC   = toISODateString(endVal, true);   // End of day
  
    return {
      programId: document.getElementById('programId').value, // "unknown" is valid!
      start: startUTC,
      end: endUTC,
      level: level === 'all' ? undefined : level,
      source: source === 'all' ? undefined : source,
      search: document.getElementById('search').value.trim(),
      // Add page and pageSize here for pagination if needed
    };
  }
  

async function fetchLogs(params = {}) {
  // Always require programId (e.g., "unknown" is valid)
  // if (!params.programId) {
  //   alert('Program ID is required.');
  //   if (window.logToServer) {
  //     window.logToServer('No programId selected for log fetch', { level: 'warn', params });
  //   }
  //   return;
  // }

  // Date logic (convert to dateFrom/dateTo for API)
  if (params.start) {
    params.dateFrom = params.start;
    delete params.start;
  }
  if (params.end) {
    params.dateTo = params.end;
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
      url
    });
  }

  // For quick debugging, also show in the console:
  console.log('Fetching logs from:', url);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: typeof getAuthHeaders === "function" ? getAuthHeaders() : {}
    });

    if (response.status === 401) {
      window.location.href = "login.html";
      return;
    }
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
  console.log('Rendering logs:', logs);
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
  const maxPagesToShow = 5;
  let start = Math.max(1, page - Math.floor(maxPagesToShow / 2));
  let end = Math.min(totalPages, start + maxPagesToShow - 1);

  if (end - start < maxPagesToShow - 1) {
    start = Math.max(1, end - maxPagesToShow + 1);
  }

  function makePagerBtn(label, p, isActive = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    // Shared classes for ALL buttons (arrows, numbers, active/inactive)
    btn.className =
      'mx-1 px-4 min-w-[3rem] min-h-[2.5rem] rounded-full border text-lg font-semibold flex items-center justify-center';
    if (isActive) {
      btn.style.background = '#2563eb';
      btn.style.color = '#fff';
      btn.style.fontWeight = 'bold';
      btn.style.cursor = 'default';
      btn.disabled = true;
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.className += ' bg-gray-100 text-gray-700 transition hover:bg-blue-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300';
      btn.onclick = () => fetchLogs({ ...getFilters(), page: p });
    }
    return btn;
  }
  
  // Numbered pages
  if (page > 1) {
    pager.appendChild(makePagerBtn('«', 1));
    pager.appendChild(makePagerBtn('‹', page - 1));
  }
  for (let p = start; p <= end; p++) {
    pager.appendChild(makePagerBtn(p, p, p === page));
  }

  // Next/Last
  if (page < totalPages) {
    pager.appendChild(makePagerBtn('›', page + 1));
    pager.appendChild(makePagerBtn('»', totalPages));
  }
}



document.getElementById('apply').addEventListener('click', () => {
  fetchLogs(getFilters());
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadPrograms, toISODateString, fetchLogs, renderLogs, renderPager };
}

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

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn && typeof logoutBtn.addEventListener === 'function') {
    logoutBtn.addEventListener('click', () => {
      if (typeof clearAuthToken === 'function') clearAuthToken();
      window.location.href = 'login.html';
    });
  }

  await loadPrograms();

  const programSel = document.getElementById('programId');
  if (programSel) {
    programSel.addEventListener('change', () => fetchLogs(getFilters()));
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
