/**
 * The North Star flow: north star → areas and routines → goals → review.
 *
 * Everything here is pure. The component holds one `NsPlan` in state, calls
 * these to produce the next one, and writes the result to localStorage. No
 * LLM, no API, no database.
 *
 * Kept separate from visionPlanService.ts on purpose. That module runs the
 * whole daily / weekly / monthly system and none of it is wanted here. Kept
 * separate from lifeMasteryService.ts too: that one owns the twelve-area flow
 * preserved at /test/life-mastery-v1, and merging the two would mean one shape
 * carrying both models.
 */

import {
  AREA_COLOR_POOL,
  DEFAULT_AREAS,
  DEFAULT_GOAL_MONTHS,
  DEFAULT_ROUTINE_IDS,
  GOAL_DATE_PRESETS,
  NS_DAILY_WINDOW,
  NS_FLOOR,
  NS_QUALIFY_THRESHOLD,
  NS_SPLITS,
  REVIEW_PROMPTS,
  ROUTINE_BLUEPRINT_MAP,
  ROUTINE_BLUEPRINTS,
  GOAL_TOOL_LINKS,
  STAR_PROMPTS,
  STAR_WHY_ID,
  VALUE_CONFLICTS,
  VALUE_CUES,
  VALUE_ENDS_WORDS,
  VALUES_INTRO,
} from "@/src/goals/data/northStar"
import { AREA_LIBRARY_PILLAR } from "@/src/goals/data/northStar"
import {
  OBJECTIVES,
  SHARED_DRIVERS,
  TARGETS,
  TEMPLATES,
  type FrameworkTarget,
  type Objective,
  type Template,
} from "@/src/goals/data/newGoalFramework"
import { DEFAULT_HORIZON, HORIZON_CHOICES, VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"
import { rungSentences } from "@/src/goals/lifeMasteryService"
// The full lab owns these. Reused rather than reimplemented so the two pages
// cannot drift on what "needs an action" or "which horizon" means.
import { goalNeedsAction as labGoalNeedsAction, goalHorizon as labGoalHorizon } from "@/src/goals/visionPlanService"
import { type Horizon } from "@/src/goals/horizonService"
import type {
  HabitRampStep,
  MilestoneLadderConfig,
  NorthStarTabId,
  NsArea,
  NsAreaReview,
  NsBelief,
  NsCheckpoint,
  NsGoal,
  NsObstacle,
  NsPlan,
  NsProgress,
  NsRoutine,
  NsRoutineStep,
  NsSplitDay,
  RoutineBlueprint,
  RoutineBlueprintStep,
  VisionGoalType,
  VisionHabit,
} from "@/src/goals/types"

// ------------------------------------------------------------------ helpers

const nowIso = () => new Date().toISOString()

/** Every mutation goes through this, so `updatedAt` can never drift. */
function touch(plan: NsPlan, now: string): NsPlan {
  return { ...plan, updatedAt: now }
}

/**
 * Ids come off one monotonic counter. Deriving the next id from the highest id
 * in a list hands a deleted row's id to the next one written, and anything
 * keyed by that id (a React row, an open editor) then shows the dead row's
 * state on the new one.
 */
function nextId(plan: NsPlan, prefix: string): { plan: NsPlan; id: string } {
  const seq = plan.seq + 1
  return { plan: { ...plan, seq }, id: `${prefix}${seq}` }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

/** Local date, not UTC. A rating made at 11pm belongs to the day you made it. */
export function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * The same day N months later, clamped to the end of a short month.
 *
 * Date arithmetic by adding days would put "six months" on a different day of
 * the month depending on which six months, and the goal reads as "by the 30th"
 * to a human. `setUTCMonth` alone rolls 31 January + 1 month into 3 March, which
 * is a date nobody picked, so the day is clamped down instead.
 */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return target.toISOString().slice(0, 10)
}

/** The 31st of December of whatever year `iso` falls in. */
export function endOfYearISO(iso: string): string {
  return `${iso.slice(0, 4)}-12-31`
}

/**
 * The date a brand new goal arrives carrying.
 *
 * Every goal gets one. A goal with no date is a wish, and a library or template
 * pick that lands dateless makes the user open a calendar for each of nine
 * goals before any of them mean anything. A year out is his own default horizon
 * ("typically a year or less; when you go beyond a year it becomes a lot harder
 * to manage and measure") and is the number people adjust rather than the one
 * they have to invent from nothing.
 */
export function defaultGoalDate(today = todayISO()): string {
  return addMonthsISO(today, DEFAULT_GOAL_MONTHS)
}

/** The date behind one of the quick chips. `months: null` means end of year. */
export function presetDate(presetId: string, today = todayISO()): string | null {
  const preset = GOAL_DATE_PRESETS.find((p) => p.id === presetId)
  if (!preset) return null
  return preset.months == null ? endOfYearISO(today) : addMonthsISO(today, preset.months)
}

/** Which quick chip, if any, a goal's date currently sits on. */
export function matchingDatePreset(date: string | null, today = todayISO()): string | null {
  if (!date) return null
  return GOAL_DATE_PRESETS.find((p) => presetDate(p.id, today) === date)?.id ?? null
}

// ------------------------------------------------------------------- defaults

/** A blueprint's starting steps, in the order the blueprint lists them. */
function seedSteps(bp: RoutineBlueprint): NsRoutineStep[] {
  return bp.defaultStepIds
    .map((id) => bp.library.find((s) => s.id === id))
    .filter((s): s is RoutineBlueprintStep => !!s)
    .map((s) => ({ id: s.id, title: s.title, minutes: s.minutes, daysPerWeek: s.daysPerWeek, dimension: s.dimension }))
}

/** The split a training week arrives with, and how many days that split runs. */
function seedSplit(bp: RoutineBlueprint, startSeq: number): { days: NsSplitDay[]; daysPerWeek: number; seq: number } {
  const split = bp.defaultSplitId ? NS_SPLITS.find((s) => s.id === bp.defaultSplitId) : undefined
  if (!split) return { days: [], daysPerWeek: bp.daysPerWeek, seq: startSeq }
  let seq = startSeq
  const days = split.days.map((name) => {
    seq += 1
    return { id: `d${seq}`, name }
  })
  return { days, daysPerWeek: clamp(split.perWeek, 1, 7), seq }
}

/**
 * A routine as it arrives: named, filed under an area, and already carrying a
 * stack of steps. A card that opens empty is a second blank page, and nobody
 * builds a morning routine from nothing at the moment they first meet the idea.
 * Everything here is editable, and "clear" empties it in one click.
 */
function seedRoutine(bp: RoutineBlueprint, startSeq: number, areaIds: Set<string>): { routine: NsRoutine; seq: number } {
  let seq = startSeq + 1
  const id = `r${seq}`
  const split = seedSplit(bp, seq)
  seq = split.seq
  return {
    routine: {
      id,
      label: bp.label,
      blueprintId: bp.id,
      kind: bp.kind,
      areaId: bp.areaSeedId && areaIds.has(bp.areaSeedId) ? bp.areaSeedId : null,
      serves: bp.servesAreaIds.filter((id) => areaIds.has(id) && id !== bp.areaSeedId),
      steps: seedSteps(bp),
      daysPerWeek: split.daysPerWeek,
      splitDays: split.days,
    },
    seq,
  }
}

export function emptyNsPlan(): NsPlan {
  const areas = DEFAULT_AREAS.map((a) => ({ ...a }))
  const areaIds = new Set(areas.map((a) => a.id))
  let seq = 0
  const routines: NsRoutine[] = DEFAULT_ROUTINE_IDS.map((blueprintId) => {
    const bp = ROUTINE_BLUEPRINT_MAP.get(blueprintId)
    if (!bp) throw new Error(`Unknown routine blueprint "${blueprintId}"`)
    const seeded = seedRoutine(bp, seq, areaIds)
    seq = seeded.seq
    return seeded.routine
  })
  return {
    version: 1,
    horizonYears: DEFAULT_HORIZON,
    northStar: "",
    rungs: {},
    areas,
    routines,
    goals: [],
    review: {},
    answers: {},
    currentValues: [],
    values: [],
    priorityIds: [],
    seasonFocusId: null,
    daily: {},
    seq,
    updatedAt: null,
  }
}

export function emptyAreaReview(): NsAreaReview {
  return { ten: "", snapshot: "", fortnight: null, goalsAim: null, blockers: "", values: [], identity: "" }
}

/** The shape defaults a goal gets when it is created or flipped to a type. */
export function defaultsForType(type: VisionGoalType): Pick<NsGoal, "unit" | "ladder" | "daysPerWeek" | "rampSteps" | "checkpoints"> {
  if (type === "milestone_ladder") {
    // controlPoints and pins are spelled out rather than left off. The loader
    // fills them in, so a ladder created without them would come back from
    // localStorage a different object than the one that went in.
    return {
      unit: "",
      ladder: { start: 0, target: 100, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
      daysPerWeek: 3,
      rampSteps: null,
      checkpoints: [],
    }
  }
  if (type === "habit_ramp") {
    return { unit: "", ladder: null, daysPerWeek: 3, rampSteps: null, checkpoints: [] }
  }
  return { unit: "", ladder: null, daysPerWeek: 3, rampSteps: null, checkpoints: [] }
}

// ------------------------------------------------------------------- storage

export function serializeNsPlan(plan: NsPlan): string {
  return JSON.stringify(plan)
}

/**
 * Read a saved plan. Returns null when there is nothing readable, and the
 * caller starts from an empty plan. Anything pointing at an area that no
 * longer exists is dropped rather than carried forward, because a goal no area
 * owns cannot be rendered anywhere.
 */
export function loadNsPlan(raw: string | null): NsPlan | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const obj = parsed as Record<string, unknown>

  const areas: NsArea[] = Array.isArray(obj.areas)
    ? (obj.areas as unknown[])
        .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
        .filter((a) => typeof a.id === "string" && typeof a.label === "string")
        .map((a) => ({
          id: String(a.id),
          label: String(a.label),
          sublabel: stringOr(a.sublabel, ""),
          color: stringOr(a.color, AREA_COLOR_POOL[0]),
          custom: a.custom === true,
        }))
    : []
  // A plan with no areas has no wheel and nowhere to put a goal.
  const resolvedAreas = areas.length > 0 ? areas : DEFAULT_AREAS.map((a) => ({ ...a }))
  const areaIds = new Set(resolvedAreas.map((a) => a.id))

  const routines: NsRoutine[] = Array.isArray(obj.routines)
    ? (obj.routines as unknown[])
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .filter((r) => typeof r.id === "string" && typeof r.blueprintId === "string")
        .filter((r) => ROUTINE_BLUEPRINT_MAP.has(String(r.blueprintId)))
        .map((r) => {
          const bp = ROUTINE_BLUEPRINT_MAP.get(String(r.blueprintId))!
          const areaId = typeof r.areaId === "string" && areaIds.has(r.areaId) ? r.areaId : null
          return {
            id: String(r.id),
            label: stringOr(r.label, bp.label),
            blueprintId: bp.id,
            kind: bp.kind,
            areaId,
            // A save written before this field existed gets the blueprint's own
            // reach rather than nothing, so an old plan gains the cross-area
            // view instead of looking like the user cleared it.
            serves: (Array.isArray(r.serves) ? readStringList(r.serves) : bp.servesAreaIds).filter(
              (id) => areaIds.has(id) && id !== areaId,
            ),
            steps: Array.isArray(r.steps)
              ? (r.steps as unknown[])
                  .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
                  .filter((s) => typeof s.id === "string" && typeof s.title === "string")
                  .map((s) => ({
                    id: String(s.id),
                    title: String(s.title),
                    minutes: Math.max(0, numberOr(s.minutes, 5)),
                    daysPerWeek: clamp(numberOr(s.daysPerWeek, 7), 1, 7),
                    dimension: s.dimension === "mind" || s.dimension === "body" || s.dimension === "spirit" ? s.dimension : null,
                  }))
              : [],
            daysPerWeek: clamp(numberOr(r.daysPerWeek, bp.daysPerWeek), 1, 7),
            splitDays: Array.isArray(r.splitDays)
              ? (r.splitDays as unknown[])
                  .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
                  .filter((d) => typeof d.id === "string" && typeof d.name === "string")
                  .map((d) => ({ id: String(d.id), name: String(d.name) }))
              : [],
          }
        })
    : []

  const goals: NsGoal[] = Array.isArray(obj.goals)
    ? (obj.goals as unknown[])
        .filter((g): g is Record<string, unknown> => !!g && typeof g === "object")
        .filter((g) => typeof g.id === "string" && typeof g.title === "string" && typeof g.areaId === "string")
        .filter((g) => areaIds.has(String(g.areaId)))
        .map((g) => readGoal(g))
    : []
  // Links to goals or areas that did not survive the load would render as
  // dangling chips. `serves` is filtered here rather than in `readGoal`, which
  // has no idea which areas exist.
  const goalIds = new Set(goals.map((g) => g.id))
  const linkedGoals = goals.map((g) => ({
    ...g,
    feedsGoalIds: g.feedsGoalIds.filter((id) => goalIds.has(id)),
    serves: g.serves.filter((id) => areaIds.has(id) && id !== g.areaId),
  }))

  const review: Record<string, NsAreaReview> = {}
  if (obj.review && typeof obj.review === "object") {
    for (const [k, v] of Object.entries(obj.review as Record<string, unknown>)) {
      if (!areaIds.has(k) || !v || typeof v !== "object") continue
      const r = v as Record<string, unknown>
      review[k] = {
        ten: stringOr(r.ten, ""),
        snapshot: stringOr(r.snapshot, ""),
        fortnight: typeof r.fortnight === "number" ? clamp(r.fortnight, 0, 10) : null,
        goalsAim: r.goalsAim === "yes" || r.goalsAim === "no" ? r.goalsAim : null,
        blockers: stringOr(r.blockers, ""),
        values: readStringList(r.values),
        identity: stringOr(r.identity, ""),
      }
    }
  }

  const knownAnswers = new Set([...STAR_PROMPTS, ...REVIEW_PROMPTS].map((p) => p.id))
  const answers: Record<string, string> = {}
  if (obj.answers && typeof obj.answers === "object") {
    for (const [k, v] of Object.entries(obj.answers as Record<string, unknown>)) {
      if (knownAnswers.has(k) && typeof v === "string") answers[k] = v
    }
  }

  const daily: Record<string, Record<string, number>> = {}
  if (obj.daily && typeof obj.daily === "object") {
    for (const [date, v] of Object.entries(obj.daily as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !v || typeof v !== "object") continue
      const row: Record<string, number> = {}
      for (const [areaId, score] of Object.entries(v as Record<string, unknown>)) {
        if (areaIds.has(areaId) && typeof score === "number") row[areaId] = clamp(score, 0, 10)
      }
      if (Object.keys(row).length > 0) daily[date] = row
    }
  }

  const rungIds = new Set(VISION_RUNGS.map((r) => r.id))
  const rungs: Record<string, string> = {}
  if (obj.rungs && typeof obj.rungs === "object") {
    for (const [k, v] of Object.entries(obj.rungs as Record<string, unknown>)) {
      if (rungIds.has(k) && typeof v === "string") rungs[k] = v
    }
  }

  /**
   * Priority order, repaired rather than trusted.
   *
   * The invariant is that it covers every goal exactly once, and the full lab
   * treats a violation as fatal because its state came from a schema-checked
   * save. Here it came from a browser someone may have cleared halfway, so a
   * mismatch loses the ranking at worst, never the goals: known ids keep their
   * order, unknown ones go, and any goal missing from the list is appended.
   */
  const goalIdSet = new Set(linkedGoals.map((g) => g.id))
  const savedOrder = readStringList(obj.priorityIds).filter((id) => goalIdSet.has(id))
  const seenInOrder = new Set(savedOrder)
  const priorityIds = [...savedOrder, ...linkedGoals.filter((g) => !seenInOrder.has(g.id)).map((g) => g.id)]

  const ids = [...resolvedAreas.map((a) => a.id), ...routines.map((r) => r.id), ...linkedGoals.map((g) => g.id)]

  return {
    version: 1,
    horizonYears: HORIZON_CHOICES.includes(obj.horizonYears as (typeof HORIZON_CHOICES)[number])
      ? (obj.horizonYears as number)
      : DEFAULT_HORIZON,
    northStar: stringOr(obj.northStar, ""),
    rungs,
    areas: resolvedAreas,
    routines,
    goals: linkedGoals,
    review,
    answers,
    currentValues: readStringList(obj.currentValues),
    values: readStringList(obj.values),
    priorityIds,
    // Points at a goal or an area. Anything else, including a goal deleted
    // since, drops to null rather than leaving the banner naming nothing.
    seasonFocusId:
      typeof obj.seasonFocusId === "string" && (goalIdSet.has(obj.seasonFocusId) || areaIds.has(obj.seasonFocusId))
        ? obj.seasonFocusId
        : null,
    daily,
    // A save written before the counter existed, or edited by hand, still must
    // never hand out an id that is already in use.
    seq: Math.max(numberOr(obj.seq, 0), highestSeq(ids)),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : null,
  }
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value) ? (value as unknown[]).filter((v): v is string => typeof v === "string") : []
}

