const assert = require('assert');
const { listVoices, findVoice, VOICES } = require('../src/voices');
const { resolveOutputPath, slugify } = require('../src/storage');
const { parseDialogueLines } = require('../src/api');

console.log('Running aispeech test suite...\n');

// Test 1: Voices Catalog
assert.strictEqual(VOICES.length, 30, 'Should have 30 voices in catalog');
const females = listVoices({ gender: 'female' });
assert.strictEqual(females.length, 11, 'Should have 11 female voices');
const puck = findVoice('puck');
assert.ok(puck, 'Should find Puck');
assert.strictEqual(puck.name, 'Puck');
console.log('✔ Test 1 Passed: Voices catalog and lookup');

// Test 2: Storage & Slugify
const slug = slugify('Hello World! <whisper>secret</whisper>');
assert.strictEqual(slug, 'hello_world_secret', 'Should strip tags and slugify');

const tempOut = resolveOutputPath({ text: 'Hello world', voice: 'Puck', save: false });
assert.ok(tempOut.isTemp, 'Should be marked as temp');
assert.ok(tempOut.filePath.includes('aispeech'), 'Path should include aispeech directory');

const localOut = resolveOutputPath({ text: 'Hello world', voice: 'Kore', save: true });
assert.ok(!localOut.isTemp, 'Should not be temp');
assert.ok(localOut.filePath.includes('audio'), 'Path should include audio directory');
console.log('✔ Test 2 Passed: Storage and output paths');

// Test 3: Dialogue Parser
const dialogueText = `
Alex: Good morning! How is the AI studio tool?
Sam: <laugh> It is super fast and clean.
Alex: Awesome!
`;
const { turns, speakers } = parseDialogueLines(dialogueText);
assert.strictEqual(speakers.length, 2, 'Should detect exactly 2 speakers');
assert.deepStrictEqual(speakers, ['Alex', 'Sam']);
assert.strictEqual(turns.length, 3, 'Should have 3 dialogue turns');
assert.strictEqual(turns[0].speaker, 'Alex');
assert.strictEqual(turns[1].speaker, 'Sam');
assert.strictEqual(turns[2].speaker, 'Alex');
console.log('✔ Test 3 Passed: Multi-speaker dialogue parser');

// Test 4: Audio WAV conversion & PCM packaging
const { pcmToWav, findAudioInPayload } = require('../src/audio');
const dummyPCM = Buffer.alloc(24000 * 2); // 1 sec of 16-bit mono silence
const wav = pcmToWav(dummyPCM, 24000, 1, 16);
assert.strictEqual(wav.length, 44 + dummyPCM.length, 'WAV size must be 44-byte header + PCM data');
assert.strictEqual(wav.toString('ascii', 0, 4), 'RIFF', 'Header must start with RIFF');
assert.strictEqual(wav.toString('ascii', 8, 12), 'WAVE', 'Container must be WAVE');
assert.strictEqual(wav.readUInt32LE(24), 24000, 'Sample rate must be 24000');
console.log('✔ Test 4 Passed: PCM to WAV packaging');

// Test 5: Session Cookie Parser & Auth Hash
const { parseCookieString, saveSession, loadSession, clearSession } = require('../src/session');
const { computeSapisidHash } = require('../src/http_client');

const sampleCookieStr = 'SID=abc123xyz; SAPISID=test_sapisid_token_123; __Secure-1PAPISID=test_sapisid_token_123';
const parsed = parseCookieString(sampleCookieStr);
assert.strictEqual(parsed.SAPISID, 'test_sapisid_token_123');
assert.strictEqual(parsed.SID, 'abc123xyz');

const authHeader = computeSapisidHash(parsed.SAPISID);
assert.ok(authHeader.startsWith('SAPISIDHASH '), 'Must generate SAPISIDHASH header');
assert.ok(authHeader.includes('SAPISID1PHASH '), 'Must include 1P hash');
console.log('✔ Test 5 Passed: Cookie parsing and SAPISIDHASH calculation');

// Test 6: Audio Payload Extraction
const mockPayload = [
  'header',
  [
    [['audio/pcm;rate=24000', Buffer.from('test-audio').toString('base64')]]
  ]
];
const extracted = findAudioInPayload(mockPayload);
assert.ok(extracted, 'Should extract audio payload');
assert.strictEqual(extracted.mimeType, 'audio/pcm;rate=24000');
console.log('✔ Test 6 Passed: RPC Audio stream detection');

console.log('\nAll tests passed successfully! 🎉');
