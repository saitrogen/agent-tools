const fs = require('fs');

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a local, interactive HTML gallery viewer.
 */
function buildHtmlGallery(items, queryTitle, outputPath) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pinref - ${escapeXml(queryTitle)}</title>
  <style>
    :root {
      --bg: #0f1013;
      --card-bg: #1c1d22;
      --accent: #e60023;
      --text: #f0f0f5;
      --muted: #888995;
      --border: #2c2d35;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 30px;
    }
    header {
      max-width: 1400px;
      margin: 0 auto 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
    }
    h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    h1 span { color: var(--accent); }
    .subtitle { color: var(--muted); font-size: 14px; margin-top: 5px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .card {
      background: var(--card-bg);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.5);
    }
    .img-box {
      width: 100%;
      height: 380px;
      position: relative;
      background: #15161a;
      overflow: hidden;
    }
    .img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s;
    }
    .card:hover .img-box img {
      transform: scale(1.03);
    }
    .badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: var(--accent);
      color: #fff;
      font-weight: 800;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .color-swatch {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #fff;
      display: inline-block;
      vertical-align: middle;
      margin-right: 6px;
    }
    .info {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }
    .id-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: monospace;
      font-size: 12px;
      color: var(--muted);
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
    }
    button {
      flex: 1;
      background: #2a2b33;
      color: var(--text);
      border: 1px solid var(--border);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s, color 0.2s;
    }
    button:hover {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #22c55e;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      display: none;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      z-index: 1000;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Pinref Moodboard: <span>${escapeXml(queryTitle)}</span></h1>
      <div class="subtitle">${items.length} Reference Images · Identifiable Badges (#1 - #${items.length}) · Click to inspect or branch</div>
    </div>
  </header>
  <div class="grid">
    ${items.map(it => `
      <div class="card">
        <div class="img-box">
          <span class="badge">#${it.index}</span>
          <a href="${escapeXml(it.filename)}" target="_blank" title="View Full Resolution">
            <img src="${escapeXml(it.filename)}" alt="Reference #${it.index}">
          </a>
        </div>
        <div class="info">
          <div class="id-row">
            <span><span class="color-swatch" style="background:${it.dominantColor}"></span>ID</span>
            <span title="${escapeXml(String(it.id))}">${escapeXml(String(it.id).slice(0, 16))}...</span>
          </div>
          <div class="actions">
            <button onclick="copyText('${escapeXml(String(it.id))}', 'Copied Pin ID!')">📋 Copy ID</button>
            <button onclick="copyText('pinref similar \\'${escapeXml(String(it.id))}\\'', 'Copied Similar Command!')">⚡ More Like This</button>
          </div>
        </div>
      </div>
    `).join('')}
  </div>
  <div id="toast" class="toast"></div>
  <script>
    function copyText(txt, msg) {
      navigator.clipboard.writeText(txt);
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2200);
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
  return outputPath;
}

module.exports = { buildHtmlGallery };