function readGoal(g: Record<string, unknown>): NsGoal {
  const type: VisionGoalType =
    g.type === "milestone_ladder" || g.type === "habit_ramp" || g.type === "achievement" ? g.type : "achievement"
  const ladder = g.ladder && typeof g.ladder === "object" ? (g.ladder as Record<string, unknown>) : null
  return {
    id: String(g.id),
    areaId: String(g.areaId),
    title: String(g.title),
    type,
    why: stringOr(g.why, ""),
    painWhy: stringOr(g.painWhy, ""),
    sentence: stringOr(g.sentence, ""),
    targetDate: typeof g.targetDate === "string" ? g.targetDate : null,
    beliefLevel: typeof g.beliefLevel === "number" ? clamp(g.beliefLevel, 0, 10) : null,
    desireLevel: typeof g.desireLevel === "number" ? clamp(g.desireLevel, 0, 10) : null,
    unit: stringOr(g.unit, ""),
    ladder:
      ladder && type === "milestone_ladder"
        ? {
            start: numberOr(ladder.start, 0),
            target: numberOr(ladder.target, 100),
            steps: clamp(numberOr(ladder.steps, 5), 2, 20),
            curveTension: numberOr(ladder.curveTension, 0),
            controlPoints: Array.isArray(ladder.controlPoints)
              ? (ladder.controlPoints as unknown[])
                  .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
                  .map((p) => ({ x: numberOr(p.x, 0), y: numberOr(p.y, 0) }))
              : [],
            pins: Array.isArray(ladder.pins)
              ? (ladder.pins as unknown[])
                  .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
                  .map((p) => ({ step: numberOr(p.step, 0), value: numberOr(p.value, 0) }))
              : [],
          }
        : null,
    daysPerWeek: clamp(numberOr(g.daysPerWeek, 3), 1, 7),
    rampSteps: Array.isArray(g.rampSteps)
      ? (g.rampSteps as unknown[])
          .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
          .map((r) => ({
            frequencyPerWeek: clamp(numberOr(r.frequencyPerWeek, 3), 1, 30),
            durationWeeks: clamp(numberOr(r.durationWeeks, 4), 1, 52),
          }))
      : null,
    checkpoints: Array.isArray(g.checkpoints)
      ? (g.checkpoints as unknown[])
          .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
          .filter((c) => typeof c.id === "string" && typeof c.title === "string")
          .map((c) => ({ id: String(c.id), title: String(c.title), done: c.done === true }))
      : [],
    habits: Array.isArray(g.habits)
      ? (g.habits as unknown[])
          .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
          .filter((h) => typeof h.id === "string" && typeof h.title === "string")
          .map((h) => ({ id: String(h.id), title: String(h.title), daysPerWeek: clamp(numberOr(h.daysPerWeek, 3), 1, 7) }))
      : [],
    reasonsList: readStringList(g.reasonsList),
    feeling: stringOr(g.feeling, ""),
    feedsGoalIds: readStringList(g.feedsGoalIds),
    reward: stringOr(g.reward, ""),
    stake: stringOr(g.stake, ""),
    obstacles: Array.isArray(g.obstacles)
      ? (g.obstacles as unknown[])
          .filter((o): o is Record<string, unknown> => !!o && typeof o === "object")
          .filter((o) => typeof o.id === "string")
          .map((o) => ({ id: String(o.id), what: stringOr(o.what, ""), counter: stringOr(o.counter, "") }))
      : [],
    beliefs: Array.isArray(g.beliefs)
      ? (g.beliefs as unknown[])
          .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
          .filter((b) => typeof b.id === "string")
          .map((b) => ({
            id: String(b.id),
            old: stringOr(b.old, ""),
            useful: b.useful === true ? true : b.useful === false ? false : null,
            evidence: stringOr(b.evidence, ""),
            replacement: stringOr(b.replacement, ""),
          }))
      : [],
    values: readStringList(g.values),
    // Only "daily_area" exists, and only a target goal has a number to read
    // into. Anything else loads as self-tracked rather than throwing, because
    // this came out of a browser.
    metric: g.metric === "daily_area" && type === "milestone_ladder" ? "daily_area" : null,
    serves: readStringList(g.serves),
  }
}

function highestSeq(ids: string[]): number {
  let max = 0
  for (const id of ids) {
    const m = /^[a-z]+(\d+)$/.exec(id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(n)))
}

// -------------------------------------------------------------------- tab 1

export function setNorthStar(plan: NsPlan, text: string, now = nowIso()): NsPlan {
  return touch({ ...plan, northStar: text }, now)
}

export function setHorizon(plan: NsPlan, years: number, now = nowIso()): NsPlan {
  if (!HORIZON_CHOICES.includes(years as (typeof HORIZON_CHOICES)[number])) return plan
  return touch({ ...plan, horizonYears: years }, now)
}

export function setRung(plan: NsPlan, rungId: string, text: string, now = nowIso()): NsPlan {
  return touch({ ...plan, rungs: { ...plan.rungs, [rungId]: text } }, now)
}

export function rungAnswer(plan: NsPlan, rungId: string): string {
  return plan.rungs[rungId] ?? ""
}

