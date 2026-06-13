// ─────────────────────────────────────────────
//  Local dev server — static files + mock API
//  Production uses Vercel serverless functions in /api (Redis-backed).
//  This mock mirrors those endpoints in-memory so the app runs locally.
// ─────────────────────────────────────────────
const http = require('http');
const fs   = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// ── In-memory mock stores ─────────────────────
const mockUsers = {};       // phone → user
const mockPredictions = {}; // `${phone}_${matchId}` → prediction

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
  });
}

// Mock matches — times tuned for the prediction window:
// opens 8h before kick-off, closes 30 min before
function matchesHandler(res) {
  const now = new Date();
  // Both date and time must be in IST — mixing a UTC date with an IST time
  // shifts matches that kick off after IST-midnight back a day (en-CA → YYYY-MM-DD).
  const fmt  = d => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const fmtT = d => d.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  const t = now.getTime();
  const pastDate     = new Date(t - 48 * 3600000);
  const liveDate     = new Date(t - 30 * 60000);   // started 30 min ago → LIVE
  const lockedDate   = new Date(t + 15 * 60000);   // kicks off in 15 min → form CLOSED
  const openDate     = new Date(t + 90 * 60000);   // kicks off in 90 min → OPEN (closes in 60m)
  const upcomingDate = new Date(t + 9 * 3600000);  // kicks off in 9 h → UPCOMING (opens in 1h)

  const matches = [
    {
      id: 1,
      date: fmt(pastDate), timeIST: '22:30',
      team1: { name: 'Germany',  flag: '🇩🇪', flagCode: 'de', color: '#DD0000', colorDark: '#8B0000' },
      team2: { name: 'Curaçao',  flag: '🇨🇼', flagCode: 'cw', color: '#003DA5', colorDark: '#002060' },
      group: 'Group E', stage: 'Group Stage', winner: 'Germany'
    },
    {
      id: 2,
      date: fmt(pastDate), timeIST: '21:30',
      team1: { name: 'Spain',      flag: '🇪🇸', flagCode: 'es', color: '#AA151B', colorDark: '#6B0D10' },
      team2: { name: 'Cape Verde', flag: '🇨🇻', flagCode: 'cv', color: '#003893', colorDark: '#00225A' },
      group: 'Group H', stage: 'Group Stage', winner: 'Spain'
    },
    {
      id: 3,
      date: fmt(liveDate), timeIST: fmtT(liveDate),
      team1: { name: 'Portugal', flag: '🇵🇹', flagCode: 'pt', color: '#006600', colorDark: '#003D00' },
      team2: { name: 'DR Congo', flag: '🇨🇩', flagCode: 'cd', color: '#007FFF', colorDark: '#004C99' },
      group: 'Group K', stage: 'Group Stage',
      score: { team1Score: 2, team2Score: 1, minute: 34 }
    },
    {
      id: 4,
      date: fmt(lockedDate), timeIST: fmtT(lockedDate),
      team1: { name: 'Czechia',      flag: '🇨🇿', flagCode: 'cz', color: '#D7141A', colorDark: '#85090F' },
      team2: { name: 'South Africa', flag: '🇿🇦', flagCode: 'za', color: '#007A4D', colorDark: '#004A2F' },
      group: 'Group A', stage: 'Group Stage'
    },
    {
      id: 5,
      date: fmt(openDate), timeIST: fmtT(openDate),
      team1: { name: 'Netherlands', flag: '🇳🇱', flagCode: 'nl', color: '#FF6600', colorDark: '#993D00' },
      team2: { name: 'Sweden',      flag: '🇸🇪', flagCode: 'se', color: '#006AA7', colorDark: '#004066' },
      group: 'Group F', stage: 'Group Stage'
    },
    {
      id: 6,
      date: fmt(upcomingDate), timeIST: fmtT(upcomingDate),
      team1: { name: 'Argentina', flag: '🇦🇷', flagCode: 'ar', color: '#74ACDF', colorDark: '#4A7BA8' },
      team2: { name: 'Japan',     flag: '🇯🇵', flagCode: 'jp', color: '#BC002D', colorDark: '#7A001E' },
      group: 'Group J', stage: 'Group Stage'
    }
  ];

  json(res, 200, matches);
}

async function usersHandler(req, res, query) {
  if (req.method === 'POST') {
    const body = await readBody(req);
    if (!body.phone) return json(res, 400, { error: 'phone required' });
    mockUsers[body.phone] = { ...mockUsers[body.phone], ...body, updatedAt: new Date().toISOString() };
    return json(res, 200, mockUsers[body.phone]);
  }
  if (query.get('all')) return json(res, 200, Object.values(mockUsers));
  const phone = query.get('phone');
  const user = phone ? mockUsers[phone] : null;
  return json(res, 200, user || {});
}

async function predictionsHandler(req, res, query) {
  if (req.method === 'POST') {
    const body = await readBody(req);
    const { phone, matchId, teamName } = body;
    if (!phone || !matchId || !teamName) return json(res, 400, { error: 'missing fields' });
    const key = `${phone}_${matchId}`;
    const updated = !!mockPredictions[key];
    mockPredictions[key] = { phone, matchId, teamName, submittedAt: new Date().toISOString(), ...(updated ? { changedAt: new Date().toISOString() } : {}), updated };
    return json(res, 200, mockPredictions[key]);
  }
  return json(res, 200, Object.values(mockPredictions));
}

const server = http.createServer(async (req, res) => {
  const [rawPath, rawQuery] = req.url.split('?');
  const query = new URLSearchParams(rawQuery || '');
  let urlPath = rawPath;

  // API routes (mock — mirrors /api serverless functions)
  if (urlPath === '/api/matches')     { matchesHandler(res); return; }
  if (urlPath === '/api/users')       { await usersHandler(req, res, query); return; }
  if (urlPath === '/api/predictions') { await predictionsHandler(req, res, query); return; }

  // Page aliases
  if (urlPath === '/')      urlPath = '/index.html';
  if (urlPath === '/admin') urlPath = '/admin.html';
  if (urlPath === '/terms') urlPath = '/terms.html';

  const filePath = path.join(__dirname, urlPath);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    // SPA fallback
    const index = path.join(__dirname, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(index).pipe(res);
    return;
  }

  const ext = path.extname(filePath);
  const ct  = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(filePath).pipe(res);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`⚽ World Cup 26 Play & Win running at http://localhost:${PORT}`));
