#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { search, getClipInfo, downloadVideo, downloadSubtitles, parseClipInput } = require('../src/api');
const { startServer } = require('../src/server');

const args = process.argv.slice(2);
const command = args[0] || 'help';

function printHelp() {
  console.log(`
ClipCafe CLI & Web Tool (clipcafe) - Movie Clip Downloader & Streamer

Usage:
  clipcafe serve [--port 3000]             Launch interactive Web Tool in browser
  clipcafe search <query> [options]        Search movie scenes and quotes
  clipcafe info <url|slug> [options]       Extract metadata, direct MP4 and subtitle URLs
  clipcafe download <url|slug> [options]   Download 1080p/4K MP4 video file
  clipcafe clean [--local]                 Purge temporary downloads cache

Options:
  --save, -s                               Save directly into ./downloads/ (default: OS temp)
  --out, -o <path>                         Custom output destination file path
  --subs                                   Also download SRT subtitles
  --json, -j                               Output raw JSON metadata
  --limit, -l <n>                          Limit search results (default: 15)
  --port, -p <n>                           Port for Web Tool (default: 3000)

Examples:
  clipcafe serve
  clipcafe search "matrix gatekeepers"
  clipcafe download https://clip.cafe/the-matrix-1999/but-are-the-gatekeepers/ --save
  clipcafe download "it-the-quality-of-ones-convictions-determines-success-s1" --save --subs
`);
}

function getTempDir() {
  const dir = path.join(os.tmpdir(), 'clipcafe');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function handleServe() {
  let port = 3000;
  const portIdx = args.findIndex(a => a === '--port' || a === '-p');
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10);
  }

  try {
    const { server, port: boundPort } = await startServer(port);
    console.log(`
=============================================================
  🎬 ClipCafe Web Tool is running!
  URL: http://localhost:${boundPort}
=============================================================
- Paste any Clip.Cafe link or search movie quotes directly.
- Preview clips in the embedded player.
- Download clean 1080p/4K MP4 videos & SRT subtitles with 1 click.

Press Ctrl+C to stop the server.
`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      const { port: newPort } = await startServer(port + 1);
      console.log(`ClipCafe Web Tool running at: http://localhost:${newPort}`);
    } else {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    }
  }
}

async function handleSearch() {
  const query = args[1];
  if (!query || query.startsWith('-')) {
    console.error('Error: Please provide a search query.');
    process.exit(1);
  }

  const isJson = args.includes('--json') || args.includes('-j');
  const limitIdx = args.findIndex(a => a === '--limit' || a === '-l');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 15;

  try {
    const results = await search(query, { limit });
    if (isJson) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      console.log(`No clips found for "${query}".`);
      return;
    }

    console.log(`\nFound ${results.length} scenes for "${query}":\n`);
    results.forEach((clip, i) => {
      console.log(`[${i + 1}] ${clip.movieTitle} (${clip.year || 'N/A'}) [${clip.duration}]`);
      console.log(`    Quote: "${clip.transcript}"`);
      console.log(`    Slug:  ${clip.clipSlug}`);
      console.log(`    Video: ${clip.videoUrl}`);
      console.log('');
    });
  } catch (err) {
    console.error('Search failed:', err.message);
    process.exit(1);
  }
}

async function handleInfo() {
  const target = args[1];
  if (!target || target.startsWith('-')) {
    console.error('Error: Please provide a clip URL or slug.');
    process.exit(1);
  }

  const isJson = args.includes('--json') || args.includes('-j');

  try {
    const info = await getClipInfo(target);
    if (isJson) {
      console.log(JSON.stringify(info, null, 2));
      return;
    }

    console.log(`
🎬 Clip Details:
  Title:       ${info.title}
  Movie:       ${info.movieTitle} (${info.year || 'N/A'})
  Duration:    ${info.duration || 'N/A'}
  Resolution:  ${info.videoFrameSize || 'Original MP4'}
  Director:    ${info.director || 'N/A'}
  Cast:        ${info.cast.join(', ') || 'N/A'}

📜 Transcript:
  "${info.transcript || info.description || 'N/A'}"

🔗 Direct URLs:
  Direct MP4:  ${info.videoUrl}
  Page URL:    ${info.pageUrl}

📝 Subtitles:
${info.subtitles.map(s => `  - [${s.language.toUpperCase()}] ${s.format.toUpperCase()}: ${s.url}`).join('\n')}
`);
  } catch (err) {
    console.error('Failed to get clip info:', err.message);
    process.exit(1);
  }
}

async function handleDownload() {
  const target = args[1];
  if (!target || target.startsWith('-')) {
    console.error('Error: Please provide a clip URL or slug to download.');
    process.exit(1);
  }

  const saveToProject = args.includes('--save') || args.includes('-s');
  const downloadSubs = args.includes('--subs');
  const outIdx = args.findIndex(a => a === '--out' || a === '-o');
  const customOut = outIdx !== -1 ? args[outIdx + 1] : null;

  try {
    const parsed = parseClipInput(target);
    const slug = parsed.slug;

    let destPath;
    if (customOut) {
      destPath = path.resolve(customOut);
    } else if (saveToProject) {
      const destDir = path.resolve(process.cwd(), 'downloads');
      destPath = path.join(destDir, `${slug}.mp4`);
    } else {
      destPath = path.join(getTempDir(), `${slug}.mp4`);
    }

    console.log(`\n⬇️  Downloading clip: ${slug}`);
    console.log(`📍 Destination: ${destPath}`);

    let lastPercent = -1;
    const result = await downloadVideo(target, destPath, (p) => {
      if (p.percent !== lastPercent) {
        process.stdout.write(`\rProgress: ${p.percent}% (${(p.downloaded / (1024 * 1024)).toFixed(2)} MB)`);
        lastPercent = p.percent;
      }
    });

    console.log(`\n✅ Video saved successfully! (${(result.bytes / (1024 * 1024)).toFixed(2)} MB)`);

    if (downloadSubs) {
      const srtPath = destPath.replace(/\.mp4$/i, '.srt');
      try {
        await downloadSubtitles(target, srtPath, 'en', 'srt');
        console.log(`✅ Subtitles saved: ${srtPath}`);
      } catch (e) {
        console.log(`⚠️  Could not download subtitles: ${e.message}`);
      }
    }
  } catch (err) {
    console.error('\n❌ Download failed:', err.message);
    process.exit(1);
  }
}

function handleClean() {
  const local = args.includes('--local');
  if (local) {
    const localDir = path.resolve(process.cwd(), 'downloads');
    if (fs.existsSync(localDir)) {
      fs.rmSync(localDir, { recursive: true, force: true });
      console.log('Cleaned local ./downloads/ directory.');
    } else {
      console.log('No local ./downloads/ directory found.');
    }
  } else {
    const tempDir = path.join(os.tmpdir(), 'clipcafe');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Cleaned temporary cache at ' + tempDir);
    } else {
      console.log('Temporary cache is already empty.');
    }
  }
}

async function main() {
  switch (command) {
    case 'serve':
    case 'web':
    case 'ui':
      await handleServe();
      break;
    case 'search':
    case 'find':
      await handleSearch();
      break;
    case 'info':
    case 'get':
      await handleInfo();
      break;
    case 'download':
    case 'dl':
      await handleDownload();
      break;
    case 'clean':
      handleClean();
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

