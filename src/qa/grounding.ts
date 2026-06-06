import type { AnswerGroundingSpan, Source } from "./types"

/**
 * Deterministic answer→source grounding (test bench transparency).
 *
 * Splits the answer into sentences and, for each, measures lexical overlap
 * against every retrieved source chunk to show which source most supports it
 * and how strongly. This is computed by us — NOT the model's self-report — so it
 * also surfaces drift: a sentence with weak overlap everywhere is likely not
 * grounded in the data.
 *
 * It's a heuristic (token overlap, paraphrase-tolerant but not perfect), meant
 * for inspection, not a precision metric.
 */

const STOPWORDS = new Set(
  "a an and are as at be but by do does for from get got go how i if in into is it its like me my not of on or our out so that the their then there they this to up us very was we what when which who will with would you your".split(
    " "
  )
)

function stem(t: string): string {
  if (t.length <= 4) return t
  if (t.endsWith("ies")) return t.slice(0, -3) + "y"
  if (t.endsWith("ing") && t.length > 6) return t.slice(0, -3)
  if (t.endsWith("ed") && t.length > 5) return t.slice(0, -2)
  if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1)
  return t
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((s) => stem(s.trim()))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
}

function splitSentences(answer: string): string[] {
  return answer
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/^[\s\-*•\d.]+/, "").trim())
    .filter((s) => s.length > 0)
}

export function analyzeAnswerGrounding(
  answer: string,
  sources: Source[]
): AnswerGroundingSpan[] {
  const sourceTokenSets = sources.map((s) => new Set(tokenize(s.text)))

  return splitSentences(answer).map((text) => {
    const sentenceTokens = Array.from(new Set(tokenize(text)))

    // Too few content words to attribute meaningfully (e.g. connective filler).
    if (sentenceTokens.length < 2) {
      return { text, bestSource: null, score: 0, support: "filler", perSource: [] }
    }

    const perSource = sourceTokenSets
      .map((set, i) => {
        const hits = sentenceTokens.filter((t) => set.has(t)).length
        return { source: i + 1, score: Math.round((hits / sentenceTokens.length) * 100) / 100 }
      })
      .sort((a, b) => b.score - a.score)

    const top = perSource[0]
    const score = top?.score ?? 0
    const bestSource = score > 0 ? top.source : null
    const support: AnswerGroundingSpan["support"] =
      score >= 0.4 ? "strong" : score >= 0.2 ? "partial" : "weak"

    return { text, bestSource, score, support, perSource: perSource.slice(0, 3) }
  })
}
