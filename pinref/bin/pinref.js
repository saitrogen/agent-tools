#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const ReferenceApi = require('../src/api');
const { downloadBatch } = require('../src/downloader');
const { buildContactSheet } = require('../src/contact-sheet');
const { buildHtmlGallery } = require('../src/gallery');

const args = process.argv.slice(2);
const VALID_SOURCES = new Set(['pinterest', 'dribbble', 'all']);

function showHelp() {
  console.log(`
Pinref 📌 - Multi-Source Reference Moodboard & Single-Glance Vision CLI

USAGE:
  pinref search <query> [options]       Search & build a reference sheet
  pinref similar <id> [options]         Find more references similar to a Pin or Shot
  pinref pin <id> [options]             Inspect single Pin or Shot metadata (alias: shot)
  pinref clean [options]                Clean cached temp or local references
  pinref "<query>"                      Quick shortcut for search

SOURCE OPTIONS:
  -S, --source <name>     Reference source: pinterest (default), dribbble, all
  -d, --dribbble          Shorthand for --source dribbble
  -p, --pinterest         Shorthand for --source pinterest
  --all                   Shorthand for --source all

STORAGE OPTIONS:
  (default)               Saves to system temp folder (${os.tmpdir()}/pinref)
                          Zero workspace clutter; auto-cleaned by OS.
  -s, --save              Persist into the current project (./references/<query-slug>)
  -o, --out <directory>   Save to a custom directory path

OTHER OPTIONS:
  -c, --count <number>    Number of images to fetch (default: 12)
  -h, --help              Show this help message
  -v, --version           Show version

EXAMPLES:
  # Pinterest search (default, saves to temp):
  pinref search "cyberpunk character design" --count 12

  # Dribbble search:
  pinref search "fintech dashboard" --source dribbble
  pinref search "saas landing page" -d --save

  # Combined Pinterest + Dribbble moodboard:
  pinref search "dark mode mobile app" --all

  # Inspect or branch a Dribbble shot:
  pinref shot "27496681" --source dribbble
  pinref similar "27496681" --source dribbble

  # Clean temp cache:
  pinref clean
`);
}

function parseOptions(rawArgs) {
  const options = {
    count: 12,
    out: null,
    save: false,
    cleanLocal: false,
    source: 'pinterest'
  };
  const filtered = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '-c' || arg === '--count') {
      options.count = parseInt(rawArgs[++i], 10) || 12;
    } else if (arg === '-o' || arg === '--out') {
      options.out = rawArgs[++i];
    } else if (arg === '-s' || arg === '--save' || arg === '--local') {
      options.save = true;
    } else if (arg === '-S' || arg === '--source') {
      const val = (rawArgs[++i] || '').toLowerCase();
      if (!VALID_SOURCES.has(val)) {
        console.error(`❌ Error: Invalid source "${val}". Use: pinterest, dribbble, or all.`);
        process.exit(1);
      }
      options.source = val;
    } else if (arg === '-d' || arg === '--dribbble') {
      options.source = 'dribbble';
    } else if (arg === '-p' || arg === '--pinterest') {
      options.source = 'pinterest';
    } else if (arg === '--all') {
      options.source = 'all';
    } else if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    } else if (arg === '-v' || arg === '--version') {
      console.log('Pinref v1.1.0');
      process.exit(0);
    } else {
      filtered.push(arg);
    }
  }

  return { options, remaining: filtered };
}

