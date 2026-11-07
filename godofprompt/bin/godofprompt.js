#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  getPrompt,
  search,
  getCategoryPrompts,
  createPromptBoard,
  listCategories,
  listTools
} = require('../src/api');
const {
  clearTempCache,
  clearLocalPrompts,
  ensureDir
} = require('../src/cache');

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
God of Prompt CLI (gop) - The Complete Prompt Library API & Tool

Usage:
  gop board <topic> [options]        Build a side-by-side prompt moodboard & vocabulary
  gop get <slug|url> [options]       Fetch a prompt and its full template
  gop search <query> [options]       Search 7,200+ prompts by keyword
  gop category <category-slug>       Browse prompts in a specific category
  gop categories                     List all 18 categories and subcategories
  gop tools                          List supported AI models and tools
  gop clean [--local]                Purge temporary cache files (or local ./prompts/)

Options:
  --raw, -r                          Output raw prompt text only (for piping)
  --json, -j                         Output results in structured JSON format
  --save, -s [dir]                   Save prompt/board to ./prompts/ (or custom dir)
  --limit <n>, -l <n>                Limit search/board results (default: 3 for board, 10 for search)
  --refresh                          Bypass cache and refresh index

Examples:
  gop board "dashboard"
  gop board "code review" --save
  gop get build-full-stack-software-architectures
  gop get build-full-stack-software-architectures --raw | pbcopy
  gop search "seo optimization" --limit 5
  gop category coding
  gop categories
`);
}

async function handleGet() {
  const slugOrUrl = args[1];
  if (!slugOrUrl || slugOrUrl.startsWith('-')) {
    console.error('Error: Please provide a prompt slug or URL.');
    console.error('Example: gop get build-full-stack-software-architectures');
    process.exit(1);
  }

  const isRaw = args.includes('--raw') || args.includes('-r');
  const isJson = args.includes('--json') || args.includes('-j');
  const saveIdx = args.findIndex(a => a === '--save' || a === '-s');

  try {
    const data = await getPrompt(slugOrUrl);

    if (saveIdx !== -1) {
      let customDir = './prompts';
      if (args[saveIdx + 1] && !args[saveIdx + 1].startsWith('-')) {
        customDir = args[saveIdx + 1];
      }
      const targetDir = path.resolve(process.cwd(), customDir);
      ensureDir(targetDir);

      const filePath = path.join(targetDir, `${data.slug}.md`);
      const fileContent = `---
title: "${data.title.replace(/"/g, '\\"')}"
slug: "${data.slug}"
category: "${data.category}"
subcategory: "${data.subcategory || ''}"
url: "${data.url}"
keywords: [${data.keywords.map(k => `"${k}"`).join(', ')}]
datePublished: "${data.datePublished || ''}"
views: ${data.stats.views || 0}
likes: ${data.stats.likes || 0}
---

# ${data.title}

> ${data.description}

## Prompt Template

