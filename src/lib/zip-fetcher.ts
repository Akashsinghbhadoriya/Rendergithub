// Fetches a GitHub repo as a ZIP and extracts text files in-memory.
// Replaces the per-file blob API approach — 2 API calls total regardless of repo size.
// Uses fflate for ZIP parsing (15KB gzipped, no WASM).

import { unzipSync } from "fflate"
import { decideFile } from "./file-filter"
import type { FileInfo, RepoStats } from "../types"

const BASE = "https://api.github.com"

function authHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github.v3+json" }
  if (token) h["Authorization"] = `Bearer ${token}`
  return h
}

export async function fetchRepoAsZip(
  owner: string,
  repo: string,
  token?: string,
  onProgress?: (msg: string) => void
): Promise<{ stats: RepoStats; files: Array<{ path: string; content: string }> }> {
  // 1 API call: get default branch
  onProgress?.("Fetching repo info...")
  const metaRes = await fetch(`${BASE}/repos/${owner}/${repo}`, {
    headers: authHeaders(token),
  })
  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub API error ${metaRes.status}`)
  }
  const meta = await metaRes.json()
  const branch: string = meta.default_branch

  // 1 API call: download ZIP (follows redirect to codeload.github.com automatically)
  onProgress?.("Downloading ZIP...")
  const zipRes = await fetch(
    `${BASE}/repos/${owner}/${repo}/zipball/${branch}`,
    { headers: authHeaders(token) }
  )
  if (!zipRes.ok) {
    const err = await zipRes.json().catch(() => ({}))
    throw new Error(err.message ?? `ZIP download failed ${zipRes.status}`)
  }

  onProgress?.("Parsing ZIP...")
  const arrayBuffer = await zipRes.arrayBuffer()
  const zipData = new Uint8Array(arrayBuffer)
  const unzipped = unzipSync(zipData)

  // Strip the top-level prefix (GitHub ZIPs always have one: owner-repo-sha/)
  // Detect prefix from first entry
  const firstKey = Object.keys(unzipped)[0] ?? ""
  const prefixEnd = firstKey.indexOf("/")
  const prefix = prefixEnd !== -1 ? firstKey.slice(0, prefixEnd + 1) : ""

  const included: FileInfo[] = []
  const skippedBinary: FileInfo[] = []
  const skippedLarge: FileInfo[] = []
  const resultFiles: Array<{ path: string; content: string }> = []

  for (const [zipPath, bytes] of Object.entries(unzipped)) {
    // Strip top-level prefix
    const rel = prefix ? zipPath.slice(prefix.length) : zipPath
    if (!rel) continue // top-level dir entry itself

    const decision = decideFile(rel, bytes.length)
    const info: FileInfo = { path: rel, size: bytes.length, decision }

    if (decision.reason === "binary") {
      skippedBinary.push(info)
    } else if (decision.reason === "too_large") {
      skippedLarge.push(info)
    } else if (decision.include) {
      included.push(info)
      // Decode as UTF-8 (same as rendergit.py read_text with errors="replace")
      const content = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
      resultFiles.push({ path: rel, content })
    }
  }

  const stats: RepoStats = {
    included,
    skippedBinary,
    skippedLarge,
    total: included.length + skippedBinary.length + skippedLarge.length,
  }

  return { stats, files: resultFiles }
}
