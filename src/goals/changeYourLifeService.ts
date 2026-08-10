/**
 * The "change your life" prototype flow, and the aggregations behind the
 * research view.
 *
 * Everything here is pure. The component holds one `CylPlan`, calls these to
 * produce the next one, and writes the result to localStorage. No LLM, no API,
 * no database — this is a lab prototype for docs/research/change-your-life/.
 *
 * The part that makes this different from a set of prompts is the small number
 * of places where it refuses:
 *
 *  - `scoreDifferential` can route a user *out* of the flow rather than into a
 *    protocol, and that route wins over every other signal.
 *  - `checkFit` rejects a plan that spends hours the user said they do not
 *    have, instead of letting them discover that in week two.
 *  - `describeMultiplier` declines to print a performance number when the
 *    corpus could not produce an honest one.
 *
 * Those refusals are the product. See 00-synthesis.md for why each exists.
 */

import {
  CYL_CANDIDATE_PROMPTS,
  CYL_CONSTRAINTS,
  CYL_DIFFERENTIAL,
  CYL_LAYERS,
  CYL_STAGES,
  type CylLayerDef,
  type CylLayerId,
} from "@/src/goals/data/changeYourLife"
import { CYL_CORPUS, type CylCategory, type CylTier, type CylVideo } from "@/src/goals/data/changeYourLifeCorpus"

export const CYL_SCHEMA_VERSION = 1

/** Answers below this many hours a week cannot support a daily-rep plan. */
export const CYL_MIN_WEEKLY_HOURS = 1

/** The differential's crisis option scores this on its own, so nothing outranks it. */
export const CYL_CRISIS_THRESHOLD = 10

// ------------------------------------------------------------------- types

export interface CylRep {
  action: string
  counts: string
  anchor: string
  minutesPerDay: number
  daysPerWeek: number
}

export interface CylCommitment {
  startDate: string
  endDate: string
  visibility: "private" | "partner" | "public"
  partnerName: string
}

export interface CylRelapse {
  letter: string
  trigger: string
  instead: string
}

export interface CylDeferred {
  text: string
  until: string
}

export interface CylPlan {
  v: number
  /** questionId → index into that question's options. */
  differential: Record<string, number>
  /** fieldId → answer. Numbers for hours/money, labels for the choices. */
  constraints: Record<string, string>
  /** promptId → what they wrote. */
  candidates: Record<string, string>
  /** Candidate lines promoted to the shortlist, in the user's own ranking. */
  shortlist: string[]
  chosen: string
  deferred: CylDeferred[]
  rep: CylRep
  ladder: string[]
  ladderAt: number
  relapse: CylRelapse
  commitment: CylCommitment
  horizon: string
  updatedAt: string
}

export interface CylLayerScore {
  layer: CylLayerDef
  score: number
}

/**
 * "soft" is a real state, not a rounding error: someone who has stopped doing
 * things they used to enjoy is below the line this flow is written for, without
 * having disclosed anything that should halt it. Collecting that signal and then
 * ignoring it would be the same mistake the corpus makes everywhere else.
 */
export type CylCrisisSignal = "none" | "soft" | "stop"

export interface CylDifferentialResult {
  ranked: CylLayerScore[]
  primary: CylLayerDef | null
  /** True when the flow must stop rather than prescribe. */
  stops: boolean
  crisis: CylCrisisSignal
  answered: number
  total: number
}

export interface CylFitVerdict {
  ok: boolean
  /** Hours a week the rep as written would cost. */
  needed: number
  /** Hours a week the user said they have. */
  available: number
  message: string
}

// ------------------------------------------------------------------ helpers

function nowIso(): string {
  return new Date().toISOString()
}

function bump(plan: CylPlan, patch: Partial<CylPlan>, now = nowIso()): CylPlan {
  return { ...plan, ...patch, updatedAt: now }
}

export function emptyRep(): CylRep {
  return { action: "", counts: "", anchor: "", minutesPerDay: 10, daysPerWeek: 5 }
}

export function emptyPlan(now = nowIso()): CylPlan {
  return {
    v: CYL_SCHEMA_VERSION,
    differential: {},
    constraints: {},
    candidates: {},
    shortlist: [],
    chosen: "",
    deferred: [],
    rep: emptyRep(),
    ladder: ["", "", ""],
    ladderAt: 0,
    relapse: { letter: "", trigger: "", instead: "" },
    commitment: { startDate: "", endDate: "", visibility: "private", partnerName: "" },
    horizon: "",
    updatedAt: now,
  }
}

// ------------------------------------------------------------------ storage

export function serializePlan(plan: CylPlan): string {
  return JSON.stringify(plan)
}

