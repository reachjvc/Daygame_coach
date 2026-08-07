/**
 * The simple Life Mastery flow: why → areas → a why per goal.
 *
 * Everything here is pure. The component holds one `LifeMasteryPlan` in state,
 * calls these to produce the next one, and writes the result to localStorage.
 * No LLM, no API, no database. That is the point of the flow.
 *
 * Kept separate from visionPlanService.ts on purpose. That module runs the
 * whole system (intents, balancer, horizons, rituals, weekly evaluation) and
 * none of it is wanted here.
 */

import { LIFE_MASTERY_AREAS, LIFE_MASTERY_AREA_MAP, areaTextColor } from "@/src/goals/data/lifeMasteryAreas"
import { ANSWER_IDS, DEFAULT_HORIZON, HORIZON_CHOICES, HORIZON_WORDS, QUALIFY_THRESHOLD, VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"
import type {
  LifeMasteryPlan,
  LifeMasteryProgress,
  LifeMasteryStepId,
  ResolvedArea,
  SimpleCustomArea,
  SimpleGoal,
} from "@/src/goals/types"

export const LIFE_MASTERY_STORAGE_KEY = "lm-simple-v1"

/**
 * Custom areas get one neutral colour. The twelve carry a palette that was
 * validated as a set (CVD separation + contrast on the dark surface), and
 * adding colours to it without re-running that check would quietly break it.
 */
export const CUSTOM_AREA_COLOR = "#94a3b8"

export const STEP_ORDER: LifeMasteryStepId[] = ["why", "areas", "goals"]

export const STEP_LABELS: Record<LifeMasteryStepId, string> = {
  why: "Your why",
  areas: "Your areas",
  goals: "Why per goal",
}

export function emptyLifeMasteryPlan(): LifeMasteryPlan {
  return { version: 1, answers: {}, areaEdits: {}, customAreas: [], goals: [], goalSeq: 0, areaSeq: 0, horizonYears: DEFAULT_HORIZON, updatedAt: null }
}

/**
 * The line every rung sits under.
 *
 * The vision is deliberately far out: goals run "a year or less" and the
 * vision is "maybe 10 or 20 or 30 years from now" (Kz83kMosOWU). The Tuesday
 * is his perfect-day exercise, which asks for one ordinary day inside the
 * picture rather than a summary of the decade.
 */
export function visionFrame(horizonYears: number): string {
  const word = HORIZON_WORDS[horizonYears] ?? String(horizonYears)
  return `${word} years from now, on an ordinary Tuesday.`
}

export function setHorizon(plan: LifeMasteryPlan, years: number, now = nowIso()): LifeMasteryPlan {
  if (!HORIZON_CHOICES.includes(years as (typeof HORIZON_CHOICES)[number])) return plan
  return touch({ ...plan, horizonYears: years }, now)
}

// ---------------------------------------------------------------- storage

/**
 * Read a saved plan. Returns null when there is nothing readable, and the
 * caller then starts from an empty plan. Unknown answer keys and goals in
 * areas that no longer exist are dropped, because carrying them forward would
 * put rows on screen that no area owns.
 */
export function loadLifeMasteryPlan(raw: string | null): LifeMasteryPlan | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const obj = parsed as Record<string, unknown>

  const customAreas: SimpleCustomArea[] = Array.isArray(obj.customAreas)
    ? (obj.customAreas as unknown[])
        .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
        .filter((a) => typeof a.id === "string" && typeof a.label === "string")
        .map((a) => ({ id: String(a.id), label: String(a.label), color: typeof a.color === "string" ? a.color : CUSTOM_AREA_COLOR }))
    : []

  const knownAreaIds = new Set([...LIFE_MASTERY_AREAS.map((a) => a.id), ...customAreas.map((a) => a.id)])
  const knownAnswerIds = new Set(ANSWER_IDS)

  const answers: Record<string, string> = {}
  if (obj.answers && typeof obj.answers === "object") {
    for (const [k, v] of Object.entries(obj.answers as Record<string, unknown>)) {
      if (knownAnswerIds.has(k) && typeof v === "string") answers[k] = v
    }
  }

  const areaEdits: LifeMasteryPlan["areaEdits"] = {}
  if (obj.areaEdits && typeof obj.areaEdits === "object") {
    for (const [k, v] of Object.entries(obj.areaEdits as Record<string, unknown>)) {
      if (!knownAreaIds.has(k) || !v || typeof v !== "object") continue
      const e = v as Record<string, unknown>
      areaEdits[k] = {
        ...(typeof e.label === "string" ? { label: e.label } : {}),
        ...(e.hidden === true ? { hidden: true } : {}),
      }
    }
  }

  const goals: SimpleGoal[] = Array.isArray(obj.goals)
    ? (obj.goals as unknown[])
        .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
        .filter((g) => typeof g.id === "string" && typeof g.title === "string" && typeof g.areaId === "string")
        .filter((g) => knownAreaIds.has(String(g.areaId)))
        .map((g) => ({
          id: String(g.id),
          areaId: String(g.areaId),
          title: String(g.title),
          why: typeof g.why === "string" ? g.why : "",
          painWhy: typeof g.painWhy === "string" ? g.painWhy : "",
          targetDate: typeof g.targetDate === "string" ? g.targetDate : null,
          beliefLevel: typeof g.beliefLevel === "number" ? g.beliefLevel : null,
          desireLevel: typeof g.desireLevel === "number" ? g.desireLevel : null,
          sentence: typeof g.sentence === "string" ? g.sentence : "",
        }))
    : []

  return {
    version: 1,
    answers,
    areaEdits,
    customAreas,
    goals,
    // A horizon we do not offer would render as "undefined years from now".
    horizonYears: HORIZON_CHOICES.includes(obj.horizonYears as (typeof HORIZON_CHOICES)[number])
      ? (obj.horizonYears as number)
      : DEFAULT_HORIZON,
    // A save written before the counters existed, or one someone edited by
    // hand, still must never hand out an id that is already on the list.
    goalSeq: Math.max(numberOr(obj.goalSeq, 0), highestSeq(goals.map((g) => g.id))),
    areaSeq: Math.max(numberOr(obj.areaSeq, 0), highestSeq(customAreas.map((a) => a.id))),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : null,
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function highestSeq(ids: string[]): number {
  let max = 0
  for (const id of ids) {
    const m = /^[a-z]+(\d+)$/.exec(id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max
}

export function serializeLifeMasteryPlan(plan: LifeMasteryPlan): string {
  return JSON.stringify(plan)
}

/** Every mutation goes through this, so `updatedAt` can never drift. */
function touch(plan: LifeMasteryPlan, now: string): LifeMasteryPlan {
  return { ...plan, updatedAt: now }
}

const nowIso = () => new Date().toISOString()

// ------------------------------------------------------------------ step 1

export function setAnswer(plan: LifeMasteryPlan, questionId: string, text: string, now = nowIso()): LifeMasteryPlan {
  return touch({ ...plan, answers: { ...plan.answers, [questionId]: text } }, now)
}

export function answerOf(plan: LifeMasteryPlan, questionId: string): string {
  return plan.answers[questionId] ?? ""
}

export function isAnswered(plan: LifeMasteryPlan, questionId: string): boolean {
  return answerOf(plan, questionId).trim().length > 0
}

/**
 * One rung's answer, turned into finished sentences.
 *
 * The lead is the opener the user could see in front of the box while they
 * typed, so nothing appears in their vision that they did not watch go in.
 * Three rules decide whether it is used:
 *   1. A lead ending in a comma is a clause the sentence needs ("If nothing
 *      was in the way, I would own the building"), so it always stays.
 *   2. An answer that repeats the lead back keeps its own copy, so nobody who
 *      types the whole sentence out gets it twice.
 *   3. An answer starting "I" or "We" is already a clause and stands alone.
 *      Nothing else is: "my partner and our two kids" is a noun phrase, and
 *      treating it as a sentence is how "The people around me are" got lost.
 * Extra lines in one answer become their own sentences.
 */
export function rungSentences(lead: string, answer: string): string[] {
  const lines = answer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const stem = lead.trim().replace(/[,:]$/, "").toLowerCase()
  return lines.map((line, i) => {
    const standsAlone = !lead.trim().endsWith(",") &&
      (line.toLowerCase().startsWith(stem) || /^(i|we)\b/i.test(line))
    const text = i > 0 || standsAlone ? line : `${lead} ${line}`
    return endSentence(text.charAt(0).toUpperCase() + text.slice(1))
  })
}

function endSentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

/** Every answered rung, in order, as one paragraph. */
export function assembleVision(plan: LifeMasteryPlan): string {
  return VISION_RUNGS.flatMap((rung) => rungSentences(rung.lead, answerOf(plan, rung.id))).join(" ")
}

// ------------------------------------------------------------------ step 2

/** The twelve with edits applied, then the user's own areas. Fixed order. */
export function resolveAreas(plan: LifeMasteryPlan): ResolvedArea[] {
  const blueprint = LIFE_MASTERY_AREAS.map((a) => {
    const edit = plan.areaEdits[a.id]
    const label = edit?.label?.trim() || a.label
    return {
      id: a.id,
      label,
      sublabel: a.sublabel,
      color: a.color,
      textColor: areaTextColor(a),
      hidden: edit?.hidden === true,
      custom: false,
      renamed: label !== a.label,
    }
  })
  const custom = plan.customAreas.map((a) => ({
    id: a.id,
    label: plan.areaEdits[a.id]?.label?.trim() || a.label,
    sublabel: "",
    color: a.color,
    textColor: a.color,
    hidden: plan.areaEdits[a.id]?.hidden === true,
    custom: true,
    renamed: false,
  }))
  return [...blueprint, ...custom]
}

export function renameArea(plan: LifeMasteryPlan, areaId: string, label: string, now = nowIso()): LifeMasteryPlan {
  const trimmed = label.trim()
  const blueprintLabel = LIFE_MASTERY_AREA_MAP.get(areaId)?.label
  const edit = { ...(plan.areaEdits[areaId] ?? {}) }
  // Typing the Blueprint name back in clears the rename rather than storing it.
  if (!trimmed || trimmed === blueprintLabel) delete edit.label
  else edit.label = trimmed
  return touch({ ...plan, areaEdits: { ...plan.areaEdits, [areaId]: edit } }, now)
}

export function toggleAreaHidden(plan: LifeMasteryPlan, areaId: string, now = nowIso()): LifeMasteryPlan {
  const edit = { ...(plan.areaEdits[areaId] ?? {}) }
  if (edit.hidden) delete edit.hidden
  else edit.hidden = true
  return touch({ ...plan, areaEdits: { ...plan.areaEdits, [areaId]: edit } }, now)
}

export function addCustomArea(plan: LifeMasteryPlan, label: string, now = nowIso()): LifeMasteryPlan {
  const trimmed = label.trim()
  if (!trimmed) return plan
  const areaSeq = plan.areaSeq + 1
  const area: SimpleCustomArea = { id: `area${areaSeq}`, label: trimmed, color: CUSTOM_AREA_COLOR }
  return touch({ ...plan, areaSeq, customAreas: [...plan.customAreas, area] }, now)
}

/** Removing a custom area takes its goals with it. Nothing is left orphaned. */
export function removeCustomArea(plan: LifeMasteryPlan, areaId: string, now = nowIso()): LifeMasteryPlan {
  const areaEdits = { ...plan.areaEdits }
  delete areaEdits[areaId]
  return touch({
    ...plan,
    areaEdits,
    customAreas: plan.customAreas.filter((a) => a.id !== areaId),
    goals: plan.goals.filter((g) => g.areaId !== areaId),
  }, now)
}

/**
 * A pasted list, split into one goal per line.
 *
 * Most people arrive with their goals already written in Notes or a journal,
 * and retyping them a line at a time is the reason they never get in. Lists
 * copied from anywhere carry their bullets and numbering with them, so those
 * come off here rather than ending up inside the goal title.
 */
export function splitGoalLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·–]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
}

export function addGoal(plan: LifeMasteryPlan, areaId: string, title: string, now = nowIso()): LifeMasteryPlan {
  const trimmed = title.trim()
  if (!trimmed) return plan
  const goalSeq = plan.goalSeq + 1
  const goal: SimpleGoal = {
    id: `g${goalSeq}`,
    areaId,
    title: trimmed,
    why: "",
    painWhy: "",
    targetDate: null,
    beliefLevel: null,
    desireLevel: null,
    sentence: "",
  }
  return touch({ ...plan, goalSeq, goals: [...plan.goals, goal] }, now)
}

export function updateGoal(plan: LifeMasteryPlan, goalId: string, patch: Partial<Omit<SimpleGoal, "id">>, now = nowIso()): LifeMasteryPlan {
  return touch({ ...plan, goals: plan.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)) }, now)
}

