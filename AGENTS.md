# Workspace Guidelines & Agent Directives

This repository is a unified monorepo containing a collection of standalone, self-contained reference scrapers, API extractors, vision-optimized CLI tools, and modular agent skills.

Any AI assistant or agent working in this workspace must adhere to the following rules:

---

## 🔒 1. Standalone Tool Independence & Isolation (Strict Rule)

- **One Git Repository, Independent Packages**: The entire workspace is tracked by a single root Git repository. However, every tool inside it (`pinref`, `aispeech`, `clipcafe`, `godofprompt`, etc.) is strictly self-contained.
- **No Shared Content / No Dependency Hoisting**:
  - Do NOT share runtime code or introduce cross-package imports between tools unless tools are explicitly linked or modularly integrated.
  - Do NOT hoist dependencies into a shared root `node_modules`.
  - Every tool maintains its own `package.json`, its own dependencies, and its own local tests.
- **Individual Installability**: Every tool MUST be fully installable and runnable on its own:
  ```bash
  cd <tool-name>
  npm install
  npm test
  ```
- **Vendoring Dependencies**: If a package depends on a custom or unpublished module (such as `api-anything`), vendor the `.tgz` tarball inside that specific tool's `./vendor/` folder and reference it via `"file:./vendor/<package>.tgz"` in its own `package.json`. It must install and run on any fresh system without relying on external assumptions.
- **Do Not Install Globally by Default**: Never run `npm install -g`, `npm link`, or touch global directories unless the user explicitly requests global installation.

---

## 🎯 2. Modular Agent Skills

- Each tool defines its own agent skill:
  - Inside the tool's directory: `<tool>/skills/<tool>/SKILL.md`
  - Mirrored in workspace skills: `.agents/skills/<tool>/SKILL.md`
- Skills can be discovered and used collectively by agents in this workspace, or exported/copied individually into another project's `.agents/skills/` or `~/.gemini/antigravity/skills/`.

---

## 💾 3. Storage & Workspace Hygiene Policy

- **Temp Storage by Default**: CLI tools that download images, audio, video, or transient files must default to saving inside the OS temporary directory (`os.tmpdir()/<tool>/<slug>`).
- **Explicit Project Persistence**: Always provide a `--save` (or `-s`) flag that explicitly saves files into the current project directory (e.g., `./references/<slug>/`).
- **Clean Commands**: Provide a `clean` command (e.g. `<tool> clean` and `<tool> clean --local`) to easily purge temp caches and local reference directories.
- **Gitignore Protection**: Ensure `node_modules/`, `scratch/`, test credentials/sessions, downloaded media (`*.mp4`, `*.mp3`, `*.wav`), and reference caches are permanently ignored in `.gitignore`.

---

## 👁️ 4. Vision & Agent Token Optimization

When creating tools for visual references:
- **Single-Glance Vision Pattern**: Never force the user or agent to inspect dozens of separate images. Always compile downloaded batches into a single numbered composite image (`contact_sheet.jpg`).
- **Numbered Badge Indexing**: Overlay clear, high-contrast badges (`#1`, `#2`, ...) so users and agents can reference tiles unambiguously.
- **Direct Zooming**: Store individual high-res images (`01_<id>.jpg`, `02_<id>.jpg`) so the agent can selectively view only the chosen tile after the contact sheet pass.

---

## 🛠️ 5. Workflow for Creating an API / CLI for a New Website

When creating an API or CLI for a new website:
1. **Analyze Site Traffic**:
   - Inspect public REST/JSON network requests or learn endpoints via `api-anything` frontend interception.
   - Prefer Tier-1 plain HTTP requests (fast, unauthenticated, zero headless browser overhead) when public endpoints exist.
2. **Scaffold Local Package**:
   - Create a dedicated folder for the tool (e.g., `<tool-name>/`).
   - Initialize its own self-contained `package.json` with scripts and bin shortcuts.
3. **Build the CLI & Skill**:
   - Provide a clean CLI executable in `<tool-name>/bin/<tool-name>.js`.
   - Package its skill in `<tool-name>/skills/<tool-name>/SKILL.md` and link/mirror to `.agents/skills/<tool-name>/SKILL.md`.
4. **Verify Locally**:
   - Test search, single item fetch, temp storage, and `--save` persistence inside its directory.
