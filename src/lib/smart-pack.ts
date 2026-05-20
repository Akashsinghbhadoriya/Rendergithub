// Smart Pack: greedy token-budget file selector.
// Sorts files by priorityScore desc, picks until tokenBudget is hit.
//
// llmScorer is an optional extension point — pass a function that calls an LLM
// to re-rank files before selection runs. When null, pure heuristic scoring is used.

import { estimateTokens } from "./cxml-generator"
import type { SelectableFile } from "../types"
import type { LLMScorer } from "./priority-scorer"

export const DEFAULT_TOKEN_BUDGET = 100_000

export async function applySmartPack(
  files: SelectableFile[],
  tokenBudget = DEFAULT_TOKEN_BUDGET,
  llmScorer?: LLMScorer
): Promise<Set<string>> {
  let scored = files

  // Extension point: LLM scorer re-ranks files before greedy selection
  if (llmScorer) {
    const overrides = await llmScorer(files)
    scored = files.map((f) => ({
      ...f,
      priorityScore: overrides[f.path] ?? f.priorityScore,
    }))
  }

  const sorted = [...scored].sort((a, b) => b.priorityScore - a.priorityScore)
  const selected = new Set<string>()
  let usedTokens = 0

  for (const file of sorted) {
    const fileTokens = estimateTokens(file.content)
    if (usedTokens + fileTokens <= tokenBudget) {
      selected.add(file.path)
      usedTokens += fileTokens
    }
  }

  return selected
}
