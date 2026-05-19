// Side panel — Human/LLM toggle, token count, progress, errors, Copy button
// Mirrors the dual-view UX from rendergit.py build_html()

import { useEffect, useRef, useState } from "react"
import { bytesHuman, estimateTokens } from "../lib/cxml-generator"
import type { ExportStatus } from "../types"
import "./style.css"

type Tab = "human" | "llm"

function FileSection({
  label,
  files,
  defaultOpen = false,
  dimmed = false,
}: {
  label: string
  files: Array<{ path: string; size: number }>
  defaultOpen?: boolean
  dimmed?: boolean
}) {
  if (files.length === 0) return null
  return (
    <details className="file-section" open={defaultOpen}>
      <summary className="file-section-summary">
        {label} <span className="file-section-count">({files.length})</span>
      </summary>
      <div className={`file-list ${dimmed ? "file-list--dimmed" : ""}`}>
        {files.map((f) => (
          <div key={f.path} className="file-row">
            <span className="file-path">{f.path}</span>
            <span className="file-size">{bytesHuman(f.size)}</span>
          </div>
        ))}
      </div>
    </details>
  )
}

export default function SidePanel() {
  const [status, setStatus] = useState<ExportStatus>({ type: "idle" })
  const [tab, setTab] = useState<Tab>("human")
  const [copied, setCopied] = useState(false)
  const portRef = useRef<chrome.runtime.Port | null>(null)

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "sidepanel" })
    portRef.current = port
    port.onMessage.addListener((msg) => {
      if (msg.type === "STATUS_UPDATE") {
        setStatus(msg.status)
      }
    })
    return () => port.disconnect()
  }, [])

  const tokenCount =
    status.type === "done" ? estimateTokens(status.cxml) : null

  function handleCopy() {
    if (status.type !== "done") return
    navigator.clipboard.writeText(status.cxml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="panel">
      {/* Header — always visible */}
      <div className="header">
        <span className="title">Rendergit</span>
        {tokenCount !== null && (
          <span className="token-count">~{tokenCount.toLocaleString()} tokens</span>
        )}
      </div>

      {/* Body */}
      {status.type === "idle" && (
        <div className="empty">
          Click <strong>Export for AI</strong> on a GitHub repo page.
        </div>
      )}

      {status.type === "fetching_tree" && (
        <div className="progress">Fetching repo info...</div>
      )}

      {status.type === "fetching_files" && (
        <div className="progress">
          Downloading &amp; parsing ZIP...
          <div className="progress-bar">
            <div className="progress-fill progress-fill--indeterminate" />
          </div>
        </div>
      )}

      {status.type === "error" && (
        <div className="error">{status.message}</div>
      )}

      {status.type === "done" && (
        <>
          {/* Tab bar */}
          <div className="tabs">
            <button
              className={`tab-btn ${tab === "human" ? "active" : ""}`}
              onClick={() => setTab("human")}
            >
              Human
            </button>
            <button
              className={`tab-btn ${tab === "llm" ? "active" : ""}`}
              onClick={() => setTab("llm")}
            >
              LLM
            </button>
          </div>

          {/* Human view — file list + skip stats (mirrors rendergit.py output) */}
          {tab === "human" && (
            <div className="human-view">
              <div className="stat-row">
                <span className="stat-label">Included</span>
                <span className="stat-value">{status.stats.included.length} files</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Skipped binary</span>
                <span className="stat-value">{status.stats.skippedBinary.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Skipped large (&gt;50KB)</span>
                <span className="stat-value">{status.stats.skippedLarge.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total scanned</span>
                <span className="stat-value">{status.stats.total}</span>
              </div>

              <FileSection label="Included" files={status.stats.included} defaultOpen />
              <FileSection label="Skipped — binary" files={status.stats.skippedBinary} dimmed />
              <FileSection label="Skipped — too large" files={status.stats.skippedLarge} dimmed />
            </div>
          )}

          {/* LLM view — CXML + Copy button */}
          {tab === "llm" && (
            <div className="llm-view">
              <button className="copy-btn" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy CXML"}
              </button>
              <textarea className="cxml-area" readOnly value={status.cxml} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
