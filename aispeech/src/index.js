const {
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  resolveApiKey,
  saveApiKey,
  generateSpeech,
  generateDialogue,
  parseDialogueLines
} = require('./api');

const {
  generateSpeechInBrowser,
  getDevToolsEndpoint
} = require('./browser');

const {
  VOICES,
  listVoices,
  findVoice
} = require('./voices');

const {
  TEMP_BASE,
  LOCAL_BASE,
  clearTempCache,
  clearLocalAudio,
  getTempStats
} = require('./storage');

const { playAudio } = require('./player');

const {
  loadSession,
  saveSession,
  clearSession,
  hasSession,
  validateSession,
  importSessionFromChromeCDP,
  getSessionPath
} = require('./session');

const {
  generateSpeechHttp,
  computeSapisidHash,
  fetchWaaToken
} = require('./http_client');

const {
  pcmToWav,
  findAudioInPayload
} = require('./audio');

module.exports = {
  // Free Session-Based Headless HTTP Mode ($0, ultra-fast)
  generateSpeechHttp,
  loadSession,
  saveSession,
  clearSession,
  hasSession,
  validateSession,
  importSessionFromChromeCDP,
  getSessionPath,
  computeSapisidHash,
  fetchWaaToken,
  pcmToWav,
  findAudioInPayload,

  // Free Browser-Session CDP Automation
  generateSpeechInBrowser,
  getDevToolsEndpoint,

  // Direct REST API (with API Key)
  DEFAULT_MODEL,
  DEFAULT_VOICE,
  resolveApiKey,
  saveApiKey,
  generateSpeech,
  generateDialogue,
  parseDialogueLines,

  // Voices Catalog
  VOICES,
  listVoices,
  findVoice,

  // Storage
  TEMP_BASE,
  LOCAL_BASE,
  clearTempCache,
  clearLocalAudio,
  getTempStats,

  // Player
  playAudio
};
