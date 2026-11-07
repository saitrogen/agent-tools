const assert = require('assert');
const {
  normalizeSlug,
  listCategories,
  listTools,
  search,
  getPrompt,
  createPromptBoard
} = require('../src/api');
const {
  writeCache,
  readCache,
  clearTempCache
} = require('../src/cache');

async function runTests() {
  console.log('--- Running God of Prompt API Tests ---');

  // 1. Slug normalization
  console.log('1. Testing slug normalization...');
  assert.strictEqual(normalizeSlug('build-full-stack-software-architectures'), 'build-full-stack-software-architectures');
  assert.strictEqual(normalizeSlug('https://godofprompt.ai/prompt-library/build-full-stack-software-architectures'), 'build-full-stack-software-architectures');
  assert.strictEqual(normalizeSlug('/prompt-library/build-full-stack-software-architectures/'), 'build-full-stack-software-architectures');
  console.log('✓ Slug normalization passed');

  // 2. Categories & Tools
  console.log('2. Testing categories and tools list...');
  const { categories, subcategories } = listCategories();
  assert(categories.length >= 18, 'Expected at least 18 primary categories');
  assert(subcategories['coding'] && subcategories['coding'].length > 0, 'Expected coding subcategories');
  const tools = listTools();
  assert(tools.length >= 10, 'Expected supported AI tools');
  console.log('✓ Categories and tools verification passed');

  // 3. Cache operations
  console.log('3. Testing cache operations...');
  writeCache('test_key', { foo: 'bar', timestamp: 12345 });
  const cached = readCache('test_key');
  assert(cached && cached.foo === 'bar', 'Cache read failed');
  clearTempCache();
  const cleared = readCache('test_key');
  assert.strictEqual(cleared, null, 'Cache was not cleared');
  console.log('✓ Cache operations passed');

  // 4. Live API Get Prompt (if internet is available)
  console.log('4. Testing live prompt fetch...');
  try {
    const promptData = await getPrompt('build-full-stack-software-architectures');
    assert.strictEqual(promptData.slug, 'build-full-stack-software-architectures');
    assert(promptData.title.includes('Full-Stack Software Architecture'), 'Unexpected prompt title');
    assert(promptData.prompt.includes('## Role'), 'Expected role section in prompt');
    assert(promptData.prompt.length > 500, 'Prompt body too short');
    assert(promptData.keywords.includes('Coding'), 'Expected Coding keyword');
    console.log(`✓ Fetched "${promptData.title}" (${promptData.prompt.length} chars) successfully`);
  } catch (err) {
    if (err.message.includes('fetch failed')) {
      console.log('⚠ Live fetch skipped (network sandbox restriction)');
    } else {
      throw err;
    }
  }

  // 5. Search test (offline / mock or live)
  console.log('5. Testing search functionality...');
  try {
    const results = await search('software architecture', { limit: 5 });
    if (results.length > 0) {
      assert(results[0].slug.includes('software-architecture'), 'Expected software architecture prompt');
      console.log(`✓ Search returned ${results.length} results`);
    }
  } catch (err) {
    if (err.message.includes('fetch failed')) {
      console.log('⚠ Search live test skipped (network sandbox restriction)');
    } else {
      throw err;
    }
  }

  // 6. Prompt Board test
  console.log('6. Testing createPromptBoard...');
  try {
    const board = await createPromptBoard('dashboard', { limit: 2 });
    assert(board.cards.length > 0, 'Expected board to return cards');
    assert(board.cards[0].role, 'Expected card to have role');
    assert(board.cards[0].concepts, 'Expected card to have extracted concepts');
    console.log(`✓ Prompt Board generated ${board.cards.length} cards for topic "${board.topic}"`);
  } catch (err) {
    if (err.message.includes('fetch failed')) {
      console.log('⚠ Board test skipped (network sandbox restriction)');
    } else {
      throw err;
    }
  }

  console.log('\nAll God of Prompt API tests completed successfully!\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