/**
 * Every answered rung, in order, as one paragraph.
 *
 * `rungSentences` is shared with the twelve-area flow, and the point of it is
 * that nothing lands in the paragraph the user did not watch go into a box.
 */
export function assembleFromRungs(plan: NsPlan): string {
  return VISION_RUNGS.flatMap((rung) => rungSentences(rung.lead, rungAnswer(plan, rung.id))).join(" ")
}

export function rungsAnswered(plan: NsPlan): number {
  return VISION_RUNGS.filter((r) => rungAnswer(plan, r.id).trim().length > 0).length
}

/**
 * How many questions in the "who you would have to become" card are answered.
 *
 * The values list counts as one of them, so the count matches what is on the
 * screen rather than only the boxes made of text. The why is left out because
 * it sits in its own card above, and a count that includes something outside
 * the card it is printed on is a count nobody can reconcile.
 */
export function starWorkAnswered(plan: NsPlan): number {
  const written = starWorkPrompts().filter((p) => answerOf(plan, p.id).trim().length > 0).length
  return written + (plan.values.length > 0 ? 1 : 0)
}

/** The questions in that card, plus the values list. */
export function starWorkTotal(): number {
  return starWorkPrompts().length + 1
}

function starWorkPrompts() {
  return STAR_PROMPTS.filter((p) => p.id !== STAR_WHY_ID)
}

/** Anything at all written under the paragraph, the why included. */
export function starWorkWritten(plan: NsPlan): boolean {
  return plan.values.length > 0 || STAR_PROMPTS.some((p) => answerOf(plan, p.id).trim().length > 0)
}

// -------------------------------------------------------------------- areas

export function addArea(plan: NsPlan, label: string, now = nowIso()): NsPlan {
  const trimmed = label.trim()
  if (!trimmed) return plan
  const { plan: withSeq, id } = nextId(plan, "a")
  const color = AREA_COLOR_POOL[plan.areas.filter((a) => a.custom).length % AREA_COLOR_POOL.length]
  const area: NsArea = { id, label: trimmed, sublabel: "", color, custom: true }
  return touch({ ...withSeq, areas: [...withSeq.areas, area] }, now)
}

export function updateArea(plan: NsPlan, areaId: string, patch: Partial<Omit<NsArea, "id" | "custom">>, now = nowIso()): NsPlan {
  return touch({ ...plan, areas: plan.areas.map((a) => (a.id === areaId ? { ...a, ...patch } : a)) }, now)
}

/**
 * Remove an area. Its goals move to the first area left standing rather than
 * being deleted with it: a goal is work somebody wrote down, and losing it
 * because a wheel segment was tidied away is not a trade anyone would make.
 * Routines pointing at the area go back to serving all of them.
 *
 * The last area cannot be removed. With none left there is no wheel, nowhere
 * to file a goal, and nothing to rate.
 */
export function removeArea(plan: NsPlan, areaId: string, now = nowIso()): NsPlan {
  if (plan.areas.length <= 1) return plan
  const remaining = plan.areas.filter((a) => a.id !== areaId)
  if (remaining.length === plan.areas.length) return plan
  const fallback = remaining[0].id
  const review = { ...plan.review }
  delete review[areaId]
  const daily: Record<string, Record<string, number>> = {}
  for (const [date, row] of Object.entries(plan.daily)) {
    const next = { ...row }
    delete next[areaId]
    if (Object.keys(next).length > 0) daily[date] = next
  }
  return touch({
    ...plan,
    areas: remaining,
    goals: plan.goals.map((g) => (g.areaId === areaId ? { ...g, areaId: fallback } : g)),
    routines: plan.routines.map((r) => (r.areaId === areaId ? { ...r, areaId: null } : r)),
    review,
    daily,
  }, now)
}

/** How many goals would move if this area were removed. Shown before it is. */
export function goalsInArea(plan: NsPlan, areaId: string): NsGoal[] {
  return plan.goals.filter((g) => g.areaId === areaId)
}

export function areaById(plan: NsPlan, areaId: string): NsArea | undefined {
  return plan.areas.find((a) => a.id === areaId)
}

// ------------------------------------------------------------------ routines

/** Adds a routine already carrying its starting stack, same as the seeded three. */
export function addRoutine(plan: NsPlan, blueprintId: string, now = nowIso()): NsPlan {
  const bp = ROUTINE_BLUEPRINT_MAP.get(blueprintId)
  if (!bp) return plan
  const areaIds = new Set(plan.areas.map((a) => a.id))
  const { routine, seq } = seedRoutine(bp, plan.seq, areaIds)
  return touch({ ...plan, seq, routines: [...plan.routines, routine] }, now)
}

export function removeRoutine(plan: NsPlan, routineId: string, now = nowIso()): NsPlan {
  return touch({ ...plan, routines: plan.routines.filter((r) => r.id !== routineId) }, now)
}

export function updateRoutine(plan: NsPlan, routineId: string, patch: Partial<Omit<NsRoutine, "id" | "blueprintId" | "kind">>, now = nowIso()): NsPlan {
  return touch({ ...plan, routines: plan.routines.map((r) => (r.id === routineId ? { ...r, ...patch } : r)) }, now)
}

function withRoutine(plan: NsPlan, routineId: string, fn: (r: NsRoutine) => NsRoutine, now: string): NsPlan {
  return touch({ ...plan, routines: plan.routines.map((r) => (r.id === routineId ? fn(r) : r)) }, now)
}

/** Toggle a library step in or out. Library ids are stable, so this is an id test. */
export function toggleRoutineStep(plan: NsPlan, routineId: string, stepId: string, now = nowIso()): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const bp = ROUTINE_BLUEPRINT_MAP.get(routine.blueprintId)
  const item = bp?.library.find((s) => s.id === stepId)
  if (!item) return plan
  const has = routine.steps.some((s) => s.id === stepId)
  return withRoutine(plan, routineId, (r) => ({
    ...r,
    steps: has
      ? r.steps.filter((s) => s.id !== stepId)
      : [...r.steps, { id: item.id, title: item.title, minutes: item.minutes, daysPerWeek: item.daysPerWeek, dimension: item.dimension }],
  }), now)
}

export function addCustomStep(plan: NsPlan, routineId: string, title: string, minutes: number, daysPerWeek: number, now = nowIso()): NsPlan {
  const trimmed = title.trim()
  if (!trimmed) return plan
  const { plan: withSeq, id } = nextId(plan, "s")
  const step: NsRoutineStep = { id, title: trimmed, minutes: Math.max(0, Math.round(minutes)), daysPerWeek: clamp(daysPerWeek, 1, 7), dimension: null }
  return withRoutine(withSeq, routineId, (r) => ({ ...r, steps: [...r.steps, step] }), now)
}

export function removeStep(plan: NsPlan, routineId: string, stepId: string, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => ({ ...r, steps: r.steps.filter((s) => s.id !== stepId) }), now)
}

export function updateStep(plan: NsPlan, routineId: string, stepId: string, patch: Partial<Omit<NsRoutineStep, "id">>, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => ({
    ...r,
    steps: r.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
  }), now)
}

/** The order IS the routine, so moving a step is a first-class action. */
export function moveStep(plan: NsPlan, routineId: string, index: number, dir: -1 | 1, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => ({ ...r, steps: moveInList(r.steps, index, dir) }), now)
}

function moveInList<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const to = index + dir
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(to, 0, item)
  return next
}

/** Apply a preset. Replaces the stack, because a preset is an order. */
export function applyRoutinePreset(plan: NsPlan, routineId: string, presetId: string, now = nowIso()): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const bp = ROUTINE_BLUEPRINT_MAP.get(routine.blueprintId)
  const ids = bp?.presets.find((p) => p.id === presetId)?.stepIds
  if (!bp || !ids) return plan
  const steps = ids
    .map((id) => bp.library.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ id: s.id, title: s.title, minutes: s.minutes, daysPerWeek: s.daysPerWeek, dimension: s.dimension }))
  return withRoutine(plan, routineId, (r) => ({ ...r, steps }), now)
}

export function clearRoutineSteps(plan: NsPlan, routineId: string, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => ({ ...r, steps: [] }), now)
}

export function applySplit(plan: NsPlan, routineId: string, splitId: string, now = nowIso()): NsPlan {
  const split = NS_SPLITS.find((s) => s.id === splitId)
  if (!split) return plan
  let next = plan
  const days: NsSplitDay[] = []
  for (const name of split.days) {
    const { plan: withSeq, id } = nextId(next, "d")
    next = withSeq
    days.push({ id, name })
  }
  return withRoutine(next, routineId, (r) => ({ ...r, splitDays: days, daysPerWeek: clamp(split.perWeek, 1, 7) }), now)
}

export function addSplitDay(plan: NsPlan, routineId: string, now = nowIso()): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const { plan: withSeq, id } = nextId(plan, "d")
  const name = `Day ${String.fromCharCode(65 + routine.splitDays.length)}`
  return withRoutine(withSeq, routineId, (r) => ({ ...r, splitDays: [...r.splitDays, { id, name }] }), now)
}

export function renameSplitDay(plan: NsPlan, routineId: string, dayId: string, name: string, now = nowIso()): NsPlan {
  const trimmed = name.trim()
  if (!trimmed) return plan
  return withRoutine(plan, routineId, (r) => ({
    ...r,
    splitDays: r.splitDays.map((d) => (d.id === dayId ? { ...d, name: trimmed } : d)),
  }), now)
}

export function moveSplitDay(plan: NsPlan, routineId: string, index: number, dir: -1 | 1, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => ({ ...r, splitDays: moveInList(r.splitDays, index, dir) }), now)
}

export function removeSplitDay(plan: NsPlan, routineId: string, dayId: string, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => (r.splitDays.length <= 1 ? r : { ...r, splitDays: r.splitDays.filter((d) => d.id !== dayId) }), now)
}

export function clearSplit(plan: NsPlan, routineId: string, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => ({ ...r, splitDays: [] }), now)
}

export function routineMinutes(routine: NsRoutine): number {
  return routine.steps.reduce((sum, s) => sum + s.minutes, 0)
}

/** Mind, body and spirit. The floor is to touch all three, even a minute each. */
export function routineCoverage(routine: NsRoutine): { mind: boolean; body: boolean; spirit: boolean } {
  const seen = new Set(routine.steps.map((s) => s.dimension).filter(Boolean))
  return { mind: seen.has("mind"), body: seen.has("body"), spirit: seen.has("spirit") }
}

/** The one-line summary on a collapsed routine card. */
export function routineSummary(routine: NsRoutine): string {
  if (routine.steps.length === 0) {
    // A named training week with no exercises in it is not "nothing yet". The
    // split IS the work on that card, and saying otherwise reads as data loss.
    if (routine.splitDays.length > 0) {
      return `${routine.splitDays.map((d) => d.name).join(" · ")}, ${routine.daysPerWeek} ${routine.daysPerWeek === 1 ? "day" : "days"} a week`
    }
    return "Nothing in it yet"
  }
  const n = `${routine.steps.length} ${routine.steps.length === 1 ? "step" : "steps"}`
  if (routine.kind === "sequence") {
    return `${n}, about ${routineMinutes(routine)} min, ${routine.daysPerWeek} ${routine.daysPerWeek === 1 ? "day" : "days"} a week`
  }
  const sessions = routine.steps.reduce((sum, s) => sum + s.daysPerWeek, 0)
  return `${n}, ${sessions} sessions a week`
}

