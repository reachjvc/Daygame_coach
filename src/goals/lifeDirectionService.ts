/**
 * The Life Direction Intensive: a six-session process from a cold start to a
 * reality-tested plan.
 *
 * Everything here is pure. The component holds one `LdiPlan`, calls these to
 * produce the next one, and writes the result to localStorage. No LLM, no
 * API, no database.
 *
 * Kept separate from northStarService.ts, lifeMasteryService.ts and
 * visionPlanService.ts on purpose. Those three already decline to merge with
 * each other; a fourth module that borrowed from all of them would inherit
 * every ambiguity they were separated to avoid.
 *
 * The part that distinguishes this flow from a set of journalling prompts is
 * the small number of places where it says no: a plan below the realism floor,
 * a week that spends hours nobody has, a goal that contradicts a value the
 * user ranked themselves. Those refusals live in this file, and they are the
 * product.
 */

import {
  LDI_AREAS,
  LDI_AREA_MAP,
  LDI_CADENCES,
  LDI_DOMAINS,
  LDI_EULOGY_STEMS,
  LDI_GOAL_FIELDS,
  LDI_INTAKE_DIMENSIONS,
  LDI_INTAKE_ITEMS,
  LDI_INTAKE_MAX,
  LDI_LEGACY_PROMPTS,
  LDI_NORTH_STAR_PROMPTS,
  LDI_ODYSSEY_KINDS,
  LDI_ODYSSEY_SCORES,
  LDI_PORTFOLIO_MAX,
  LDI_PORTFOLIO_MIN,
  LDI_REALISM_FLOOR,
  LDI_REFLECT_PROMPTS,
  LDI_SCHEMA_VERSION,
  LDI_SESSIONS,
  LDI_WHEEL_SCALE_MAX,
  LDI_WHEEL_SCALE_MIN,
  areasInDomain,
  type LdiCadenceId,
  type LdiEnergyMark,
  type LdiIntakeDimension,
  type LdiSessionId,
} from "@/src/goals/data/lifeDirection"
import {
  pairwiseAnswer,
  pairwiseQuestion,
  startPairwise,
} from "@/src/goals/data/valuesFramework"
import type {
  LdiAccountability,
  LdiConstraints,
  LdiDream,
  LdiFearSetting,
  LdiGoal,
  LdiOdyssey,
  LdiPlan,
  LdiProgress,
  LdiPrototype,
  LdiSessionProgress,
  LdiWeekBlock,
} from "@/src/goals/types"

// ------------------------------------------------------------------ helpers

const nowIso = () => new Date().toISOString()

/** Every mutation goes through this, so `updatedAt` and `seq` cannot drift. */
function bump(plan: LdiPlan, patch: Partial<LdiPlan>, now: string): LdiPlan {
  return { ...plan, ...patch, seq: plan.seq + 1, updatedAt: now }
}

function newId(plan: LdiPlan, prefix: string): string {
  return `${prefix}-${plan.seq + 1}`
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

const filled = (s: string | undefined | null): boolean => (s ?? "").trim().length > 0

function countFilled(record: Record<string, string>, ids: readonly string[]): number {
  return ids.filter((id) => filled(record[id])).length
}

// ------------------------------------------------------------------ empty

export function emptyConstraints(): LdiConstraints {
  return { weeklyHours: null, money: "", dependants: "", health: "", nonNegotiables: "" }
}

export function emptyFear(): LdiFearSetting {
  return { option: "", worst: "", prevent: "", repair: "", benefits: "", costInaction: "" }
}

export function emptyAccountability(): LdiAccountability {
  return { who: "", when: "", what: "" }
}

/**
 * A blank intensive. Note what is NOT here: no starter goals, no suggested
 * values, no pre-rated wheel. Every authored field is empty, so the flow can
 * always tell the difference between "they said this" and "we guessed".
 */
export function emptyLdiPlan(now = nowIso()): LdiPlan {
  return {
    v: LDI_SCHEMA_VERSION,
    intake: {},
    wheel: {},
    energy: [],
    constraints: emptyConstraints(),
    reflect: {},
    focusAreaIds: [],
    northStar: {},
    legacy: {},
    eulogy: {},
    odyssey: LDI_ODYSSEY_KINDS.map((k) => ({
      kind: k.id,
      title: "",
      body: "",
      scores: {},
      processAppeals: null,
    })),
    values: { candidates: [], pairwise: null, ranked: [], away: [] },
    fear: emptyFear(),
    dreams: [],
    celebrations: {},
    portfolioAreaIds: [],
    budget: {},
    goals: [],
    week: [],
    cadences: [],
    accountability: emptyAccountability(),
    prototypes: [],
    finished: [],
    overrides: [],
    seq: 0,
    updatedAt: now,
  }
}

// ------------------------------------------------------------------ storage

export function serializeLdiPlan(plan: LdiPlan): string {
  return JSON.stringify(plan)
}

/**
 * Load, or null when there is nothing usable. Fails closed rather than
 * repairing: a half-understood plan silently "fixed" is worse than a fresh
 * one, because the user cannot see what was dropped.
 */
export function loadLdiPlan(raw: string | null): LdiPlan | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const p = parsed as Partial<LdiPlan>
  if (p.v !== LDI_SCHEMA_VERSION) return null

  const base = emptyLdiPlan(typeof p.updatedAt === "string" ? p.updatedAt : nowIso())
  return {
    ...base,
    ...p,
    // Nested objects need explicit merges, or a plan written by an older
    // build loses whichever sub-fields it did not know about.
    constraints: { ...base.constraints, ...(p.constraints ?? {}) },
    values: { ...base.values, ...(p.values ?? {}) },
    fear: { ...base.fear, ...(p.fear ?? {}) },
    accountability: { ...base.accountability, ...(p.accountability ?? {}) },
    odyssey:
      Array.isArray(p.odyssey) && p.odyssey.length === LDI_ODYSSEY_KINDS.length
        ? p.odyssey
        : base.odyssey,
    // Added after the first plans were written, so an older saved plan has no
    // such key and must not come back as undefined.
    overrides: Array.isArray(p.overrides) ? p.overrides : [],
    finished: Array.isArray(p.finished) ? p.finished : [],
    v: LDI_SCHEMA_VERSION,
  }
}

