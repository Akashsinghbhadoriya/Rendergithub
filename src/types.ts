export interface FileDecision {
  include: boolean
  reason: "ok" | "binary" | "too_large" | "ignored"
}

export interface FileInfo {
  path: string  // relative path from repo root
  size: number
  decision: FileDecision
  content?: string
}

export interface RepoStats {
  included: FileInfo[]
  skippedBinary: FileInfo[]
  skippedLarge: FileInfo[]
  total: number
}

export type ExportStatus =
  | { type: "idle" }
  | { type: "fetching_tree" }
  | { type: "fetching_files"; done: number; total: number }
  | { type: "done"; stats: RepoStats; cxml: string }
  | { type: "error"; message: string }

// Messages between content script / popup and background
export type Message =
  | { type: "EXPORT_REPO"; owner: string; repo: string }
  | { type: "STATUS_UPDATE"; status: ExportStatus }
  | { type: "GET_STATUS" }