/**
 * Is this routine still exactly as it arrived?
 *
 * The routines ship pre-filled, so "this routine has steps in it" stopped
 * meaning "you have done the work here". This is the honest test: nothing on
 * the card has been changed from the template yet.
 */
export function routineIsUntouched(routine: NsRoutine): boolean {
  const bp = ROUTINE_BLUEPRINT_MAP.get(routine.blueprintId)
  if (!bp) return false
  const seeded = seedSplit(bp, 0)
  return (
    routine.label === bp.label &&
    routine.areaId === bp.areaSeedId &&
    routine.daysPerWeek === seeded.daysPerWeek &&
    routine.steps.map((s) => s.id).join(" ") === bp.defaultStepIds.join(" ") &&
    routine.splitDays.map((d) => d.name).join(" ") === seeded.days.map((d) => d.name).join(" ")
  )
}

/**
 * Has the user shaped the areas tab at all, or is every word on it still ours?
 *
 * Drives the tick in the rail. A tab that ticks itself green before the user
 * has looked at it is worse than no tick, so this asks whether anything on the
 * screen is theirs: an area renamed, added or removed, or any routine edited.
 */
export function areasTouched(plan: NsPlan): boolean {
  const areasChanged =
    plan.areas.length !== DEFAULT_AREAS.length ||
    plan.areas.some((a) => {
      const seed = DEFAULT_AREAS.find((d) => d.id === a.id)
      return !seed || seed.label !== a.label || seed.sublabel !== a.sublabel
    })
  const routinesChanged =
    plan.routines.length !== DEFAULT_ROUTINE_IDS.length ||
    plan.routines.some((r, i) => r.blueprintId !== DEFAULT_ROUTINE_IDS[i] || !routineIsUntouched(r))
  return areasChanged || routinesChanged
}

/** Which training day lands on which slot of the week. */
export function splitPreview(routine: NsRoutine): Array<{ slot: number; dayName: string }> {
  if (routine.splitDays.length === 0) return []
  return Array.from({ length: routine.daysPerWeek }, (_, i) => ({
    slot: i,
    dayName: routine.splitDays[i % routine.splitDays.length].name,
  }))
}

// -------------------------------------------------------------------- goals

export function addGoal(plan: NsPlan, areaId: string, title: string, type: VisionGoalType = "achievement", now = nowIso()): NsPlan {
  const trimmed = title.trim()
  if (!trimmed) return plan
  if (!plan.areas.some((a) => a.id === areaId)) return plan
  const { plan: withSeq, id } = nextId(plan, "g")
  const goal: NsGoal = {
    id,
    areaId,
    title: trimmed,
    type,
    why: "",
    painWhy: "",
    sentence: "",
    // Dated on arrival, a year out. Derived from `now` rather than read off the
    // clock again, so a test or a template run that pins the time gets one
    // consistent date across every goal it creates. Read through `todayISO`,
    // which uses the local calendar day: slicing the UTC string would date a
    // goal created at 9pm in Vancouver from tomorrow.
    targetDate: defaultGoalDate(todayISO(new Date(now))),
    beliefLevel: null,
    desireLevel: null,
    ...defaultsForType(type),
    habits: [],
    reasonsList: [],
    feeling: "",
    feedsGoalIds: [],
    reward: "",
    stake: "",
    obstacles: [],
    beliefs: [],
    values: [],
    metric: null,
    serves: [],
  }
  // Appended, so a new goal is the lowest priority until you say otherwise.
  // Nothing already ranked gets renumbered by someone else's arrival.
  return touch({ ...withSeq, goals: [...withSeq.goals, goal], priorityIds: [...withSeq.priorityIds, id] }, now)
}

export function updateGoal(plan: NsPlan, goalId: string, patch: Partial<Omit<NsGoal, "id">>, now = nowIso()): NsPlan {
  return touch({ ...plan, goals: plan.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)) }, now)
}

/**
 * Flip a goal's shape.
 *
 * The shape a goal was typed as at birth used to be frozen forever, which is
 * the loudest thing that can be wrong with a goal editor. Fields belonging to
 * the shape being left are kept rather than wiped, so flipping back and forth
 * to look at the controls does not cost the numbers already typed.
 */
export function setGoalType(plan: NsPlan, goalId: string, type: VisionGoalType, now = nowIso()): NsPlan {
  return touch({
    ...plan,
    goals: plan.goals.map((g) => {
      if (g.id !== goalId) return g
      if (g.type === type) return g
      const defaults = defaultsForType(type)
      return {
        ...g,
        type,
        // Only fill in what the new shape needs and the goal does not have.
        ladder: type === "milestone_ladder" ? (g.ladder ?? defaults.ladder) : g.ladder,
        checkpoints: g.checkpoints,
        rampSteps: g.rampSteps,
      }
    }),
  }, now)
}

export function removeGoal(plan: NsPlan, goalId: string, now = nowIso()): NsPlan {
  return touch({
    ...plan,
    goals: plan.goals
      .filter((g) => g.id !== goalId)
      .map((g) => (g.feedsGoalIds.includes(goalId) ? { ...g, feedsGoalIds: g.feedsGoalIds.filter((id) => id !== goalId) } : g)),
    priorityIds: plan.priorityIds.filter((id) => id !== goalId),
  }, now)
}

export function setLadder(plan: NsPlan, goalId: string, ladder: MilestoneLadderConfig, now = nowIso()): NsPlan {
  return updateGoal(plan, goalId, { ladder }, now)
}

export function setRamp(plan: NsPlan, goalId: string, rampSteps: HabitRampStep[] | null, now = nowIso()): NsPlan {
  return updateGoal(plan, goalId, { rampSteps }, now)
}

/** Would "from feeds to" close a loop? Depth-first forward from `to`. */
export function wouldCycle(goals: NsGoal[], fromId: string, toId: string): boolean {
  if (fromId === toId) return true
  const byId = new Map(goals.map((g) => [g.id, g]))
  const seen = new Set<string>()
  const walk = (id: string): boolean => {
    if (id === fromId) return true
    if (seen.has(id)) return false
    seen.add(id)
    return (byId.get(id)?.feedsGoalIds ?? []).some(walk)
  }
  return walk(toId)
}

/**
 * Link a goal to a bigger one it feeds. Cross-area links are the point: a sleep
 * habit feeding a revenue target is exactly the connection worth seeing.
 * A link that would close a loop is refused, because a cyclic plan renders as
 * nothing anybody can read.
 */
export function linkGoal(plan: NsPlan, fromId: string, toId: string, now = nowIso()): NsPlan {
  const from = plan.goals.find((g) => g.id === fromId)
  const to = plan.goals.find((g) => g.id === toId)
  if (!from || !to) return plan
  if (from.feedsGoalIds.includes(toId)) return plan
  if (wouldCycle(plan.goals, fromId, toId)) return plan
  return updateGoal(plan, fromId, { feedsGoalIds: [...from.feedsGoalIds, toId] }, now)
}

export function unlinkGoal(plan: NsPlan, fromId: string, toId: string, now = nowIso()): NsPlan {
  const from = plan.goals.find((g) => g.id === fromId)
  if (!from) return plan
  return updateGoal(plan, fromId, { feedsGoalIds: from.feedsGoalIds.filter((id) => id !== toId) }, now)
}

/** The goals that feed this one. Two or more of them and it IS a project. */
export function subGoalsOf(plan: NsPlan, goalId: string): NsGoal[] {
  return plan.goals.filter((g) => g.feedsGoalIds.includes(goalId))
}

// -- priority ----------------------------------------------------------------

/** Every goal in priority order, highest first. */
export function goalsByPriority(plan: NsPlan): NsGoal[] {
  const byId = new Map(plan.goals.map((g) => [g.id, g]))
  return plan.priorityIds.map((id) => byId.get(id)).filter((g): g is NsGoal => !!g)
}

/** A goal's rank, 1-based, or null when it somehow is not in the order. */
export function goalRank(plan: NsPlan, goalId: string): number | null {
  const i = plan.priorityIds.indexOf(goalId)
  return i === -1 ? null : i + 1
}

/**
 * Move a goal to a given 1-based rank, shifting everything between.
 *
 * Out-of-range ranks are clamped rather than refused, because the badge is a
 * number field: typing 99 into it means "put this last", and rejecting the
 * keystroke would just leave the field looking broken.
 */
export function setGoalPriority(plan: NsPlan, goalId: string, rank: number, now = nowIso()): NsPlan {
  const from = plan.priorityIds.indexOf(goalId)
  if (from === -1) return plan
  const to = Math.min(plan.priorityIds.length - 1, Math.max(0, Math.round(rank) - 1))
  if (to === from) return plan
  const next = [...plan.priorityIds]
  next.splice(from, 1)
  next.splice(to, 0, goalId)
  return touch({ ...plan, priorityIds: next }, now)
}

/** One step up (-1) or down (+1) the list. */
export function moveGoalPriority(plan: NsPlan, goalId: string, dir: -1 | 1, now = nowIso()): NsPlan {
  const rank = goalRank(plan, goalId)
  if (rank == null) return plan
  return setGoalPriority(plan, goalId, rank + dir, now)
}

/** The goals in one area, in priority order rather than creation order. */
export function areaGoalsByPriority(plan: NsPlan, areaId: string): NsGoal[] {
  return goalsByPriority(plan).filter((g) => g.areaId === areaId)
}

// -- actions, horizon and reasons (ported from the full lab) ------------------

/**
 * Does this goal name somewhere to end up and nothing you could do on a Tuesday?
 *
 * Delegates to the lab's predicate so the two pages agree on the rule. The
 * shim exists because this flow models a practice AS the action (its frequency
 * is on the goal, not in a habit list) and a finish line's steps live in
 * `checkpoints`, so both are handed over in the shape the lab expects.
 */
export function goalNeedsAction(goal: NsGoal): boolean {
  // A practice is the action. Asking "what will you do about running 4x a week"
  // is asking the same question twice.
  if (goal.type === "habit_ramp") return false
  return labGoalNeedsAction({
    habits: goal.habits,
    tasks: goal.checkpoints.map((c) => ({ id: c.id, title: c.title, dueOffsetDays: 0 })),
    // Deliberately null even for a target. The lab lets a measure stand in for
    // an action because its goals are born carrying a habit; ours are not, so
    // "climb to 140kg" with no training action is a real gap worth naming.
    measure: null,
  })
}

/** Which time horizon this goal sits in. The lab's classifier, unchanged. */
export function goalHorizon(goal: NsGoal, today = todayISO()): Horizon {
  return labGoalHorizon({ type: goal.type, targetDate: goal.targetDate }, today)
}

