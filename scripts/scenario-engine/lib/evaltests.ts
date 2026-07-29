/**
 * scripts/scenario-engine/lib/evaltests.ts
 *
 * Pure prompt-building, item-construction, parsing and scoring for the three
 * engine validation tests. No IO, no LLM calls — engine.ts owns those.
 *
 * Test 1 — next-line ranking: real coach response vs a real response from a
 *   different situation vs 2 generated "nice guy" distractors.
 * Test 2 — coach-swap: judge rates how well a response fits a situation;
 *   original-context pairs should outscore cross-situation swaps.
 * Test 3 — outcome prediction: closed vs fizzled from the moment exchange.
 */

import type { Moment } from "./extract"
import { seededShuffle } from "./split"

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim()
}

/**
 * Judges often return the JSON object followed by prose. All our response
 * schemas are flat objects, so the first brace-balanced non-nested object in
 * the text is the payload.
 */
export function extractFirstJsonObject<T>(raw: string): T {
  const cleaned = stripFences(raw)
  const m = cleaned.match(/\{[^{}]*\}/)
  if (!m) throw new Error(`no JSON object in response: ${cleaned.slice(0, 120)}`)
  return JSON.parse(m[0]) as T
}

function momentSituation(m: Moment): string {
  return [...m.context, m.trigger].join("\n")
}

function momentResponse(m: Moment): string {
  return m.coachResponse.join(" ")
}

// ---------------------------------------------------------------------------
// Distill prompt
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<string, string> = {
  career: "how a skilled coach responds when a woman reveals (or is asked about) her job or studies during a street approach",
  coldread: "how a skilled coach makes a cold read — committing out loud to a specific guess about a woman's job, origin, or personality — and plays both the confirmed and denied outcome",
}

export function buildDistillPrompt(
  kind: "career" | "coldread",
  train: Moment[],
  transcripts: Record<string, string[]>
): string {
  // Distillation reads WHOLE conversations, never windows: a payoff line
  // ("So I was right!") without its earlier setup reads as a different move
  // and produces wrong principles.
  const examples = train
    .map((m, i) => {
      const full = transcripts[`${m.videoId}#${m.convId}`]
      const body = full
        ? `Full conversation:\n${full.join("\n")}\n\nThe key moment to analyze is: ${m.trigger}\n` +
          `Coach's handling: ${momentResponse(m)}`
        : `${momentSituation(m)}\nCoach responds: ${momentResponse(m)}\n` +
          (m.girlReaction.length ? `Her reaction: ${m.girlReaction.join(" ")}` : "")
      return `### Example ${i + 1} (coach: ${m.channel}, outcome: ${m.outcome})\n${body}`
    })
    .join("\n\n")
  return (
    `You are analyzing REAL transcripts of in-field dating coaches (daygame). ` +
    `The transcripts below are ground truth of ${KIND_LABEL[kind]}.\n\n` +
    `Important calibration: these coaches are deliberately playful, teasing, sometimes edgy or persistent. ` +
    `In this domain that IS skilled behavior when calibrated — do not grade it down for politeness norms. ` +
    `Blandly validating, interview-style, or approval-seeking responses are the FAILURE mode here.\n\n` +
    `${examples}\n\n` +
    `Task: distill the operating principles of this skill from these examples ONLY (no outside doctrine).\n` +
    `Before naming any move, re-read the FULL conversation of every example you cite: describe what the coach ` +
    `did across the whole interaction (setups often come many lines before their payoff). Never characterize a ` +
    `move from an isolated quote if the surrounding conversation shows it differently.\n` +
    `Write a markdown document with:\n` +
    `1. 4-7 named moves/patterns, each with: what it is, when to use it, 1-2 VERBATIM example excerpts from above (cite the coach).\n` +
    `2. A "boundaries" section: where the line is between calibrated edgy and genuinely bad (use the examples' evidence: her reactions).\n` +
    `3. A "failure modes" section: what unskilled responses look like in this exact situation.\n` +
    `Be concrete and quote real lines. Output only the markdown document.`
  )
}

// ---------------------------------------------------------------------------
// Test 1: next-line ranking
// ---------------------------------------------------------------------------

export type NextLineItem = {
  moment: Moment
  /** Real coach response taken from a different situation (same scenario kind) */
  foreignReal: { id: string; text: string }
}

export type NextLineResult = {
  momentId: string
  pickedReal: boolean
  /** candidate kinds in judge's ranked order, best first */
  ranking: string[]
  error?: string
}

