/**
 * Vision → plan — pure logic (no model, no DB, no side effects).
 *
 * Takes a big fuzzy vision statement that has already been split into clauses
 * and embedded (see VisionPlanLab's in-browser embedder — same one GoalIntake
 * uses, $0, no API) and derives the distinct INTENTS it contains: which life
 * area each part is about and which framework objective it matches, so each
 * intent can become a concrete goal downstream.
 *
 * Like intakeService this is a ROUTER, not an oracle — the user confirms.
 * Plan: docs/plans/vision-to-plan-test-page.md
 */

import { z } from "zod"
import { PILLARS, OBJECTIVES, TARGETS, getTargetsForObjective, getSharedDriver } from "./data/newGoalFramework"
import { effectivePillarScores } from "./intakeService"
import { classifyHorizon } from "./horizonService"
import type { Horizon } from "./horizonService"
import { RITUAL_LIBRARY, RITUAL_PRESETS } from "./data/visionRoutineLibrary"
import { LIFE_MASTERY_AREAS, LIFE_MASTERY_AREA_MAP, goalFeedsArea } from "./data/lifeMasteryAreas"
import type { IntakeMatches, TextSpan } from "./intakeService"
import type {
  BalanceOpts,
  BalancedHabit,
  BalancedPlan,
  BalancedTask,
  BalancedWeek,
  HabitRampStep,
  HabitRoutine,
  MilestoneLadderConfig,
  PacingStatus,
  RoutineCategory,
  RoutineDay,
  RoutineTemplate,
  WorkoutSplit,
  VisionDayPlan,
  VisionGoalDraft,
  VisionGoalRollup,
  VisionGoalType,
  VisionIntent,
  VisionIntentResult,
  VisionMeasure,
  VisionPlanState,
  VisionProgress,
  VisionRitual,
  VisionWeeklyRitual,
  VisionWeeklyReview,
  VisionEveningReflection,
  VisionGoalVerdict,
  VisionVerdictEntry,
} from "./types"

export interface DeriveIntentOpts {
  /** Below this cosine, a clause isn't about any area — goes to `unmatched`. */
  spanFloor?: number
  /** Min cosine for an objective to attach to an intent (else pillar-only). */
  objectiveFloor?: number
  /** Merge adjacent clauses that landed on the same pillar + objective. */
  mergeAdjacent?: boolean
}

function pillarMeta(id: string): { label: string; color: string } {
  const p = PILLARS.find((x) => x.id === id)
  return { label: p?.label ?? id, color: p?.color ?? "#a1a1aa" }
}

function objectiveLabel(id: string | null): string | null {
  if (!id) return null
  return OBJECTIVES.find((o) => o.id === id)?.label ?? id
}

/**
 * Route each clause of the vision to a life area + best objective, then merge
 * adjacent clauses that are asking for the same thing. `spanMatches[i]` must be
 * the taxonomy match for `spans[i]` (same order), exactly as `matchTaxonomy`
 * returns them.
 *
 * A vision like "wake up happy with my life, build a business, be in love"
 * comes out as three intents (Meaning / Wealth / Relations), each carrying the
 * user's own words for that part.
 */
export function deriveIntents(
  spans: TextSpan[],
  spanMatches: IntakeMatches[],
  opts: DeriveIntentOpts = {},
): VisionIntentResult {
  const { spanFloor = 0.3, objectiveFloor = 0.2, mergeAdjacent = true } = opts

  interface Routed {
    span: TextSpan
    pillarId: string
    objectiveId: string | null
    confidence: number
  }

  const routed: Routed[] = []
  const unmatched: TextSpan[] = []

  spans.forEach((span, i) => {
    const m = spanMatches[i]
    const top = m ? effectivePillarScores(m)[0] : undefined
    if (!top || top.score < spanFloor) {
      unmatched.push(span)
      return
    }
    const bestObj = m.objectives
      .filter((o) => o.pillarId === top.id)
      .sort((a, b) => b.score - a.score)[0]
    routed.push({
      span,
      pillarId: top.id,
      objectiveId: bestObj && bestObj.score >= objectiveFloor ? bestObj.id : null,
      confidence: top.score,
    })
  })

  // Merge runs of adjacent clauses that resolved to the same pillar+objective —
  // they're one ask phrased across clauses, not two intents.
  const groups: Routed[][] = []
  for (const r of routed) {
    const last = groups[groups.length - 1]
    if (
      mergeAdjacent &&
      last &&
      last[0].pillarId === r.pillarId &&
      last[0].objectiveId === r.objectiveId
    ) {
      last.push(r)
    } else {
      groups.push([r])
    }
  }

  const intents: VisionIntent[] = groups.map((group, idx) => {
    const pillarId = group[0].pillarId
    const objectiveId = group[0].objectiveId
    const meta = pillarMeta(pillarId)
    return {
      id: `intent-${idx}`,
      text: group.map((g) => g.span.text).join(" · "),
      pillarId,
      pillarLabel: meta.label,
      pillarColor: meta.color,
      objectiveId,
      objectiveLabel: objectiveLabel(objectiveId),
      confidence: Math.max(...group.map((g) => g.confidence)),
      spans: group.map((g) => ({ text: g.span.text, start: g.span.start, end: g.span.end })),
    }
  })

  return { intents, unmatched }
}

/** Rough strength tier for a cosine score — display only, thresholds tuned to
 * the MiniLM model's compressed range (same model GoalIntake uses). */
export function confidenceTier(score: number): "strong" | "medium" | "weak" {
  if (score >= 0.45) return "strong"
  if (score >= 0.35) return "medium"
  return "weak"
}

// ---------------------------------------------------------------------------
// M2: intents → typed goal drafts via LLM (framework-grounded).
// This file holds the PURE halves — prompt building and response validation —
// so they're unit-testable with a mocked LLM. The actual Claude CLI call lives
// in visionPlanClaude.ts (server-only), wired together by the API route.
// ---------------------------------------------------------------------------

/** What the client sends per intent — a trimmed VisionIntent. v15: room wants
 * arrive as intents too (origin "room", user-picked area is authoritative),
 * and the prose may be empty when the whole vision was entered via the wheel. */
export const VisionPlanRequestSchema = z.object({
  vision: z.string().max(2000),
  intents: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        pillarId: z.string(),
        pillarLabel: z.string(),
        objectiveId: z.string().nullable(),
        objectiveLabel: z.string().nullable(),
        /** "room" = typed into a wheel room (area chosen by the user); absent/"prose" = embedder-matched clause. */
        origin: z.enum(["prose", "room"]).optional(),
        /** The room's display name at entry time (may be a rename or a custom room). */
        roomLabel: z.string().max(60).optional(),
      }),
    )
    .min(1)
    .max(24),
})
export type VisionPlanRequest = z.infer<typeof VisionPlanRequestSchema>

const LlmHabitSchema = z.object({
  title: z.string().min(1).max(120),
  daysPerWeek: z.number().int().min(1).max(7),
  /** Curated framework target this habit mirrors — null for a pure AI suggestion. */
  basedOnTargetId: z.string().nullable().optional(),
})
const LlmTaskSchema = z.object({
  title: z.string().min(1).max(120),
  dueOffsetDays: z.number().int().min(0).max(180),
})
const LlmMeasureSchema = z.object({
  unit: z.string().min(1).max(40),
  start: z.number(),
  target: z.number(),
  steps: z.number().int().min(2).max(12),
})
const LlmRampStepSchema = z.object({
  // Framework drivers ramp beyond daily (e.g. Approaches 15-20/week) — allow it;
  // scheduling caps at the habit's daysPerWeek anyway (min() in effectiveFrequency).
  frequencyPerWeek: z.number().int().min(1).max(30),
  durationWeeks: z.number().int().min(1).max(52),
})
const LlmGoalSchema = z.object({
  title: z.string().min(1).max(120),
  pillarId: z.string(),
  objectiveId: z.string().nullable(),
  type: z.enum(["habit_ramp", "milestone_ladder", "achievement"]),
  why: z.string().min(1).max(500),
  sourceIntentIds: z.array(z.string()).min(1),
  habits: z.array(LlmHabitSchema).max(5),
  tasks: z.array(LlmTaskSchema).max(8),
  measure: LlmMeasureSchema.nullable(),
  rampSteps: z.array(LlmRampStepSchema).max(6).nullable(),
  /** PLM timeframes: an explicit "achieve by" horizon per outcome goal. */
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})
const LlmGoalGenSchema = z.object({ goals: z.array(LlmGoalSchema).min(1).max(10) })

/**
 * Build the goal-generation prompt. The LLM gets the raw vision, the
 * embedding-derived intents (which it may merge, re-route, or discard — the
 * clause splitter produces filler intents like "I want to wake up"), and the
 * full framework menu so every goal lands on a real pillar and, where
 * possible, a real objective.
 */
/** One-line summary of a curated target: unit + its real ramp or ladder. */
function targetSummary(t: (typeof TARGETS)[number]): string {
  const ramp = t.rampSteps ?? (t.sharedDriverId ? getSharedDriver(t.sharedDriverId)?.rampSteps : null)
  const rampStr = ramp?.length ? ` ramp ${ramp.map((r) => `${r.frequencyPerWeek}/wk×${r.durationWeeks}w`).join("→")}` : ""
  const ladderStr = t.milestoneConfig ? ` ladder ${t.milestoneConfig.start}→${t.milestoneConfig.target} ${t.unit} in ${t.milestoneConfig.steps} steps` : ""
  return `    · ${t.id}: ${t.label} (${t.unit};${rampStr}${ladderStr})`
}

/** Pillar → objectives → curated targets, as prompt-ready lines. */
function frameworkMenu(pillarIds?: string[]): string {
  return PILLARS.filter((p) => !pillarIds || pillarIds.includes(p.id))
    .map((p) => {
      const objs = OBJECTIVES.filter((o) => o.pillarId === p.id)
        .map((o) => {
          const targets = getTargetsForObjective(o.id).map(targetSummary).join("\n")
          return `  - ${o.id}: ${o.label} — ${o.description}${targets ? `\n${targets}` : ""}`
        })
        .join("\n")
      return `- ${p.id}: ${p.label} (${p.tagline})\n${objs}`
    })
    .join("\n")
}

