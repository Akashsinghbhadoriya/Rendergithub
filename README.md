# rendergit

> Just show me the code.

> **This browser extension is a fork of [karpathy/rendergit](https://github.com/karpathy/rendergit).** The core filtering logic, CXML output format, and dual Human/LLM view concept are directly ported from the original Python CLI. All credit for the original idea and implementation goes to [@karpathy](https://github.com/karpathy).

Tired of clicking around complex file hierarchies of GitHub repos? Do you just want to see all of the code on a single page? Enter `rendergit`. Flatten any GitHub repository into a single, static HTML page with syntax highlighting, markdown rendering, and a clean sidebar navigation. Perfect for code review, exploration, and an instant Ctrl+F experience.

## Basic usage

Install and use easily with [uv](https://docs.astral.sh/uv/):

```bash
uv tool install git+https://github.com/karpathy/rendergit
rendergit https://github.com/karpathy/nanogpt
```

Alternatively, more manual pip install example:

```bash
git clone https://github.com/karpathy/rendergit
cd rendergit
pip install -e .
rendergit https://github.com/karpathy/nanoGPT
```

The code will:
1. Clone the repo to a temporary directory
2. Render its source code into a single static temporary HTML file
3. Automatically open the file in your browser

Once open, you can toggle between two views:
- **👤 Human View**: Browse with syntax highlighting, sidebar navigation, visual goodies
- **🤖 LLM View**: Copy the entire codebase as CXML text to paste into Claude, ChatGPT, etc.

There's a few other smaller options, see the code.

## Features

- **Dual view modes** - toggle between Human and LLM views
  - **👤 Human View**: Pretty interface with syntax highlighting and navigation
  - **🤖 LLM View**: Raw CXML text format - perfect for copying to Claude/ChatGPT for code analysis
- **Syntax highlighting** for code files via Pygments
- **Markdown rendering** for README files and docs
- **Smart filtering** - skips binaries and oversized files
- **Directory tree** overview at the top
- **Sidebar navigation** with file links and sizes
- **Responsive design** that works on mobile
- **Search-friendly** - use Ctrl+F to find anything across all files

## Contributing

I vibe coded this utility a few months ago but I keep using it very often so I figured I'd just share it. I don't super intend to maintain or support it though.

## License

BSD0 go nuts

---

## Browser Extension

This repo also includes a Chrome extension that brings `rendergit` directly into your browser — no terminal, no cloning required.

### How it works

Instead of cloning the repo locally, the extension downloads the repository as a ZIP via the GitHub API and processes it entirely in-memory. This means:

- **No rate limit pain** — 2 API calls total regardless of repo size (vs. one per file with the blob API)
- **No setup** — works unauthenticated for public repos out of the box
- **Same output** — identical CXML format as the CLI, ready to paste into Claude/ChatGPT

### Install (dev mode)

```bash
cd rendergit-extension
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `build/chrome-mv3-prod`

### Usage

Two ways to export a repo:

1. **Popup button** — click the Rendergit icon in your toolbar while on any GitHub repo page. A green export button appears.
2. **Injected button** — an "Export for AI" button is injected next to GitHub's Code button on repo root pages.

The side panel opens and shows:

- **Human view** — included files with sizes, collapsed sections for skipped binaries and oversized files
- **LLM view** — full CXML output with a Copy button, token count estimate at the top

### GitHub token (optional)

Works without a token at 60 req/hr (unauthenticated GitHub API limit). For private repos or higher limits, add a token in the popup — stored locally only, never leaves your browser.

### Tech stack

- [Plasmo](https://plasmo.com) — Chrome extension framework
- React + TypeScript
- [fflate](https://github.com/101arrowz/fflate) — in-browser ZIP parsing
- Vitest — unit tests for the ported filtering + CXML logic
