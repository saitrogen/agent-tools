---
name: pinref
description: Search and gather visual reference moodboards from Pinterest as a single composite contact sheet. Use when the user asks for design inspiration, character or environment references, moodboards, textures, UI/UX examples, or wants to explore visual styles without consuming dozens of separate image tokens.
---

# Pinref - Visual Reference & Moodboard System

Pinref bridges the gap between text queries and visual understanding for AI agents. Instead of receiving raw links that an agent cannot inspect, or loading dozens of separate images that saturate token context, Pinref downloads a batch of references and compiles them into a **single, numbered composite contact sheet (`contact_sheet.jpg`)**.

The agent inspects the entire batch in a **single vision call**, selects the best candidate by index (`#1` to `#12`), and zooms into that individual file only when necessary.

---

## Installation & Setup

If Pinref is not yet installed on the system, follow these steps:

### 1. Requirements
- Node.js v22.13 or newer (`node --version && npm --version`).
- No API keys or accounts required (runs locally over direct HTTP).

### 2. Install the CLI
From the root of the `pinref` repository:
```bash
npm install
npm install -g .
```

Verify installation:
```bash
pinref --version
# Expected: Pinref v1.0.0
```

### 3. Register the Skill with your Agent
- **Antigravity**: `mkdir -p ~/.gemini/config/skills/pinref && cp skills/pinref/SKILL.md ~/.gemini/config/skills/pinref/`
- **Claude Code**: `mkdir -p ~/.claude/skills/pinref && cp skills/pinref/SKILL.md ~/.claude/skills/pinref/`
- **Codex / Open Agent**: `mkdir -p ~/.agents/skills/pinref && cp skills/pinref/SKILL.md ~/.agents/skills/pinref/`

---

## The Vision Protocol (Agent Runbook)

When a user asks for visual references (e.g., "Find character concepts", "Show me dark mode fintech dashboards", "Find architecture moodboards"):

### 1. Run the Search Command
Execute Pinref via terminal:
```bash
# Default: saves to OS temp folder (clean, zero workspace clutter)
pinref search "<query>" --count 12

# Persist in current project workspace (./references/<query-slug>/):
pinref search "<query>" --save
```

### 2. The Single-Glance Vision Pass
Call `view_file` on the generated composite sheet (use the path printed by the command):
```
view_file: AbsolutePath="<outputPath>/contact_sheet.jpg"
```
In this single image, inspect the entire 12-image grid. Each tile contains:
- An identifiable index badge: `#1`, `#2`, ... `#12`.
- The Pin ID and dominant color code.

### 3. Review Candidates with the User
Summarize the visual directions found on the sheet and recommend 1–3 specific numbers:
> "On the contact sheet, **#2** shows a high-tech cyborg aesthetic, while **#4** has a more rugged retro-cyberpunk tone. Would you like to proceed with #2?"

### 4. Zoom In (High-Resolution Detail Pass)
When the user or task selects an index (e.g., `#2`), view ONLY that specific image file:
```
view_file: AbsolutePath="<workspace>/references/<query-slug>/02_<id>.jpg"
```
This reveals the full-resolution artwork without wasting vision tokens on the other 11 images.

### 5. Branch / Find Variations (`pinref similar`)
To explore deeper variations of a chosen pin:
```bash
pinref similar "<pinId>" --count 12
```
This fetches the pin's detailed metadata, extracts core concepts, and automatically produces a fresh contact sheet focused on that specific visual direction.

---

## Command Reference

| Command | Action | Output Destination |
| :--- | :--- | :--- |
| `pinref search "<query>"` | Fetch & compile reference sheet | System Temp (`/tmp/pinref/...`) |
| `pinref search "<query>" --save` | Fetch & save to project workspace | `./references/<slug>/` |
| `pinref similar "<pinId>"` | Fetch variations matching a pin | System Temp (or pass `--save`) |
| `pinref pin "<pinId>"` | Inspect title, description, repins | Metadata printed to stdout |
| `pinref clean` | Clear cached temp references | Deletes temp cache |

---

## Best Practices & Rules

1. **Always view `contact_sheet.jpg` first**: Never load multiple individual image files until the contact sheet has been reviewed.
2. **Use Identifiable Indices**: Always refer to images by their badge `#1` through `#12` so the user and agent stay aligned.
3. **Keep Reference Folders Organized**: Output is saved under `references/<query-slug>/`. The user can open `gallery.html` in their browser for an interactive web viewer.
4. **Offline Resilience**: Once downloaded, contact sheets and individual images are completely local and accessible without internet.