async function run() {
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    showHelp();
    process.exit(0);
  }

  const { options, remaining } = parseOptions(args);
  let command = remaining[0];
  let param = remaining.slice(1).join(' ');

  if (command === 'clean') {
    const tempDir = path.join(os.tmpdir(), 'pinref');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`🧹 Cleared Pinref temp cache: ${tempDir}`);
    } else {
      console.log(`✨ Temp cache is already clean.`);
    }

    if (options.save || remaining.includes('--local')) {
      const localDir = path.resolve(process.cwd(), 'references');
      if (fs.existsSync(localDir)) {
        fs.rmSync(localDir, { recursive: true, force: true });
        console.log(`🧹 Cleared local references: ${localDir}`);
      }
    }
    return;
  }

  if (command === 'shot') {
    command = 'pin';
    if (options.source === 'pinterest') {
      options.source = 'dribbble';
    }
  }

  if (command !== 'search' && command !== 'similar' && command !== 'pin') {
    param = remaining.join(' ');
    command = 'search';
  }

  if (command === 'pin') {
    if (!param) {
      console.error('❌ Error: Pin or Shot ID required. Usage: pinref pin <id> [--source dribbble]');
      process.exit(1);
    }
    const itemSource = options.source === 'all' ? 'pinterest' : options.source;
    const label = itemSource === 'dribbble' ? 'Shot' : 'Pin';
    console.log(`\n📌 Inspecting ${label} (${itemSource}): ${param}...`);
    const item = ReferenceApi.getItem(itemSource, param);
    console.log(`\nTitle:       ${item.title}`);
    console.log(`Description: ${item.description || 'N/A'}`);
    if (item.repins !== undefined) {
      console.log(`Repins:      ${item.repins || '0'}`);
    }
    console.log(`Image:       ${item.image}\n`);
    return;
  }

  let searchQuery = param;

  if (command === 'similar') {
    if (!param) {
      console.error('❌ Error: Pin or Shot ID required. Usage: pinref similar <id> [--source dribbble]');
      process.exit(1);
    }
    const lookupSource = options.source === 'all' ? 'pinterest' : options.source;
    console.log(`\n🔍 Looking up ${lookupSource} details for ID: ${param}...`);
    const item = ReferenceApi.getItem(lookupSource, param);
    console.log(`📌 Found: "${item.title}"`);
    const cleaned = (item.title || '')
      .split('|')[0]
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim();
    searchQuery = cleaned || 'reference';
    console.log(`🎯 Searching variations for: "${searchQuery}"\n`);
  }

  if (!searchQuery) {
    console.error('❌ Error: Search query required.');
    showHelp();
    process.exit(1);
  }

  const baseSlug = searchQuery
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '') || 'reference';
  const slug = options.source === 'pinterest' ? baseSlug : `${options.source}-${baseSlug}`;

  // Output destination: custom path > --save (current project) > default (os.tmpdir)
  let outputDir;
  let isTemp = false;

  if (options.out) {
    outputDir = path.resolve(options.out);
  } else if (options.save) {
    outputDir = path.resolve(process.cwd(), 'references', slug);
  } else {
    outputDir = path.join(os.tmpdir(), 'pinref', slug);
    isTemp = true;
  }

  const sourceDesc = options.source === 'all'
    ? 'Pinterest + Dribbble'
    : options.source === 'dribbble'
      ? 'Dribbble'
      : 'Pinterest';

  console.log(`\n📡 Fetching reference images from ${sourceDesc} for: "${searchQuery}"...`);
  const searchResult = ReferenceApi.search(options.source, searchQuery, options.count);

  const candidates = searchResult.data.slice(0, options.count);
  if (candidates.length === 0) {
    console.error('❌ No images found for this query.');
    process.exit(1);
  }

  console.log(`⚡ Retrieved ${candidates.length} reference candidates in ${searchResult.ms}ms (Tier ${searchResult.tier} - Plain HTTP).`);
  console.log(`💾 Downloading images into: ${outputDir}...`);

  const { downloaded } = await downloadBatch(candidates, outputDir);
  console.log(`✅ Downloaded ${downloaded.length} images.`);

  console.log(`🎨 Building composite contact sheet image...`);
  const contactSheetPath = path.join(outputDir, 'contact_sheet.jpg');
  await buildContactSheet(downloaded, searchQuery, contactSheetPath, { source: options.source });

  console.log(`🌐 Building interactive HTML gallery...`);
  const galleryPath = path.join(outputDir, 'gallery.html');
  buildHtmlGallery(downloaded, searchQuery, galleryPath, { source: options.source });

  console.log(`\n======================================================`);
  console.log(`✨ PINREF BATCH COMPLETE!`);
  console.log(`🔎 Source:          ${sourceDesc}`);
  console.log(`📁 Download Folder: file://${outputDir}`);
  console.log(`🖼️  Contact Sheet:  file://${contactSheetPath}`);
  console.log(`🌐 HTML Gallery:   file://${galleryPath}`);
  if (isTemp) {
    console.log(`ℹ️  Storage: Temp directory (auto-purged by OS).`);
    console.log(`   To persist in this project, pass: --save (or -s)`);
  } else {
    console.log(`💾 Storage: Saved permanently in project.`);
  }
  console.log(`======================================================\n`);
  console.log(`💡 Next steps:`);
  console.log(`1. View the single contact sheet: file://${contactSheetPath}`);
  if (options.source === 'dribbble') {
    console.log(`2. To find variations of any shot: pinref similar "<shotId>" --source dribbble\n`);
  } else {
    console.log(`2. To find variations of any pin: pinref similar "<pinId>"\n`);
  }
}

run().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
