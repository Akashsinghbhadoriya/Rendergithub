// Ported from rendergit.py — generate_cxml_text()
// Output format is identical to the Python version.

// Port of bytes_human() from rendergit.py
export function bytesHuman(n: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"]
  let f = n
  let i = 0
  while (f >= 1024 && i < units.length - 1) {
    f /= 1024
    i++
  }
  return i === 0 ? `${Math.round(f)} ${units[i]}` : `${f.toFixed(1)} ${units[i]}`
}

// Port of generate_cxml_text() from rendergit.py — identical output format
export function generateCXML(files: Array<{ path: string; content: string }>): string {
  const lines = ["<documents>"]
  files.forEach((file, index) => {
    lines.push(`<document index="${index + 1}">`)
    lines.push(`<source>${file.path}</source>`)
    lines.push("<document_content>")
    lines.push(file.content)
    lines.push("</document_content>")
    lines.push("</document>")
  })
  lines.push("</documents>")
  return lines.join("\n")
}

// Rough token estimation: chars / 4 (standard approximation)
export function estimateTokens(text: string): number {
  return Math.round(text.length / 4)
}
