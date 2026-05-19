import { describe, it, expect } from "vitest"
import { generateCXML, bytesHuman, estimateTokens } from "../lib/cxml-generator"

describe("generateCXML", () => {
  it("wraps output in <documents> tags", () => {
    const out = generateCXML([])
    expect(out).toBe("<documents>\n</documents>")
  })

  it("produces correct document structure for a single file", () => {
    const out = generateCXML([{ path: "src/main.ts", content: "const x = 1" }])
    expect(out).toContain('<document index="1">')
    expect(out).toContain("<source>src/main.ts</source>")
    expect(out).toContain("<document_content>")
    expect(out).toContain("const x = 1")
    expect(out).toContain("</document_content>")
    expect(out).toContain("</document>")
  })

  it("increments index for multiple files", () => {
    const out = generateCXML([
      { path: "a.ts", content: "a" },
      { path: "b.ts", content: "b" },
      { path: "c.ts", content: "c" },
    ])
    expect(out).toContain('<document index="1">')
    expect(out).toContain('<document index="2">')
    expect(out).toContain('<document index="3">')
  })

  it("output matches Python rendergit.py format exactly", () => {
    const out = generateCXML([{ path: "hello.py", content: "print('hello')" }])
    const expected = [
      "<documents>",
      '<document index="1">',
      "<source>hello.py</source>",
      "<document_content>",
      "print('hello')",
      "</document_content>",
      "</document>",
      "</documents>",
    ].join("\n")
    expect(out).toBe(expected)
  })

  it("handles files with multiline content", () => {
    const content = "line1\nline2\nline3"
    const out = generateCXML([{ path: "multi.ts", content }])
    expect(out).toContain("line1\nline2\nline3")
  })
})

describe("bytesHuman", () => {
  it("formats bytes", () => {
    expect(bytesHuman(500)).toBe("500 B")
  })

  it("formats KiB", () => {
    expect(bytesHuman(1024)).toBe("1.0 KiB")
    expect(bytesHuman(1536)).toBe("1.5 KiB")
  })

  it("formats MiB", () => {
    expect(bytesHuman(1024 * 1024)).toBe("1.0 MiB")
  })

  it("matches Python rendergit.py output for 50KB", () => {
    // MAX_DEFAULT_BYTES = 50 * 1024 = 51200
    expect(bytesHuman(51200)).toBe("50.0 KiB")
  })
})

describe("estimateTokens", () => {
  it("estimates tokens as chars/4", () => {
    expect(estimateTokens("abcd")).toBe(1)
    expect(estimateTokens("a".repeat(400))).toBe(100)
  })

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0)
  })
})
