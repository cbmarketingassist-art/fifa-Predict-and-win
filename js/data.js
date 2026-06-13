var MATCHES = []; // var (not let) so window.MATCHES works — db.js reads scores from it

// ── Prediction window (per T&C) ───────────────
//  Opens 8 hours before kick-off
//  Closes 30 minutes before kick-off
const PRED_OPEN_MS  = 8 * 60 * 60 * 1000;
const PRED_CLOSE_MS = 30 * 60 * 1000;

async function fetchMatches() {
  try {
    const res = await fetch('/api/matches');
    if (!res.ok) throw new Error('API response was not ok');
    MATCHES = await res.json();
  } catch (error) {
    console.error('Failed to fetch matches:', error);
  }
}

function getMatchDateTime(match) {
  return new Date(match.date + 'T' + match.timeIST + ':00+05:30');
}

function getMatchStatus(match) {
  // Server-side status override (set by admin)
  if (match.statusOverride) return match.statusOverride;

  const now   = new Date();
  const start = getMatchDateTime(match);
  const predictionOpens  = new Date(start.getTime() - PRED_OPEN_MS);
  const predictionCloses = new Date(start.getTime() - PRED_CLOSE_MS);
  const matchEnds        = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  if (now < predictionOpens)  return 'upcoming';
  if (now < predictionCloses) return 'open';
  if (now < start)            return 'locked';   // form closed, match not started
  if (now < matchEnds)        return 'live';
  return 'finished';
}

function formatMatchDate(match) {
  const dt = getMatchDateTime(match);
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatMatchTime(match) {
  return match.timeIST + ' IST';
}

function _fmtDiff(diff, withSeconds) {
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) { const d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h'; }
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return withSeconds ? m + 'm ' + s + 's' : m + 'm';
  return s + 's';
}

function timeUntilMatch(match) {
  const diff = getMatchDateTime(match) - new Date();
  if (diff <= 0) return null;
  return _fmtDiff(diff, true);
}

function timeUntilPredictionOpens(match) {
  const opens = new Date(getMatchDateTime(match).getTime() - PRED_OPEN_MS);
  const diff = opens - new Date();
  if (diff <= 0) return null;
  return _fmtDiff(diff, false);
}

function timeUntilPredictionCloses(match) {
  const closes = new Date(getMatchDateTime(match).getTime() - PRED_CLOSE_MS);
  const diff = closes - new Date();
  if (diff <= 0) return null;
  return _fmtDiff(diff, true);
}
