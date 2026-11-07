# AI Studio Speech (`aispeech`)

> Direct, headless API and CLI tool for Google AI Studio Speech Generation and Gemini Text-to-Speech (`gemini-3.8-flash-tts`). Supports **100% Free Headless Session Mode ($0 cost, Tier 1 HTTP)**, active browser CDP mode, and standalone Gemini API mode.

---

## 🌟 Key Capabilities

1. **Free Session HTTP Mode (Default, $0 cost, ~1.2s)**:
   - Authenticates directly using your saved Google AI Studio session cookies (`SAPISID`).
   - Automatically signs RPC calls with fresh `SAPISIDHASH` headers.
   - Generates speech at **100% free ($0 cost)** with **pure HTTP**—no browser tabs opening, no window focus stealing, sub-second latency.
2. **One-Time Login & Auto-Import (`aispeech login`)**:
   - Auto-imports cookies from your active Google Chrome session or accepts direct cookie strings/files.
   - Saves securely to `~/.aispeech/session.json` (or `.session.json`).
3. **Direct REST API Mode**:
   - Developer API mode using Google GenAI API (`GEMINI_API_KEY`).
   - Supports 2-speaker multi-turn dialogue generation (`aispeech dialogue`).
4. **30 Studio Voices**: Full catalog of Google AI Studio voices (`Puck`, `Aoede`, `Fenrir`, `Charon`, `Kore`, `Leda`, etc.).
5. **Vocal Acting Tags**: Supports `<whisper>`, `<laugh>`, `<sigh>`, `<chuckle>`, and `<pause>`.
6. **Instant Playback**: Hear audio immediately with `--play` (macOS `afplay`).
7. **Workspace Hygiene Policy**: Saves to OS temp by default, with `--save` for explicit `./audio/` persistence.

---

## 🚀 Quick Start

### 1. Login Once (Save Session)

Capture your Google AI Studio login so all future requests run headlessly:

```bash
# Auto-import from running Chrome:
./aispeech/bin/aispeech.js login

# Or import via cookie string (Chrome DevTools -> Application -> Cookies -> aistudio.google.com):
./aispeech/bin/aispeech.js login --cookies "SAPISID=...; SSID=..."

# Or import from a saved cookie file:
./aispeech/bin/aispeech.js login --file cookies.txt

# Verify session health:
./aispeech/bin/aispeech.js session
```

---

### 2. Generate Speech (100% Free, Headless HTTP)

Once logged in, speech generation is instant and completely headless:

```bash
# Generate and save to ./audio/
./aispeech/bin/aispeech.js "Welcome to free speech generation with Google AI Studio!" --save

# Generate and play immediately on your Mac
./aispeech/bin/aispeech.js "Testing instant audio playback!" --play

# Expressive acting tags & custom voice
./aispeech/bin/aispeech.js "Wait... <whisper>did you hear that sound?</whisper> <pause> <laugh>Never mind, it was just the cat!</laugh>" --voice Aoede --save --play
```

---

### 3. Standalone API Mode

```bash
export GEMINI_API_KEY="your-api-key"

# Single-speaker generation
./aispeech/bin/aispeech.js "Synthesized via API key." --voice Kore --save

# Multi-speaker dialogue
./aispeech/bin/aispeech.js dialogue "Alex: Did you see the new speech tool?\nSam: <laugh> Yes! It is super fast." --speaker1 Kore --speaker2 Puck --save
```

---

### 4. Voice Discovery & Search

```bash
./aispeech/bin/aispeech.js voices
./aispeech/bin/aispeech.js voices female
./aispeech/bin/aispeech.js voices calm
```

---

### 5. Cleanup

```bash
./aispeech/bin/aispeech.js clean          # Purge temp cache
./aispeech/bin/aispeech.js clean --local  # Purge ./audio/
./aispeech/bin/aispeech.js logout         # Clear saved session
```

---

## 📄 License

MIT