export function addAction(plan: NsPlan, goalId: string, title: string, daysPerWeek: number, now = nowIso()): NsPlan {
  const trimmed = title.trim()
  if (!trimmed) return plan
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const { plan: withSeq, id } = nextId(plan, "h")
  const habit: VisionHabit = { id, title: trimmed, daysPerWeek: clamp(daysPerWeek, 1, 7) }
  return updateGoal(withSeq, goalId, { habits: [...goal.habits, habit] }, now)
}

export function updateAction(plan: NsPlan, goalId: string, habitId: string, patch: Partial<Omit<VisionHabit, "id">>, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { habits: goal.habits.map((h) => (h.id === habitId ? { ...h, ...patch } : h)) }, now)
}

export function removeAction(plan: NsPlan, goalId: string, habitId: string, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { habits: goal.habits.filter((h) => h.id !== habitId) }, now)
}

/** Add one or many reasons. Duplicates and blanks are dropped, order kept. */
export function addReasons(plan: NsPlan, goalId: string, text: string, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const seen = new Set(goal.reasonsList.map((r) => r.trim().toLowerCase()))
  const added: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.replace(/^\s*(?:[-*•·–]|\d+[.)])\s+/, "").trim()
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    added.push(t)
  }
  if (added.length === 0) return plan
  return updateGoal(plan, goalId, { reasonsList: [...goal.reasonsList, ...added] }, now)
}

export function removeReason(plan: NsPlan, goalId: string, index: number, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { reasonsList: goal.reasonsList.filter((_, i) => i !== index) }, now)
}

// -- the qualification stack -------------------------------------------------

export function addObstacle(plan: NsPlan, goalId: string, what: string, now = nowIso()): NsPlan {
  const trimmed = what.trim()
  if (!trimmed) return plan
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const { plan: withSeq, id } = nextId(plan, "o")
  const obstacle: NsObstacle = { id, what: trimmed, counter: "" }
  return updateGoal(withSeq, goalId, { obstacles: [...goal.obstacles, obstacle] }, now)
}

export function updateObstacle(plan: NsPlan, goalId: string, obstacleId: string, patch: Partial<Omit<NsObstacle, "id">>, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { obstacles: goal.obstacles.map((o) => (o.id === obstacleId ? { ...o, ...patch } : o)) }, now)
}

export function removeObstacle(plan: NsPlan, goalId: string, obstacleId: string, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { obstacles: goal.obstacles.filter((o) => o.id !== obstacleId) }, now)
}

export function addBelief(plan: NsPlan, goalId: string, old: string, now = nowIso()): NsPlan {
  const trimmed = old.trim()
  if (!trimmed) return plan
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const { plan: withSeq, id } = nextId(plan, "b")
  const belief: NsBelief = { id, old: trimmed, useful: null, evidence: "", replacement: "" }
  return updateGoal(withSeq, goalId, { beliefs: [...goal.beliefs, belief] }, now)
}

export function updateBelief(plan: NsPlan, goalId: string, beliefId: string, patch: Partial<Omit<NsBelief, "id">>, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { beliefs: goal.beliefs.map((b) => (b.id === beliefId ? { ...b, ...patch } : b)) }, now)
}

export function removeBelief(plan: NsPlan, goalId: string, beliefId: string, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { beliefs: goal.beliefs.filter((b) => b.id !== beliefId) }, now)
}

export function addCheckpoint(plan: NsPlan, goalId: string, title: string, now = nowIso()): NsPlan {
  const trimmed = title.trim()
  if (!trimmed) return plan
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const { plan: withSeq, id } = nextId(plan, "c")
  const checkpoint: NsCheckpoint = { id, title: trimmed, done: false }
  return updateGoal(withSeq, goalId, { checkpoints: [...goal.checkpoints, checkpoint] }, now)
}

export function updateCheckpoint(plan: NsPlan, goalId: string, checkpointId: string, patch: Partial<Omit<NsCheckpoint, "id">>, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { checkpoints: goal.checkpoints.map((c) => (c.id === checkpointId ? { ...c, ...patch } : c)) }, now)
}

export function removeCheckpoint(plan: NsPlan, goalId: string, checkpointId: string, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { checkpoints: goal.checkpoints.filter((c) => c.id !== checkpointId) }, now)
}

// -- goal readouts -----------------------------------------------------------

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
 * The sentence the goal wants to be written as. "I" takes responsibility,
 * "will" makes it a decision, and "easily" changes how it feels to say out
 * loud. This only has to be a good first draft; the user edits it after.
 */
export function suggestSentence(goal: Pick<NsGoal, "title" | "targetDate" | "feeling">): string {
  const title = goal.title.trim()
  if (!title) return ""
  const head = title.charAt(0).toLowerCase() + title.slice(1)
  const by = formatTargetDate(goal.targetDate)
  // The full template is "I will easily <goal> creating <feeling> by <date>".
  // The feeling clause is what makes the sentence land when you say it out loud,
  // so it goes in when it exists and the sentence still reads without it.
  const feeling = goal.feeling?.trim()
  const parts = [`I will easily ${head}`]
  if (feeling) parts.push(`creating ${feeling.charAt(0).toLowerCase() + feeling.slice(1)}`)
  if (by) parts.push(`by ${by}`)
  return `${parts.join(" ")}.`
}

export function qualifyWarnings(goal: Pick<NsGoal, "beliefLevel" | "desireLevel">): string[] {
  const out: string[] = []
  if (goal.beliefLevel != null && goal.beliefLevel < NS_QUALIFY_THRESHOLD) {
    out.push("You believe this below a 7. Shrink the goal until you believe it, then grow it again once it is done.")
  }
  if (goal.desireLevel != null && goal.desireLevel < NS_QUALIFY_THRESHOLD) {
    out.push("You want this below a 7. Write a reason that actually moves you, or take the goal off the list.")
  }
  return out
}

export function goalHasWhy(goal: NsGoal): boolean {
  return goal.why.trim().length > 0
}

// -- goals the page can score for you ----------------------------------------

/**
 * Can this goal read its own number off the daily ratings?
 *
 * Only a target goal, because it is the only shape with a number to climb, and
 * only in an area, which every goal has. Offered rather than assumed: "track my
 * emotions and raise the average" wants it, "get to 140kg" does not, and the
 * difference is not something a title can be parsed for.
 */
export function goalCanUseDailyMetric(goal: NsGoal): boolean {
  return goal.type === "milestone_ladder"
}

/**
 * A wired goal's current number: the rolling average of its area's daily
 * ratings. Null when the goal is self-tracked, or when there are no ratings yet.
 */
export function goalMetricValue(plan: NsPlan, goal: NsGoal, today = todayISO()): number | null {
  if (goal.metric !== "daily_area") return null
  return dailyAverage(plan, goal.areaId, today)
}

/**
 * How far along a wired goal is, 0 to 1, against its own ladder.
 *
 * Clamped at both ends, and null when there is no reading yet or the ladder has
 * nowhere to go. A goal whose target is below its start (cutting a number down)
 * runs the same arithmetic backwards, so progress still counts up.
 */
export function goalMetricProgress(plan: NsPlan, goal: NsGoal, today = todayISO()): number | null {
  const value = goalMetricValue(plan, goal, today)
  if (value == null || !goal.ladder) return null
  const { start, target } = goal.ladder
  if (start === target) return null
  return Math.min(1, Math.max(0, (value - start) / (target - start)))
}

/**
 * Wire a goal to the daily ratings, filling in the numbers it needs.
 *
 * Turning it on sets the unit and, when the ladder is still the untouched
 * default, gives it a sensible 0-10 shape: start where the area actually is
 * today, aim at the floor plus two. Turning it off leaves every number alone,
 * because unwiring should not silently rewrite what you were climbing to.
 */
export function setGoalMetric(plan: NsPlan, goalId: string, metric: "daily_area" | null, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal || !goalCanUseDailyMetric(goal)) return plan
  if (metric == null) return updateGoal(plan, goalId, { metric: null }, now)
  const today = todayISO(new Date(now))
  const current = dailyAverage(plan, goal.areaId, today) ?? areaReview(plan, goal.areaId).fortnight ?? 0
  const defaults = defaultsForType("milestone_ladder").ladder!
  const untouched =
    !goal.ladder || (goal.ladder.start === defaults.start && goal.ladder.target === defaults.target)
  return updateGoal(
    plan,
    goalId,
    {
      metric: "daily_area",
      unit: "/10",
      ladder: untouched
        ? { ...defaults, start: current, target: Math.min(10, NS_FLOOR + 2), steps: 4 }
        : { ...goal.ladder!, start: goal.ladder!.start, target: Math.min(10, goal.ladder!.target) },
    },
    now,
  )
}

/** What is still missing before this counts as a planned goal. */
export function goalGaps(goal: NsGoal): string[] {
  const gaps: string[] = []
  if (!goalHasWhy(goal)) gaps.push("a why")
  if (!goal.targetDate) gaps.push("a date")
  if (goal.type === "milestone_ladder" && (!goal.ladder || goal.ladder.target === goal.ladder.start)) gaps.push("a number to climb to")
  if (goal.type === "achievement" && goal.checkpoints.length === 0) gaps.push("checkpoints")
  if (goal.beliefLevel == null || goal.desireLevel == null) gaps.push("both ratings")
  if (goalNeedsAction(goal)) gaps.push("an action")
  if (!goal.sentence.trim()) gaps.push("the sentence")
  return gaps
}

export function goalIsQualified(goal: NsGoal): boolean {
  return goalGaps(goal).length === 0 && goal.painWhy.trim().length > 0
}

// -------------------------------------------------------------------- review

export function areaReview(plan: NsPlan, areaId: string): NsAreaReview {
  return plan.review[areaId] ?? emptyAreaReview()
}

export function setAreaReview(plan: NsPlan, areaId: string, patch: Partial<NsAreaReview>, now = nowIso()): NsPlan {
  const current = areaReview(plan, areaId)
  return touch({ ...plan, review: { ...plan.review, [areaId]: { ...current, ...patch } } }, now)
}

export function setAnswer(plan: NsPlan, promptId: string, text: string, now = nowIso()): NsPlan {
  return touch({ ...plan, answers: { ...plan.answers, [promptId]: text } }, now)
}

export function answerOf(plan: NsPlan, promptId: string): string {
  return plan.answers[promptId] ?? ""
}

// ------------------------------------------------------------------- values
//
// The whole procedure, from Lp_GOrM16Xc. Written up with the quotes in
// docs/research/life-mastery/values-and-identity.md.
//
//   1. `currentValues` — what has been most important to you so far. The list
//      that built the life you already have.
//   2. `values` — what would have to be important to create the life in the
//      paragraph. Ordered, because "whatever number one is, everything else is
//      being filtered through that".
//   3. The order is produced by comparing two at a time, which is the method he
//      teaches and the only one that works on a list of fifteen.
//   4. The order then produces the conflicts, which is the payoff.

