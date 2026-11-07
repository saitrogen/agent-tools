# Install & Set Up Pinref 📌

Pinref turns Pinterest into an automated reference moodboard engine. It downloads batches of references and stitches them into a **single, numbered composite contact sheet (`contact_sheet.jpg`)** so that humans and AI agents can inspect an entire batch in a **single glance**.

---

## 1. System Requirements

- **Node.js**: `v22.13` or newer (`node --version && npm --version && git --version`)
- **Supported OS**: macOS, Linux, Windows (WSL / PowerShell)
- **No API keys or accounts required** — runs locally and queries Pinterest over plain HTTP.

---

## 2. Install the CLI

### Option A: Install from this Repository (Recommended)
From the root of this `pinref` repository:

```bash
npm install
npm install -g .
```

Verify that the command is available:
```bash
pinref --version
```
*(Should output `Pinref v1.0.0`)*

---

## 3. Verify that it works

Run a test search to download 4 references and generate a contact sheet:

```bash
pinref search "minimalist architecture moodboard" --count 4
```

Expected result:
- Fetches images in ~1s over Tier 1 Direct HTTP.
- Creates folder `./references/minimalist-architecture-moodboard/`.
- Generates `contact_sheet.jpg`, `gallery.html`, and `metadata.json`.

---

## 4. Install the AI Agent Skill

Pinref includes a dedicated Skill ([skills/pinref/SKILL.md](./skills/pinref/SKILL.md)) that teaches AI coding agents the **Contact Sheet & Zoom Vision Protocol**.

Run the command for your agent:

### Antigravity (AGY / IDE)
```bash
mkdir -p ~/.gemini/config/skills/pinref
cp skills/pinref/SKILL.md ~/.gemini/config/skills/pinref/SKILL.md
```

### Claude Code
```bash
mkdir -p ~/.claude/skills/pinref
cp skills/pinref/SKILL.md ~/.claude/skills/pinref/SKILL.md
```

### Codex / Other Agents
```bash
mkdir -p ~/.agents/skills/pinref
cp skills/pinref/SKILL.md ~/.agents/skills/pinref/SKILL.md
```

---

## 5. Usage Examples

```bash
# Search & build a 12-image contact sheet
pinref search "cyberpunk character design reference" --count 12

# Drill down into deeper variations of any Pin ID
pinref similar "1057008975051301499"

# Inspect single Pin metadata
pinref pin "893049801158256972"
```
