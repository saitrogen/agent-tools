const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseClipInput, getClipInfo, search, downloadVideo, downloadSubtitles } = require('../src/api');

async function runTests() {
  console.log('--- Testing ClipCafe API ---');

  // Test 1: parseClipInput
  console.log('1. Testing parseClipInput...');
  const p1 = parseClipInput('https://clip.cafe/harry-potter-the-deathly-hallows-part-2-2011/it-the-quality-of-ones-convictions-determines-success-s1/');
  assert.strictEqual(p1.slug, 'it-the-quality-of-ones-convictions-determines-success-s1');

  const p2 = parseClipInput('youre-a-killer');
  assert.strictEqual(p2.slug, 'youre-a-killer');

  const p3 = parseClipInput('https://clip.cafe/videos/sample-clip.mp4');
  assert.strictEqual(p3.slug, 'sample-clip');
  console.log('  ✓ parseClipInput passed');

  // Test 2: search
  console.log('2. Testing search...');
  const searchResults = await search('matrix', { limit: 5 });
  assert(Array.isArray(searchResults), 'Search should return an array');
  assert(searchResults.length > 0, 'Search should find matrix clips');
  assert(searchResults[0].videoUrl.startsWith('https://clip.cafe/videos/'));
  console.log(`  ✓ search passed (found ${searchResults.length} clips)`);

  // Test 3: getClipInfo
  console.log('3. Testing getClipInfo...');
  const info = await getClipInfo('https://clip.cafe/touch-of-evil-1958/youre-a-killer/');
  assert(info.videoUrl.endsWith('.mp4'));
  assert.strictEqual(info.slug, 'youre-a-killer');
  console.log(`  ✓ getClipInfo passed (videoUrl: ${info.videoUrl})`);

  // Test 4: downloadVideo
  console.log('4. Testing downloadVideo (small clip)...');
  const tempFile = path.join(os.tmpdir(), 'clipcafe_test.mp4');
  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

  const dlResult = await downloadVideo('send-commander', tempFile);
  assert(fs.existsSync(tempFile), 'Downloaded file must exist');
  const stats = fs.statSync(tempFile);
  assert(stats.size > 100000, `Downloaded file should be > 100KB (actual: ${stats.size} bytes)`);
  fs.unlinkSync(tempFile);
  console.log(`  ✓ downloadVideo passed (${stats.size} bytes verified)`);

  // Test 5: downloadSubtitles
  console.log('5. Testing downloadSubtitles...');
  const subFile = path.join(os.tmpdir(), 'clipcafe_test.srt');
  if (fs.existsSync(subFile)) fs.unlinkSync(subFile);

  const subResult = await downloadSubtitles('it-the-quality-of-ones-convictions-determines-success-s1', subFile);
  assert(fs.existsSync(subFile), 'Subtitles file must exist');
  const subContent = fs.readFileSync(subFile, 'utf8');
  assert(subContent.includes('-->'), 'Subtitles must contain SRT timestamp arrows');
  fs.unlinkSync(subFile);
  console.log('  ✓ downloadSubtitles passed');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

