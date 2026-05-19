# rendergit — Browser Extension

> Just show me the code.

A Chrome extension that brings [karpathy/rendergit](https://github.com/karpathy/rendergit) directly into your browser — no terminal, no cloning required. Navigate to any GitHub repo and export the entire codebase as CXML text, ready to paste into Claude, ChatGPT, or any LLM.

Forked and extended from the original Python CLI by [@karpathy](https://github.com/karpathy).

## How it works

The original `rendergit` CLI works by running `git clone --depth 1` locally, walking the file tree, filtering out binaries and large files, and generating CXML output. This extension replicates that exact pipeline in the browser:

1. Downloads the repository as a single ZIP via the GitHub API (`/repos/{owner}/{repo}/zipball`)
2. Parses the ZIP in-memory using [fflate](https://github.com/101arrowz/fflate)
3. Applies the same filtering logic from the original CLI — skips binaries by extension, skips files over 50KB
4. Generates identical CXML output, ready to copy into any LLM

This means **2 API calls total** regardless of repo size, eliminating the per-file rate limit problem entirely.

## Features

- **No setup** — works unauthenticated for public repos out of the box
- **Dual view** — Human view (file list, skip stats) and LLM view (raw CXML + Copy button)
- **Token estimate** — rough token count shown at the top of the panel so you know what you're pasting
- **Skipped files visible** — collapsible sections show exactly which files were skipped and why (binary or too large)
- **Smart filtering** — direct port of `rendergit.py` logic: same binary extension list, same 50KB cap
- **Token storage** — GitHub token stored locally only, never leaves your browser

## Install

```bash
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `build/chrome-mv3-prod`

## Usage

Two ways to export a repo:

1. **Popup button** — click the Rendergit icon in your toolbar while on any GitHub repo root page. A green export button appears showing the repo name.
2. **Injected button** — an "Export for AI" button is injected next to GitHub's Code button on repo root pages.

The side panel opens and shows:

- **Human view** — full list of included files with sizes, plus collapsed sections for skipped binaries and oversized files
- **LLM view** — full CXML output in a scrollable textarea with a one-click Copy button. Token count estimate is pinned at the top.

## GitHub token (optional)

Works without a token for public repos (GitHub allows unauthenticated ZIP downloads). Add a personal access token in the popup for private repos — stored in `chrome.storage.local`, never synced across devices.

## Tech stack

- [Plasmo](https://plasmo.com) — Chrome extension framework (React + TypeScript, Manifest V3)
- [fflate](https://github.com/101arrowz/fflate) — lightweight in-browser ZIP parsing (15KB gzipped, no WASM)
- Vitest — unit tests for the ported filtering and CXML generation logic

## License

BSD0
