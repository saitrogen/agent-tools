# Agent Tools & Skills Workspace

A unified repository containing a collection of standalone, self-contained reference scrapers, API extractors, vision-optimized CLI tools, and modular agent skills.

---

## 📁 Repository Structure

```
.
├── .agents/                    # Workspace agent skills and plugins
│   ├── plugins/                # Modular plugins (e.g. api-anything)
│   └── skills/                 # Skills specifications (aispeech, clipcafe, godofprompt, pinref)
├── AGENTS.md                   # Workspace guidelines, strict tool isolation & directives
├── package.json                # Root package with multi-tool testing & install runners
├── aispeech/                   # Standalone: Google AI Studio Speech & Gemini TTS CLI
├── clipcafe/                   # Standalone: Movie clip search, video extractor & web player
├── godofprompt/                # Standalone: AI prompt template retrieval & prompt boards
└── pinref/                     # Standalone: Pinterest moodboards & single-glance vision sheets
```

---

## 🔒 Standalone Independence (No Shared Dependencies)

Every tool in this repository is **100% self-contained**:
* **No shared runtime code**: Each tool has its own dependencies and does not rely on sibling directories.
* **Individual Installation**: Any tool can be cloned, moved, or installed separately:
  ```bash
  # Install and run any tool individually:
  cd pinref && npm install && npm test
  cd ../aispeech && npm install && npm test
  cd ../clipcafe && npm test
  cd ../godofprompt && npm test
  ```
* **Root Helper Scripts**:
  ```bash
  npm run test:all       # Runs tests for all tools in their isolated environments
  npm run install:all    # Installs dependencies across tools without hoisting
  ```

---

## 🛠️ Included Tools & Skills

### 1. [pinref](./pinref) — Pinterest Reference Moodboard CLI
* **Skill**: `.agents/skills/pinref/SKILL.md`
* **Agent Vision Optimization**: Builds high-contrast numbered contact sheets (`contact_sheet.jpg`) from Pinterest to minimize vision token usage.
* **Install & Run**:
  ```bash
  cd pinref
  npm install
  ./bin/pinref.js search "cyberpunk character design"
  ```

### 2. [aispeech](./aispeech) — AI Speech & Multi-Speaker Synthesizer
* **Skill**: `.agents/skills/aispeech/SKILL.md`
* **Features**: Gemini TTS, 30+ voices, turn-taking multi-speaker dialogues, and free session-based tier.
* **Install & Run**:
  ```bash
  cd aispeech
  npm install
  npm test
  ```

### 3. [clipcafe](./clipcafe) — Movie Dialogue & Video Clip Extractor
* **Skill**: `.agents/skills/clipcafe/SKILL.md`
* **Features**: Uncompressed 1080p/4K movie clips, dialogue scene finder, subtitle extraction, and an embedded web viewer.
* **Run**:
  ```bash
  cd clipcafe
  npm test
  ./bin/clipcafe.js serve
  ```

### 4. [godofprompt](./godofprompt) — AI Prompt & Template Inspector
* **Skill**: `.agents/skills/godofprompt/SKILL.md`
* **Features**: Production-grade prompt library search, markdown prompt boards, and offline caching.
* **Run**:
  ```bash
  cd godofprompt
  npm test
  ```
