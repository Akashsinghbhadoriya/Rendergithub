// Background service worker
// Orchestrates: download ZIP → parse → filter → generate CXML
// Sends STATUS_UPDATE messages to the side panel

import { generateCXML } from "./lib/cxml-generator"
import { fetchRepoAsZip } from "./lib/zip-fetcher"
import type { Message, ExportStatus } from "./types"

let currentStatus: ExportStatus = { type: "idle" }
const sidebarPorts: chrome.runtime.Port[] = []

function broadcast(status: ExportStatus) {
  currentStatus = status
  sidebarPorts.forEach((p) => {
    try {
      p.postMessage({ type: "STATUS_UPDATE", status })
    } catch {
      // port disconnected — cleaned up on disconnect event
    }
  })
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    sidebarPorts.push(port)
    // Send current status immediately so panel restores state on open
    port.postMessage({ type: "STATUS_UPDATE", status: currentStatus })
    port.onDisconnect.addListener(() => {
      const idx = sidebarPorts.indexOf(port)
      if (idx !== -1) sidebarPorts.splice(idx, 1)
    })
  }
})

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  if (msg.type === "EXPORT_REPO") {
    runExport(msg.owner, msg.repo)
    sendResponse({ ok: true })
  }
  if (msg.type === "GET_STATUS") {
    sendResponse({ status: currentStatus })
  }
  if ((msg as { type: string }).type === "OPEN_SIDEPANEL") {
    const tabId = sender.tab?.id
    if (tabId) {
      // @ts-ignore — chrome.sidePanel is MV3 but types may lag
      chrome.sidePanel.open({ tabId })
    }
    sendResponse({ ok: true })
  }
  return true
})

async function runExport(owner: string, repo: string) {
  try {
    const { token } = await chrome.storage.local.get("token")

    broadcast({ type: "fetching_tree" })

    const { stats, files } = await fetchRepoAsZip(
      owner,
      repo,
      token,
      (msg) => {
        // Map progress messages to status updates for the side panel
        if (msg.startsWith("Downloading") || msg.startsWith("Parsing")) {
          broadcast({ type: "fetching_files", done: 0, total: 0 })
        }
      }
    )

    // Build CXML — same output format as rendergit.py generate_cxml_text()
    const cxml = generateCXML(files)

    broadcast({ type: "done", stats, cxml })
  } catch (err) {
    broadcast({ type: "error", message: (err as Error).message })
  }
}
