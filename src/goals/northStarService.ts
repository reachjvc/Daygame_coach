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
  AREA_VALUE_SUGGESTIONS,
  DEFAULT_AREAS,
  DEFAULT_GOAL_MONTHS,
  DEFAULT_ROUTINE_IDS,
  GOAL_DATE_PRESETS,
  NS_DAILY_WINDOW,
  NS_FLOOR,
  NS_PLAN_VERSION,
  NS_QUALIFY_THRESHOLD,
  NS_SPLITS,
  NS_VALUE_SUGGESTIONS,
  PRACTICE_DESTINATIONS,
  RECAP_PRACTICES,
  REVIEW_PROMPTS,
  ROUTINE_BLUEPRINT_MAP,
  ROUTINE_BLUEPRINTS,
  GOAL_TOOL_LINKS,
  STAR_PROMPTS,
  STAR_WHY_ID,
  VALUE_CONFLICTS,
  VALUE_CUES,
  VALUE_ENDS_WORDS,
  VALUES_EVIDENCE,
  VALUES_INTRO,
  WRITE_FALLBACK_QUESTION,
  WRITE_PHRASES,
} from "@/src/goals/data/northStar"
import { AREA_LIBRARY_PILLAR, TAB_ORDER } from "@/src/goals/data/northStar"
import {
  GUIDE_QUESTION_ORDER,
  type GuideQuestionId,
} from "@/src/goals/data/northStarGuide"
import {
  AREA_GOAL_EXAMPLES,
  AREA_KEYWORDS,
  COMMIT_DATE_KEY,
  COMMIT_KEY,
  DAY_WINDOWS,
  NEUTRAL_GOAL_EXAMPLE,
  ONE_ANSWERS,
  START_ANSWER_PREFIX,
  type AreaGoalExample,
} from "@/src/goals/data/northStarStart"
import {
  AREA_OFFERS,
  LOAD_CEILING,
  OBJECTIVE_ACTION,
  OBJECTIVE_ROUTINE_NEEDS,
  practiceLabel,
  type AreaOffer,
  type RoutineNeed,
} from "@/src/goals/data/northStarBuild"
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
  NsDailyField,
  NsFieldKind,
  NsSubStep,
  NsExperience,
  NsGoal,
  NsObstacle,
  NsPlan,
  NsProgress,
  NsRoutine,
  NsRoutineStep,
  NsRoutineProgram,
  NsSplitDay,
  NsValueEvidence,
  NsValueMention,
  RoutineBlueprint,
  RoutineBlueprintStep,
  VisionGoalType,
  VisionHabit,
  NsAccount,
} from "@/src/goals/types"
/** A value, not a type: the loader checks a saved kind against it. */
import { NS_FIELD_KINDS, NO_ACCOUNT } from "@/src/goals/types"

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

/**
 * One library entry as a step in somebody's stack.
 *
 * Every step that arrives from a blueprint arrives unplaced: the library knows
 * how long a thing takes and how often it is worth doing, and it cannot know
 * which morning you are free.
 */
function stepFromLibrary(s: RoutineBlueprintStep): NsRoutineStep {
  return {
    id: s.id,
    title: s.title,
    minutes: s.minutes,
    daysPerWeek: s.daysPerWeek,
    dimension: s.dimension,
    days: [],
    startMin: null,
    servesGoalIds: [],
    // Arrives already pointing at the thing it names, so nobody has to wire up
    // "read your north star" by hand before it means anything. Authored on the
    // library entry wins: "see one scene from it" is about the north star to
    // any reader and holds no phrase a matcher could find.
    goesTo: s.goesTo ?? inferStepDestination(s.title),
    // And arrives with its question, so a row whose words ask you to write has
    // somewhere to write. Authored, for the same reason.
    asks: s.asks ?? inferStepQuestion(s.title),
  }
}

/**
 * WHICH PIECE OF THE PLAN A STEP IS TALKING ABOUT, from its own words.
 *
 * Matched on the phrase rather than on a library id, because the commonest
 * version of this row is one somebody typed themselves — "Read my north star
 * before bed" is not in any library and is unmistakably about the north star.
 * The phrases are `RECAP_PRACTICES`', so the recap's offer and this door can
 * never come to disagree about what a row means.
 *
 * Runs when a step is created and when a plan written before this is loaded.
 * NEVER on rename: silently rewiring a step somebody has just retitled is worse
 * than leaving it pointing nowhere.
 */
export function inferStepDestination(title: string): string | null {
  const text = title.toLowerCase()
  for (const [key, practice] of Object.entries(RECAP_PRACTICES)) {
    const destination = PRACTICE_DESTINATIONS[key as keyof typeof RECAP_PRACTICES]
    if (!destination) continue
    if (practice.phrases.some((phrase) => text.includes(phrase))) return destination
  }
  return null
}

/**
 * WHETHER A STEP IS ASKING FOR WORDS, from its own words.
 *
 * The library entries say so outright — `asks` is authored on them, because the
 * words are ours and guessing at our own copy would be a strange thing to do.
 * This runs for the other half: a step somebody typed, on the same rule and at
 * the same three moments as `inferStepDestination` — created, and loaded from a
 * plan written before this existed. Never on rename.
 *
 * The question it hands back is the step's own title. "Write down what went
 * well today" is already a question in every sense that matters, and inventing
 * a better one on somebody's behalf is how a box ends up labelled something
 * they did not write.
 */
/**
 * WHETHER A SAVED STEP IS STILL OURS, so the library may speak for it.
 *
 * The migrations below adopt what the library now says about a step. They may
 * only do that for a step somebody has left alone: the id says which library
 * entry it came from, and the title says they have not since made it their own.
 * A row somebody retitled is theirs, and the library has no business rewriting
 * where it goes or what it asks.
 */
function isUntouchedLibraryStep(saved: Record<string, unknown>, bp: RoutineBlueprint): RoutineBlueprintStep | null {
  const entry = bp.library.find((l) => l.id === String(saved.id))
  if (!entry) return null
  return String(saved.title).trim() === entry.title.trim() ? entry : null
}

/**
 * WHERE A SAVED STEP GOES, and the one migration that had to be version-gated.
 *
 * Three cases, and the third is the bug this exists to fix:
 *
 *   - **No key at all.** A save from before rows could be doors. Inferred from
 *     the step's own words: "Read your north star out loud" said the right
 *     thing months before this existed.
 *   - **A string.** Somebody's choice, or ours. Kept.
 *   - **`null`.** Documented as "somebody cleared it", and on a v2 save that is
 *     exactly what it is. On a **v1** save it is not: creation wrote `null`
 *     whenever inference found nothing, so every row the library had no
 *     destination for at the time — "Journal", "Read your driving force" —
 *     stored a `null` that meant *nothing was known*, and was then read back
 *     as a decision nothing was allowed to overrule. Reported from the page:
 *     *"when i click journal, i still dont go anywhere"* — after the library
 *     had been given the destination, on a plan that could never adopt it.
 *
 * So on a v1 save, an untouched library step adopts what the library now says.
 * It is one-time: the plan is re-saved as v2, where `null` means what it always
 * said it meant and a clearing is permanent.
 */
function stepGoesTo(saved: Record<string, unknown>, bp: RoutineBlueprint, planVersion: number): string | null {
  if (!("goesTo" in saved)) return inferStepDestination(String(saved.title))
  if (typeof saved.goesTo === "string" && saved.goesTo.trim()) return saved.goesTo
  if (planVersion >= NS_PLAN_VERSION) return null
  return isUntouchedLibraryStep(saved, bp)?.goesTo ?? null
}

/** The same three cases for the question a step asks. See `stepGoesTo`. */
function stepAsks(saved: Record<string, unknown>, bp: RoutineBlueprint, planVersion: number): string | null {
  if ("asks" in saved) {
    if (typeof saved.asks === "string" && saved.asks.trim()) return saved.asks.trim()
    if (planVersion >= NS_PLAN_VERSION) return null
  }
  /**
   * The library's own wording wins over the title.
   *
   * `inferStepQuestion` hands back the step's title, which is right for a row
   * somebody typed and poor for ours: "Write three gratitudes" is an
   * instruction and "Three things you are grateful for" is a question, and the
   * question is what goes above the box.
   */
  const entry = isUntouchedLibraryStep(saved, bp)
  if (entry?.asks) return entry.asks
  return "asks" in saved ? null : inferStepQuestion(String(saved.title))
}

export function inferStepQuestion(title: string): string | null {
  const text = title.toLowerCase()
  if (!WRITE_PHRASES.some((phrase) => text.includes(phrase))) return null
  return title.trim() || WRITE_FALLBACK_QUESTION
}

/**
 * A blueprint's starting steps — and there are none any more.
 *
 * Routines used to arrive carrying their default stack: fifteen steps ticked
 * across four routines before anybody had written a word. That reads as
 * generous while you are building it and lands as a demand: the first thing the
 * page said to somebody was *here is your morning, prune it*. The first person
 * through it reported exactly that — "too many things are preselected, I feel
 * overwhelmed" — with the routines the loudest example.
 *
 * `defaultStepIds` still says what the blueprint recommends and every blueprint
 * carries three presets, so the whole stack is one click away. The difference is
 * whose click it is.
 */
function seedSteps(): NsRoutineStep[] {
  return []
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
      /**
       * A ROUTINE IMPROVES EVERYTHING, so it starts pointed at everything.
       *
       * The blueprint's own list was a guess about which four areas a morning
       * routine lifts, and it is wrong in the same direction every time: the
       * hour you spend on yourself before work does not stop at the edge of
       * Health. It is background — not a milestone, not a system, just the
       * thing that runs — and the person can narrow it if they disagree.
       */
      serves: [...areaIds].filter((id) => id !== bp.areaSeedId),
      steps: seedSteps(),
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
    version: NS_PLAN_VERSION,
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
    seasonAreaIds: [],
    experiences: [],
    daily: {},
    logged: {},
    notes: {},
    fields: [],
    journal: {},
    subSteps: [],
    seq,
    updatedAt: null,
  }
}

export function emptyAreaReview(): NsAreaReview {
  return { ten: "", purpose: "", snapshot: "", fortnight: null, goalsAim: null, blockers: "", values: [], identity: "" }
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
  /**
   * WHICH RULES THIS SAVE WAS WRITTEN UNDER. See `NS_PLAN_VERSION`.
   *
   * Only the step migration reads it, and it reads it for one reason: on a v1
   * save, `goesTo: null` cannot be told apart from "nothing was known here",
   * because that is what creation wrote when nothing was.
   */
  const planVersion = typeof obj.version === "number" && Number.isFinite(obj.version) ? obj.version : 1

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
                    // Written before the week grid existed: unplaced, which is
                    // what every step is until somebody says where it goes.
                    days: Array.isArray(s.days)
                      ? [...new Set((s.days as unknown[]).map((d) => Math.round(numberOr(d, -1))).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
                      : [],
                    startMin: typeof s.startMin === "number" && Number.isFinite(s.startMin) ? clamp(Math.round(s.startMin), 0, 24 * 60 - 1) : null,
                    // Written before systems and milestones were separate
                    // steps: linked to nothing, which is where every step
                    // starts until somebody says what it is for.
                    servesGoalIds: readStringList(s.servesGoalIds),
                    /**
                     * ABSENT IS NOT THE SAME AS NULL, and this is the whole
                     * migration.
                     *
                     * A step saved before rows could be doors has no key here,
                     * and the honest thing for "Read your north star out loud"
                     * on an existing plan is to arrive already pointing at the
                     * north star — that row said the right words months before
                     * this existed. `null` means somebody cleared it, and
                     * inference must never argue with that.
                     */
                    goesTo: stepGoesTo(s, bp, planVersion),
                    asks: stepAsks(s, bp, planVersion),
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
    /**
     * THE ONE-TIME REPAIR: "No weed" written before the rule existed.
     *
     * Lines about something you are not doing were read as finish lines, so
     * they were filed as achievements — and an achievement is what the
     * achievements step lists. Somebody who wrote "No weed" as part of quitting
     * it then found it sitting under the things they want to have done, being
     * asked for a date by which they will have finished not smoking.
     *
     * Narrow on purpose: only `readsAsAbstinence` titles, only when the goal is
     * not already a driver, and only the type and the rate change. Everything
     * else the person wrote about it survives, and the kind is three buttons
     * inside the row if this reads it wrong.
     */
    ...(readsAsAbstinence(g.title) && g.type !== "habit_ramp"
      ? { type: "habit_ramp" as const, daysPerWeek: g.daysPerWeek > 0 ? g.daysPerWeek : 7 }
      : null),
  }))

  const review: Record<string, NsAreaReview> = {}
  if (obj.review && typeof obj.review === "object") {
    for (const [k, v] of Object.entries(obj.review as Record<string, unknown>)) {
      if (!areaIds.has(k) || !v || typeof v !== "object") continue
      const r = v as Record<string, unknown>
      review[k] = {
        ten: stringOr(r.ten, ""),
        purpose: stringOr(r.purpose, ""),
        snapshot: stringOr(r.snapshot, ""),
        fortnight: typeof r.fortnight === "number" ? clamp(r.fortnight, 0, 10) : null,
        goalsAim: r.goalsAim === "yes" || r.goalsAim === "no" ? r.goalsAim : null,
        blockers: stringOr(r.blockers, ""),
        values: readStringList(r.values),
        identity: stringOr(r.identity, ""),
      }
    }
  }

  /**
   * Answers to prompts that still exist, plus everything the start doors wrote.
   *
   * The allow-list is here so a prompt that gets deleted does not leave its
   * answer sitting in the store forever. The start doors do not have entries in
   * either prompt list — they are one written day and five questions, keyed by
   * hand — and without the prefix they were dropped on load, which meant the
   * ideal day somebody typed survived until they refreshed the page and not one
   * second longer.
   */
  const knownAnswers = new Set([...STAR_PROMPTS, ...REVIEW_PROMPTS].map((p) => p.id))
  const answers: Record<string, string> = {}
  if (obj.answers && typeof obj.answers === "object") {
    for (const [k, v] of Object.entries(obj.answers as Record<string, unknown>)) {
      if (typeof v !== "string") continue
      if (knownAnswers.has(k) || k.startsWith(START_ANSWER_PREFIX)) answers[k] = v
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

  const experiences: NsExperience[] = Array.isArray(obj.experiences)
    ? (obj.experiences as unknown[])
        .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .filter((e) => typeof e.id === "string" && typeof e.title === "string" && String(e.title).trim())
        .map((e) => ({
          id: String(e.id),
          title: String(e.title),
          // An experience filed under an area that no longer exists is still
          // a thing you want to have done. It loses the tag, not the line.
          areaId: typeof e.areaId === "string" && areaIds.has(e.areaId) ? e.areaId : null,
          done: e.done === true,
          doneOn: typeof e.doneOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.doneOn) ? e.doneOn : null,
          goalId: typeof e.goalId === "string" ? e.goalId : null,
        }))
        // Same rule as `feedsGoalIds`: a pointer at a goal that did not
        // survive the load would render as "already in your goals" over a
        // goal nobody can open.
        .map((e) => ({ ...e, goalId: e.goalId && goals.some((g) => g.id === e.goalId) ? e.goalId : null }))
    : []

  // Ticks against routine steps that still exist. A step deleted since it was
  // ticked leaves a tick pointing at nothing, which would render as a blank row.
  const stepIds = new Set(routines.flatMap((r) => r.steps.map((st) => st.id)))
  const loggableIds = new Set(stepIds)

  /**
   * The to-do lists under the bigger things, dropped when the bigger thing is.
   *
   * A field re-homes to the day when its target goes, because a question
   * stands on its own. A sub-step does not: "write the outline" means nothing
   * once the thing it was an outline for has been deleted, and showing it
   * under the day would be showing a fragment of a plan that no longer exists.
   *
   * Parsed before `logged` because its ids are tickable too — one store for
   * "what got done today", not two that can disagree.
   */
  const subStepTargets = new Set<string>([
    ...linkedGoals.map((g) => g.id),
    ...stepIds,
    ...experiences.map((e) => e.id),
  ])
  const subSteps: NsSubStep[] = Array.isArray(obj.subSteps)
    ? (obj.subSteps as unknown[])
        .filter((u): u is Record<string, unknown> => !!u && typeof u === "object")
        .filter((u) => typeof u.id === "string" && typeof u.targetId === "string" && String(u.title ?? "").trim())
        .filter((u) => subStepTargets.has(String(u.targetId)))
        .map((u) => ({ id: String(u.id), targetId: String(u.targetId), title: String(u.title) }))
    : []
  /**
   * The text fields, and what they are still attached to.
   *
   * A target that did not survive the load — a step deleted, a goal removed,
   * an experience cleared — RE-HOMES the field to the day instead of dropping
   * it. `logged` prunes ticks the same way and that is right for a tick: it is
   * one bit and the thing it pointed at is gone. A field is a question somebody
   * wrote and months of answers underneath it, and deleting all of that to
   * tidy up a dangling id is the plan destroying the only part of itself it
   * cannot regenerate.
   */
  const fieldTargets = new Set<string>([
    ...linkedGoals.map((g) => g.id),
    ...stepIds,
    ...experiences.map((e) => e.id),
  ])
  const fields: NsDailyField[] = Array.isArray(obj.fields)
    ? (obj.fields as unknown[])
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .filter((f) => typeof f.id === "string")
        .map((f) => ({
          id: String(f.id),
          label: stringOr(f.label, ""),
          targetId: typeof f.targetId === "string" && fieldTargets.has(f.targetId) ? f.targetId : null,
          // Every field written before reading was a thing a field could do is
          // one that asks a question, which is what it has been doing. Read off
          // the one list of kinds, so adding a kind cannot leave the loader
          // quietly downgrading it to a write box on the next reload.
          kind: NS_FIELD_KINDS.includes(f.kind as NsFieldKind) ? (f.kind as NsFieldKind) : ("write" as const),
          readSourceId: typeof f.readSourceId === "string" ? f.readSourceId : null,
        }))
    : []

  /**
   * A GO FIELD CARRIES ITS OWN TICK, so its id is tickable too.
   *
   * Parsed here rather than after `logged` for that one reason: a field can
   * hang on the day itself, where no step carries a tick for it, so "read my
   * north star" is ticked under the field's own id. Loaded any later and the
   * prune below would throw every one of those ticks away on the next reload —
   * silently, since a dropped id looks exactly like a day you did nothing.
   */
  for (const field of fields) loggableIds.add(field.id)
  for (const sub of subSteps) loggableIds.add(sub.id)

  const logged: Record<string, string[]> = {}
  if (obj.logged && typeof obj.logged === "object") {
    for (const [date, v] of Object.entries(obj.logged as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(v)) continue
      const ids = (v as unknown[]).filter((id): id is string => typeof id === "string" && loggableIds.has(id))
      if (ids.length > 0) logged[date] = ids
    }
  }

  const notes: Record<string, string> = {}
  if (obj.notes && typeof obj.notes === "object") {
    for (const [date, v] of Object.entries(obj.notes as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof v !== "string") continue
      if (v.trim()) notes[date] = v
    }
  }

  // Answers to fields that still exist. A field the user deleted took its
  // answers with it deliberately, so a stale entry here is a leftover, not a
  // record: it can never be shown and never be edited.
  const fieldIds = new Set(fields.map((f) => f.id))
  const journal: Record<string, Record<string, string>> = {}
  if (obj.journal && typeof obj.journal === "object") {
    for (const [date, v] of Object.entries(obj.journal as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !v || typeof v !== "object") continue
      const row: Record<string, string> = {}
      for (const [fieldId, text] of Object.entries(v as Record<string, unknown>)) {
        if (fieldIds.has(fieldId) && typeof text === "string" && text.trim()) row[fieldId] = text
      }
      if (Object.keys(row).length > 0) journal[date] = row
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
    version: NS_PLAN_VERSION,
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
    seasonAreaIds: readStringList(obj.seasonAreaIds).filter((id) => areaIds.has(id)),
    experiences,
    seasonFocusId:
      typeof obj.seasonFocusId === "string" && (goalIdSet.has(obj.seasonFocusId) || areaIds.has(obj.seasonFocusId))
        ? obj.seasonFocusId
        : null,
    daily,
    logged,
    notes,
    fields,
    journal,
    subSteps,
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
    // Written before a driver could count things as well as days. Null is
    // "this one is only a frequency", which is what every saved goal was.
    perWeek: typeof g.perWeek === "number" && Number.isFinite(g.perWeek) && g.perWeek > 0 ? Math.round(g.perWeek) : null,
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
          .map((c) => ({
            id: String(c.id),
            title: String(c.title),
            done: c.done === true,
            celebration: typeof c.celebration === "string" ? c.celebration : "",
          }))
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
    servesOneThing: g.servesOneThing === true,
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
    asked: readStringList(g.asked),
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
      : [...r.steps, stepFromLibrary(item)],
  }), now)
}

/**
 * A step in somebody's own words.
 *
 * `placement` is what the week grid passes and nothing else does: a step
 * written into a routine card has a length and a frequency and no opinion about
 * Tuesday, and a block drawn on the grid has all three.
 */
export function addCustomStep(
  plan: NsPlan,
  routineId: string,
  title: string,
  minutes: number,
  daysPerWeek: number,
  now = nowIso(),
  placement?: { days: number[]; startMin: number | null },
): NsPlan {
  const trimmed = title.trim()
  if (!trimmed) return plan
  const { plan: withSeq, id } = nextId(plan, "s")
  const days = cleanDays(placement?.days ?? [])
  const step: NsRoutineStep = {
    id,
    title: trimmed,
    minutes: Math.max(0, Math.round(minutes)),
    // A placed step's frequency IS how many days it is on, so the two cannot
    // disagree the moment it is created.
    daysPerWeek: days.length > 0 ? days.length : clamp(daysPerWeek, 1, 7),
    dimension: null,
    days,
    startMin: placement?.startMin != null ? clamp(Math.round(placement.startMin), 0, 24 * 60 - 1) : null,
    servesGoalIds: [],
    // Somebody who writes "read my north star before bed" has said where it
    // goes; making them then pick it off a list would be asking twice.
    goesTo: inferStepDestination(trimmed),
    // Same rule for the other direction: "write down what went well" is a row
    // that needs a box, and it should not have to be built next to itself.
    asks: inferStepQuestion(trimmed),
  }
  return withRoutine(withSeq, routineId, (r) => ({ ...r, steps: [...r.steps, step] }), now)
}

