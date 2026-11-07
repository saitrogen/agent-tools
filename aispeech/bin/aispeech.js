#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  generateSpeech,
  generateDialogue,
  saveApiKey,
  resolveApiKey,
  getStoredApiKey,
  DEFAULT_VOICE,
  DEFAULT_MODEL
} = require('../src/api');
const {
  generateSpeechHttp
} = require('../src/http_client');
const {
  loadSession,
  saveSession,
  clearSession,
  hasSession,
  validateSession,
  importSessionFromChromeCDP,
  getSessionPath,
  parseCookieString
} = require('../src/session');
const {
  generateSpeechInBrowser
} = require('../src/browser');
const {
  listVoices,
  findVoice,
  VOICES
} = require('../src/voices');
const {
  clearTempCache,
  clearLocalAudio,
  getTempStats,
  LOCAL_BASE,
  TEMP_BASE
} = require('../src/storage');
const { playAudio } = require('../src/player');

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
AI Studio Speech CLI (aispeech) - Pure HTTP Session & Gemini TTS

Usage:
  aispeech "<text>" [options]             Generate speech (default: fast headless HTTP)
  aispeech generate "<text>" [options]    Generate speech from text
  aispeech dialogue <file|text> [options] Multi-speaker dialogue generator
  aispeech login [options]                Capture & save your AI Studio session ($0)
  aispeech session [--status | --clear]   Inspect or clear saved session
  aispeech logout                         Clear saved login session
  aispeech voices [query]                 List or search studio voices
  aispeech auth <api-key>                 Store your Gemini API key locally
  aispeech clean [--local]                Purge temporary cache or local ./audio/

Options:
  --voice, -v <name>     Voice name (default: "Puck")
  --model, -m <model>    Model ID (default: "gemini-3.8-flash-tts")
  --save, -s [dir]       Save audio to ./audio/ (or custom dir) instead of temp
  --play, -p             Immediately play the audio via macOS afplay
  --session              Force session HTTP mode (100% Free, $0)
  --browser, -b          Force browser CDP UI mode
  --api, -a              Force Gemini REST API mode (uses GEMINI_API_KEY)
  --key, -k <api-key>    Provide Gemini API key directly
  --speaker1, -v1 <name> Voice for Speaker 1 in dialogue (default: "Kore")
  --speaker2, -v2 <name> Voice for Speaker 2 in dialogue (default: "Puck")
  --json, -j             Output structured JSON result
  --help, -h             Show this help message

Login Options:
  aispeech login                     Auto-import from active Chrome session
  aispeech login --cookies "<str>"   Import from raw cookie string (needs SAPISID)
  aispeech login --file <path>       Import cookies from file
  aispeech login --browser           Import via Chrome DevTools Protocol

Vocal Expression Tags:
  You can embed acting cues directly inside text:
    <whisper>secret message</whisper>
    <laugh>that was funny</laugh>
    <sigh>what a long day</sigh>
    <pause> (or <short pause>)

Examples:
  # 1. Login once with your active AI Studio session
  aispeech login

  # 2. Fast, pure HTTP generation ($0 cost, 1-second latency)
  aispeech "Hello! This is 100% free speech generation." --play --save

  # 3. Choose a voice & save to ./audio/
  aispeech "Welcome to the future of voice synthesis." --voice Aoede --save
