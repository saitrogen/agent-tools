const fs = require('fs');
const path = require('path');
const os = require('os');
const { resolveOutputPath } = require('./storage');
const { findVoice } = require('./voices');

const CONFIG_DIR = path.join(os.homedir(), '.aispeech');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_MODEL = 'gemini-3.8-flash-tts';
const DEFAULT_VOICE = 'Puck';

function getStoredApiKey() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (data && data.apiKey) return data.apiKey;
    }
  } catch {}
  return null;
}

function saveApiKey(apiKey) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  return CONFIG_FILE;
}

function parseDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const res = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      res[k] = v;
    }
  }
  return res;
}

function resolveApiKey(explicitKey = null) {
  if (explicitKey && explicitKey.trim()) return explicitKey.trim();
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY.trim();

  const dotEnv = parseDotEnv();
  if (dotEnv.GEMINI_API_KEY) return dotEnv.GEMINI_API_KEY.trim();
  if (dotEnv.GOOGLE_API_KEY) return dotEnv.GOOGLE_API_KEY.trim();

  const stored = getStoredApiKey();
  if (stored) return stored.trim();

  return null;
}

async function callGeminiApi(payload, model, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errBody = '';
    try {
      const errJson = await response.json();
      errBody = errJson.error ? errJson.error.message : JSON.stringify(errJson);
    } catch {
      errBody = await response.text();
    }
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  return await response.json();
}

function extractAudioBase64(jsonResponse) {
  const candidates = jsonResponse.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates returned in Gemini API response');
  }

  const parts = candidates[0].content && candidates[0].content.parts;
  if (!parts || parts.length === 0) {
    throw new Error('No content parts found in Gemini response');
  }

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return {
        base64Data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'audio/wav'
      };
    }
  }

  throw new Error('No inline audio data found in candidate parts');
}

/**
 * Generate speech for a single text prompt
 */
async function generateSpeech(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error('Please provide text to generate speech');
  }

  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    throw new Error(
      'No Gemini API Key found. Set GEMINI_API_KEY in your environment, or run:\n' +
      '  aispeech auth <YOUR_GEMINI_API_KEY>\n' +
      'Get a key at: https://aistudio.google.com/apikey'
    );
  }

  const voiceName = options.voice || DEFAULT_VOICE;
  const matchedVoice = findVoice(voiceName);
  const finalVoiceName = matchedVoice ? matchedVoice.name : voiceName;
  const model = options.model || DEFAULT_MODEL;

  const payload = {
    contents: [
      {
        parts: [
          { text: text.trim() }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: finalVoiceName
          }
        }
      }
    }
  };

  const jsonResponse = await callGeminiApi(payload, model, apiKey);
  const { base64Data, mimeType } = extractAudioBase64(jsonResponse);
  const audioBuffer = Buffer.from(base64Data, 'base64');

  const ext = mimeType.includes('mp3') ? 'mp3' : 'wav';
  const { filePath, isTemp, targetDir, filename } = resolveOutputPath({
    text,
    voice: finalVoiceName,
    save: options.save,
    customDir: options.customDir,
    extension: ext
  });

  fs.writeFileSync(filePath, audioBuffer);

  return {
    ok: true,
    filePath,
    filename,
    targetDir,
    isTemp,
    bytes: audioBuffer.length,
    voice: finalVoiceName,
    model,
    mimeType,
    text: text.trim()
  };
}

/**
 * Parse dialogue text lines into speaker turns
 * e.g. "Speaker 1: Hello\nSpeaker 2: Hi"
 */
function parseDialogueLines(dialogueText) {
  const lines = dialogueText.split('\n').map(l => l.trim()).filter(Boolean);
  const turns = [];
  const speakersFound = [];

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const speaker = match[1].trim();
      const text = match[2].trim();
      if (!speakersFound.includes(speaker)) {
        speakersFound.push(speaker);
      }
      turns.push({ speaker, text, fullText: line });
    } else {
      // Default speaker if no prefix
      const speaker = speakersFound[0] || 'Speaker 1';
      if (!speakersFound.includes(speaker)) speakersFound.push(speaker);
      turns.push({ speaker, text: line, fullText: `${speaker}: ${line}` });
    }
  }

  return { turns, speakers: speakersFound };
}

/**
 * Generate multi-speaker dialogue speech
 */
async function generateDialogue(dialogueText, options = {}) {
  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    throw new Error(
      'No Gemini API Key found. Set GEMINI_API_KEY in your environment, or run:\n' +
      '  aispeech auth <YOUR_GEMINI_API_KEY>\n' +
      'Get a key at: https://aistudio.google.com/apikey'
    );
  }

  const { turns, speakers } = parseDialogueLines(dialogueText);
  if (turns.length === 0) {
    throw new Error('No dialogue lines provided');
  }

  if (speakers.length > 2) {
    throw new Error(`Gemini Multi-Speaker TTS currently supports up to 2 distinct speakers (found ${speakers.length}: ${speakers.join(', ')})`);
  }

  const speaker1 = speakers[0] || 'Speaker 1';
  const speaker2 = speakers[1] || 'Speaker 2';

  const voice1Name = (findVoice(options.speaker1 || options.voice1 || 'Kore') || {}).name || 'Kore';
  const voice2Name = (findVoice(options.speaker2 || options.voice2 || 'Puck') || {}).name || 'Puck';
  const model = options.model || DEFAULT_MODEL;

  const parts = turns.map(turn => ({
    text: `${turn.speaker}: ${turn.text}`,
    speechMetadata: {
      speaker: turn.speaker
    }
  }));

  const payload = {
    contents: [
      {
        role: 'user',
        parts: parts
      }
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speakerAlias: speaker1,
              prebuiltVoiceConfig: { voiceName: voice1Name }
            },
            {
              speakerAlias: speaker2,
              prebuiltVoiceConfig: { voiceName: voice2Name }
            }
          ]
        }
      }
    }
  };

  const jsonResponse = await callGeminiApi(payload, model, apiKey);
  const { base64Data, mimeType } = extractAudioBase64(jsonResponse);
  const audioBuffer = Buffer.from(base64Data, 'base64');

  const ext = mimeType.includes('mp3') ? 'mp3' : 'wav';
  const firstLine = turns[0] ? turns[0].text : 'dialogue';
  const { filePath, isTemp, targetDir, filename } = resolveOutputPath({
    text: `dialogue_${firstLine}`,
    voice: `${voice1Name}_${voice2Name}`,
    save: options.save,
    customDir: options.customDir,
    extension: ext
  });

  fs.writeFileSync(filePath, audioBuffer);

  return {
    ok: true,
    filePath,
    filename,
    targetDir,
    isTemp,
    bytes: audioBuffer.length,
    speakers: {
      [speaker1]: voice1Name,
      [speaker2]: voice2Name
    },
    turnCount: turns.length,
    model,
    mimeType
  };
}

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  resolveApiKey,
  saveApiKey,
  getStoredApiKey,
  generateSpeech,
  generateDialogue,
  parseDialogueLines
};