export function removeGoal(plan: LifeMasteryPlan, goalId: string, now = nowIso()): LifeMasteryPlan {
  return touch({ ...plan, goals: plan.goals.filter((g) => g.id !== goalId) }, now)
}

export function goalsForArea(plan: LifeMasteryPlan, areaId: string): SimpleGoal[] {
  return plan.goals.filter((g) => g.areaId === areaId)
}

// ------------------------------------------------------------------ step 3

/** "31 December 2026". No locale, so the tests and the screen agree. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function formatTargetDate(iso: string | null): string {
  if (!iso) return ""
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ""
  const month = MONTHS[Number(m[2]) - 1]
  if (!month) return ""
  return `${Number(m[3])} ${month} ${m[1]}`
}

/**
 * The sentence his template asks for. "I" takes responsibility, "will" makes
 * it a decision, and "easily" changes how it feels to say. The user edits it
 * afterwards, so this only has to be a good first draft.
 */
export function suggestSentence(goal: Pick<SimpleGoal, "title" | "targetDate">): string {
  const title = goal.title.trim()
  if (!title) return ""
  const head = title.charAt(0).toLowerCase() + title.slice(1)
  const by = formatTargetDate(goal.targetDate)
  return by ? `I will easily ${head} by ${by}.` : `I will easily ${head}.`
}

