/**
 * Free-text goal intake — pure matching logic (no model, no DB, no side effects).
 *
 * A user types what they want in their own words ("jeg vil gerne have det godt,
 * vågne op ved siden af en jeg kan lide, stoppe en afhængighed"). We embed that
 * locally (see GoalIntake's in-browser embedder — $0, no API) and cosine-match it
 * against the pillar/objective taxonomy to suggest the areas + goals it maps to.
 * The user always confirms/deselects — this is a ROUTER, not an oracle.
 */

import { PILLARS, OBJECTIVES } from "./data/newGoalFramework"

function pillarLabel(id: string): string {
  return PILLARS.find((p) => p.id === id)?.label ?? id
}

export type TaxonomyKind = "pillar" | "objective"

export interface TaxonomyItem {
  id: string
  kind: TaxonomyKind
  pillarId: string
  label: string
  /** The text we embed for this item (label + description + values). */
  text: string
}

export interface IntakeMatch {
  id: string
  label: string
  pillarId: string
  score: number
}

export interface IntakeMatches {
  pillars: IntakeMatch[]
  objectives: IntakeMatch[]
}

export interface IntakeSuggestion {
  pillarIds: string[]
  objectiveIds: string[]
}

/** Build the list of taxonomy items to embed (pillars + objectives). */
export function buildTaxonomyItems(): TaxonomyItem[] {
  const items: TaxonomyItem[] = []
  for (const p of PILLARS) {
    items.push({
      id: p.id,
      kind: "pillar",
      pillarId: p.id,
      label: p.label,
      text: `${p.label}. ${p.tagline}. ${p.values.join(", ")}.`,
    })
  }
  for (const o of OBJECTIVES) {
    items.push({
      id: o.id,
      kind: "objective",
      pillarId: o.pillarId,
      label: o.label,
      // soundsLike (hidden matcher vocabulary) carries the bulk of the signal — it's
      // the human/feeling phrasings people actually type, so it leads the embedded text.
      text: `${o.label}. ${o.soundsLike} ${o.description}. ${o.successPreview}. ${o.values.join(", ")}.`,
    })
  }
  return items
}

/** Cheap deterministic hash so cached embeddings invalidate when the taxonomy text changes. */
export function taxonomyVersion(items: TaxonomyItem[]): string {
  let h = 0
  const s = items.map((i) => i.id + "::" + i.text).join("|")
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return `mini1_${items.length}_${(h >>> 0).toString(36)}`
}

/** Cosine similarity. Vectors are L2-normalized at embed time, so this is just a dot product;
 * we still divide by norms defensively in case a caller passes unnormalized vectors. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/** Rank every taxonomy item against the query vector. `itemVecs[i]` must align with `items[i]`. */
export function matchTaxonomy(queryVec: number[], items: TaxonomyItem[], itemVecs: number[][]): IntakeMatches {
  const scored = items.map((it, i) => ({ it, score: cosine(queryVec, itemVecs[i] ?? []) }))
  const toMatch = (s: { it: TaxonomyItem; score: number }): IntakeMatch => ({ id: s.it.id, label: s.it.label, pillarId: s.it.pillarId, score: s.score })
  const byScore = (a: IntakeMatch, b: IntakeMatch) => b.score - a.score
  return {
    pillars: scored.filter((s) => s.it.kind === "pillar").map(toMatch).sort(byScore),
    objectives: scored.filter((s) => s.it.kind === "objective").map(toMatch).sort(byScore),
  }
}

/**
 * Re-score pillars by their *best matching objective*, not just their abstract
 * tagline. A pillar like "Vices — break what holds you back" barely matches
 * "quit watching porn", but its objective "Quit Porn" matches strongly — so the
 * pillar should inherit that. effectiveScore = max(own pillar score, best
 * objective-in-pillar score). This is what makes the routing actually correct.
 */
export function effectivePillarScores(matches: IntakeMatches): IntakeMatch[] {
  const bestObj = new Map<string, number>()
  for (const o of matches.objectives) {
    if (o.score > (bestObj.get(o.pillarId) ?? -Infinity)) bestObj.set(o.pillarId, o.score)
  }
  return matches.pillars
    .map((p) => ({ ...p, score: Math.max(p.score, bestObj.get(p.id) ?? -Infinity) }))
    .sort((a, b) => b.score - a.score)
}

export interface SuggestionOpts {
  /** Select pillars scoring at least this fraction of the top score (relative — robust to compressed cosine ranges). */
  topRatio?: number
  /** Hard floor so near-zero matches are never selected. */
  absoluteFloor?: number
  /** Always include at least this many top pillars (so the user is never stranded). */
  minPillars?: number
  maxPillars?: number
  /** Min cosine score for an objective to be suggested within a kept pillar. */
  objectiveThreshold?: number
  maxObjectives?: number
}