/**
 * Load, or null when there is nothing usable. Fails closed rather than
 * repairing: a half-understood plan silently "fixed" is worse than a fresh
 * one, because the user cannot see what was dropped.
 */
export function loadPlan(raw: string | null): CylPlan | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const p = parsed as Partial<CylPlan>
  if (p.v !== CYL_SCHEMA_VERSION) return null

  const base = emptyPlan(typeof p.updatedAt === "string" ? p.updatedAt : nowIso())
  return {
    ...base,
    ...p,
    // Nested objects need explicit merges, or a plan written by an older build
    // loses whichever sub-fields it did not know about.
    differential: { ...(p.differential ?? {}) },
    constraints: { ...(p.constraints ?? {}) },
    candidates: { ...(p.candidates ?? {}) },
    rep: { ...base.rep, ...(p.rep ?? {}) },
    relapse: { ...base.relapse, ...(p.relapse ?? {}) },
    commitment: { ...base.commitment, ...(p.commitment ?? {}) },
    shortlist: Array.isArray(p.shortlist) ? p.shortlist : [],
    deferred: Array.isArray(p.deferred) ? p.deferred : [],
    ladder: Array.isArray(p.ladder) && p.ladder.length > 0 ? p.ladder : base.ladder,
    v: CYL_SCHEMA_VERSION,
  }
}

// ------------------------------------------------------- stage 0: differential

export function answerDifferential(plan: CylPlan, questionId: string, optionIndex: number, now = nowIso()): CylPlan {
  return bump(plan, { differential: { ...plan.differential, [questionId]: optionIndex } }, now)
}

/**
 * Route to a primary constraint.
 *
 * Ties break by the order layers are declared, so the same answers always give
 * the same verdict — a differential that wobbled between runs would be worse
 * than none.
 *
 * The crisis layer is not ranked against the others. Its single option scores
 * above every reachable total on purpose: a user who says they are having
 * thoughts of hurting themselves is not also "a regulation problem", and the
 * flow must not average that away.
 */