/** What to say under the two sliders. Empty when both clear the bar. */
export function qualifyWarnings(goal: Pick<SimpleGoal, "beliefLevel" | "desireLevel">): string[] {
  const out: string[] = []
  if (goal.beliefLevel != null && goal.beliefLevel < QUALIFY_THRESHOLD) {
    out.push("You believe this below a 7. Shrink the goal until you believe it, then grow it again once it is done.")
  }
  if (goal.desireLevel != null && goal.desireLevel < QUALIFY_THRESHOLD) {
    out.push("You want this below a 7. Write a reason that actually moves you, or take the goal off the list.")
  }
  return out
}

export function goalHasWhy(goal: SimpleGoal): boolean {
  return goal.why.trim().length > 0
}

/** Everything filled in: a why, a cost, a date, both ratings, a sentence. */
export function goalIsQualified(goal: SimpleGoal): boolean {
  return (
    goalHasWhy(goal) &&
    goal.painWhy.trim().length > 0 &&
    !!goal.targetDate &&
    goal.beliefLevel != null &&
    goal.desireLevel != null &&
    goal.sentence.trim().length > 0
  )
}

// ----------------------------------------------------------------- progress

export function planProgress(plan: LifeMasteryPlan): LifeMasteryProgress {
  const visionAnswered = isAnswered(plan, "vision")
  const whyAnswered = isAnswered(plan, "why")
  const rungsAnswered = VISION_RUNGS.filter((r) => isAnswered(plan, r.id)).length
  const goals = plan.goals.length
  const areasWithGoals = new Set(plan.goals.map((g) => g.areaId)).size
  const goalsWithWhy = plan.goals.filter(goalHasWhy).length
  return {
    visionAnswered,
    whyAnswered,
    rungsAnswered,
    goals,
    areasWithGoals,
    goalsWithWhy,
    done: {
      why: visionAnswered && whyAnswered,
      areas: goals > 0,
      goals: goals > 0 && goalsWithWhy === goals,
    },
  }
}
