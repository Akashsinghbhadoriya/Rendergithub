// Content script — injects "Export for AI" button on GitHub repo root pages
// Uses multiple fallback selectors since GitHub's DOM changes frequently

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://github.com/*/*"],
}

function getRepoInfo(): { owner: string; repo: string } | null {
  const match = location.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/)
  if (!match) return null
  // Exclude github.com org pages, settings, etc.
  const skip = ["settings", "orgs", "sponsors", "marketplace"]
  if (skip.includes(match[1])) return null
  return { owner: match[1], repo: match[2] }
}

function createButton(repoInfo: { owner: string; repo: string }): HTMLButtonElement {
  const btn = document.createElement("button")
  btn.id = "rendergit-btn"
  btn.textContent = "Export for AI"
  btn.type = "button"
  btn.setAttribute(
    "style",
    [
      "display:inline-flex",
      "align-items:center",
      "padding:5px 12px",
      "font-size:14px",
      "font-weight:500",
      "line-height:20px",
      "color:#24292f",
      "background-color:#f6f8fa",
      "border:1px solid rgba(31,35,40,0.15)",
      "border-radius:6px",
      "cursor:pointer",
      "margin-left:8px",
      "white-space:nowrap",
      "flex-shrink:0",
    ].join(";")
  )
  btn.addEventListener("mouseenter", () => { btn.style.backgroundColor = "#e9ecef" })
  btn.addEventListener("mouseleave", () => { btn.style.backgroundColor = "#f6f8fa" })
  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "EXPORT_REPO", owner: repoInfo.owner, repo: repoInfo.repo })
    chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" })
  })
  return btn
}

function findAnchorAndInject(repoInfo: { owner: string; repo: string }): boolean {
  if (document.getElementById("rendergit-btn")) return true

  // Strategy 1: <get-repo> web component (GitHub's clone button area)
  const getRepo = document.querySelector("get-repo")
  if (getRepo?.parentElement) {
    getRepo.parentElement.insertBefore(createButton(repoInfo), getRepo.nextSibling)
    return true
  }

  // Strategy 2: buttonGroup containing a "Code" button
  const groups = document.querySelectorAll<HTMLElement>('[data-component="buttonGroup"]')
  for (const group of groups) {
    if (group.textContent?.includes("Code")) {
      group.parentElement?.insertBefore(createButton(repoInfo), group.nextSibling)
      return true
    }
  }

  // Strategy 3: Any <summary> or <button> with text "Code" in a toolbar area
  const allBtns = document.querySelectorAll<HTMLElement>("summary, button")
  for (const el of allBtns) {
    if (el.textContent?.trim() === "Code") {
      el.parentElement?.insertBefore(createButton(repoInfo), el.nextSibling)
      return true
    }
  }

  // Strategy 4: File navigation toolbar — inject into the action bar on the right
  const fileNav = document.querySelector<HTMLElement>(
    ".file-navigation, [data-testid='repos-file-tree-toolbar'], .Box-header .d-flex"
  )
  if (fileNav) {
    fileNav.appendChild(createButton(repoInfo))
    return true
  }

  return false
}

function tryInject() {
  const repoInfo = getRepoInfo()
  if (!repoInfo) return
  findAnchorAndInject(repoInfo)
}

// GitHub is a SPA — watch for DOM changes (Turbo navigation)
let debounce: ReturnType<typeof setTimeout> | null = null
const observer = new MutationObserver(() => {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(tryInject, 300)
})
observer.observe(document.body, { childList: true, subtree: true })

// Initial load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", tryInject)
} else {
  tryInject()
}
