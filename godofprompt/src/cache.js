const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_DIR = path.join(os.tmpdir(), 'godofprompt');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getCachePath(key) {
  ensureDir(CACHE_DIR);
  const safeKey = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

function readCache(key, maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const file = getCachePath(key);
    if (!fs.existsSync(file)) return null;
    const stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > maxAgeMs) {
      return null;
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    const file = getCachePath(key);
    fs.writeFileSync(file, JSON.stringify(value), 'utf8');
  } catch (err) {
    // Silent fail on cache write
  }
}

function clearTempCache() {
  let count = 0;
  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(CACHE_DIR, f));
        count++;
      } catch {}
    }
  }
  return { cacheDir: CACHE_DIR, filesRemoved: count };
}

function clearLocalPrompts(targetDir = './prompts') {
  const resolved = path.resolve(process.cwd(), targetDir);
  let count = 0;
  if (fs.existsSync(resolved)) {
    const files = fs.readdirSync(resolved);
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(resolved, f));
        count++;
      } catch {}
    }
    try {
      fs.rmdirSync(resolved);
    } catch {}
  }
  return { dir: resolved, filesRemoved: count };
}

module.exports = {
  CACHE_DIR,
  ensureDir,
  readCache,
  writeCache,
  clearTempCache,
  clearLocalPrompts,
};
