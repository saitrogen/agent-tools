const fs = require('fs');
const path = require('path');
const os = require('os');
const { resolveOutputPath } = require('./storage');

function getDevToolsEndpoint() {
  const activePortPath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/DevToolsActivePort');
  if (!fs.existsSync(activePortPath)) {
    throw new Error(
      'Chrome remote debugging is not active.\n' +
      'Please launch Chrome with:\n' +
      '  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 &\n' +
      'or enable it at chrome://inspect/#remote-debugging in your browser.'
    );
  }

  const lines = fs.readFileSync(activePortPath, 'utf8').trim().split('\n');
  const port = lines[0].trim();
  const browserPath = lines[1].trim();
  return `ws://127.0.0.1:${port}${browserPath}`;
}

async function connectCDP(wsUrl) {
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

  return { ws, send };
}

async function generateSpeechInBrowser(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error('Please provide text to generate speech');
  }

  const wsUrl = getDevToolsEndpoint();
  const { ws, send } = await connectCDP(wsUrl);

  try {
    // 1. Locate or create AI Studio tab
    const targets = await send('Target.getTargets');
    let target = targets.targetInfos.find(t => t.url.includes('aistudio.google.com'));

    let targetId;
    if (target) {
      targetId = target.targetId;
    } else {
      const created = await send('Target.createTarget', { url: 'https://aistudio.google.com/generate-speech' });
      targetId = created.targetId;
    }

    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

    // Navigate to generate-speech if needed
    if (!target || !target.url.includes('generate-speech')) {
      await send('Page.navigate', { url: 'https://aistudio.google.com/generate-speech' }, sessionId);
      await new Promise(r => setTimeout(r, 3000));
    }

    // 2. Ensure speech dialog UI is active
    await send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.querySelector('textarea');
        if (!textarea) {
          const createCard = document.querySelector('.create-dialog-card');
          if (createCard) createCard.click();
        }
      })()`,
      returnByValue: true
    }, sessionId);

    await new Promise(r => setTimeout(r, 800));

    // Clear previous audio elements in DOM
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelectorAll('audio').forEach(a => a.remove());
      })()`,
      returnByValue: true
    }, sessionId);

    // 3. Inject text into textarea
    await send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.querySelector('textarea');
        if (!textarea) throw new Error('Textarea not found on Google AI Studio Speech page');
        textarea.value = ${JSON.stringify(text.trim())};
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      })()`,
      returnByValue: true
    }, sessionId);

    // 4. Click Run button via native mouse coordinates
    const posRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const runBtn = buttons.find(b => b.innerText.includes('Run'));
        if (!runBtn) return null;
        runBtn.scrollIntoView({ block: 'center' });
        const rect = runBtn.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`,
      returnByValue: true
    }, sessionId);

    const pos = posRes.result.value;
    if (!pos) throw new Error('Run button not found in Google AI Studio page');

    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: pos.x,
      y: pos.y,
      button: 'left',
      clickCount: 1
    }, sessionId);

    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: pos.x,
      y: pos.y,
      button: 'left',
      clickCount: 1
    }, sessionId);

    // 5. Poll for audio completion:
    // Wait until audio length is stable (not streaming) and generation is complete
    const startTime = Date.now();
    let finalAudioSrc = null;
    let lastLen = 0;
    let stableCount = 0;

    while (Date.now() - startTime < 45000) {
      await new Promise(r => setTimeout(r, 1000));

      const pollRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const audio = document.querySelector('audio');
          const buttons = Array.from(document.querySelectorAll('button'));
          const isGenerating = buttons.some(b => b.innerText.includes('Stop')) || !!document.querySelector('mat-spinner, .loading-spinner');

          if (audio && audio.src && audio.src.startsWith('data:audio/')) {
            return {
              src: audio.src,
              len: audio.src.length,
              duration: audio.duration || 0,
              isGenerating
            };
          }
          return null;
        })()`,
        returnByValue: true
      }, sessionId);

      const val = pollRes.result.value;
      if (val && val.src) {
        if (val.len === lastLen && !val.isGenerating && val.len > 10000) {
          stableCount++;
          if (stableCount >= 2) {
            finalAudioSrc = val.src;
            break;
          }
        } else {
          lastLen = val.len;
          stableCount = 0;
        }
      }
    }

    if (!finalAudioSrc) {
      throw new Error('Timeout waiting for audio generation in Google AI Studio browser session');
    }

    // 6. Decode and save
    const base64Index = finalAudioSrc.indexOf('base64,');
    if (base64Index === -1) {
      throw new Error('Invalid audio data format received from browser');
    }

    const base64Content = finalAudioSrc.slice(base64Index + 7);
    const audioBuffer = Buffer.from(base64Content, 'base64');

    const { filePath, isTemp, targetDir, filename } = resolveOutputPath({
      text,
      voice: options.voice || 'puck',
      save: options.save,
      customDir: options.customDir,
      extension: 'wav'
    });

    fs.writeFileSync(filePath, audioBuffer);

    return {
      ok: true,
      filePath,
      filename,
      targetDir,
      isTemp,
      bytes: audioBuffer.length,
      source: 'browser_session',
      text: text.trim()
    };
  } finally {
    try {
      ws.close();
    } catch {}
  }
}

module.exports = {
  getDevToolsEndpoint,
  connectCDP,
  generateSpeechInBrowser
};
