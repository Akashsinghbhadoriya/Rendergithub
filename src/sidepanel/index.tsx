// Side panel — file selection screen → Human/LLM tabs
// Flow: ready_for_selection → user selects → generateCXML locally → tabs view

import { useEffect, useRef, useState } from "react"
import { bytesHuman, estimateTokens, generateCXML } from "../lib/cxml-generator"
import { applySmartPack, DEFAULT_TOKEN_BUDGET } from "../lib/smart-pack"
import type { ExportStatus, FileInfo, SelectableFile } from "../types"
import "./style.css"

// ─── Selection screen ────────────────────────────────────────────────────────

function SelectionScreen({
  files,
  skippedBinary,
  skippedLarge,
  onGenerate,
}: {
  files: SelectableFile[]
  skippedBinary: FileInfo[]
  skippedLarge: FileInfo[]
  onGenerate: (selected: Array<{ path: string; content: string }>) => void
}) {
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(files.map((f) => f.path))
  )
  const [packing, setPacking] = useState(false)

  const selectedFiles = files.filter((f) => checked.has(f.path))
  const totalTokens = selectedFiles.reduce(
    (sum, f) => sum + estimateTokens(f.content),
    0
  )
  const allChecked = checked.size === files.length
  const overBudget = totalTokens > DEFAULT_TOKEN_BUDGET

  function toggleAll() {
    setChecked(allChecked ? new Set() : new Set(files.map((f) => f.path)))
  }

  function toggle(path: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function handleSmartPack() {
    setPacking(true)
    try {
      const selected = await applySmartPack(files)
      setChecked(selected)
    } finally {
      setPacking(false)
    }
  }

  function handleGenerate() {
    onGenerate(
      files
        .filter((f) => checked.has(f.path))
        .map((f) => ({ path: f.path, content: f.content }))
    )
  }

  return (
    <div className="selection-screen">
      {/* Token budget bar */}
      <div className="token-bar">
        <div className="token-bar-label">
          <span className={overBudget ? "token-over" : ""}>
            ~{totalTokens.toLocaleString()} tokens
          </span>
          <span className="token-bar-budget">
            / {DEFAULT_TOKEN_BUDGET.toLocaleString()} budget
          </span>
        </div>
        <div className="token-bar-track">
          <div
            className={`token-bar-fill ${overBudget ? "token-bar-fill--over" : ""}`}
            style={{ width: `${Math.min((totalTokens / DEFAULT_TOKEN_BUDGET) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="selection-toolbar">
        <button className="btn-secondary" onClick={toggleAll}>
          {allChecked ? "Deselect all" : "Select all"}
        </button>
        <button
          className="btn-secondary btn-smart"
          onClick={handleSmartPack}
          disabled={packing}
        >
          {packing ? "Packing…" : "⚡ Smart Pack"}
        </button>
      </div>

      {/* File list */}
      <div className="selection-list">
        {files.map((f) => {
          const tokens = estimateTokens(f.content)
          const isPriority = f.priorityScore >= 60
          return (
            <label key={f.path} className="selection-row">
              <input
                type="checkbox"
                checked={checked.has(f.path)}
                onChange={() => toggle(f.path)}
              />
              <span className="selection-path">{f.path}</span>
              {isPriority && <span className="priority-badge" title="High priority">★</span>}
              <span className="selection-tokens">~{tokens.toLocaleString()}t</span>
            </label>
          )
        })}
      </div>

      {/* Skipped files (collapsed) */}
      {(skippedBinary.length > 0 || skippedLarge.length > 0) && (
        <details className="file-section">
          <summary className="file-section-summary">
            Skipped{" "}
            <span className="file-section-count">
              ({skippedBinary.length + skippedLarge.length})
            </span>
          </summary>
          <div className="file-list file-list--dimmed">
            {skippedBinary.map((f) => (
              <div key={f.path} className="file-row">
                <span className="file-path">{f.path}</span>
                <span className="file-size">binary</span>
              </div>
            ))}
            {skippedLarge.map((f) => (
              <div key={f.path} className="file-row">
                <span className="file-path">{f.path}</span>
                <span className="file-size">{bytesHuman(f.size)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Footer */}
      <div className="selection-footer">
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={checked.size === 0}
        >
          Generate CXML ({checked.size} files)
        </button>
      </div>
    </div>
  )
}

// ─── Generated view (Human / LLM tabs) ───────────────────────────────────────

type GeneratedState = {
  cxml: string
  selectedCount: number
  skippedBinary: FileInfo[]
  skippedLarge: FileInfo[]
}

function GeneratedView({
  generated,
  onBack,
}: {
  generated: GeneratedState
  onBack: () => void
}) {
  const [tab, setTab] = useState<"human" | "llm">("human")
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(generated.cxml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <>
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
        <button className="tab-btn tab-btn--back" onClick={onBack}>
          ← Edit
        </button>
      </div>

      {tab === "human" && (
        <div className="human-view">
          <div className="stat-row">
            <span className="stat-label">Included</span>
            <span className="stat-value">{generated.selectedCount} files</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Skipped binary</span>
            <span className="stat-value">{generated.skippedBinary.length}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Skipped large (&gt;50KB)</span>
            <span className="stat-value">{generated.skippedLarge.length}</span>
          </div>

          {generated.skippedBinary.length > 0 && (
            <details className="file-section">
              <summary className="file-section-summary">
                Skipped — binary{" "}
                <span className="file-section-count">({generated.skippedBinary.length})</span>
              </summary>
              <div className="file-list file-list--dimmed">
                {generated.skippedBinary.map((f) => (
                  <div key={f.path} className="file-row">
                    <span className="file-path">{f.path}</span>
                    <span className="file-size">{bytesHuman(f.size)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {generated.skippedLarge.length > 0 && (
            <details className="file-section">
              <summary className="file-section-summary">
                Skipped — too large{" "}
                <span className="file-section-count">({generated.skippedLarge.length})</span>
              </summary>
              <div className="file-list file-list--dimmed">
                {generated.skippedLarge.map((f) => (
                  <div key={f.path} className="file-row">
                    <span className="file-path">{f.path}</span>
                    <span className="file-size">{bytesHuman(f.size)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {tab === "llm" && (
        <div className="llm-view">
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy CXML"}
          </button>
          <textarea className="cxml-area" readOnly value={generated.cxml} />
        </div>
      )}
    </>
  )
}

// ─── Root panel ──────────────────────────────────────────────────────────────

export default function SidePanel() {
  const [status, setStatus] = useState<ExportStatus>({ type: "idle" })
  const [generated, setGenerated] = useState<GeneratedState | null>(null)
  const portRef = useRef<chrome.runtime.Port | null>(null)

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "sidepanel" })
    portRef.current = port
    port.onMessage.addListener((msg) => {
      if (msg.type === "STATUS_UPDATE") {
        setStatus(msg.status)
        // New export arriving — clear any previously generated CXML
        if (msg.status.type === "ready_for_selection") setGenerated(null)
      }
    })
    return () => port.disconnect()
  }, [])

  const tokenCount = generated ? estimateTokens(generated.cxml) : null

  function handleGenerate(
    selectedFiles: Array<{ path: string; content: string }>,
    skippedBinary: FileInfo[],
    skippedLarge: FileInfo[]
  ) {
    setGenerated({
      cxml: generateCXML(selectedFiles),
      selectedCount: selectedFiles.length,
      skippedBinary,
      skippedLarge,
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

      {status.type === "ready_for_selection" && !generated && (
        <SelectionScreen
          files={status.files}
          skippedBinary={status.skippedBinary}
          skippedLarge={status.skippedLarge}
          onGenerate={(selected) =>
            handleGenerate(selected, status.skippedBinary, status.skippedLarge)
          }
        />
      )}

      {generated && (
        <GeneratedView
          generated={generated}
          onBack={() => setGenerated(null)}
        />
      )}
    </div>
  )
}
