/** Copy A logic: option ids, the scenario pool and the inferred score. */

export const TRIGGERS = ["longday", "social", "stress", "dinner", "kids"] as const
export const TRIGGERS_UNSEEN = 3
export const SCENARIOS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const
export const SCENARIOS_SHOWN = 6
export const AREAS = ["sleep", "weight", "energy", "mood", "relationships", "work"] as const
export const AREAS_UNSEEN = 3
export const FEARS = ["judged", "fun", "social", "thatperson", "failing", "partner", "ritual"] as const
export const FEARS_SEEN = 4

export const DIMS = ["awareness", "freedom", "control", "confidence", "body", "drive"] as const
export type Dim = (typeof DIMS)[number]

export interface Answers {
  triggers: string[]
  scenarios: string[]
  areas: string[]
  fears: string[]
}

/**
 * Which 6 of the 8 scenario cards to show. The original picks them from the earlier trigger
 * answer, but which trigger gives which cards was never seen (inferred): ours rotates a fixed
 * pool, so the first two cards depend on the first trigger picked.
 */
export function scenarioPool(triggers: readonly string[]): string[] {
  const i = (TRIGGERS as readonly string[]).indexOf(triggers[0] ?? "")
  const start = i < 0 ? 0 : (i * 2) % SCENARIOS.length
  return Array.from({ length: SCENARIOS_SHOWN }, (_, k) => SCENARIOS[(start + k) % SCENARIOS.length])
}

const BASE = 60
const clamp = (n: number) => Math.min(95, Math.max(20, n))

/**
 * Our own formula (the original's was never shown, so this is inferred): every dimension starts
 * at 60; each answer nudges one or two of them. Whole numbers, kept between 20 and 95.
 */
export function dimensions(a: Answers): Record<Dim, number> {
  const d: Record<Dim, number> = { awareness: BASE, freedom: BASE, control: BASE, confidence: BASE, body: BASE, drive: BASE }
  for (const t of a.triggers) {
    d.control -= 4
    if (t === "stress" || t === "longday") d.freedom -= 3
    if (t === "social") d.confidence -= 2
  }
  d.awareness += 3 * a.scenarios.length
  for (const f of a.fears) {
    if (f === "judged" || f === "fun" || f === "social" || f === "thatperson") d.confidence -= 5
    if (f === "failing") d.drive -= 6
    if (f === "ritual" || f === "partner") d.freedom -= 4
  }
  for (const ar of a.areas) {
    d.drive += 3
    if (ar === "sleep" || ar === "weight" || ar === "energy") d.body += 6
  }
  const out = { ...d }
  for (const k of DIMS) out[k] = clamp(Math.round(d[k]))
  return out
}

export function totalScore(d: Record<Dim, number>): number {
  return Math.round(DIMS.reduce((s, k) => s + d[k], 0) / DIMS.length)
}

/** The strongest dimension (first one wins a tie). */
export function standout(d: Record<Dim, number>): Dim {
  return DIMS.reduce((best, k) => (d[k] > d[best] ? k : best), DIMS[0])
}

/** Point of axis `i` (0 = top, clockwise) for a value 0-100, around (cx, cy) with outer radius r. */
export function radarPoint(i: number, value: number, cx: number, cy: number, r: number): [number, number] {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / DIMS.length
  const rr = (r * value) / 100
  return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)]
}

/** Which of the five header steps a screen sits under (inferred assignment). */
export const HEADER_STEP: Record<string, number> = { triggers: 1, scenarios: 1, none: 1, explainer: 1, areas: 1, fears: 1, result: 2, teaser: 3, paywall: 4 }
