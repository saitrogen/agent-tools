const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMP_BASE = path.join(os.tmpdir(), 'aispeech');
const LOCAL_BASE = path.resolve(process.cwd(), 'audio');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function slugify(text, maxLen = 30) {
  if (!text) return 'speech';
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // remove xml/vocal tags
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen) || 'speech';
}

function resolveOutputPath(options = {}) {
  const { text = '', voice = 'Puck', save = false, customDir = null, extension = 'wav' } = options;
  const slug = slugify(text);
  const timestamp = Date.now().toString().slice(-6);
  const filename = `${slug}_${voice.toLowerCase()}_${timestamp}.${extension}`;

  let targetDir;
  if (save) {
    if (customDir) {
      targetDir = path.resolve(process.cwd(), customDir);
    } else {
      targetDir = LOCAL_BASE;
    }
  } else {
    targetDir = TEMP_BASE;
  }

  ensureDir(targetDir);
  return {
    filePath: path.join(targetDir, filename),
    isTemp: !save,
    targetDir,
    filename
  };
}

function clearTempCache() {
  if (fs.existsSync(TEMP_BASE)) {
    fs.rmSync(TEMP_BASE, { recursive: true, force: true });
    return true;
  }
  return false;
}

function clearLocalAudio(customDir = null) {
  const targetDir = customDir ? path.resolve(process.cwd(), customDir) : LOCAL_BASE;
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    return true;
  }
  return false;
}

function getTempStats() {
  if (!fs.existsSync(TEMP_BASE)) {
    return { count: 0, sizeBytes: 0, path: TEMP_BASE };
  }
  const files = fs.readdirSync(TEMP_BASE);
  let totalBytes = 0;
  for (const f of files) {
    try {
      const s = fs.statSync(path.join(TEMP_BASE, f));
      totalBytes += s.size;
    } catch {}
  }
  return { count: files.length, sizeBytes: totalBytes, path: TEMP_BASE };
}

module.exports = {
  TEMP_BASE,
  LOCAL_BASE,
  ensureDir,
  slugify,
  resolveOutputPath,
  clearTempCache,
  clearLocalAudio,
  getTempStats
};
