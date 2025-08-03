// application-service.js

function getProgramId() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('programId') ||
    localStorage.getItem('lastSelectedProgramId') ||
    ''
  );
}

async function createOrCopyApplication({ programId, year, type, copyFromYear = null, fetchFn = fetch }) {
  if (!programId || !year || !type) {
    throw new Error('Missing parameters');
  }
  const authHeaders = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

  // Ensure year exists
  let years = [];
  try {
    const yRes = await fetchFn(`${window.API_URL}/programs/${encodeURIComponent(programId)}/years`, {
      credentials: 'include',
      headers: authHeaders,
    });
    if (yRes.ok) {
      years = await yRes.json();
    }
  } catch {}
  const exists = years.some(y => String(y.year) === String(year));
  if (!exists) {
    await fetchFn(`${window.API_URL}/programs/${encodeURIComponent(programId)}/years`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ year }),
    });
  }

  // Prevent duplicate application
  const check = await fetchFn(`${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application?year=${encodeURIComponent(year)}&type=${encodeURIComponent(type)}`, {
    credentials: 'include',
    headers: authHeaders,
  });
  if (check.ok) {
    throw new Error('Application for this year and type already exists');
  }

  let title = '';
  let description = '';
  let questions = [];
  if (copyFromYear) {
    const prevRes = await fetchFn(`${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application?year=${encodeURIComponent(copyFromYear)}&type=${encodeURIComponent(type)}`, {
      credentials: 'include',
      headers: authHeaders,
    });
    if (prevRes.ok) {
      const prev = await prevRes.json();
      title = prev.title || '';
      description = prev.description || '';
      questions = Array.isArray(prev.questions)
        ? prev.questions.map(({ id, ...rest }) => ({ ...rest }))
        : [];
    }
  }

  const payload = { year, type, title, description, questions };
  await fetchFn(`${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(payload),
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getProgramId, createOrCopyApplication };
} else {
  window.getProgramId = getProgramId;
  window.createOrCopyApplication = createOrCopyApplication;
}
