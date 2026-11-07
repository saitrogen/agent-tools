---
name: clipcafe
description: Search, inspect, and download uncompressed 1080p/4K movie clips, dialogue scenes, and subtitles from Clip.Cafe (clip.cafe). Bypasses login/PRO paywalls, extracts direct MP4 URLs, and provides an interactive local web UI.
---

# ClipCafe Skill

Use this skill when the user wants to download movie clips from `clip.cafe`, find specific dialogue scenes or quotes, extract movie video clips for editing, or run the local interactive ClipCafe web tool.

## Key Capabilities

1. **Bypass Login / PRO Gating**: Direct MP4 streams and subtitles are completely public and unauthenticated at `https://clip.cafe/videos/<slug>.mp4` and `https://clip.cafe/srt/<slug>.srt`.
2. **Interactive Web Tool**: Run a local web UI to search, preview, and download scenes.
3. **CLI Search & Direct Download**: Search by quote, inspect metadata, download master-quality MP4 and subtitles.

## Commands

```bash
# Start the Web Tool UI on port 3000
node clipcafe/bin/clipcafe.js serve --port 3000

# Search clips by quote or title
node clipcafe/bin/clipcafe.js search "<quote-or-movie>"

# Get metadata and direct MP4 URL
node clipcafe/bin/clipcafe.js info "<url-or-slug>"

# Download video directly
node clipcafe/bin/clipcafe.js download "<url-or-slug>" --save --subs
```

