const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const HOME_SESSION_DIR = path.join(os.homedir(), '.aispeech');
const HOME_SESSION_FILE = path.join(HOME_SESSION_DIR, 'session.json');
const LOCAL_SESSION_FILE = path.resolve(__dirname, '../.session.json');

/**
 * Resolve where session file should be read/written.
 */
function getSessionPath() {
  if (fs.existsSync(LOCAL_SESSION_FILE)) {
    return LOCAL_SESSION_FILE;
  }
  if (fs.existsSync(HOME_SESSION_FILE)) {
    return HOME_SESSION_FILE;
  }
  return LOCAL_SESSION_FILE;
}

/**
 * Check if a session exists and has SAPISID.
 */
function hasSession() {
  try {
    const session = loadSession();
    return !!(session && session.sapisid);
  } catch {
    return false;
  }
}

/**
 * Load stored session.
 */
function loadSession() {
  const p = getSessionPath();
  if (!fs.existsSync(p)) return null;

  try {
    const content = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(content);
    if (!data || !data.cookies) return null;

    // Ensure sapisid is extracted
    const sapisid = data.sapisid || data.cookies.SAPISID || data.cookies['__Secure-1PAPISID'] || data.cookies['__Secure-3PAPISID'];
    data.sapisid = sapisid;

    if (!data.cookieHeader) {
      data.cookieHeader = Object.entries(data.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Parse standard HTTP Cookie string, cURL command (-b or -H), or Request Headers block into key-value map.
 */
function parseCookieString(raw) {
  if (!raw || typeof raw !== 'string') return {};

  let str = raw.trim();

  // 1. If it's a full cURL command (Chrome "Copy as cURL" uses -b '...' or -H 'cookie: ...')
  const curlCookieMatch = str.match(/(?:-b|--cookie)\s+['"]([^'"]+)['"]/i) ||
                          str.match(/(?:-H|--header)\s+['"]cookie:\s*([^'"]+)['"]/i);
  if (curlCookieMatch) {
    str = curlCookieMatch[1];
  } else {
    // 2. If it's copied as "Cookie: foo=bar; ..." or contains a Cookie: header line
    const cookieHeaderMatch = str.match(/(?:^|\n)cookie:\s*([^\n]+)/i);
    if (cookieHeaderMatch) {
      str = cookieHeaderMatch[1].trim();
    }
  }

  const cookies = {};
  const parts = str.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      // Only accept valid cookie keys (alphanumeric, underscores, hyphens, dots)
      if (/^[a-zA-Z0-9_\-\.]+$/.test(k)) {
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        cookies[k] = v;
      }
    }
  }
  return cookies;
}

/**
 * Save cookies and metadata into session file.
 * 
 * @param {Record<string, string>|Array<{name: string, value: string}>|string} input 
 * @param {string} source 
 * @returns {string} Path to saved file
 */
function saveSession(input, source = 'manual') {
  let cookieMap = {};

  if (typeof input === 'string') {
    cookieMap = parseCookieString(input);
  } else if (Array.isArray(input)) {
    for (const item of input) {
      if (item && item.name && item.value !== undefined) {
        cookieMap[item.name] = item.value;
      }
    }
  } else if (typeof input === 'object' && input !== null) {
    cookieMap = { ...input };
  }

  const sapisid = cookieMap.SAPISID || cookieMap['__Secure-1PAPISID'] || cookieMap['__Secure-3PAPISID'];
  if (!sapisid) {
    throw new Error(
      'Invalid session cookies: Missing "SAPISID" or "__Secure-1PAPISID".\n' +
      'Make sure you copy cookies while logged into https://aistudio.google.com'
    );
  }

  const cookieHeader = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');

  const sessionData = {
    updatedAt: new Date().toISOString(),
    source,
    sapisid,
    cookies: cookieMap,
    cookieHeader
  };

  // Always save locally in the project directory (not globalised yet)
  let targetPath = LOCAL_SESSION_FILE;
  try {
    fs.writeFileSync(LOCAL_SESSION_FILE, JSON.stringify(sessionData, null, 2), { mode: 0o600 });
  } catch {
    // Fallback to home directory only if local write fails
    if (!fs.existsSync(HOME_SESSION_DIR)) {
      fs.mkdirSync(HOME_SESSION_DIR, { recursive: true });
    }
    fs.writeFileSync(HOME_SESSION_FILE, JSON.stringify(sessionData, null, 2), { mode: 0o600 });
    targetPath = HOME_SESSION_FILE;
  }

  return targetPath;
}

/**
 * Purge session file.
 */
function clearSession() {
  let removed = false;
  if (fs.existsSync(HOME_SESSION_FILE)) {
    try { fs.unlinkSync(HOME_SESSION_FILE); removed = true; } catch {}
  }
  if (fs.existsSync(LOCAL_SESSION_FILE)) {
    try { fs.unlinkSync(LOCAL_SESSION_FILE); removed = true; } catch {}
  }
  return removed;
}

/**
 * Extract live session cookies directly from running Chrome instance via CDP.
 */
async function importSessionFromChromeCDP() {
  const activePortPath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/DevToolsActivePort');
  if (!fs.existsSync(activePortPath)) {
    throw new Error(
      'Google Chrome DevTools active port not found.\n' +
      'Please make sure Chrome is running with remote debugging or enable it at chrome://inspect/#remote-debugging'
    );
  }

  const lines = fs.readFileSync(activePortPath, 'utf8').trim().split('\n');
  const port = lines[0].trim();
  const browserPath = lines[1].trim();
  const wsUrl = `ws://127.0.0.1:${port}${browserPath}`;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let msgId = 1;
  const handlers = new Map();
  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.id && handlers.has(data.id)) {
        const { resolve, reject } = handlers.get(data.id);
        handlers.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    } catch {}
  };

  function send(method, params = {}, sessionId = null) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      handlers.set(id, { resolve, reject });
      const req = { id, method, params };
      if (sessionId) req.sessionId = sessionId;
      ws.send(JSON.stringify(req));
    });
  }

  try {
    const targets = await send('Target.getTargets');
    let target = targets.targetInfos.find(t => t.url && t.url.includes('aistudio.google.com'));

    let sessionId = null;
    if (target) {
      const attachRes = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
      sessionId = attachRes.sessionId;
    }

    const cookiesRes = await send('Network.getCookies', {
      urls: [
        'https://aistudio.google.com',
        'https://alkalimakersuite-pa.clients6.google.com',
        'https://google.com'
      ]
    }, sessionId);

    ws.close();

    if (!cookiesRes || !cookiesRes.cookies || cookiesRes.cookies.length === 0) {
      throw new Error('No cookies returned from Chrome for Google AI Studio.');
    }

    const savedPath = saveSession(cookiesRes.cookies, 'chrome-cdp');
    return {
      success: true,
      path: savedPath,
      cookieCount: cookiesRes.cookies.length
    };
  } catch (err) {
    ws.close();
    throw err;
  }
}

