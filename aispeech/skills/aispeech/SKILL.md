---
name: aispeech
description: Generate expressive speech and multi-speaker dialogues using Google AI Studio / Gemini Text-to-Speech (TTS). Supports 100% free speech generation using your saved Google account session ($0 cost, pure HTTP), as well as direct Gemini API mode.
---

# Google AI Studio Speech & Gemini TTS (`aispeech`) - Agent Skill

`aispeech` provides seamless speech generation using Google AI Studio's Speech Generator and Gemini TTS (`gemini-3.8-flash-tts`).

It features **three operational tiers**:
1. **Free Session HTTP Mode (Default, $0 cost, ~1.2s)**: Authenticates using your saved Google AI Studio session cookies (`SAPISID`). Generates speech via direct HTTP RPCs without opening browser windows or needing API keys.
2. **Active Browser Session Mode (`--browser`, `-b`)**: Drives your live Chrome tab via Chrome DevTools Protocol (CDP).
3. **Direct REST API Mode (`--api`, `-a`)**: Headless generation via Google's Generative Language API using an API key (`GEMINI_API_KEY`).

---

## When to Use

Trigger this skill whenever the user asks to:
- Generate speech from text using Google AI Studio (`aistudio.google.com/generate-speech`)
- Use their free Google login session for speech generation ($0 cost)
- Log in or extract cookies from their active session (`aispeech login`)
- Create voiceovers, narrations, or podcast audio
- Generate multi-speaker dialogues (`aispeech dialogue`)
- Audition Google AI Studio prebuilt studio voices (30 voices)
- Use expressive acting tags (`<whisper>`, `<laugh>`, `<sigh>`, `<pause>`)

---

## Agent Usage & Commands

All commands can be invoked from the workspace:

```bash
# Executable path
./aispeech/bin/aispeech.js <command> [options]
```

### 1. Session Setup & Login (One-time)
```bash
# Auto-import from running Chrome session
./aispeech/bin/aispeech.js login

# Or import via cookies string / file
./aispeech/bin/aispeech.js login --cookies "SAPISID=...; SSID=..."
./aispeech/bin/aispeech.js login --file cookies.txt

# Inspect session health
./aispeech/bin/aispeech.js session
```

### 2. Free Speech Generation via Headless Session (Default)
Generates audio at $0 cost via pure HTTP:

```bash
# Generate and save to temp
./aispeech/bin/aispeech.js "Welcome to free speech generation!"

# Generate, save locally to ./audio/, and play immediately on macOS
./aispeech/bin/aispeech.js "Here is your morning brief." --voice Aoede --save --play

# Expressive acting tags
./aispeech/bin/aispeech.js "Wait... <whisper>did you hear that?</whisper> <pause> <laugh>It was nothing!</laugh>" --save
```

---

### 3. Standalone API Mode (with API Key)
When you prefer direct Gemini developer API calls:

```bash
export GEMINI_API_KEY="your-api-key"
# or store it:
./aispeech/bin/aispeech.js auth <key>

./aispeech/bin/aispeech.js "Synthesized via API key." --voice Kore --save
```

---

### 4. Multi-Speaker Dialogue
```bash
./aispeech/bin/aispeech.js dialogue "Alex: Did you see this?\nSam: <laugh> Yes, it's wild!" --speaker1 Kore --speaker2 Puck --save
```

---

### 5. Voice Discovery
```bash
./aispeech/bin/aispeech.js voices
./aispeech/bin/aispeech.js voices female
```

---

### 6. Storage & Hygiene
- Default outputs: Saved to OS temporary directory (`os.tmpdir()/aispeech/...`).
- Explicit persistence: Pass `--save` (or `-s`) to write to `./audio/`.
- Purge caches: `aispeech clean` (temp) and `aispeech clean --local` (`./audio/`).
