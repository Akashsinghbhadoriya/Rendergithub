import { describe, it, expect } from "vitest"
import { decideFile, looksBinary, BINARY_EXTENSIONS, MAX_DEFAULT_BYTES } from "../lib/file-filter"

describe("BINARY_EXTENSIONS", () => {
  it("contains common image types", () => {
    expect(BINARY_EXTENSIONS.has(".png")).toBe(true)
    expect(BINARY_EXTENSIONS.has(".jpg")).toBe(true)
    expect(BINARY_EXTENSIONS.has(".gif")).toBe(true)
  })

  it("contains archive types", () => {
    expect(BINARY_EXTENSIONS.has(".zip")).toBe(true)
    expect(BINARY_EXTENSIONS.has(".tar")).toBe(true)
    expect(BINARY_EXTENSIONS.has(".gz")).toBe(true)
  })

  it("contains font types", () => {
    expect(BINARY_EXTENSIONS.has(".ttf")).toBe(true)
    expect(BINARY_EXTENSIONS.has(".woff")).toBe(true)
    expect(BINARY_EXTENSIONS.has(".woff2")).toBe(true)
  })
})

describe("looksBinary", () => {
  it("returns true for known binary extensions", () => {
    expect(looksBinary("image.png")).toBe(true)
    expect(looksBinary("font.woff2")).toBe(true)
    expect(looksBinary("lib.so")).toBe(true)
    expect(looksBinary("app.exe")).toBe(true)
  })

  it("returns false for text files", () => {
    expect(looksBinary("main.ts")).toBe(false)
    expect(looksBinary("README.md")).toBe(false)
    expect(looksBinary("index.html")).toBe(false)
    expect(looksBinary("config.json")).toBe(false)
    expect(looksBinary("Makefile")).toBe(false)
  })

  it("is case-insensitive", () => {
    expect(looksBinary("image.PNG")).toBe(true)
    expect(looksBinary("video.MP4")).toBe(true)
  })

  it("returns false for files with no extension", () => {
    expect(looksBinary("Dockerfile")).toBe(false)
    expect(looksBinary("LICENSE")).toBe(false)
  })
})

describe("decideFile", () => {
  it("includes normal text files", () => {
    const d = decideFile("src/main.ts", 1000)
    expect(d.include).toBe(true)
    expect(d.reason).toBe("ok")
  })

  it("excludes .git paths", () => {
    expect(decideFile(".git/config", 100).reason).toBe("ignored")
    expect(decideFile(".git/HEAD", 100).reason).toBe("ignored")
    expect(decideFile("repo/.git/objects/abc", 100).reason).toBe("ignored")
  })

  it("excludes files over MAX_DEFAULT_BYTES", () => {
    const d = decideFile("big.ts", MAX_DEFAULT_BYTES + 1)
    expect(d.include).toBe(false)
    expect(d.reason).toBe("too_large")
  })

  it("includes files exactly at MAX_DEFAULT_BYTES", () => {
    const d = decideFile("ok.ts", MAX_DEFAULT_BYTES)
    expect(d.include).toBe(true)
  })

  it("excludes binary files", () => {
    const d = decideFile("assets/logo.png", 500)
    expect(d.include).toBe(false)
    expect(d.reason).toBe("binary")
  })

  it("size check takes priority over binary check", () => {
    // A binary file that's also too large — too_large wins (size checked first)
    const d = decideFile("huge.png", MAX_DEFAULT_BYTES + 1)
    expect(d.reason).toBe("too_large")
  })

  it(".git check takes priority over everything", () => {
    const d = decideFile(".git/huge.png", MAX_DEFAULT_BYTES + 1)
    expect(d.reason).toBe("ignored")
  })
})
