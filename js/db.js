// ─────────────────────────────────────────────
//  DB Layer — Server API + In-Memory Cache
//  Replaces localStorage with Upstash Redis via API routes
// ─────────────────────────────────────────────
const DB = (() => {
  const SESSION_KEY = 'cb_fifa_session';

  // ── In-memory cache (loaded on boot, refreshed periodically) ──
  let _predictions = [];
  let _userCache   = {};

  // ── API helpers ───────────────────────────────
  async function _get(url) {
    try {
      const r = await fetch(url);
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  async function _post(url, body) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await r.json();
    } catch { return { error: 'Network error' }; }
  }

  // ── Session (localStorage — per-device, stays local) ──────
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }
  function setSession(phone) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ phone, loginAt: new Date().toISOString() }));
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  // ── Users (async — server API) ────────────────
  async function getUser(phone) {
    if (_userCache[phone]) return _userCache[phone];
    const u = await _get(`/api/users?phone=${phone}`);
    if (u && u.phone) { _userCache[phone] = u; return u; }
    return null;
  }

  async function saveUser(user) {
    const saved = await _post('/api/users', user);
    if (saved && saved.phone) _userCache[saved.phone] = saved;
    return saved;
  }

  async function userExists(phone) {
    const u = await getUser(phone);
    return !!(u && u.phone);
  }

  async function getAllUsers() {
    return (await _get('/api/users?all=1')) || [];
  }

  // ── Predictions cache ─────────────────────────
  async function loadPredictions() {
    _predictions = (await _get('/api/predictions?all=1')) || [];
  }

  async function savePrediction(phone, matchId, teamName) {
    const result = await _post('/api/predictions', { phone, matchId, teamName });
    if (result && !result.error) {
      // Upsert in local cache too
      const existingIdx = _predictions.findIndex(p =>
        p.phone === phone && String(p.matchId) === String(matchId)
      );
      if (existingIdx >= 0) {
        _predictions[existingIdx] = result;
      } else {
        _predictions.push(result);
      }
    }
    return result;
  }

  // Sync — read from cache
  function getPrediction(phone, matchId) {
    return _predictions.find(p =>
      p.phone === phone && String(p.matchId) === String(matchId)
    ) || null;
  }

  function getMatchPredictions(matchId) {
    return _predictions.filter(p => String(p.matchId) === String(matchId));
  }

  function getUserPredictions(phone) {
    return _predictions
      .filter(p => p.phone === phone)
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  }

  function getAllPredictions() { return _predictions; }

  function getMatchStats(matchId, team1Name, team2Name) {
    const preds = getMatchPredictions(matchId);
    const t1 = preds.filter(p => p.teamName === team1Name).length;
    const t2 = preds.filter(p => p.teamName === team2Name).length;
    const total = t1 + t2 || 1;
    return {
      total: t1 + t2,
      team1: { count: t1, pct: Math.round((t1 / total) * 100) },
      team2: { count: t2, pct: Math.round((t2 / total) * 100) },
    };
  }

  // ── Scores (from MATCHES array — set by /api/matches via Redis) ──
  function getScore(matchId) {
    const m = (window.MATCHES || []).find(m => m.id === matchId);
    return m && m.score ? m.score : null;
  }

  function getAllScores() {
    const s = {};
    (window.MATCHES || []).forEach(m => { if (m.score) s[m.id] = m.score; });
    return s;
  }

  // ── No-ops (functionality moved to server) ────
  function seedDemoPredictions() {}
  function setScore() {}
  function clearScore() {}
  function setMatchMeta() {}
  function getMatchMeta() { return null; }
  function getAllMatchMeta() { return {}; }

  return {
    // Session
    getSession, setSession, clearSession,
    // Users (async)
    getUser, saveUser, userExists, getAllUsers,
    // Predictions
    loadPredictions, savePrediction,
    getPrediction, getMatchPredictions, getUserPredictions, getAllPredictions,
    getMatchStats,
    // Scores
    getScore, getAllScores,
    // No-ops (backward compat)
    seedDemoPredictions, setScore, clearScore, setMatchMeta, getMatchMeta, getAllMatchMeta,
  };
})();