// ------------------------------------------------------------------ session 0

export function setIntakeAnswer(plan: LdiPlan, itemId: string, value: number, now = nowIso()): LdiPlan {
  return bump(plan, { intake: { ...plan.intake, [itemId]: clamp(value, 0, LDI_INTAKE_MAX) } }, now)
}

export function intakeComplete(plan: LdiPlan): boolean {
  return LDI_INTAKE_ITEMS.every((i) => typeof plan.intake[i.id] === "number")
}

/**
 * Per-dimension score as a percentage of the maximum. Reported only once the
 * dimension is fully answered, so a half-finished section cannot read as a
 * weak one.
 */
export function intakeScores(plan: LdiPlan): Record<LdiIntakeDimension, number | null> {
  const out = {} as Record<LdiIntakeDimension, number | null>
  for (const dim of Object.keys(LDI_INTAKE_DIMENSIONS) as LdiIntakeDimension[]) {
    const items = LDI_INTAKE_ITEMS.filter((i) => i.dimension === dim)
    const answered = items.filter((i) => typeof plan.intake[i.id] === "number")
    if (answered.length < items.length) {
      out[dim] = null
      continue
    }
    const total = answered.reduce((n, i) => n + plan.intake[i.id], 0)
    out[dim] = Math.round((total / (items.length * LDI_INTAKE_MAX)) * 100)
  }
  return out
}

/** The dimension most worth working on. Null until every dimension is scored. */
export function weakestDimension(plan: LdiPlan): LdiIntakeDimension | null {
  const scores = intakeScores(plan)
  const entries = Object.entries(scores) as [LdiIntakeDimension, number | null][]
  if (entries.some(([, v]) => v === null)) return null
  return entries.reduce((lo, cur) => (cur[1]! < lo[1]! ? cur : lo))[0]
}

export function setWheelRating(plan: LdiPlan, areaId: string, score: number, now = nowIso()): LdiPlan {
  return bump(
    plan,
    { wheel: { ...plan.wheel, [areaId]: clamp(score, LDI_WHEEL_SCALE_MIN, LDI_WHEEL_SCALE_MAX) } },
    now,
  )
}

export function wheelComplete(plan: LdiPlan): boolean {
  return LDI_AREAS.every((a) => typeof plan.wheel[a.id] === "number")
}

export function addEnergyEntry(plan: LdiPlan, label: string, now = nowIso()): LdiPlan {
  if (!filled(label)) return plan
  return bump(
    plan,
    { energy: [...plan.energy, { id: newId(plan, "e"), label: label.trim(), mark: null }] },
    now,
  )
}

export function markEnergyEntry(plan: LdiPlan, entryId: string, mark: LdiEnergyMark, now = nowIso()): LdiPlan {
  return bump(
    plan,
    { energy: plan.energy.map((e) => (e.id === entryId ? { ...e, mark } : e)) },
    now,
  )
}

export function removeEnergyEntry(plan: LdiPlan, entryId: string, now = nowIso()): LdiPlan {
  return bump(plan, { energy: plan.energy.filter((e) => e.id !== entryId) }, now)
}

/** Minimum entries before the audit says anything useful about a fortnight. */
export const LDI_ENERGY_MIN_ENTRIES = 5

export function energyComplete(plan: LdiPlan): boolean {
  return plan.energy.length >= LDI_ENERGY_MIN_ENTRIES && plan.energy.every((e) => e.mark !== null)
}

export function setConstraints(plan: LdiPlan, patch: Partial<LdiConstraints>, now = nowIso()): LdiPlan {
  return bump(plan, { constraints: { ...plan.constraints, ...patch } }, now)
}

export function constraintsComplete(plan: LdiPlan): boolean {
  const h = plan.constraints.weeklyHours
  return typeof h === "number" && h > 0 && filled(plan.constraints.nonNegotiables)
}

// ------------------------------------------------------------------ session 1

export function setReflect(plan: LdiPlan, promptId: string, text: string, now = nowIso()): LdiPlan {
  return bump(plan, { reflect: { ...plan.reflect, [promptId]: text } }, now)
}

export function reflectAnswered(plan: LdiPlan): number {
  return countFilled(plan.reflect, LDI_REFLECT_PROMPTS.map((p) => p.id))
}

/**
 * One focus area per domain. Toggling a second area in the same domain
 * replaces the first rather than erroring: the constraint is the point, and
 * a silent swap teaches it faster than a rejection does.
 */
export function toggleFocusArea(plan: LdiPlan, areaId: string, now = nowIso()): LdiPlan {
  const area = LDI_AREA_MAP[areaId]
  if (!area || area.domain === null) return plan
  if (plan.focusAreaIds.includes(areaId)) {
    return bump(plan, { focusAreaIds: plan.focusAreaIds.filter((id) => id !== areaId) }, now)
  }
  const siblings = areasInDomain(area.domain).map((a) => a.id)
  const kept = plan.focusAreaIds.filter((id) => !siblings.includes(id))
  return bump(plan, { focusAreaIds: [...kept, areaId] }, now)
}

export function focusComplete(plan: LdiPlan): boolean {
  return LDI_DOMAINS.every((d) =>
    plan.focusAreaIds.some((id) => LDI_AREA_MAP[id]?.domain === d.id),
  )
}

// ------------------------------------------------------------------ session 2

export function setNorthStar(plan: LdiPlan, promptId: string, text: string, now = nowIso()): LdiPlan {
  return bump(plan, { northStar: { ...plan.northStar, [promptId]: text } }, now)
}