/**
 * Turn ranked matches into a concrete suggestion: which pillars + objectives to
 * pre-select. Pillars are scored by their best objective (see effectivePillarScores)
 * and kept by a RELATIVE bar (fraction of the top score) so it adapts to the
 * model's compressed cosine range. Objectives are only pulled in within kept
 * pillars, so we never drag in an area the user clearly didn't ask for.
 */
export function pickSuggestions(matches: IntakeMatches, opts: SuggestionOpts = {}): IntakeSuggestion {
  const { topRatio = 0.6, absoluteFloor = 0.15, minPillars = 1, maxPillars = 4, objectiveThreshold = 0.25, maxObjectives = 6 } = opts

  const eff = effectivePillarScores(matches)
  const top = eff[0]?.score ?? 0
  const bar = Math.max(absoluteFloor, topRatio * top)
  let pillars = eff.filter((p) => p.score >= bar)
  if (pillars.length < minPillars) pillars = eff.slice(0, minPillars)
  pillars = pillars.slice(0, maxPillars)
  const pillarIds = new Set(pillars.map((p) => p.id))

  const objectiveIds = matches.objectives
    .filter((o) => pillarIds.has(o.pillarId) && o.score >= objectiveThreshold)
    .slice(0, maxObjectives)
    .map((o) => o.id)

  return { pillarIds: [...pillarIds], objectiveIds }
}

// ---------------------------------------------------------------------------
// Clarifying-questions layer — when the match is ambiguous, ask instead of guess.
// Deterministic, $0: embeddings decide WHEN/WHICH to ask, the taxonomy supplies
// the options.
// ---------------------------------------------------------------------------

export interface Clarification {
  pillarId: string
  prompt: string
  /** Candidate objectives for the user to choose between (multi-select). */
  options: IntakeMatch[]
}

/** Two suggested areas that scored close enough to be worth disambiguating. */
export interface ClosePillars {
  a: string
  b: string
  prompt: string
}

export interface IntakeResolution {
  /** Areas to pre-select. */
  pillarIds: string[]
  /** Objectives auto-selected because they clearly dominate their area. */
  objectiveIds: string[]
  /** Ambiguous areas (tied / weak objectives) the user should disambiguate. */
  clarifications: Clarification[]
  /** Adjacent suggested areas with near-equal scores — "is this more X or Y?". */
  closePillars: ClosePillars[]
}

export interface ResolveOpts extends SuggestionOpts {
  /** A pillar's top objective only auto-selects if the runner-up is below topScore*tieRatio. */
  tieRatio?: number
  /** Below this, even the top objective is too weak to auto-pick → clarify. */
  objectiveFloor?: number
  /** How many options to offer in a clarification. */
  clarifyOptions?: number
  /** Two kept areas whose effective scores differ by <= this are flagged as "close". */
  closeMargin?: number
  /** Max close-pillar prompts to surface. */
  maxClosePairs?: number
}

/**
 * Resolve a match into pre-selections + clarifying questions. For each suggested
 * pillar: if one objective clearly dominates → auto-select it; if the top
 * objectives are tied (or all weak) → emit a "Which {pillar} goal?" question so
 * the user picks. Also surfaces close-pillar pairs (near-equal area scores, e.g.
 * "habit vs dating life") so the user can disambiguate up front. This turns a
 * vague input into a short guided multiple-choice funnel.
 */
export function resolveIntake(matches: IntakeMatches, opts: ResolveOpts = {}): IntakeResolution {
  const { tieRatio = 0.85, objectiveFloor = 0.2, clarifyOptions = 3, closeMargin = 0.06, maxClosePairs = 2 } = opts
  const { pillarIds } = pickSuggestions(matches, opts)

  const objectiveIds: string[] = []
  const clarifications: Clarification[] = []
  for (const pid of pillarIds) {
    const objs = matches.objectives.filter((o) => o.pillarId === pid).sort((a, b) => b.score - a.score)
    const top = objs[0]
    const second = objs[1]
    const ask = () => clarifications.push({ pillarId: pid, prompt: `Which ${pillarLabel(pid)} goal fits best?`, options: objs.slice(0, clarifyOptions) })

    if (!top || top.score < objectiveFloor) {
      if (objs.length > 0) ask()                       // nothing matched well → let them pick
    } else if (!second || second.score < top.score * tieRatio) {
      objectiveIds.push(top.id)                        // clear winner → auto-select
    } else {
      ask()                                            // tied → ask
    }
  }

  // Close-pillar disambiguation: adjacent kept areas (in effective-score order)
  // whose scores are near-equal are genuinely ambiguous — ask which fits better.
  const keptEff = effectivePillarScores(matches).filter((p) => pillarIds.includes(p.id))
  const closePillars: ClosePillars[] = []
  for (let i = 0; i + 1 < keptEff.length && closePillars.length < maxClosePairs; i++) {
    const a = keptEff[i]
    const b = keptEff[i + 1]
    if (a.score - b.score <= closeMargin) {
      closePillars.push({ a: a.id, b: b.id, prompt: `Is this more about ${pillarLabel(a.id)} or ${pillarLabel(b.id)}?` })
    }
  }

  return { pillarIds, objectiveIds, clarifications, closePillars }
}