/** Days 0-6, no duplicates, in week order. */
function cleanDays(days: number[]): number[] {
  return [...new Set(days.map((d) => Math.round(d)).filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
}

/**
 * CHANGE, OR SILENCE, THE QUESTION A STEP ASKS.
 *
 * A blank question is stored as null — the step goes back to being a tick — and
 * that is deliberately not the same as never having had one: the loader's
 * inference reads `null` as a decision and leaves it alone, so a step somebody
 * quietened does not come back asking on the next reload.
 *
 * Nothing already written under it is touched. The answers live in
 * `plan.journal` keyed by the step, and clearing a question is somebody saying
 * "stop asking me this", never "delete the last three months of it".
 */
export function setStepAsks(plan: NsPlan, routineId: string, stepId: string, question: string | null, now = nowIso()): NsPlan {
  return updateStep(plan, routineId, stepId, { asks: question?.trim() ? question.trim() : null }, now)
}

export function removeStep(plan: NsPlan, routineId: string, stepId: string, now = nowIso()): NsPlan {
  return withRoutine(plan, routineId, (r) => ({ ...r, steps: r.steps.filter((s) => s.id !== stepId) }), now)
}

export function updateStep(plan: NsPlan, routineId: string, stepId: string, patch: Partial<Omit<NsRoutineStep, "id">>, now = nowIso()): NsPlan {
  /**
   * The numbers are bounded here rather than in the box.
   *
   * How long a step takes is the person's estimate and nobody else's, but a
   * routine of NaN minutes prints "about NaN min" and a step of 900 makes the
   * weekly load meaningless. Three hours is past the point where the answer is
   * a different routine, not a bigger number.
   */
  const clean: Partial<Omit<NsRoutineStep, "id">> = { ...patch }
  if (patch.minutes != null) clean.minutes = clamp(Math.round(numberOr(patch.minutes, 0)), 0, 180)
  if (patch.daysPerWeek != null) clean.daysPerWeek = clamp(Math.round(numberOr(patch.daysPerWeek, 1)), 1, 7)
  return withRoutine(plan, routineId, (r) => ({
    ...r,
    steps: r.steps.map((s) => (s.id === stepId ? { ...s, ...clean } : s)),
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
  // A step that survives the swap keeps the slot it was given on the week grid.
  // Rebuilding it from the library would silently un-place it, and "I moved my
  // meditation to 6am and changing preset put it back to nowhere" is the kind
  // of loss nobody reports, they just stop using the grid.
  const placed = new Map(routine.steps.map((s) => [s.id, s]))
  const steps = ids
    .map((id) => bp.library.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ ...stepFromLibrary(s), days: placed.get(s.id)?.days ?? [], startMin: placed.get(s.id)?.startMin ?? null }))
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

/**
 * Write a trackable program's training days into the workout routine.
 *
 * The bridge between the two halves of "I will train four times a week". The
 * programs slice knows what the four sessions ARE — Upper A, Lower A, Upper B,
 * Lower B, with the lifts under them — and the plan on this page is where the
 * week is actually looked at. Before this, picking StrongLifts and naming your
 * training week were two unconnected acts, and the plan would happily say
 * "Push / Pull / Legs" beside an enrollment running something else.
 *
 * `applySplit` cannot do this: it takes an id from the six preset splits, and a
 * program's days are whatever that program says they are — including days the
 * user renamed in the editor.
 *
 * The routine keeps its steps. The days say WHEN you train; the steps say what
 * else the routine carries (protein, steps, a weigh-in), and a program has no
 * opinion about those.
 */
export function applyProgramDays(
  plan: NsPlan,
  routineId: string,
  dayNames: string[],
  now = nowIso(),
  program: NsRoutineProgram | null = null
): NsPlan {
  if (dayNames.length === 0) return plan
  let next = plan
  const days: NsSplitDay[] = []
  for (const name of dayNames) {
    const { plan: withSeq, id } = nextId(next, "d")
    next = withSeq
    days.push({ id, name })
  }
  return withRoutine(
    next,
    routineId,
    (r) => ({ ...r, splitDays: days, daysPerWeek: clamp(days.length, 1, 7), program }),
    now
  )
}

/**
 * Forget the enrollment a training week was tracked by, keeping the week.
 *
 * For when the program is ended somewhere else. The days you wrote down are
 * still your days — they are simply no longer tracked by anything, and the plan
 * has to stop claiming that they are. Deleting the week instead would throw
 * away a decision the user made because a DIFFERENT decision was reversed.
 */
export function detachProgramFromRoutines(
  plan: NsPlan,
  enrollmentId: string,
  now = nowIso()
): NsPlan {
  const affected = plan.routines.filter((r) => r.program?.enrollmentId === enrollmentId)
  if (affected.length === 0) return plan
  return affected.reduce(
    (acc, r) => withRoutine(acc, r.id, (cur) => ({ ...cur, program: null }), now),
    plan
  )
}

/** The enrollments this plan believes it is training, newest first. */
export function trackedEnrollmentIds(plan: NsPlan): string[] {
  return plan.routines.map((r) => r.program?.enrollmentId).filter((id): id is string => Boolean(id))
}

/**
 * Point the plan's workout routine at a program that was just started.
 *
 * Adds the workout routine if the plan has not got one yet, because starting a
 * program IS deciding to train and a plan that then shows no training week is
 * telling the user something untrue about their own week. Finds it by blueprint
 * rather than by label so a routine somebody renamed to "Gym" is still the one.
 */
export function applyProgramToWorkoutRoutine(
  plan: NsPlan,
  dayNames: string[],
  now = nowIso(),
  program: NsRoutineProgram | null = null
): NsPlan {
  if (dayNames.length === 0) return plan
  const existing = plan.routines.find((r) => r.blueprintId === "workout")
  const next = existing ? plan : addRoutine(plan, "workout", now)
  const routine = next.routines.find((r) => r.blueprintId === "workout")
  if (!routine) return plan
  return applyProgramDays(next, routine.id, dayNames, now, program)
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
  return `${n}, ${routineWeeklySessions(routine)} sessions a week`
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
    // Empty is how a routine arrives now, so empty is untouched.
    routine.steps.length === 0 &&
    routine.splitDays.map((d) => d.name).join("\u0000") === seeded.days.map((d) => d.name).join("\u0000")
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
    perWeek: null,
    habits: [],
    reasonsList: [],
    feeling: "",
    feedsGoalIds: [],
    servesOneThing: false,
    reward: "",
    stake: "",
    obstacles: [],
    beliefs: [],
    values: [],
    metric: null,
    serves: [],
    asked: [],
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
    // Hand-written checkpoints only. A generated milestone is a number on the
    // way to the number — "Bench 24 kg" on the way to 28 — and counting it as
    // an action meant that answering "where are you today", which spaces the
    // rungs, silently satisfied "what will you actually do about it". The goal
    // came out the far end of the guide with a climb and still nothing to do on
    // a Tuesday, which is the exact gap this predicate exists to name.
    tasks: goal.checkpoints
      .filter((c) => !c.id.startsWith("m"))
      .map((c) => ({ id: c.id, title: c.title, dueOffsetDays: 0 })),
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
  // `celebration` is set empty rather than left off, so a checkpoint made here
  // and the same one read back off disk are the same object.
  const checkpoint: NsCheckpoint = { id, title: trimmed, done: false, celebration: "" }
  return updateGoal(withSeq, goalId, { checkpoints: [...goal.checkpoints, checkpoint] }, now)
}

export function updateCheckpoint(plan: NsPlan, goalId: string, checkpointId: string, patch: Partial<Omit<NsCheckpoint, "id">>, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { checkpoints: goal.checkpoints.map((c) => (c.id === checkpointId ? { ...c, ...patch } : c)) }, now)
}

/**
 * A number can be the NAME of a thing rather than an amount of one.
 *
 * "Buy a Ferrari 458" was read as a climb from nought to four hundred and
 * fifty-eight — of what, the page never said, because there is no unit and
 * there was never going to be one. 458 is the car's name, the same way "an
 * iPhone 15" or "a Porsche 911" is. Reported from the page: written in Money as
 * something to experience, it came back as a ladder with rungs on it. And it is
 * the app's own example under the intake box, so the offer somebody is most
 * likely to click is the one that broke.
 *
 * The tell is the article. "a" says the count is one, so a bare number sitting
 * behind "a <noun>" with no unit behind IT is part of that noun's name and not
 * a quantity of anything. The article has to be near the number — "buy a house
 * and save 500000" is still five hundred thousand — so only the two words in
 * front of it are looked at.
 *
 * A number carrying a unit is safe either way and never reaches here: "do a
 * 5k", "en artikel som 10 læser".
 */
function namesAThing(prefix: string, unit: string): boolean {
  if (unit) return false
  const words = prefix.trim().split(/\s+/).slice(-2)
  return words.some((w) => /^(a|an|the|en|et|den|det)$/i.test(w))
}

/** Words that are never a unit. "36 dumbbells" is not 36 dumbbells. */
const NOT_A_UNIT = /^(for|in|by|to|of|at|and|the|a|x)$/i

/**
 * Verbs that name nothing on their own, so a climb cannot be labelled with one.
 * "Get 22.5 kg" is not a rung anybody can read; "Bench 22.5 kg" is.
 */
const COLOURLESS_VERB = /^(get|got|have|hit|reach|do|make|nå|få)$/i

/** What cannot be the noun a climb is about, standing behind the unit. */
const NOT_A_NOUN = /^(for|in|by|to|of|at|and|the|a|an|x|this|next|per|with|from|every|på|i|om|til|hver|og|med)$/i

/**
 * The number a finish-line goal is really about, read out of its own title.
 *
 * "Bench 36 kg dumbbells for 6 reps" is typed as a finish line, correctly: you
 * either did it or you did not. But there is obviously a climb underneath it,
 * and the user should not have to retype the number to get the rungs. The FIRST
 * number wins, because that is the one people put the target in — the 6 in "for
 * 6 reps" is the shape of the rep, not the thing that grows.
 *
 * `prefix` is whatever came before the number, so the milestones can be called
 * "Bench 30 kg" rather than "30 kg" sitting under a title you have to re-read.
 *
 * Null where the sentence carries no number, and where the number it carries is
 * a name rather than an amount — see `namesAThing`. Null is not a failure: the
 * builder answers it by ASKING for the target and the unit, which is the only
 * honest question to put to a car.
 */
export function parseGoalTarget(title: string): { value: number; unit: string; prefix: string } | null {
  // Letters rather than a-z, because "10 læser" is not ten l. A unit is any
  // word in any alphabet, which is what \p{L} means.
  const match = /(-?\d+(?:[.,]\d+)?)\s*(\p{L}{1,12}|%|µ)?/u.exec(title)
  if (!match) return null
  const value = Number(match[1].replace(",", "."))
  if (!Number.isFinite(value)) return null
  const raw = (match[2] ?? "").trim()
  const unit = NOT_A_UNIT.test(raw) ? "" : raw
  let prefix = title.slice(0, match.index).trim().replace(/[,:–-]$/, "").trim()
  if (namesAThing(prefix, unit)) return null
  /**
   * THE NOUN CAN STAND BEHIND THE NUMBER.
   *
   * "Get 28 kg bench 3 sets 8 reps by april" put "get" in front of every rung
   * and threw "bench" away, so the climb read "get 22.5 kg" — of what? The
   * words in front of the number are the label everywhere else, and here they
   * are one verb that means nothing on its own. So where that is all there is,
   * the word immediately behind the unit becomes the label instead.
   *
   * Immediately behind, and no further: "reach 80 kg by december" has a
   * preposition sitting there, and reading past it labels the climb "december".
   */
  if (COLOURLESS_VERB.test(prefix)) {
    const noun = /^\s*(\p{L}+)/u.exec(title.slice(match.index + match[0].length))?.[1] ?? ""
    if (noun && !NOT_A_NOUN.test(noun)) prefix = noun
  }
  return { value, unit, prefix }
}

/**
 * Evenly spaced values from where you are to where you are going.
 *
 * The target is always the last one, so ticking the last milestone and hitting
 * the goal are the same event rather than two things that nearly agree. Works
 * downhill as well as up, because "under 80 kg" is the same climb in reverse.
 */
/**
 * The smallest real increment of a unit.
 *
 * Spacing four rungs between a 20 kg bench and a 36 kg one gives 24, 28, 32 —
 * and 33 kg, which came up here, is not a weight anybody can load. Plates come
 * in 1.25s and dumbbells in 2s, reps come in whole reps, and a rung you cannot
 * physically hit is worse than no rung: it reads as a system that has never
 * seen a gym. So values get snapped onto the grid the unit actually moves on.
 *
 * Unknown units get no grid rather than a guessed one. Whole numbers are the
 * floor for anything counted, because two thirds of a pull-up is not a thing.
 */
export function unitGrain(unit: string, span = 0): number {
  const u = unit.trim().toLowerCase()
  if (/^(kg|kgs|kilo|kilos|kilograms?)$/.test(u)) return 2.5
  if (/^(lb|lbs|pounds?)$/.test(u)) return 5
  if (/^(km|mi|miles?|k)$/.test(u)) return 0.5
  if (/^(%|percent)$/.test(u)) return 1
  /**
   * Big numbers have a grid too, and it is decimal.
   *
   * "2200 → 10000 a month" spaced evenly gives 4150, 6100, 8050 — arithmetic
   * nobody would ever write down. A revenue milestone is 4000 or 4500, the same
   * way a bench is 32.5 and not 33: the unit is money and money moves in round
   * numbers. The grid scales with the climb so that a 40 kr goal is not rounded
   * to nothing and a 400,000 kr one does not get 47 rungs of detail.
   */
  const size = Math.abs(span)
  if (size >= 100) {
    const magnitude = 10 ** Math.floor(Math.log10(size))
    // A fifth of the leading magnitude: 500 in a climb of thousands, 5000 in a
    // climb of tens of thousands.
    return magnitude / 2
  }
  return 1
}

/**
 * The grid for a climb too short for the ordinary one.
 *
 * 20 kg to 22 kg cannot be spaced on 2.5s, and half-kilo plates exist, so the
 * grid gets finer. What it never gets is fractional where the unit is counted:
 * a rep is a rep, and 8.5 pull-ups is the thing this whole function is for.
 */
function fineGrain(unit: string): number {
  const u = unit.trim().toLowerCase()
  if (/^(kg|kgs|kilo|kilos|kilograms?)$/.test(u)) return 0.5
  if (/^(lb|lbs|pounds?)$/.test(u)) return 1
  if (/^(km|mi|miles?|k)$/.test(u)) return 0.1
  return 1
}

/** Snap onto the unit's grid, staying strictly inside the climb. */
function snapValue(value: number, grain: number): number {
  if (grain <= 0) return value
  return Number((Math.round(value / grain) * grain).toFixed(2))
}

export function milestoneValues(from: number, to: number, count: number, unit = ""): number[] {
  const steps = Math.max(1, Math.min(12, Math.round(count)))
  const span = to - from
  if (span === 0) return [to]
  const size = span / steps
  // One decimal only when whole numbers would collapse two rungs into one.
  const decimals = Math.abs(size) < 1 ? 1 : 0
  // No unit is still a grid: unlabelled climbs are counts far more often than
  // not, and "8.5" under a goal about pull-ups is the bug either way.
  /**
   * The grid applies to the rungs on the way up, never to the ends. The target
   * is the person's own number and the start is what they measured this
   * morning; rounding either of those would be rounding them.
   */
  const rungsOn = (grain: number) => {
    const out: number[] = []
    for (let i = 1; i <= steps; i += 1) {
      const raw = from + size * i
      const value = i < steps ? snapValue(raw, grain) : Number(raw.toFixed(decimals))
      // Snapping can land two rungs on the same number, or push one past either
      // end of the climb; each of those stops being a rung.
      if (out[out.length - 1] === value) continue
      if (span > 0 ? value >= to || value <= from : value <= to || value >= from) continue
      out.push(value)
    }
    return out
  }
  /**
   * The ordinary grid first, and a finer one only if it left no room.
   *
   * Asking for four rungs between 20 kg and 22 kg on a 2.5 kg grid produces no
   * rungs at all, which is true but useless. Where that happens the climb is
   * short enough that the half-kilo plates are the honest answer.
   */
  let out = rungsOn(unitGrain(unit, span))
  if (out.length < Math.min(2, steps)) out = rungsOn(fineGrain(unit))
  if (out[out.length - 1] !== to) out.push(to)
  return out
}

/**
 * Turn a finish line into a climb: one checkpoint per milestone, in order.
 *
 * Replaces any milestones generated before, and leaves checkpoints the user
 * wrote by hand alone. Regenerating with a different count is the common case
 * (four felt like a lot, try three), and it must not leave the old four behind.
 */
export function setMilestones(
  plan: NsPlan,
  goalId: string,
  spec: { from: number; to: number; count: number; unit?: string; prefix?: string },
  now = nowIso(),
): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const unit = (spec.unit ?? "").trim()
  const values = milestoneValues(spec.from, spec.to, spec.count, unit)
  const prefix = (spec.prefix ?? "").trim()
  const kept = goal.checkpoints.filter((c) => !c.id.startsWith("m"))
  let next = plan
  const made: NsCheckpoint[] = []
  for (const value of values) {
    const seeded = nextId(next, "m")
    next = seeded.plan
    const label = `${value}${unit ? ` ${unit}` : ""}`
    made.push({ id: seeded.id, title: prefix ? `${prefix} ${label}` : label, done: false, celebration: "" })
  }
  // The generated rungs come first: they are the order of the climb, and a
  // hand-written "book the platform" belongs after it rather than interleaved
  // at whatever position it happened to be added.
  return updateGoal(next, goalId, { checkpoints: [...made, ...kept] }, now)
}

/**
 * A lift does not go up in weight alone.
 *
 * Asked for two milestones between a 22 kg bench and a 26 kg one, the honest
 * arithmetic answer is "25, then 26", which is not a plan — it is the same lift
 * twice with a number changed. Nobody adds 4 kg by deciding to. They add reps
 * at the weight they have until the top set is comfortable, then take the next
 * weight and lose the reps again, and that zig-zag IS the training.
 *
 * So a climb in kilos becomes weight × reps: hold the weight, build the reps,
 * take the jump, repeat. Where a target date exists the rungs get a week each,
 * because "24 kg by week three" is a thing you can be behind on.
 */
export function liftProgression(
  from: number,
  to: number,
  unit: string,
  opts: { count?: number; sets?: number; repLow?: number; repHigh?: number; weeks?: number } = {},
): string[] {
  const { count = 3, sets = 3, repLow = 6, repHigh = 8, weeks } = opts
  if (!Number.isFinite(from) || !Number.isFinite(to) || to === from) return []
  const label = (w: number) => `${Number(w.toFixed(2))}${unit ? ` ${unit}` : ""}`
  /**
   * Equal jumps, not equal spacing.
   *
   * Spacing points evenly and then snapping them lands 22 → 22.5 → 25, which
   * is half a plate followed by a full one — nobody trains like that. A lift
   * goes up by the same jump every time until the last one, which is however
   * much is left over to the number the person actually wrote.
   */
  const span = to - from
  const grain = unitGrain(unit, span)
  const up = span > 0
  const jump = Math.max(grain, Math.round(Math.abs(span) / Math.max(1, count) / grain) * grain)
  const weights = [from]
  for (let w = from + (up ? jump : -jump); up ? w < to : w > to; w += up ? jump : -jump) {
    weights.push(Number(w.toFixed(2)))
    if (weights.length > 24) break
  }
  weights.push(to)
  const rungs: string[] = []
  for (const [i, weight] of weights.entries()) {
    // The first weight is where they already are, so there is nothing to prove
    // at the low reps — the work there is building up to the top set.
    if (i > 0) rungs.push(`${label(weight)} ${sets}×${repLow}`)
    rungs.push(`${label(weight)} ${sets}×${repHigh}`)
  }
  if (!weeks || rungs.length < 2) return rungs
  return rungs.map((rung, i) => {
    const week = Math.round((i / (rungs.length - 1)) * weeks)
    return week === 0 ? `${rung} — now` : `${rung} — week ${week}`
  })
}

/** Is this a climb in weight, where reps are half the progression? */
export function isLiftClimb(unit: string): boolean {
  return /^(kg|kgs|kilo|kilos|kilograms?|lb|lbs|pounds?)$/i.test(unit.trim())
}

/**
 * A progression in the person's own words.
 *
 * "5 pull-ups → 10 pull-ups → muscle-up" is a perfectly good ladder and no
 * arithmetic will ever produce it: the last rung is not more of the first one,
 * it is a different move. Anything a person can write as a sequence gets to be
 * the rungs, and the ones the system generates are a starting draft rather than
 * the only shape allowed.
 */
export function parseProgression(text: string): string[] {
  return text
    /**
     * Newlines and arrows only.
     *
     * Commas and dashes were separators too, which cut "10 pull-ups, strict"
     * into two rungs and "100 kg — week 3" into a weight and a week. Both
     * belong INSIDE a rung far more often than between two, and the person
     * writing a progression has already told us where the breaks are by
     * pressing Enter or drawing an arrow.
     */
    .split(/\u2192|->|=>|\n|;| then /gi)
    // Strip list markers only. "5 pull-ups" starts with a digit and the digit
    // is the rung, so a greedy leading-number strip would delete the ladder.
    .map((part) => part.trim().replace(/^(?:[-*\u2022]|\d+[.)])\s+/, "").trim())
    .filter((part) => part.length > 0)
}

/**
 * Replace the generated rungs with a written progression, keeping hand-written
 * checkpoints where they are — same contract as `setMilestones`.
 */
export function setProgression(plan: NsPlan, goalId: string, rungs: string[], now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  const kept = goal.checkpoints.filter((c) => !c.id.startsWith("m"))
  let next = plan
  const made: NsCheckpoint[] = []
  for (const title of rungs) {
    if (!title.trim()) continue
    const seeded = nextId(next, "m")
    next = seeded.plan
    made.push({ id: seeded.id, title: title.trim(), done: false, celebration: "" })
  }
  return updateGoal(next, goalId, { checkpoints: [...made, ...kept] }, now)
}

/** Weeks between today and a goal's target date, for pacing the rungs. */
export function weeksUntil(targetDate: string | null, today: string): number {
  if (!targetDate) return 0
  const end = Date.parse(`${targetDate}T00:00:00Z`)
  const start = Date.parse(`${today}T00:00:00Z`)
  if (!Number.isFinite(end) || !Number.isFinite(start) || end <= start) return 0
  return Math.round((end - start) / (7 * 24 * 60 * 60 * 1000))
}

/**
 * Hand-written rungs, dated.
 *
 * A written progression — "5 pull-ups → 10 pull-ups → muscle-up" — arrives as
 * an ordered list and nothing else, so the page could show the order and not
 * WHEN. A rung with no date is a rung you are never behind on. They spread
 * evenly between today and the goal's date, the same way the computed ones do,
 * with the last one landing on the date itself.
 */
export function datedRungs(goal: NsGoal, today = todayISO()): Array<{ id: string; title: string; date: string | null; done: boolean }> {
  const rungs = milestoneCheckpoints(goal)
  if (rungs.length === 0) return []
  const span = goal.targetDate ? daysBetween(today, goal.targetDate) : 0
  return rungs.map((rung, i) => ({
    id: rung.id,
    title: rung.title,
    date: span > 0 ? addDaysISO(today, Math.round((span * (i + 1)) / rungs.length)) : null,
    done: rung.done,
  }))
}

/** Milestones this goal already carries, as opposed to written checkpoints. */
export function milestoneCheckpoints(goal: NsGoal): NsCheckpoint[] {
  return goal.checkpoints.filter((c) => c.id.startsWith("m"))
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

/**
 * WHICH GOALS OWE A REASON, AND WHICH DO NOT.
 *
 * A milestone is a thing you want, and the why is the whole of whether you
 * still want it in February — asking it is the point of writing the milestone
 * down at all. A system is a thing you do: four runs a week, thirty minutes
 * with the numbers on a Sunday. Not every run needs a why. Asking one of each
 * of them produces a page of paperwork, and a page that says "5 goals need a
 * why" when four of them are runs has taught the person to ignore the count.
 *
 * The routines already say this out loud — "not a milestone and not a system,
 * it just runs, and nothing here needs justifying" — and a written practice is
 * the same animal with a rate on it. The why box stays on every goal, because
 * somebody who has a reason for their Tuesday runs should be able to write it.
 * It is not asked for, and its absence is not a gap.
 */
export function goalNeedsWhy(goal: NsGoal): boolean {
  return isMilestone(goal)
}

/**
 * And a date, for the same reason.
 *
 * "By when" is what separates a milestone from a thing you will get to; a rate
 * you hold every week is not going anywhere in particular and has nothing to
 * put in the box. The ramp on a practice already carries its own dates.
 */
export function goalNeedsDate(goal: NsGoal): boolean {
  return !isSystem(goal)
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

/**
 * Does this milestone have anything moving it — anywhere in the plan?
 *
 * NOT "does it have an action of its own". Somebody who wants 100 kg on the
 * bench, 140 on the squat and one muscle-up has three milestones and one
 * system: they go to the gym four times a week. Asking each of the three what
 * it will do about itself gets the same answer written three times, and the
 * page saying "needs an action" beside all of them is the page failing to
 * understand that systems are shared on purpose.
 *
 * So a milestone is answered by a link — to a routine step, to a driver, or by
 * an action of its own if that is genuinely what it has.
 */
export function milestoneHasSystem(plan: NsPlan, goal: NsGoal): boolean {
  return systemsForGoal(plan, goal.id).length > 0
}

/** What is still missing before this counts as a planned goal. */
export function goalGaps(goal: NsGoal): string[] {
  const gaps: string[] = []
  /**
   * A PRACTICE IS FINISHED WHEN IT HAS A RATE.
   *
   * "Run four times a week" is the whole thing: it says what you do and how
   * often, there is nothing to climb to, no finish line to date, and no reason
   * it owes anybody. It was being asked for a why, a date, a belief rating, a
   * desire rating and a one-sentence version of itself — five boxes for a run —
   * and every one of them unanswered made the row say "needs work" beside
   * something that was already complete. What a system genuinely lacks is a
   * rate, and a milestone to point at, which is the systems step's own
   * question rather than a gap on the goal.
   */
  if (isSystem(goal)) {
    if (goal.daysPerWeek < 1) gaps.push("a rate")
    return gaps
  }
  if (goalNeedsWhy(goal) && !goalHasWhy(goal)) gaps.push("a why")
  if (goalNeedsDate(goal) && !goal.targetDate) gaps.push("a date")
  if (goal.type === "milestone_ladder" && (!goal.ladder || goal.ladder.target === goal.ladder.start)) gaps.push("a number to climb to")
  if (goal.type === "achievement" && goal.checkpoints.length === 0) gaps.push("checkpoints")
  if (goal.beliefLevel == null || goal.desireLevel == null) gaps.push("both ratings")
  if (goalNeedsAction(goal)) gaps.push("an action")
  if (!goal.sentence.trim()) gaps.push("the sentence")
  return gaps
}

export function goalIsQualified(goal: NsGoal): boolean {
  // What it costs if it does not happen is the why asked the other way round,
  // so a practice is not asked that either.
  const painAsked = goalNeedsWhy(goal)
  return goalGaps(goal).length === 0 && (!painAsked || goal.painWhy.trim().length > 0)
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
  return rankCuedValues(corpus)
}

/**
 * Every place a value has already been named, one row per value.
 *
 * WHY THIS EXISTS. By the time somebody reaches the values step they have
 * answered "what matters to you" five or six times, in five or six different
 * boxes: a word tapped off the menu on the first list, a chip clicked inside
 * Health, a value hung on one goal, a paragraph about waking up near the water
 * with their kids. Every one of those was an answer. Each was thrown away as
 * soon as its box closed, and then the ordering step opened on a blank list and
 * asked a seventh time. This hands the work back.
 *
 * TWO KINDS OF EVIDENCE, NEVER MIXED. A value they clicked is something they
 * said. A value read out of their prose is something we guessed off a cue word.
 * `chosen` is the line between them, so the surface can print them apart and
 * never quietly promote a guess into a thing somebody told us.
 *
 * One box counts once. A value cued three times in the same paragraph is one
 * place and three hits, because "you keep coming back to this" and "you said it
 * in three different rooms" are different facts and both are worth having.
 */
export function valueEvidence(plan: NsPlan): NsValueEvidence[] {
  const rows = new Map<string, NsValueEvidence>()

  const note = (value: string, mention: NsValueMention) => {
    const label = value.trim()
    if (!label) return
    const key = label.toLowerCase()
    let row = rows.get(key)
    if (!row) {
      row = { value: label, mentions: [], areas: [], places: 0, hits: 0, rank: null, past: false, chosen: false }
      rows.set(key, row)
    }
    const already = row.mentions.find((m) => m.kind === mention.kind && m.where === mention.where)
    if (already) already.hits += mention.hits
    else row.mentions.push(mention)
  }

  // ---- what they clicked. The lists first, so a row's display casing comes
  // from the whole-life lists rather than from whichever area mentioned it.
  for (const value of plan.currentValues) {
    note(value, { kind: "past", where: VALUES_EVIDENCE.past, tab: "values", hits: 1 })
  }
  for (const value of plan.values) {
    note(value, { kind: "chosen", where: VALUES_EVIDENCE.chosen, tab: "values", hits: 1 })
  }
  for (const area of plan.areas) {
    for (const value of areaReview(plan, area.id).values) {
      note(value, { kind: "area", where: area.label, tab: "now", areaId: area.id, hits: 1 })
    }
  }
  for (const goal of plan.goals) {
    for (const value of goal.values) {
      note(value, {
        kind: "goal",
        where: goal.title.trim() || VALUES_EVIDENCE.untitledGoal,
        tab: "milestones",
        areaId: goal.areaId,
        goalId: goal.id,
        hits: 1,
      })
    }
  }
  for (const value of answerOf(plan, ONE_ANSWERS.values).split("\n")) {
    note(value, { kind: "one", where: VALUES_EVIDENCE.oneThing, tab: "one", hits: 1 })
  }

  // ---- what they wrote. Grouped per box, because "Family, in what you wrote
  // about Relationship" is a place somebody can go and check; "Family, cued
  // somewhere in your plan" is not.
  const writing: Array<{ where: string; tab: NorthStarTabId; areaId?: string; goalId?: string; text: string }> = [
    {
      where: VALUES_EVIDENCE.northStar,
      tab: "star",
      text: [plan.northStar, answerOf(plan, STAR_WHY_ID), answerOf(plan, "become")].join(" \n "),
    },
    ...plan.areas.map((area) => {
      const review = areaReview(plan, area.id)
      return {
        where: area.label,
        tab: "now" as NorthStarTabId,
        areaId: area.id,
        text: [review.ten, review.purpose, review.snapshot, review.identity].join(" \n "),
      }
    }),
    ...plan.goals.map((goal) => ({
      where: goal.title.trim() || VALUES_EVIDENCE.untitledGoal,
      tab: "milestones" as NorthStarTabId,
      areaId: goal.areaId,
      goalId: goal.id,
      text: [goal.title, goal.why, goal.painWhy].join(" \n "),
    })),
  ]
  for (const piece of writing) {
    for (const { value, hits } of cueHits(piece.text)) {
      note(value, { kind: "writing", where: piece.where, tab: piece.tab, areaId: piece.areaId, goalId: piece.goalId, hits })
    }
  }

  const out = [...rows.values()]
  for (const row of out) {
    // A box that was CLICKED does not also get credited for cueing. Health
    // showed up twice on every row somebody had both written a 10 in and
    // clicked a chip in — once as the click, once as our reading of the
    // paragraph next to it — and one box listed twice reads as a bug. The
    // click is the better evidence, so the guess beside it goes.
    const clicked = new Set(row.mentions.filter((m) => m.kind !== "writing").map((m) => m.where))
    row.mentions = row.mentions.filter((m) => m.kind !== "writing" || !clicked.has(m.where))
    // In wheel order rather than mention order, so two rows with the same
    // areas print the same run of colours and can be compared by eye.
    const named = new Set(row.mentions.map((m) => m.areaId).filter(Boolean))
    row.areas = plan.areas.filter((a) => named.has(a.id)).map((a) => a.id)
    row.places = row.mentions.length
    row.hits = row.mentions.reduce((n, m) => n + m.hits, 0)
    row.past = row.mentions.some((m) => m.kind === "past")
    row.chosen = row.mentions.some((m) => m.kind !== "writing")
    const index = plan.values.findIndex((v) => sameValue(v, row.value))
    row.rank = index < 0 ? null : index + 1
  }
  // Things they said before things we guessed, then WIDEST first. A word
  // clicked once outranks one cued nine times in a paragraph, because the click
  // was an answer and the cue is our reading of a sentence — and inside each of
  // those groups the value running through the most areas leads, because that
  // is the one whose ranking decides the most Tuesdays. Volume only breaks ties
  // breadth cannot.
  return out.sort(
    (a, b) =>
      Number(b.chosen) - Number(a.chosen) ||
      b.areas.length - a.areas.length ||
      b.places - a.places ||
      b.hits - a.hits ||
      a.value.localeCompare(b.value),
  )
}

/**
 * The short list of values offered inside ONE area, in the order it earns.
 *
 * Three sources, best first:
 *   1. What they wrote about THIS area. The 10 is a paragraph about what good
 *      looks like here, and it is the closest thing on the page to an answer.
 *   2. What they wrote in the north star, which is the same trick one level up.
 *   3. What this area usually asks for, as the floor, so a blank area still
 *      offers Security under Money rather than a generic twenty words.
 *
 * A value already on the area's list is dropped, so the row is always things
 * they could add rather than a mirror of what is there.
 */
export function areaValueSuggestions(plan: NsPlan, areaId: string, limit = 8): string[] {
  const review = areaReview(plan, areaId)
  const fromArea = cuedValues([review.ten, review.purpose, review.snapshot, review.identity].join(" \n "))
  const fromStar = cuedValues([plan.northStar, answerOf(plan, STAR_WHY_ID)].join(" \n "))
  const floor = AREA_VALUE_SUGGESTIONS[areaId] ?? NS_VALUE_SUGGESTIONS
  const taken = new Set(review.values.map((v) => v.trim().toLowerCase()))
  const out: string[] = []
  for (const value of [...fromArea, ...fromStar, ...floor]) {
    const key = value.toLowerCase()
    if (taken.has(key)) continue
    taken.add(key)
    out.push(value)
    if (out.length >= limit) break
  }
  return out
}

/** Values whose cues appear in a piece of the user's own writing, best first. */
function cuedValues(text: string): string[] {
  return rankCuedValues(text.toLowerCase())
}

/**
 * Score every value against a piece of writing, most-cued first.
 *
 * WHOLE WORDS ONLY. This used to count occurrences with `split(cue)`, on the
 * reasoning that cues contain spaces and escaping them for a regex bought
 * nothing. It bought word boundaries, and without them "stop counting at the
 * till" scored Achievement, because "top" is inside "stop". Every cue is now a
 * `\b…\b` match, which still handles the multi-word cues ("in the bank", "my own
 * hours") because the boundary only has to hold at each end.
 */
function rankCuedValues(corpus: string): string[] {
  return cueHits(corpus).sort((a, b) => b.hits - a.hits || a.value.localeCompare(b.value)).map((s) => s.value)
}

/**
 * Every value a piece of writing cues, with how many times each was cued.
 *
 * Split out of `rankCuedValues` because the count is worth showing, not only
 * sorting by: "you wrote about your kids four times and Family is nowhere on
 * your list" is the sentence, and it needs the four.
 */
function cueHits(text: string): Array<{ value: string; hits: number }> {
  const corpus = text.toLowerCase()
  if (!corpus.trim()) return []
  const scored: Array<{ value: string; hits: number }> = []
  for (const { value, cues } of VALUE_CUES) {
    let hits = 0
    for (const cue of cues) hits += (corpus.match(cueRegex(cue)) ?? []).length
    if (hits > 0) scored.push({ value, hits })
  }
  return scored
}

const CUE_REGEX = new Map<string, RegExp>()

function cueRegex(cue: string): RegExp {
  const cached = CUE_REGEX.get(cue)
  if (cached) return cached
  const escaped = cue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const made = new RegExp(`\\b${escaped}\\b`, "g")
  CUE_REGEX.set(cue, made)
  return made
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

/**
 * Move one value to a given place in the list, sliding everything between it and
 * the destination along. The direct alternative to the duel, and what a drag
 * lands on: dropping "Health" from 7th onto 2nd has to leave 2nd…6th intact and
 * one lower, not swap Health with whoever was 2nd.
 *
 * Out-of-range destinations clamp instead of failing, because a drop past the
 * end of the list means "last", not "nothing happened".
 */
export function moveValueTo(plan: NsPlan, value: string, toIndex: number, now = nowIso()): NsPlan {
  const index = plan.values.findIndex((v) => sameValue(v, value))
  if (index < 0) return plan
  const target = clamp(Math.trunc(toIndex), 0, plan.values.length - 1)
  if (target === index) return plan
  const next = plan.values.filter((_, i) => i !== index)
  next.splice(target, 0, plan.values[index])
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

/**
 * The line about the day. Blank clears it rather than storing an empty string,
 * so "wrote nothing" and "wrote and deleted" are one state.
 */
export function setDayNote(plan: NsPlan, date: string, text: string, now = nowIso()): NsPlan {
  const notes = { ...plan.notes }
  if (text.trim()) notes[date] = text
  else delete notes[date]
  return touch({ ...plan, notes }, now)
}

export function dayNote(plan: NsPlan, date: string): string {
  return plan.notes[date] ?? ""
}

// ------------------------------------------------------ your own text fields

/**
 * ASK YOURSELF SOMETHING, EVERY DAY, IN WORDS.
 *
 * The plan counts and rates: a tick against a step, a number against a driver,
 * a 0-10 against an area. None of that holds "one key learning of today", and
 * that line is the one people already keep by hand — against a goal, not
 * against the day, because the learning belongs to the thing that taught it.
 *
 * A field is declared once and answered daily. `targetId` is whatever it hangs
 * off: a goal, a routine step, an experience, or null for the day itself.
 * Unvalidated on purpose — see the loader, which is where a target that has
 * since been deleted is re-homed rather than dropped.
 */
export function addDailyField(
  plan: NsPlan,
  targetId: string | null,
  label = "",
  kind: NsFieldKind = "write",
  now = nowIso()
): NsPlan {
  const { plan: next, id } = nextId(plan, "f")
  return touch({ ...next, fields: [...next.fields, { id, label, targetId, kind, readSourceId: null }] }, now)
}

/**
 * Flip a field between asking and showing.
 *
 * The answers stay put. A field flipped to `read` stops showing its box, and
 * flipping it back has to bring the writing back with it — otherwise one
 * mis-click on a dropdown is how a month of entries disappears.
 */
export function setDailyFieldKind(plan: NsPlan, id: string, kind: NsFieldKind, now = nowIso()): NsPlan {
  if (!plan.fields.some((f) => f.id === id)) return plan
  return touch({ ...plan, fields: plan.fields.map((f) => (f.id === id ? { ...f, kind } : f)) }, now)
}

/** Which piece of the plan a read field shows. See `readSources`. */
export function setDailyFieldSource(plan: NsPlan, id: string, readSourceId: string | null, now = nowIso()): NsPlan {
  if (!plan.fields.some((f) => f.id === id)) return plan
  return touch({ ...plan, fields: plan.fields.map((f) => (f.id === id ? { ...f, readSourceId } : f)) }, now)
}

export function renameDailyField(plan: NsPlan, id: string, label: string, now = nowIso()): NsPlan {
  if (!plan.fields.some((f) => f.id === id)) return plan
  return touch({ ...plan, fields: plan.fields.map((f) => (f.id === id ? { ...f, label } : f)) }, now)
}

/** Move a field to something else, or to the day itself. */
export function moveDailyField(plan: NsPlan, id: string, targetId: string | null, now = nowIso()): NsPlan {
  if (!plan.fields.some((f) => f.id === id)) return plan
  return touch({ ...plan, fields: plan.fields.map((f) => (f.id === id ? { ...f, targetId } : f)) }, now)
}

/**
 * Delete a field AND everything written under it.
 *
 * The answers go with it rather than being left keyed to an id nothing can
 * name: an orphan entry can never be shown or edited again, so keeping it is
 * not keeping anything. The button that calls this says so out loud.
 */
export function removeDailyField(plan: NsPlan, id: string, now = nowIso()): NsPlan {
  if (!plan.fields.some((f) => f.id === id)) return plan
  const journal: Record<string, Record<string, string>> = {}
  for (const [date, row] of Object.entries(plan.journal)) {
    const kept = Object.fromEntries(Object.entries(row).filter(([fieldId]) => fieldId !== id))
    if (Object.keys(kept).length > 0) journal[date] = kept
  }
  return touch({ ...plan, fields: plan.fields.filter((f) => f.id !== id), journal }, now)
}

/**
 * What you wrote in one field on one day. Blank clears it, and an emptied day
 * is deleted, so "wrote nothing" and "wrote and cleared" are one state — the
 * same rule `setDayNote` and `toggleStepLogged` follow.
 */
/**
 * EVERY ID THE JOURNAL WILL ACCEPT AN ANSWER FOR.
 *
 * Two things can ask you a question: a field somebody added, and a routine step
 * whose own words ask for words ("Write three gratitudes"). Both write into
 * `plan.journal` under their own id, because an answer to a question is the
 * same kind of fact whichever of the two asked it, and a second store for the
 * second kind would be a second archive to go looking through.
 *
 * The guard exists so a stale id — a field deleted in another tab, a step
 * removed from a routine — cannot write a dated blob nothing can label.
 */
export function journalQuestionIds(plan: NsPlan): Set<string> {
  const ids = new Set(plan.fields.map((f) => f.id))
  for (const routine of plan.routines) for (const step of routine.steps) if (step.asks?.trim()) ids.add(step.id)
  return ids
}

export function setJournalEntry(plan: NsPlan, date: string, fieldId: string, text: string, now = nowIso()): NsPlan {
  if (!journalQuestionIds(plan).has(fieldId)) return plan
  const row = { ...(plan.journal[date] ?? {}) }
  if (text.trim()) row[fieldId] = text
  else delete row[fieldId]
  const journal = { ...plan.journal }
  if (Object.keys(row).length > 0) journal[date] = row
  else delete journal[date]
  return touch({ ...plan, journal }, now)
}

export function journalEntry(plan: NsPlan, date: string, fieldId: string): string {
  return plan.journal[date]?.[fieldId] ?? ""
}

/**
 * EVERY OTHER DAY YOU ANSWERED THIS ONE, newest first.
 *
 * The point of writing the same line every day is reading the run of them back
 * — a month of "one key learning" is the only place a pattern shows up, and it
 * was unreachable: the box holds today and the store is keyed by date, so the
 * previous thirty answers existed and had nowhere to be seen.
 *
 * `except` is today, left out because the box above the list already holds it
 * and a day appearing twice reads as two different answers.
 */
export function journalHistory(plan: NsPlan, fieldId: string, except?: string): { date: string; text: string }[] {
  return Object.entries(plan.journal)
    .filter(([date]) => date !== except)
    .map(([date, row]) => ({ date, text: row[fieldId] ?? "" }))
    .filter((entry) => entry.text.trim().length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** The fields hung off one thing, or off the day when `targetId` is null. */
export function dailyFieldsFor(plan: NsPlan, targetId: string | null): NsDailyField[] {
  return plan.fields.filter((f) => f.targetId === targetId)
}

// ------------------------------------------------------------ the sub-steps

/**
 * BREAK A BIG WEEKLY THING INTO THE ACTIONS THAT FINISH IT.
 *
 * "Gym 5× a week" is the thing itself; "create a piece of content" is four
 * things wearing one title, and a list that draws them identically leaves the
 * second one un-startable on the morning you have twenty minutes. So anything
 * on Today can carry a to-do list of its own.
 *
 * A blank title is refused rather than added as an empty row: the input is
 * cleared by Enter and Enter on an empty box is not an instruction.
 */
export function addSubStep(plan: NsPlan, targetId: string, title: string, now = nowIso()): NsPlan {
  if (!title.trim()) return plan
  const { plan: next, id } = nextId(plan, "u")
  return touch({ ...next, subSteps: [...next.subSteps, { id, targetId, title: title.trim() }] }, now)
}

export function renameSubStep(plan: NsPlan, id: string, title: string, now = nowIso()): NsPlan {
  if (!plan.subSteps.some((u) => u.id === id)) return plan
  return touch({ ...plan, subSteps: plan.subSteps.map((u) => (u.id === id ? { ...u, title } : u)) }, now)
}

/**
 * Delete a sub-step, and every tick that was against it.
 *
 * The tick lives in `plan.logged` beside the routine steps' own, so leaving it
 * would leave a day counting something that no longer exists — and, worse, a
 * later sub-step could never reuse the id (they come off the same counter, so
 * it cannot) and the count would simply be one too high forever.
 */
export function removeSubStep(plan: NsPlan, id: string, now = nowIso()): NsPlan {
  if (!plan.subSteps.some((u) => u.id === id)) return plan
  const logged: Record<string, string[]> = {}
  for (const [date, ids] of Object.entries(plan.logged)) {
    const kept = ids.filter((loggedId) => loggedId !== id)
    if (kept.length > 0) logged[date] = kept
  }
  return touch({ ...plan, subSteps: plan.subSteps.filter((u) => u.id !== id), logged }, now)
}

/** Move one sub-step up or down its own list. Other targets' lists never move. */
export function moveSubStep(plan: NsPlan, id: string, delta: number, now = nowIso()): NsPlan {
  const sub = plan.subSteps.find((u) => u.id === id)
  if (!sub) return plan
  const siblings = plan.subSteps.filter((u) => u.targetId === sub.targetId)
  const from = siblings.findIndex((u) => u.id === id)
  const to = from + delta
  if (to < 0 || to >= siblings.length) return plan
  const reordered = [...siblings]
  reordered.splice(to, 0, ...reordered.splice(from, 1))
  // Rebuilt in place: the other targets' sub-steps keep their positions in the
  // flat list, so reordering one list cannot shuffle another.
  let next = 0
  const subSteps = plan.subSteps.map((u) => (u.targetId === sub.targetId ? reordered[next++] : u))
  return touch({ ...plan, subSteps }, now)
}

/** The to-do list under one thing, in the order it was written. */
export function subStepsFor(plan: NsPlan, targetId: string): NsSubStep[] {
  return plan.subSteps.filter((u) => u.targetId === targetId)
}

/** How much of one thing's list is ticked off on a day. */
export function subStepProgress(plan: NsPlan, date: string, targetId: string): { done: number; total: number } {
  const list = subStepsFor(plan, targetId)
  const ticked = plan.logged[date] ?? []
  return { done: list.filter((u) => ticked.includes(u.id)).length, total: list.length }
}

/** What one area was rated on one day, or null when it was not. */
export function dailyRating(plan: NsPlan, date: string, areaId: string): number | null {
  return plan.daily[date]?.[areaId] ?? null
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
/**
 * AREA VALUES ARE NOT EDITED ON THE MILESTONES STEP ANY MORE.
 *
 * `addAreaValue`, `removeAreaValue` and `moveAreaValue` lived here for the
 * editor in the area reminder — shown, then made editable, then removed: that
 * step is what you want and what you will do about it, and a ranking exercise
 * in the corner of it is a third subject competing with both. Values are
 * written per area at step 2 and ranked properly at step 6.
 */

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

export function nsProgress(plan: NsPlan, account: NsAccount = NO_ACCOUNT): NsProgress {
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
    /**
     * ONE DEFINITION OF DONE, and it is `stepState`.
     *
     * This map used to carry its own rules, which is how a step could report
     * itself finished on the strength of a single sentence — somebody visited,
     * typed one thing, pressed next, and collected a green tick for a step
     * that was a tenth full.
     */
    done: Object.fromEntries(TAB_ORDER.map((tab: NorthStarTabId) => [tab, stepState(plan, tab, account) === "done"])) as Record<NorthStarTabId, boolean>,
  }
}

/**
 * HOW FULL A STEP IS, in three states rather than two.
 *
 * A tick that means "you have been here" is worse than no tick: it tells
 * somebody they are finished with work they have barely started, and the
 * scoreboard the whole flow is judged on stops being about the plan.
 *
 * So: nothing written is `empty`, something written is `started`, and `done`
 * means every box this step asks for is filled. The rules below are per step
 * because the steps ask for different things — the 10s want all twelve areas
 * rated and pictured; commit wants a sentence and a date on it.
 */
export type NsStepState = "empty" | "started" | "done"

/**
 * No `today` parameter: every rule below reads what somebody has written, not
 * what the calendar says. A step does not empty itself because a week passed.
 */
export function stepState(plan: NsPlan, tab: NorthStarTabId, account: NsAccount = NO_ACCOUNT): NsStepState {
  const filled = (key: string) => answerOf(plan, key).trim().length > 0

  if (tab === "star") {
    const written = plan.northStar.trim().length > 0
    const rungs = rungsAnswered(plan)
    if (!written && rungs === 0 && !starWorkWritten(plan)) return "empty"
    // The star itself AND the ladder under it: who you would have to be, and
    // why it matters, are the half that survives contact with a bad month.
    return written && rungs >= VISION_RUNGS.length ? "done" : "started"
  }

  if (tab === "now") {
    const rated = plan.areas.filter((a) => areaReview(plan, a.id).fortnight != null).length
    const pictured = plan.areas.filter((a) => areaReview(plan, a.id).ten.trim().length > 0).length
    if (rated === 0 && pictured === 0) return "empty"
    // Every area, both boxes. Eleven areas rated and one blank is not a
    // picture of a life, it is a picture with a hole in it.
    return rated === plan.areas.length && pictured === plan.areas.length ? "done" : "started"
  }

  if (tab === "one") {
    /* THE SENTENCE IS ON THE ACCOUNT, so the ring is scored against the account.
       It used to be scored against `answers[one-thing]` — a copy in the browser
       — which meant a person with a saved one thing on a new phone saw the step
       marked as never started. The copy is gone; this is the only reading. */
    const sentence = account.hasOneThing
    const requirements = plan.goals.some((g) => g.servesOneThing)
    if (!sentence && !requirements) return "empty"
    const supports = filled(ONE_ANSWERS.why) && filled(ONE_ANSWERS.cost) && filled(ONE_ANSWERS.identity) && filled(ONE_ANSWERS.values)
    return sentence && supports && requirements ? "done" : "started"
  }

  /**
   * The fork has nothing to fill in, so it is never anything but empty.
   *
   * A dot on a crossroads would be scoring somebody on having chosen, and the
   * three doors are not a checklist — the rail draws no dot for this one.
   */
  if (tab === "pick") return "empty"

  /**
   * Nor has the catalogue. What you take from it lands in the two build steps
   * and is scored there; a ring on "have you had a look" would be scoring
   * somebody on browsing.
   */
  if (tab === "templates") return "empty"

  /**
   * Nor the track step. It holds nothing you wrote — it is the goals from the
   * build steps, pushed out to the place that counts them — so a ring on it
   * would score the same work a second time.
   */
  if (tab === "track" || tab === "today") return "empty"

  /**
   * Nor the journal. It holds a great deal that somebody wrote and none of it
   * is a part of the plan: a ring here would be a page telling you that you are
   * behind on your own diary.
   */
  if (tab === "journal") return "empty"

  /**
   * Nor the last step. It is the other twelve, read back — a ring on it would
   * fill itself off work that has already been scored where it was done, and
   * "you have not finished reading your own plan" is not a thing to tell
   * anybody.
   */
  if (tab === "recap") return "empty"

  /**
   * TWO STEPS, TWO RINGS, and the join is scored on the second one.
   *
   * They were one step with one ring while they were one page. Split back
   * apart, each has to be finishable on its own terms or the first ring can
   * never fill: what you want is finished when every milestone has a why and a
   * date, and whether anything is RUNNING at it is the next step's question,
   * asked on the page where you would answer it.
   */
  if (tab === "milestones") {
    const milestones = milestoneGoals(plan)
    if (milestones.length === 0 && plan.experiences.length === 0) return "empty"
    // A milestone with no why is a thing you wrote down once; with no date it
    // is a thing you will do later.
    const ready = milestones.length > 0 && milestones.every((g) => goalHasWhy(g) && g.targetDate)
    return ready ? "done" : "started"
  }

  if (tab === "systems") {
    const anySystem = systemGoals(plan).length > 0 || plan.routines.some((r) => r.steps.length > 0)
    if (!anySystem) return "empty"
    // Something running, and nothing you said you wanted left with nothing
    // running at it — a milestone nothing is pointed at is a wish, and this is
    // the step that is about pointing things at things.
    return milestonesWithoutSystems(plan).length === 0 ? "done" : "started"
  }

  if (tab === "focus") {
    const areas = plan.seasonAreaIds.length
    if (areas === 0 && plan.seasonFocusId == null) return "empty"
    return areas > 0 && plan.seasonFocusId != null ? "done" : "started"
  }

  if (tab === "values") {
    if (plan.values.length === 0 && plan.currentValues.length === 0) return "empty"
    // A ranking of one is not a ranking. Three is the smallest list where the
    // order says anything about the person.
    return plan.values.length >= 3 ? "done" : "started"
  }

  // commit
  const said = filled(COMMIT_KEY)
  if (!said) return "empty"
  return filled(COMMIT_DATE_KEY) ? "done" : "started"
}

/** Every step's state at once, for the rail. */
export function stepStates(plan: NsPlan, account: NsAccount = NO_ACCOUNT): Record<NorthStarTabId, NsStepState> {
  return Object.fromEntries(TAB_ORDER.map((tab: NorthStarTabId) => [tab, stepState(plan, tab, account)])) as Record<NorthStarTabId, NsStepState>
}

/** Whether a tab has anything on it worth reading back. */
export function tabHasContent(plan: NsPlan, tab: NorthStarTabId, account: NsAccount = NO_ACCOUNT): boolean {
  const p = nsProgress(plan, account)
  if (tab === "star") return p.starWritten || starWorkWritten(plan)
  if (tab === "now") return p.areasRated > 0 || p.areasWithTen > 0 || areasTouched(plan)
  if (tab === "focus") return plan.seasonAreaIds.length > 0 || plan.seasonFocusId != null || account.hasOneThing
  if (tab === "values") return plan.values.length > 0 || plan.currentValues.length > 0
  if (tab === "commit") return answerOf(plan, COMMIT_KEY).trim().length > 0 || plan.areas.some((a) => areaReview(plan, a.id).goalsAim != null)
  if (tab === "milestones") return milestoneGoals(plan).length > 0 || plan.experiences.length > 0
  if (tab === "systems") return systemGoals(plan).length > 0 || plan.routines.some((r) => r.steps.length > 0)
  // A fork holds nothing of its own, so it never reads back as anything, and
  // neither does a catalogue — what you took from it is in the other steps.
  // Track is the same: it is the goals, somewhere else, not more of them.
  if (tab === "pick" || tab === "templates" || tab === "track" || tab === "today" || tab === "recap") return false
  if (tab === "one") return account.hasOneThing || plan.goals.some((g) => g.servesOneThing)
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
    out.push({ id: "goals", text: "No goals written yet", tab: "milestones" })
  } else {
    // Milestones only, both of them: a practice is asked for neither.
    const noWhy = plan.goals.filter((g) => goalNeedsWhy(g) && !goalHasWhy(g)).length
    if (noWhy > 0) out.push({ id: "goalwhy", text: `${noWhy} ${noWhy === 1 ? "goal needs" : "goals need"} a why`, tab: "milestones" })
    const noDate = plan.goals.filter((g) => goalNeedsDate(g) && !g.targetDate).length
    if (noDate > 0) out.push({ id: "goaldate", text: `${noDate} ${noDate === 1 ? "goal has" : "goals have"} no date`, tab: "milestones" })
    // An outcome with nothing running at it is answered on the systems step,
    // which is where the linking is, so the chip goes there.
    const noAction = plan.goals.filter(goalNeedsAction).length
    if (noAction > 0) out.push({ id: "goalaction", text: `${noAction} ${noAction === 1 ? "goal names" : "goals name"} an outcome with no action`, tab: "systems" })
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
    plan.seasonAreaIds.length === 0 &&
    plan.experiences.length === 0 &&
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
// ------------------------------------------------ the plan as a daily practice
//
// Four parts of this plan are also things you DO every day: reading the north
// star, saying your identity lines, saying your affirmations, and reading the
// whole driving force. Each is already a step in a routine library and already
// ticks off on the Today step. What follows lets the page that shows you the
// writing also carry the tick for it, writing to the same day's log, so the two
// screens can never disagree about whether it happened.

/** One practice the plan already runs, and whether it has been done today. */
export interface NsPractice {
  /** The log key. A library step's id, or the id of a step somebody wrote. */
  stepId: string
  title: string
  routineId: string
  routineLabel: string
  doneToday: boolean
}

/** The same practice when the plan does not run it yet, and what saying yes costs. */
export interface NsPracticeOffer {
  blueprintId: string
  stepId: string
  title: string
  routineLabel: string
  /** True when saying yes also creates the routine, rather than adding to one. */
  addsRoutine: boolean
}

/** The library step behind a candidate, or null if the library moved under us. */
function libraryStep(blueprintId: string, stepId: string) {
  const bp = ROUTINE_BLUEPRINT_MAP.get(blueprintId)
  const step = bp?.library.find((s) => s.id === stepId)
  return bp && step ? { bp, step } : null
}

/**
 * What this part of the plan is, as a thing you do — already running, or on offer.
 *
 * `running` is everything the plan already has that IS this practice: the
 * library step if it is turned on, plus any step somebody wrote in their own
 * words whose title carries the practice's phrase. Both are returned because
 * both are true — somebody with "read your north star out loud" in a morning
 * stack AND "read the star before bed" in an evening one really does read it
 * twice, and hiding one of them would make the page lie about their week.
 *
 * `offer` is set only when NOTHING is running, so the page never proposes a
 * second copy of something already on the list.
 */
export function practiceState(
  plan: NsPlan,
  key: keyof typeof RECAP_PRACTICES,
  date = todayISO()
): { running: NsPractice[]; offer: NsPracticeOffer | null } {
  const spec = RECAP_PRACTICES[key]
  const ids = new Set(spec.candidates.map((c) => c.stepId))
  const running: NsPractice[] = []

  for (const routine of plan.routines) {
    for (const step of routine.steps) {
      const byId = ids.has(step.id)
      const byPhrase = spec.phrases.some((phrase) => step.title.toLowerCase().includes(phrase))
      if (!byId && !byPhrase) continue
      running.push({
        stepId: step.id,
        title: step.title,
        routineId: routine.id,
        routineLabel: routine.label,
        doneToday: (plan.logged[date] ?? []).includes(step.id),
      })
    }
  }
  if (running.length > 0) return { running, offer: null }

  // Nothing runs it. Offer the first candidate whose routine already exists,
  // because turning a step on inside a stack somebody already keeps is a much
  // smaller thing to do to their plan than starting them a new stack.
  const owned = spec.candidates.find((c) => plan.routines.some((r) => r.blueprintId === c.blueprintId))
  const pick = owned ?? spec.candidates[0]
  if (!pick) return { running, offer: null }
  const found = libraryStep(pick.blueprintId, pick.stepId)
  if (!found) return { running, offer: null }
  return {
    running,
    offer: {
      blueprintId: pick.blueprintId,
      stepId: pick.stepId,
      title: found.step.title,
      routineLabel: found.bp.label,
      addsRoutine: owned == null,
    },
  }
}

/**
 * Start running a practice: turn its library step on, adding its routine first
 * if the plan has not got one.
 *
 * Ticking today is the CALLER's second call, on purpose — this writes the plan
 * and the log is a different store with a different lifetime, and a function
 * that quietly did both would be the only writer in this file that does.
 */
export function trackPractice(plan: NsPlan, blueprintId: string, stepId: string, now = nowIso()): NsPlan {
  if (!libraryStep(blueprintId, stepId)) return plan
  let next = plan
  let routine = next.routines.find((r) => r.blueprintId === blueprintId)
  if (!routine) {
    next = addRoutine(next, blueprintId, now)
    routine = next.routines[next.routines.length - 1]
  }
  if (!routine) return plan
  if (routine.steps.some((s) => s.id === stepId)) return next
  return toggleRoutineStep(next, routine.id, stepId, now)
}

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
          if (g.type === "habit_ramp") lines.push(`  ${goalRateLabel(g)}`)
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

  if (plan.experiences.length > 0) {
    blocks.push(
      `THINGS TO EXPERIENCE\n${plan.experiences
        .map((e) => {
          const tag = e.areaId ? `${areaLabel.get(e.areaId) ?? ""}: ` : ""
          const done = e.done ? ` — done${e.doneOn ? ` ${formatTargetDate(e.doneOn)}` : ""}` : ""
          const chasing = e.goalId ? " — now a goal" : ""
          return `  ${e.done ? "x" : "-"} ${tag}${e.title}${done}${chasing}`
        })
        .join("\n")}`,
    )
  }

  const reviewed = plan.areas
    .map((a) => ({ a, r: areaReview(plan, a.id) }))
    .filter(({ r }) => r.ten.trim() || r.purpose.trim() || r.snapshot.trim() || r.fortnight != null || r.identity.trim() || r.blockers.trim() || r.values.length > 0)
  if (reviewed.length > 0) {
    blocks.push(
      `WHERE I AM\n${reviewed
        .map(({ a, r }) => {
          const avg = dailyAverage(plan, a.id, today)
          const lines = [`${a.label}${r.fortnight != null ? `: ${r.fortnight}/10 over the last two weeks` : ""}${avg != null ? ` (daily average ${avg})` : ""}`]
          if (r.ten.trim()) lines.push(`  A 10 here: ${r.ten.trim()}`)
          if (r.purpose.trim()) lines.push(`  Why it matters: ${r.purpose.trim()}`)
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
  /** How much a week, when the driver counts things rather than days. */
  perWeek: number | null
  checkpointTitles: string[]
} {
  const driver = target.sharedDriverId ? SHARED_DRIVERS.find((d) => d.id === target.sharedDriverId) : undefined
  const milestone = target.milestoneConfig ?? driver?.milestoneConfig ?? null
  const ramp = target.rampSteps ?? driver?.rampSteps ?? null

  // A stage or a skill has named steps and no number. That is a finish line.
  if (target.stageSteps && target.stageSteps.length > 0) {
    return { type: "achievement", unit: target.unit, ladder: null, rampSteps: null, daysPerWeek: 3, perWeek: null, checkpointTitles: target.stageSteps }
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
      perWeek: null,
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
    const steady = steps[steps.length - 1].frequencyPerWeek
    /**
     * SESSIONS OR THINGS, and the difference is the whole point.
     *
     * "Gym Sessions 4/week" is four times you go. "Approaches 20/week" is
     * twenty approaches, over however many times you go — and it was being
     * clamped into the days field, so a driver the person had chosen at twenty
     * arrived reading "7× a week". Two numbers now: how often, and how much.
     */
    const counted = countsThings(target)
    return {
      type: "habit_ramp",
      unit: counted ? target.label.toLowerCase() : target.unit,
      ladder: null,
      rampSteps: steps,
      // A volume driver says nothing about how many days it takes, so the days
      // stay at the neutral default and the person answers it themselves.
      daysPerWeek: counted ? 3 : clamp(steady, 1, 7),
      perWeek: counted ? steady : null,
      checkpointTitles: [],
    }
  }
  return { type: "achievement", unit: target.unit, ladder: null, rampSteps: null, daysPerWeek: 3, perWeek: null, checkpointTitles: [] }
}

/**
 * Does this driver count THINGS, or times you turned up?
 *
 * The label is the honest signal and the framework has no field for it: a
 * "…Sessions" driver is a frequency — four gym sessions IS four days — and
 * everything else volume-shaped counts things that several of them can happen
 * in one outing. Approaches, texts sent, offers made. Only the default is at
 * stake: both numbers are editable on the goal afterwards.
 */
export function countsThings(target: FrameworkTarget): boolean {
  if (target.primitive !== "volume") return false
  return !/sessions?$/i.test(target.label.trim())
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
    // Twenty approaches a week is the number the catalogue offers and the
    // number the person accepted. Dropping it here is what made it arrive as
    // "7× a week".
    perWeek: shape.perWeek,
  }, now)
  for (const title of shape.checkpointTitles) next = addCheckpoint(next, goal.id, title, now)
  // The Tuesday. A catalogue target arrives with a shape, a number and a date,
  // and used to arrive with nothing you can actually do, which is the gap the
  // amber "what will you do about this?" panel then reported back as the user's
  // omission. Only goals that would otherwise be flagged get one, so a practice
  // (which is its own action) and a finish line with stages in it are untouched.
  const action = defaultActionForTarget(target)
  if (action) {
    const made = next.goals.find((g) => g.id === goal.id)
    if (made && goalNeedsAction(made)) next = addAction(next, goal.id, action.title, action.daysPerWeek, now)
  }
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

/**
 * MILESTONES AND SYSTEMS ARE DIFFERENT ANIMALS, AND THE PAGE NOW SAYS SO.
 *
 * A milestone is a thing you would be glad to have done: 100 kg on the bench,
 * twelve percent, the car, the girlfriend, a threesome, ten thousand a month.
 * It is not a plan and it is not supposed to be — its whole job is to pull.
 * Somebody who writes only these has a wish list.
 *
 * A system is what you actually do: four sessions a week, the morning routine,
 * thirty minutes with your numbers on a Sunday. It is what moves; it is also
 * what nobody feels like doing in February. Somebody who writes only these has
 * a treadmill.
 *
 * The plan is both, joined: every system pointed at a milestone, every
 * milestone with something running at it. What follows is the joining.
 */

/** Things you achieve: a number you climb to, or a finish line you cross. */
export function isMilestone(goal: NsGoal): boolean {
  return goal.type === "milestone_ladder" || goal.type === "achievement"
}

/** Things you do: a rate you hold, week in week out. */
export function isSystem(goal: NsGoal): boolean {
  return goal.type === "habit_ramp"
}

export function milestoneGoals(plan: NsPlan, areaId?: string): NsGoal[] {
  return plan.goals.filter((g) => isMilestone(g) && (!areaId || g.areaId === areaId))
}

export function systemGoals(plan: NsPlan, areaId?: string): NsGoal[] {
  return plan.goals.filter((g) => isSystem(g) && (!areaId || g.areaId === areaId))
}

/** One thing that runs, and where it lives. */
export interface NsSystem {
  kind: "step" | "driver" | "action"
  id: string
  title: string
  /** How often it runs, as a number of days a week. */
  daysPerWeek: number
  /** The routine it belongs to, for a step. */
  routineId?: string
  routineLabel?: string
  /** The goal it belongs to, for a driver or an action. */
  goalId?: string
}

/**
 * Everything running at one milestone.
 *
 * Three shapes reach a milestone and they were never gathered in one place:
 * a routine step somebody linked here, a driver goal that feeds it, and an
 * action written under the milestone itself. To the person they are one
 * question — "what is actually moving this?" — so they answer as one list.
 */
export function systemsForGoal(plan: NsPlan, goalId: string): NsSystem[] {
  const out: NsSystem[] = []
  for (const routine of plan.routines) {
    for (const step of routine.steps) {
      if (!step.servesGoalIds.includes(goalId)) continue
      out.push({
        kind: "step",
        id: step.id,
        title: step.title,
        daysPerWeek: routine.kind === "sequence" ? routine.daysPerWeek : step.daysPerWeek,
        routineId: routine.id,
        routineLabel: routine.label,
      })
    }
  }
  for (const goal of plan.goals) {
    if (!isSystem(goal) || !goal.feedsGoalIds.includes(goalId)) continue
    out.push({ kind: "driver", id: goal.id, title: goal.title, daysPerWeek: goal.daysPerWeek, goalId: goal.id })
  }
  const owner = plan.goals.find((g) => g.id === goalId)
  for (const habit of owner?.habits ?? []) {
    out.push({ kind: "action", id: habit.id, title: habit.title, daysPerWeek: habit.daysPerWeek, goalId })
  }
  return out
}

/** The milestones one routine step has been pointed at. */
export function goalsForStep(plan: NsPlan, routineId: string, stepId: string): NsGoal[] {
  const step = plan.routines.find((r) => r.id === routineId)?.steps.find((s) => s.id === stepId)
  if (!step) return []
  return step.servesGoalIds
    .map((id) => plan.goals.find((g) => g.id === id))
    .filter((g): g is NsGoal => !!g)
}

/**
 * Point a step at a milestone, or stop pointing it.
 *
 * Nothing is inferred here. A step in the morning routine and a bench goal
 * share an area and a language and still might have nothing to do with each
 * other, and a link the person did not make is a link they will not trust.
 */
export function linkStepToGoal(plan: NsPlan, routineId: string, stepId: string, goalId: string, on: boolean, now = nowIso()): NsPlan {
  const step = plan.routines.find((r) => r.id === routineId)?.steps.find((s) => s.id === stepId)
  if (!step) return plan
  if (on && !plan.goals.some((g) => g.id === goalId)) return plan
  const next = on
    ? [...new Set([...step.servesGoalIds, goalId])]
    : step.servesGoalIds.filter((id) => id !== goalId)
  return updateStep(plan, routineId, stepId, { servesGoalIds: next }, now)
}

/**
 * A ROUTINE IS ALWAYS A SYSTEM. The milestone is what it adds up to.
 *
 * "Morning routine" is not something you achieve, and writing it on the wanting
 * side of the page is how people end up with a list of chores they are supposed
 * to find motivating. What IS a milestone is the total: ninety days in a row of
 * it, four hundred hours of deep work, two hundred sessions. Somebody with a
 * ninety-minute business routine five days a week is walking towards five
 * hundred hours whether or not anybody has told them so, and being told is the
 * difference between a habit and a number you are proud of.
 *
 * So the numbers here are read off the routine the person actually built —
 * their minutes, their days — rather than picked from a list. A suggestion that
 * says "400 hours" under a routine that produces eight hours a week is telling
 * them what a year of it looks like. One that says 500 to everybody is telling
 * them nothing.
 */
export interface SystemMilestone {
  id: "hours" | "sessions" | "streak"
  title: string
  unit: string
  target: number
  /** What the number is, in the person's own rate. */
  note: string
}

/**
 * A DRIVER'S RATE, IN WORDS, IN ONE PLACE.
 *
 * The two numbers a driver can carry — how often (`daysPerWeek`) and how much
 * (`perWeek`, counted in `unit`) — were printed by six separate bits of JSX,
 * every one of them saying `${daysPerWeek}× a week`. So the goal that means
 * twenty approaches read as "3× a week" in the row, in the dialog, in the link
 * picker and in the text you sign. One function now, called by all of them.
 */
export function goalRateLabel(goal: NsGoal): string {
  if (goal.perWeek == null) return `${goal.daysPerWeek}× a week`
  const unit = goal.unit.trim()
  const days = `${goal.daysPerWeek} ${goal.daysPerWeek === 1 ? "day" : "days"}`
  return `${goal.perWeek}${unit ? ` ${unit}` : ""} a week, over ${days}`
}

/**
 * Minutes a routine produces in a week, both shapes.
 *
 * EVERY STEP AT ITS OWN FREQUENCY. A sequence used to be charged as "all its
 * minutes × the routine's days", which bills every step at the frequency of the
 * block around it: two lines written three mornings a week were counted seven
 * times, and a ten-step morning routine at mixed frequencies came out roughly
 * half again too expensive.
 *
 * The two shapes differ in one thing only. A SEQUENCE is a block you sit down
 * to, so a step inside it cannot run on a day the block does not — hence the
 * smaller of the two numbers. A WEEKLY routine is a bag of independent items:
 * ten thousand steps six days a week is not capped by a training week that runs
 * four, so each step keeps its own rate.
 */
export function routineWeeklyMinutes(routine: NsRoutine): number {
  const days = (step: NsRoutineStep) =>
    routine.kind === "sequence" ? Math.min(step.daysPerWeek, routine.daysPerWeek) : step.daysPerWeek
  return routine.steps.reduce((sum, s) => sum + s.minutes * days(s), 0)
}

/**
 * Sessions a routine produces in a week, and there is one definition of that.
 *
 * The card printed the SUM of its steps' days ("17 sessions a week"), the
 * milestone generator took the MAX ("7"), and the preset labels summed again —
 * three answers to one question about the same routine, which is how "400 hours
 * of business routine" ended up next to a card claiming something else. A
 * sequence is walked once per day it runs; a weekly routine is a bag of
 * independent steps, so its sessions are its step-instances.
 */
export function routineWeeklySessions(routine: NsRoutine): number {
  if (routine.kind === "sequence") return routine.daysPerWeek
  return routine.steps.reduce((sum, s) => sum + s.daysPerWeek, 0)
}

/** Round to something a person would write down. */
function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step)
}

export function systemMilestones(routine: NsRoutine): SystemMilestone[] {
  // An empty routine adds up to nothing. A sequence routine still carries its
  // days-a-week with no steps in it, and "365 sessions of morning routine"
  // under a routine somebody has not built yet is a promise about nothing.
  if (routine.steps.length === 0) return []
  const weeklyMinutes = routineWeeklyMinutes(routine)
  const weeklySessions = routineWeeklySessions(routine)
  const out: SystemMilestone[] = []
  /**
   * Named after the work, not the container.
   *
   * "400 hours of business routine" is the right number attached to the wrong
   * noun — nobody is proud of hours of a routine, they are proud of hours of
   * deep work. Where one step is most of what the routine is, that step names
   * the milestone; a genuinely mixed routine keeps its own name.
   */
  /**
   * Priced the same way the total is, or the ratio below compares two different
   * arithmetics: this used to charge a step inside a sequence at the ROUTINE's
   * days, so a stretch done once a week inside a daily morning routine looked
   * seven times its size and could name the whole thing.
   */
  const stepMinutes = (step: NsRoutineStep) =>
    step.minutes * (routine.kind === "sequence" ? Math.min(step.daysPerWeek, routine.daysPerWeek) : step.daysPerWeek)
  const dominant = [...routine.steps].sort((a, b) => stepMinutes(b) - stepMinutes(a))[0]
  const dominantMinutes = dominant ? stepMinutes(dominant) : 0
  const total = routineWeeklyMinutes(routine)
  const label = dominant && total > 0 && dominantMinutes / total >= 0.6
    ? dominant.title.toLowerCase()
    : routine.label.toLowerCase()

  if (weeklyMinutes >= 30) {
    const hoursAYear = (weeklyMinutes / 60) * 52
    const target = roundTo(hoursAYear, hoursAYear >= 200 ? 50 : 10)
    out.push({
      id: "hours",
      title: `${target} hours of ${label}`,
      unit: "hours",
      target,
      note: `About ${Math.round((weeklyMinutes / 60) * 10) / 10} hours a week — this is roughly a year of it.`,
    })
  }
  if (weeklySessions > 0) {
    const aYear = weeklySessions * 52
    const target = roundTo(aYear, aYear >= 100 ? 50 : 10)
    out.push({
      id: "sessions",
      title: `${target} sessions of ${label}`,
      unit: "sessions",
      target,
      note: `${weeklySessions}× a week, so about ${Math.round(target / weeklySessions)} weeks.`,
    })
  }
  if (weeklySessions >= 5) {
    // Only where the routine runs most days: "90 days in a row" under a thing
    // you do twice a week is a milestone about a different routine.
    out.push({
      id: "streak",
      title: `90 days in a row of ${label}`,
      unit: "days",
      target: 90,
      note: "The one that is about following the system rather than what it produces.",
    })
  }
  return out
}

/**
 * Turn one of those into a real milestone, joined to the routine that produces
 * it — so it arrives with something already running at it, which is the whole
 * point of deriving it from a system rather than typing it out.
 */
export function addSystemMilestone(plan: NsPlan, routineId: string, id: SystemMilestone["id"], areaId?: string, now = nowIso()): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const suggestion = systemMilestones(routine).find((m) => m.id === id)
  if (!suggestion) return plan
  const target = areaId ?? routine.areaId ?? routine.serves[0] ?? plan.areas[0]?.id
  if (!target) return plan
  let next = addGoal(plan, target, suggestion.title, "milestone_ladder", now)
  const made = next.goals[next.goals.length - 1]
  if (!made) return plan
  next = updateGoal(next, made.id, {
    unit: suggestion.unit,
    ladder: { start: 0, target: suggestion.target, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
  }, now)
  for (const step of routine.steps) next = linkStepToGoal(next, routine.id, step.id, made.id, true, now)
  return next
}

/**
 * The same idea for one area: what the systems already running here add up to.
 *
 * This is what makes the offered milestones fit the page they are on. An area
 * with a stretch running in the morning routine should be offered "365 days of
 * stretching" before it is offered anything out of a catalogue, because that
 * one is already half true.
 */
export function areaSystemMilestones(plan: NsPlan, areaId: string): Array<SystemMilestone & { routineId: string; routineLabel: string }> {
  /**
   * ONE PER ROUTINE, THREE AT MOST.
   *
   * This offered every shape of every routine that reaches the area: opening
   * Mind & Beliefs produced fifteen suggestions, each with a line of
   * explanation under it, several of them the same sentence about a different
   * routine. A milestone is a thing you will be glad to have done, and
   * fifteen of them at once is not fifteen times the motivation — it is a
   * wall, and a wall reads as work rather than as something to celebrate.
   *
   * So: the strongest one per routine, and no more than three in total.
   */
  const existing = new Set(plan.goals.map((g) => g.title.trim().toLowerCase()))
  const out: Array<SystemMilestone & { routineId: string; routineLabel: string }> = []
  for (const routine of plan.routines) {
    if (routine.areaId !== areaId && !routine.serves.includes(areaId)) continue
    if (routine.steps.length === 0) continue
    const options = systemMilestones(routine).filter((m) => !existing.has(m.title.trim().toLowerCase()))
    // Hours where the routine produces real time, otherwise the count, and the
    // streak only where neither says anything.
    const best = options.find((m) => m.id === "hours") ?? options.find((m) => m.id === "sessions") ?? options[0]
    if (best) out.push({ ...best, routineId: routine.id, routineLabel: routine.label })
  }
  return out.slice(0, 3)
}

/** Milestones with nothing running at them — the wish-list half, named. */
export function milestonesWithoutSystems(plan: NsPlan, areaId?: string): NsGoal[] {
  return milestoneGoals(plan, areaId).filter((g) => systemsForGoal(plan, g.id).length === 0)
}

/** Systems pointed at nothing — the treadmill half. */
export function systemsWithoutMilestones(plan: NsPlan): NsSystem[] {
  /**
   * ROUTINE STEPS ARE NOT LISTED HERE.
   *
   * A routine is background: it improves everything, it is neither a milestone
   * nor a system in the page's sense, and it does not need a justification.
   * This listed every step as "pointed at nothing", which turns making your
   * bed into an outstanding task. What can be pointed at nothing and be worth
   * saying so is a driver — something written as a weekly rate on purpose.
   */
  return systemGoals(plan)
    .filter((goal) => goal.feedsGoalIds.length === 0)
    .map((goal) => ({ kind: "driver" as const, id: goal.id, title: goal.title, daysPerWeek: goal.daysPerWeek, goalId: goal.id }))
}

// ------------------------------------------------------------------ the board

/**
 * What one area offers: its goals, its goal sets, and its practices.
 *
 * The pillar map is a five-into-twelve fit, so five areas landed on `meaning`
 * and three on `relations` and were offered each other's objectives. The board
 * shows every area at once, where that reads as the same card four times, so
 * the explicit per-area assignment in `AREA_OFFERS` wins wherever it exists and
 * the pillar library is the fallback for an area the user added themselves.
 */
export function areaOffer(area: NsArea): AreaOffer | null {
  const offer = AREA_OFFERS[area.id]
  if (offer) return offer
  const pillarId = libraryPillarForArea(area)
  if (!pillarId) return null
  return { objectiveIds: OBJECTIVES.filter((o) => o.pillarId === pillarId).map((o) => o.id), practices: [] }
}

/**
 * The goal sets on offer in this area.
 *
 * Matched on the template's PRIMARY objective — the first in its list, which is
 * the one it is named after — rather than on any objective it touches. "Find
 * The One" also switches on Build Inner Game, and Build Inner Game belongs to
 * Mind & Beliefs, so matching on any overlap put the dating templates inside
 * Mind & Beliefs: the same collision the per-area assignment exists to close,
 * arriving by a different door.
 */
export function areaTemplates(area: NsArea): Template[] {
  const offer = areaOffer(area)
  if (!offer || offer.objectiveIds.length === 0) return []
  const wanted = new Set(offer.objectiveIds)
  return TEMPLATES.filter((t) => wanted.has(t.objectiveIds[0]))
}

/**
 * THE SETS THIS AREA IS CARRYING, so one of them can be put back.
 *
 * Taking "Strength Focus" writes five goals; not wanting it afterwards meant
 * five confirms on five rows, and the same is true of a routine somebody
 * accepted — eight steps, unticked one at a time. Reported from the page: "i
 * might have clicked mind routine, but dont want it… dont want to declick 8
 * manually."
 *
 * Matched by title, the same way `targetAlreadyAdded` matches forward, because
 * goals do not carry the set they arrived in — and a goal the person typed
 * themselves that happens to read "Bench Press 1RM" is, for this purpose, the
 * same goal. Partial sets count: taking five and deleting one still leaves a
 * set you can put back.
 */
export function templatesInArea(plan: NsPlan, areaId: string): Array<{ template: Template; goalIds: string[] }> {
  const area = plan.areas.find((a) => a.id === areaId)
  const inArea = plan.goals.filter((g) => g.areaId === areaId)
  if (!area || inArea.length === 0) return []
  const byTitle = new Map(inArea.map((g) => [g.title.trim().toLowerCase(), g.id]))
  const out: Array<{ template: Template; goalIds: string[] }> = []
  for (const template of areaTemplates(area)) {
    const goalIds = targetsForTemplate(template)
      .map((t) => byTitle.get(t.label.trim().toLowerCase()))
      .filter((id): id is string => !!id)
    if (goalIds.length > 0) out.push({ template, goalIds })
  }
  return out
}

/**
 * EVERYTHING ONE SET PUT IN THE PLAN, so taking it back takes back all of it.
 *
 * A set writes goals AND, if you left the tick on, the steps its routine needs
 * — so removing only the goals leaves a training week nobody asked for running
 * every Tuesday. "That doesn't make sense that it doesn't change", and it did
 * not.
 *
 * Two things are deliberately kept:
 *
 *   - a step ANOTHER set still in the plan also needs. Two Fitness sets both
 *     run on the strength session; taking one back must not stop the other.
 *   - anything the person put in themselves. Only the steps the need names are
 *     removed, so a routine with their own steps in it survives with those.
 *
 * A routine left with nothing in it goes too, unless it is one of the four the
 * plan ships with — those are the stack's furniture and arrive empty anyway.
 */
export function templateFootprint(plan: NsPlan, areaId: string, templateId: string): {
  goalIds: string[]
  steps: Array<{ routineId: string; routineLabel: string; stepId: string; title: string }>
  routineIds: string[]
} {
  const entry = templatesInArea(plan, areaId).find((t) => t.template.id === templateId)
  if (!entry) return { goalIds: [], steps: [], routineIds: [] }

  /**
   * Step ids the sets that SURVIVE this removal depend on.
   *
   * Read off the plan as it would be once the goals are gone, not as it is now:
   * templates overlap by title, so half the Fitness catalogue looks "partly
   * present" purely because of the goals this set wrote, and asking before the
   * removal keeps every step alive on the strength of goals about to vanish.
   */
  const afterGoals = entry.goalIds.reduce((p, id) => removeGoal(p, id), plan)
  const keep = new Set<string>()
  for (const area of afterGoals.areas) {
    for (const other of templatesInArea(afterGoals, area.id)) {
      for (const need of routineNeedsForTemplate(other.template)) {
        for (const id of need.stepIds) keep.add(`${need.blueprintId}:${id}`)
      }
    }
  }

  const steps: Array<{ routineId: string; routineLabel: string; stepId: string; title: string }> = []
  for (const need of routineNeedsForTemplate(entry.template)) {
    const routine = plan.routines.find((r) => r.blueprintId === need.blueprintId)
    if (!routine) continue
    for (const step of routine.steps) {
      if (!need.stepIds.includes(step.id)) continue
      if (keep.has(`${need.blueprintId}:${step.id}`)) continue
      steps.push({ routineId: routine.id, routineLabel: routine.label, stepId: step.id, title: step.title })
    }
  }

  const routineIds = plan.routines
    .filter((r) => !DEFAULT_ROUTINE_IDS.includes(r.blueprintId))
    .filter((r) => r.steps.length > 0 && r.steps.every((step) => steps.some((s) => s.routineId === r.id && s.stepId === step.id)))
    .map((r) => r.id)

  return { goalIds: entry.goalIds, steps, routineIds }
}

/** Put a whole set back: its goals, the steps it put in a routine, and a routine that was only there for it. */
export function removeTemplateGoals(plan: NsPlan, areaId: string, templateId: string, now = nowIso()): NsPlan {
  const { goalIds, steps, routineIds } = templateFootprint(plan, areaId, templateId)
  if (goalIds.length === 0 && steps.length === 0) return plan
  let next = goalIds.reduce((p, id) => removeGoal(p, id, now), plan)
  for (const step of steps) {
    if (routineIds.includes(step.routineId)) continue
    next = removeStep(next, step.routineId, step.stepId, now)
  }
  for (const id of routineIds) next = removeRoutine(next, id, now)
  return next
}

/** The single goals on offer in this area, grouped by the objective they serve. */
export function areaObjectives(area: NsArea): Array<{ objective: Objective; targets: FrameworkTarget[] }> {
  const offer = areaOffer(area)
  if (!offer) return []
  return offer.objectiveIds
    .map((id) => OBJECTIVES.find((o) => o.id === id))
    .filter((o): o is Objective => !!o)
    .map((objective) => ({ objective, targets: TARGETS.filter((t) => t.objectiveId === objective.id) }))
}

/** The practices on offer in this area, resolved against their blueprints. */
export function areaPractices(area: NsArea): Array<{ blueprintId: string; stepId: string; title: string; minutes: number; daysPerWeek: number; routine: string }> {
  const offer = areaOffer(area)
  if (!offer) return []
  return offer.practices
    .map((p) => {
      const resolved = practiceLabel(p.blueprintId, p.stepId)
      return resolved ? { ...p, ...resolved } : null
    })
    .filter((p): p is NonNullable<typeof p> => !!p)
}

/**
 * WHAT AN AREA OFFERS DEPENDS ON WHICH HALF YOU ARE WRITING.
 *
 * Switching Fitness from Milestones to Systems used to change a line of copy
 * and nothing else: the same catalogue sat there offering "Bench Press 1RM" as
 * something to DO. A bench of a hundred kilos is not a system — the system is
 * going to the gym four times a week — and a page that offers one where it
 * asked for the other is teaching the opposite of the distinction it just drew.
 *
 * Targets and whole sets are milestones. Practices are systems. Neither list
 * appears in the other half, and an area with nothing to offer for the half
 * you are on offers nothing rather than the wrong thing.
 */
export function areaOffersFor(area: NsArea, half: "milestones" | "systems"): {
  objectives: Array<{ objective: Objective; targets: FrameworkTarget[] }>
  templates: Template[]
  practices: ReturnType<typeof areaPractices>
} {
  const practices = areaPractices(area)
  if (half === "systems") return { objectives: [], templates: [], practices }

  /**
   * A title that is on offer as a practice is a system, and only a system.
   *
   * "Weekly review" was in both lists: a catalogue target on the wanting side
   * and a practice on the doing side, so the same words arrived as two
   * different kinds of thing depending on which tab you were looking at. The
   * practice wins — reviewing your week is something you DO — and the target
   * drops out of the milestone half rather than teaching the person that the
   * distinction is arbitrary.
   */
  const running = new Set(practices.map((p) => p.title.trim().toLowerCase()))
  const objectives = areaObjectives(area)
    .map((entry) => ({ ...entry, targets: entry.targets.filter((t) => !running.has(t.label.trim().toLowerCase())) }))
    .filter((entry) => entry.targets.length > 0)
  return {
    objectives,
    templates: areaTemplates(area).filter((t) => !running.has(t.label.trim().toLowerCase())),
    practices: [],
  }
}

/** The line said above an area the goal catalogue genuinely does not cover. */
export function areaOfferNote(area: NsArea): string | null {
  return AREA_OFFERS[area.id]?.note ?? null
}

/**
 * THE EXAMPLES A BOX SHOWS, FOR THE AREA THE BOX IS IN.
 *
 * Every prefilled example in the builder comes through here, so there is one
 * place that decides what Relationship's goal box says and it cannot be a lift.
 * An area somebody invented gets the neutral set: it describes the shape the
 * box wants rather than illustrating it with a life nobody described.
 */
export function areaGoalExample(areaId: string): AreaGoalExample {
  return AREA_GOAL_EXAMPLES[areaId] ?? NEUTRAL_GOAL_EXAMPLE
}

export function objectiveForTarget(targetId: string): Objective | null {
  const target = TARGETS.find((t) => t.id === targetId)
  if (!target) return null
  return OBJECTIVES.find((o) => o.id === target.objectiveId) ?? null
}

/**
 * The action a catalogue goal should arrive carrying, or null when the
 * objective has none written.
 *
 * Null rather than a generic "work on <title>" on purpose: a placeholder action
 * silences the amber panel without giving the user anything to do, which is
 * worse than the gap it hides.
 */
export function defaultActionForTarget(target: FrameworkTarget): { title: string; daysPerWeek: number } | null {
  return OBJECTIVE_ACTION[target.objectiveId] ?? null
}

// -- routines a goal drags in ------------------------------------------------

/**
 * The routines a set of objectives needs, merged.
 *
 * Two objectives that both want the training week produce one need, with the
 * steps unioned. The first preset and split win, because a preset is an order
 * and applying two of them in sequence just means the second one erased the
 * first.
 */
export function routineNeedsForObjectives(objectiveIds: string[]): RoutineNeed[] {
  const merged = new Map<string, RoutineNeed>()
  for (const id of objectiveIds) {
    for (const need of OBJECTIVE_ROUTINE_NEEDS[id] ?? []) {
      const seen = merged.get(need.blueprintId)
      if (!seen) {
        merged.set(need.blueprintId, { ...need, stepIds: [...need.stepIds] })
        continue
      }
      for (const step of need.stepIds) if (!seen.stepIds.includes(step)) seen.stepIds.push(step)
    }
  }
  return [...merged.values()]
}

/** The needs behind one template, via the objectives it switches on. */
export function routineNeedsForTemplate(template: Template): RoutineNeed[] {
  return routineNeedsForObjectives(template.objectiveIds)
}

/** The needs behind one target, via its objective. */
export function routineNeedsForTarget(targetId: string): RoutineNeed[] {
  const target = TARGETS.find((t) => t.id === targetId)
  return target ? routineNeedsForObjectives([target.objectiveId]) : []
}

/**
 * The routines the goals ALREADY in one area are asking for and have not got.
 *
 * A goal set offers its routine on the card, but a goal picked one chip at a
 * time never passed a card, and it arrives carrying an action — "Strength
 * session, 4×/wk" — with nowhere for that session to live. This is the same
 * question asked from the other end: given what is actually in this area, what
 * is missing underneath it.
 *
 * Goals are matched back to the catalogue by title, the same way
 * `targetAlreadyAdded` matches forward, so a goal the user typed themselves
 * asks for nothing rather than guessing.
 */
export function unmetRoutineNeeds(plan: NsPlan, areaId: string): RoutineNeed[] {
  const byLabel = new Map(TARGETS.map((t) => [t.label.trim().toLowerCase(), t]))
  const objectiveIds = new Set<string>()
  for (const goal of plan.goals) {
    if (goal.areaId !== areaId) continue
    const target = byLabel.get(goal.title.trim().toLowerCase())
    if (target) objectiveIds.add(target.objectiveId)
  }
  return routineNeedsForObjectives([...objectiveIds]).filter((need) => routineNeedState(plan, need) !== "met")
}

/**
 * Where a need stands against the plan: absent, present but missing steps, or
 * already covered. Drives whether the board offers it, and how loudly.
 */
export function routineNeedState(plan: NsPlan, need: RoutineNeed): "missing" | "partial" | "met" {
  const routine = plan.routines.find((r) => r.blueprintId === need.blueprintId)
  if (!routine) return "missing"
  const have = new Set(routine.steps.map((s) => s.id))
  return need.stepIds.every((id) => have.has(id)) ? "met" : "partial"
}

/**
 * Put a routine need into the plan.
 *
 * ONLY THE STEPS THE GOAL ASKS FOR. A routine that was not in the stack used to
 * arrive carrying its whole preset as well — one goal in Friends created a
 * Connection routine with four steps in it, so the catalogue then showed "Give
 * one genuine compliment" and "Reach out to one friend" already ticked, chosen
 * by nobody. That is the same complaint the seeded steps got ("too many things
 * are preselected, I feel overwhelmed") arriving through a different door, and
 * the answer is the same one: the presets stay one click away on the routine
 * card, and the click is the person's.
 *
 * The split still comes with a new training week, because a split is the shape
 * of the week rather than work added to it.
 */
export function applyRoutineNeed(plan: NsPlan, need: RoutineNeed, now = nowIso()): NsPlan {
  let next = plan
  let routine = next.routines.find((r) => r.blueprintId === need.blueprintId)
  if (!routine) {
    next = addRoutine(next, need.blueprintId, now)
    routine = next.routines[next.routines.length - 1]
    if (!routine) return plan
    if (need.splitId) next = applySplit(next, routine.id, need.splitId, now)
  }
  const id = routine.id
  const have = new Set((next.routines.find((r) => r.id === id)?.steps ?? []).map((s) => s.id))
  for (const stepId of need.stepIds) {
    if (!have.has(stepId)) next = toggleRoutineStep(next, id, stepId, now)
  }
  return next
}

// -- practices ---------------------------------------------------------------

/** Is this practice already running in the plan? */
export function practiceIsOn(plan: NsPlan, blueprintId: string, stepId: string): boolean {
  const routine = plan.routines.find((r) => r.blueprintId === blueprintId)
  return !!routine?.steps.some((s) => s.id === stepId)
}

/**
 * Turn a practice on, adding the routine it belongs to if the stack has not got
 * one yet. This is the cascade running upward: a small thing you said yes to in
 * an area becomes a step in a routine that then shows up under every area that
 * routine serves.
 */
export function addPractice(plan: NsPlan, blueprintId: string, stepId: string, now = nowIso()): NsPlan {
  const bp = ROUTINE_BLUEPRINT_MAP.get(blueprintId)
  if (!bp || !bp.library.some((s) => s.id === stepId)) return plan
  let next = plan
  let routine = next.routines.find((r) => r.blueprintId === blueprintId)
  if (!routine) {
    next = addRoutine(next, blueprintId, now)
    routine = next.routines[next.routines.length - 1]
    if (!routine) return plan
  }
  if (routine.steps.some((s) => s.id === stepId)) return next
  return toggleRoutineStep(next, routine.id, stepId, now)
}

/** Turn a practice off. The routine stays; emptying somebody's stack is not our call. */
export function removePractice(plan: NsPlan, blueprintId: string, stepId: string, now = nowIso()): NsPlan {
  const routine = plan.routines.find((r) => r.blueprintId === blueprintId)
  if (!routine || !routine.steps.some((s) => s.id === stepId)) return plan
  return toggleRoutineStep(plan, routine.id, stepId, now)
}

// ---------------------------------------------------------------- the cascade

/**
 * The chain, counted.
 *
 * Every level of this plan is made of the one above it, and until this existed
 * nothing on the page ever said so: the north star was on tab 1, the areas on
 * tab 2, the goals inside a dialog on tab 3, the milestones one level inside
 * those, and the routines in a sidebar that knew about none of it. One row of
 * numbers is the cheapest possible way to show that it is one machine.
 */
export interface NsCascade {
  starWritten: boolean
  areas: number
  areasWithTen: number
  goals: number
  milestones: number
  actions: number
  routines: number
  routineSteps: number
}

export function planCascade(plan: NsPlan, today = todayISO()): NsCascade {
  return {
    starWritten: plan.northStar.trim().length > 0,
    areas: plan.areas.length,
    areasWithTen: plan.areas.filter((a) => areaReview(plan, a.id).ten.trim().length > 0).length,
    goals: plan.goals.length,
    milestones: plan.goals.reduce((sum, g) => sum + goalMilestones(g, today).length, 0),
    actions: weeklyLoad(plan).actions,
    routines: plan.routines.length,
    routineSteps: plan.routines.reduce((sum, r) => sum + r.steps.length, 0),
  }
}

/**
 * What the plan costs in an ordinary week.
 *
 * The counterweight to a board that puts eighteen goals one click away. Minutes
 * come off the routines, which are the only part of the plan that carries a
 * duration; actions are counted as sessions because an action has a frequency
 * and no length.
 *
 * DISTINCT actions, by title. One training week moves the bench, the squat and
 * the deadlift, so three goals correctly share one action, and counting it three
 * times would invent a load that nobody is carrying.
 */
export function weeklyLoad(plan: NsPlan): { minutes: number; actions: number; over: boolean } {
  /** One arithmetic for what a routine costs, and it lives in one place. */
  const minutes = plan.routines.reduce((sum, r) => sum + routineWeeklyMinutes(r), 0)
  const seen = new Map<string, number>()
  for (const goal of plan.goals) {
    for (const habit of goal.habits) {
      const key = habit.title.trim().toLowerCase()
      if (!key) continue
      seen.set(key, Math.max(seen.get(key) ?? 0, habit.daysPerWeek))
    }
  }
  const actions = [...seen.values()].reduce((sum, n) => sum + n, 0)
  return {
    minutes,
    actions,
    over: minutes > LOAD_CEILING.minutesPerWeek || actions > LOAD_CEILING.actionsPerWeek,
  }
}

// ---------------------------------------------------------------- the timeline

/** One dated thing to hit, on the way to a goal. */
export interface NsMilestone {
  id: string
  goalId: string
  areaId: string
  /** What you will have done. "Squat 120 kg", "4×/wk for 8 weeks", "First sale". */
  label: string
  /** ISO date it lands on, spread between today and the goal's date. */
  date: string
  kind: "rung" | "phase" | "checkpoint" | "finish"
  done: boolean
}

/**
 * Every rung of one goal, dated.
 *
 * All three shapes have a climb in them and none of them showed it anywhere but
 * inside the goal's own card:
 *
 *   a target    → the ladder's values, evenly spaced between now and the date
 *   a practice  → each ramp phase, dated by the weeks it runs for
 *   a finish    → its checkpoints, evenly spaced, then the finish itself
 *
 * Undated goals produce nothing rather than a guess. Every goal arrives dated a
 * year out, so this is the rare case of somebody having cleared the date.
 */
export function goalMilestones(goal: NsGoal, today = todayISO()): NsMilestone[] {
  if (!goal.targetDate) return []
  const out: NsMilestone[] = []
  const span = daysBetween(today, goal.targetDate)
  if (span <= 0) return []

  if (goal.type === "milestone_ladder" && goal.ladder) {
    /**
     * WEIGHT ONLY, UNLESS SOMEBODY SAID OTHERWISE.
     *
     * This used to stagger reps automatically for anything measured in kilos:
     * "Flat bench 100 kg" came back as "100 kg 3×8", and nobody had said
     * anything about eight reps — the goal names a weight and the sets and
     * reps were the page's invention. Reps are a real part of how a lift goes
     * up, which is why the builder offers to shape them, but offering is the
     * operative word. What is generated here is what the person wrote: the
     * number, on the grid the unit moves on.
     */
    const values = milestoneValues(goal.ladder.start, goal.ladder.target, goal.ladder.steps, goal.unit)
      .map((value) => `${value}${goal.unit ? ` ${goal.unit}` : ""}`)
    values.forEach((value, i) => {
      out.push({
        id: `${goal.id}-r${i}`,
        goalId: goal.id,
        areaId: goal.areaId,
        label: `${goal.title}: ${value}`,
        date: addDaysISO(today, Math.round((span * (i + 1)) / values.length)),
        kind: i === values.length - 1 ? "finish" : "rung",
        done: false,
      })
    })
    return out
  }

  if (goal.type === "habit_ramp") {
    const phases = goal.rampSteps ?? []
    if (phases.length === 0) return []
    let offset = 0
    phases.forEach((phase, i) => {
      offset += phase.durationWeeks * 7
      if (offset > span) return
      out.push({
        id: `${goal.id}-p${i}`,
        goalId: goal.id,
        areaId: goal.areaId,
        label: `${goal.title}: ${phase.frequencyPerWeek}×/wk held for ${phase.durationWeeks} weeks`,
        date: addDaysISO(today, offset),
        kind: i === phases.length - 1 ? "finish" : "phase",
        done: false,
      })
    })
    return out
  }

  const checkpoints = goal.checkpoints
  checkpoints.forEach((c, i) => {
    out.push({
      id: `${goal.id}-c${c.id}`,
      goalId: goal.id,
      areaId: goal.areaId,
      label: `${goal.title}: ${c.title}`,
      date: addDaysISO(today, Math.round((span * (i + 1)) / (checkpoints.length + 1))),
      kind: "checkpoint",
      done: c.done,
    })
  })
  out.push({
    id: `${goal.id}-finish`,
    goalId: goal.id,
    areaId: goal.areaId,
    label: goal.title,
    date: goal.targetDate,
    kind: "finish",
    done: false,
  })
  return out
}

/** Whole days from one ISO date to another. Negative when the second is earlier. */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = Date.parse(`${fromISO}T00:00:00Z`)
  const to = Date.parse(`${toISO}T00:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  return Math.round((to - from) / 86400000)
}

/**
 * The plan as a run of months, each carrying what lands in it.
 *
 * The point of this is the shape rather than the detail: a year with things in
 * it every month reads as a plan, and a year with everything piled into the last
 * month reads — correctly — as twelve goals all quietly dated a year out.
 */
export function planTimeline(plan: NsPlan, today = todayISO(), months = 12): Array<{ key: string; label: string; milestones: NsMilestone[] }> {
  const all = plan.goals.flatMap((g) => goalMilestones(g, today))
  const buckets: Array<{ key: string; label: string; milestones: NsMilestone[] }> = []
  const start = monthKey(today)
  for (let i = 0; i < months; i += 1) {
    const iso = addMonthsISO(`${start}-01`, i)
    buckets.push({ key: monthKey(iso), label: shortMonth(iso), milestones: [] })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const milestone of all) {
    const bucket = byKey.get(monthKey(milestone.date))
    // Anything past the window is folded into the last month rather than
    // dropped, so the count on screen is the whole plan and not a slice of it.
    if (bucket) bucket.milestones.push(milestone)
    else if (milestone.date > buckets[buckets.length - 1].key) buckets[buckets.length - 1].milestones.push(milestone)
  }
  for (const bucket of buckets) bucket.milestones.sort((a, b) => a.date.localeCompare(b.date))
  return buckets
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function shortMonth(iso: string): string {
  const month = SHORT_MONTHS[Number(iso.slice(5, 7)) - 1] ?? ""
  return `${month} ${iso.slice(2, 4)}`
}

// ------------------------------------------------------------------- the guide

/**
 * A dump of goals, in the user's own words, one per line.
 *
 * People arrive with a list, and it is numbered, or bulleted, or indented,
 * because it was written in a notes app. Stripping that is the difference
 * between "paste your goals in" working and it producing eleven goals called
 * "1." — and it is a five-line function, which is a good trade for the one
 * moment in this flow where somebody's existing work comes in whole.
 */
export function parseGoalDump(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split("\n")) {
    const line = raw
      // Leading list furniture: "1.", "1)", "12a.", "-", "*", "•", "–".
      .replace(/^\s*(?:\d+[a-z]?\s*[.)]\s*|[-*•–]\s+)/i, "")
      .trim()
    if (!line) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line.slice(0, 200))
  }
  return out
}

/**
 * How often, said in a sentence. English and Danish, because this plan is
 * written in both and half the lines in it are frequencies.
 *
 * "Træn 5x om ugen" is not a climb to five. It is the most obvious practice on
 * the page, and reading it as a target produces a goal that says you are at
 * zero trainings and going to five, forever. The daily words are separate
 * because "hver dag" carries no number at all.
 */
const PER_WEEK =
  // Up to three words may sit between the number and the frequency, because
  // people write "1 youtube video om ugen" rather than "1 om ugen".
  /(\d+)\s*(?:x|×|gange|times)?\s*(?:[\wæøåÆØÅ'-]+[ ]+){0,3}?(?:om ugen|i ugen|per uge|pr\.? uge|ugentligt|\/\s*uge|a week|per week|\/\s*wk|weekly)/gi
const DAILY = /\b(?:hver dag|hverdag|dagligt|daglig|every day|everyday|daily|each day)\b/i

/**
 * Rates written in words rather than digits.
 *
 * "Train chest twice a week" came in as a finish line with a made-up rate of
 * three, because the pattern above wants a numeral and people do not write
 * "2 a week" when they mean twice. A driver that arrives as an achievement is
 * then asked for a date, which is the page asking when you will stop training.
 */
const WORD_COUNTS: Record<string, number> = {
  once: 1, twice: 2, thrice: 3,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  en: 1, et: 1, to: 2, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7,
}
const WORD_PER_WEEK =
  /\b(once|twice|thrice|one|two|three|four|five|six|seven|en|et|to|tre|fire|fem|seks|syv)\b\s*(?:times|gange)?\s*(?:[\wæøåÆØÅ'-]+[ ]+){0,3}?(?:om ugen|i ugen|per uge|pr\.? uge|ugentligt|a week|per week|weekly)/gi

/**
 * What one written line is, structurally.
 *
 * Read off the words rather than asked about, because being asked "is this a
 * target, a practice or a finish line?" eleven times in a row is a form, and
 * the answer is usually sitting in the sentence:
 *
 *   "Træn 5x om ugen"        → a practice, five times a week
 *   "Stræk ud hver dag"      → a practice, seven
 *   "1 video om ugen, 2, 3"  → a practice that ramps 1 → 2 → 3
 *   "Bænk 28 kg, 3x6-8"      → a climb to 28 (not to 3: the 3 is the set count)
 *   "10 pullups, fra 7"      → a climb to 10, and it already told us it starts at 7
 *   "1 Muscle Up"            → a finish line. A climb to one is not a climb.
 *   "Ingen smerte i ryggen"  → a finish line, the honest default
 *
 * Every one of these is flippable on the goal card afterwards. Guessing well
 * and being wrong sometimes beats asking everybody everything.
 */
/**
 * Verbs that only ever mean "stop doing a thing". Whatever follows them, the
 * line is a rate you hold rather than a finish line you cross.
 */
const STOP_VERBS =
  /^\s*(?:quit|stop(?:\s+med)?|give up|cut out|cut down on|kick|abstain from|drop|no more|undgå|kvit|hold(?:e)? op med)\b/i

/**
 * And the bare "no X" form, which needs to know what X is.
 *
 * "No weed" is abstinence; "no pain in my back" is an outcome you cannot
 * simply decide to do, and filing it as a daily rate would be the page telling
 * somebody their back pain is a habit. So the bare form is only read as
 * abstinence when it names something a person does — the list is the vices
 * routine's own library, plus the obvious neighbours.
 */
const NO_PREFIX = /^\s*(?:no|ingen|intet)\b/i
const VICE_WORDS =
  /\b(?:weed|cannabis|hash|porn|fap|drink(?:ing|s)?|alcohol|booze|beer|wine|spirits|smoke|smoking|cigarettes?|nicotine|vape|vaping|snus|sugar|sweets|junk|takeaway|fast food|soda|scroll(?:ing)?|social media|instagram|tiktok|youtube|reddit|phone|screens?|gaming|games|netflix|tv|snooze|caffeine|coffee|energy drinks?|gambling|betting|shopping|spending|doomscroll\w*)\b/i

/**
 * Does this line name something the person is NOT going to do?
 *
 * Used in two places, which is why it is its own function: what a newly typed
 * line becomes, and the one-time repair of the lines that were typed before
 * the rule existed.
 */
export function readsAsAbstinence(title: string): boolean {
  if (STOP_VERBS.test(title)) return true
  return NO_PREFIX.test(title) && VICE_WORDS.test(title)
}

export function shapeFromTitle(title: string): {
  type: VisionGoalType
  unit: string
  target: number | null
  /** Where the line says it starts, when it says. */
  start: number | null
  daysPerWeek: number
  /** How much a week, when the line counts things rather than days. */
  perWeek: number | null
  rampSteps: HabitRampStep[] | null
} {
  const weekly = [...title.matchAll(PER_WEEK)].map((m) => clamp(Number(m[1]), 1, 30))
  if (weekly.length === 0) {
    for (const m of title.matchAll(WORD_PER_WEEK)) {
      const n = WORD_COUNTS[m[1].toLowerCase()]
      if (n) weekly.push(n)
    }
  }
  if (weekly.length > 0) {
    // Several frequencies in one line is somebody writing a ramp by hand:
    // "Udgiv 1 youtube video om ugen, 2 om ugen, 3 om ugen".
    const steps = weekly.length > 1 ? weekly.map((n) => ({ frequencyPerWeek: n, durationWeeks: 8 })) : null
    const steady = weekly[weekly.length - 1]
    /**
     * A NUMBER OVER SEVEN IS NOT DAYS.
     *
     * The catalogue path was fixed for this and the typed one was not: writing
     * "20 approaches a week" ran through `clamp(20, 1, 7)` and came back as
     * seven days a week — the count destroyed and relabelled, in the box where
     * somebody had just typed it. There are only seven days, so anything above
     * that is a count of things, and the days stay the neutral default until
     * the person says otherwise.
     */
    const counted = steady > 7
    return {
      type: "habit_ramp",
      unit: "",
      target: null,
      start: null,
      daysPerWeek: counted ? 3 : clamp(steady, 1, 7),
      perWeek: counted ? steady : null,
      rampSteps: steps,
    }
  }
  if (DAILY.test(title)) {
    return { type: "habit_ramp", unit: "", target: null, start: null, daysPerWeek: 7, perWeek: null, rampSteps: null }
  }
  /**
   * A LINE ABOUT SOMETHING YOU ARE NOT DOING IS A SYSTEM.
   *
   * "No weed" is not something you achieve on a Tuesday in March and then have
   * done — it is a line you hold, every day, which is the definition of a rate
   * on this page. Read as an achievement it landed on the list of things you
   * want to have done, was asked when it would be finished, and sat there next
   * to a hundred kilos on the bench.
   *
   * It runs after the rate checks on purpose: "no drinking on weeknights" says
   * five days, and what somebody wrote about how often wins over this.
   */
  if (readsAsAbstinence(title)) {
    return { type: "habit_ramp", unit: "", target: null, start: null, daysPerWeek: 7, perWeek: null, rampSteps: null }
  }
  const parsed = parseGoalTarget(title)
  // A climb to one has no rungs in it, and "1 Muscle Up" is the clearest finish
  // line anybody has ever written.
  if (!parsed || parsed.value <= 1) {
    return { type: "achievement", unit: "", target: null, start: null, daysPerWeek: 3, perWeek: null, rampSteps: null }
  }
  // "Få 10 downloads, 100 downloads, 1000" is one climb that keeps going up,
  // and reading only the first number finishes it at ten.
  const rising = risingNumbers(title)
  if (rising.length >= 2) {
    return {
      type: "milestone_ladder",
      unit: parsed.unit,
      target: rising[rising.length - 1],
      start: rising[0],
      daysPerWeek: 3,
      perWeek: null,
      rampSteps: null,
    }
  }
  const from = /(?:\bfra\b|\bfrom\b|\bup from\b)\s*(\d+(?:[.,]\d+)?)/i.exec(title)
  const start = from ? Number(from[1].replace(",", ".")) : null
  return {
    type: "milestone_ladder",
    unit: parsed.unit,
    target: parsed.value,
    // Only when it is genuinely below the target. "fra 7" on a goal of 10 is a
    // starting point; a bigger number is something else in the sentence.
    start: start != null && Number.isFinite(start) && start < parsed.value ? start : null,
    daysPerWeek: 3,
    perWeek: null,
    rampSteps: null,
  }
}

/**
 * Add a written list of goals, shaping each one from what it says.
 *
 * The rungs of a climb are deliberately NOT generated here, unless the line
 * said where it starts. Spacing a ladder from a start nobody confirmed produces
 * a climb that reads as authoritative and is made up, and "where are you today"
 * is the guide's first question for exactly that reason.
 */
export function addGoalsFromDump(plan: NsPlan, areaId: string, text: string, now = nowIso()): NsPlan {
  let next = plan
  for (const title of parseGoalDump(text)) {
    const shape = shapeFromTitle(title)
    const before = next.goals.length
    next = addGoal(next, areaId, title, shape.type, now)
    if (next.goals.length === before) continue
    const goal = next.goals[next.goals.length - 1]
    if (shape.type === "habit_ramp") {
      // The count travels with the rate, or "20 approaches a week" arrives as
      // three days a week and the number the person typed is gone.
      next = updateGoal(next, goal.id, { daysPerWeek: shape.daysPerWeek, perWeek: shape.perWeek, rampSteps: shape.rampSteps }, now)
      continue
    }
    if (shape.type === "milestone_ladder" && shape.target != null) {
      next = updateGoal(next, goal.id, {
        unit: shape.unit,
        ladder: { start: shape.start ?? 0, target: shape.target, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
      }, now)
      // The line already answered "where are you today", so the rungs can be
      // spaced now and the guide has one less thing to ask.
      if (shape.start != null) next = setLadderStart(next, goal.id, shape.start, now)
    }
  }
  return next
}

/**
 * The actions this area already has running, offered as answers.
 *
 * "No pain in my back" wants stretching, water, walking differently — and the
 * routine blueprints that serve Health are already full of exactly those, in
 * somebody's own words. Reusing them beats an empty text box, and beats
 * inventing a suggestion engine that guesses from the goal's wording, which
 * cannot work at all for a plan written in Danish.
 */
export function suggestedActions(plan: NsPlan, goal: NsGoal): Array<{ title: string; daysPerWeek: number }> {
  const out: Array<{ title: string; daysPerWeek: number }> = []
  const seen = new Set<string>()
  const add = (title: string, daysPerWeek: number) => {
    const key = title.trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push({ title, daysPerWeek: clamp(daysPerWeek, 1, 7) })
  }
  // What the catalogue says this kind of goal is kept by, when it came from there.
  const byLabel = TARGETS.find((t) => t.label.trim().toLowerCase() === goal.title.trim().toLowerCase())
  if (byLabel) {
    const action = defaultActionForTarget(byLabel)
    if (action) add(action.title, action.daysPerWeek)
  }
  /**
   * EVERYTHING ELSE HAS TO BE ABOUT THIS GOAL.
   *
   * It used to offer every practice in the area and every step of every routine
   * that serves it, so "Flat bench 100 kg" was answered with "Big glass of
   * water" — a suggestion that is not wrong about the area and is nonsense
   * about the goal. A list of plausible-looking answers that do not fit is
   * worse than an empty one: it teaches somebody that the suggestions are
   * noise, and then they stop reading the good ones too.
   *
   * So the rest must share a real word with what the person wrote. Nothing
   * shared, nothing offered — the box beside it takes their own words, and the
   * button under it asks a model.
   */
  const words = contentWords(goal.title)
  const relevant = (title: string) => {
    if (words.size === 0) return false
    for (const word of contentWords(title)) {
      for (const own of words) {
        if (word === own || (word.length >= 4 && own.length >= 4 && (word.startsWith(own) || own.startsWith(word)))) return true
      }
    }
    return false
  }

  const area = plan.areas.find((a) => a.id === goal.areaId)
  if (area) for (const p of areaPractices(area)) if (relevant(p.title)) add(p.title, p.daysPerWeek)
  for (const bp of ROUTINE_BLUEPRINTS) {
    if (bp.areaSeedId !== goal.areaId && !bp.servesAreaIds.includes(goal.areaId)) continue
    for (const step of bp.library) if (relevant(step.title)) add(step.title, step.daysPerWeek)
  }
  return out.slice(0, 10)
}

/**
 * The next question this goal is missing an answer to, or null when it is done.
 *
 * Asked in a fixed order because the order is an argument: whether it is yours
 * to decide comes before where you are, which comes before what you will do,
 * which comes before when — and the two whys come last, when the goal is real
 * enough to have a reason. Anything already answered or skipped is behind us.
 */
export function nextGuideQuestion(goal: NsGoal): GuideQuestionId | null {
  const asked = new Set(goal.asked)
  for (const id of GUIDE_QUESTION_ORDER) {
    if (asked.has(id)) continue
    if (!guideQuestionApplies(goal, id)) continue
    return id
  }
  return null
}

/** Whether one question is worth asking about this goal at all. */
export function guideQuestionApplies(goal: NsGoal, id: GuideQuestionId): boolean {
  if (id === "control") {
    // Only of a finish line. A number you climb to is already something you do,
    // and a weekly practice is the most yours-to-decide thing on the page.
    return goal.type === "achievement"
  }
  if (id === "start") return goal.type === "milestone_ladder" && !!goal.ladder
  // A practice IS the action, which is the same rule the amber panel uses.
  if (id === "actions") return goalNeedsAction(goal)
  if (id === "date") return true
  if (id === "why") return !goal.why.trim()
  return !goal.painWhy.trim()
}

/** Remember that a question was put to this goal, answered or skipped. */
export function markAsked(plan: NsPlan, goalId: string, id: GuideQuestionId, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal || goal.asked.includes(id)) return plan
  return updateGoal(plan, goalId, { asked: [...goal.asked, id] }, now)
}

/**
 * The queue: every goal with something still missing, one question each.
 *
 * ROUND ROBIN, not goal by goal. Taking one goal all the way through means the
 * first thing on the list is asked five questions in a row — where are you, what
 * will you do, is it yours, by when, why, what does it cost — before the second
 * thing is looked at once. That is the slog this whole screen exists to stop,
 * and it also gets the priorities backwards: the first question about your
 * fourth goal matters more than the fifth question about your first.
 *
 * So goals are ordered by how many questions they have already been through,
 * then by the season's areas, then by the order they were written. Answer one
 * and that goal goes to the back of the round.
 */
export function guideQueue(plan: NsPlan, areaIds: string[] = []): Array<{ goal: NsGoal; question: GuideQuestionId }> {
  const priority = new Map(areaIds.map((id, i) => [id, i]))
  const order = new Map(plan.goals.map((g, i) => [g.id, i]))
  return plan.goals
    .map((goal) => ({ goal, question: nextGuideQuestion(goal) }))
    .filter((row): row is { goal: NsGoal; question: GuideQuestionId } => row.question !== null)
    .sort((a, b) =>
      a.goal.asked.length - b.goal.asked.length ||
      (priority.get(a.goal.areaId) ?? 99) - (priority.get(b.goal.areaId) ?? 99) ||
      (order.get(a.goal.id) ?? 0) - (order.get(b.goal.id) ?? 0),
    )
}

/**
 * How much of the plan is through the guide.
 *
 * Counted in QUESTIONS rather than in finished goals. Round robin means nothing
 * is finished until nearly everything is, so a bar counting finished goals sits
 * at zero through twenty answers and then fills all at once — which reads as
 * broken, and is the opposite of what a progress bar is for.
 */
export function guideProgress(plan: NsPlan): { ready: number; total: number; answered: number; questions: number } {
  let answered = 0
  let questions = 0
  for (const goal of plan.goals) {
    for (const id of GUIDE_QUESTION_ORDER) {
      const asked = goal.asked.includes(id)
      if (!asked && !guideQuestionApplies(goal, id)) continue
      questions += 1
      if (asked) answered += 1
    }
  }
  return {
    ready: plan.goals.filter((g) => nextGuideQuestion(g) === null).length,
    total: plan.goals.length,
    answered,
    questions,
  }
}

/**
 * Answer "where are you today" on a climb.
 *
 * Sets the bottom of the ladder AND spaces the rungs, because those are one
 * action rather than two: a start without rungs is a number nobody asked for,
 * and rungs generated before the start was known would have been made up.
 */
export function setLadderStart(plan: NsPlan, goalId: string, start: number, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal || !goal.ladder) return plan
  const next = updateGoal(plan, goalId, { ladder: { ...goal.ladder, start }, asked: [...goal.asked, "start"] }, now)
  const parsed = parseGoalTarget(goal.title)
  /**
   * Fewer rungs than asked for, when the climb is shorter than the rungs.
   *
   * Seven pull-ups to ten across four rungs is 7.8, 8.5, 9.3, 10, and nobody
   * has ever done eight tenths of a pull-up. Where the whole climb is a handful
   * of whole numbers, the rungs are those numbers.
   */
  const span = Math.abs(goal.ladder.target - start)
  const count = span >= 1 && span < goal.ladder.steps ? Math.round(span) : goal.ladder.steps
  return setMilestones(next, goalId, {
    from: start,
    to: goal.ladder.target,
    count,
    unit: goal.unit || parsed?.unit || "",
    prefix: parsed?.prefix ?? "",
  }, now)
}

/**
 * Answer "no, other people decide it".
 *
 * The big one is kept and moved above the goals rather than deleted — being out
 * of your hands is not the same as being wrong to want — and the thing the
 * person does control becomes a real goal underneath it, linked. "Publish one
 * article a week" feeds "internationally bestselling author", and the second
 * one stops pretending to be something you can schedule.
 */
export function addControllableGoal(plan: NsPlan, bigGoalId: string, title: string, now = nowIso()): NsPlan {
  const big = plan.goals.find((g) => g.id === bigGoalId)
  if (!big || !title.trim()) return plan
  const parsed = parseGoalTarget(title)
  let next = addGoal(plan, big.areaId, title, parsed ? "milestone_ladder" : "achievement", now)
  const made = next.goals[next.goals.length - 1]
  if (!made) return plan
  if (parsed) {
    next = updateGoal(next, made.id, {
      unit: parsed.unit,
      ladder: { start: 0, target: parsed.value, steps: 4, curveTension: 0, controlPoints: [], pins: [] },
    }, now)
  }
  return linkGoal(next, made.id, bigGoalId, now)
}

/**
 * Pick an area for the season, or unpick it. Order is the priority, so the
 * order they are clicked in is the order they matter in — and unpicking the
 * middle one does not renumber the others' meaning, it just closes the gap.
 */
export function toggleSeasonArea(plan: NsPlan, areaId: string, now = nowIso()): NsPlan {
  if (!plan.areas.some((a) => a.id === areaId)) return plan
  const has = plan.seasonAreaIds.includes(areaId)
  return touch({
    ...plan,
    seasonAreaIds: has ? plan.seasonAreaIds.filter((id) => id !== areaId) : [...plan.seasonAreaIds, areaId],
    // Unpicking the area that was also the one thing leaves a focus pointing at
    // something the user has just said they are not doing this season.
    seasonFocusId: has && plan.seasonFocusId === areaId ? null : plan.seasonFocusId,
  }, now)
}

/** The picked areas as objects, in picked order. */
export function seasonAreas(plan: NsPlan): NsArea[] {
  return plan.seasonAreaIds
    .map((id) => plan.areas.find((a) => a.id === id))
    .filter((a): a is NsArea => !!a)
}

/**
 * What a climb is actually asking of you, per month.
 *
 * "Bænk 28 kg — where are you today?" is only half a question. Twenty-two to
 * twenty-eight by next August is half a kilo a month, which is slower than
 * doing nothing on purpose; zero to a hundred in the same year is eight a
 * month, which is not a plan. The user asked whether their number is realistic
 * and the page had the start, the target and the date sitting right there and
 * said nothing about any of it.
 *
 * Arithmetic only. No opinion about kilos or pull-ups or subscribers, because
 * this does not know what the unit is and pretending otherwise is how a tool
 * starts confidently telling people their goals are wrong. It reports the rate,
 * and names the three cases that are structural rather than physiological:
 * you are already there, the climb is so slow the date is doing no work, and
 * the climb multiplies what you have several times over.
 */
export function climbPace(goal: NsGoal, today = todayISO()): {
  perMonth: number
  months: number
  verdict: "done" | "slow" | "steady" | "steep"
} | null {
  if (goal.type !== "milestone_ladder" || !goal.ladder || !goal.targetDate) return null
  const { start, target } = goal.ladder
  const days = daysBetween(today, goal.targetDate)
  if (days <= 0) return null
  const months = days / 30.44
  /**
   * Only the one case that is unambiguous.
   *
   * "Already past it" cannot be told from "downhill" by looking at the numbers:
   * a start of 30 against a target of 28 is somebody who can already bench 28,
   * or somebody getting down to 28, and nothing in the data says which. So the
   * verdict is only given where the two numbers are the same, and the rest of
   * the time this reports a rate and keeps its opinions to itself.
   */
  const distance = Math.abs(target - start)
  if (distance === 0) return { perMonth: 0, months, verdict: "done" }
  const perMonth = distance / months
  // Against what you have, not against an absolute: two kilos a month is
  // nothing on a squat and a lot on a bodyweight target.
  const base = Math.abs(start) > 0 ? Math.abs(start) : distance
  const monthlyShare = perMonth / base
  if (monthlyShare < 0.01) return { perMonth, months, verdict: "slow" }
  if (monthlyShare > 0.25) return { perMonth, months, verdict: "steep" }
  return { perMonth, months, verdict: "steady" }
}

/**
 * A line naming several rising numbers is one climb, not the first of them.
 *
 * "Få 10 downloads på en onepager, få 100 downloads etc" and "Få 100
 * subscribers, 1000, osv" are the same shape: a milestone that keeps going up.
 * Reading only the first number turns a person's whole ladder into its bottom
 * rung and then calls it finished at ten downloads.
 */
export function risingNumbers(title: string): number[] {
  const found = [...title.matchAll(/(\d+(?:[.,]\d+)?)/g)]
    .map((m) => Number(m[1].replace(",", ".")))
    .filter((n) => Number.isFinite(n))
    // A year is a deadline, not a rung. "Squat 100 kg by 2027" was reading as a
    // climb from a hundred kilos to the year two thousand and twenty-seven.
    .filter((n) => !(n >= 1900 && n <= 2100 && Number.isInteger(n)))
  if (found.length < 2) return []
  // Strictly rising, and each one a real step up rather than "3x6-8".
  for (let i = 1; i < found.length; i += 1) {
    if (found[i] <= found[i - 1] * 1.5) return []
  }
  return found
}

// ------------------------------------------------------- where a plan starts

/**
 * The 10 for one area, cut into things you could go and do.
 *
 * The paragraph is already written — it is the first box on the tab before
 * this one, and it is the only place in the whole flow where somebody has
 * described what they actually want in their own words at length. Asking them
 * to write it again as a goal list is asking for the same work twice, and the
 * second time is the time they stop.
 *
 * The cut is mechanical: line breaks, full stops, semicolons, bullet furniture.
 * That is on purpose. It cannot tell "I wake up without an alarm" (scenery)
 * from "I bench 28 kg" (a goal), so it does not try — every piece is offered,
 * unticked, and the person who wrote the paragraph does the sorting in about
 * four seconds. Pieces already in the goal list are dropped, because a door you
 * walk through twice should not hand you the same thing again.
 */
export function tenCandidates(plan: NsPlan, areaId: string): string[] {
  const ten = areaReview(plan, areaId).ten
  if (!ten.trim()) return []
  const existing = new Set(plan.goals.map((g) => g.title.trim().toLowerCase()))
  const seen = new Set<string>()
  const out: string[] = []
  for (const piece of ten.split(/\n|(?<=[.!?])\s+|;/)) {
    const line = piece
      .replace(/^\s*(?:\d+[a-z]?\s*[.)]\s*|[-*•–]\s+)/i, "")
      .replace(/[.,;\s]+$/, "")
      .trim()
    // Under eight characters is "yes", "and calm", or a stray initial: never a
    // goal, and always noise in a list you are meant to be ticking.
    if (line.length < 8) continue
    /**
     * AND NEITHER IS A STATE, which is most of what a 10 contains.
     *
     * This offered every clause as a goal, so somebody's Relationship 10 came
     * back as "I have crazy confidence in myself because I genuinely know and
     * appreciate how awesome I am" with a tickbox next to it. A 10 is a picture
     * — the question asks for one — and a picture cut into pieces is smaller
     * pictures, not goals. Only the clauses that name something to do survive
     * the split; turning the rest into something actionable is what the button
     * underneath is for.
     */
    if (!readsAsActionable(line)) continue
    const key = line.toLowerCase()
    if (seen.has(key) || existing.has(key)) continue
    seen.add(key)
    out.push(line.slice(0, 200))
  }
  return out
}

/** One line of a written day: what happens, and when if it says. */
export interface IdealDayLine {
  /** Minutes into the day, when the line carried a time. */
  startMin: number | null
  title: string
}

/**
 * A written day, read as a list of things.
 *
 * A LEADING TIME IS ONLY A TIME WHEN IT SAYS SO — "07:00", "7am", "kl. 6.30",
 * "08:30-10:00". A bare number is left exactly where it is, because "10 pull-ups"
 * and "3 sales calls" are lines people write in a day, and a parser greedy
 * enough to read the 10 as ten o'clock turns the best line on the page into
 * "pull-ups" at 10:00. Losing a time is a shrug; eating somebody's number is
 * the thing they will notice and not forgive.
 */
export function parseIdealDay(text: string): IdealDayLine[] {
  const seen = new Set<string>()
  const out: IdealDayLine[] = []
  for (const raw of text.split("\n")) {
    // The list-furniture strip has to refuse a clock face. "12.00: Walk" is a
    // time, and read as a numbered list item it becomes an item called "00:
    // Walk" at no particular hour.
    let line = raw.replace(/^\s*(?:\d+[a-z]?\s*[.)](?!\d)\s*|[-*•–]\s+)/i, "").trim()
    if (!line) continue
    let startMin: number | null = null
    const time = /^(?:kl\.?\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?(?=\b)/i.exec(line)
    // Either a real clock face (07:30) or an am/pm. "7 " on its own is a number.
    if (time && (time[2] !== undefined || time[3])) {
      let hour = Number(time[1])
      const minutes = Number(time[2] ?? 0)
      const meridiem = time[3]?.toLowerCase()
      if (meridiem === "pm" && hour < 12) hour += 12
      if (meridiem === "am" && hour === 12) hour = 0
      if (hour <= 23 && minutes <= 59) {
        startMin = hour * 60 + minutes
        line = line
          .slice(time[0].length)
          // The end of a range ("-08:30") and whatever separates the time from
          // the words ("07:00 – Gym", "07:00: Gym").
          .replace(/^\s*[-–—]\s*(?:kl\.?\s*)?\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?/i, "")
          .replace(/^\s*[-–—:]\s*/, "")
          .trim()
      }
    }
    if (!line) continue
    const key = `${startMin ?? ""}|${line.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ startMin, title: line.slice(0, 200) })
  }
  return out
}

/**
 * How long each line of a day lasts: the gap to the next timed line.
 *
 * Clamped hard at both ends. An untimed line, or a gap running from breakfast
 * to lunch, is not a five-hour block of anything — it is a line somebody wrote
 * without thinking about length, and a routine that claims thirty-five hours a
 * week because of it makes every load readout on the page a lie.
 */
export function idealDayMinutes(lines: IdealDayLine[], index: number): number {
  const here = lines[index]?.startMin
  if (here == null) return 15
  for (let i = index + 1; i < lines.length; i += 1) {
    const next = lines[i].startMin
    if (next == null) continue
    const gap = next - here
    if (gap <= 0) break
    return clamp(gap, 5, 90)
  }
  return 30
}

/**
 * Which area a line belongs to, or nothing.
 *
 * NOTHING IS A REAL ANSWER HERE. A guess that falls back to the first area
 * files "Walk the dog" under Health with a confident little colour dot, and the
 * person either does not notice or stops trusting every other guess on the
 * screen. Unplaceable lines come back null and the row asks.
 *
 * Words two areas both claim are dropped from the index rather than arbitrated,
 * so "meditate" deciding between Mind and Spirituality is a question for the
 * person who wrote it.
 */
export function areaKeywordIndex(areas: NsArea[]): Map<string, string> {
  const claims = new Map<string, Set<string>>()
  const claim = (word: string, areaId: string) => {
    const key = word.trim().toLowerCase()
    if (key.length < 3) return
    const set = claims.get(key) ?? new Set<string>()
    set.add(areaId)
    claims.set(key, set)
  }
  for (const area of areas) {
    for (const word of AREA_KEYWORDS[area.id] ?? []) claim(word, area.id)
    // An area somebody renamed or added themselves has no table, and its own
    // name is the only thing anybody knows about it.
    for (const word of `${area.label} ${area.sublabel}`.split(/[^\p{L}-]+/u)) {
      if (word.length >= 4) claim(word, area.id)
    }
  }
  const index = new Map<string, string>()
  for (const [word, ids] of claims) {
    if (ids.size === 1) index.set(word, [...ids][0])
  }
  return index
}

export function guessAreaId(index: Map<string, string>, title: string): string | null {
  const tokens = title.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter(Boolean)
  const score = new Map<string, number>()
  for (const token of tokens) {
    for (const [word, areaId] of index) {
      // Four letters and up match as prefixes, so one entry covers træn, træne,
      // træning and træner. Shorter words must match whole, or "run" claims
      // "rundstykke" and "gym" claims nothing anybody wrote.
      const hit = word.length >= 4 ? token.startsWith(word) : token === word
      if (hit) score.set(areaId, (score.get(areaId) ?? 0) + 1)
    }
  }
  if (score.size === 0) return null
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1])
  // A tie is two areas with an equal claim, which is exactly the case where the
  // person knows and the table does not.
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) return null
  return ranked[0][0]
}

/** Where one line of a written day is going, once the person has looked at it. */
export interface IdealDayPlacement {
  title: string
  startMin: number | null
  minutes: number
  areaId: string
  /** A box that gets ticked, or a goal that gets asked the questions. */
  destination: "track" | "goal"
}

/**
 * Which routine a thing at this hour belongs in.
 *
 * Only ever the routines that already exist: an ideal day that invents four new
 * routines beside the four already on the page has doubled the plan rather than
 * filled it in. Morning before eleven, evening after five, the working day in
 * between — and if the stack has none of those, the first routine there is.
 */
export function routineForMinute(plan: NsPlan, startMin: number | null): string | null {
  if (plan.routines.length === 0) return null
  const window = startMin == null ? null : DAY_WINDOWS.find((w) => startMin < w.untilMin)
  const wanted = window?.blueprintId
  const match = wanted ? plan.routines.find((r) => r.blueprintId === wanted) : undefined
  return (match ?? plan.routines.find((r) => r.blueprintId === "morning") ?? plan.routines[0]).id
}

/**
 * Put a written day into the plan.
 *
 * The tracked lines become routine steps, placed on every day of the week at
 * the hour they were written for, because that is what a day you intend to
 * repeat is. The goal lines go through the same shaping as anything typed into
 * the box — a line with a number in it is a climb whichever door it came in
 * through.
 */
export function addIdealDay(plan: NsPlan, placements: IdealDayPlacement[], now = nowIso()): NsPlan {
  let next = plan
  for (const line of placements) {
    if (!line.title.trim()) continue
    if (!next.areas.some((a) => a.id === line.areaId)) continue
    if (line.destination === "goal") {
      next = addGoalsFromDump(next, line.areaId, line.title, now)
      continue
    }
    const routineId = routineForMinute(next, line.startMin)
    if (!routineId) continue
    next = addCustomStep(next, routineId, line.title, line.minutes, 7, now, {
      days: [0, 1, 2, 3, 4, 5, 6],
      startMin: line.startMin,
    })
  }
  return next
}

/** One routine step as it sits on the week grid. */
export interface WeekBlock {
  routineId: string
  routineLabel: string
  step: NsRoutineStep
  areaId: string | null
  color: string
  day: number
  startMin: number
  minutes: number
}

/**
 * Everything with a day and a time on it, one entry per day it runs.
 *
 * A step on Monday, Wednesday and Friday is three blocks here and one step in
 * the plan, which is the whole difference between drawing a week and editing a
 * list. Everything without a placement is left out and shows in the tray.
 */
export function weekBlocks(plan: NsPlan): WeekBlock[] {
  const out: WeekBlock[] = []
  for (const routine of plan.routines) {
    const area = routine.areaId ? plan.areas.find((a) => a.id === routine.areaId) : undefined
    for (const step of routine.steps) {
      if (step.startMin == null || step.days.length === 0) continue
      for (const day of step.days) {
        out.push({
          routineId: routine.id,
          routineLabel: routine.label,
          step,
          areaId: routine.areaId,
          color: area?.color ?? "#a1a1aa",
          day,
          startMin: step.startMin,
          minutes: Math.max(5, step.minutes),
        })
      }
    }
  }
  return out.sort((a, b) => a.day - b.day || a.startMin - b.startMin)
}

/** The steps that have never been given a slot, with the routine they are in. */
export function unplacedSteps(plan: NsPlan): Array<{ routineId: string; routineLabel: string; step: NsRoutineStep }> {
  return plan.routines.flatMap((r) =>
    r.steps
      .filter((s) => s.startMin == null || s.days.length === 0)
      .map((step) => ({ routineId: r.id, routineLabel: r.label, step })),
  )
}

/**
 * Put a step on the grid, or take it off.
 *
 * `daysPerWeek` is kept in step with the days it is actually on, in both
 * directions. Three blocks drawn on the grid and a step still claiming seven
 * days a week is the load readout disagreeing with the picture directly above
 * it, and the picture is the one the person believes.
 */
export function placeStep(plan: NsPlan, routineId: string, stepId: string, days: number[], startMin: number | null, now = nowIso()): NsPlan {
  const clean = cleanDays(days)
  return updateStep(plan, routineId, stepId, {
    days: clean,
    startMin: startMin == null ? null : clamp(Math.round(startMin), 0, 24 * 60 - 1),
    ...(clean.length > 0 ? { daysPerWeek: clamp(clean.length, 1, 7) } : {}),
  }, now)
}

/** Take a step off the grid without deleting the step. */
export function unplaceStep(plan: NsPlan, routineId: string, stepId: string, now = nowIso()): NsPlan {
  return updateStep(plan, routineId, stepId, { days: [], startMin: null }, now)
}

/** Move a placed block to another day and hour, keeping the rest of its days. */
export function moveBlock(plan: NsPlan, routineId: string, stepId: string, fromDay: number, toDay: number, startMin: number, now = nowIso()): NsPlan {
  const step = plan.routines.find((r) => r.id === routineId)?.steps.find((s) => s.id === stepId)
  if (!step) return plan
  const days = step.days.includes(toDay) && fromDay !== toDay
    ? step.days.filter((d) => d !== fromDay)
    : step.days.map((d) => (d === fromDay ? toDay : d))
  return placeStep(plan, routineId, stepId, days, startMin, now)
}

// ------------------------------------------------------ things to experience

/**
 * A brain-dump of things to have done.
 *
 * Same parser as the goal box, because the input is the same shape — a list
 * somebody wrote in a notes app — and a second line-splitter would drift from
 * the first. What is different is everything after: no shaping, no dates, no
 * rungs. "See the northern lights" read as a climb to nothing would be the
 * machinery being clever at the exact moment it should be quiet.
 */
export function addExperiences(plan: NsPlan, text: string, areaId: string | null = null, now = nowIso()): NsPlan {
  const existing = new Set(plan.experiences.map((e) => e.title.trim().toLowerCase()))
  let next = plan
  const added: NsExperience[] = []
  for (const title of parseGoalDump(text)) {
    if (existing.has(title.toLowerCase())) continue
    existing.add(title.toLowerCase())
    const { plan: withSeq, id } = nextId(next, "x")
    next = withSeq
    added.push({
      id,
      title,
      areaId: areaId && next.areas.some((a) => a.id === areaId) ? areaId : null,
      done: false,
      doneOn: null,
      goalId: null,
    })
  }
  if (added.length === 0) return plan
  return touch({ ...next, experiences: [...next.experiences, ...added] }, now)
}

export function updateExperience(plan: NsPlan, id: string, patch: Partial<Omit<NsExperience, "id">>, now = nowIso()): NsPlan {
  return touch({ ...plan, experiences: plan.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)) }, now)
}

export function removeExperience(plan: NsPlan, id: string, now = nowIso()): NsPlan {
  return touch({ ...plan, experiences: plan.experiences.filter((e) => e.id !== id) }, now)
}

/** Tick it off, and record the day — the date is the whole point of a list like this. */
export function toggleExperienceDone(plan: NsPlan, id: string, today = todayISO(), now = nowIso()): NsPlan {
  const item = plan.experiences.find((e) => e.id === id)
  if (!item) return plan
  return updateExperience(plan, id, item.done ? { done: false, doneOn: null } : { done: true, doneOn: today }, now)
}

/**
 * Decide to actually chase one.
 *
 * It becomes a finish-line goal — never a climb, whatever numbers are in the
 * sentence, because "three countries this year" is a thing to have done and
 * spacing four rungs between here and three countries is the goal machinery
 * arriving where it was not invited. The line stays in the list, marked, since
 * a bucket list you delete from as things get serious is a bucket list that
 * empties out exactly as it starts working.
 */
export function promoteExperience(plan: NsPlan, id: string, areaId: string, now = nowIso()): NsPlan {
  const item = plan.experiences.find((e) => e.id === id)
  if (!item || item.goalId) return plan
  if (!plan.areas.some((a) => a.id === areaId)) return plan
  const next = addGoal(plan, areaId, item.title, "achievement", now)
  const goal = next.goals[next.goals.length - 1]
  if (!goal) return plan
  return updateExperience(next, id, { goalId: goal.id, areaId }, now)
}

/** How the list is doing, for the one line that says so. */
export function experienceCount(plan: NsPlan): { total: number; done: number } {
  return { total: plan.experiences.length, done: plan.experiences.filter((e) => e.done).length }
}

/**
 * Whether a sentence names something you could go and DO.
 *
 * The 10s are written as states on purpose — "what does a 10 look like here"
 * asks for a picture, and a picture is the right answer to it. Which makes them
 * the wrong source for the one thing, and the first version of this list proved
 * it by offering somebody "I wake up happy and excited to start the day" as
 * their most important thing this season. That is scenery. There is no Tuesday
 * on which you can do it.
 *
 * So a clause qualifies only if it carries something to aim at — a number, a
 * frequency — or leads with a verb. Everything else is a state, and states are
 * what the goals point AT rather than what goes in the box.
 */
export function readsAsActionable(text: string): boolean {
  const line = text.trim()
  if (line.length < 8) return false
  // A number to hit or a rate to hold: "bench 28 kg", "train 4x a week".
  if (/\d/.test(line) && !/^\s*\d{4}\s*$/.test(line)) return true
  // Leading verb: "publish the book", "stop smoking", "ring my mother".
  // First person state openers are the case this exists to reject.
  if (/^(i|jeg)\s+(am|'m|feel|felt|wake|woke|have|has|look|looked|sleep|slept|er|føler|vågner|har|ser|sover)\b/i.test(line)) return false
  /**
   * A state verb anywhere near the front is the same sentence with the subject
   * changed. "Life feels light again" got offered as somebody's one thing: it
   * is a description of how a good year would feel, and there is nothing in it
   * to do on a Tuesday. "Be happier" is the same — an instruction to already
   * have arrived.
   */
  if (/^(be|being|feel|feeling|stay|remain|become|være|føle)\b/i.test(line)) return false
  const head = line.split(/\s+/).slice(0, 3).join(" ")
  if (/\b(is|are|am|was|were|feels|feel|seems|seem|looks|look|sounds|stays|er|føles|virker|bliver)\b/i.test(head)) return false
  return /^[\p{L}]+(e|s|en|er)?\b/u.test(line) && !/^(my|mine|our|the|a|an|min|mit|vores|det|den)\b/i.test(line)
}

/**
 * What has to happen for the one thing to work.
 *
 * The sentence on its own is a wish. "Quit weed" is not a plan, and neither is
 * a page that takes it, congratulates you, and moves on to twelve areas of
 * everything else you want — the thing that makes it a plan is naming what has
 * to be true for it, and those are goals like any other. So they ARE goals:
 * filed in the area they belong to, showing up on the goals page already
 * written, carrying a flag that says where they came from.
 *
 * The area is guessed and then shown, never guessed silently: "stop buying it"
 * is a Health goal to this function and a Money goal to plenty of people, and
 * the picker is right there.
 */
export function addOneThingRequirement(plan: NsPlan, title: string, areaId?: string, now = nowIso()): NsPlan {
  const text = title.trim()
  if (!text) return plan
  const target = areaId ?? guessAreaId(areaKeywordIndex(plan.areas), text) ?? plan.areas[0]?.id
  if (!target) return plan
  // Same shaping as anything typed into an area: a number in the sentence
  // makes it a climb, a rate makes it a driver, everything else is a finish.
  const next = addGoalsFromDump(plan, target, text, now)
  const made = next.goals[next.goals.length - 1]
  if (!made || made.title.trim().toLowerCase() !== text.toLowerCase()) {
    // `addGoalsFromDump` refused it (a blank line, or a duplicate). Nothing to
    // flag, and nothing to say — the caller sees the unchanged plan.
    return next
  }
  return updateGoal(next, made.id, { servesOneThing: true }, now)
}

/**
 * The areas the one thing reaches.
 *
 * Stored as an answer rather than on the plan, because it is a note about a
 * sentence rather than a structural fact about the areas — and because the one
 * that matters usually reaches several: quitting weed is Health and Mind and
 * Money and the reason the gym has not happened since March. Naming them is
 * what turns one sentence into a plan with a shape.
 */
export function oneThingAreas(plan: NsPlan): string[] {
  const ids = new Set(plan.areas.map((a) => a.id))
  return answerOf(plan, ONE_ANSWERS.areas).split("\n").map((id) => id.trim()).filter((id) => ids.has(id))
}

export function toggleOneThingArea(plan: NsPlan, areaId: string, now = nowIso()): NsPlan {
  if (!plan.areas.some((a) => a.id === areaId)) return plan
  const current = oneThingAreas(plan)
  const next = current.includes(areaId) ? current.filter((id) => id !== areaId) : [...current, areaId]
  return setAnswer(plan, ONE_ANSWERS.areas, next.join("\n"), now)
}

/** The goals that exist because of the one thing, in the order they were written. */
export function oneThingRequirements(plan: NsPlan): NsGoal[] {
  return plan.goals.filter((g) => g.servesOneThing)
}

/**
 * Take a goal that already exists and say it serves the one thing.
 *
 * Somebody who wrote "train four times a week" under Fitness last week and
 * then writes "get my training consistent" as their one thing should not have
 * to write it twice — the same reconciliation the area builder does, in the
 * other direction.
 */
export function markServesOneThing(plan: NsPlan, goalId: string, on: boolean, now = nowIso()): NsPlan {
  const goal = plan.goals.find((g) => g.id === goalId)
  if (!goal) return plan
  return updateGoal(plan, goalId, { servesOneThing: on }, now)
}

/**
 * Goals already written that read like they are about the one thing.
 *
 * Offered for linking, not linked: a word in common is a reason to ask, and
 * nothing more. Same lexical gate the action suggestions use, so the two parts
 * of the page cannot disagree about what "related" means.
 */
export function goalsLikeOneThing(plan: NsPlan, oneThing: string): NsGoal[] {
  const words = contentWords(oneThing)
  if (words.size === 0) return []
  const shares = (title: string) => {
    for (const word of contentWords(title)) {
      for (const own of words) {
        if (word === own) return true
        if (word.length >= 4 && own.length >= 4 && (word.startsWith(own) || own.startsWith(word))) return true
      }
    }
    return false
  }
  return plan.goals.filter((g) => !g.servesOneThing && shares(g.title))
}

/**
 * NOTHING IS OFFERED FOR THE ONE THING ANY MORE, AND THAT IS THE POINT.
 *
 * This held `oneThingCandidates` and `readsAsActionable`: the person's own
 * sentences from the pages before, ranked and handed back as a list to click.
 * Two rounds of work went into keeping states out of it — "I wake up happy and
 * excited to start the day" is scenery, and there is no Tuesday on which you
 * can do it — and the filter kept finding new ways to be wrong, because
 * deciding whether a sentence is a thing you can DO is a judgement, not a
 * pattern.
 *
 * The list is gone. A row of plausible answers under a question this important
 * is a nudge to pick one instead of thinking, and the answer somebody clicks is
 * not the one they would have written. What is left is the box.
 *
 * The thread finder stays: it reads what somebody wrote about what is in their
 * way and says what it found, on a button, once asked. That is a different act
 * from a menu that is already open.
 */

// ------------------------------------------------- the thing you keep naming

/**
 * There is no function here, and that is the finding.
 *
 * This held `recurringBlockers`: split every "what is in the way" field into
 * words, drop a stopword list, and report anything appearing in two or more
 * areas. It read well and it does not work. Word frequency over free text finds
 * the words somebody types most, not the thing standing in their way — the
 * first plan it met produced **"dont"** as the top finding and duly offered
 * "Deal with dont" as the most important thing of the season.
 *
 * The failure is the mechanism, not the stopword list. Every word it wrongly
 * surfaces can be added to a list; the next plan brings different ones, and
 * what accumulates is a lexicon that has to grow forever and still cannot tell
 * a noun from a negation, in two languages, in somebody's shorthand.
 *
 * Naming the thread across somebody's notes is a judgement, so it is asked of a
 * model, with the same rules as every other model call here: one button, said
 * out loud before it sends, findings quoted back to the sentences they came
 * from, and nothing enters the plan without a tick. See `findThread` in
 * `northStarGenerateService.ts`.
 */


/**
 * Clear the goals and the season, and keep everything you thought about.
 *
 * "Start over" wipes the plan, which is the right tool exactly once — the first
 * time somebody wants a clean sheet. It is the wrong tool for the far commoner
 * case: the goals are a mess, or a set was accepted that should not have been,
 * or the season turned out to be about something else, and the 10s, the values,
 * the ratings and the north star are all still true and took an hour to write.
 *
 * So this deletes what is downstream of a decision — the goals, their order,
 * the season's areas — and touches nothing upstream of it. The routines survive
 * too: they are what runs whether or not there is a goal pointing at them.
 *
 * **IT DOES NOT TOUCH THE ONE THING, and used to say that it did.** It deleted
 * `answers[one-thing]`, which by then was a stale copy in the browser and not
 * the answer: the row on the account survived, so clearing your season left the
 * tracking header still showing the one thing you had just cleared. The copy is
 * gone and this line went with it.
 *
 * A one thing is not cleared by a button anywhere. It is replaced by writing the
 * next one, and the app asks for the next one as the deadline comes up — see
 * `oneThingPrompt`. That is the whole lifecycle, and it is the same whether or
 * not anybody ever presses "start over".
 */
export function resetGoalsAndFocus(plan: NsPlan, now = nowIso()): NsPlan {
  return touch({
    ...plan,
    goals: [],
    priorityIds: [],
    seasonAreaIds: [],
    seasonFocusId: null,
    // An experience that was promoted points at a goal that no longer exists.
    experiences: plan.experiences.map((e) => (e.goalId ? { ...e, goalId: null } : e)),
  }, now)
}

/**
 * What a preset actually costs, from the steps it turns on.
 *
 * THE LABELS WERE HAND-TYPED AND WRONG. "60 min" on the morning routine turned
 * on 53 minutes of steps, "30 min" on the evening one turned on 39, and
 * manifestation's "60 min" cost 31 — a preset named for a time it does not
 * cost, in a flow whose whole argument is that the plan tells you what it costs
 * you. Nobody was going to notice by reading the data; the sums are only wrong
 * once you add them up.
 *
 * Derived here so the number cannot drift from the steps again: change a step's
 * minutes and every preset that includes it re-prices itself.
 */
export function presetCost(bp: RoutineBlueprint, presetId: string): { minutes: number; sessions: number; steps: number } {
  const ids = bp.presets.find((p) => p.id === presetId)?.stepIds ?? []
  const steps = ids.map((id) => bp.library.find((s) => s.id === id)).filter((s): s is RoutineBlueprintStep => !!s)
  return {
    // A sequence is walked top to bottom once, so its cost is the sum.
    minutes: steps.reduce((sum, s) => sum + s.minutes, 0),
    // A weekly routine's steps each run their own days, so its cost is sessions.
    sessions: steps.reduce((sum, s) => sum + s.daysPerWeek, 0),
    steps: steps.length,
  }
}


/** The words of a title that carry meaning, for deciding whether two are about the same thing. */
function contentWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !BLOCKER_STOPWORDS_LITE.has(w)),
  )
}

/** Words that make two titles look related when they are not. */
const BLOCKER_STOPWORDS_LITE = new Set([
  "the","and","for","with","your","you","have","get","one","two","day","days","week","weekly","time","times","own","new","not","min","per",
  "din","dit","med","for","har","ikke","hver","uge","dag","dage","min","mit",
])

/**
 * Everywhere else this goal already exists.
 *
 * Somebody wrote "no weed" under Health while it was already a step in their
 * Vices routine, and the page cheerfully carried both — two objects for one
 * intention, counted twice in the load and tickable in two places. Naming it is
 * enough; deciding what to do about it is theirs.
 */
export function goalEchoes(plan: NsPlan, goal: NsGoal): string[] {
  const title = goal.title.trim().toLowerCase()
  if (!title) return []
  const out: string[] = []
  for (const other of plan.goals) {
    if (other.id === goal.id || other.title.trim().toLowerCase() !== title) continue
    const area = plan.areas.find((a) => a.id === other.areaId)
    if (area) out.push(area.label)
  }
  const inRoutine = goalAlreadyInRoutine(plan, goal)
  if (inRoutine) out.push(inRoutine.routine)
  return [...new Set(out)]
}
