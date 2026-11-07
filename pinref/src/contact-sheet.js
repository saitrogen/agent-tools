const sharp = require('sharp');

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a single composite contact sheet JPEG from downloaded image buffers.
 */
async function buildContactSheet(items, title, outputPath, options = {}) {
  const cols = options.cols || 4;
  const rows = Math.ceil(items.length / cols);
  const tileW = options.tileW || 360;
  const tileH = options.tileH || 460;
  const margin = options.margin || 30;
  const gap = options.gap || 20;
  const headerH = options.headerH || 90;

  const totalW = margin * 2 + cols * tileW + (cols - 1) * gap;
  const totalH = margin * 2 + headerH + rows * tileH + (rows - 1) * gap;

  // Header SVG banner
  const headerSvg = Buffer.from(`
    <svg width="${totalW}" height="${headerH}">
      <text x="${margin}" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="#FFFFFF">
        Pinref Reference Sheet: ${escapeXml(title)}
      </text>
      <text x="${margin}" y="75" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" fill="#8E8E93">
        ${items.length} Reference Images · Single-Glance Vision Grid · Identify by Index # or Pin ID
      </text>
    </svg>
  `);

  const composites = [{ input: headerSvg, top: margin, left: 0 }];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = margin + c * (tileW + gap);
    const y = margin + headerH + r * (tileH + gap);

    const cardImgH = tileH - 55;
    let resizedBuffer;
    try {
      resizedBuffer = await sharp(item.buffer)
        .resize(tileW, cardImgH, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch {
      continue;
    }

    const shortId = String(item.id).slice(0, 18);
    const labelSvg = Buffer.from(`
      <svg width="${tileW}" height="55">
        <rect x="0" y="0" width="${tileW}" height="55" fill="#1C1C1E" rx="0"/>
        <rect x="10" y="10" width="34" height="34" fill="#E60023" rx="6"/>
        <text x="27" y="32" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="bold" fill="#FFFFFF" text-anchor="middle">#${item.index}</text>
        <circle cx="58" cy="27" r="8" fill="${item.dominantColor}" stroke="#444" stroke-width="1.5"/>
        <text x="74" y="24" font-family="monospace" font-size="11" font-weight="bold" fill="#F2F2F7">ID: ${escapeXml(shortId)}...</text>
        <text x="74" y="40" font-family="monospace" font-size="10" fill="#8E8E93">pinref similar ${escapeXml(shortId.slice(0, 14))}</text>
      </svg>
    `);

    composites.push({ input: resizedBuffer, top: y, left: x });
    composites.push({ input: labelSvg, top: y + cardImgH, left: x });
  }

  // Create canvas and composite
  await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 3,
      background: { r: 18, g: 18, b: 22 }
    }
  })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = { buildContactSheet };