`);
}

function parseFlag(flagNames, defaultValue = null) {
  for (let i = 0; i < args.length; i++) {
    for (const name of flagNames) {
      if (args[i] === name) {
        if (args[i + 1] && !args[i + 1].startsWith('-')) {
          return args[i + 1];
        }
        return true;
      }
    }
  }
  return defaultValue;
}

function hasFlag(flagNames) {
  return args.some(arg => flagNames.includes(arg));
}

async function handleVoices() {
  const query = args[1] && !args[1].startsWith('-') ? args[1] : null;
  const isJson = hasFlag(['--json', '-j']);

  let results = VOICES;
  if (query) {
    const q = query.toLowerCase();
    if (q === 'female' || q === 'male' || q === 'neutral') {
      results = listVoices({ gender: q });
    } else {
      results = listVoices({ query: q });
    }
  }

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(`\n🎙️  Google AI Studio Voices (${results.length} available):\n`);
  console.log(`  ${'VOICE'.padEnd(14)} ${'GENDER'.padEnd(10)} ${'TONE'.padEnd(26)} DESCRIPTION`);
  console.log(`  ${'-'.repeat(75)}`);

  for (const v of results) {
    const mark = (v.name === DEFAULT_VOICE) ? ' (default)' : '';
    console.log(`  ${(v.name + mark).padEnd(14)} ${v.gender.padEnd(10)} ${v.tone.padEnd(26)} ${v.description}`);
  }
  console.log('\nTip: Use with --voice <name>, e.g.: aispeech "Hello" --voice Aoede\n');
}

async function handleAuth() {
  if (hasFlag(['--show'])) {
    const key = resolveApiKey();
    if (key) {
      const masked = key.slice(0, 6) + '...' + key.slice(-4);
      console.log(`API Key configured: ${masked}`);
    } else {
      console.log('No Gemini API Key found in environment or config.');
      console.log('Set GEMINI_API_KEY or run: aispeech auth <key>');
      console.log('Tip: You can also run "aispeech login" to use your free AI Studio session ($0 cost).');
    }
    return;
  }

  const key = args[1];
  if (!key || key.startsWith('-')) {
    console.error('Error: Please provide a Gemini API key.');
    console.error('Usage: aispeech auth <YOUR_GEMINI_API_KEY>');
    console.error('Get one free at: https://aistudio.google.com/apikey');
    process.exit(1);
  }

  const savedPath = saveApiKey(key);
  console.log(`✔ Gemini API key successfully saved to ${savedPath}`);
}

async function handleLogin() {
  const explicitCookies = parseFlag(['--cookies', '-c']) || (args[1] && !args[1].startsWith('-') ? args[1] : null);
  const explicitFile = parseFlag(['--file', '-f']);

  // Case 1: Direct cookie string or pasted cURL command
  if (explicitCookies && typeof explicitCookies === 'string') {
    try {
      const savedPath = saveSession(explicitCookies, 'cli-input');
      console.log(`\n✔ Session successfully saved!`);
      console.log(`  File: ${savedPath}`);
      console.log(`\nYou can now generate speech headlessly at $0 cost:\n  ./aispeech/bin/aispeech.js "Hello world!" --play\n`);
      return;
    } catch (err) {
      console.error(`\n❌ Login failed: ${err.message}`);
      process.exit(1);
    }
  }

  // Case 2: Cookie file
  if (explicitFile && typeof explicitFile === 'string') {
    if (!fs.existsSync(explicitFile)) {
      console.error(`\n❌ Error: File not found: ${explicitFile}`);
      process.exit(1);
    }
    try {
      const content = fs.readFileSync(explicitFile, 'utf8');
      const savedPath = saveSession(content, `file:${explicitFile}`);
      console.log(`\n✔ Session successfully saved from ${explicitFile}!`);
      console.log(`  File: ${savedPath}`);
      return;
    } catch (err) {
      console.error(`\n❌ Login failed: ${err.message}`);
      process.exit(1);
    }
  }

  // Case 3: Auto-import from active Chrome CDP session
  console.log('🔍 Checking for active Google Chrome session...');
  try {
    const res = await importSessionFromChromeCDP();
    console.log(`\n✔ Successfully imported session from Chrome! (${res.cookieCount} cookies)`);
    console.log(`  Saved to: ${res.path}`);
    console.log(`\nYou can now generate speech headlessly at $0 cost:\n  aispeech "Hello world!" --play\n`);
    return;
  } catch (cdpErr) {
    // If Chrome remote debugging is not active, offer interactive paste
    console.log(`ℹ️  Chrome DevTools is not currently active (${cdpErr.message.split('\n')[0]}).`);
    console.log('\nYou can easily import your session using either of these methods:\n');
    console.log('1. Launch Chrome with remote debugging:');
    console.log('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 &\n');
    console.log('2. Or paste your cookie string (from Chrome DevTools -> Application -> Cookies -> aistudio.google.com):');
    console.log('   aispeech login --cookies "SAPISID=...; SSID=..."\n');
    console.log('3. Or save cookies to a file:');
    console.log('   aispeech login --file cookies.txt\n');

    if (process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('Paste your cookie string (or press Enter to cancel): ', (answer) => {
        rl.close();
        const trimmed = (answer || '').trim();
        if (!trimmed) {
          console.log('Canceled.');
          process.exit(0);
        }
        try {
          const savedPath = saveSession(trimmed, 'interactive');
          console.log(`\n✔ Session successfully saved to ${savedPath}!`);
        } catch (err) {
          console.error(`\n❌ Login failed: ${err.message}`);
          process.exit(1);
        }
      });
      return;
    }
  }
}

async function handleSession() {
  const isClear = hasFlag(['--clear', '--logout', '-c']);
  const isJson = hasFlag(['--json', '-j']);

  if (isClear) {
    const removed = clearSession();
    if (removed) {
      console.log('✔ Session cleared successfully.');
    } else {
      console.log('No active session file to remove.');
    }
    return;
  }

  const session = loadSession();
  if (!session) {
    if (isJson) {
      console.log(JSON.stringify({ active: false }, null, 2));
    } else {
      console.log('\n❌ No active AI Studio session found.');
      console.log('Run "aispeech login" to import your browser session.\n');
    }
    return;
  }

  console.log('🔍 Validating session against Google AI Studio...');
  const validation = await validateSession(session);

  if (isJson) {
    console.log(JSON.stringify({
      active: validation.valid,
      path: getSessionPath(),
      updatedAt: session.updatedAt,
      source: session.source,
      cookieCount: Object.keys(session.cookies || {}).length,
      validation
    }, null, 2));
    return;
  }

  console.log(`\n📦 AI Studio Session Status:`);
  console.log(`   File:         ${getSessionPath()}`);
  console.log(`   Updated:      ${session.updatedAt || 'Unknown'}`);
  console.log(`   Source:       ${session.source || 'Manual'}`);
  console.log(`   Cookies:      ${Object.keys(session.cookies || {}).length} stored`);
  console.log(`   SAPISID:      ${session.sapisid ? session.sapisid.slice(0, 8) + '...' : 'Missing'}`);
  console.log(`   Status:       ${validation.valid ? '🟢 VALID (Active & Ready)' : '🔴 EXPIRED / INVALID'}`);
  if (!validation.valid && validation.reason) {
    console.log(`   Reason:       ${validation.reason}`);
  }
  console.log('');
}

async function handleClean() {
  const isLocal = hasFlag(['--local']);
  if (isLocal) {
    clearLocalAudio();
    console.log(`Cleaned local audio directory: ${LOCAL_BASE}`);
  } else {
    const stats = getTempStats();
    clearTempCache();
    console.log(`Cleaned temporary audio cache: ${TEMP_BASE} (${stats.count} files removed)`);
  }
}

async function handleDialogue() {
  let input = args[1];
  if (!input || input.startsWith('-')) {
    console.error('Error: Please provide dialogue text or a path to a dialogue text file.');
    console.error('Example: aispeech dialogue "Alex: Hello!\\nSam: Hey!" --speaker1 Kore --speaker2 Puck');
    process.exit(1);
  }

  if (fs.existsSync(input)) {
    input = fs.readFileSync(input, 'utf8');
  } else {
    input = input.replace(/\\n/g, '\n');
  }

  const speaker1 = parseFlag(['--speaker1', '-v1'], 'Kore');
  const speaker2 = parseFlag(['--speaker2', '-v2'], 'Puck');
  const model = parseFlag(['--model', '-m'], DEFAULT_MODEL);
  const isSave = hasFlag(['--save', '-s']);
  const customDir = parseFlag(['--save', '-s']) !== true ? parseFlag(['--save', '-s']) : null;
  const isPlay = hasFlag(['--play', '-p']);
  const isJson = hasFlag(['--json', '-j']);
  const explicitKey = parseFlag(['--key', '-k']);

  try {
    const result = await generateDialogue(input, {
      speaker1,
      speaker2,
      model,
      save: isSave,
      customDir,
      apiKey: explicitKey
    });

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n🎉 Dialogue Generated Successfully!`);
      console.log(`   File:     ${result.filePath} ${result.isTemp ? '(temporary)' : '(saved)'}`);
      console.log(`   Speakers: ${JSON.stringify(result.speakers)}`);
      console.log(`   Size:     ${(result.bytes / 1024).toFixed(1)} KB`);
      console.log(`   Model:    ${result.model}\n`);
    }

    if (isPlay) {
      await playAudio(result.filePath);
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  }
}