export function makeNextLineItems(held: Moment[], pool: Moment[], seed: string): NextLineItem[] {
  const items: NextLineItem[] = []
  for (const m of held) {
    const candidates = pool.filter((p) => p.videoId !== m.videoId && p.coachResponse.length > 0)
    if (candidates.length === 0) continue
    const preferOtherChannel = candidates.filter((p) => p.channel !== m.channel)
    const from = preferOtherChannel.length > 0 ? preferOtherChannel : candidates
    const pick = seededShuffle(from, `${seed}:foreign:${m.id}`)[0]
    items.push({ moment: m, foreignReal: { id: pick.id, text: momentResponse(pick) } })
  }
  return items
}

type Candidate = { key: "real" | "foreign" | "distractor1" | "distractor2"; text: string }

export function orderedCandidates(item: NextLineItem, distractors: string[], seed: string): Candidate[] {
  const candidates: Candidate[] = [
    { key: "real", text: momentResponse(item.moment) },
    { key: "foreign", text: item.foreignReal.text },
    { key: "distractor1", text: distractors[0] },
    { key: "distractor2", text: distractors[1] },
  ]
  return seededShuffle(candidates, `${seed}:order:${item.moment.id}`)
}

const LETTERS = ["A", "B", "C", "D"]

export function buildNextLinePrompt(
  principles: string,
  item: NextLineItem,
  distractors: string[],
  seed: string
): string {
  const ordered = orderedCandidates(item, distractors, seed)
  const listing = ordered.map((c, i) => `${LETTERS[i]}. ${c.text}`).join("\n")
  return (
    `You judge in-field dating conversations using these principles distilled from real coach transcripts:\n\n` +
    `${principles}\n\n---\n\n` +
    `Situation (street approach in progress):\n${momentSituation(item.moment)}\n\n` +
    `Four possible next responses from the man:\n${listing}\n\n` +
    `Rank ALL FOUR from best to worst game IN THIS EXACT SITUATION. ` +
    `Judge by the principles above, not by politeness. ` +
    `Return JSON only: {"ranking": ["X","X","X","X"]} using the letters.`
  )
}

export function parseRankingResponse(
  item: NextLineItem,
  distractors: string[],
  raw: string,
  seed: string
): NextLineResult {
  const ordered = orderedCandidates(item, distractors, seed)
  const parsed = extractFirstJsonObject<{ ranking: string[] }>(raw)
  if (!Array.isArray(parsed.ranking) || parsed.ranking.length < 1) {
    throw new Error(`bad ranking response: ${raw.slice(0, 120)}`)
  }
  const ranking = parsed.ranking
    .map((letter) => ordered[LETTERS.indexOf(String(letter).trim().toUpperCase())]?.key)
    .filter(Boolean) as string[]
  return {
    momentId: item.moment.id,
    pickedReal: ranking[0] === "real",
    ranking,
  }
}

export function scoreNextLine(results: NextLineResult[]) {
  const scored = results.filter((r) => !r.error)
  const top1 = scored.filter((r) => r.pickedReal).length
  const top2 = scored.filter((r) => r.ranking.slice(0, 2).includes("real")).length
  // The politeness-calibration measure: a REAL coach line (this situation's or
  // another's) ranked above both generated nice-guy distractors.
  const realishTop1 = scored.filter((r) => r.ranking[0] === "real" || r.ranking[0] === "foreign").length
  const pct = (n: number) => (scored.length ? Math.round((n / scored.length) * 100) : 0)
  return {
    scored: scored.length,
    errors: results.length - scored.length,
    top1,
    top1Pct: pct(top1),
    top2Pct: pct(top2),
    realishTop1Pct: pct(realishTop1),
  }
}

// ---------------------------------------------------------------------------
// Test 2: coach-swap
// ---------------------------------------------------------------------------

export type SwapItem = {
  situation: Moment
  response: Moment
  isOriginal: boolean
}

export type SwapResult = {
  situationId: string
  responseId: string
  isOriginal: boolean
  fitScore: number | null
  reasoning: string
  error?: string
}

