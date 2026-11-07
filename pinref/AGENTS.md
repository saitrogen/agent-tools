# Workspace Guidelines & Agent Directives

This repository is dedicated to building robust, self-contained reference scrapers, API extractors, and vision-optimized CLI tools.

Any AI assistant or agent working in this workspace must adhere to the following rules:

---

## 🔒 1. Local Project Isolation (Strict Rule)

- **Do Not Install Globally by Default**: Never run `npm install -g`, `npm link`, or touch global directories (`/usr/local`, `/opt/homebrew`, `~/.config`, `~/.gemini`) unless the user explicitly requests global installation.
- **Self-Contained Packages**: Every tool must be fully runnable locally inside its own directory with standard `npm install` and `npm test`.
- **Vendoring Dependencies**: If a package depends on a custom or unpublished module (such as `api-anything`), vendor the `.tgz` tarball inside a local `./vendor/` folder and reference it via `"file:./vendor/<package>.tgz"` in `package.json`. It must install and run on any fresh system without external assumptions.
- **Isolated Git Repositories**: Individual tools (such as `pinref/`) maintain their own standalone Git repository inside their respective subdirectory. Never initialize Git at the workspace root unless explicitly requested.

---

## 💾 2. Storage & Workspace Hygiene Policy

- **Temp Storage by Default**: CLI tools that download images, reference materials, or transient files must default to saving inside the OS temporary directory (`os.tmpdir()/<tool>/<slug>`).
- **Explicit Project Persistence**: Always provide a `--save` (or `-s`) flag that explicitly saves files into the current project directory (e.g., `./references/<slug>/`).
- **Clean Commands**: Provide a `clean` command (e.g. `<tool> clean` and `<tool> clean --local`) to easily purge temp caches and local reference directories.
- **Gitignore Protection**: Ensure `references/`, `node_modules/`, and test artifacts are permanently ignored in `.gitignore`.

---

## 👁️ 3. Vision & Agent Token Optimization

When creating tools for visual references:
- **Single-Glance Vision Pattern**: Never force the user or agent to inspect dozens of separate images. Always compile downloaded batches into a single numbered composite image (`contact_sheet.jpg`).
- **Numbered Badge Indexing**: Overlay clear, high-contrast badges (`#1`, `#2`, ...) so users and agents can reference tiles unambiguously.
- **Direct Zooming**: Store individual high-res images (`01_<id>.jpg`, `02_<id>.jpg`) so the agent can selectively view only the chosen tile after the contact sheet pass.

---

## 🛠️ 4. Workflow for Creating an API / CLI for a New Website

When the user asks to build an API or CLI for a new website:
1. **Analyze Site Traffic**:
   - Inspect public REST/JSON network requests or learn endpoints via `api-anything` frontend interception.
   - Prefer Tier-1 plain HTTP requests (fast, unauthenticated, zero headless browser overhead) when public endpoints exist.
2. **Scaffold Local Package**:
   - Create a dedicated folder for the tool (e.g., `<tool-name>/`).
   - Initialize `package.json` with clear scripts and bin shortcuts.
3. **Build the CLI & Skill**:
   - Provide a clean CLI executable in `bin/<tool-name>.js`.
   - Package an Antigravity/Claude Code skill in `skills/<tool-name>/SKILL.md` documenting usage, commands, and best practices.
4. **Verify Locally**:
   - Test search, single item fetch, temp storage, and `--save` persistence.