// ---------------------------------------------------------------------------
// Span highlighting — colour the user's OWN words by the area each bit is about.
// Same embeddings, applied per clause instead of to the whole sentence, so
// "…better my body, my mind, my business and my dating life" lights up as
// Health / Meaning / Wealth / Relations. Language-agnostic like the rest: the
// splitter is punctuation-driven, and the scoring is cosine against the taxonomy.
// ---------------------------------------------------------------------------

/** A clause of the user's text, with offsets back into the original string. */
export interface TextSpan {
  text: string
  /** Inclusive start offset in the source string. */
  start: number
  /** Exclusive end offset. */
  end: number
}

/** Clause separators: punctuation, plus "and"-ish conjunctions in the languages the
 * multilingual model covers well. Kept OUT of the spans so they render uncoloured. */
const SPAN_SEPARATORS = /([,;.!?\n]+|\s+(?:and|&|og|und|et|y|e|och|en)\s+)/gi

/**
 * Split text into clause spans, dropping separators and surrounding whitespace.
 * Offsets index the ORIGINAL string, so a renderer can rebuild it exactly:
 * the gaps between spans are the separators.
 */
export function splitSpans(text: string): TextSpan[] {
  const spans: TextSpan[] = []
  let cursor = 0
  const push = (start: number, end: number) => {
    // Trim whitespace off both ends, keeping offsets honest.
    let s = start
    let e = end
    while (s < e && /\s/.test(text[s])) s++
    while (e > s && /\s/.test(text[e - 1])) e--
    if (e > s) spans.push({ text: text.slice(s, e), start: s, end: e })
  }
  for (const m of text.matchAll(SPAN_SEPARATORS)) {
    push(cursor, m.index)
    cursor = m.index + m[0].length
  }
  push(cursor, text.length)
  return spans
}

/**
 * Word-boundary TAILS of a span, longest → shortest, capped at `maxWords`.
 *
 * A clause carries its meaning at the END ("I want to wake up everyday feeling driven to
 * better my body" is about *my body*); the lead-in is filler. Scoring the tails lets us
 * highlight just the operative words instead of washing the whole clause in one colour.
 */
export function tailSpans(span: TextSpan, maxWords = 8): TextSpan[] {
  // Offsets of each word start within the span, in source coordinates.
  const starts: number[] = []
  for (let i = 0; i < span.text.length; i++) {
    const prevIsSpace = i === 0 || /\s/.test(span.text[i - 1])
    if (prevIsSpace && !/\s/.test(span.text[i])) starts.push(span.start + i)
  }
  return starts
    .slice(Math.max(0, starts.length - maxWords))
    .map((start) => ({ text: span.text.slice(start - span.start), start, end: span.end }))
}

/**
 * The tightest tail that's still (essentially) as on-topic as the best one: the SHORTEST
 * candidate scoring within `ratio` of the best score for `pillarId`. Candidates must be
 * ordered longest → shortest (as `tailSpans` returns them), with `matches[i]` scoring
 * `candidates[i]`. Falls back to the first candidate when nothing matches the pillar.
 */
export function tightenSpan(
  candidates: TextSpan[],
  matches: IntakeMatches[],
  pillarId: string,
  ratio = 0.97,
): TextSpan {
  const scores = matches.map((m) => {
    const top = effectivePillarScores(m).find((p) => p.id === pillarId)
    return top?.score ?? -Infinity
  })
  const best = Math.max(...scores)
  if (!Number.isFinite(best)) return candidates[0]
  // Candidates run longest → shortest, so the LAST qualifying one is the tightest.
  let pick = candidates[0]
  for (let i = 0; i < candidates.length; i++) {
    if (scores[i] >= best * ratio) pick = candidates[i]
  }
  return pick
}

export interface SpanPillarOpts {
  /** Below this cosine, a span isn't about any area — leave it uncoloured. */
  spanFloor?: number
  /** Only colour spans whose winner is one of these (the areas actually in the plan). */
  allowedPillarIds?: string[]
}

/**
 * Pick the area each span is about — or null when it's filler ("I want to…") or
 * matches an area that isn't in the plan. `spanMatches[i]` must be the taxonomy
 * match for `spans[i]` (same order).
 */
export function assignSpanPillars(spanMatches: IntakeMatches[], opts: SpanPillarOpts = {}): (string | null)[] {
  const { spanFloor = 0.3, allowedPillarIds } = opts
  const allowed = allowedPillarIds ? new Set(allowedPillarIds) : null
  return spanMatches.map((m) => {
    const top = effectivePillarScores(m)[0]
    if (!top || top.score < spanFloor) return null
    if (allowed && !allowed.has(top.id)) return null
    return top.id
  })
}