export function setLegacy(plan: LdiPlan, promptId: string, text: string, now = nowIso()): LdiPlan {
  return bump(plan, { legacy: { ...plan.legacy, [promptId]: text } }, now)
}

export function setEulogyStem(plan: LdiPlan, index: number, text: string, now = nowIso()): LdiPlan {
  if (index < 0 || index >= LDI_EULOGY_STEMS.length) return plan
  return bump(plan, { eulogy: { ...plan.eulogy, [String(index)]: text } }, now)
}

/** The stems are a menu, not a form. Enough of them is the bar, not all. */
export const LDI_EULOGY_MIN = 6

export function eulogyAnswered(plan: LdiPlan): number {
  return Object.values(plan.eulogy).filter(filled).length
}

export function setOdyssey(plan: LdiPlan, index: number, patch: Partial<LdiOdyssey>, now = nowIso()): LdiPlan {
  if (index < 0 || index >= plan.odyssey.length) return plan
  return bump(
    plan,
    { odyssey: plan.odyssey.map((o, i) => (i === index ? { ...o, ...patch } : o)) },
    now,
  )
}

export function setOdysseyScore(plan: LdiPlan, index: number, scoreId: string, value: number, now = nowIso()): LdiPlan {
  const o = plan.odyssey[index]
  if (!o) return plan
  return setOdyssey(plan, index, { scores: { ...o.scores, [scoreId]: clamp(value, 0, 5) } }, now)
}

export function odysseyComplete(plan: LdiPlan): boolean {
  return plan.odyssey.every(
    (o) =>
      filled(o.body) &&
      LDI_ODYSSEY_SCORES.every((s) => typeof o.scores[s.id] === "number") &&
      o.processAppeals !== null,
  )
}

/** Total across the comparison dashboard. Null until that future is fully rated. */
export function odysseyTotal(o: LdiOdyssey): number | null {
  if (!LDI_ODYSSEY_SCORES.every((s) => typeof o.scores[s.id] === "number")) return null
  return LDI_ODYSSEY_SCORES.reduce((n, s) => n + o.scores[s.id], 0)
}

/**
 * The comparison the exercise exists for. Returns the highest-scoring future
 * only when all three are rated, and never breaks a tie: a tie is a real
 * result and the user should see it.
 */
export function odysseyLeaders(plan: LdiPlan): LdiOdyssey[] {
  const totals = plan.odyssey.map(odysseyTotal)
  if (totals.some((t) => t === null)) return []
  const best = Math.max(...(totals as number[]))
  return plan.odyssey.filter((_, i) => totals[i] === best)
}

// values

export function setValueCandidates(plan: LdiPlan, candidates: string[], now = nowIso()): LdiPlan {
  const cleaned = candidates.map((c) => c.trim()).filter(Boolean)
  // Changing the candidate list invalidates any ranking built from the old one.
  return bump(plan, { values: { ...plan.values, candidates: cleaned, pairwise: null, ranked: [] } }, now)
}

export function setAwayValues(plan: LdiPlan, away: string[], now = nowIso()): LdiPlan {
  return bump(plan, { values: { ...plan.values, away: away.map((a) => a.trim()).filter(Boolean) } }, now)
}

export const LDI_VALUES_MIN = 5

export function startValueRanking(plan: LdiPlan, now = nowIso()): LdiPlan {
  if (plan.values.candidates.length < 2) return plan
  return bump(
    plan,
    { values: { ...plan.values, pairwise: startPairwise(plan.values.candidates), ranked: [] } },
    now,
  )
}

/** The current forced comparison, or null when there is nothing left to ask. */
export function currentValueQuestion(plan: LdiPlan): { a: string; b: string } | null {
  return plan.values.pairwise ? pairwiseQuestion(plan.values.pairwise) : null
}

export function answerValueQuestion(plan: LdiPlan, aWins: boolean, now = nowIso()): LdiPlan {
  if (!plan.values.pairwise) return plan
  const next = pairwiseAnswer(plan.values.pairwise, aWins)
  const done = next.pending.length === 0
  return bump(
    plan,
    { values: { ...plan.values, pairwise: next, ranked: done ? next.ranked : [] } },
    now,
  )
}

export function valuesComplete(plan: LdiPlan): boolean {
  return plan.values.ranked.length >= LDI_VALUES_MIN
}

export function setFear(plan: LdiPlan, patch: Partial<LdiFearSetting>, now = nowIso()): LdiPlan {
  return bump(plan, { fear: { ...plan.fear, ...patch } }, now)
}

export function fearComplete(plan: LdiPlan): boolean {
  const f = plan.fear
  return [f.option, f.worst, f.prevent, f.repair, f.benefits, f.costInaction].every(filled)
}

// ------------------------------------------------------------------ session 3

export const LDI_DREAM_MIN = 10

export function addDream(plan: LdiPlan, text: string, now = nowIso()): LdiPlan {
  if (!filled(text)) return plan
  return bump(
    plan,
    {
      dreams: [
        ...plan.dreams,
        { id: newId(plan, "d"), text: text.trim(), horizonYears: null, areaId: null },
      ],
    },
    now,
  )
}

export function updateDream(plan: LdiPlan, dreamId: string, patch: Partial<Omit<LdiDream, "id">>, now = nowIso()): LdiPlan {
  return bump(
    plan,
    { dreams: plan.dreams.map((d) => (d.id === dreamId ? { ...d, ...patch } : d)) },
    now,
  )
}

export function removeDream(plan: LdiPlan, dreamId: string, now = nowIso()): LdiPlan {
  return bump(plan, { dreams: plan.dreams.filter((d) => d.id !== dreamId) }, now)
}

export function dreamsTagged(plan: LdiPlan): number {
  return plan.dreams.filter((d) => d.horizonYears !== null).length
}

