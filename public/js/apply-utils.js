// js/apply-utils.js

function getProgramId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('programId');
}

async function fetchApplicationConfig(programId) {
    const url = `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('Could not load application configuration.');
    return await response.json();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getProgramId, fetchApplicationConfig };
}

