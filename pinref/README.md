# Pinref 📌

> **Pinterest Reference Moodboard & Single-Glance Vision System for AI Agents and Humans.**

Pinref turns Pinterest into an automated visual reference engine. Instead of returning raw links or flooding context windows with dozens of individual images, Pinref downloads a batch of high-resolution references and compiles them into a **single, numbered composite contact sheet (`contact_sheet.jpg`)**.

An AI agent inspects the entire batch in a **single vision pass**, reviews options by index (`#1`–`#12`), and zooms in only on chosen items.

---

## ⚡ Quickstart

```bash
# 1. Ephemeral search (Default: saves to OS temp folder, zero workspace clutter)
pinref search "cyberpunk character design" --count 12

# 2. Persist in your project (saves to ./references/<query-slug>/)
pinref search "minimalist architecture moodboard" --save

# 3. Find deeper variations of an image you liked
pinref similar "1057008975051301499"

# 4. Clean cached temp references
pinref clean
```

---

## 🖼️ How the Single-Glance Vision System Works

```text
User Query: "Find cyberpunk character references"
                      │
                      ▼
            [Pinterest Tier-1 API]
                      │ (Fast JSON in ~1s)
                      ▼
         [Download Concurrently]
          01_<id>.jpg, 02_<id>.jpg ...
                      │
                      ▼
        [Generate Contact Sheet (Sharp)]
          contact_sheet.jpg (#1 to #12)
                      │
                      ▼
           [Agent 1-Pass Vision]
     Agent inspects contact_sheet.jpg
      "I recommend #2 for cyberware"
                      │
                      ▼
             [Zoom in on #2]
       Agent views 02_<id>.jpg only
```

---

## 📁 Output Artifacts & Storage Behavior

By default, Pinref saves outputs into your operating system's temp folder (`/tmp/pinref/<query-slug>/` or OS equivalent). This means:
- **Zero workspace pollution**: It won't litter your active coding repository with temporary image assets.
- **Auto-cleaning**: Your OS manages clearing temp files, or you can run `pinref clean`.

If you **want** to save references directly inside your active project, pass the `--save` (or `-s`) flag. It will save directly into `./references/<query-slug>/`:

```bash
pinref search "modernist posters" --save
```

Each generated folder contains:
- `contact_sheet.jpg`: Single high-resolution composite image with numbered badges (`#1` to `#12`), Pin IDs, and dominant color swatches.
- `gallery.html`: Interactive local web viewer with copy-to-clipboard buttons and full-size lightbox.
- `01_<id>.jpg`, `02_<id>.jpg`...: Original high-resolution images.
- `metadata.json`: Machine-readable mapping of index, Pin IDs, and remote CDN URLs.

---

## 🤖 Agent Skill Integration

Pinref includes a dedicated Skill ([skills/pinref/SKILL.md](./skills/pinref/SKILL.md)) following Antigravity customization guidelines:
- Teaches the agent to run `pinref search` when design inspiration is requested.
- Mandates calling `view_file` on `contact_sheet.jpg` first to save vision tokens.
- Defines index-based communication (`#1` through `#12`) between agent and human.
- Enables seamless branching via `pinref similar <pinId>`.

---

## 🛠️ Commands & Options

| Command / Option | Description | Output Location |
| :--- | :--- | :--- |
| `pinref search "<query>"` | Fetch & compile reference sheet | System temp (`/tmp/pinref/...`) |
| `pinref search "<query>" --save` | Fetch & save into active project | `./references/<slug>/` |
| `pinref similar "<pinId>"` | Fetch variations matching a Pin | System temp (or pass `--save`) |
| `pinref pin "<pinId>"` | Inspect title, description, and CDN URL | Printed to stdout |
| `pinref clean` | Delete cached temp references | Purges `/tmp/pinref` |
| `pinref clean --local` | Delete project `./references` folder | Purges `./references` |
| `-c, --count <num>` | Specify number of images (default: 12) | — |
| `-o, --out <path>` | Specify custom output directory | `<path>` |