/**
 * Validate session against Google WAA endpoint.
 */
async function validateSession(session = null) {
  const current = session || loadSession();
  if (!current || !current.sapisid) {
    return { valid: false, reason: 'No session found. Run "aispeech login" first.' };
  }

  const origin = 'https://aistudio.google.com';
  const now = Math.floor(Date.now() / 1000);
  const hash = crypto.createHash('sha1').update(`${now} ${current.sapisid} ${origin}`).digest('hex');
  const authHeader = `SAPISIDHASH ${now}_${hash} SAPISID1PHASH ${now}_${hash} SAPISID3PHASH ${now}_${hash}`;

  try {
    const res = await fetch('https://waa-pa.clients6.google.com/$rpc/google.internal.waa.v1.Waa/Create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json+protobuf',
        'X-Goog-Api-Key': 'AIzaSyBGb5fGAyC-pRcRU6MUHb__b_vKha71HRE',
        'X-Goog-AuthUser': '0',
        'Authorization': authHeader,
        'Origin': origin,
        'Referer': origin + '/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'dnt': '1',
        'Cookie': current.cookieHeader
      },
      body: JSON.stringify(['lmnUSbltwc5ULv48iKLX'])
    });

    if (res.status === 200) {
      const data = await res.json();
      if (Array.isArray(data) && data[1]) {
        return {
          valid: true,
          status: 200,
          source: current.source,
          updatedAt: current.updatedAt
        };
      }
    }

    return {
      valid: false,
      status: res.status,
      reason: `WAA authentication returned HTTP ${res.status}. Session cookies may be expired.`
    };
  } catch (err) {
    return {
      valid: false,
      reason: `Connection error during session validation: ${err.message}`
    };
  }
}

module.exports = {
  getSessionPath,
  hasSession,
  loadSession,
  saveSession,
  clearSession,
  parseCookieString,
  importSessionFromChromeCDP,
  validateSession,
  HOME_SESSION_FILE,
  LOCAL_SESSION_FILE
};
