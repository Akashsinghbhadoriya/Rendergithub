// Popup — Export button + GitHub token entry + rate limit nudge
// Token stored in chrome.storage.local (never synced)

import { useEffect, useState } from "react"

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(url)
    if (u.hostname !== "github.com") return null
    const match = u.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/)
    if (!match) return null
    return { owner: match[1], repo: match[2] }
  } catch {
    return null
  }
}

export default function Popup() {
  const [token, setToken] = useState("")
  const [saved, setSaved] = useState(false)
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    chrome.storage.local.get("token", ({ token: t }) => {
      if (t) setToken(t)
    })
    // Check if current tab is a GitHub repo root
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url
      if (url) setRepoInfo(parseGitHubRepo(url))
    })
  }, [])

  function handleExport() {
    if (!repoInfo) return
    setExporting(true)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (!tabId) return
      chrome.runtime.sendMessage({ type: "EXPORT_REPO", owner: repoInfo.owner, repo: repoInfo.repo })
      // @ts-ignore
      chrome.sidePanel.open({ tabId })
      window.close()
    })
  }

  function handleSave() {
    chrome.storage.local.set({ token: token.trim() }, () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function handleClear() {
    setToken("")
    chrome.storage.local.remove("token")
  }

  const hasToken = token.trim().length > 0

  return (
    <div style={{ width: 300, padding: 16, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Rendergit</h2>

      {/* Export button — shown when on a GitHub repo root */}
      {repoInfo ? (
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            width: "100%",
            padding: "8px 0",
            background: "#1a7f37",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 14,
            opacity: exporting ? 0.7 : 1,
          }}
        >
          {exporting ? "Opening..." : `Export ${repoInfo.owner}/${repoInfo.repo} for AI`}
        </button>
      ) : (
        <div style={{
          background: "#f6f8fa",
          border: "1px solid #d0d7de",
          borderRadius: 6,
          padding: "8px 10px",
          marginBottom: 14,
          fontSize: 12,
          color: "#57606a",
          lineHeight: 1.5,
        }}>
          Navigate to a GitHub repo page to export it.
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #d0d7de", margin: "0 0 12px" }} />

      {/* Rate limit nudge */}
      {!hasToken && (
        <div style={{
          background: "#ddf4ff",
          border: "1px solid #80ccff",
          borderRadius: 6,
          padding: "8px 10px",
          marginBottom: 10,
          fontSize: 12,
          lineHeight: 1.5,
          color: "#0550ae"
        }}>
          Works without a token (60 req/hr). Add a token for 5,000 req/hr.
        </div>
      )}

      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
        GitHub Token
      </label>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="ghp_..."
        style={{
          width: "100%",
          padding: "6px 8px",
          border: "1px solid #d0d7de",
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 8,
          boxSizing: "border-box"
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: "6px 0",
            background: "#0969da",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 13
          }}
        >
          {saved ? "Saved!" : "Save Token"}
        </button>
        {hasToken && (
          <button
            onClick={handleClear}
            style={{
              padding: "6px 12px",
              background: "#f6f8fa",
              color: "#cf222e",
              border: "1px solid #d0d7de",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Clear
          </button>
        )}
      </div>

      <p style={{ marginTop: 10, fontSize: 11, color: "#57606a", lineHeight: 1.4 }}>
        Token stored locally only — never leaves your browser.
      </p>
    </div>
  )
}