export function dreamsByHorizon(plan: LdiPlan, years: number): LdiDream[] {
  return plan.dreams.filter((d) => d.horizonYears === years)
}

export function setCelebration(plan: LdiPlan, areaId: string, text: string, now = nowIso()): LdiPlan {
  return bump(plan, { celebrations: { ...plan.celebrations, [areaId]: text } }, now)
}

/**
 * Celebrations belong to the portfolio, not to the focus list. Goals are
 * formed per portfolio area, so keying these to anything else produces
 * celebrations for areas that never get a goal and goals with nothing above
 * them.
 */
export function celebrationsComplete(plan: LdiPlan): boolean {
  return (
    plan.portfolioAreaIds.length > 0 &&
    plan.portfolioAreaIds.every((id) => filled(plan.celebrations[id]))
  )
}

/**
 * Carry the reflect session's choice forward instead of asking for it again.
 * Idempotent, and only ever acts on an empty portfolio, so a user who has
 * deliberately emptied it does not get their choice undone on the next visit.
 *
 * This is not a fabricated answer. It is the user's own earlier selection,
 * shown to them as a starting point they can change.
 */
export function seedPortfolioFromFocus(plan: LdiPlan, now = nowIso()): LdiPlan {
  if (plan.portfolioAreaIds.length > 0 || plan.focusAreaIds.length === 0) return plan
  return bump(plan, { portfolioAreaIds: [...plan.focusAreaIds] }, now)
}

export function togglePortfolioArea(plan: LdiPlan, areaId: string, now = nowIso()): LdiPlan {
  const inList = plan.portfolioAreaIds.includes(areaId)
  if (!inList && plan.portfolioAreaIds.length >= LDI_PORTFOLIO_MAX) return plan
  const next = inList
    ? plan.portfolioAreaIds.filter((id) => id !== areaId)
    : [...plan.portfolioAreaIds, areaId]
  // Dropping an area drops its hours and its celebration too, or the budget
  // keeps spending on something the user has already put down and the goals
  // screen shows a celebration for an area nobody is carrying.
  const budget = { ...plan.budget }
  const celebrations = { ...plan.celebrations }
  if (inList) {
    delete budget[areaId]
    delete celebrations[areaId]
  }
  return bump(plan, { portfolioAreaIds: next, budget, celebrations }, now)
}

export function portfolioComplete(plan: LdiPlan): boolean {
  return (
    plan.portfolioAreaIds.length >= LDI_PORTFOLIO_MIN &&
    plan.portfolioAreaIds.length <= LDI_PORTFOLIO_MAX
  )
}

export function setBudget(plan: LdiPlan, areaId: string, hours: number, now = nowIso()): LdiPlan {
  return bump(plan, { budget: { ...plan.budget, [areaId]: Math.max(0, hours) } }, now)
}

export function budgetTotal(plan: LdiPlan): number {
  return plan.portfolioAreaIds.reduce((n, id) => n + (plan.budget[id] ?? 0), 0)
}

export function budgetAvailable(plan: LdiPlan): number | null {
  return plan.constraints.weeklyHours
}

export function budgetRemaining(plan: LdiPlan): number | null {
  const avail = budgetAvailable(plan)
  return avail === null ? null : avail - budgetTotal(plan)
}

/**
 * The refusal that makes the wheel mean something. Showing an imbalance and
 * then accepting any allocation at all is where this normally stops.
 */
export function budgetOverAllocated(plan: LdiPlan): boolean {
  const remaining = budgetRemaining(plan)
  return remaining !== null && remaining < 0
}

export function budgetComplete(plan: LdiPlan): boolean {
  return (
    portfolioComplete(plan) &&
    !budgetOverAllocated(plan) &&
    plan.portfolioAreaIds.every((id) => (plan.budget[id] ?? 0) > 0)
  )
}

// ------------------------------------------------------------------ session 4

export function addGoal(plan: LdiPlan, areaId: string, title: string, sourceDreamId: string | null = null, now = nowIso()): LdiPlan {
  if (!filled(title)) return plan
  const goal: LdiGoal = {
    id: newId(plan, "g"),
    areaId,
    title: title.trim(),
    fields: {},
    realismTheory: null,
    realismPractice: null,
    surpriseIfFailed: null,
    leadIndicator: "",
    status: "on-track",
    sourceDreamId,
  }
  return bump(plan, { goals: [...plan.goals, goal] }, now)
}

export function updateGoal(plan: LdiPlan, goalId: string, patch: Partial<Omit<LdiGoal, "id">>, now = nowIso()): LdiPlan {
  return bump(plan, { goals: plan.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)) }, now)
}

export function setGoalField(plan: LdiPlan, goalId: string, fieldId: string, text: string, now = nowIso()): LdiPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { fields: { ...goal.fields, [fieldId]: text } }, now)
}

export function removeGoal(plan: LdiPlan, goalId: string, now = nowIso()): LdiPlan {
  // A goal's week blocks go with it, or the fit test keeps counting a block
  // for something that no longer exists.
  return bump(
    plan,
    {
      goals: plan.goals.filter((g) => g.id !== goalId),
      week: plan.week.filter((b) => b.goalId !== goalId),
    },
    now,
  )
}

export function goalsInArea(plan: LdiPlan, areaId: string): LdiGoal[] {
  return plan.goals.filter((g) => g.areaId === areaId)
}

/** What is still missing, named plainly. Empty means the goal is finished. */
export function goalGaps(goal: LdiGoal): string[] {
  const gaps: string[] = []
  for (const f of LDI_GOAL_FIELDS) {
    if (!filled(goal.fields[f.id])) gaps.push(f.label)
  }
  if (goal.realismTheory === null) gaps.push("Realism in theory")
  if (goal.realismPractice === null) gaps.push("Realism in practice")
  if (!filled(goal.leadIndicator)) gaps.push("Lead indicator")
  return gaps
}

