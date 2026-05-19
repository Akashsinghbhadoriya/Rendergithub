// Ported from rendergit.py — decide_file(), BINARY_EXTENSIONS, looks_binary()
// Binary detection: extension-only (null-byte heuristic not viable in browser)

import type { FileDecision } from "../types"

// Direct port of BINARY_EXTENSIONS from rendergit.py
export const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico",
  ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
  ".mp3", ".mp4", ".mov", ".avi", ".mkv", ".wav", ".ogg", ".flac",
  ".ttf", ".otf", ".eot", ".woff", ".woff2",
  ".so", ".dll", ".dylib", ".class", ".jar", ".exe", ".bin",
])

// Direct port of MAX_DEFAULT_BYTES from rendergit.py
export const MAX_DEFAULT_BYTES = 50 * 1024

// Port of looks_binary() — extension-only in browser context (no disk access)
export function looksBinary(path: string): boolean {
  const dot = path.lastIndexOf(".")
  if (dot === -1) return false
  const ext = path.slice(dot).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

// Port of decide_file() from rendergit.py
export function decideFile(path: string, size: number): FileDecision {
  if (path.includes("/.git/") || path.startsWith(".git/")) {
    return { include: false, reason: "ignored" }
  }
  if (size > MAX_DEFAULT_BYTES) {
    return { include: false, reason: "too_large" }
  }
  if (looksBinary(path)) {
    return { include: false, reason: "binary" }
  }
  return { include: true, reason: "ok" }
}
