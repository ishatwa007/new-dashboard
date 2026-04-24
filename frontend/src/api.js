// api.js - Backend client
// 60s timeout (analytics can be slow due to Groq calls), 503 retry, all 3 pages

window.API = (function () {
  const BASE = (window.API_BASE || 'http://localhost:8000').replace(/\/$/, '');
  const TIMEOUT_MS = 60000;      // 60 seconds
  const RETRY_DELAY_MS = 3000;
  const MAX_RETRIES = 2;

  async function request(method, path, body, attempt = 0) {
    const url = BASE + path;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const opts = {
        method,
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }

      const res = await fetch(url, opts);
      clearTimeout(timer);

      // Retry on 503 (backend still warming up)
      if (res.status === 503 && attempt < MAX_RETRIES) {
        console.warn(`[API] ${path} got 503, retry ${attempt + 1}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        return request(method, path, body, attempt + 1);
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error(`[API] ${path} ${res.status}`, txt.slice(0, 200));
        return null;
      }

      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') {
        console.warn(`[API] ${path} timed out`);
      } else {
        console.error(`[API] ${path} error:`, e.message);
      }
      return null;
    }
  }

  const get  = (p)    => request('GET', p);
  const post = (p, b) => request('POST', p, b);

  // ── Analytics (Page 1) ──────────────────────────────────────────────
  const getAnalytics = (cohortId) =>
    get(`/analytics/${cohortId}`);

  const getCohorts = () =>
    get('/api/cohorts');

  const getPSAs = (cohortId) =>
    get(`/api/psas/${cohortId}`);

  const getLSMStats = (cohort = 'april2026') =>
    get(`/api/lsm-stats?cohort=${cohort}`);

  const refreshAll = () =>
    post('/refresh');

  const clearCache = (cohortId) =>
    get(`/analytics/${cohortId}?refresh=true`);

  // ── Requests (Page 2) ───────────────────────────────────────────────
  const getRequests = (cohort = 'april2026') =>
    get(`/api/requests?cohort=${cohort}`);

  const approveRequest = (requestId, note, manager = 'Manager') =>
    post('/api/requests/approve', { request_id: requestId, note, manager });

  const rejectRequest = (requestId, reason, manager = 'Manager') =>
    post('/api/requests/reject', { request_id: requestId, reason, manager });

  const classifyRequest = (body, requestType = '') =>
    post('/api/classify', { body, request_type: requestType });

  // ── Program Health (Page 3) ─────────────────────────────────────────
  const getProgramHealth = (cohort = {id: 'april2026'}) =>
    get(`/api/program/health?cohort=${encodeURIComponent(cohort.id || cohort || 'april2026')}`);

  const getMentorNoshows = (cohort = {id: 'april2026'}) =>
    get(`/api/mentor/noshows/${encodeURIComponent(cohort.id || cohort || 'april2026')}`);

  const getMentorBackend = (cohort = {id: 'april2026'}) =>
    get(`/api/mentor/backend/${encodeURIComponent(cohort.id || cohort || 'april2026')}`);

  const resolveIncident = (id, email, notes) =>
    post('/api/program/resolve', {
      incident_id: id,
      resolver_email: email,
      notes,
    });

  const escalateIncident = (id, email, escalateTo, reason) =>
    post('/api/program/escalate', {
      incident_id: id,
      escalator_email: email,
      escalate_to: escalateTo,
      reason,
    });

  // ── Health / Debug ──────────────────────────────────────────────────
  const health = () => get('/health');

  return {
    // page 1
    getAnalytics, getCohorts, getPSAs, getLSMStats, refreshAll, clearCache,
    // page 2
    getRequests, approveRequest, rejectRequest, classifyRequest,
    // page 3
    getProgramHealth, resolveIncident, escalateIncident, getMentorNoshows, getMentorBackend,
    // misc
    health,
  };
})();