/** For each held moment: one original pair + one cross-coach swapped pair. */
export function makeSwapItems(held: Moment[], seed: string): SwapItem[] {
  const items: SwapItem[] = []
  for (const m of held) {
    items.push({ situation: m, response: m, isOriginal: true })
    const others = held.filter((o) => o.id !== m.id && o.channel !== m.channel && o.coachResponse.length > 0)
    const pool = others.length > 0 ? others : held.filter((o) => o.id !== m.id && o.coachResponse.length > 0)
    if (pool.length === 0) continue
    const pick = seededShuffle(pool, `${seed}:swap:${m.id}`)[0]
    items.push({ situation: m, response: pick, isOriginal: false })
  }
  return items
}

export function buildCoachSwapPrompt(principles: string, swap: SwapItem): string {
  return (
    `You judge in-field dating conversations using these principles distilled from real coach transcripts:\n\n` +
    `${principles}\n\n---\n\n` +
    `Situation (street approach in progress):\n${momentSituation(swap.situation)}\n\n` +
    `Candidate response from the man:\n"${momentResponse(swap.response)}"\n\n` +
    `How well does this exact response FIT this exact situation? Some good lines transfer across situations; ` +
    `others are context-bound (reference things not present here, wrong energy for her mood, wrong stage). ` +
    `Score 1-10 for fit-in-context (not general quality). ` +
    `Return JSON only: {"fit": N, "reasoning": "one sentence"}`
  )
}

export function parseSwapResponse(swap: SwapItem, raw: string): SwapResult {
  const parsed = extractFirstJsonObject<{ fit: number; reasoning?: string }>(raw)
  const fit = Number(parsed.fit)
  if (!Number.isFinite(fit) || fit < 1 || fit > 10) throw new Error(`bad fit score: ${raw.slice(0, 120)}`)
  return {
    situationId: swap.situation.id,
    responseId: swap.response.id,
    isOriginal: swap.isOriginal,
    fitScore: fit,
    reasoning: parsed.reasoning ?? "",
  }
}

export function summarizeSwaps(results: SwapResult[]) {
  const ok = results.filter((r) => !r.error && r.fitScore !== null)
  const originals = ok.filter((r) => r.isOriginal)
  const swapped = ok.filter((r) => !r.isOriginal)
  const mean = (xs: SwapResult[]) =>
    xs.length ? Math.round((xs.reduce((s, r) => s + (r.fitScore ?? 0), 0) / xs.length) * 10) / 10 : 0
  const meanOriginal = mean(originals)
  const meanSwapped = mean(swapped)
  return {
    nOriginal: originals.length,
    nSwapped: swapped.length,
    meanOriginal,
    meanSwapped,
    separation: Math.round((meanOriginal - meanSwapped) * 10) / 10,
    errors: results.length - ok.length,
  }
}

// ---------------------------------------------------------------------------
// Test 3: outcome prediction
// ---------------------------------------------------------------------------

export type OutcomeResult = {
  momentId: string
  actual: "closed" | "fizzled"
  predicted: "closed" | "fizzled" | null
  error?: string
}

export function buildOutcomePrompt(principles: string, m: Moment): string {
  return (
    `You judge in-field dating conversations using these principles distilled from real coach transcripts:\n\n` +
    `${principles}\n\n---\n\n` +
    `Mid-conversation exchange from a street approach:\n` +
    `${momentSituation(m)}\n` +
    `Coach responds: ${momentResponse(m)}\n` +
    (m.girlReaction.length ? `Her reaction: ${m.girlReaction.join(" ")}\n` : "") +
    `\nPredict how this approach ULTIMATELY ended: "closed" (number/instagram/date exchange) or "fizzled" (ended without a close). ` +
    `Return JSON only: {"outcome": "closed" | "fizzled"}`
  )
}

export function parseOutcomeResponse(m: Moment, raw: string): OutcomeResult {
  const parsed = extractFirstJsonObject<{ outcome: string }>(raw)
  const predicted = parsed.outcome === "closed" || parsed.outcome === "fizzled" ? parsed.outcome : null
  if (!predicted) throw new Error(`bad outcome response: ${raw.slice(0, 120)}`)
  return { momentId: m.id, actual: m.outcome as "closed" | "fizzled", predicted }
}

export function scoreOutcomes(results: OutcomeResult[]) {
  const ok = results.filter((r) => !r.error && r.predicted)
  const correct = ok.filter((r) => r.predicted === r.actual).length
  const closed = ok.filter((r) => r.actual === "closed").length
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)
  return {
    scored: ok.length,
    errors: results.length - ok.length,
    correct,
    accuracyPct: pct(correct, ok.length),
    baseRatePct: pct(closed, ok.length),
  }
}