/** Case-insensitive, whitespace-tolerant equality for one value word. */
function sameValue(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export function setCurrentValues(plan: NsPlan, values: string[], now = nowIso()): NsPlan {
  return touch({ ...plan, currentValues: values }, now)
}

/**
 * The diff between the two lists, which is the insight the exercise exists for.
 *
 * `added` is on the new list and not the old: the change you are choosing.
 * `dropped` is on the old and not the new: something that has been running your
 * decisions and that you have just declined to carry forward. Dropping one is
 * usually right and always worth seeing once.
 */
export function valuesDiff(plan: NsPlan): { added: string[]; dropped: string[] } {
  const past = plan.currentValues.map((v) => v.trim().toLowerCase())
  const next = plan.values.map((v) => v.trim().toLowerCase())
  return {
    added: plan.values.filter((v) => !past.includes(v.trim().toLowerCase())),
    dropped: plan.currentValues.filter((v) => !next.includes(v.trim().toLowerCase())),
  }
}

/**
 * Does this look like a means value rather than an end?
 *
 * "Family" and "money" and "think better thoughts" are all fine to type. They
 * are means: the thing through which you get the feeling. The check is only ever
 * used to OFFER one follow-up question, never to reject a word, so it is tuned
 * to stay quiet: anything containing a known end word passes, and so does any
 * single abstract noun we happen to list. A false "worth a second look" on
 * somebody's real value is worse than missing one.
 */
export function looksLikeMeansValue(value: string): boolean {
  const text = value.trim().toLowerCase()
  if (!text) return false
  const words = text.split(/[^a-z]+/).filter(Boolean)
  if (words.length === 0) return false
  return !words.some((w) => VALUE_ENDS_WORDS.includes(w))
}

/**
 * Conflicts the user's own order has produced.
 *
 * Only raised when BOTH sides are actually on the list and the crowding one is
 * genuinely ranked higher. A conflict pair with only one side present is not a
 * conflict, it is us guessing.
 */
export function valueConflicts(plan: NsPlan): Array<{ above: string; below: string; note: string }> {
  const indexOfAny = (words: string[]): { index: number; label: string } | null => {
    for (let i = 0; i < plan.values.length; i += 1) {
      const parts = plan.values[i].toLowerCase().split(/[^a-z]+/).filter(Boolean)
      if (parts.some((p) => words.includes(p))) return { index: i, label: plan.values[i] }
    }
    return null
  }
  const out: Array<{ above: string; below: string; note: string }> = []
  for (const rule of VALUE_CONFLICTS) {
    const hi = indexOfAny(rule.above)
    const lo = indexOfAny(rule.below)
    if (!hi || !lo) continue
    if (hi.index >= lo.index) continue
    out.push({ above: hi.label, below: lo.label, note: rule.note })
  }
  return out
}

/**
 * Value words read out of what the user has already written.
 *
 * The suggestion row used to be twenty words of ours. Somebody who has just
 * described waking up near the water with their kids should be offered Freedom
 * and Family off their own paragraph. Everything they have written is scanned:
 * the north star, the why, each area's 10 and snapshot, and each goal's why.
 * Ordered by how many times the cue was hit, so the theme they keep returning to
 * comes first.
 */
export function derivedValueSuggestions(plan: NsPlan): string[] {
  const corpus = [
    plan.northStar,
    answerOf(plan, STAR_WHY_ID),
    answerOf(plan, "become"),
    ...plan.areas.flatMap((a) => {
      const r = areaReview(plan, a.id)
      return [r.ten, r.snapshot]
    }),
    ...plan.goals.flatMap((g) => [g.title, g.why, g.painWhy]),
  ]
    .join(" \n ")
    .toLowerCase()
  if (!corpus.trim()) return []
  const scored: Array<{ value: string; hits: number }> = []
  for (const { value, cues } of VALUE_CUES) {
    let hits = 0
    for (const cue of cues) {
      // Split on the cue rather than a global regex: cues contain spaces and
      // punctuation-adjacent words, and escaping each one for RegExp buys
      // nothing over counting occurrences directly.
      hits += corpus.split(cue).length - 1
    }
    if (hits > 0) scored.push({ value, hits })
  }
  return scored.sort((a, b) => b.hits - a.hits || a.value.localeCompare(b.value)).map((s) => s.value)
}

/**
 * The pairs still worth asking about, to order the list.
 *
 * Insertion sort's comparison schedule, exposed one question at a time: the list
 * is already in some order, so the only pair worth asking about is an adjacent
 * one the user has not answered yet. Answering "the lower one" swaps them, which
 * bubbles it up, and the next question is the pair above. That converges on a
 * full ordering in the same number of questions as the by-hand method he teaches
 * and never asks the same pair twice in a row.
 *
 * Returns null when there is nothing left to ask.
 */
export function nextValuePair(plan: NsPlan, settled: string[]): { a: string; b: string; key: string } | null {
  const done = new Set(settled)
  for (let i = 0; i < plan.values.length - 1; i += 1) {
    const a = plan.values[i]
    const b = plan.values[i + 1]
    const key = valuePairKey(a, b)
    if (!done.has(key)) return { a, b, key }
  }
  return null
}

/** Order-independent identity for a pair, so a swap does not re-ask it. */
export function valuePairKey(a: string, b: string): string {
  return [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join(" vs ")
}

/** Move one value up or down a place. The direct alternative to the duel. */
export function moveValue(plan: NsPlan, value: string, dir: -1 | 1, now = nowIso()): NsPlan {
  const index = plan.values.findIndex((v) => sameValue(v, value))
  const target = index + dir
  if (index < 0 || target < 0 || target >= plan.values.length) return plan
  const next = [...plan.values]
  ;[next[index], next[target]] = [next[target], next[index]]
  return touch({ ...plan, values: next }, now)
}

/** Put `winner` immediately above `loser`. What answering a duel does. */
export function rankValueAbove(plan: NsPlan, winner: string, loser: string, now = nowIso()): NsPlan {
  const wi = plan.values.findIndex((v) => sameValue(v, winner))
  const li = plan.values.findIndex((v) => sameValue(v, loser))
  if (wi < 0 || li < 0 || wi < li) return plan
  const next = plan.values.filter((_, i) => i !== wi)
  next.splice(li, 0, plan.values[wi])
  return touch({ ...plan, values: next }, now)
}

/**
 * Areas sitting under the floor with nothing in the values list pointing at
 * them. His client wanted to change his health and had never written health
 * down: "no wonder you're not creating long-term change here".
 *
 * Matched through the same cue table the suggestions use, so "Vitality" counts
 * as support for Health without a second hand-typed mapping to drift.
 */
export function areasWithoutValueSupport(plan: NsPlan, today = todayISO()): NsArea[] {
  if (plan.values.length === 0) return []
  const written = plan.values.map((v) => v.trim().toLowerCase())
  const supports = (area: NsArea): boolean => {
    const haystack = `${area.label} ${area.sublabel}`.toLowerCase()
    return written.some((value) => {
      if (haystack.includes(value)) return true
      const cues = VALUE_CUES.find((c) => c.value.toLowerCase() === value)?.cues ?? []
      return cues.some((cue) => haystack.includes(cue))
    })
  }
  return areasUnderFloor(plan, today).filter((a) => !supports(a))
}

/** How far off his "at least seven" the list is. Advisory, never blocking. */
export function valuesShortBy(plan: NsPlan): number {
  return Math.max(0, VALUES_INTRO.minimum - plan.values.length)
}

export function setValues(plan: NsPlan, values: string[], now = nowIso()): NsPlan {
  return touch({ ...plan, values }, now)
}

/** One day's rating for one area. Setting it again on the same day overwrites. */
export function setDailyRating(plan: NsPlan, date: string, areaId: string, score: number, now = nowIso()): NsPlan {
  if (!plan.areas.some((a) => a.id === areaId)) return plan
  const row = { ...(plan.daily[date] ?? {}), [areaId]: clamp(score, 0, 10) }
  return touch({ ...plan, daily: { ...plan.daily, [date]: row } }, now)
}

export function clearDailyRating(plan: NsPlan, date: string, areaId: string, now = nowIso()): NsPlan {
  const row = { ...(plan.daily[date] ?? {}) }
  delete row[areaId]
  const daily = { ...plan.daily }
  if (Object.keys(row).length === 0) delete daily[date]
  else daily[date] = row
  return touch({ ...plan, daily }, now)
}

/**
 * The daily average over the window, to one decimal, or null when nothing was
 * rated in it. Shown beside the user's own two-week number so the two can
 * disagree out loud: a remembered fortnight and a lived one are different
 * things, and the gap between them is the interesting part.
 */
export function dailyAverage(plan: NsPlan, areaId: string, today = todayISO(), days = NS_DAILY_WINDOW): number | null {
  const from = addDaysISO(today, -(days - 1))
  const scores: number[] = []
  for (const [date, row] of Object.entries(plan.daily)) {
    if (date < from || date > today) continue
    const score = row[areaId]
    if (typeof score === "number") scores.push(score)
  }
  if (scores.length === 0) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

/** How many days in the window carry a rating for this area. */
export function dailyCount(plan: NsPlan, areaId: string, today = todayISO(), days = NS_DAILY_WINDOW): number {
  const from = addDaysISO(today, -(days - 1))
  let n = 0
  for (const [date, row] of Object.entries(plan.daily)) {
    if (date < from || date > today) continue
    if (typeof row[areaId] === "number") n += 1
  }
  return n
}

/** What the wheel fills each sector to: your own number, else today's daily one. */
export function wheelRatings(plan: NsPlan, today = todayISO()): Record<string, number> {
  const out: Record<string, number> = {}
  for (const area of plan.areas) {
    const own = areaReview(plan, area.id).fortnight
    if (own != null) {
      out[area.id] = own
      continue
    }
    const avg = dailyAverage(plan, area.id, today)
    if (avg != null) out[area.id] = avg
  }
  return out
}

// -------------------------------------------------- the one thing, and reach

/**
 * The one goal or area for this season.
 *
 * Deliberately not "whatever is at rank one". Rank is an order to work through;
 * this is the single thing that, done, makes several of the others easier or
 * unnecessary, and it is usually not the same item. Picking the one you already
 * had picked clears it, so it stays reversible without a second control.
 */
export function setSeasonFocus(plan: NsPlan, id: string | null, now = nowIso()): NsPlan {
  if (id != null && !plan.goals.some((g) => g.id === id) && !plan.areas.some((a) => a.id === id)) return plan
  return touch({ ...plan, seasonFocusId: plan.seasonFocusId === id ? null : id }, now)
}

/** What the season focus points at, resolved for display. Null when unset. */
export function seasonFocus(plan: NsPlan): { id: string; label: string; kind: "goal" | "area"; areaId: string } | null {
  if (!plan.seasonFocusId) return null
  const goal = plan.goals.find((g) => g.id === plan.seasonFocusId)
  if (goal) return { id: goal.id, label: goal.title, kind: "goal", areaId: goal.areaId }
  const area = plan.areas.find((a) => a.id === plan.seasonFocusId)
  if (area) return { id: area.id, label: area.label, kind: "area", areaId: area.id }
  return null
}

/** Set which other areas a goal lifts. Its own area is never one of them. */
export function setGoalServes(plan: NsPlan, goalId: string, areaIds: string[], now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const valid = areaIds.filter((id) => id !== goal.areaId && plan.areas.some((a) => a.id === id))
  return updateGoal(plan, goalId, { serves: [...new Set(valid)] }, now)
}

/** Same, for a routine. */
export function setRoutineServes(plan: NsPlan, routineId: string, areaIds: string[], now = nowIso()): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const valid = areaIds.filter((id) => id !== routine.areaId && plan.areas.some((a) => a.id === id))
  return updateRoutine(plan, routineId, { serves: [...new Set(valid)] }, now)
}

/**
 * Everything working on one area: its own goals and routines, plus everything
 * filed elsewhere that says it reaches in here.
 *
 * This is what makes an area readable at a glance. Before it, opening Money
 * showed goals filed under Money and nothing else, so a work routine that was
 * the entire reason the number was moving was invisible from the one screen
 * where that mattered.
 */
export function areaReach(plan: NsPlan, areaId: string): {
  goals: NsGoal[]
  borrowedGoals: NsGoal[]
  routines: NsRoutine[]
  borrowedRoutines: NsRoutine[]
} {
  return {
    goals: goalsInArea(plan, areaId),
    borrowedGoals: plan.goals.filter((g) => g.areaId !== areaId && g.serves.includes(areaId)),
    routines: plan.routines.filter((r) => r.areaId === areaId),
    borrowedRoutines: plan.routines.filter((r) => r.areaId !== areaId && r.serves.includes(areaId)),
  }
}

/**
 * A rough read of how well covered an area is, for the badge on its row.
 *
 * "covered" means something with a reason under it is aimed here. "thin" means
 * something is aimed here but nothing has been thought through. "none" means
 * nothing at all reaches it, which for an area you rated a 4 is the finding.
 * Routines count, because a routine that runs here IS work on this area.
 */
export function areaCoverage(plan: NsPlan, areaId: string): "covered" | "thin" | "none" {
  const reach = areaReach(plan, areaId)
  const goals = [...reach.goals, ...reach.borrowedGoals]
  const routines = [...reach.routines, ...reach.borrowedRoutines].filter((r) => r.steps.length > 0)
  if (goals.length === 0 && routines.length === 0) return "none"
  if (goals.some(goalHasWhy)) return "covered"
  if (goals.length === 0 && routines.length > 0) return "covered"
  return "thin"
}

/**
 * Does this goal duplicate something already in a routine?
 *
 * The framework hands out "Weekly Review", "Journaling" and "Meditation" as
 * goals, and all three are already steps in the routines this page ships. The
 * goal is not wrong, but the routine is where it happens, and saying so once
 * stops the plan carrying the same commitment twice with no connection between
 * the copies.
 */
export function goalAlreadyInRoutine(plan: NsPlan, goal: NsGoal): { routine: string; step: string } | null {
  const title = goal.title.trim().toLowerCase()
  if (!title) return null
  for (const routine of plan.routines) {
    for (const step of routine.steps) {
      const stepTitle = step.title.trim().toLowerCase()
      if (stepTitle === title || stepTitle.startsWith(`${title} `) || title.startsWith(stepTitle)) {
        return { routine: routine.label, step: step.title }
      }
    }
  }
  return null
}

/** The in-app tool a goal is really asking for, when it is asking for one. */
export function goalToolLink(goal: NsGoal): (typeof GOAL_TOOL_LINKS)[number] | null {
  const title = goal.title.trim().toLowerCase()
  return GOAL_TOOL_LINKS.find((link) => link.match.some((m) => title.includes(m))) ?? null
}

/** Areas with a 10 written and nothing aimed at it. The gap worth naming. */
export function areasWithoutGoals(plan: NsPlan): NsArea[] {
  return plan.areas.filter((a) => !plan.goals.some((g) => g.areaId === a.id))
}

/** Areas sitting under the floor. These are the ones asking for attention. */
export function areasUnderFloor(plan: NsPlan, today = todayISO()): NsArea[] {
  const ratings = wheelRatings(plan, today)
  return plan.areas.filter((a) => ratings[a.id] != null && ratings[a.id] < NS_FLOOR)
}

/** Every value written anywhere, deduplicated, for the whole-life exercise. */
export function collectValues(plan: NsPlan): string[] {
  const seen = new Map<string, string>()
  const add = (v: string) => {
    const t = v.trim()
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t)
  }
  for (const area of plan.areas) for (const v of areaReview(plan, area.id).values) add(v)
  for (const goal of plan.goals) for (const v of goal.values) add(v)
  return [...seen.values()]
}

// ------------------------------------------------------------------ progress

export function nsProgress(plan: NsPlan): NsProgress {
  const starWritten = plan.northStar.trim().length > 0
  const goals = plan.goals.length
  const goalsWithWhy = plan.goals.filter(goalHasWhy).length
  const goalsQualified = plan.goals.filter(goalIsQualified).length
  const goalsNeedingAction = plan.goals.filter(goalNeedsAction).length
  const areasWithGoals = new Set(plan.goals.map((g) => g.areaId)).size
  const routineSteps = plan.routines.reduce((sum, r) => sum + r.steps.length, 0)
  const areasRated = plan.areas.filter((a) => areaReview(plan, a.id).fortnight != null).length
  const areasWithTen = plan.areas.filter((a) => areaReview(plan, a.id).ten.trim().length > 0).length
  return {
    starWritten,
    areas: plan.areas.length,
    routines: plan.routines.length,
    routineSteps,
    goals,
    goalsWithWhy,
    goalsQualified,
    goalsNeedingAction,
    areasWithGoals,
    areasRated,
    areasWithTen,
    done: {
      star: starWritten,
      // The rating, the picture, and the goals now share one tab, so the tick
      // has to mean all three: at least one area looked at properly, and every
      // goal written carrying the reason that keeps it alive. Editing a routine
      // is real work but it is not a plan.
      now: areasRated > 0 && areasWithTen > 0 && goals > 0 && goalsWithWhy === goals,
      review: plan.goals.length > 0 && plan.areas.some((a) => areaReview(plan, a.id).goalsAim != null),
    },
  }
}

/** Whether a tab has anything on it worth reading back. */
export function tabHasContent(plan: NsPlan, tab: NorthStarTabId): boolean {
  const p = nsProgress(plan)
  if (tab === "star") return p.starWritten || starWorkWritten(plan)
  if (tab === "now") return p.areasRated > 0 || p.areasWithTen > 0 || areasTouched(plan) || p.goals > 0
  return plan.areas.some((a) => areaReview(plan, a.id).goalsAim != null) || REVIEW_PROMPTS.some((q) => answerOf(plan, q.id).trim())
}

/**
 * Everything the plan is still missing, in one list, so nothing has to be
 * gated to be noticed.
 *
 * The flow never blocks: a goal with no date and no why still saves, and the
 * next tab is always reachable. That is right, because making somebody finish
 * nine boxes before they can look at the next screen is how you lose the nine
 * boxes. It only works if the outstanding work is visible somewhere, which is
 * this.
 */
export function planTodos(plan: NsPlan, today = todayISO()): Array<{ id: string; text: string; tab: NorthStarTabId }> {
  const out: Array<{ id: string; text: string; tab: NorthStarTabId }> = []
  if (!plan.northStar.trim()) out.push({ id: "star", text: "Your north star paragraph", tab: "star" })
  if (!answerOf(plan, STAR_WHY_ID).trim()) out.push({ id: "why", text: "Why that life matters to you", tab: "star" })
  const short = valuesShortBy(plan)
  if (short > 0) {
    out.push({
      id: "values",
      text: plan.values.length === 0 ? "Your values, in order" : `${short} more ${short === 1 ? "value" : "values"} to reach seven`,
      tab: "star",
    })
  }
  const unrated = plan.areas.filter((a) => areaReview(plan, a.id).fortnight == null).length
  if (unrated > 0) out.push({ id: "rate", text: `${unrated} of ${plan.areas.length} areas still unrated`, tab: "now" })
  const noTen = plan.areas.filter((a) => !areaReview(plan, a.id).ten.trim()).length
  if (noTen > 0 && noTen < plan.areas.length) out.push({ id: "ten", text: `${noTen} areas with no 10 written`, tab: "now" })
  if (plan.goals.length === 0) {
    out.push({ id: "goals", text: "No goals written yet", tab: "now" })
  } else {
    const noWhy = plan.goals.filter((g) => !goalHasWhy(g)).length
    if (noWhy > 0) out.push({ id: "goalwhy", text: `${noWhy} ${noWhy === 1 ? "goal needs" : "goals need"} a why`, tab: "now" })
    const noDate = plan.goals.filter((g) => !g.targetDate).length
    if (noDate > 0) out.push({ id: "goaldate", text: `${noDate} ${noDate === 1 ? "goal has" : "goals have"} no date`, tab: "now" })
    const noAction = plan.goals.filter(goalNeedsAction).length
    if (noAction > 0) out.push({ id: "goalaction", text: `${noAction} ${noAction === 1 ? "goal names" : "goals name"} an outcome with no action`, tab: "now" })
  }
  const unsupported = areasWithoutValueSupport(plan, today)
  if (unsupported.length > 0) {
    out.push({
      id: "valuegap",
      text: `Under a seven with no value pointing at it: ${unsupported.map((a) => a.label).join(", ")}`,
      tab: "star",
    })
  }
  return out
}

// ------------------------------------------------------------------ read back

/**
 * Has the user done anything at all yet?
 *
 * Routines ship pre-filled, so "the plan has content" is true the moment the
 * page loads. Without this, the read-back panel greets a first-time visitor
 * with our template under the heading "Your plan", which is the fastest way to
 * turn a suggestion into something they believe they decided.
 */
export function planIsUntouched(plan: NsPlan): boolean {
  return (
    !plan.northStar.trim() &&
    plan.goals.length === 0 &&
    Object.keys(plan.review).length === 0 &&
    Object.keys(plan.answers).length === 0 &&
    Object.keys(plan.daily).length === 0 &&
    Object.values(plan.rungs).every((v) => !v.trim()) &&
    plan.values.length === 0 &&
    plan.currentValues.length === 0 &&
    plan.seasonFocusId == null &&
    !areasTouched(plan)
  )
}

/**
 * The whole plan as plain text. The form you can actually re-read.
 *
 * Empty until the user has touched something. After that the routines are in
 * it whether they were edited or kept, because a stack you looked at and kept
 * is a stack you chose.
 */
export function planAsText(plan: NsPlan, today = todayISO()): string {
  if (planIsUntouched(plan)) return ""
  const areaLabel = new Map(plan.areas.map((a) => [a.id, a.label]))
  const goalById = new Map(plan.goals.map((g) => [g.id, g]))
  const blocks: string[] = []

  if (plan.northStar.trim()) blocks.push(`MY NORTH STAR (${plan.horizonYears} years out)\n${plan.northStar.trim()}`)

  const focus = seasonFocus(plan)
  if (focus) blocks.push(`MY ONE THING THIS SEASON\n${focus.label}`)

  // The why, who you would have to become, your identity and your affirmations.
  // Directly under the paragraph, because that is the order they are asked in
  // and the order you would want to re-read them in.
  const starWork = STAR_PROMPTS.filter((p) => answerOf(plan, p.id).trim())
  if (starWork.length > 0) {
    blocks.push(starWork.map((p) => `${p.question.toUpperCase()}\n${answerOf(plan, p.id).trim()}`).join("\n\n"))
  }

  const routines = plan.routines.filter((r) => r.steps.length > 0)
  if (routines.length > 0) {
    blocks.push(
      `MY ROUTINES\n${routines
        .map((r) => {
          const head = `${r.label} (${routineSummary(r)})`
          const steps = r.steps.map((s, i) => `  ${i + 1}. ${s.title}${r.kind === "weekly" ? ` — ${s.daysPerWeek}×/wk` : ""}`)
          const split = r.splitDays.length > 0 ? [`  Training days: ${r.splitDays.map((d) => d.name).join(" · ")}`] : []
          return [head, ...steps, ...split].join("\n")
        })
        .join("\n\n")}`,
    )
  }

  if (plan.goals.length > 0) {
    blocks.push(
      `MY GOALS\n${plan.goals
        .map((g) => {
          const lines = [`${areaLabel.get(g.areaId) ?? ""}: ${g.sentence.trim() || g.title}`]
          if (g.type === "milestone_ladder" && g.ladder) lines.push(`  ${g.ladder.start} to ${g.ladder.target} ${g.unit}`.trimEnd())
          if (g.type === "habit_ramp") lines.push(`  ${g.daysPerWeek}× a week`)
          if (g.targetDate) lines.push(`  By ${formatTargetDate(g.targetDate)}`)
          if (g.why.trim()) lines.push(`  Why: ${g.why.trim()}`)
          if (g.painWhy.trim()) lines.push(`  Cost of not: ${g.painWhy.trim()}`)
          if (g.checkpoints.length > 0) lines.push(`  Checkpoints: ${g.checkpoints.map((c) => c.title).join(" · ")}`)
          if (g.feedsGoalIds.length > 0) lines.push(`  Feeds: ${g.feedsGoalIds.map((id) => goalById.get(id)?.title ?? id).join(" · ")}`)
          if (g.obstacles.length > 0) {
            lines.push(`  What could stop me: ${g.obstacles.map((o) => (o.counter.trim() ? `${o.what} → ${o.counter}` : o.what)).join(" · ")}`)
          }
          if (g.beliefs.length > 0) {
            lines.push(`  Beliefs in the way: ${g.beliefs.map((b) => (b.replacement.trim() ? `${b.old} → ${b.replacement}` : b.old)).join(" · ")}`)
          }
          if (g.reward.trim()) lines.push(`  Reward: ${g.reward.trim()}`)
          if (g.stake.trim()) lines.push(`  Stake: ${g.stake.trim()}`)
          return lines.join("\n")
        })
        .join("\n\n")}`,
    )
  }

  const reviewed = plan.areas
    .map((a) => ({ a, r: areaReview(plan, a.id) }))
    .filter(({ r }) => r.ten.trim() || r.snapshot.trim() || r.fortnight != null || r.identity.trim() || r.blockers.trim() || r.values.length > 0)
  if (reviewed.length > 0) {
    blocks.push(
      `WHERE I AM\n${reviewed
        .map(({ a, r }) => {
          const avg = dailyAverage(plan, a.id, today)
          const lines = [`${a.label}${r.fortnight != null ? `: ${r.fortnight}/10 over the last two weeks` : ""}${avg != null ? ` (daily average ${avg})` : ""}`]
          if (r.ten.trim()) lines.push(`  A 10 here: ${r.ten.trim()}`)
          if (r.snapshot.trim()) lines.push(`  Right now: ${r.snapshot.trim()}`)
          if (r.goalsAim) lines.push(`  Goals aim at it: ${r.goalsAim}`)
          if (r.identity.trim()) lines.push(`  Who I am here: ${r.identity.trim()}`)
          if (r.values.length > 0) lines.push(`  Values this asks for: ${r.values.join(" · ")}`)
          if (r.blockers.trim()) lines.push(`  What might stop me: ${r.blockers.trim()}`)
          return lines.join("\n")
        })
        .join("\n\n")}`,
    )
  }

  if (plan.currentValues.length > 0) {
    blocks.push(`WHAT I HAVE BEEN LIVING BY\n${plan.currentValues.join(" · ")}`)
  }
  if (plan.values.length > 0) blocks.push(`MY VALUES, IN ORDER\n${plan.values.map((v, i) => `${i + 1}. ${v}`).join("\n")}`)

  const answered = REVIEW_PROMPTS.filter((p) => answerOf(plan, p.id).trim())
  if (answered.length > 0) {
    blocks.push(answered.map((p) => `${p.question.toUpperCase()}\n${answerOf(plan, p.id).trim()}`).join("\n\n"))
  }

  return blocks.join("\n\n")
}

export { ROUTINE_BLUEPRINTS, NS_SPLITS, NS_FLOOR, NS_QUALIFY_THRESHOLD, NS_DAILY_WINDOW }

// ------------------------------------------------- the common-goal library
//
// The framework at /test/new-goals already holds 166 curated targets grouped
// under 23 objectives, and 26 templates that turn several of them on at once at
// a chosen level. That is the list worth choosing from, so it is read directly
// rather than copied: a goal picked here is the same goal that page would make.
//
// The only work is the shape translation. The framework describes a target by
// its PRIMITIVE (volume · habit · target · skill · stage); this flow has three
// shapes. Stages and skills become finish lines whose stage steps are the
// checkpoints, anything with a number to climb becomes a target, and anything
// with a ramp becomes a practice.

/**
 * The unit a framework target's ladder should be read in.
 *
 * A `cumulative` target counts a RUNNING TOTAL, and three of them in the
 * framework carry a rate unit anyway: Build Hours, Deep Work Hours and Learning
 * Hours are all `1 → 500` with the unit "hours/week". Passed through unchanged
 * that renders as "1 → 500 hours/week", which is not a stretch goal, it is 71
 * hours a day. The number is right and the unit is a rate on a total.
 *
 * So a cumulative target's unit drops the per-period half and says what it is:
 * "hours/week" becomes "hours in total". Anything already written as a total is
 * left exactly as it is.
 */
export function cumulativeUnit(target: FrameworkTarget): string {
  if (target.metricKind !== "cumulative") return target.unit
  const unit = target.unit.trim()
  if (!unit.includes("/")) return unit
  const base = unit.split("/")[0].trim()
  return base ? `${base} in total` : "in total"
}

/** The library an area browses, or null for a user-added area that has not picked one. */
export function libraryPillarForArea(area: NsArea): string | null {
  return AREA_LIBRARY_PILLAR[area.id] ?? null
}

/** The objectives of one pillar, each with its targets. The picker's grouping. */
export function libraryFor(pillarId: string): Array<{ objective: Objective; targets: FrameworkTarget[] }> {
  return OBJECTIVES.filter((o) => o.pillarId === pillarId).map((objective) => ({
    objective,
    targets: TARGETS.filter((t) => t.objectiveId === objective.id),
  }))
}

export function templatesFor(pillarId: string): Template[] {
  return TEMPLATES.filter((t) => t.pillarId === pillarId)
}

/**
 * A framework target, translated into this flow's goal shape.
 *
 * `valueOverride` is a template level's number for this target: the ladder's
 * destination for something you climb to, or the steady-state frequency for
 * something you repeat.
 */
export function shapeFromTarget(target: FrameworkTarget, valueOverride?: number): {
  type: VisionGoalType
  unit: string
  ladder: MilestoneLadderConfig | null
  rampSteps: HabitRampStep[] | null
  daysPerWeek: number
  checkpointTitles: string[]
} {
  const driver = target.sharedDriverId ? SHARED_DRIVERS.find((d) => d.id === target.sharedDriverId) : undefined
  const milestone = target.milestoneConfig ?? driver?.milestoneConfig ?? null
  const ramp = target.rampSteps ?? driver?.rampSteps ?? null

  // A stage or a skill has named steps and no number. That is a finish line.
  if (target.stageSteps && target.stageSteps.length > 0) {
    return { type: "achievement", unit: target.unit, ladder: null, rampSteps: null, daysPerWeek: 3, checkpointTitles: target.stageSteps }
  }
  if (milestone) {
    return {
      type: "milestone_ladder",
      unit: cumulativeUnit(target),
      ladder: {
        start: milestone.start,
        target: valueOverride ?? milestone.target,
        steps: milestone.steps,
        curveTension: milestone.curveTension,
        controlPoints: [],
        pins: [],
      },
      rampSteps: null,
      daysPerWeek: 3,
      checkpointTitles: [],
    }
  }
  if (ramp && ramp.length > 0) {
    // The level sets the steady state, which is the last phase of the ramp.
    const steps = ramp.map((r, i) =>
      i === ramp.length - 1 && valueOverride != null
        ? { frequencyPerWeek: clamp(valueOverride, 1, 30), durationWeeks: r.durationWeeks }
        : { ...r },
    )
    return {
      type: "habit_ramp",
      unit: target.unit,
      ladder: null,
      rampSteps: steps,
      daysPerWeek: clamp(steps[steps.length - 1].frequencyPerWeek, 1, 7),
      checkpointTitles: [],
    }
  }
  return { type: "achievement", unit: target.unit, ladder: null, rampSteps: null, daysPerWeek: 3, checkpointTitles: [] }
}

/** Has this framework target already been added to the plan? Matched on title. */
export function targetAlreadyAdded(plan: NsPlan, target: FrameworkTarget): boolean {
  const label = target.label.trim().toLowerCase()
  return plan.goals.some((g) => g.title.trim().toLowerCase() === label)
}

/** Add one library goal to an area, with its numbers and shape already set. */
export function addGoalFromTarget(plan: NsPlan, areaId: string, targetId: string, valueOverride?: number, now = nowIso()): NsPlan {
  const target = TARGETS.find((t) => t.id === targetId)
  if (!target) return plan
  if (targetAlreadyAdded(plan, target)) return plan
  const shape = shapeFromTarget(target, valueOverride)
  let next = addGoal(plan, areaId, target.label, shape.type, now)
  const goal = next.goals[next.goals.length - 1]
  if (!goal) return plan
  next = updateGoal(next, goal.id, {
    unit: shape.unit,
    ladder: shape.ladder,
    rampSteps: shape.rampSteps,
    daysPerWeek: shape.daysPerWeek,
  }, now)
  for (const title of shape.checkpointTitles) next = addCheckpoint(next, goal.id, title, now)
  return next
}

/**
 * Add every goal a template turns on, at the chosen level.
 *
 * The template's own `targetOverrides` decide which of its objectives' targets
 * come in; a `false` there is the template saying "not this one", so it is
 * honoured rather than treated as merely undefined. Anything already in the
 * plan is skipped, so running two overlapping templates does not duplicate.
 */
export function addGoalsFromTemplate(plan: NsPlan, areaId: string, templateId: string, levelIndex: number, now = nowIso()): NsPlan {
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (!template) return plan
  const level = template.levels[levelIndex] ?? template.levels[0]
  let next = plan
  for (const target of targetsForTemplate(template)) {
    next = addGoalFromTarget(next, areaId, target.id, level?.targetValues[target.id], now)
  }
  return next
}

/** The targets a template switches on, in the framework's own order. */
export function targetsForTemplate(template: Template): FrameworkTarget[] {
  return TARGETS.filter(
    (t) => template.objectiveIds.includes(t.objectiveId) && template.targetOverrides[t.id] === true,
  )
}