/**
 * The realism floor. Below it on either percentage, the plan is the thing
 * that needs changing, and the flow refuses to call the goal ready rather
 * than letting an unfollowable plan through with a warning nobody reads.
 */
export function realismBlocked(goal: LdiGoal): boolean {
  const { realismTheory: t, realismPractice: p } = goal
  if (t === null || p === null) return false
  return t < LDI_REALISM_FLOOR || p < LDI_REALISM_FLOOR
}

export function realismMessage(goal: LdiGoal): string | null {
  if (!realismBlocked(goal)) return null
  const { realismTheory: t, realismPractice: p } = goal
  if (t !== null && t < LDI_REALISM_FLOOR && p !== null && p < LDI_REALISM_FLOOR) {
    return "Both numbers are under the floor. This plan would not produce the result and you would not follow it. Change the plan, not the numbers."
  }
  if (t !== null && t < LDI_REALISM_FLOOR) {
    return "Even followed perfectly, this plan probably would not get you there. The steps need to change before anything else does."
  }
  return "You do not believe you would follow this. Make it smaller until you would."
}

export function goalReady(goal: LdiGoal): boolean {
  return goalGaps(goal).length === 0 && !realismBlocked(goal)
}

export function goalsComplete(plan: LdiPlan): boolean {
  return (
    plan.portfolioAreaIds.length > 0 &&
    plan.portfolioAreaIds.every((id) => goalsInArea(plan, id).some(goalReady))
  )
}

// ------------------------------------------------------------------ coherence

export interface LdiWarning {
  id: string
  title: string
  message: string
}

/**
 * Where the plan contradicts itself. These are warnings rather than blocks:
 * a person is allowed to want something that does not match their stated
 * values, but they should have to look at it first.
 */
export function coherenceWarnings(plan: LdiPlan): LdiWarning[] {
  const out: LdiWarning[] = []

  const topValues = plan.values.ranked.slice(0, 3)
  if (topValues.length > 0 && plan.goals.length > 0) {
    const mentioned = (v: string) =>
      plan.goals.some((g) =>
        [g.title, ...Object.values(g.fields)].join(" ").toLowerCase().includes(v.toLowerCase()),
      )
    const orphaned = topValues.filter((v) => !mentioned(v))
    if (orphaned.length > 0) {
      out.push({
        id: "values-orphaned",
        title: "A top value has nothing attached to it",
        message: `You ranked ${orphaned.join(", ")} near the top, and none of your goals mention it. Either a goal is missing, or the ranking was aspirational.`,
      })
    }
  }

  // An area rated low on the wheel, cared about enough to be a focus, and
  // then left out of the portfolio.
  const dropped = plan.focusAreaIds.filter((id) => !plan.portfolioAreaIds.includes(id))
  if (dropped.length > 0) {
    out.push({
      id: "focus-dropped",
      title: "You chose an area and then dropped it",
      message: `${dropped.map((id) => LDI_AREA_MAP[id]?.label ?? id).join(", ")} came out of the reflection as needing work, and did not make it into what you are actually carrying. That may be right, but say so deliberately.`,
    })
  }

  // Anti-goals exist to protect something. If a non-negotiable never appears
  // in any of them, it is not actually being protected.
  const nonNeg = plan.constraints.nonNegotiables.trim()
  if (filled(nonNeg) && plan.goals.length > 0) {
    const antiText = plan.goals.map((g) => g.fields.antiGoals ?? "").join(" ").toLowerCase()
    const words = nonNeg.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4)
    if (words.length > 0 && !words.some((w) => antiText.includes(w))) {
      out.push({
        id: "nonneg-unprotected",
        title: "Your non-negotiable is not protected anywhere",
        message: "You said what you would not trade, and none of your anti-goals mention it. Anti-goals are where that gets enforced.",
      })
    }
  }

  const over = budgetOverAllocated(plan)
  if (over) {
    out.push({
      id: "budget-over",
      title: "The week is over-allocated",
      message: `You have ${budgetTotal(plan)} hours committed against ${budgetAvailable(plan) ?? 0} available.`,
    })
  }

  return out
}

// ------------------------------------------------------------------ session 5

export function addWeekBlock(plan: LdiPlan, day: string, slot: string, label: string, goalId: string | null, hours: number, now = nowIso()): LdiPlan {
  const block: LdiWeekBlock = {
    id: newId(plan, "w"),
    day,
    slot,
    label: label.trim(),
    goalId,
    hours: Math.max(0, hours),
  }
  return bump(plan, { week: [...plan.week, block] }, now)
}

export function removeWeekBlock(plan: LdiPlan, blockId: string, now = nowIso()): LdiPlan {
  return bump(plan, { week: plan.week.filter((b) => b.id !== blockId) }, now)
}

export function blocksAt(plan: LdiPlan, day: string, slot: string): LdiWeekBlock[] {
  return plan.week.filter((b) => b.day === day && b.slot === slot)
}

export function weekHours(plan: LdiPlan): number {
  return plan.week.reduce((n, b) => n + b.hours, 0)
}

/**
 * The fit test. Goals that never got a block in the week the user built
 * themselves. The instruction attached to this is deliberately blunt: what
 * does not fit gets cut, not shrunk, because shrinking is how five goals
 * become five things you are failing at slowly.
 */
export function fitTestFailures(plan: LdiPlan): LdiGoal[] {
  const scheduled = new Set(plan.week.map((b) => b.goalId).filter(Boolean) as string[])
  return plan.goals.filter((g) => goalReady(g) && !scheduled.has(g.id))
}

export function fitTestPasses(plan: LdiPlan): boolean {
  return plan.goals.some(goalReady) && fitTestFailures(plan).length === 0
}

export function toggleCadence(plan: LdiPlan, id: LdiCadenceId, now = nowIso()): LdiPlan {
  const next = plan.cadences.includes(id)
    ? plan.cadences.filter((c) => c !== id)
    : [...plan.cadences, id]
  return bump(plan, { cadences: next }, now)
}

