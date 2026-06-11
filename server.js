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

function matchesHandler(res) {
  const now = new Date();
  const fmt  = d => d.toISOString().split('T')[0];
  const fmtT = d => d.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  const pastDate     = new Date(now - 48 * 3600000);
  const liveDate     = new Date(now - 30 * 60000);
  const openDate     = new Date(now + 60 * 60000);
  const upcomingDate = new Date(now + 4 * 3600000);

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
      group: 'Group K', stage: 'Group Stage'
    },
    {
      id: 4,
      date: fmt(openDate), timeIST: fmtT(openDate),
      team1: { name: 'Czechia',      flag: '🇨🇿', flagCode: 'cz', color: '#D7141A', colorDark: '#85090F' },
      team2: { name: 'South Africa', flag: '🇿🇦', flagCode: 'za', color: '#007A4D', colorDark: '#004A2F' },
      group: 'Group A', stage: 'Group Stage'
    },
    {
      id: 5,
      date: fmt(upcomingDate), timeIST: fmtT(upcomingDate),
      team1: { name: 'Netherlands', flag: '🇳🇱', flagCode: 'nl', color: '#FF6600', colorDark: '#993D00' },
      team2: { name: 'Sweden',      flag: '🇸🇪', flagCode: 'se', color: '#006AA7', colorDark: '#004066' },
      group: 'Group F', stage: 'Group Stage'
    }
  ];

  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(matches));
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // API routes
  if (urlPath === '/api/matches') { matchesHandler(res); return; }

  // Page aliases
  if (urlPath === '/')      urlPath = '/index.html';
  if (urlPath === '/admin') urlPath = '/admin.html';

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
server.listen(PORT, () => console.log(`⚽ FIFA 26 Predictor running at http://localhost:${PORT}`));
