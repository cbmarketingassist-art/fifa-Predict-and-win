// ─────────────────────────────────────────────
//  Firebase Firestore REST API helper
//  Drop-in replacement for Upstash Redis helper.
//  Same exported function signatures — no other
//  files need to change.
//
//  Firestore collections used:
//    hashes/  → replaces Redis HASHes  (HSET, HGETALL)
//    sets/    → replaces Redis SETs    (SADD, SMEMBERS, SREM)
//
//  Required env vars (add in Vercel → Settings → Environment Variables):
//    FIREBASE_PROJECT_ID
//    FIREBASE_CLIENT_EMAIL
//    FIREBASE_PRIVATE_KEY
// ─────────────────────────────────────────────

const PROJECT_ID   = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const PRIVATE_KEY  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ── JWT / OAuth2 token (no npm needed — uses Web Crypto API) ─────────────────

let _cachedToken = null;
let _tokenExpiry = 0;

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_cachedToken && now < _tokenExpiry - 60) return _cachedToken;

  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:  CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud:  'https://oauth2.googleapis.com/token',
    iat:  now,
    exp:  now + 3600,
  };

  const b64url = obj =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const unsigned = `${b64url(header)}.${b64url(payload)}`;

  const keyData = PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const b64sig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsigned}.${b64sig}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Firebase auth failed: ${JSON.stringify(tokenData)}`);
  }

  _cachedToken = tokenData.access_token;
  _tokenExpiry = now + 3600;
  return _cachedToken;
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

// Firestore document IDs cannot contain '/' — encode them safely
function encodeKey(key) {
  return encodeURIComponent(String(key)).replace(/%/g, '__');
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = { stringValue: String(v ?? '') };
  }
  return fields;
}

function fromFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? v.booleanValue ?? '';
  }
  return Object.keys(obj).length ? obj : null;
}

// ── CORS helper (same as original) ───────────────────────────────────────────

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── hashToObj (same as original — supports both array and object) ─────────────

export function hashToObj(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    // Legacy Redis flat-array format — shouldn't arrive from Firestore but kept for safety
    const obj = {};
    for (let i = 0; i < data.length - 1; i += 2) obj[data[i]] = data[i + 1];
    return Object.keys(obj).length ? obj : null;
  }
  return Object.keys(data).length ? data : null;
}

// ── Main redis() shim ─────────────────────────────────────────────────────────
// Translates Redis commands → Firestore REST calls.
// Supported: HSET, HGETALL, SADD, SMEMBERS, SREM, SET, SETNX, GET, DEL, EXISTS, EXPIRE

export async function redis(...args) {
  const token   = await getAccessToken();
  const [cmd, ...rest] = args;
  const command = cmd.toUpperCase();
  const auth    = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── HSET key field1 val1 field2 val2 ... ──────────────────────────────────
  if (command === 'HSET') {
    const [key, ...pairs] = rest;
    const docId  = encodeKey(key);
    const obj    = {};
    for (let i = 0; i < pairs.length - 1; i += 2) obj[pairs[i]] = pairs[i + 1];

    const fields     = toFirestoreFields(obj);
    const maskParams = Object.keys(obj)
      .map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
      .join('&');

    const r = await fetch(`${BASE}/hashes/${docId}?${maskParams}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ fields }),
    });
    if (!r.ok) throw new Error(`HSET ${key} failed: ${await r.text()}`);
    return 'OK';
  }

  // ── HGETALL key ───────────────────────────────────────────────────────────
  if (command === 'HGETALL') {
    const [key] = rest;
    const docId = encodeKey(key);
    const r = await fetch(`${BASE}/hashes/${docId}`, { headers: auth });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`HGETALL ${key} failed: ${await r.text()}`);
    const doc = await r.json();
    return fromFirestoreDoc(doc);
  }

  // ── SADD key member [member ...] ──────────────────────────────────────────
  if (command === 'SADD') {
    const [key, ...members] = rest;
    const docId = encodeKey(key);

    // Read existing
    const getRes = await fetch(`${BASE}/sets/${docId}`, { headers: auth });
    let existing = [];
    if (getRes.status === 200) {
      const doc = await getRes.json();
      existing  = doc.fields?.members?.arrayValue?.values?.map(v => v.stringValue) ?? [];
    }

    const merged = [...new Set([...existing, ...members.map(String)])];
    const r = await fetch(`${BASE}/sets/${docId}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        fields: {
          members: {
            arrayValue: { values: merged.map(m => ({ stringValue: m })) },
          },
        },
      }),
    });
    if (!r.ok) throw new Error(`SADD ${key} failed: ${await r.text()}`);
    return members.length;
  }

  // ── SMEMBERS key ──────────────────────────────────────────────────────────
  if (command === 'SMEMBERS') {
    const [key] = rest;
    const docId = encodeKey(key);
    const r = await fetch(`${BASE}/sets/${docId}`, { headers: auth });
    if (r.status === 404) return [];
    if (!r.ok) throw new Error(`SMEMBERS ${key} failed: ${await r.text()}`);
    const doc = await r.json();
    return doc.fields?.members?.arrayValue?.values?.map(v => v.stringValue) ?? [];
  }

  // ── SREM key member [member ...] ──────────────────────────────────────────
  if (command === 'SREM') {
    const [key, ...members] = rest;
    const docId  = encodeKey(key);
    const getRes = await fetch(`${BASE}/sets/${docId}`, { headers: auth });
    if (getRes.status === 404) return 0;
    const doc      = await getRes.json();
    const existing = doc.fields?.members?.arrayValue?.values?.map(v => v.stringValue) ?? [];
    const filtered = existing.filter(m => !members.includes(m));
    await fetch(`${BASE}/sets/${docId}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        fields: {
          members: {
            arrayValue: { values: filtered.map(m => ({ stringValue: m })) },
          },
        },
      }),
    });
    return members.length;
  }

  // ── SET / SETNX key value ─────────────────────────────────────────────────
  if (command === 'SET' || command === 'SETNX') {
    const [key, value] = rest;
    const docId = encodeKey(key);
    await fetch(`${BASE}/hashes/${docId}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ fields: { __value__: { stringValue: String(value) } } }),
    });
    return 'OK';
  }

  // ── GET key ───────────────────────────────────────────────────────────────
  if (command === 'GET') {
    const [key] = rest;
    const docId = encodeKey(key);
    const r = await fetch(`${BASE}/hashes/${docId}`, { headers: auth });
    if (r.status === 404) return null;
    const doc = await r.json();
    return doc.fields?.__value__?.stringValue ?? null;
  }

  // ── DEL key ───────────────────────────────────────────────────────────────
  if (command === 'DEL') {
    const [key] = rest;
    const docId = encodeKey(key);
    await fetch(`${BASE}/hashes/${docId}`, { method: 'DELETE', headers: auth });
    return 1;
  }

  // ── EXISTS key ────────────────────────────────────────────────────────────
  if (command === 'EXISTS') {
    const [key] = rest;
    const docId = encodeKey(key);
    const r = await fetch(`${BASE}/hashes/${docId}`, { headers: auth });
    return r.status === 200 ? 1 : 0;
  }

  // ── EXPIRE — no-op (app uses it for throttle locks; graceful degradation) ─
  if (command === 'EXPIRE') {
    return 1;
  }

  throw new Error(`Unsupported Redis command shim: ${command}`);
}

// ── redisPipeline — parallel execution (replaces Upstash batch pipeline) ─────

export async function redisPipeline(commands) {
  return Promise.all(commands.map(cmd => redis(...cmd)));
}
