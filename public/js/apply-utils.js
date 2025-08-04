// js/apply-utils.js

function decodeToken(token) {
    if (!token) return {};
    try {
        const json = typeof atob === 'function' ? atob(token) : Buffer.from(token, 'base64').toString('utf-8');
        return JSON.parse(json);
    } catch {
        return {};
    }
}

function getApplicationParams() {
    const params = new URLSearchParams(window.location.search);
    const programId = params.get('programId');
    const token = params.get('token');
    const { year, type } = decodeToken(token);
    return { programId, year, type };
}

function getProgramId() {
    return getApplicationParams().programId;
}

async function fetchApplicationConfig(programId, year, type) {
    let url = `${window.API_URL}/api/programs/${encodeURIComponent(programId)}/application`;
    if (year && type) {
        url += `?year=${encodeURIComponent(year)}&type=${encodeURIComponent(type)}`;
    }
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) throw new Error('Could not load application configuration.');
    return await response.json();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getProgramId, fetchApplicationConfig, getApplicationParams };
}

