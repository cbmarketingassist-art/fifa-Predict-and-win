let MATCHES = [];

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

  const now = new Date();
  const start = getMatchDateTime(match);
  const predictionOpens = new Date(start.getTime() - 4 * 60 * 60 * 1000); // 4 hours before
  const matchEnds       = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours after

  if (window.__DEMO_MODE__) return 'open';
  if (now < predictionOpens) return 'upcoming';
  if (now >= predictionOpens && now < start) return 'open';
  if (now >= start && now < matchEnds) return 'live';
  return 'finished';
}

function formatMatchDate(match) {
  const dt = getMatchDateTime(match);
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatMatchTime(match) {
  return match.timeIST + ' IST';
}

function timeUntilMatch(match) {
  const now  = new Date();
  const start = getMatchDateTime(match);
  const diff = start - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h >= 24) { const d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h'; }
  if (h > 0) return h + 'h ' + m + 'm';
  if (m > 0) return m + 'm ' + s + 's';
  return s + 's';
}

function timeUntilPredictionOpens(match) {
  const now = new Date();
  const start = getMatchDateTime(match);
  const opens = new Date(start.getTime() - 4 * 60 * 60 * 1000);
  const diff = opens - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) { const d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h'; }
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}
