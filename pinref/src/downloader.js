const fs = require('fs');
const path = require('path');

/**
 * Downloads a batch of images concurrently and organizes them in a target folder.
 */
async function downloadBatch(items, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const downloaded = [];
  const errors = [];

  await Promise.all(
    items.map(async (item, index) => {
      const idxStr = String(index + 1).padStart(2, '0');
      const cleanId = String(item.id || index).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20);
      const filename = `${idxStr}_${cleanId}.jpg`;
      const filePath = path.join(outputDir, filename);

      try {
        const resp = await fetch(item.image);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buffer = Buffer.from(await resp.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        downloaded.push({
          index: index + 1,
          id: item.id,
          dominantColor: item.dominant_color || '#333333',
          filename,
          filePath,
          buffer,
          remoteUrl: item.image
        });
      } catch (err) {
        errors.push({ index: index + 1, id: item.id, error: err.message });
      }
    })
  );

  downloaded.sort((a, b) => a.index - b.index);

  // Write metadata.json
  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        total: downloaded.length,
        timestamp: new Date().toISOString(),
        items: downloaded.map(d => ({
          index: d.index,
          id: d.id,
          dominantColor: d.dominantColor,
          file: d.filename,
          url: d.remoteUrl
        }))
      },
      null,
      2
    )
  );

  return { downloaded, errors, metadataPath };
}

module.exports = { downloadBatch };
