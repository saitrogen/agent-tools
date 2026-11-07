# ClipCafe - Movie Clip Downloader & Interactive Web Tool

> Reverse-engineered API extractor, CLI, and standalone Web Tool to search, stream, and download movie scene clips from [Clip.Cafe](https://clip.cafe/) without login walls or subscription gates.

---

## ⚡ Key Highlights

- **Bypass Login & PRO Wall**: The Clip.Cafe web interface blocks downloads behind a modal ("Login Required / Get PRO"). However, all video streams and subtitles are completely public and unauthenticated on Cloudflare CDN.
- **Direct Master MP4 Extraction**: Downloads direct master resolution MP4 files (1080p / 4K up to 3840x1600).
- **Interactive Web Tool**: Modern, dark-mode web application to search quotes, preview clips in an embedded player, and download videos & subtitles with one click.
- **Multi-Language Subtitles**: Direct `.srt` and `.vtt` subtitles download with dialogue timecodes.
- **Zero Heavy Dependencies**: Pure Node.js (>= 18.0.0) using native `http`, `fetch`, and stream pipelines.

---

## 🚀 Quick Start

### 1. Launch the Web Tool (Interactive GUI)

```bash
cd clipcafe
npm run serve
# Or: node bin/clipcafe.js serve --port 3000
```

Open `http://localhost:3000` in your browser.

- Paste any Clip.Cafe URL (e.g., `https://clip.cafe/the-matrix-1999/but-are-the-gatekeepers/`)
- Or search dialogue quotes directly (e.g., `convictions`, `gatekeepers`)
- Preview the clip in the embedded player
- Click **Download MP4 Video** or **Download Subtitles (.srt)**

---

## 💻 CLI Commands

### Search Movie Quotes
```bash
node bin/clipcafe.js search "gatekeepers"
```

### Inspect Clip Metadata & Direct URLs
```bash
node bin/clipcafe.js info "https://clip.cafe/touch-of-evil-1958/youre-a-killer/"
```

### Download Video Directly
```bash
# Saves to OS temp directory
node bin/clipcafe.js download "touch-of-evil-1958/youre-a-killer"

# Save to local ./downloads/ folder with subtitles
node bin/clipcafe.js download "touch-of-evil-1958/youre-a-killer" --save --subs

# Save to custom output path
node bin/clipcafe.js download "touch-of-evil-1958/youre-a-killer" -o ./my_scene.mp4
```

### Clean Temp Downloads
```bash
node bin/clipcafe.js clean          # Purges OS temp cache
node bin/clipcafe.js clean --local  # Purges local ./downloads/
```

---

## 🔍 Reverse Engineering Findings

| Resource | URL Pattern | Auth Required | Description |
|---|---|---|---|
| **Direct MP4 Video** | `https://clip.cafe/videos/<clip-slug>.mp4` | ❌ None (Public) | Full-quality master video file (supports HTTP Range) |
| **English Subtitles (SRT)** | `https://clip.cafe/srt/<clip-slug>.srt` | ❌ None (Public) | Clean SubRip subtitle track |
| **Multi-lang Subtitles (VTT)** | `https://clip.cafe/vtt/<clip-slug>-<lang>.vtt` | ❌ None (Public) | WebVTT track (en, es, fr, de, etc.) |
| **High-Res Poster** | `https://clip.cafe/img800/<clip-slug>.jpg` | ❌ None (Public) | 800px preview thumbnail |
| **Search Endpoint** | `https://clip.cafe/?s=<query>&usersearch=1` | ❌ None (Public) | Returns HTML search results |
| **JSON-LD Schema** | Embedded `<script type="application/ld+json">` | ❌ None (Public) | Full `VideoObject` metadata (actors, characters, awards, director) |

