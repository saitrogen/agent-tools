# God of Prompt API & CLI (`gop`)

> A self-contained, high-speed CLI tool and programmatic Node.js API for extracting, searching, and managing engineered prompts from [godofprompt.ai](https://godofprompt.ai).

Built following the **Local Project Isolation** and **Hygiene Policy** directives:
- **Tier-1 Plain HTTP**: Zero headless browser overhead; direct, fast HTML parsing and metadata extraction.
- **Single-Command CLI**: Search 7,200+ prompts, view prompt markdown, or pipe directly to clipboard/LLMs.
- **Clean Persistence**: Outputs to console or temporary directories by default; saves to `./prompts/<slug>.md` with `--save`.

---

## 🚀 Quick Start

### 1. Install / Run Locally

From inside this directory:
```bash
# Run CLI directly
./bin/godofprompt.js --help

# Or run tests
npm test
```

You can alias or run locally:
```bash
alias gop="node $(pwd)/bin/godofprompt.js"
```

---

## 💻 CLI Commands

### 1. Build a Prompt Board (`board`)
Creates a side-by-side **Idea & Vocabulary Moodboard** by gathering 3 relevant prompt templates, extracting their system roles, task specifications, and professional domain vocabulary:
```bash
# Display Prompt Moodboard in terminal
gop board "dashboard"

# Save full comparison board with all templates to ./prompts/board_<topic>.md
gop board "code review" --save

# Output structured JSON for agents
gop board "portfolio" --json
```

### 2. Fetch a Prompt (`get`)
Extracts the complete prompt markdown, title, role, system instructions, and schema metadata:
```bash
# Pretty terminal display
gop get build-full-stack-software-architectures

# Output ONLY the raw prompt template (perfect for pipes and LLM feeds)
gop get build-full-stack-software-architectures --raw

# Copy prompt directly to macOS clipboard
gop get build-full-stack-software-architectures --raw | pbcopy

# Output structured JSON
gop get build-full-stack-software-architectures --json

# Save prompt into ./prompts/<slug>.md with frontmatter
gop get build-full-stack-software-architectures --save
```

### 2. Search Prompts (`search`)
Searches across the indexed prompt catalog by keywords:
```bash
# Search by keyword
gop search "code review"

# Limit results
gop search "seo optimization" --limit 5

# Output search as JSON
gop search "software architecture" --json
```

### 3. Browse Categories & Tools
```bash
# List all 18 primary categories and 60+ subcategories
gop categories

# View prompts in a specific category
gop category coding
gop category marketing

# View supported AI models and tools (ChatGPT, Claude, Gemini, DeepSeek, etc.)
gop tools
```

### 4. Cache & Storage Hygiene (`clean`)
```bash
# Purge temporary OS cache files
gop clean

# Purge local ./prompts/ directory as well
gop clean --local
```

---

## 📦 Programmatic API

Import into your Node.js scripts or agents:

```javascript
const { getPrompt, search, getCategoryPrompts, listCategories } = require('./src');

// 1. Fetch a full prompt
async function demo() {
  const prompt = await getPrompt('build-full-stack-software-architectures');
  console.log('Title:', prompt.title);
  console.log('Category:', prompt.category);
  console.log('Template:\n', prompt.prompt);

  // 2. Search
  const results = await search('react portfolio', { limit: 3 });
  console.log('Search matches:', results);

  // 3. Category prompts
  const codingPrompts = await getCategoryPrompts('coding');
  console.log('Coding prompts:', codingPrompts.prompts.length);
}

demo();
```

---

## 📂 Output Structure (`--save`)

When saving prompts via `--save`, files are saved to `./prompts/<slug>.md` with structured YAML frontmatter:

```markdown
---
title: "Full-Stack Software Architecture Code Generator"
slug: "build-full-stack-software-architectures"
category: "Coding"
subcategory: "Agent System Prompts"
url: "https://godofprompt.ai/prompt-library/build-full-stack-software-architectures"
keywords: ["Coding", "ChatGPT", "Claude", "Gemini"]
datePublished: "2026-02-11T09:35:26.000Z"
views: 2167
likes: 2
---

# Full-Stack Software Architecture Code Generator

> The Full-Stack Software Architecture Code Generator is a free AI prompt...

## Prompt Template

```markdown
## Role
You are a senior software architect...
```
```

---

## 🧪 Testing

Run the test suite locally:
```bash
npm test
```
