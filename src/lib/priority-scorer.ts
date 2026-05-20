// Heuristic priority scoring for LLM context relevance.
// Scores range 0–100. Higher = more useful to include first.
//
// Extension point: LLMScorer can replace or augment these heuristic scores.
// Future integrations (e.g. asking Claude to rank files) should implement
// this interface and pass it to applySmartPack() in smart-pack.ts.
export type LLMScorer = (
  files: Array<{ path: string; content: string }>
) => Promise<Record<string, number>>  // path → score (0–100)

const RULES: Array<{ test: (path: string, filename: string) => boolean; score: number }> = [
  { test: (_, f) => /^README(\.\w+)?$/i.test(f),               score: 90 },
  { test: (p)    => p === "package.json",                       score: 85 },
  { test: (_, f) => /^(tsconfig|jsconfig)(\..*)?\.json$/.test(f), score: 80 },
  { test: (_, f) => /^(vite|webpack|rollup|esbuild|babel|jest|vitest)\.config\.\w+$/.test(f), score: 75 },
  { test: (p)    => /^(Dockerfile|docker-compose\.ya?ml)$/.test(p), score: 65 },
  { test: (p)    => p === ".env.example",                       score: 60 },
  { test: (_, f) => f === "Makefile",                           score: 60 },
  { test: (p)    => /\.(md|mdx)$/.test(p) && p.split("/").length <= 2, score: 55 },
]

// Parse package.json to find entry points declared in main / module / exports
function parseEntryPoints(content: string): string[] {
  try {
    const pkg = JSON.parse(content)
    const entries: string[] = []
    for (const key of ["main", "module", "browser"] as const) {
      if (typeof pkg[key] === "string") entries.push(pkg[key].replace(/^\.\//, ""))
    }
    if (pkg.exports) {
      const crawl = (val: unknown) => {
        if (typeof val === "string") entries.push(val.replace(/^\.\//, ""))
        else if (typeof val === "object" && val !== null) Object.values(val).forEach(crawl)
      }
      crawl(pkg.exports)
    }
    return entries
  } catch {
    return []
  }
}

export function scoreFiles(
  files: Array<{ path: string; size: number; content: string }>
): Array<{ path: string; size: number; content: string; priorityScore: number }> {
  const pkgFile = files.find((f) => f.path === "package.json")
  const entryPoints = pkgFile ? parseEntryPoints(pkgFile.content) : []

  return files.map((file) => {
    const filename = file.path.split("/").pop() ?? file.path
    let score = 0

    for (const rule of RULES) {
      if (rule.test(file.path, filename)) {
        score = Math.max(score, rule.score)
      }
    }

    // Boost files named as entry points in package.json
    if (entryPoints.some((ep) => file.path === ep || file.path.endsWith(`/${ep}`))) {
      score = Math.max(score, 85)
    }

    // Depth fallback: shallower = more likely to be structural
    if (score === 0) {
      const depth = file.path.split("/").length - 1
      score = depth === 0 ? 30 : depth === 1 ? 20 : depth === 2 ? 10 : 5
    }

    return { ...file, priorityScore: score }
  })
}