/** The two loops that carry the rest. Without them nothing re-surfaces. */
export const LDI_REQUIRED_CADENCES: readonly LdiCadenceId[] = ["daily", "weekly"] as const

export function cadenceComplete(plan: LdiPlan): boolean {
  return LDI_REQUIRED_CADENCES.every((c) => plan.cadences.includes(c))
}

export function setAccountability(plan: LdiPlan, patch: Partial<LdiAccountability>, now = nowIso()): LdiPlan {
  return bump(plan, { accountability: { ...plan.accountability, ...patch } }, now)
}

export function accountabilityComplete(plan: LdiPlan): boolean {
  const a = plan.accountability
  return filled(a.who) && filled(a.when) && filled(a.what)
}

export function addPrototype(plan: LdiPlan, now = nowIso()): LdiPlan {
  const proto: LdiPrototype = {
    id: newId(plan, "p"),
    assumption: "",
    test: "",
    signal: "",
    date: null,
  }
  return bump(plan, { prototypes: [...plan.prototypes, proto] }, now)
}

export function updatePrototype(plan: LdiPlan, id: string, patch: Partial<Omit<LdiPrototype, "id">>, now = nowIso()): LdiPlan {
  return bump(
    plan,
    { prototypes: plan.prototypes.map((p) => (p.id === id ? { ...p, ...patch } : p)) },
    now,
  )
}

export function removePrototype(plan: LdiPlan, id: string, now = nowIso()): LdiPlan {
  return bump(plan, { prototypes: plan.prototypes.filter((p) => p.id !== id) }, now)
}

export function prototypeComplete(plan: LdiPlan): boolean {
  return plan.prototypes.some(
    (p) => filled(p.assumption) && filled(p.test) && filled(p.signal) && p.date !== null,
  )
}

// ------------------------------------------------------------------ progress

export interface LdiCheck {
  id: string
  label: string
  ok: boolean
}

/**
 * What each session requires, as named checks. Completion is evidence, never
 * a visit: opening a screen and leaving it blank has to leave the session
 * unfinished, or the progress readout becomes a lie the user tells themselves.
 */
export function sessionChecks(plan: LdiPlan, sessionId: LdiSessionId): LdiCheck[] {
  switch (sessionId) {
    case "baseline":
      return [
        { id: "intake", label: "Assessment answered", ok: intakeComplete(plan) },
        { id: "wheel", label: "Every area rated", ok: wheelComplete(plan) },
        { id: "energy", label: "Energy audit marked", ok: energyComplete(plan) },
        { id: "constraints", label: "Constraints declared", ok: constraintsComplete(plan) },
      ]
    case "reflect":
      return [
        {
          id: "prompts",
          label: `Reflections written (${reflectAnswered(plan)} of ${LDI_REFLECT_PROMPTS.length})`,
          ok: reflectAnswered(plan) === LDI_REFLECT_PROMPTS.length,
        },
        { id: "focus", label: "One focus area per domain", ok: focusComplete(plan) },
      ]
    case "direction":
      return [
        {
          id: "northstar",
          label: `Direction questions answered (${countFilled(plan.northStar, LDI_NORTH_STAR_PROMPTS.map((p) => p.id))} of ${LDI_NORTH_STAR_PROMPTS.length})`,
          ok: countFilled(plan.northStar, LDI_NORTH_STAR_PROMPTS.map((p) => p.id)) === LDI_NORTH_STAR_PROMPTS.length,
        },
        {
          id: "legacy",
          label: "Legacy work written",
          ok: countFilled(plan.legacy, LDI_LEGACY_PROMPTS.map((p) => p.id)) === LDI_LEGACY_PROMPTS.length,
        },
        {
          id: "eulogy",
          label: `Eulogy stems filled (${eulogyAnswered(plan)} of ${LDI_EULOGY_MIN} needed)`,
          ok: eulogyAnswered(plan) >= LDI_EULOGY_MIN,
        },
        { id: "odyssey", label: "Three futures written and scored", ok: odysseyComplete(plan) },
        { id: "values", label: "Values ranked", ok: valuesComplete(plan) },
        { id: "fear", label: "Fear-setting worked through", ok: fearComplete(plan) },
      ]
    case "converge":
      return [
        {
          id: "dreams",
          label: `Dreams listed (${plan.dreams.length} of ${LDI_DREAM_MIN})`,
          ok: plan.dreams.length >= LDI_DREAM_MIN,
        },
        {
          id: "horizons",
          label: "Every dream tagged with a horizon",
          ok: plan.dreams.length > 0 && dreamsTagged(plan) === plan.dreams.length,
        },
        { id: "portfolio", label: "Active areas chosen", ok: portfolioComplete(plan) },
        { id: "celebrate", label: "Twelve-month celebrations written", ok: celebrationsComplete(plan) },
        { id: "budget", label: "Hours allocated within what you have", ok: budgetComplete(plan) },
      ]
    case "goals":
      return [
        { id: "goals", label: "Every active area has a finished goal", ok: goalsComplete(plan) },
      ]
    case "install":
      return [
        { id: "week", label: "Ideal week built", ok: plan.week.length > 0 },
        { id: "fit", label: "Every goal fits the week", ok: fitTestPasses(plan) },
        { id: "cadence", label: "Daily and weekly loops committed to", ok: cadenceComplete(plan) },
        { id: "accountability", label: "Accountability named", ok: accountabilityComplete(plan) },
        { id: "prototype", label: "A real-world test planned", ok: prototypeComplete(plan) },
      ]
  }
}

function dimensionAnswered(plan: LdiPlan, dim: LdiIntakeDimension): boolean {
  return LDI_INTAKE_ITEMS.filter((i) => i.dimension === dim).every(
    (i) => typeof plan.intake[i.id] === "number",
  )
}