\`\`\`markdown
${data.prompt}
\`\`\`
`;
      fs.writeFileSync(filePath, fileContent, 'utf8');
      console.log(`Saved prompt to: ${filePath}`);
      return;
    }

    if (isRaw) {
      process.stdout.write(data.prompt + '\n');
      return;
    }

    if (isJson) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // Default pretty terminal output
    console.log(`\n================================================================`);
    console.log(`Title:       ${data.title}`);
    console.log(`Category:    ${data.category}${data.subcategory ? ' > ' + data.subcategory : ''}`);
    console.log(`URL:         ${data.url}`);
    if (data.keywords && data.keywords.length > 0) {
      console.log(`Models/Tags: ${data.keywords.join(', ')}`);
    }
    if (data.stats.views || data.stats.likes) {
      console.log(`Stats:       Views: ${data.stats.views || 0} | Likes: ${data.stats.likes || 0}`);
    }
    console.log(`================================================================\n`);
    console.log(`Description:\n${data.description}\n`);
    console.log(`----------------------------------------------------------------`);
    console.log(`PROMPT TEMPLATE:`);
    console.log(`----------------------------------------------------------------\n`);
    console.log(data.prompt);
    console.log(`\n----------------------------------------------------------------\n`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

async function handleSearch() {
  const queryWords = [];
  let limit = 10;
  let refresh = false;
  let isJson = false;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit' || a === '-l') {
      limit = parseInt(args[++i], 10) || 10;
    } else if (a === '--refresh') {
      refresh = true;
    } else if (a === '--json' || a === '-j') {
      isJson = true;
    } else if (!a.startsWith('-')) {
      queryWords.push(a);
    }
  }

  const query = queryWords.join(' ');
  try {
    const results = await search(query, { limit, refresh });

    if (isJson) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    console.log(`\nFound ${results.length} results for: "${query || '*'}"\n`);
    results.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.title}`);
      console.log(`   Slug: ${r.slug}`);
      console.log(`   URL:  ${r.url}`);
      console.log(`   Fetch command: gop get ${r.slug}`);
      console.log();
    });
  } catch (err) {
    console.error(`Search error: ${err.message}`);
    process.exit(1);
  }
}

async function handleCategory() {
  const catSlug = args[1];
  if (!catSlug || catSlug.startsWith('-')) {
    console.error('Error: Please provide a category slug.');
    console.error('Example: gop category coding');
    process.exit(1);
  }

  const isJson = args.includes('--json') || args.includes('-j');

  try {
    const res = await getCategoryPrompts(catSlug);

    if (isJson) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    console.log(`\nCategory: ${res.category.toUpperCase()} (${res.count} prompts on page)`);
    console.log(`URL:      ${res.url}\n`);

    res.prompts.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
      console.log(`   Slug: ${p.slug}`);
      console.log(`   Fetch command: gop get ${p.slug}`);
      console.log();
    });
  } catch (err) {
    console.error(`Category error: ${err.message}`);
    process.exit(1);
  }
}

function handleCategories() {
  const isJson = args.includes('--json') || args.includes('-j');
  const { categories, subcategories } = listCategories();

  if (isJson) {
    console.log(JSON.stringify({ categories, subcategories }, null, 2));
    return;
  }

  console.log(`\n=== Primary Categories ===\n`);
  categories.forEach(c => {
    console.log(`• ${c.name} (slug: ${c.slug})`);
    if (subcategories[c.slug]) {
      subcategories[c.slug].forEach(s => {
        console.log(`    ↳ ${s.name} (slug: ${s.slug})`);
      });
    }
  });
  console.log();
}

function handleTools() {
  const isJson = args.includes('--json') || args.includes('-j');
  const tools = listTools();

  if (isJson) {
    console.log(JSON.stringify(tools, null, 2));
    return;
  }

  console.log(`\n=== Supported AI Models & Tools ===\n`);
  tools.forEach(t => {
    console.log(`• ${t.name.padEnd(16)} (slug: ${t.slug})`);
  });
  console.log();
}

function handleClean() {
  const isLocal = args.includes('--local');
  const tempRes = clearTempCache();
  console.log(`Cleaned temporary cache: removed ${tempRes.filesRemoved} files from ${tempRes.cacheDir}`);

  if (isLocal) {
    const localRes = clearLocalPrompts();
    console.log(`Cleaned local prompts: removed ${localRes.filesRemoved} files from ${localRes.dir}`);
  }
}

async function handleBoard() {
  const topicWords = [];
  let limit = 3;
  let refresh = false;
  let isJson = false;
  let isSave = false;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit' || a === '-l') {
      limit = parseInt(args[++i], 10) || 3;
    } else if (a === '--refresh') {
      refresh = true;
    } else if (a === '--json' || a === '-j') {
      isJson = true;
    } else if (a === '--save' || a === '-s') {
      isSave = true;
    } else if (!a.startsWith('-')) {
      topicWords.push(a);
    }
  }

  const topic = topicWords.join(' ');
  if (!topic) {
    console.error('Error: Please provide a topic for the prompt board.');
    console.error('Example: gop board "dashboard"');
    process.exit(1);
  }

  try {
    const board = await createPromptBoard(topic, { limit, refresh });

    if (isSave) {
      const targetDir = path.resolve(process.cwd(), './prompts');
      ensureDir(targetDir);
      const safeSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const filePath = path.join(targetDir, `board_${safeSlug}.md`);

      let md = `# Prompt Board: "${topic}"\n\n`;
      md += `> Extracted ${board.cards.length} reference prompt templates from God of Prompt.\n\n`;
      
      board.cards.forEach(c => {
        md += `## [#${c.index}] ${c.title}\n\n`;
        md += `- **Slug**: \`${c.slug}\`\n`;
        md += `- **Category**: ${c.category}\n`;
        md += `- **URL**: ${c.url}\n`;
        md += `- **Role**: ${c.role}\n`;
        md += `- **Task**: ${c.task}\n`;
        if (c.concepts && c.concepts.length > 0) {
          md += `- **Core Vocabulary**: ${c.concepts.map(k => `\`${k}\``).join(', ')}\n`;
        }
        md += `\n### Full Template\n\n\`\`\`markdown\n${c.fullPrompt}\n\`\`\`\n\n---\n\n`;
      });

      fs.writeFileSync(filePath, md, 'utf8');
      console.log(`Saved Prompt Board to: ${filePath}`);
      return;
    }

    if (isJson) {
      console.log(JSON.stringify(board, null, 2));
      return;
    }

    console.log(`\n================================================================================`);
    console.log(`                 PROMPT BOARD (IDEA & VOCAB MOODBOARD): "${topic.toUpperCase()}"`);
    console.log(`================================================================================\n`);

    board.cards.forEach(c => {
      console.log(`[#${c.index}] ${c.title.toUpperCase()}`);
      console.log(`    Category:     ${c.category}`);
      console.log(`    URL:          ${c.url}`);
      console.log(`    Role:         ${c.role}`);
      console.log(`    Task:         ${c.task}`);
      if (c.concepts && c.concepts.length > 0) {
        console.log(`    Key Vocab:    ${c.concepts.map(k => `"${k}"`).join(', ')}`);
      }
      console.log(`    Full prompt:  gop get ${c.slug}`);
      console.log(`--------------------------------------------------------------------------------`);
    });
    console.log();
  } catch (err) {
    console.error(`Board error: ${err.message}`);
    process.exit(1);
  }
}

async function main() {
  const cmd = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  switch (cmd) {
    case 'board':
    case 'moodboard':
      await handleBoard();
      break;
    case 'get':
      await handleGet();
      break;
    case 'search':
    case 'find':
      await handleSearch();
      break;
    case 'category':
      await handleCategory();
      break;
    case 'categories':
      await handleCategories();
      break;
    case 'tools':
    case 'models':
      await handleTools();
      break;
    case 'clean':
      handleClean();
      break;
    default:
      console.error(`Unknown command: "${cmd}".`);
      printHelp();
      process.exit(1);
  }
}

main();

