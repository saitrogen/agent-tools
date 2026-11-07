const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadSession, validateSession } = require('./session');
const { pcmToWav, findAudioInPayload } = require('./audio');
const { resolveOutputPath } = require('./storage');
const { findVoice, DEFAULT_VOICE } = require('./voices');

const ORIGIN = 'https://aistudio.google.com';
const WAA_API_KEY = 'AIzaSyBGb5fGAyC-pRcRU6MUHb__b_vKha71HRE';
const ALKALI_API_KEY = 'AIzaSyDdP816MREB3SkjZO04QXbjsigfcI0GWOs';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

/**
 * Generate a random visit ID in the same format AI Studio uses.
 * Format: v1_<base64-encoded UUID>
 */
function generateVisitId() {
  const uuid = crypto.randomUUID();
  return `v1_${Buffer.from(uuid).toString('base64').replace(/=/g, '')}`;
}

/**
 * Common browser-fingerprint headers that AI Studio expects.
 * These are public constants shipped in every Chrome build, not user-specific.
 */
const BROWSER_HEADERS = {
  'x-browser-channel': 'stable',
  'x-browser-copyright': 'Copyright 2026 Google LLC. All Rights Reserved.',
  'x-browser-year': '2026',
  'x-user-agent': 'grpc-web-javascript/0.1',
  'sec-ch-ua': '"Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'dnt': '1'
};

/**
 * Compute Google SAPISIDHASH Authorization header from SAPISID cookie.
 */
function computeSapisidHash(sapisid, origin = ORIGIN) {
  const now = Math.floor(Date.now() / 1000);
  const hash = crypto.createHash('sha1').update(`${now} ${sapisid} ${origin}`).digest('hex');
  return `SAPISIDHASH ${now}_${hash} SAPISID1PHASH ${now}_${hash} SAPISID3PHASH ${now}_${hash}`;
}

/**
 * Fetch short-lived WAA challenge token from Google internal RPC.
 */
async function fetchWaaToken(authHeader, cookieHeader) {
  const res = await fetch('https://waa-pa.clients6.google.com/$rpc/google.internal.waa.v1.Waa/Create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json+protobuf',
      'X-Goog-Api-Key': WAA_API_KEY,
      'X-Goog-AuthUser': '0',
      'Authorization': authHeader,
      'Origin': ORIGIN,
      'Referer': ORIGIN + '/',
      'User-Agent': USER_AGENT,
      ...BROWSER_HEADERS,
      'Cookie': cookieHeader
    },
    body: JSON.stringify(['lmnUSbltwc5ULv48iKLX'])
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `AI Studio Session Expired (HTTP ${res.status}).\n` +
        `Please refresh your session by running:\n` +
        `  aispeech login`
      );
    }
    throw new Error(`Failed to obtain WAA token (${res.status}): ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  if (!Array.isArray(json) || !json[1] || typeof json[1] !== 'string') {
    throw new Error('Malformed WAA token response from Google.');
  }

  return json[1];
}

/**
 * Generate speech using saved AI Studio session via pure HTTP (Tier 1).
 * Completely headless, 100% free ($0), sub-second latency.
 * 
 * @param {string} text
 * @param {object} options
 * @returns {Promise<{filePath: string, isTemp: boolean, bytes: number, voice: string, model: string, durationMs: number, mode: string}>}
 */
async function generateSpeechHttp(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error('Please provide text to generate speech');
  }

  const session = loadSession();
  if (!session || !session.sapisid) {
    throw new Error(
      'No active AI Studio session found.\n' +
      'Please log in first with:\n' +
      '  aispeech login\n' +
      'or provide a Gemini API key with:\n' +
      '  aispeech auth <api-key>'
    );
  }

  const startTime = Date.now();
  const voiceInfo = findVoice(options.voice || DEFAULT_VOICE);
  const voiceName = voiceInfo ? voiceInfo.name : 'Puck';
  const model = options.model || 'gemini-3.8-flash-tts';

  // 1. Generate fresh SAPISIDHASH
  const authHeader = computeSapisidHash(session.sapisid, ORIGIN);

  // 2. Fetch fresh WAA challenge token
  const waaToken = await fetchWaaToken(authHeader, session.cookieHeader);

  // 3. Dispatch MakerSuite GenerateContent RPC
  const visitId = generateVisitId();

  // Build the inner content part: a 41-element array matching the protobuf schema.
  // Index 0 = null, index 1 = text, indices 2-39 = null padding,
  // index 40 = optional system instruction (voice/style prompt).
  const contentPart = new Array(41).fill(null);
  contentPart[1] = text.trim();

  // If a system instruction / style prompt is provided, place it at index 40
  if (options.systemInstruction) {
    contentPart[40] = [null, options.systemInstruction];
  }

  const payload = [
    `models/${model}`,
    [[[contentPart], "user"]],
    null,
    [null, null, null, null, 1, 0.95, 64, null, null, null, null, null, null, null, [3], [[[voiceName]]]],
    waaToken
  ];

  const genRes = await fetch('https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/GenerateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json+protobuf',
      'X-Goog-Api-Key': ALKALI_API_KEY,
      'X-Goog-AuthUser': '0',
      'X-AIStudio-G1-Tier': 'TIER1',
      'X-AIStudio-Visit-Id': visitId,
      'X-Goog-Ext-519733851-Bin': 'CAASAUIwATgEQABQBFgDYgJJTnAAeAGQAQCYAQE=',
      'Authorization': authHeader,
      'Origin': ORIGIN,
      'Referer': ORIGIN + '/',
      'User-Agent': USER_AGENT,
      ...BROWSER_HEADERS,
      'Cookie': session.cookieHeader
    },
    body: JSON.stringify(payload)
  });

  const durationMs = Date.now() - startTime;

  if (!genRes.ok) {
    const errText = await genRes.text();
    if (genRes.status === 401 || genRes.status === 403) {
      throw new Error(
        `Google AI Studio authorization failed (${genRes.status}).\n` +
        `Your login session has expired. Please run:\n` +
        `  aispeech login`
      );
    }
    throw new Error(`Google AI Studio speech RPC error (${genRes.status}): ${errText.slice(0, 300)}`);
  }

  const resJson = await genRes.json();
  const audioData = findAudioInPayload(resJson);

  if (!audioData || !audioData.base64) {
    throw new Error('Google AI Studio returned a response but no audio stream was found.');
  }

  // Convert raw 24kHz 16-bit PCM to standard WAV
  const pcmBuffer = Buffer.from(audioData.base64, 'base64');
  const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);

  // Resolve storage path according to workspace hygiene policy
  const fileInfo = resolveOutputPath({
    prefix: `speech_${voiceName.toLowerCase()}`,
    extension: '.wav',
    save: options.save,
    customDir: options.customDir
  });

  fs.writeFileSync(fileInfo.filePath, wavBuffer);

  return {
    filePath: fileInfo.filePath,
    isTemp: fileInfo.isTemp,
    bytes: wavBuffer.length,
    voice: voiceName,
    model,
    durationMs,
    mode: 'session-http'
  };
}

module.exports = {
  computeSapisidHash,
  fetchWaaToken,
  generateSpeechHttp
};