function odysseyStepChecks(plan: LdiPlan, index: number): LdiCheck[] {
  const o = plan.odyssey[index]
  if (!o) return []
  return [
    { id: "body", label: "This future is described", ok: filled(o.body) },
    {
      id: "scores",
      label: "Scored on all four",
      ok: LDI_ODYSSEY_SCORES.every((s) => typeof o.scores[s.id] === "number"),
    },
    { id: "appeal", label: "The process question answered", ok: o.processAppeals !== null },
  ]
}

/**
 * What a single screen needs before it is finished.
 *
 * Used to tell the user, at the moment they press Next, that they are leaving
 * something blank. Deliberately does NOT block navigation: this is a process
 * spread over days, and trapping somebody on a screen because they want to
 * think about one question overnight is how a ten-hour flow gets abandoned at
 * hour two. Say it plainly, then let them past.
 */
export function stepChecks(plan: LdiPlan, sessionId: LdiSessionId, stepId: string): LdiCheck[] {
  switch (`${sessionId}:${stepId}`) {
    case "baseline:intake-vision":
      return [{ id: "d", label: "All five answered", ok: dimensionAnswered(plan, "vision") }]
    case "baseline:intake-prioritisation":
      return [{ id: "d", label: "All five answered", ok: dimensionAnswered(plan, "prioritisation") }]
    case "baseline:intake-systems":
      return [{ id: "d", label: "All five answered", ok: dimensionAnswered(plan, "systems") }]
    case "baseline:intake-presence":
      return [{ id: "d", label: "All five answered", ok: dimensionAnswered(plan, "presence") }]
    case "baseline:wheel":
      return [{ id: "w", label: "Every area rated", ok: wheelComplete(plan) }]
    case "baseline:energy":
      return [{ id: "e", label: `At least ${LDI_ENERGY_MIN_ENTRIES} entries, all marked`, ok: energyComplete(plan) }]
    case "baseline:constraints":
      return [{ id: "c", label: "Hours and non-negotiables", ok: constraintsComplete(plan) }]

    case "reflect:prompts":
      return [
        {
          id: "p",
          label: `All ${LDI_REFLECT_PROMPTS.length} written (${reflectAnswered(plan)} so far)`,
          ok: reflectAnswered(plan) === LDI_REFLECT_PROMPTS.length,
        },
      ]
    case "reflect:focus":
      return [{ id: "f", label: "One area per domain", ok: focusComplete(plan) }]

    case "direction:northstar":
      return [
        {
          id: "n",
          label: `All ${LDI_NORTH_STAR_PROMPTS.length} answered`,
          ok: countFilled(plan.northStar, LDI_NORTH_STAR_PROMPTS.map((p) => p.id)) === LDI_NORTH_STAR_PROMPTS.length,
        },
      ]
    case "direction:legacy":
      return [
        {
          id: "l",
          label: "All three written",
          ok: countFilled(plan.legacy, LDI_LEGACY_PROMPTS.map((p) => p.id)) === LDI_LEGACY_PROMPTS.length,
        },
      ]
    case "direction:eulogy":
      return [
        {
          id: "e",
          label: `At least ${LDI_EULOGY_MIN} stems (${eulogyAnswered(plan)} so far)`,
          ok: eulogyAnswered(plan) >= LDI_EULOGY_MIN,
        },
      ]
    case "direction:odyssey-current":
      return odysseyStepChecks(plan, 0)
    case "direction:odyssey-alternative":
      return odysseyStepChecks(plan, 1)
    case "direction:odyssey-unconstrained":
      return odysseyStepChecks(plan, 2)
    case "direction:values":
      return [{ id: "v", label: `At least ${LDI_VALUES_MIN} values, ranked`, ok: valuesComplete(plan) }]
    case "direction:fear":
      return [{ id: "f", label: "All six answered", ok: fearComplete(plan) }]

    case "converge:dreams":
      return [
        {
          id: "d",
          label: `At least ${LDI_DREAM_MIN} (${plan.dreams.length} so far)`,
          ok: plan.dreams.length >= LDI_DREAM_MIN,
        },
      ]
    case "converge:horizons":
      return [
        {
          id: "h",
          label: `Every dream tagged (${dreamsTagged(plan)} of ${plan.dreams.length})`,
          ok: plan.dreams.length > 0 && dreamsTagged(plan) === plan.dreams.length,
        },
      ]
    case "converge:portfolio":
      return [
        {
          id: "p",
          label: `Between ${LDI_PORTFOLIO_MIN} and ${LDI_PORTFOLIO_MAX} areas`,
          ok: portfolioComplete(plan),
        },
      ]
    case "converge:celebrate":
      return [{ id: "c", label: "One for each area you are carrying", ok: celebrationsComplete(plan) }]
    case "converge:budget":
      return [{ id: "b", label: "Hours allocated within what you have", ok: budgetComplete(plan) }]

    case "goals:build":
      return [{ id: "g", label: "Every area has a finished goal", ok: goalsComplete(plan) }]

    case "install:idealweek":
      return [{ id: "w", label: "At least one block placed", ok: plan.week.length > 0 }]
    case "install:fit":
      return [{ id: "f", label: "Every finished goal has a slot", ok: fitTestPasses(plan) }]
    case "install:cadence":
      return [{ id: "c", label: "Daily and weekly committed to", ok: cadenceComplete(plan) }]
    case "install:accountability":
      return [{ id: "a", label: "Who, when and what", ok: accountabilityComplete(plan) }]
    case "install:prototype":
      return [{ id: "p", label: "One test planned in full", ok: prototypeComplete(plan) }]

    // Intros and the comparison screen ask for nothing.
    default:
      return []
  }
}

/** What this step is still missing, for the notice above the nav. */
export function stepGaps(plan: LdiPlan, sessionId: LdiSessionId, stepId: string): string[] {
  return stepChecks(plan, sessionId, stepId)
    .filter((c) => !c.ok)
    .map((c) => c.label)
}