export function scoreDifferential(plan: CylPlan): CylDifferentialResult {
  const totals = new Map<CylLayerId, number>()
  for (const layer of CYL_LAYERS) totals.set(layer.id, 0)

  let answered = 0
  for (const q of CYL_DIFFERENTIAL) {
    const idx = plan.differential[q.id]
    if (typeof idx !== "number") continue
    const option = q.options[idx]
    if (!option) continue
    answered += 1
    for (const [layerId, weight] of Object.entries(option.weights)) {
      const id = layerId as CylLayerId
      totals.set(id, (totals.get(id) ?? 0) + (weight ?? 0))
    }
  }

  const ranked: CylLayerScore[] = CYL_LAYERS.map((layer) => ({ layer, score: totals.get(layer.id) ?? 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return CYL_LAYERS.indexOf(a.layer) - CYL_LAYERS.indexOf(b.layer)
    })

  const crisisScore = totals.get("crisis") ?? 0
  if (crisisScore >= CYL_CRISIS_THRESHOLD) {
    const layer = CYL_LAYERS.find((l) => l.id === "crisis") ?? null
    return {
      ranked,
      primary: layer,
      stops: true,
      crisis: "stop",
      answered,
      total: CYL_DIFFERENTIAL.length,
    }
  }

  // Crisis is reachable *only* through the threshold branch above. Picking the
  // primary from the unfiltered ranking would let a sub-threshold crisis score
  // win on points and render the stop copy under a normal heading — which is
  // both wrong and alarming.
  const prescribable = ranked.filter((r) => r.layer.id !== "crisis")
  const top = prescribable[0]
  const primary = top && top.score > 0 ? top.layer : null
  return {
    ranked: prescribable,
    primary,
    // Circumstances routes to a constraints conversation, not a protocol.
    stops: primary?.id === "material",
    crisis: crisisScore > 0 ? "soft" : "none",
    answered,
    total: CYL_DIFFERENTIAL.length,
  }
}

/**
 * The one option in the whole differential that halts the flow.
 *
 * Exported so a test can assert there is exactly one, rather than trusting that
 * nobody later adds a second route to a stop by giving some other answer a
 * large crisis weight.
 */
export function stoppingOptions(): { questionId: string; label: string }[] {
  const found: { questionId: string; label: string }[] = []
  for (const q of CYL_DIFFERENTIAL) {
    for (const option of q.options) {
      if ((option.weights.crisis ?? 0) >= CYL_CRISIS_THRESHOLD) {
        found.push({ questionId: q.id, label: option.label })
      }
    }
  }
  return found
}

/**
 * The highest total each layer could reach if every question broke its way.
 * One option per question, so the ceiling takes the best option per question
 * rather than summing options that cannot both be chosen.
 */
export function layerCeilings(): Map<CylLayerId, number> {
  const ceilings = new Map<CylLayerId, number>()
  for (const layer of CYL_LAYERS) ceilings.set(layer.id, 0)
  for (const q of CYL_DIFFERENTIAL) {
    for (const layer of CYL_LAYERS) {
      const best = Math.max(0, ...q.options.map((o) => o.weights[layer.id] ?? 0))
      ceilings.set(layer.id, (ceilings.get(layer.id) ?? 0) + best)
    }
  }
  return ceilings
}

export function differentialComplete(plan: CylPlan): boolean {
  return CYL_DIFFERENTIAL.every((q) => typeof plan.differential[q.id] === "number")
}

// ------------------------------------------------------- stage 1: constraints

export function setConstraint(plan: CylPlan, fieldId: string, value: string, now = nowIso()): CylPlan {
  return bump(plan, { constraints: { ...plan.constraints, [fieldId]: value } }, now)
}

export function constraintsComplete(plan: CylPlan): boolean {
  return CYL_CONSTRAINTS.every((f) => (plan.constraints[f.id] ?? "").trim().length > 0)
}

export function weeklyHours(plan: CylPlan): number {
  const raw = Number.parseFloat(plan.constraints.hours ?? "")
  return Number.isFinite(raw) && raw >= 0 ? raw : 0
}

// ------------------------------------------------------- stage 2: candidates

export function setCandidate(plan: CylPlan, promptId: string, value: string, now = nowIso()): CylPlan {
  return bump(plan, { candidates: { ...plan.candidates, [promptId]: value } }, now)
}

/** Non-empty candidate answers, in prompt order, ready to be ranked. */
export function candidateLines(plan: CylPlan): string[] {
  return CYL_CANDIDATE_PROMPTS.map((p) => (plan.candidates[p.id] ?? "").trim()).filter((v) => v.length > 0)
}

// -------------------------------------------------------- stage 3: selection

export function chooseOne(plan: CylPlan, text: string, now = nowIso()): CylPlan {
  // Everything else on the shortlist becomes an explicit deferral rather than a
  // silent drop. A cut with no return date is what makes people keep all six.
  const deferred = plan.shortlist
    .filter((s) => s !== text)
    .map((s) => plan.deferred.find((d) => d.text === s) ?? { text: s, until: "" })
  return bump(plan, { chosen: text, deferred }, now)
}

export function setDeferralDate(plan: CylPlan, text: string, until: string, now = nowIso()): CylPlan {
  return bump(
    plan,
    { deferred: plan.deferred.map((d) => (d.text === text ? { ...d, until } : d)) },
    now,
  )
}

export function toggleShortlist(plan: CylPlan, text: string, now = nowIso()): CylPlan {
  const has = plan.shortlist.includes(text)
  const shortlist = has ? plan.shortlist.filter((s) => s !== text) : [...plan.shortlist, text]
  const chosen = has && plan.chosen === text ? "" : plan.chosen
  return bump(plan, { shortlist, chosen }, now)
}

// -------------------------------------------------------------- stage 4: rep

export function setRep(plan: CylPlan, patch: Partial<CylRep>, now = nowIso()): CylPlan {
  return bump(plan, { rep: { ...plan.rep, ...patch } }, now)
}

/**
 * The fit test. If the rep does not fit the week the user described, the rep is
 * cut — not their self-esteem.
 *
 * Every framework in the corpus starts one step past where the user is standing;
 * this is the one place the constraints ledger earns its keep.
 */
export function checkFit(plan: CylPlan): CylFitVerdict {
  const needed = (plan.rep.minutesPerDay * plan.rep.daysPerWeek) / 60
  const available = weeklyHours(plan)
  const rounded = Math.round(needed * 10) / 10

  if (available <= 0) {
    return {
      ok: false,
      needed: rounded,
      available,
      message: "You haven’t said how many hours a week are yours yet. That number decides whether this plan is real.",
    }
  }
  if (needed > available) {
    return {
      ok: false,
      needed: rounded,
      available,
      message: `This costs ${rounded} hours a week and you said you have ${available}. Make the rep smaller or fewer days — don’t plan to find the time.`,
    }
  }
  if (available < CYL_MIN_WEEKLY_HOURS) {
    return {
      ok: false,
      needed: rounded,
      available,
      message: "Under an hour a week is not a daily-habit problem. Sort the week first; the rep can wait.",
    }
  }
  return {
    ok: true,
    needed: rounded,
    available,
    message: `${rounded} hours a week, inside the ${available} you have. It fits.`,
  }
}

export function repComplete(plan: CylPlan): boolean {
  return plan.rep.action.trim().length > 0 && plan.rep.counts.trim().length > 0
}

// ----------------------------------------------------------- stage 5: ladder

export function setRung(plan: CylPlan, index: number, text: string, now = nowIso()): CylPlan {
  const ladder = [...plan.ladder]
  while (ladder.length <= index) ladder.push("")
  ladder[index] = text
  return bump(plan, { ladder }, now)
}

export function addRung(plan: CylPlan, now = nowIso()): CylPlan {
  return bump(plan, { ladder: [...plan.ladder, ""] }, now)
}

export function filledRungs(plan: CylPlan): string[] {
  return plan.ladder.map((r) => r.trim()).filter((r) => r.length > 0)
}

// ---------------------------------------------------------- stage 6: relapse

export function setRelapse(plan: CylPlan, patch: Partial<CylRelapse>, now = nowIso()): CylPlan {
  return bump(plan, { relapse: { ...plan.relapse, ...patch } }, now)
}

export function relapseComplete(plan: CylPlan): boolean {
  return plan.relapse.letter.trim().length > 0
}

// ------------------------------------------------------- stage 7: commitment

export function setCommitment(plan: CylPlan, patch: Partial<CylCommitment>, now = nowIso()): CylPlan {
  return bump(plan, { commitment: { ...plan.commitment, ...patch } }, now)
}

/** Ninety days out, because past that nobody can see the shape of their year. */
export function defaultEndDate(startIso: string): string {
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return ""
  start.setDate(start.getDate() + 90)
  return start.toISOString().slice(0, 10)
}

/**
 * The disclosure setting is genuinely contested in the corpus, so it is the
 * user's call — with one floor. A user routed here by the crisis answer is
 * never allowed to pick isolation, because low social support and an aversion
 * to self-disclosure are exactly what makes that state dangerous.
 */
export function visibilityAllowed(plan: CylPlan, choice: CylCommitment["visibility"]): boolean {
  const result = scoreDifferential(plan)
  if (result.primary?.id === "crisis" && choice === "private") return false
  return true
}

// -------------------------------------------------------------- progress

export function stageComplete(plan: CylPlan, key: string): boolean {
  switch (key) {
    case "differential":
      return differentialComplete(plan)
    case "constraints":
      return constraintsComplete(plan)
    case "candidates":
      return candidateLines(plan).length > 0
    case "selection":
      return plan.chosen.trim().length > 0
    case "rep":
      return repComplete(plan)
    case "ladder":
      return filledRungs(plan).length >= 2
    case "relapse":
      return relapseComplete(plan)
    case "commitment":
      return plan.commitment.startDate.length > 0 && plan.commitment.endDate.length > 0
    case "readback":
      return plan.horizon.trim().length > 0
    default:
      return false
  }
}

export function completedStages(plan: CylPlan): number {
  return CYL_STAGES.filter((s) => stageComplete(plan, s.key)).length
}

// ------------------------------------------------------- corpus aggregations

export type CylSortKey = "views" | "likeRate" | "multiplier" | "viewsPerSub" | "subs" | "commentRate"

/**
 * Sort, keeping videos with no honest multiplier at the bottom rather than
 * treating a missing baseline as a zero.
 */
export function sortCorpus(rows: readonly CylVideo[], key: CylSortKey): CylVideo[] {
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    return bv - av
  })
}

export function filterCorpus(rows: readonly CylVideo[], cat: CylCategory | "ALL", query: string): CylVideo[] {
  const q = query.trim().toLowerCase()
  return rows.filter((r) => {
    if (cat !== "ALL" && r.cat !== cat) return false
    if (!q) return true
    return r.title.toLowerCase().includes(q) || r.channel.toLowerCase().includes(q)
  })
}

export function tierCounts(rows: readonly CylVideo[] = CYL_CORPUS): Record<CylTier, number> {
  const counts = {
    breakout: 0,
    strong: 0,
    "above baseline": 0,
    "on baseline": 0,
    underperformed: 0,
    "no baseline": 0,
  } as Record<CylTier, number>
  for (const r of rows) counts[r.tier] += 1
  return counts
}

/**
 * How to present a multiplier. Nineteen videos have no same-era peers to compare
 * against; those get the reason, not a number, because a fabricated baseline
 * reads exactly like a real one.
 */
export function describeMultiplier(video: CylVideo): string {
  if (video.multiplier == null) return "no comparable peers"
  return `${video.multiplier.toFixed(video.multiplier >= 100 ? 0 : 1)}×`
}

export function formatCount(n: number | null): string {
  if (n == null) return "—"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}
