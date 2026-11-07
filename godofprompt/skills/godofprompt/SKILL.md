---
name: godofprompt
description: Search, retrieve, and inspect production-grade AI prompts and templates from God of Prompt (godofprompt.ai). Use when the user asks for prompt templates, system instructions for LLMs, prompt engineering patterns, coding/marketing/SEO prompts, or wants to explore prompt library techniques without browser overhead.
---

# God of Prompt (`gop`) - Agent Skill

God of Prompt provides instant programmatic access to 7,200+ curated, production-tested AI prompts from [godofprompt.ai](https://godofprompt.ai) across 18 domains (Coding, Marketing, SEO, Design, Writing, Strategy, Finance, etc.).

Instead of navigating browser pages, this tool extracts full prompt templates, system roles, parameters, and structured metadata over direct, lightweight HTTP requests.

---

## When to Use

Trigger this skill whenever the user asks for:
- System prompts or agent roles (e.g., "Give me a prompt for full-stack software architecture", "Prompt for code review")
- Prompts for specific tasks (e.g., "SEO content briefs", "Midjourney portrait prompts", "Copywriting email funnels")
- Prompt engineering best practices or template inspiration
- Exploring categories or models (e.g., "What coding prompts exist?", "Find Claude/ChatGPT prompts")

---

## Agent Usage & Commands

All commands can be invoked from the workspace directory:

```bash
# Path to local executable
./godofprompt/bin/godofprompt.js <command> [options]
```

### 1. Build a Prompt Board (Moodboard of Ideas & Vocabulary)
When dealing with an unfamiliar domain or ambiguous user request, build a Prompt Board to gather 3 side-by-side prompt references and extract the industry vocabulary:
```bash
# Pretty terminal Prompt Board
./godofprompt/bin/godofprompt.js board "dashboard"

# Save full comparison board into ./prompts/board_<topic>.md
./godofprompt/bin/godofprompt.js board "authentication flow" --save

# Output board as structured JSON
./godofprompt/bin/godofprompt.js board "code review" --json
```

### 2. Search for Prompts
Find prompt slugs and URLs matching keywords:
```bash
./godofprompt/bin/godofprompt.js search "code review" --limit 5
./godofprompt/bin/godofprompt.js search "software architecture" --json
```

### 3. Fetch a Prompt Template
Retrieve the full prompt instructions and parameters:
```bash
# Formatted summary + prompt body
./godofprompt/bin/godofprompt.js get build-full-stack-software-architectures

# Raw prompt markdown only (ideal for directly feeding to models or piping)
./godofprompt/bin/godofprompt.js get build-full-stack-software-architectures --raw

# Save into ./prompts/<slug>.md with frontmatter for project persistence
./godofprompt/bin/godofprompt.js get build-full-stack-software-architectures --save
```

### 3. Explore Categories & Tools
```bash
# List all 18 categories and their subcategories
./godofprompt/bin/godofprompt.js categories

# List prompts in a category
./godofprompt/bin/godofprompt.js category coding
./godofprompt/bin/godofprompt.js category marketing

# List supported AI models
./godofprompt/bin/godofprompt.js tools
```

### 4. Cache & Temp Clean
```bash
# Purge temporary OS cache
./godofprompt/bin/godofprompt.js clean

# Purge local saved prompts as well
./godofprompt/bin/godofprompt.js clean --local
```

---

## Programmatic Node.js Usage

Agents can also require the library directly in Node scripts:

```javascript
const { getPrompt, search, getCategoryPrompts, listCategories } = require('./godofprompt/src');

// Fetch a prompt
const prompt = await getPrompt('build-full-stack-software-architectures');
console.log(prompt.title);
console.log(prompt.prompt);

// Search
const results = await search('automation scripts', { limit: 3 });
```
