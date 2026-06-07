import type { GroundednessRating, Source } from "./types"

/**
 * Composite groundedness rating (test bench).
 *
 * Measures whether the answer is actually backed by the retrieved sources —
 * by MEANING, not textual similarity (a synthesized answer can legitimately read
 * nothing like the raw transcript it's grounded in). Combines:
 *   1. AI support  — an LLM judge marks each claim supported/partial/unsupported.
 *   2. Material    — deterministic: how relevant the retrieved sources were.
 *   3. Specifics   — deterministic: numbers/quotes in the answer absent from all
 *                    sources (concrete fabrication flags).
 *
 * Label-only: this rates, it does not gate. Heuristic + AI, so imperfect — but
 * the breakdown (per-claim verdicts + flagged specifics) makes drift visible.
 */

const round2 = (x: number) => Math.round(x * 100) / 100

function splitClaims(answer: string): string[] {
  return answer
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/^[\s\-*•\d.]+/, "").trim())
    .filter((s) => s.length >= 12) // skip connective fragments
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/** Deterministic precondition: average source relevance, mapped [0.5,1]→[0,1]. */
export function materialStrength(sources: Source[]): number {
  if (sources.length === 0) return 0
  const avg = sources.reduce((a, s) => a + (s.relevanceScore || 0), 0) / sources.length
  return Math.max(0, Math.min(1, (avg - 0.5) * 2))
}

/** Deterministic red flags: checkable specifics in the answer not in any source. */
export function detectUnsupportedSpecifics(answer: string, sources: Source[]): string[] {
  const hay = " " + sources.map((s) => normalize(s.text)).join("  ") + " "
  const flags: string[] = []

  // Quoted phrases the answer presents as exact but that aren't in the sources.
  for (const m of answer.matchAll(/[“"]([^”"]{4,80})[”"]/g)) {
    const q = (m[1] || "").trim()
    const n = normalize(q)
    if (n.length >= 4 && !hay.includes(n)) flags.push(`quote not in sources: "${q.slice(0, 60)}"`)
  }

  // Numeric specifics with a unit/noun (e.g. "5 approaches", "3 seconds").
  for (const m of answer.matchAll(
    /\b(\d{1,3})\s*(seconds?|minutes?|hours?|approaches?|times?|sets?|girls?|days?|weeks?|months?|years?|%|percent|steps?)\b/gi
  )) {
    const phrase = m[0].trim()
    if (!hay.includes(normalize(phrase))) flags.push(`specific not in sources: "${phrase}"`)
  }

  return Array.from(new Set(flags)).slice(0, 6)
}

export function buildSupportJudgePrompt(claims: string[], sources: Source[]): string {
  const src = sources.map((s, i) => `[${i + 1}] ${s.text.slice(0, 1200)}`).join("\n\n")
  const cl = claims.map((c, i) => `${i + 1}. ${c}`).join("\n")
  return `You are a strict fact-checker for a coaching assistant.
You get SOURCE EXCERPTS (real coaching transcripts) and CLAIMS taken from an answer. For EACH claim decide whether the sources support it.

Judge by MEANING, not wording. A claim is "supported" if the sources state OR clearly demonstrate it — even if phrased very differently, summarized, or synthesized from a conversation (e.g. advice distilled from what a coach did/said). Use "partial" if only loosely or partly backed; "unsupported" if it relies on outside knowledge or isn't in the sources at all.

SOURCES:
${src}

CLAIMS:
${cl}

Reply with ONE line per claim and NOTHING else, EXACTLY in this format:
<n>: <supported|partial|unsupported> | sources: <comma-separated source numbers, or none>`
}

export function parseSupportJudge(
  text: string,
  count: number
): { verdict: "supported" | "partial" | "unsupported"; sources: number[] }[] {
  const out = Array.from({ length: count }, () => ({
    verdict: "partial" as "supported" | "partial" | "unsupported",
    sources: [] as number[],
  }))
  const re = /(\d+)\s*[:.)]\s*(supported|partial|unsupported)\b[^\n]*?sources?\s*:\s*([0-9,\s]*|none)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const idx = Number.parseInt(m[1], 10) - 1
    if (idx < 0 || idx >= count) continue
    const verdict = m[2].toLowerCase() as "supported" | "partial" | "unsupported"
    const raw = (m[3] || "").toLowerCase()
    const sources = raw.includes("none")
      ? []
      : Array.from(
          new Set(
            raw.split(/[,\s]+/).map((x) => Number.parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0)
          )
        )
    out[idx] = { verdict, sources }
  }
  return out
}

/**
 * Compute the composite rating. `judge` runs the LLM support check
 * (systemPrompt, userPrompt) → raw text; injected so this stays testable.
 */
export async function computeGroundedness(
  answer: string,
  sources: Source[],
  judge: (systemPrompt: string, userPrompt: string) => Promise<string>
): Promise<GroundednessRating> {
  const material = materialStrength(sources)
  const unsupportedSpecifics = detectUnsupportedSpecifics(answer, sources)
  const claimsText = splitClaims(answer).slice(0, 12)

  // Refusal / trivial answer → nothing to grade.
  if (claimsText.length === 0 || /don'?t have that in the training data/i.test(answer)) {
    return { score: 0, aiSupport: 0, materialStrength: round2(material), claims: [], unsupportedSpecifics }
  }

  let parsed
  try {
    const raw = await judge(
      buildSupportJudgePrompt(claimsText, sources),
      "Judge each claim now. Output only the lines."
    )
    parsed = parseSupportJudge(raw, claimsText.length)
  } catch {
    parsed = claimsText.map(() => ({ verdict: "partial" as const, sources: [] as number[] }))
  }

  const claims = claimsText.map((text, i) => ({
    text,
    verdict: parsed[i].verdict,
    sources: parsed[i].sources,
  }))

  const supportPoints = claims.reduce(
    (a, c) => a + (c.verdict === "supported" ? 1 : c.verdict === "partial" ? 0.5 : 0),
    0
  )
  const aiSupport = claims.length ? supportPoints / claims.length : 0
  const materialFactor = 0.6 + 0.4 * material
  const penalty = Math.min(0.3, unsupportedSpecifics.length * 0.1)
  const score = Math.max(0, Math.min(1, aiSupport * materialFactor - penalty))

  return {
    score: round2(score),
    aiSupport: round2(aiSupport),
    materialStrength: round2(material),
    claims,
    unsupportedSpecifics,
  }
}
