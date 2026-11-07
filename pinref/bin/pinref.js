#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const PinterestApi = require('../src/api');
const { downloadBatch } = require('../src/downloader');
const { buildContactSheet } = require('../src/contact-sheet');
const { buildHtmlGallery } = require('../src/gallery');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
Pinref 📌 - Pinterest Reference Moodboard & Single-Glance Vision CLI

USAGE:
  pinref search <query> [options]       Search & build a reference sheet
  pinref similar <pinId> [options]      Find more references similar to a Pin
  pinref pin <pinId>                    Inspect single pin metadata
  pinref clean [options]                Clean cached temp or local references
  pinref "<query>"                      Quick shortcut for search

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
  # Quick ephemeral vision check (saves to temp):
  pinref search "cyberpunk character design" --count 12

  # Persist references in current project workspace:
  pinref search "minimalist architecture moodboard" --save

  # Branch variations and save locally:
  pinref similar "1057008975051301499" -s

  # Clean temp cache:
  pinref clean
`);
}

function parseOptions(rawArgs) {
  const options = {
    count: 12,
    out: null,
    save: false,
    cleanLocal: false
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
    } else if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    } else if (arg === '-v' || arg === '--version') {
      console.log('Pinref v1.0.0');
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

  if (command !== 'search' && command !== 'similar' && command !== 'pin') {
    param = remaining.join(' ');
    command = 'search';
  }

  if (command === 'pin') {
    if (!param) {
      console.error('❌ Error: Pin ID required. Usage: pinref pin <pinId>');
      process.exit(1);
    }
    console.log(`\n📌 Inspecting Pin: ${param}...`);
    const pin = PinterestApi.getPin(param);
    console.log(`\nTitle:       ${pin.title}`);
    console.log(`Description: ${pin.description || 'N/A'}`);
    console.log(`Repins:      ${pin.repins || '0'}`);
    console.log(`Image:       ${pin.image}\n`);
    return;
  }

  let searchQuery = param;

  if (command === 'similar') {
    if (!param) {
      console.error('❌ Error: Pin ID required. Usage: pinref similar <pinId>');
      process.exit(1);
    }
    console.log(`\n🔍 Looking up Pin details for ID: ${param}...`);
    const pin = PinterestApi.getPin(param);
    console.log(`📌 Found Pin: "${pin.title}"`);
    const cleaned = (pin.title || '')
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

  const slug = searchQuery
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '') || 'pinterest-reference';

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

  console.log(`\n📡 Fetching reference images from Pinterest API for: "${searchQuery}"...`);
  const searchResult = PinterestApi.searchPins(searchQuery);

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
  await buildContactSheet(downloaded, searchQuery, contactSheetPath);

  console.log(`🌐 Building interactive HTML gallery...`);
  const galleryPath = path.join(outputDir, 'gallery.html');
  buildHtmlGallery(downloaded, searchQuery, galleryPath);

  console.log(`\n======================================================`);
  console.log(`✨ PINREF BATCH COMPLETE!`);
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
  console.log(`2. To find variations of any pin: pinref similar "<pinId>"\n`);
}

run().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