export function buildGoalGenPrompt(req: VisionPlanRequest): string {
  const menu = frameworkMenu()

  const roomWants = req.intents.filter((i) => i.origin === "room")
  const proseIntents = req.intents.filter((i) => i.origin !== "room")
  const wantLines = roomWants
    .map((i) => `- ${i.id}: "${i.text}" (room: ${i.roomLabel ?? i.pillarLabel}; area: ${i.pillarLabel})`)
    .join("\n")
  const intents = proseIntents
    .map((i) => `- ${i.id}: "${i.text}" (matched: ${i.pillarLabel}${i.objectiveLabel ? ` / ${i.objectiveLabel}` : ""})`)
    .join("\n")

  return `You are a goal-setting coach. A user described the life they want. Turn it into concrete goals.

USER'S VISION (their exact words):
"${req.vision.trim() || "(no prose — the user entered wants room by room below)"}"
${roomWants.length ? `
ROOM WANTS (typed by the user into a specific life-area room — the area is THEIR pick, keep it unless it is flagrantly wrong; a want in a custom room may be re-routed to the best-fitting area):
${wantLines}
` : ""}${proseIntents.length ? `
AUTO-DETECTED INTENTS (from clause matching — imperfect; merge fragments that belong together, discard filler like "I want to wake up" when it's part of a feeling, and re-route anything that landed on the wrong area):
${intents}
` : ""}
LIFE-AREA MENU (every goal MUST use one of these pillar ids; use an objective id from the same pillar when one fits, else null for a custom goal):
${menu}

RULES:
1. One goal per genuine ask in the vision — typically 2-5 goals. Never invent asks the user didn't make. Every ROOM WANT is a genuine ask: cover each with a goal (merge only true duplicates).
1b. A want naming a target number or level ("bench 100 kg", "50 k invested", "sub-20 5k") is an OUTCOME: type "milestone_ladder" with a measure built around that number AND a targetDate — never an undated habit goal. Its habits are the drivers that get there (e.g. strength sessions for a bench target).
2. title: short and concrete, in the spirit of the user's own words.
3. type: "habit_ramp" if success is mainly repeated behaviour, "milestone_ladder" if success is reaching measurable levels.
4. why: 1-2 sentences of motivation written to the user ("you"), anchored in their own words — this is the reason they'll see on hard days.
5. sourceIntentIds: which of the intent ids above this goal covers (merged intents → list all).
6. habits: 1-4 recurring behaviours that drive the goal, each with daysPerWeek (1-7). Make them small enough to do on a bad day. EVERY habit must have an obvious causal link to the user's own words — never generic self-help filler the user didn't ask for. When one of the curated targets listed above fits, set basedOnTargetId to its exact id and mirror its ramp/numbers; otherwise set basedOnTargetId to null (it will be shown to the user as an unverified AI suggestion).
7. tasks: 0-6 one-time actions (setup, research, sign-ups), each with dueOffsetDays (days after the plan starts, 0-180). Order them sensibly.
8. If type is "milestone_ladder": measure is REQUIRED — {unit, start, target, steps} where steps (2-12) is how many milestone rungs between start and target (e.g. revenue: start 0, target 10000, unit "$/month", steps 5). rampSteps must be null.
9. If type is "habit_ramp": rampSteps is REQUIRED — 2-4 phases of {frequencyPerWeek, durationWeeks} ramping the core habit up gently (Fabulous-style dosing: start easy). measure must be null.
9b. If type is "achievement": the want is BINARY — done or not done, with no number to climb ("first muscle-up", "driver's licence", "quit smoking", "run a marathon"). measure MUST be null. Give it a targetDate and put its rungs in "tasks" as named checkpoints ("10 strict pull-ups", "band-assisted rep"). Do NOT invent a fake measure like {target:1} just to make it a ladder — if a want has a real ascending number ("publish 3 articles"), use milestone_ladder instead.
10. targetDate: for every milestone_ladder AND achievement goal set a realistic ISO date (YYYY-MM-DD) sized to its ambition — 90 days for near targets, ~1 year for big ones, longer for huge ones. For habit_ramp goals set null (they're ongoing).

Respond with STRICT JSON only — no markdown, no commentary:
{"goals":[{"title":"...","pillarId":"...","objectiveId":"..." or null,"type":"habit_ramp"|"milestone_ladder"|"achievement","why":"...","sourceIntentIds":["intent-0"],"habits":[{"title":"...","daysPerWeek":3,"basedOnTargetId":"tgt id or null"}],"tasks":[{"title":"...","dueOffsetDays":7}],"measure":{"unit":"...","start":0,"target":100,"steps":5} or null,"rampSteps":[{"frequencyPerWeek":3,"durationWeeks":4}] or null,"targetDate":"2027-06-30" or null}]}`
}

/** Strip optional markdown fences and parse — the CLI sometimes wraps JSON. */
function stripFences(raw: string): string {
  let s = raw.trim()
  if (s.startsWith("```json")) s = s.slice(7)
  else if (s.startsWith("```")) s = s.slice(3)
  if (s.endsWith("```")) s = s.slice(0, -3)
  return s.trim()
}

/**
 * Validate + map the LLM's response into VisionGoalDrafts. Fail-closed: any
 * schema violation, unknown pillar, or objective/pillar mismatch throws — the
 * route turns that into an explicit error, never a degraded plan.
 */
export function parseGoalGenResponse(raw: string): VisionGoalDraft[] {
  let data: unknown
  try {
    data = JSON.parse(stripFences(raw))
  } catch {
    throw new Error("LLM returned unparseable output (not JSON)")
  }
  const parsed = LlmGoalGenSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(`LLM output failed validation: ${parsed.error.issues.map((i) => i.message).join("; ")}`)
  }
  return parsed.data.goals.map((g, idx) => {
    const pillar = PILLARS.find((p) => p.id === g.pillarId)
    if (!pillar) throw new Error(`LLM used unknown pillar id "${g.pillarId}"`)
    let objectiveId: string | null = null
    let objLabel: string | null = null
    if (g.objectiveId) {
      const obj = OBJECTIVES.find((o) => o.id === g.objectiveId)
      if (!obj) throw new Error(`LLM used unknown objective id "${g.objectiveId}"`)
      if (obj.pillarId !== pillar.id) throw new Error(`LLM matched objective "${obj.id}" to the wrong pillar "${pillar.id}"`)
      objectiveId = obj.id
      objLabel = obj.label
    }
    // Cross-field rules zod can't express: the decomposition must match the type.
    if (g.type === "milestone_ladder") {
      if (!g.measure) throw new Error(`Goal "${g.title}" is milestone_ladder but has no measure`)
      if (g.measure.target === g.measure.start) throw new Error(`Goal "${g.title}" has a zero-range measure`)
    }
    if (g.type === "habit_ramp" && (!g.rampSteps || g.rampSteps.length === 0)) {
      throw new Error(`Goal "${g.title}" is habit_ramp but has no rampSteps`)
    }
    // v17 — an achievement is binary. A measure on one means the model tried to
    // fake a ladder ({target:1}), which would render meaningless rungs.
    if (g.type === "achievement" && g.measure) {
      throw new Error(`Goal "${g.title}" is an achievement but carries a measure`)
    }
    if (g.habits.length === 0) throw new Error(`Goal "${g.title}" has no habits — every goal needs at least one recurring behaviour`)
    return {
      id: `goal-${idx}`,
      title: g.title,
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      pillarColor: pillar.color,
      objectiveId,
      objectiveLabel: objLabel,
      type: g.type,
      why: g.why,
      sourceIntentIds: g.sourceIntentIds,
      habits: g.habits.map((h, i) => {
        // Provenance is validated, not trusted: an unknown target id would show
        // the user a false "framework" badge — fail closed instead.
        const src = h.basedOnTargetId ?? null
        if (src && !TARGETS.some((t) => t.id === src)) throw new Error(`LLM cited unknown framework target "${src}"`)
        return { id: `goal-${idx}-habit-${i}`, title: h.title, daysPerWeek: h.daysPerWeek, sourceTargetId: src }
      }),
      tasks: g.tasks.map((t, i) => ({ id: `goal-${idx}-task-${i}`, title: t.title, dueOffsetDays: t.dueOffsetDays })),
      measure: g.type === "milestone_ladder" ? g.measure : null,
      rampSteps: g.type === "habit_ramp" ? g.rampSteps : null,
      targetDate: g.targetDate ?? null,
    }
  })
}

/** Map an LLM measure onto the real milestone-ladder config (curve editors,
 * generators, and the lab curve editor all consume this shape). */
export function measureToLadderConfig(measure: VisionMeasure): MilestoneLadderConfig {
  return { start: measure.start, target: measure.target, steps: measure.steps, curveTension: 0 }
}

// ---------------------------------------------------------------------------
// M8: per-goal AI refinement — "make the workouts calisthenics", "one more gym
// day", "gentler start". One goal per call, id kept stable, habit/task ids
// re-seeded so old completions can never misattach to new habits.
// ---------------------------------------------------------------------------

export const VisionRefineRequestSchema = z.object({
  vision: z.string().min(3).max(2000),
  instruction: z.string().min(2).max(500),
  goal: z.object({}).passthrough(), // shape re-validated on the way OUT, not in
})
export type VisionRefineRequest = z.infer<typeof VisionRefineRequestSchema>

export function buildGoalRefinePrompt(vision: string, goal: VisionGoalDraft, instruction: string): string {
  const menu = frameworkMenu([goal.pillarId])
  return `You are a goal-setting coach revising ONE goal in a user's plan.

USER'S OVERALL VISION: "${vision}"

THE GOAL AS IT STANDS (JSON):
${JSON.stringify({
    title: goal.title, pillarId: goal.pillarId, objectiveId: goal.objectiveId, type: goal.type,
    why: goal.why, targetDate: goal.targetDate ?? null,
    habits: goal.habits.map((h) => ({ title: h.title, daysPerWeek: h.daysPerWeek, basedOnTargetId: h.sourceTargetId ?? null })),
    tasks: goal.tasks.map((t) => ({ title: t.title, dueOffsetDays: t.dueOffsetDays })),
    measure: goal.measure, rampSteps: goal.rampSteps,
  }, null, 2)}

THE USER'S CHANGE REQUEST: "${instruction}"

CURATED MENU for this life area (prefer these; cite via basedOnTargetId):
${menu}

RULES:
1. Apply the change request faithfully; keep everything the user did NOT ask to change as-is (same titles, numbers, WHY).
2. Keep pillarId "${goal.pillarId}" unless the request clearly moves the goal to another life area.
3. Same contract as before: habits need daysPerWeek 1-7 + basedOnTargetId (exact curated id or null); milestone_ladder needs measure (rampSteps null); habit_ramp needs rampSteps (measure null); every habit causally linked to the user's words.
${goal.targetDate ? `4. The user wants this achieved by ${goal.targetDate} — pace tasks, ramps and the ladder to fit that date.` : ""}

Respond with STRICT JSON only, EXACTLY ONE goal:
{"goals":[{"title":"...","pillarId":"...","objectiveId":"..." or null,"type":"habit_ramp"|"milestone_ladder","why":"...","sourceIntentIds":${JSON.stringify(goal.sourceIntentIds)},"habits":[{"title":"...","daysPerWeek":3,"basedOnTargetId":null}],"tasks":[{"title":"...","dueOffsetDays":7}],"measure":{...} or null,"rampSteps":[...] or null}]}`
}

/**
 * Parse a refine response: exactly one goal, keeping the existing goal's id and
 * targetDate; habit/task ids get a fresh seed so completion history from the
 * pre-refine habits can never attach to the wrong row.
 */
export function parseGoalRefineResponse(raw: string, existing: VisionGoalDraft, idSeed: string): VisionGoalDraft {
  const drafts = parseGoalGenResponse(raw)
  if (drafts.length !== 1) throw new Error(`Refine must return exactly one goal (got ${drafts.length})`)
  const g = drafts[0]
  return {
    ...g,
    id: existing.id,
    targetDate: existing.targetDate ?? null,
    habits: g.habits.map((h, i) => ({ ...h, id: `${existing.id}-h${idSeed}-${i}` })),
    tasks: g.tasks.map((t, i) => ({ ...t, id: `${existing.id}-t${idSeed}-${i}` })),
  }
}

// ---------------------------------------------------------------------------
// M4: cross-goal balancing + drip dosing — the piece no competitor ships.
// Deterministic, pure, no LLM: given the goals in PRIORITY ORDER and a daily
// habit budget, stagger habit activation so the plan phases in gently
// (Fabulous dosing) and never exceeds capacity; habits that can't ever fit are
// flagged as overflow, never silently dropped (CLAUDE.md rule 3).
// ---------------------------------------------------------------------------

/** Effective weekly capacity in week `w` — ramps linearly to full over rampWeeks. */
function rampedCap(week: number, weeklyCap: number, rampWeeks: number): number {
  if (week >= rampWeeks) return weeklyCap
  return Math.ceil((weeklyCap * week) / rampWeeks)
}

/**
 * Balance all goals' habits and tasks onto a week calendar.
 *
 * - `goals` order IS priority order: earlier goals' habits activate first.
 * - A habit activates in the earliest week whose ramped capacity fits the
 *   total load of everything already active plus itself. Because activations
 *   persist, the binding constraint is steady-state load ≤ weeklyCap; habits
 *   beyond that are returned in `overflowHabitIds` with startWeek null.
 * - Weekday leveling: each habit's instances go to the currently least-loaded
 *   weekdays (ties → earlier day), so no single day stacks up.
 * - Tasks keep their LLM due offsets but shift by their goal's activation week,
 *   so a goal that phases in at week 3 doesn't demand tasks in week 1.
 */
export function balancePlan(goals: VisionGoalDraft[], opts: BalanceOpts = {}): BalancedPlan {
  const dailyBudget = Math.max(1, Math.floor(opts.dailyBudget ?? 4))
  const rampWeeks = Math.max(1, Math.floor(opts.rampWeeks ?? 4))
  const weeklyCap = dailyBudget * 7

  const habits: BalancedHabit[] = []
  const overflowHabitIds: string[] = []
  const dayLoads = [0, 0, 0, 0, 0, 0, 0]
  let steadyLoad = 0

  for (const goal of goals) {
    for (const habit of goal.habits) {
      const loadIfAdded = steadyLoad + habit.daysPerWeek
      if (loadIfAdded > weeklyCap) {
        overflowHabitIds.push(habit.id)
        habits.push({
          habitId: habit.id, goalId: goal.id, title: habit.title, pillarColor: goal.pillarColor,
          daysPerWeek: habit.daysPerWeek, startWeek: null, weekdays: [],
        })
        continue
      }
      // Earliest week whose ramped capacity fits the new steady load.
      let startWeek = rampWeeks
      for (let w = 1; w <= rampWeeks; w++) {
        if (loadIfAdded <= rampedCap(w, weeklyCap, rampWeeks)) { startWeek = w; break }
      }
      steadyLoad = loadIfAdded
      // Level this habit's instances onto the least-loaded weekdays.
      const order = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => dayLoads[a] - dayLoads[b] || a - b)
      const weekdays = order.slice(0, habit.daysPerWeek).sort((a, b) => a - b)
      for (const d of weekdays) dayLoads[d]++
      habits.push({
        habitId: habit.id, goalId: goal.id, title: habit.title, pillarColor: goal.pillarColor,
        daysPerWeek: habit.daysPerWeek, startWeek, weekdays,
      })
    }
  }

  // A goal activates when its first habit does (tasks shift accordingly).
  const goalStart = new Map<string, number>()
  for (const h of habits) {
    if (h.startWeek === null) continue
    const cur = goalStart.get(h.goalId)
    if (cur === undefined || h.startWeek < cur) goalStart.set(h.goalId, h.startWeek)
  }

  const tasks: BalancedTask[] = goals.flatMap((goal) => {
    const activationOffsetDays = ((goalStart.get(goal.id) ?? 1) - 1) * 7
    return goal.tasks.map((t) => {
      const dueDay = t.dueOffsetDays + activationOffsetDays
      return { taskId: t.id, goalId: goal.id, title: t.title, dueDay, week: Math.floor(dueDay / 7) + 1 }
    })
  })

  const lastStart = Math.max(1, ...habits.map((h) => h.startWeek ?? 1))
  const weeks: BalancedWeek[] = []
  for (let w = 1; w <= lastStart; w++) {
    weeks.push({
      week: w,
      load: habits.filter((h) => h.startWeek !== null && h.startWeek <= w).reduce((s, h) => s + h.daysPerWeek, 0),
      cap: rampedCap(w, weeklyCap, rampWeeks),
      startingHabitIds: habits.filter((h) => h.startWeek === w).map((h) => h.habitId),
    })
  }

  return { habits, tasks, weeks, overflowHabitIds, steadyLoad, weeklyCap, dailyBudget, dayLoads }
}

// ---------------------------------------------------------------------------
// M5: sandbox persistence — one lossless VisionPlanState in localStorage.
// Parsing is zod-validated so a corrupt or outdated blob is rejected (null)
// instead of half-hydrating the UI.
// ---------------------------------------------------------------------------

const VisionIntentStateSchema = z.object({
  id: z.string(),
  text: z.string(),
  pillarId: z.string(),
  pillarLabel: z.string(),
  pillarColor: z.string(),
  objectiveId: z.string().nullable(),
  objectiveLabel: z.string().nullable(),
  confidence: z.number(),
  spans: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
})

const VisionGoalDraftSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  pillarId: z.string(),
  pillarLabel: z.string(),
  pillarColor: z.string(),
  objectiveId: z.string().nullable(),
  objectiveLabel: z.string().nullable(),
  type: z.enum(["habit_ramp", "milestone_ladder", "achievement"]),
  why: z.string(),
  sourceIntentIds: z.array(z.string()),
  habits: z.array(z.object({
    id: z.string(),
    title: z.string().min(1),
    daysPerWeek: z.number().int().min(1).max(7),
    sourceTargetId: z.string().nullable().optional(),
    routine: z.object({
      days: z.array(z.object({ id: z.string(), name: z.string().min(1).max(60) })).min(1).max(14),
    }).nullable().optional(),
  })).min(1),
  tasks: z.array(z.object({ id: z.string(), title: z.string().min(1), dueOffsetDays: z.number().int().min(0) })),
  measure: z.object({ unit: z.string(), start: z.number(), target: z.number(), steps: z.number().int().min(2).max(12) }).nullable(),
  // v17 — real multi-phase ramps. frequencyPerWeek keeps .max(30) to match
  // LlmRampStepSchema: framework drivers legitimately run "15-20 approaches a
  // week". Tightening it to 7 would retroactively reject live blobs.
  // No .min(1) here: removeRampPhase can persist [] for a non-habit goal, and
  // rejecting a whole plan over an empty array would be indefensible. The load
  // layer normalises [] and backfills a habit_ramp that lost its phases.
  rampSteps: z.array(z.object({
    frequencyPerWeek: z.number().int().min(1).max(30),
    durationWeeks: z.number().int().min(1).max(52),
  })).max(8).nullable(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  // M3 (PLM OS) — affirmation sentence, belief check, pain-why. All optional.
  smartSentence: z.string().max(300).nullable().optional(),
  beliefLevel: z.number().int().min(0).max(10).nullable().optional(),
  desireLevel: z.number().int().min(0).max(10).nullable().optional(),
  painWhy: z.string().max(500).nullable().optional(),
  // v3 — Life Plan per-area goal target.
  areaId: z.string().nullable().optional(),
  // v9 — qualification teeth: reward, stake, pre-mortem, 100-reasons.
  reward: z.string().max(300).nullable().optional(),
  stake: z.string().max(300).nullable().optional(),
  obstacles: z.string().max(1000).nullable().optional(),
  reasonsList: z.array(z.string().min(1).max(200)).max(150).optional(),
  feeling: z.string().max(120).nullable().optional(),
  // v17 — the goal graph + the soft qualification questions.
  feedsGoalIds: z.array(z.string()).max(12).optional(),
  whoItServes: z.string().max(300).nullable().optional(),
  unlocks: z.string().max(300).nullable().optional(),
  firstStep: z.string().max(200).nullable().optional(),
}).superRefine((g, ctx) => {
  // Hard-reject only what no writer of ours could ever have produced:
  // parseGoalGenResponse and createAreaGoal both THROW without a measure on a
  // milestone, so a measureless milestone means the blob is corrupt, and
  // coercing it would silently change the goal's meaning.
  if (g.type === "milestone_ladder" && !g.measure) {
    ctx.addIssue({ code: "custom", message: `Goal "${g.title}" is milestone_ladder with no measure` })
  }
  if (g.type === "achievement" && g.measure) {
    ctx.addIssue({ code: "custom", message: `Goal "${g.title}" is an achievement but carries a measure` })
  }
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const VisionDayPlanSchema = z.object({
  mustIds: z.array(z.string()).max(5),
  adhoc: z.array(z.object({ id: z.string(), title: z.string().min(1).max(200), done: z.boolean() })),
  // v9 — pillarId → today's fresh reason for that RPM area block.
  blockReasons: z.record(z.string(), z.string().max(300)).optional(),
})

const VisionWeeklyReviewSchema = z.object({
  weekStart: z.string().regex(ISO_DATE),
  // His scale is 0-10 ("your 0" is a real point on it); legacy 1-10 blobs stay valid.
  areaRatings: z.record(z.string(), z.number().int().min(0).max(10)),
  note: z.string().max(2000),
  focusPillarId: z.string().nullable(),
  // M4 (PLM OS) — reflection prompts + committed outcomes. All optional.
  magicMoment: z.string().max(1000).optional(),
  accomplishment: z.string().max(1000).optional(),
  lesson: z.string().max(1000).optional(),
  challenge: z.string().max(1000).optional(),
  outcomes: z.array(z.object({
    areaId: z.string(),
    outcome: z.string().min(1).max(300),
    why: z.string().max(500),
    weekday: z.number().int().min(0).max(6).optional(),
  })).max(3).optional(),
  captures: z.array(z.object({ text: z.string().min(1).max(300), areaId: z.string().nullable() })).max(50).optional(),
})

const VisionVerdictSchema = z.object({
  verdict: z.enum(["achieved", "on-track", "over-achieved", "likely-miss", "not-started", "modified", "cancelled", "rescheduled"]),
  reason: z.string().max(500),
  // v9 — the committed fix, named as a system.
  fix: z.string().max(500).optional(),
})

const VisionProgressSchema = z.object({
  startDate: z.string().regex(ISO_DATE),
  completions: z.record(z.string(), z.array(z.string().regex(ISO_DATE))),
  tasksDone: z.array(z.string()),
  // PLM layer — all optional so pre-PLM sandbox payloads keep parsing.
  visionReviews: z.array(z.string().regex(ISO_DATE)).optional(),
  ritualCompletions: z.record(z.string().regex(ISO_DATE), z.array(z.string())).optional(),
  dayPlans: z.record(z.string().regex(ISO_DATE), VisionDayPlanSchema).optional(),
  weeklyReviews: z.array(VisionWeeklyReviewSchema).optional(),
  // PLM OS (M5/M6) — evening reflections + confirmed report verdicts.
  eveningReflections: z.record(z.string().regex(ISO_DATE), z.object({ amazing: z.string().max(2000), better: z.string().max(2000), dayScore: z.number().int().min(1).max(10).optional(), magicMoment: z.string().max(500).optional() })).optional(),
  // Period key is "YYYY-MM" (monthly) or "YYYY" (year in review).
  reportVerdicts: z.record(z.string().regex(/^\d{4}(-\d{2})?$/), z.record(z.string(), VisionVerdictSchema)).optional(),
  // v9 — numeric RESULT readings per milestone goal.
  measureLogs: z.record(z.string(), z.array(z.object({ date: z.string().regex(ISO_DATE), value: z.number() })).max(400)).optional(),
})

const VisionRitualSchema = z.object({
  items: z.array(z.object({ id: z.string(), title: z.string().min(1).max(120), minutes: z.number().int().min(1).max(120) })).min(1).max(20),
  preset: z.union([z.literal(15), z.literal(30), z.literal(60)]).nullable(),
  builtAt: z.string().regex(ISO_DATE).optional(),
  weekly: z.array(z.object({
    id: z.string(),
    title: z.string().min(1).max(160),
    areaId: z.string().nullable(),
    weekday: z.number().int().min(0).max(6),
    everyOtherWeek: z.boolean().optional(),
    monthlyDay: z.number().int().min(1).max(28).optional(),
  })).max(20).optional(),
})

export const VisionPlanStateSchema = z.object({
  // Foundation-only states (commit/values done, no plan yet) are valid: the
  // vision may be empty and goals/priorityIds may both be empty.
  vision: z.string(),
  intents: z.array(VisionIntentStateSchema),
  goals: z.array(VisionGoalDraftSchema),
  priorityIds: z.array(z.string()),
  dailyBudget: z.number().int().min(1).max(14),
  confirmed: z.boolean(),
  progress: VisionProgressSchema.optional(),
  areaOrder: z.array(z.string()).optional(),
  deselectedAreas: z.array(z.string()).optional(),
  ritual: VisionRitualSchema.optional(),
  // PLM OS (M0-M2) — commitment gate, ranked values, driving force, your-10s.
  committedAt: z.string().regex(ISO_DATE).optional(),
  values: z.array(z.string().min(1).max(60)).max(20).optional(),
  awayValues: z.array(z.string().min(1).max(60)).max(10).optional(),
  drivingForce: z.object({
    purpose: z.string().max(2000),
    reasons: z.array(z.string().min(1).max(60)).max(30),
    identity: z.array(z.string().min(1).max(200)).max(30),
    mission: z.string().max(400).optional(),
    conduct: z.array(z.string().min(1).max(200)).max(30).optional(),
    primaryQuestion: z.string().max(300).optional(),
  }).optional(),
  yourTens: z.record(z.string(), z.string().max(1000)).optional(),
  // v17 — your 0: the opposite pole, so the rating has two reference points.
  yourZeros: z.record(z.string(), z.string().max(1000)).optional(),
  areaPlans: z.record(z.string(), z.object({
    name: z.string().max(120).optional(),
    purpose: z.string().max(1000).optional(),
    identity: z.string().max(300).optional(),
    maintenance: z.string().max(300).optional(),
    // v17 — the per-area soft layer. Caps are 10 (vs the global 20/100): one
    // area with 11 values isn't a hierarchy. Item lengths mirror the globals.
    whyWork: z.string().max(1000).optional(),
    values: z.array(z.string().min(1).max(60)).max(10).optional(),
    affirmations: z.array(z.string().min(1).max(300)).max(10).optional(),
    incantations: z.array(z.string().min(1).max(300)).max(10).optional(),
    rules: z.array(z.string().min(1).max(300)).max(10).optional(),
  })).optional(),
  focusAreaIds: z.array(z.string()).max(3).optional(),
  incantations: z.array(z.string().min(1).max(300)).max(100).optional(),
  goalInbox: z.array(z.string().min(1).max(300)).max(100).optional(),
  manifestoName: z.string().min(1).max(80).optional(),
  manifestoLines: z.array(z.string().min(1).max(200)).max(30).optional(),
  letters: z.array(z.object({
    habit: z.string().min(1).max(120),
    thankYou: z.string().max(3000),
    goodbye: z.string().max(3000),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).max(20).optional(),
  counters: z.array(z.object({
    label: z.string().min(1).max(120),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).max(20).optional(),
  valueRules: z.array(z.string().min(1).max(300)).max(60).optional(),
  customAreas: z.array(z.object({ id: z.string().min(1), label: z.string().min(1).max(60), color: z.string().min(1).max(20) })).max(12).optional(),
  wheelWants: z.array(z.object({ id: z.string().min(1), areaId: z.string().min(1), text: z.string().min(1).max(200) })).max(36).optional(),
  baselineRatings: z.record(z.string(), z.number().min(0).max(10)).optional(),
  // v17 — when each baseline rating was set, so the first weekly review knows
  // how stale it is; and the life-wide affirmations list.
  baselineRatedAt: z.record(z.string(), z.string().regex(ISO_DATE)).optional(),
  affirmations: z.array(z.string().min(1).max(300)).max(100).optional(),
  areaScope: z.record(z.string(), z.enum(["deep", "sketched", "later"])).optional(),
})

/**
 * v17 — one repair the load layer performed on a persisted plan. Never silent:
 * the caller MUST show these to the user (rule 3 — no silent fallbacks).
 */
export type VisionPlanRepair =
  | { kind: "dangling-edge"; goalId: string; missingId: string }
  | { kind: "cycle-broken"; goalId: string; removedId: string }
  | { kind: "ramp-backfilled"; goalId: string }

export interface VisionPlanLoad {
  state: VisionPlanState
  /** Non-empty ⇒ the caller must tell the user what was repaired. */
  repairs: VisionPlanRepair[]
}

/**
 * v17 — load a persisted sandbox blob, repairing what our OWN code could have
 * produced and hard-rejecting what only corruption could.
 *
 * The line: `removeRoutineHabit` deletes goals today, so a dangling goal edge
 * is a defect we shipped — repair it and report. A milestone with no measure is
 * unwritable by any writer we have, so it means the blob is corrupt — reject.
 * And a broken `priorityIds` stays fatal, because a goal missing from that list
 * is silently dropped by the balancer, which is the exact failure rule 3 bans.
 */
export function loadVisionPlanState(raw: string | null): VisionPlanLoad | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = VisionPlanStateSchema.safeParse(data)
  if (!parsed.success) return null
  // Priority list must exactly cover the goals — otherwise the balancer would
  // silently drop goals whose id fell out of the list.
  const goalIds = new Set(parsed.data.goals.map((g) => g.id))
  const prio = parsed.data.priorityIds
  if (prio.length !== goalIds.size || !prio.every((id) => goalIds.has(id))) return null

  const repairs: VisionPlanRepair[] = []
  // Rebuild the graph edge by edge in a stable order, dropping (and reporting)
  // any edge that points nowhere or would close a loop. Deterministic: the
  // LATER edge in traversal order is the one that loses.
  const kept = new Map<string, string[]>()
  const reaches = (from: string, target: string, seen = new Set<string>()): boolean => {
    if (from === target) return true
    if (seen.has(from)) return false
    seen.add(from)
    return (kept.get(from) ?? []).some((next) => reaches(next, target, seen))
  }
  const goals = parsed.data.goals.map((g) => {
    let ramp = g.rampSteps
    if (ramp && ramp.length === 0) ramp = null
    if (g.type === "habit_ramp" && (!ramp || ramp.length === 0)) {
      // A habit goal with no phases renders nothing and schedules nothing.
      // Rebuild one steady phase from the habits it already carries.
      const freq = Math.max(1, ...g.habits.map((h) => h.daysPerWeek))
      ramp = [{ frequencyPerWeek: freq, durationWeeks: 4 }]
      repairs.push({ kind: "ramp-backfilled", goalId: g.id })
    }
    const edges: string[] = []
    for (const to of g.feedsGoalIds ?? []) {
      if (!goalIds.has(to)) {
        repairs.push({ kind: "dangling-edge", goalId: g.id, missingId: to })
        continue
      }
      if (to === g.id || reaches(to, g.id)) {
        repairs.push({ kind: "cycle-broken", goalId: g.id, removedId: to })
        continue
      }
      edges.push(to)
    }
    kept.set(g.id, edges)
    return {
      ...g,
      rampSteps: ramp,
      ...(g.feedsGoalIds ? { feedsGoalIds: edges } : {}),
    }
  })

  return { state: { ...parsed.data, goals } as VisionPlanState, repairs }
}

/** Parse a persisted sandbox blob. Returns null for anything invalid — the
 * caller starts fresh rather than rendering a half-broken plan.
 * v17: a thin wrapper over `loadVisionPlanState`; use that one when you can
 * surface the repair report to the user. */
export function parseVisionPlanState(raw: string | null): VisionPlanState | null {
  return loadVisionPlanState(raw)?.state ?? null
}

/**
 * Stable-sort goal ids so goals of higher-priority life areas come first
 * (drag order of the area board), preserving the existing relative order
 * within each area. Ids whose pillar isn't in `areaOrder` keep their spot at
 * the end — nothing is ever dropped, so the priority↔goals invariant holds.
 */
export function orderGoalIdsByArea(
  ids: string[],
  goals: Array<{ id: string; pillarId: string }>,
  areaOrder: string[],
): string[] {
  const pillarOf = new Map(goals.map((g) => [g.id, g.pillarId]))
  const rank = new Map(areaOrder.map((p, i) => [p, i]))
  return [...ids].sort((a, b) => {
    const ra = rank.get(pillarOf.get(a) ?? "") ?? Number.MAX_SAFE_INTEGER
    const rb = rank.get(pillarOf.get(b) ?? "") ?? Number.MAX_SAFE_INTEGER
    return ra - rb
  })
}

// ---------------------------------------------------------------------------
// v17 — the goal graph. Edges point OUTWARD: a goal lists what it FEEDS. That
// matches the area-first authoring gesture ("this new goal feeds the money goal
// I wrote in the last room") — you only ever edit the goal in front of you,
// never re-open one in an area you already left. The reverse index is computed,
// never stored, so the two directions can't drift.
// ---------------------------------------------------------------------------

/** Goals that feed `goalId` — the reverse index over feedsGoalIds. */
export function goalFeeders(goals: VisionGoalDraft[], goalId: string): VisionGoalDraft[] {
  return goals.filter((g) => (g.feedsGoalIds ?? []).includes(goalId))
}

/** Flat edge list for rendering. `crossArea` compares the goals' effective
 * areas — explicit areaId when set, otherwise the pillar they hang off. */
export function goalEdges(goals: VisionGoalDraft[]): Array<{ fromId: string; toId: string; crossArea: boolean }> {
  const byId = new Map(goals.map((g) => [g.id, g]))
  const scopeOf = (g: VisionGoalDraft) => g.areaId ?? `pillar:${g.pillarId}`
  const out: Array<{ fromId: string; toId: string; crossArea: boolean }> = []
  for (const g of goals) {
    for (const toId of g.feedsGoalIds ?? []) {
      const to = byId.get(toId)
      if (!to) continue
      out.push({ fromId: g.id, toId, crossArea: scopeOf(g) !== scopeOf(to) })
    }
  }
  return out
}

/** Would adding from→to close a loop? (DFS forward from `to` looking for `from`.) */
export function wouldCycle(goals: VisionGoalDraft[], fromId: string, toId: string): boolean {
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

/** Add a "from feeds to" edge. Fails closed — unknown id, self-edge, duplicate
 * and cycle all throw rather than producing a graph that can't be rendered. */
export function addGoalEdge(goals: VisionGoalDraft[], fromId: string, toId: string): VisionGoalDraft[] {
  const from = goals.find((g) => g.id === fromId)
  const to = goals.find((g) => g.id === toId)
  if (!from) throw new Error(`Unknown goal id "${fromId}"`)
  if (!to) throw new Error(`Unknown goal id "${toId}"`)
  if (fromId === toId) throw new Error(`A goal can't feed itself`)
  if ((from.feedsGoalIds ?? []).includes(toId)) throw new Error(`"${from.title}" already feeds "${to.title}"`)
  if (wouldCycle(goals, fromId, toId)) {
    throw new Error(`That would make a loop — "${to.title}" already feeds "${from.title}"`)
  }
  return goals.map((g) => (g.id === fromId ? { ...g, feedsGoalIds: [...(g.feedsGoalIds ?? []), toId] } : g))
}

export function removeGoalEdge(goals: VisionGoalDraft[], fromId: string, toId: string): VisionGoalDraft[] {
  return goals.map((g) =>
    g.id === fromId ? { ...g, feedsGoalIds: (g.feedsGoalIds ?? []).filter((id) => id !== toId) } : g,
  )
}

/** THE goal-deletion entry point. Drops the goal AND strips its id from every
 * other goal's feedsGoalIds, so a dangling edge is unreachable via the API. */
export function removeGoal(goals: VisionGoalDraft[], goalId: string): VisionGoalDraft[] {
  return goals
    .filter((g) => g.id !== goalId)
    .map((g) =>
      (g.feedsGoalIds ?? []).includes(goalId)
        ? { ...g, feedsGoalIds: g.feedsGoalIds!.filter((id) => id !== goalId) }
        : g,
    )
}

// ---------------------------------------------------------------------------
// v17 — the soft layer. Values / affirmations / incantations / rules are
// authored INSIDE an area (areaPlans[id]) and roll up to a life-wide view. The
// roll-up is a pure function, never stored — same doctrine as the balanced
// schedule, so the two views cannot drift.
// ---------------------------------------------------------------------------

export type SoftLayerKind = "values" | "affirmations" | "incantations" | "rules"

export interface SoftLayerEntry {
  /** The text as FIRST authored (later spellings that differ only in case or
   * spacing collapse into this one). */
  text: string
  /** Every area that authored it, in wheel order. Empty ⇒ life-wide only. */
  areaIds: string[]
  /** Also present in the life-wide list. */
  lifeWide: boolean
}

const SOFT_LAYER_GLOBAL_FIELD: Record<SoftLayerKind, "values" | "affirmations" | "incantations" | "valueRules"> = {
  values: "values",
  affirmations: "affirmations",
  incantations: "incantations",
  rules: "valueRules",
}

const softKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()

/**
 * Union of the per-area soft layer and the life-wide one, provenance kept.
 * A value shared by four areas is real signal (that's a core value), so we
 * return every area rather than picking a winner. Ordering is authorship order
 * — sorting by share count would reshuffle the list as you type, which reads
 * as a bug.
 */
export function softLayerRollup(
  state: Pick<VisionPlanState, "areaPlans" | "values" | "affirmations" | "incantations" | "valueRules">,
  kind: SoftLayerKind,
  areaOrder?: string[],
): SoftLayerEntry[] {
  const byKey = new Map<string, SoftLayerEntry>()
  const plans = state.areaPlans ?? {}
  const ordered = [
    ...(areaOrder ?? []).filter((id) => id in plans),
    ...Object.keys(plans).filter((id) => !(areaOrder ?? []).includes(id)),
  ]
  for (const areaId of ordered) {
    for (const raw of plans[areaId]?.[kind] ?? []) {
      const key = softKey(raw)
      if (!key) continue
      const existing = byKey.get(key)
      if (existing) {
        if (!existing.areaIds.includes(areaId)) existing.areaIds.push(areaId)
      } else {
        byKey.set(key, { text: raw.trim(), areaIds: [areaId], lifeWide: false })
      }
    }
  }
  for (const raw of state[SOFT_LAYER_GLOBAL_FIELD[kind]] ?? []) {
    const key = softKey(raw)
    if (!key) continue
    const existing = byKey.get(key)
    if (existing) existing.lifeWide = true
    else byKey.set(key, { text: raw.trim(), areaIds: [], lifeWide: true })
  }
  return [...byKey.values()]
}

// ---------------------------------------------------------------------------
// M10: routine library — user-picked common habits (meditation, nightly
// cleanup, one important work task, …) fold into ONE goal per category, owned
// by the category's primary life area. Pure list-in/list-out; the caller keeps
// priorityIds/areaOrder in sync.
// ---------------------------------------------------------------------------

export function routineGoalId(categoryId: string): string {
  return `routine-${categoryId}`
}

export function routineHabitId(categoryId: string, itemId: string): string {
  return `routine-${categoryId}-${itemId}`
}

/**
 * Add one library pick. Creates the category's routine goal on first pick
 * (habit_ramp with a no-cap 7/wk phase so each habit's own daysPerWeek rules);
 * later picks append to it. Adding an already-added item is a no-op.
 */
export function addRoutineHabit(
  goals: VisionGoalDraft[],
  category: RoutineCategory,
  item: RoutineTemplate,
): VisionGoalDraft[] {
  const gid = routineGoalId(category.id)
  const habit = {
    id: routineHabitId(category.id, item.id),
    title: item.title,
    daysPerWeek: item.daysPerWeek,
    sourceTargetId: null,
  }
  const existing = goals.find((g) => g.id === gid)
  if (existing) {
    if (existing.habits.some((h) => h.id === habit.id)) return goals
    return goals.map((g) => (g.id === gid ? { ...g, habits: [...g.habits, habit] } : g))
  }
  const pillar = PILLARS.find((p) => p.id === category.pillarIds[0])
  if (!pillar) throw new Error(`Routine category "${category.id}" names unknown pillar "${category.pillarIds[0]}"`)
  return [
    ...goals,
    {
      id: gid,
      title: category.label,
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      pillarColor: pillar.color,
      objectiveId: null,
      objectiveLabel: null,
      type: "habit_ramp",
      why: category.why,
      sourceIntentIds: [],
      habits: [habit],
      tasks: [],
      measure: null,
      rampSteps: [{ frequencyPerWeek: 7, durationWeeks: 4 }],
      targetDate: null,
    },
  ]
}

/**
 * Remove one library pick by habit id. Dropping a routine goal's last habit
 * removes the goal itself; a non-routine goal is never emptied (every goal
 * keeps ≥1 habit — same invariant the card UI enforces).
 */
export function removeRoutineHabit(goals: VisionGoalDraft[], habitId: string): VisionGoalDraft[] {
  return goals.flatMap((g) => {
    if (!g.habits.some((h) => h.id === habitId)) return [g]
    const habits = g.habits.filter((h) => h.id !== habitId)
    if (habits.length > 0) return [{ ...g, habits }]
    return g.id.startsWith("routine-") ? [] : [g]
  })
}

// ---------------------------------------------------------------------------
// M6: track-time math — due-today, pace, and rollups. All functions take the
// date as a parameter (never read the clock) so they're deterministic.
// Dates are YYYY-MM-DD strings parsed as UTC; weekdays are 0=Mon … 6=Sun to
// match BalancedHabit.weekdays.
// ---------------------------------------------------------------------------

function utcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

/** 0-based day number of `date` relative to `startDate` (negative before start). */
export function dayNumber(startDate: string, date: string): number {
  return Math.round((utcMs(date) - utcMs(startDate)) / 86_400_000)
}

/** Calendar weekday of an ISO date, 0=Mon … 6=Sun. */
export function calWeekday(iso: string): number {
  return (new Date(utcMs(iso)).getUTCDay() + 6) % 7
}

/**
 * Weekly frequency the goal's ramp allows in week N since the habit activated
 * (1-based). Past the last phase the final frequency holds; null = no ramp.
 */
export function rampFrequencyForWeek(rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null | undefined, weekSinceStart: number): number | null {
  if (!rampSteps || rampSteps.length === 0) return null
  let acc = 0
  for (const s of rampSteps) {
    acc += s.durationWeeks
    if (weekSinceStart <= acc) return s.frequencyPerWeek
  }
  return rampSteps[rampSteps.length - 1].frequencyPerWeek
}

/** How many of the habit's weekday slots are live on this date's week, given
 * the goal's ramp — early weeks run fewer days (M8: ramps are real, not chips). */
function effectiveFrequency(habit: BalancedHabit, week: number, rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null | undefined): number {
  if (habit.startWeek === null) return 0
  const rf = rampFrequencyForWeek(rampSteps, week - habit.startWeek + 1)
  return rf === null ? habit.daysPerWeek : Math.min(habit.daysPerWeek, rf)
}

/** Is this habit scheduled on `date`? (active week + weekday slot within the
 * ramp's current frequency — slots fill in weekday order) */
export function habitDueOnDate(
  habit: BalancedHabit,
  startDate: string,
  date: string,
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null = null,
): boolean {
  if (habit.startWeek === null) return false
  const day = dayNumber(startDate, date)
  if (day < 0) return false
  const week = Math.floor(day / 7) + 1
  if (week < habit.startWeek) return false
  const slot = habit.weekdays.indexOf(calWeekday(date))
  if (slot === -1) return false
  return slot < effectiveFrequency(habit, week, rampSteps)
}

/** All habits scheduled on `date`, in plan order. Ramps come from each habit's goal. */
export function habitsDueOnDate(balanced: BalancedPlan, goals: VisionGoalDraft[], startDate: string, date: string): BalancedHabit[] {
  const rampByGoal = new Map(goals.map((g) => [g.id, g.rampSteps]))
  return balanced.habits.filter((h) => habitDueOnDate(h, startDate, date, rampByGoal.get(h.goalId) ?? null))
}

/** Open tasks that have come due by `date` (dueDay ≤ today's day number). */
export function tasksDueByDate(balanced: BalancedPlan, startDate: string, date: string, tasksDone: string[]): BalancedTask[] {
  const day = dayNumber(startDate, date)
  const done = new Set(tasksDone)
  return balanced.tasks.filter((t) => t.dueDay <= day && !done.has(t.taskId))
}

/**
 * How many instances of this habit were expected STRICTLY BEFORE `date`.
 * Today is excluded on purpose: an unchecked morning is "on pace", and checking
 * today's box puts you ahead — the Strides pace-line feel. Ramps count: early
 * weeks expect fewer instances.
 */
export function expectedToDate(
  habit: BalancedHabit,
  startDate: string,
  date: string,
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null = null,
): number {
  if (habit.startWeek === null) return 0
  const today = dayNumber(startDate, date)
  let count = 0
  for (let d = (habit.startWeek - 1) * 7; d < today; d++) {
    const iso = new Date(utcMs(startDate) + d * 86_400_000).toISOString().slice(0, 10)
    if (habitDueOnDate(habit, startDate, iso, rampSteps)) count++
  }
  return count
}

/** Blend habit adherence (70%) and one-time task completion (30%) into a goal %. */
export function goalRollup(
  goal: VisionGoalDraft,
  balanced: BalancedPlan,
  progress: VisionProgress,
  date: string,
): VisionGoalRollup {
  const habitIds = new Set(goal.habits.map((h) => h.id))
  const planned = balanced.habits.filter((h) => habitIds.has(h.habitId))

  let expected = 0
  let done = 0
  for (const h of planned) {
    expected += expectedToDate(h, progress.startDate, date, goal.rampSteps)
    done += (progress.completions[h.habitId] ?? []).filter((d) => d <= date).length
  }

  const tasksTotal = goal.tasks.length
  const tasksDone = goal.tasks.filter((t) => progress.tasksDone.includes(t.id)).length

  const adherence = expected > 0 ? Math.min(1, done / expected) : done > 0 ? 1 : 0
  const habitWeight = tasksTotal > 0 ? 0.7 : 1
  const taskPart = tasksTotal > 0 ? tasksDone / tasksTotal : 0
  const percent = Math.round(100 * (habitWeight * adherence + (1 - habitWeight) * taskPart))

  const pace: PacingStatus = done < expected ? "behind" : done > expected ? "ahead" : "on-pace"

  return { goalId: goal.id, done, expected, adherence, tasksDone, tasksTotal, percent, pace }
}

export interface VisionAreaRollup {
  pillarId: string
  pillarLabel: string
  pillarColor: string
  percent: number
  goalCount: number
}

/** Mean of goal percents per life area, in stable pillar order. */
export function areaRollups(goals: VisionGoalDraft[], rollups: VisionGoalRollup[]): VisionAreaRollup[] {
  const byId = new Map(rollups.map((r) => [r.goalId, r]))
  const areas: VisionAreaRollup[] = []
  for (const g of goals) {
    const r = byId.get(g.id)
    if (!r) continue
    let area = areas.find((a) => a.pillarId === g.pillarId)
    if (!area) {
      area = { pillarId: g.pillarId, pillarLabel: g.pillarLabel, pillarColor: g.pillarColor, percent: 0, goalCount: 0 }
      areas.push(area)
    }
    // Running mean, kept exact by de-averaging.
    area.percent = (area.percent * area.goalCount + r.percent) / (area.goalCount + 1)
    area.goalCount++
  }
  for (const a of areas) a.percent = Math.round(a.percent)
  return areas
}

/** One number for the whole vision — the mean of its life areas (equal weight). */
export function visionPercent(areas: VisionAreaRollup[]): number {
  if (!areas.length) return 0
  return Math.round(areas.reduce((s, a) => s + a.percent, 0) / areas.length)
}

// ---------------------------------------------------------------------------
// M11: workout routine designer — named training days on a habit. Slot k of the
// week (the k-th scheduled weekday) runs days[k % days.length], so "Mon Push ·
// Wed Pull · Fri Legs" is stable week to week and survives ramp weeks (a
// 2-day ramp week simply runs the first two days).
// ---------------------------------------------------------------------------

/** Apply a split template to one habit: names its days + adopts the split's frequency. */
export function applyWorkoutSplit(goals: VisionGoalDraft[], goalId: string, habitId: string, split: WorkoutSplit): VisionGoalDraft[] {
  return goals.map((g) => {
    if (g.id !== goalId) return g
    return {
      ...g,
      habits: g.habits.map((h) =>
        h.id === habitId
          ? {
              ...h,
              daysPerWeek: Math.min(7, Math.max(1, split.recommendedPerWeek)),
              routine: { days: split.days.map((name, i) => ({ id: `${habitId}-day-${split.id}-${i}`, name })) },
            }
          : h,
      ),
    }
  })
}

/** The named day this date runs, or null (not due / no routine). */
export function routineDayForDate(
  habit: BalancedHabit,
  routine: HabitRoutine | null | undefined,
  startDate: string,
  date: string,
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null = null,
): RoutineDay | null {
  if (!routine || routine.days.length === 0) return null
  if (!habitDueOnDate(habit, startDate, date, rampSteps)) return null
  const slot = habit.weekdays.indexOf(calWeekday(date))
  if (slot === -1) return null
  return routine.days[slot % routine.days.length]
}

/** "Mon Push · Wed Pull · Fri Legs" — the routine mapped onto the balanced weekdays. */
export function routineWeekPreview(habit: BalancedHabit, routine: HabitRoutine): { weekday: number; dayName: string }[] {
  if (routine.days.length === 0) return []
  return habit.weekdays.map((wd, slot) => ({ weekday: wd, dayName: routine.days[slot % routine.days.length].name }))
}

/** Plain-language ramp summary: "3×/wk for the first 4 weeks, then 5×/wk …". */
export function rampSummary(rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null | undefined): string {
  if (!rampSteps || rampSteps.length === 0) return ""
  const parts = rampSteps.map((r, i) =>
    i === 0 ? `${r.frequencyPerWeek}×/wk for the first ${r.durationWeeks}w` : `then ${r.frequencyPerWeek}×/wk for ${r.durationWeeks}w`,
  )
  return `Starts gentle: ${parts.join(", ")} — your daily list only asks for the current phase.`
}

// ---------------------------------------------------------------------------
// PLM layer (docs/plans/plm-goal-system-vision-plan-lab.md) — timeframe
// horizons, daily vision review, the ordered morning ritual, RPM daily
// planning (3-5 must items + rollover), the Weekly Evaluation Ritual, and the
// Monthly Goals Report. All pure; dates are always passed in, never read.
// ---------------------------------------------------------------------------

/** Add days to an ISO date (UTC math — same convention as the track functions). */
export function addDays(iso: string, days: number): string {
  return new Date(utcMs(iso) + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * M1 — a goal's time horizon (PLM timeframes): habit goals are "now" work;
 * outcome goals classify by days-to-target via the shared horizonService.
 */
export function goalHorizon(goal: Pick<VisionGoalDraft, "type" | "targetDate">, today: string): Horizon {
  if (goal.type === "habit_ramp") return "now"
  return classifyHorizon(
    { primitive: "target", role: "metric", ...(goal.targetDate ? { targetDate: goal.targetDate } : {}) },
    new Date(today + "T00:00:00"),
  )
}

// --- M2: daily vision review ------------------------------------------------

export function visionReviewedOn(progress: VisionProgress, date: string): boolean {
  return (progress.visionReviews ?? []).includes(date)
}

/** Toggle "I've read my vision today" for `date`. */
export function toggleVisionReviewed(progress: VisionProgress, date: string): VisionProgress {
  const reviews = progress.visionReviews ?? []
  return reviews.includes(date)
    ? { ...progress, visionReviews: reviews.filter((d) => d !== date) }
    : { ...progress, visionReviews: [...reviews, date] }
}

// --- M3: the ordered morning ritual ------------------------------------------

/** Build a ritual from a 15/30/60-minute preset (unknown ids are skipped). */
export function ritualFromPreset(preset: 15 | 30 | 60): VisionRitual {
  const byId = new Map(RITUAL_LIBRARY.map((i) => [i.id, i]))
  return {
    items: RITUAL_PRESETS[preset].map((id) => byId.get(id)).filter((i): i is (typeof RITUAL_LIBRARY)[number] => !!i),
    preset,
  }
}

/** Total minutes the ritual asks for each morning. */
export function ritualMinutes(ritual: VisionRitual): number {
  return ritual.items.reduce((s, i) => s + i.minutes, 0)
}

/**
 * Toggle a library step in/out of the ritual (out by id; in appended at the
 * end). Hand edits clear the preset tag. Returns null when the last item is
 * removed — no ritual is a valid state.
 */
export function toggleRitualStep(ritual: VisionRitual | null, item: { id: string; title: string; minutes: number }): VisionRitual | null {
  if (!ritual) return { items: [item], preset: null }
  const has = ritual.items.some((i) => i.id === item.id)
  const items = has ? ritual.items.filter((i) => i.id !== item.id) : [...ritual.items, item]
  return items.length ? { items, preset: null } : null
}

/** Move the ritual step at `index` up (-1) or down (+1); out-of-range is a no-op. */
export function moveRitualStep(ritual: VisionRitual, index: number, dir: -1 | 1): VisionRitual {
  const j = index + dir
  if (index < 0 || index >= ritual.items.length || j < 0 || j >= ritual.items.length) return ritual
  const items = [...ritual.items]
  ;[items[index], items[j]] = [items[j], items[index]]
  return { ...ritual, items, preset: null }
}

export function ritualStepDoneOn(progress: VisionProgress, date: string, itemId: string): boolean {
  return (progress.ritualCompletions?.[date] ?? []).includes(itemId)
}

/** Check/uncheck one ritual step for `date`. */
export function toggleRitualStepDone(progress: VisionProgress, date: string, itemId: string): VisionProgress {
  const all = progress.ritualCompletions ?? {}
  const day = all[date] ?? []
  const next = day.includes(itemId) ? day.filter((i) => i !== itemId) : [...day, itemId]
  return { ...progress, ritualCompletions: { ...all, [date]: next } }
}

/** Ritual adherence over [rangeStart, rangeEnd] inclusive: done steps / (steps × days). */
export function ritualAdherence(
  progress: VisionProgress,
  ritual: VisionRitual,
  rangeStart: string,
  rangeEnd: string,
): { done: number; expected: number; rate: number } {
  const days = dayNumber(rangeStart, rangeEnd) + 1
  if (days <= 0 || ritual.items.length === 0) return { done: 0, expected: 0, rate: 0 }
  const ids = new Set(ritual.items.map((i) => i.id))
  let done = 0
  for (const [date, itemIds] of Object.entries(progress.ritualCompletions ?? {})) {
    if (date < rangeStart || date > rangeEnd) continue
    done += itemIds.filter((i) => ids.has(i)).length
  }
  const expected = ritual.items.length * days
  return { done, expected, rate: expected > 0 ? done / expected : 0 }
}

// --- v10: ritual design method + weekly matrix + toolkit counters -------------

/** Matrix rituals due on `date`: weekly by weekday, bi-weekly on alternating
 * anchor weeks, monthly by day-of-month (weekday ignored for those). */
export function dueWeeklyRituals(ritual: VisionRitual | null, date: string): VisionWeeklyRitual[] {
  if (!ritual?.weekly) return []
  const wd = calWeekday(date)
  const dom = Number(date.slice(8, 10))
  const evenWeek = Math.floor(dayNumber("2024-01-01", date) / 7) % 2 === 0
  return ritual.weekly.filter((w) =>
    w.monthlyDay != null ? w.monthlyDay === dom : w.weekday === wd && (!w.everyOtherWeek || evenWeek),
  )
}

/** 1-based day of the 30-day install challenge, capped at 30; null without a
 * build date or before it. */
export function installDay(ritual: VisionRitual | null, today: string): number | null {
  if (!ritual?.builtAt) return null
  const d = dayNumber(ritual.builtAt, today) + 1
  return d < 1 ? null : Math.min(30, d)
}

/** True once the ritual is ~30 days old — time to rotate something ("the
 * library is a menu, not a checklist"). */
export function rotationDue(ritual: VisionRitual | null, today: string): boolean {
  return !!ritual?.builtAt && dayNumber(ritual.builtAt, today) >= 30
}

/** Mind/body/spirit coverage of the assembled ritual (library steps only —
 * custom steps are unclassified). */
export function ritualCoverage(ritual: VisionRitual | null, dimensions: Record<string, "mind" | "body" | "spirit">): { mind: boolean; body: boolean; spirit: boolean } {
  const out = { mind: false, body: false, spirit: false }
  for (const item of ritual?.items ?? []) {
    const d = dimensions[item.id]
    if (d) out[d] = true
  }
  return out
}

/**
 * Materialize the latest review's scheduled outcomes onto `today`'s could-do
 * list when their weekday matches. Only fires during the week the outcomes
 * were committed FOR (days 7-13 after the reviewed week's start). Idempotent:
 * ids embed the review week + index, and existing ids are never re-added.
 */
export function materializeOutcomes(progress: VisionProgress, today: string): VisionProgress {
  const reviews = [...(progress.weeklyReviews ?? [])].sort((a, b) => a.weekStart.localeCompare(b.weekStart))
  const latest = reviews[reviews.length - 1]
  if (!latest?.outcomes?.length) return progress
  const offset = dayNumber(latest.weekStart, today)
  if (offset < 7 || offset > 13) return progress
  const wd = calWeekday(today)
  const due = latest.outcomes
    .map((o, i) => ({ o, id: `out-${latest.weekStart}-${i}` }))
    .filter(({ o }) => o.weekday === wd)
  if (due.length === 0) return progress
  const plan = dayPlanFor(progress, today)
  const have = new Set(plan.adhoc.map((a) => a.id))
  const added = due.filter(({ id }) => !have.has(id))
  if (added.length === 0) return progress
  return withDayPlan(progress, today, {
    ...plan,
    adhoc: [...plan.adhoc, ...added.map(({ o, id }) => ({ id, title: o.outcome, done: false }))],
  })
}

/** 1-based day of a 30-day one-day-at-a-time counter (uncapped — day 31+ means
 * the habit is broken and the counter can retire). */
export function counterDay(counter: { startDate: string }, today: string): number {
  return dayNumber(counter.startDate, today) + 1
}

// --- M4: RPM daily planning — 3-5 must items + ad-hoc could-dos + rollover ----

/** RPM's 80/20 cap: at most this many starred "must items" per day. */
export const MAX_MUST_ITEMS = 5

export function dayPlanFor(progress: VisionProgress, date: string): VisionDayPlan {
  return progress.dayPlans?.[date] ?? { mustIds: [], adhoc: [] }
}

function withDayPlan(progress: VisionProgress, date: string, plan: VisionDayPlan): VisionProgress {
  return { ...progress, dayPlans: { ...(progress.dayPlans ?? {}), [date]: plan } }
}

/** Star/unstar an item (habit, task or ad-hoc id) as one of today's musts.
 * Starring beyond MAX_MUST_ITEMS is rejected (returns progress unchanged). */
export function toggleMustItem(progress: VisionProgress, date: string, id: string): VisionProgress {
  const plan = dayPlanFor(progress, date)
  if (plan.mustIds.includes(id)) return withDayPlan(progress, date, { ...plan, mustIds: plan.mustIds.filter((m) => m !== id) })
  if (plan.mustIds.length >= MAX_MUST_ITEMS) return progress
  return withDayPlan(progress, date, { ...plan, mustIds: [...plan.mustIds, id] })
}

/** Add a free-text could-do item to `date`. Ids embed their origin date so
 * rolled-over items stay identifiable and rollover stays idempotent. */
export function addAdhocItem(progress: VisionProgress, date: string, title: string): VisionProgress {
  const t = title.trim()
  if (!t) return progress
  const plan = dayPlanFor(progress, date)
  const seq = plan.adhoc.filter((a) => a.id.startsWith(`adhoc-${date}-`)).length
  return withDayPlan(progress, date, { ...plan, adhoc: [...plan.adhoc, { id: `adhoc-${date}-${seq}`, title: t, done: false }] })
}

export function toggleAdhocItem(progress: VisionProgress, date: string, id: string): VisionProgress {
  const plan = dayPlanFor(progress, date)
  return withDayPlan(progress, date, { ...plan, adhoc: plan.adhoc.map((a) => (a.id === id ? { ...a, done: !a.done } : a)) })
}

/** v9 — set/clear TODAY'S fresh reason for one RPM area block. Re-deriving the
 * reason daily is the conditioning; yesterday's reason never carries over. */
export function setBlockReason(progress: VisionProgress, date: string, pillarId: string, text: string): VisionProgress {
  const plan = dayPlanFor(progress, date)
  const t = text.trim()
  const next = { ...(plan.blockReasons ?? {}) }
  if (t) next[pillarId] = t
  else delete next[pillarId]
  return withDayPlan(progress, date, { ...plan, blockReasons: next })
}

/** v9 — log a dated numeric reading for a milestone goal's measure (upserts
 * the day's value; one reading per goal per day). */
export function logMeasure(progress: VisionProgress, goalId: string, date: string, value: number): VisionProgress {
  if (!Number.isFinite(value)) return progress
  const all = progress.measureLogs ?? {}
  const rest = (all[goalId] ?? []).filter((l) => l.date !== date)
  const logs = [...rest, { date, value }].sort((a, b) => a.date.localeCompare(b.date))
  return { ...progress, measureLogs: { ...all, [goalId]: logs } }
}

/** v9 — the most recent reading at or before `date`, or null. */
export function latestMeasure(progress: VisionProgress, goalId: string, date: string): { date: string; value: number } | null {
  const logs = (progress.measureLogs?.[goalId] ?? []).filter((l) => l.date <= date)
  return logs.length ? logs[logs.length - 1] : null
}

/** v9 — run-rate for a milestone goal: fraction of the measure covered vs the
 * fraction of time elapsed toward targetDate. Null when the goal has no
 * measure, no reading, or no dated window to pace against. */
export function measureRunRate(
  goal: Pick<VisionGoalDraft, "measure" | "targetDate">,
  progress: VisionProgress,
  goalId: string,
  today: string,
): { current: number; donePct: number; timePct: number } | null {
  if (!goal.measure || !goal.targetDate) return null
  const reading = latestMeasure(progress, goalId, today)
  if (!reading) return null
  const span = goal.measure.target - goal.measure.start
  if (span === 0) return null
  const donePct = Math.max(0, Math.min(1, (reading.value - goal.measure.start) / span))
  const totalDays = dayNumber(progress.startDate, goal.targetDate)
  if (totalDays <= 0) return null
  const timePct = Math.max(0, Math.min(1, dayNumber(progress.startDate, today) / totalDays))
  return { current: reading.value, donePct, timePct }
}

/** v14 — his delegation pass removes an item from the plate entirely
 * ("now I've taken it off my plate"): drop an ad-hoc item from `date`. */
export function removeAdhocItem(progress: VisionProgress, date: string, id: string): VisionProgress {
  const plan = dayPlanFor(progress, date)
  if (!plan.adhoc.some((a) => a.id === id)) return progress
  return withDayPlan(progress, date, {
    ...plan,
    adhoc: plan.adhoc.filter((a) => a.id !== id),
    mustIds: plan.mustIds.filter((m) => m !== id),
  })
}

/** An ad-hoc item's origin date (embedded in its id) — for "from yesterday" badges. */
export function adhocOriginDate(id: string): string | null {
  const m = /^adhoc-(\d{4}-\d{2}-\d{2})-/.exec(id)
  return m ? m[1] : null
}

/**
 * RPM rollover: copy `fromDate`'s UNDONE ad-hoc items onto `toDate` (same id,
 * so repeat calls and chains never duplicate). Done items stay behind. Returns
 * the same progress object when there's nothing to roll.
 */
export function rolloverAdhoc(progress: VisionProgress, fromDate: string, toDate: string): VisionProgress {
  const from = progress.dayPlans?.[fromDate]
  if (!from) return progress
  const to = dayPlanFor(progress, toDate)
  const have = new Set(to.adhoc.map((a) => a.id))
  const rolled = from.adhoc.filter((a) => !a.done && !have.has(a.id))
  if (rolled.length === 0) return progress
  return withDayPlan(progress, toDate, { ...to, adhoc: [...to.adhoc, ...rolled.map((a) => ({ ...a }))] })
}

// --- M5: Weekly Evaluation Ritual ---------------------------------------------

/** Inclusive window of plan week `weekIndex` (1-based, anchored on startDate). */
export function weekWindow(startDate: string, weekIndex: number): { start: string; end: string } {
  const start = addDays(startDate, (weekIndex - 1) * 7)
  return { start, end: addDays(start, 6) }
}

/** How many FULL plan weeks have elapsed by `today` (day 7 → 1). */
export function completedWeeks(startDate: string, today: string): number {
  return Math.max(0, Math.floor(dayNumber(startDate, today) / 7))
}

/** The most recent completed week that has no review yet, or null. */
export function reviewDue(progress: VisionProgress, today: string): { weekIndex: number; start: string; end: string } | null {
  const weeks = completedWeeks(progress.startDate, today)
  if (weeks < 1) return null
  const win = weekWindow(progress.startDate, weeks)
  const reviewed = (progress.weeklyReviews ?? []).some((r) => r.weekStart === win.start)
  return reviewed ? null : { weekIndex: weeks, ...win }
}

/** The most recent review STRICTLY BEFORE `weekStart` — powers "last week you
 * were a 4" (Stefan: compare against previous weeks, aim one point higher). */
export function lastRatingsBefore(progress: VisionProgress, weekStart: string): Record<string, number> | null {
  const prior = (progress.weeklyReviews ?? [])
    .filter((r) => r.weekStart < weekStart)
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
  return prior.length ? prior[prior.length - 1].areaRatings : null
}

/** Upsert a weekly review by weekStart (newest kept last, stable order). */
export function saveWeeklyReview(progress: VisionProgress, review: VisionWeeklyReview): VisionProgress {
  const reviews = progress.weeklyReviews ?? []
  const idx = reviews.findIndex((r) => r.weekStart === review.weekStart)
  const next = idx === -1 ? [...reviews, review] : reviews.map((r, i) => (i === idx ? review : r))
  return { ...progress, weeklyReviews: next }
}

/** Expected habit instances within [rangeStart, rangeEnd] INCLUSIVE (unlike
 * expectedToDate, which excludes today — reviews always look at finished days). */
export function expectedInRange(
  habit: BalancedHabit,
  startDate: string,
  rangeStart: string,
  rangeEnd: string,
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null = null,
): number {
  if (habit.startWeek === null) return 0
  const from = Math.max(0, dayNumber(startDate, rangeStart))
  const to = dayNumber(startDate, rangeEnd)
  let count = 0
  for (let d = from; d <= to; d++) {
    if (habitDueOnDate(habit, startDate, addDays(startDate, d), rampSteps)) count++
  }
  return count
}

/** goalRollup over a date window: habit checks + tasks that came due inside it. */
export function goalRollupRange(
  goal: VisionGoalDraft,
  balanced: BalancedPlan,
  progress: VisionProgress,
  rangeStart: string,
  rangeEnd: string,
): VisionGoalRollup {
  const habitIds = new Set(goal.habits.map((h) => h.id))
  const planned = balanced.habits.filter((h) => habitIds.has(h.habitId))

  let expected = 0
  let done = 0
  for (const h of planned) {
    expected += expectedInRange(h, progress.startDate, rangeStart, rangeEnd, goal.rampSteps)
    done += (progress.completions[h.habitId] ?? []).filter((d) => d >= rangeStart && d <= rangeEnd).length
  }

  const endDay = dayNumber(progress.startDate, rangeEnd)
  const startDay = dayNumber(progress.startDate, rangeStart)
  const dueTasks = balanced.tasks.filter((t) => t.goalId === goal.id && t.dueDay >= startDay && t.dueDay <= endDay)
  const tasksTotal = dueTasks.length
  const tasksDone = dueTasks.filter((t) => progress.tasksDone.includes(t.taskId)).length

  const adherence = expected > 0 ? Math.min(1, done / expected) : done > 0 ? 1 : 0
  const habitWeight = tasksTotal > 0 ? 0.7 : 1
  const taskPart = tasksTotal > 0 ? tasksDone / tasksTotal : 0
  const percent = Math.round(100 * (habitWeight * adherence + (1 - habitWeight) * taskPart))
  const pace: PacingStatus = done < expected ? "behind" : done > expected ? "ahead" : "on-pace"

  return { goalId: goal.id, done, expected, adherence, tasksDone, tasksTotal, percent, pace }
}

// --- M6: Monthly Goals Report --------------------------------------------------

export interface VisionMonthlyReport {
  /** "YYYY-MM" the report covers. */
  month: string
  /** Actual inclusive window reported (clamped to plan start and yesterday). */
  rangeStart: string
  rangeEnd: string
  perGoal: Array<{ goalId: string; title: string; pillarLabel: string; pillarColor: string; rollup: VisionGoalRollup }>
  areas: VisionAreaRollup[]
  /** Null when no ritual is set up. */
  ritual: { done: number; expected: number; rate: number } | null
  /** Share of days in range the vision was reviewed (0-1). */
  visionReviewRate: number
  /** Weekly Evaluation ratings whose week starts inside the month (avg 1-10). */
  weeklyRatings: Array<{ weekStart: string; avg: number }>
}

/** "YYYY-MM" months from the plan's start month through today's month. */
export function monthOptions(startDate: string, today: string): string[] {
  const out: string[] = []
  let [y, m] = startDate.slice(0, 7).split("-").map(Number)
  const end = today.slice(0, 7)
  for (let i = 0; i < 120; i++) {
    const cur = `${y}-${String(m).padStart(2, "0")}`
    out.push(cur)
    if (cur === end) break
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}

/** Last day of a "YYYY-MM" month as ISO. */
function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

/** Shared range core for the monthly and yearly reports. `label` becomes the
 * report's `month` field ("YYYY-MM" or "YYYY"); ratings filter by prefix. */
function buildRangeReport(
  goals: VisionGoalDraft[],
  balanced: BalancedPlan,
  progress: VisionProgress,
  ritual: VisionRitual | null,
  label: string,
  periodStart: string,
  periodEnd: string,
  today: string,
): VisionMonthlyReport {
  const rangeStart = periodStart > progress.startDate ? periodStart : progress.startDate
  const yesterday = addDays(today, -1)
  const rangeEnd = periodEnd < yesterday ? periodEnd : yesterday
  const empty = rangeEnd < rangeStart

  const rollups = empty
    ? goals.map((g) => ({ goalId: g.id, done: 0, expected: 0, adherence: 0, tasksDone: 0, tasksTotal: 0, percent: 0, pace: "on-pace" as PacingStatus }))
    : goals.map((g) => goalRollupRange(g, balanced, progress, rangeStart, rangeEnd))

  const days = empty ? 0 : dayNumber(rangeStart, rangeEnd) + 1
  const reviewsInRange = (progress.visionReviews ?? []).filter((d) => d >= rangeStart && d <= rangeEnd).length

  return {
    month: label,
    rangeStart,
    rangeEnd,
    perGoal: goals.map((g, i) => ({ goalId: g.id, title: g.title, pillarLabel: g.pillarLabel, pillarColor: g.pillarColor, rollup: rollups[i] })),
    areas: areaRollups(goals, rollups),
    ritual: ritual && !empty ? ritualAdherence(progress, ritual, rangeStart, rangeEnd) : null,
    visionReviewRate: days > 0 ? reviewsInRange / days : 0,
    weeklyRatings: (progress.weeklyReviews ?? [])
      .filter((r) => r.weekStart.startsWith(label.length === 4 ? `${label}-` : label))
      .map((r) => {
        const vals = Object.values(r.areaRatings)
        return { weekStart: r.weekStart, avg: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0 }
      }),
  }
}

/**
 * The deterministic Monthly Goals Report (PLM). Reports finished days only:
 * the window is [max(month start, plan start), min(month end, yesterday)] —
 * an empty window yields a zeroed report, never throws.
 */
export function monthlyReport(
  goals: VisionGoalDraft[],
  balanced: BalancedPlan,
  progress: VisionProgress,
  ritual: VisionRitual | null,
  month: string,
  today: string,
): VisionMonthlyReport {
  return buildRangeReport(goals, balanced, progress, ritual, month, `${month}-01`, monthEnd(month), today)
}

/** M6 — the Year In Review: same shape as the monthly report over a whole year
 * ("acknowledge successes first, then failures and lessons" is a render rule). */
export function yearReport(
  goals: VisionGoalDraft[],
  balanced: BalancedPlan,
  progress: VisionProgress,
  ritual: VisionRitual | null,
  year: string,
  today: string,
): VisionMonthlyReport {
  return buildRangeReport(goals, balanced, progress, ritual, year, `${year}-01-01`, `${year}-12-31`, today)
}

/** Request schema for the optional LLM coach commentary on a monthly report. */
export const VisionReportRequestSchema = z.object({
  vision: z.string().min(3).max(2000),
  report: z.object({}).passthrough(),
})
export type VisionReportRequest = z.infer<typeof VisionReportRequestSchema>

export function buildReportCommentaryPrompt(vision: string, report: VisionMonthlyReport): string {
  return `You are a direct, warm goal-setting coach reviewing a member's monthly goals report.

THEIR VISION (their own words): "${vision}"

THEIR MONTH IN NUMBERS (JSON — done/expected are habit check-ins; pace is vs schedule; ratings are 1-10 weekly self-scores per life area):
${JSON.stringify(report, null, 2)}

Write a short monthly review (120-200 words, plain text, no markdown, no lists) IN THE CEREMONY ORDER — this order is the method, don't reorder it:
1. WINS FIRST: open by naming what they actually made happen — specific goals by name. Let them feel it; don't rush past it, and don't be hard on them.
2. THEN the misses: for each slipped goal, state the likely reason as something they control (95% solution, 5% problem), and propose ONE fix framed as a nameable system (a recurring slot or rule, e.g. "Money Tuesday"), never as "try harder".
3. Close with ONE concrete focus for next month, tied to their vision.
Be honest about weak numbers; never invent data that isn't in the report.`
}

/** Fail-closed parse of the commentary: plain non-empty text, length-capped. */
export function parseReportCommentary(raw: string): string {
  const text = stripFences(raw).trim()
  if (!text) throw new Error("LLM returned no commentary")
  return text.length > 4000 ? `${text.slice(0, 4000)}…` : text
}

// ---------------------------------------------------------------------------
// PLM OS (docs/plans/life-mastery-os.md) — M0-M6 pure logic: SMART sentences
// with belief calibration, evening reflections, touch-every-area, re-baseline
// nudges, and the report verdict taxonomy.
// ---------------------------------------------------------------------------

/** Stefan's belief rule: a goal under 7/10 belief should be shrunk, not forced. */
export const BELIEF_SWEET_SPOT = 7

/** M3 — default affirmation sentence for a goal ("I will easily…", editable).
 * Never "I want"; presupposes achievement; "at least" sets a floor. */
export function buildSmartSentence(goal: Pick<VisionGoalDraft, "title" | "type" | "measure" | "targetDate" | "habits"> & Partial<Pick<VisionGoalDraft, "why" | "feeling">>): string {
  const by = goal.targetDate ? ` by ${goal.targetDate}` : ""
  // v9 — his template bakes the purpose INTO the sentence: "…at least [N] to
  // [purpose] creating [feeling] by [date]". Only short whys inline.
  const whyTrim = (goal.why ?? "").trim().replace(/\.+$/, "")
  const purposeOnly = whyTrim && whyTrim.length <= 90 ? ` to ${whyTrim.charAt(0).toLowerCase()}${whyTrim.slice(1)}` : ""
  const feelTrim = (goal.feeling ?? "").trim().replace(/\.+$/, "")
  const purpose = purposeOnly + (feelTrim ? ` creating ${feelTrim.charAt(0).toLowerCase()}${feelTrim.slice(1)}` : "")
  if (goal.type === "milestone_ladder" && goal.measure) {
    return `I will easily reach at least ${goal.measure.target} ${goal.measure.unit} (from ${goal.measure.start})${purpose}${by}.`
  }
  const h = goal.habits[0]
  const t = goal.title.trim().replace(/\.+$/, "")
  // Titles keep their own casing ("Sunday call home"), and clauses never
  // duplicate the title: frequency is dropped when the title already states
  // one, and the identity clause avoids echoing who-I-am titles.
  const freqInTitle = /\b(every|daily|weekly|each|per week)\b/i.test(t)
  const identityInTitle = /who i am/i.test(t)
  const freq = h && !freqInTitle ? ` — showing up ${h.daysPerWeek}×/week` : ""
  const tail = identityInTitle ? " until it runs on its own" : " until it's simply who I am"
  return h
    ? `I will easily follow through on "${t}"${freq}${tail}${purpose}${by}.`
    : `I will easily ${t.charAt(0).toLowerCase() + t.slice(1)}${purpose}${by}.`
}

// --- M5: evening reflection ---------------------------------------------------

export function eveningReflectionFor(progress: VisionProgress, date: string): VisionEveningReflection {
  return progress.eveningReflections?.[date] ?? { amazing: "", better: "" }
}

export function saveEveningReflection(progress: VisionProgress, date: string, patch: Partial<VisionEveningReflection>): VisionProgress {
  const cur = eveningReflectionFor(progress, date)
  return { ...progress, eveningReflections: { ...(progress.eveningReflections ?? {}), [date]: { ...cur, ...patch } } }
}

// --- M4: touch-every-area + re-baseline ----------------------------------------

/** Blueprint areas that saw at least one habit check-in during the window
 * (via each goal's pillar). Untouched areas violate "do something each week
 * to grow every area". */
export function areasTouchedInWeek(
  goals: VisionGoalDraft[],
  progress: VisionProgress,
  rangeStart: string,
  rangeEnd: string,
): Set<string> {
  const activeGoals = goals.filter((g) =>
    g.habits.some((h) => (progress.completions[h.id] ?? []).some((d) => d >= rangeStart && d <= rangeEnd)),
  )
  return new Set(
    LIFE_MASTERY_AREAS.filter((a) => activeGoals.some((g) => goalFeedsArea(g, a.id))).map((a) => a.id),
  )
}

/** M2 — "there's never a 10": true when the area's last `weeks` reviews all
 * rated ≥ `level` — time to expand what your 10 means. */
export function rebaselineDue(progress: VisionProgress, areaId: string, level = 9, weeks = 2): boolean {
  const rated = (progress.weeklyReviews ?? [])
    .filter((r) => r.areaRatings[areaId] != null)
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
  if (rated.length < weeks) return false
  return rated.slice(-weeks).every((r) => r.areaRatings[areaId] >= level)
}

// --- M6: report verdicts --------------------------------------------------------

/** Pace-based suggestion for a goal's report verdict — the user confirms/edits.
 * Heuristic only: the sandbox tracks check-ins, not measure attainment. */
export function suggestVerdict(goal: Pick<VisionGoalDraft, "targetDate">, rollup: VisionGoalRollup, today: string): VisionGoalVerdict {
  if (rollup.expected > 0 && rollup.done >= rollup.expected * 1.5) return "over-achieved"
  if (rollup.expected === 0 && rollup.done === 0 && rollup.tasksDone === 0) return "not-started"
  if (goal.targetDate && goal.targetDate < today) return rollup.pace === "behind" ? "rescheduled" : "achieved"
  if (rollup.pace === "behind") return "likely-miss"
  return "on-track"
}

export function verdictsFor(progress: VisionProgress, period: string): Record<string, VisionVerdictEntry> {
  return progress.reportVerdicts?.[period] ?? {}
}

// ---------------------------------------------------------------------------
// PLM OS v2 — history, streaks and guided actions ("you want to go back over
// previous weeks" — the spreadsheet layer; "check the box every day" — chains).
// ---------------------------------------------------------------------------

/** One area's rating history across all weekly reviews, oldest first. */
export function areaRatingSeries(progress: VisionProgress, areaId: string): Array<{ weekStart: string; rating: number }> {
  return (progress.weeklyReviews ?? [])
    .filter((r) => r.areaRatings[areaId] != null)
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
    .map((r) => ({ weekStart: r.weekStart, rating: r.areaRatings[areaId] }))
}

/** Whole-wheel average per review, oldest first. */
export function wheelAvgSeries(progress: VisionProgress): Array<{ weekStart: string; avg: number }> {
  return (progress.weeklyReviews ?? [])
    .slice()
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
    .map((r) => {
      const vals = Object.values(r.areaRatings)
      return { weekStart: r.weekStart, avg: vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0 }
    })
}

/** Consecutive-day streak over a date list, counting back from today
 * (an unchecked today doesn't break it — same grace as the pace line). */
export function dayStreak(dates: string[] | undefined, today: string): number {
  const set = new Set(dates ?? [])
  let streak = 0
  let d = set.has(today) ? today : addDays(today, -1)
  while (set.has(d)) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

/** Consecutive days on which EVERY ritual step was checked ("perfect mornings"). */
export function ritualPerfectStreak(progress: VisionProgress, ritual: VisionRitual | null, today: string): number {
  if (!ritual || ritual.items.length === 0) return 0
  const perfect = (date: string) => ritual.items.every((i) => (progress.ritualCompletions?.[date] ?? []).includes(i.id))
  let streak = 0
  let d = perfect(today) ? today : addDays(today, -1)
  while (d >= progress.startDate && perfect(d)) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

/** Consecutive completed DUE instances of a habit, walking back from today.
 * Non-due days don't break the chain; today's unchecked due day gets grace. */
export function habitStreak(
  habit: BalancedHabit,
  rampSteps: { frequencyPerWeek: number; durationWeeks: number }[] | null | undefined,
  progress: VisionProgress,
  today: string,
): number {
  const comps = new Set(progress.completions[habit.habitId] ?? [])
  let streak = 0
  let d = today
  if (habitDueOnDate(habit, progress.startDate, d, rampSteps ?? null) && !comps.has(d)) d = addDays(d, -1)
  while (dayNumber(progress.startDate, d) >= 0) {
    if (habitDueOnDate(habit, progress.startDate, d, rampSteps ?? null)) {
      if (!comps.has(d)) break
      streak++
    }
    d = addDays(d, -1)
  }
  return streak
}

/** 1-based plan-week index containing `date`. */
export function weekIndexFor(startDate: string, date: string): number {
  return Math.floor(Math.max(0, dayNumber(startDate, date)) / 7) + 1
}

/** One guided next step — rendered in the header badge and deep-linked. */
export interface PendingAction {
  id: string
  label: string
  mode: "create" | "track" | "lifeplan"
  /** DOM anchor id of the section the action lives in. */
  anchor: string
}

export interface PendingActionInput {
  committedAt: string | null
  values: string[]
  awayValues?: string[]
  drivingForce: { purpose: string; reasons: string[]; identity: string[] } | null
  yourTens: Record<string, string>
  areaPlans?: Record<string, { name?: string; purpose?: string; identity?: string }>
  focusAreaIds?: string[]
  ritual: VisionRitual | null
  goals: VisionGoalDraft[] | null
  progress: VisionProgress | null
  confirmed: boolean
  today: string
}

/**
 * The guided path: everything Stefan's sequence says should exist but doesn't
 * yet, in HIS order (commit → values → purpose → goals calibrated → 10s →
 * ritual), followed by today's due rhythms. Powers the "N next actions" badge.
 */
export function pendingActions(input: PendingActionInput): PendingAction[] {
  const out: PendingAction[] = []
  const { committedAt, values, awayValues, drivingForce, yourTens, areaPlans, focusAreaIds, ritual, goals, progress, confirmed, today } = input

  if (!committedAt) out.push({ id: "commit", label: "Commit to mastery", mode: "create", anchor: "lm-foundation" })
  else if (values.length < 3) out.push({ id: "values", label: "Do the values exercise", mode: "create", anchor: "lm-foundation" })
  else if (!awayValues || awayValues.length === 0)
    out.push({ id: "away", label: "Name what you're running from — your away-from values", mode: "create", anchor: "lm-foundation" })
  if (goals && goals.length > 0) {
    if (!drivingForce?.purpose.trim()) out.push({ id: "purpose", label: "Write your purpose — the why behind the vision", mode: "create", anchor: "lm-driving-force" })
    const unrated = goals.filter((g) => g.beliefLevel == null || g.desireLevel == null).length
    if (unrated > 0) out.push({ id: "belief", label: `Rate belief & desire on ${unrated} goal${unrated === 1 ? "" : "s"}`, mode: "create", anchor: "lm-goals" })
    const lowBelief = goals.filter(
      (g) => (g.beliefLevel != null && g.beliefLevel < BELIEF_SWEET_SPOT) || (g.desireLevel != null && g.desireLevel < BELIEF_SWEET_SPOT),
    ).length
    if (lowBelief > 0) out.push({ id: "shrink", label: `Reshape ${lowBelief} goal${lowBelief === 1 ? "" : "s"} under the 7/7 gate`, mode: "create", anchor: "lm-goals" })
    if (!focusAreaIds || focusAreaIds.length === 0)
      out.push({ id: "focus", label: "Pick your 1-3 focus areas for this season", mode: "create", anchor: "lm-focus" })
    const needsSplit = goals.some(
      (g) => g.pillarId === "health" && g.habits.some((h) => !h.routine && /workout|strength|gym|train|lift/i.test(h.title)),
    )
    if (needsSplit) out.push({ id: "split", label: "Choose a workout split", mode: "create", anchor: "lm-goals" })
    const tensDefined = LIFE_MASTERY_AREAS.filter((a) => (yourTens[a.id] ?? "").trim()).length
    if (tensDefined < LIFE_MASTERY_AREAS.length)
      out.push({ id: "tens", label: `Write your 10 in every room (${tensDefined}/${LIFE_MASTERY_AREAS.length})`, mode: "create", anchor: "lm-vision" })
    // v3 — the Life Plan rule: EVERY area gets goals and a why.
    const emptyAreas = LIFE_MASTERY_AREAS.filter((a) => !goals.some((g) => goalFeedsArea(g, a.id))).length
    if (emptyAreas > 0)
      out.push({ id: "area-goals", label: `Set a goal in every area — ${emptyAreas} area${emptyAreas === 1 ? " has" : "s have"} none`, mode: "lifeplan", anchor: "lm-lifeplan" })
    const noPurpose = LIFE_MASTERY_AREAS.filter((a) => !(areaPlans?.[a.id]?.purpose ?? "").trim()).length
    if (noPurpose > 0 && noPurpose < LIFE_MASTERY_AREAS.length)
      out.push({ id: "area-purpose", label: `Write the why for ${noPurpose} more area${noPurpose === 1 ? "" : "s"}`, mode: "lifeplan", anchor: "lm-lifeplan" })
    else if (noPurpose === LIFE_MASTERY_AREAS.length)
      out.push({ id: "area-purpose", label: "Write a why for each life area", mode: "lifeplan", anchor: "lm-lifeplan" })
    if (!ritual) out.push({ id: "ritual", label: "Design your morning ritual", mode: "create", anchor: "lm-ritual-builder" })
  }
  if (confirmed && progress) {
    if (reviewDue(progress, today)) out.push({ id: "weekly", label: "Do your weekly evaluation", mode: "track", anchor: "lm-weekly" })
    if (!visionReviewedOn(progress, today)) out.push({ id: "read", label: "Read your driving force", mode: "track", anchor: "lm-driving-card" })
    const rebase = LIFE_MASTERY_AREAS.filter((a) => rebaselineDue(progress, a.id))
    if (rebase.length > 0)
      out.push({ id: "rebaseline", label: `Rewrite your 10 for ${rebase.map((a) => a.label).join(", ")}`, mode: "create", anchor: "lm-tens" })
  }
  return out
}

/** Upsert one goal's confirmed verdict for a report period ("YYYY-MM" or "YYYY"). */
export function saveVerdict(progress: VisionProgress, period: string, goalId: string, entry: VisionVerdictEntry): VisionProgress {
  const all = progress.reportVerdicts ?? {}
  return { ...progress, reportVerdicts: { ...all, [period]: { ...(all[period] ?? {}), [goalId]: entry } } }
}

// ---------------------------------------------------------------------------
// PLM v3 — the Life Plan: user-authored goals PER AREA ("I have a vision and
// SMART goals for each area of my life"). Pure constructor; the caller keeps
// priorityIds/areaOrder in sync exactly like routine-library picks.
// ---------------------------------------------------------------------------

export interface AreaGoalInput {
  areaId: string
  title: string
  type: VisionGoalType
  why: string
  /** Steady-state habit frequency. Ignored when `rampSteps` is given. */
  daysPerWeek?: number
  /** Required for milestone_ladder; must be absent for achievement. */
  measure?: VisionMeasure | null
  targetDate?: string | null
  /** v17 — a real ramp: 1-8 phases run in order. Omit ⇒ one steady phase. */
  rampSteps?: HabitRampStep[] | null
  /** v17 — achievement rungs, stored as tasks so they reuse tasksDone. */
  checkpoints?: Array<{ title: string; dueOffsetDays: number }>
  /** v17 — downstream goals this one feeds; validated against existingIds. */
  feedsGoalIds?: string[]
  /** v17 — the soft qualification answers. */
  whoItServes?: string | null
  unlocks?: string | null
  firstStep?: string | null
}

/** v17 — validate a ramp the user (or the composer) authored. Fail-closed. */
function assertRampSteps(steps: HabitRampStep[]): void {
  if (steps.length < 1 || steps.length > 8) {
    throw new Error(`A ramp needs 1-8 phases, got ${steps.length}`)
  }
  let weeks = 0
  steps.forEach((s, i) => {
    if (!Number.isInteger(s.frequencyPerWeek) || s.frequencyPerWeek < 1 || s.frequencyPerWeek > 30) {
      throw new Error(`Phase ${i + 1}: frequency must be a whole number 1-30`)
    }
    if (!Number.isInteger(s.durationWeeks) || s.durationWeeks < 1 || s.durationWeeks > 52) {
      throw new Error(`Phase ${i + 1}: duration must be a whole number of weeks, 1-52`)
    }
    weeks += s.durationWeeks
  })
  if (weeks > 104) throw new Error(`A ramp can't run longer than two years (got ${weeks} weeks)`)
}

/** Build a Life Plan goal for one Blueprint area. Fail-closed on bad input;
 * ids are collision-checked against `existingIds`. */
export function createAreaGoal(input: AreaGoalInput, existingIds: string[]): VisionGoalDraft {
  const area = LIFE_MASTERY_AREA_MAP.get(input.areaId)
  if (!area) throw new Error(`Unknown Blueprint area "${input.areaId}"`)
  const pillar = PILLARS.find((p) => p.id === area.pillarIds[0])
  if (!pillar) throw new Error(`Area "${area.id}" names unknown pillar "${area.pillarIds[0]}"`)
  const title = input.title.trim()
  if (!title) throw new Error("A goal needs a title")
  if (input.type === "milestone_ladder") {
    if (!input.measure) throw new Error("A milestone goal needs a measure")
    if (input.measure.target === input.measure.start) throw new Error("Zero-range measure")
  }
  if (input.type === "achievement" && input.measure) {
    throw new Error("An achievement is binary — it can't carry a measure")
  }
  if (input.rampSteps) assertRampSteps(input.rampSteps)
  const known = new Set(existingIds)
  for (const to of input.feedsGoalIds ?? []) {
    if (!known.has(to)) throw new Error(`Unknown goal id "${to}"`)
  }
  // The ramp is the source of truth for cadence when present. habits[0] takes
  // the LAST phase's frequency — balancePlan sizes weekly capacity off
  // habit.daysPerWeek, and the binding constraint is steady state, not week 1.
  // Seeding from the first phase would over-admit habits and blow the cap once
  // the ramp tops out.
  const steady = input.rampSteps?.[input.rampSteps.length - 1]?.frequencyPerWeek ?? input.daysPerWeek ?? 3
  const days = Math.min(7, Math.max(1, Math.floor(steady)))
  const taken = new Set(existingIds)
  let n = 0
  while (taken.has(`lp-${area.id}-g${n}`)) n++
  const id = `lp-${area.id}-g${n}`
  const rampSteps = input.rampSteps
    ?? (input.type === "habit_ramp" ? [{ frequencyPerWeek: days, durationWeeks: 4 }] : null)
  return {
    id,
    title,
    pillarId: pillar.id,
    pillarLabel: pillar.label,
    pillarColor: pillar.color,
    objectiveId: null,
    objectiveLabel: null,
    type: input.type,
    why: input.why.trim() || `Because ${area.label.toLowerCase()} is part of the life I said I want.`,
    sourceIntentIds: [],
    habits: [{
      id: `${id}-h0`,
      title: input.type === "habit_ramp" ? title : `Work toward: ${title}`,
      daysPerWeek: days,
      sourceTargetId: null,
    }],
    // An achievement's rungs are named checkpoints, not numbers — as tasks they
    // reuse progress.tasksDone and need no new track math.
    tasks: (input.checkpoints ?? []).map((c, i) => ({
      id: `${id}-t${i}`,
      title: c.title,
      dueOffsetDays: c.dueOffsetDays,
    })),
    measure: input.type === "milestone_ladder" ? input.measure ?? null : null,
    rampSteps,
    targetDate: input.targetDate ?? null,
    areaId: area.id,
    beliefLevel: null,
    painWhy: null,
    smartSentence: null,
    ...(input.feedsGoalIds?.length ? { feedsGoalIds: [...input.feedsGoalIds] } : {}),
    ...(input.whoItServes ? { whoItServes: input.whoItServes } : {}),
    ...(input.unlocks ? { unlocks: input.unlocks } : {}),
    ...(input.firstStep ? { firstStep: input.firstStep } : {}),
  }
}

/** v17 — verbs that name a thing you either did or didn't do. */
const ACHIEVEMENT_VERBS = [
  "get", "achieve", "earn", "win", "land", "pass", "launch", "publish", "ship",
  "finish", "complete", "graduate", "qualify", "obtain", "buy", "move", "quit",
  "marry", "hit", "reach", "become",
]

/** v17 — named achievements that carry no natural unit. */
const NAMED_ACHIEVEMENTS = [
  "muscle up", "muscle-up", "pull up", "pull-up", "chin up", "chin-up",
  "handstand", "marathon", "ironman", "driver's licence", "driver's license",
  "drivers licence", "drivers license", "black belt", "phd", "degree",
  "certification", "passport", "mortgage", "six pack", "six-pack", "splits",
]

/** v17 — units we can name confidently from the verb, so "run 10k" is 10 km
 * and "make 10k" is $10,000 rather than both being "10 reps". */
const DISTANCE_VERBS = /\b(run|cycle|bike|swim|walk|ride|row)\b/i
const MONEY_VERBS = /\b(earn|make|save|invest|bank|raise|bill|charge)\b/i

/**
 * Turn one line of natural text into a goal shape. The rule the user can feel:
 * a frequency ("4×/week") is a PRACTICE, a number is a TARGET you climb to, and
 * a thing you either do or don't ("first muscle-up") is an ACHIEVEMENT. Pure;
 * the caller supplies today so it's testable and resume-safe.
 *
 * Rules run in order, first match wins — the order is what makes it predictable.
 */
export function classifyGoalInput(raw: string, todayISO: string): { title: string; type: VisionGoalType; why: string; daysPerWeek: number; measure: VisionMeasure | null; targetDate: string | null } {
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  const text = raw.trim().replace(/\s+/g, " ")
  const lower = text.toLowerCase()

  // R1 — an explicit cadence is always a practice. Runs first so "buy
  // groceries every week" is a habit, not an achievement in disguise.
  const freq = text.match(/(\d+)\s*(?:×|x|times?)\s*(?:\/|per|a|each)?\s*(?:wk|weeks?|w)\b/i)
    ?? text.match(/(\d+)\s*days?\s*(?:a|per|each)\s*week\b/i)
  const daily = /\b(daily|every ?day|every (?:morning|evening|night)|each day)\b/i.test(text)
  const weekly = /\bevery (?:week|other week)\b/i.test(text)
  if (freq || daily || weekly) {
    const days = daily ? 7 : freq ? Math.min(7, Math.max(1, Number(freq[1]))) : 1
    const title =
      text
        .replace(/[,–-]?\s*\d+\s*(?:×|x|times?)\s*(?:\/|per|a|each)?\s*(?:wk|weeks?|w)\b/i, "")
        .replace(/[,–-]?\s*\d+\s*days?\s*(?:a|per|each)\s*week\b/i, "")
        .replace(/\b(daily|every ?day|every (?:morning|evening|night)|each day)\b/i, "")
        .replace(/\bevery (?:week|other week)\b/i, "")
        .replace(/\s+/g, " ")
        .trim() || text
    return { title: cap(title), type: "habit_ramp", why: "", daysPerWeek: days, measure: null, targetDate: null }
  }

  // R2 — a gradable comparative ("get better at guitar") is an ongoing
  // practice, not a finish line, even though it starts with an achievement
  // verb. Skips R3 entirely.
  const comparative = /\b(better|fitter|stronger|healthier|happier|leaner|calmer|sharper|more \w+)\b/i.test(text)

  const numMatch = text.match(/(?<![\w.])(\d+(?:\.\d+)?)\s*(k|m)?\b/i)
  // Ordinals and bare years are never measures: "my 1st marathon", "the 2026 goal".
  const numIsOrdinal = !!numMatch && /^(1st|2nd|3rd|\d+th)/i.test(text.slice(numMatch.index ?? 0))
  const numIsYear = !!numMatch && !numMatch[2] && /^(19|20)\d{2}$/.test(numMatch[1])
  const usableNum = numMatch && !numIsOrdinal && !numIsYear ? numMatch : null

  const buildMeasure = (m: RegExpMatchArray): VisionMeasure => {
    const suffix = m[2] ?? ""
    const idx = m.index ?? 0
    const after = text.slice(idx + m[0].length).trim().split(/\s+/)[0] ?? ""
    const before = text.slice(0, idx).trim().split(/\s+/).pop() ?? ""
    const isDistance = DISTANCE_VERBS.test(text)
    // In "run 10k" the k IS the unit (kilometres) — scaling it to 10,000 would
    // turn a 10 km run into a quarter of the way round the planet. In "earn
    // 10k" the same suffix is a multiplier. The verb is what disambiguates.
    const kIsUnit = isDistance && /^k$/i.test(suffix)
    let target = Number(m[1])
    if (!kIsUnit) {
      if (/k/i.test(suffix)) target *= 1000
      if (/m/i.test(suffix)) target *= 1_000_000
    }
    let unit = ""
    if (isDistance) unit = kIsUnit ? "km" : (after || "km")
    else if (MONEY_VERBS.test(text)) unit = "$"
    if (!unit) {
      unit = (/^[a-z%$/€£-]+$/i.test(after) && after) || (/^[a-z%$/€£-]+$/i.test(before) && before) || "reps"
    }
    return { unit, start: 0, target: target || 1, steps: 5 }
  }

  if (!comparative) {
    const firstWord = lower.split(/\s+/)[0] ?? ""
    const hasVerb = ACHIEVEMENT_VERBS.includes(firstWord)
    const hasOrdinal = /\b(my )?first\b|\b1st\b/i.test(text)
    const hasNamed = NAMED_ACHIEVEMENTS.some((n) => lower.includes(n))
    if (hasVerb || hasOrdinal || hasNamed) {
      // R3b — "under 4 hours" is a DESCENDING target. Every measure we build
      // hardcodes start: 0, so a descending ladder would climb the wrong way.
      // Rather than invent a start we don't know, keep it binary: you either
      // ran it under four hours or you didn't.
      const descending = /\b(under|sub|below|less than|within)\b/i.test(text)
      // R3a — an achievement verb WITH an ascending count is a real ladder
      // ("publish 3 articles", "earn 100k").
      if (usableNum && !descending) {
        return { title: cap(text), type: "milestone_ladder", why: "", daysPerWeek: 3, measure: buildMeasure(usableNum), targetDate: addDays(todayISO, 365) }
      }
      return { title: cap(text), type: "achievement", why: "", daysPerWeek: 3, measure: null, targetDate: addDays(todayISO, 365) }
    }
  }

  // R4 — a bare number is a target you climb to.
  if (usableNum) {
    return { title: cap(text), type: "milestone_ladder", why: "", daysPerWeek: 3, measure: buildMeasure(usableNum), targetDate: addDays(todayISO, 365) }
  }

  // R5 — everything else is a practice. One tap flips it.
  return { title: cap(text), type: "habit_ramp", why: "", daysPerWeek: 3, measure: null, targetDate: null }
}