async function handleGenerate(text) {
  const forceBrowser = hasFlag(['--browser', '-b']);
  const forceApi = hasFlag(['--api', '-a']);
  const forceSession = hasFlag(['--session']);
  const voice = parseFlag(['--voice', '-v'], DEFAULT_VOICE);
  const model = parseFlag(['--model', '-m'], DEFAULT_MODEL);
  const isSave = hasFlag(['--save', '-s']);
  const customDir = parseFlag(['--save', '-s']) !== true ? parseFlag(['--save', '-s']) : null;
  const isPlay = hasFlag(['--play', '-p']);
  const isJson = hasFlag(['--json', '-j']);
  const explicitKey = parseFlag(['--key', '-k']);

  try {
    let result;

    if (forceBrowser) {
      // 1. Explicit Chrome CDP browser mode
      console.log('🌐 Generating speech using your active Chrome UI session...');
      result = await generateSpeechInBrowser(text, {
        voice,
        save: isSave,
        customDir
      });
    } else if (forceApi || explicitKey) {
      // 2. Explicit Gemini REST API mode
      result = await generateSpeech(text, {
        voice,
        model,
        save: isSave,
        customDir,
        apiKey: explicitKey
      });
    } else if (hasSession() || forceSession) {
      // 3. Default: Ultra-fast headless HTTP session mode ($0, Tier 1)
      if (!isJson) {
        console.log(`⚡ Generating speech via AI Studio session (headless HTTP, $0 cost)...`);
      }
      result = await generateSpeechHttp(text, {
        voice,
        model,
        save: isSave,
        customDir
      });
    } else {
      // 4. Fallback if no session: check API key
      const key = resolveApiKey();
      if (key) {
        if (!isJson) {
          console.log(`🔑 Generating speech via Gemini API key...`);
        }
        result = await generateSpeech(text, {
          voice,
          model,
          save: isSave,
          customDir,
          apiKey: key
        });
      } else {
        console.error(`\n❌ No active AI Studio session or Gemini API key found.\n`);
        console.error(`Choose one of the following simple setups:`);
        console.error(`  1. Run "aispeech login" to use your Google account session (100% Free, $0)`);
        console.error(`  2. Run "aispeech auth <API_KEY>" to configure a Gemini API key\n`);
        process.exit(1);
      }
    }

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n🎉 Speech Generated Successfully!`);
      console.log(`   File:   ${result.filePath} ${result.isTemp ? '(temporary)' : '(saved)'}`);
      console.log(`   Voice:  ${result.voice || voice}`);
      console.log(`   Mode:   ${result.mode === 'session-http' ? 'Headless AI Studio RPC (Free $0)' : result.mode || 'Gemini API'}`);
      if (result.durationMs) {
        console.log(`   Time:   ${(result.durationMs / 1000).toFixed(2)}s`);
      }
      console.log(`   Size:   ${(result.bytes / 1024).toFixed(1)} KB\n`);
    }

    if (isPlay) {
      await playAudio(result.filePath);
    }
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  }
}

async function main() {
  if (args.length === 0 || hasFlag(['--help', '-h'])) {
    printHelp();
    return;
  }

  const cmd = args[0];

  switch (cmd) {
    case 'login':
      await handleLogin();
      break;
    case 'session':
      await handleSession();
      break;
    case 'logout':
      clearSession();
      console.log('✔ Session cleared and logged out successfully.');
      break;
    case 'voices':
      await handleVoices();
      break;
    case 'auth':
      await handleAuth();
      break;
    case 'clean':
      await handleClean();
      break;
    case 'dialogue':
      await handleDialogue();
      break;
    case 'generate': {
      const text = args[1];
      if (!text || text.startsWith('-')) {
        console.error('Error: Please provide text to generate speech.');
        process.exit(1);
      }
      await handleGenerate(text);
      break;
    }
    default:
      if (!cmd.startsWith('-')) {
        await handleGenerate(cmd);
      } else {
        printHelp();
      }
      break;
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