export function ldiProgress(plan: LdiPlan): LdiProgress {
  const sessions: LdiSessionProgress[] = []
  let previousComplete = true
  const overrides = plan.overrides ?? []

  for (const def of LDI_SESSIONS) {
    const checks = sessionChecks(plan, def.id)
    const done = checks.filter((c) => c.ok).length
    const complete = done === checks.length
    sessions.push({
      id: def.id,
      done,
      total: checks.length,
      complete,
      // An override opens the door without marking the work done. Progress
      // still reports the truth; the user is simply allowed past it.
      unlocked: previousComplete || overrides.includes(def.id),
      overridden: !complete && overrides.includes(def.id),
    })
    previousComplete = (previousComplete && complete) || overrides.includes(def.id)
  }

  const next = sessions.find((s) => s.unlocked && !s.complete)
  return {
    sessions,
    done: sessions.filter((s) => s.complete).length,
    total: sessions.length,
    nextSessionId: next ? next.id : null,
  }
}

export function planIsUntouched(plan: LdiPlan): boolean {
  return plan.seq === 0
}

/** Marks a session finished. Advisory only: progress is still evidence-based. */
export function markSessionFinished(plan: LdiPlan, id: LdiSessionId, now = nowIso()): LdiPlan {
  if (plan.finished.includes(id)) return plan
  return bump(plan, { finished: [...plan.finished, id] }, now)
}

/**
 * Let the user past a session they have not finished.
 *
 * Strictness was a deliberate choice, but strict with no way through is a
 * trap: somebody with a genuinely quiet fortnight cannot produce five energy
 * entries and should not be stuck on screen three of a ten-hour process. The
 * override is recorded, the checks still read as unmet, and the session list
 * says so.
 */
export function overrideSessionLock(plan: LdiPlan, id: LdiSessionId, now = nowIso()): LdiPlan {
  const overrides = plan.overrides ?? []
  if (overrides.includes(id)) return plan
  return bump(plan, { overrides: [...overrides, id] }, now)
}

export function clearSessionOverride(plan: LdiPlan, id: LdiSessionId, now = nowIso()): LdiPlan {
  const overrides = plan.overrides ?? []
  if (!overrides.includes(id)) return plan
  return bump(plan, { overrides: overrides.filter((o) => o !== id) }, now)
}

/** Why a session is locked, phrased for the person looking at the lock. */
export function lockReason(plan: LdiPlan, id: LdiSessionId): string | null {
  const progress = ldiProgress(plan)
  const index = LDI_SESSIONS.findIndex((s) => s.id === id)
  if (index <= 0) return null
  const state = progress.sessions[index]
  if (state.unlocked) return null
  const blocking = progress.sessions.slice(0, index).find((s) => !s.complete)
  if (!blocking) return null
  const def = LDI_SESSIONS.find((s) => s.id === blocking.id)!
  const missing = sessionChecks(plan, blocking.id).filter((c) => !c.ok)
  const first = missing[0]?.label ?? ""
  return `Finish ${def.title.toLowerCase()} first${first ? `, starting with: ${first.toLowerCase()}` : ""}.`
}

export function resetLdiPlan(now = nowIso()): LdiPlan {
  return emptyLdiPlan(now)
}

// ------------------------------------------------------------------ export

/** The whole plan as one readable page, for copying out. */
export function planAsText(plan: LdiPlan): string {
  const lines: string[] = []
  const push = (s = "") => lines.push(s)
  const section = (title: string) => {
    push()
    push(title.toUpperCase())
    push("-".repeat(title.length))
  }

  push("LIFE DIRECTION")
  push(`Updated ${plan.updatedAt.slice(0, 10)}`)

  const scores = intakeScores(plan)
  if (Object.values(scores).every((v) => v !== null)) {
    section("Baseline")
    for (const [dim, val] of Object.entries(scores)) push(`${dim}: ${val}%`)
  }

  if (wheelComplete(plan)) {
    section("Where you are")
    for (const area of LDI_AREAS) push(`${area.label}: ${plan.wheel[area.id]}/10`)
  }

  if (plan.values.ranked.length > 0) {
    section("Values, in order")
    plan.values.ranked.forEach((v, i) => push(`${i + 1}. ${v}`))
  }

  const star = LDI_NORTH_STAR_PROMPTS.filter((p) => filled(plan.northStar[p.id]))
  if (star.length > 0) {
    section("Direction")
    for (const p of star) {
      push(p.title)
      push(plan.northStar[p.id].trim())
      push()
    }
  }

  if (plan.goals.length > 0) {
    section("Goals")
    for (const g of plan.goals) {
      const area = LDI_AREA_MAP[g.areaId]?.label ?? g.areaId
      push(`${g.title} (${area})`)
      for (const f of LDI_GOAL_FIELDS) {
        if (filled(g.fields[f.id])) push(`  ${f.label}: ${g.fields[f.id].trim()}`)
      }
      if (g.realismTheory !== null) push(`  Realism in theory: ${g.realismTheory}%`)
      if (g.realismPractice !== null) push(`  Realism in practice: ${g.realismPractice}%`)
      if (filled(g.leadIndicator)) push(`  Lead indicator: ${g.leadIndicator.trim()}`)
      push()
    }
  }

  if (plan.cadences.length > 0) {
    section("Loops")
    for (const c of LDI_CADENCES) {
      if (plan.cadences.includes(c.id)) push(`${c.label}, about ${c.minutes} minutes.`)
    }
  }

  if (accountabilityComplete(plan)) {
    section("Accountability")
    push(`${plan.accountability.who.trim()}, ${plan.accountability.when.trim()}.`)
    push(`Reports: ${plan.accountability.what.trim()}`)
  }

  return lines.join("\n")
}
