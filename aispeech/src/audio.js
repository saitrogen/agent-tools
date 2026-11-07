const fs = require('fs');

/**
 * Encapsulate raw linear PCM audio into a standard RIFF WAV container.
 * Default for Gemini AI Studio TTS is 24000Hz, 16-bit mono.
 * 
 * @param {Buffer} pcmData 
 * @param {number} sampleRate 
 * @param {number} numChannels 
 * @param {number} bitsPerSample 
 * @returns {Buffer} Complete WAV file buffer
 */
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // 'data' chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);

  return buffer;
}

/**
 * Recursively search any object or nested array for audio base64 payload.
 * AI Studio internal RPC returns protobuf-JSON nested arrays with ['audio/pcm;rate=24000', '<base64...>'].
 * 
 * @param {any} obj
 * @returns {{mimeType: string, base64: string}|null}
 */
function findAudioInPayload(obj) {
  if (!obj) return null;

  if (Array.isArray(obj)) {
    if (
      obj.length >= 2 &&
      typeof obj[0] === 'string' &&
      obj[0].startsWith('audio/') &&
      typeof obj[1] === 'string'
    ) {
      return { mimeType: obj[0], base64: obj[1] };
    }
    for (const item of obj) {
      const found = findAudioInPayload(item);
      if (found) return found;
    }
  } else if (typeof obj === 'object') {
    // If it's standard Gemini REST API structure: candidate.content.parts[].inlineData
    if (obj.inlineData && obj.inlineData.data) {
      return {
        mimeType: obj.inlineData.mimeType || 'audio/wav',
        base64: obj.inlineData.data
      };
    }
    for (const key of Object.keys(obj)) {
      const found = findAudioInPayload(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

module.exports = {
  pcmToWav,
  findAudioInPayload
};
