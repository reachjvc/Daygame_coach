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
import { LIFE_MASTERY_AREAS, LIFE_MASTERY_AREA_MAP, goalFeedsArea, goalAreaId } from "./data/lifeMasteryAreas"
import { VEHICLE_CONVERSIONS } from "./data/valuesFramework"
import { INTAKE_PAGES, questionsForPage } from "./data/lifeMasteryIntake"
import type { IntakePageId, IntakeQuestion } from "./data/lifeMasteryIntake"
import type { IntakeMatches, TextSpan } from "./intakeService"
import type {
  BalanceOpts,
  BalancedHabit,
  BalancedPlan,
  BalancedTask,
  BalancedWeek,
  GoalListParse,
  GoalListRow,
  GoalReading,
  GoalRoute,
  HabitRampStep,
  HabitRoutine,
  MilestoneLadderConfig,
  PacingStatus,
  RoutineCategory,
  RoutineDay,
  RoutineTemplate,
  WorkoutSplit,
  VisionAreaPlan,
  VisionDayPlan,
  VisionDrivingForce,
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
  /**
   * v25 — the room suggestion tray, which is now re-drafted repeatedly: once
   * from the 10, then again every time the user writes a goal of their own.
   * `have` is everything already in that room (goals + what is sitting in the
   * tray) so the model can't hand back what the user already wrote; `anchor` is
   * the line that triggered this draft, so the batch leans on it. Absent for a
   * whole-plan build, which is a different job with different rules.
   */
  suggestFor: z
    .object({
      anchor: z.string().min(1).max(160).nullable(),
      have: z.array(z.string().min(1).max(160)).max(60),
    })
    .optional(),
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

/**
 * v25 — the block that turns a plan build into a tray refill. It has to
 * override rule 1 outright: "one goal per genuine ask" is right when the whole
 * plan is being drafted and wrong here, where the asks are already goals and
 * what's wanted is the next moves. Empty string when the caller isn't the tray.
 */
function trayBlock(req: VisionPlanRequest): string {
  const s = req.suggestFor
  if (!s) return ""
  const have = s.have.length
    ? `\nALREADY IN THIS ROOM (the user wrote these — a suggestion that repeats, re-words or narrowly restates any of them is a failed suggestion):\n${s.have.map((t) => `- ${t}`).join("\n")}\n`
    : ""
  const anchor = s.anchor
    ? `\nTHE LINE THEY JUST WROTE: "${s.anchor}" — lead with the moves that make THAT one happen: its drivers, its prerequisites, the rung after it.\n`
    : ""
  return `
SUGGESTION-TRAY MODE — this call is NOT a plan build, and it OVERRIDES rule 1. The user is working inside one room and wants more moves to choose from. Do not write one goal per want, and never restate a want they have already turned into a goal.
${have}${anchor}
Propose 3-5 goals for this room, every one clearly different from anything listed above and plainly connected to the user's own words. They land in a tray the user picks from, so a suggestion they don't take costs nothing — but a duplicate of what they already have is noise.
`
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
${trayBlock(req)}
Respond with STRICT JSON only — no markdown, no commentary:
{"goals":[{"title":"...","pillarId":"...","objectiveId":"..." or null,"type":"habit_ramp"|"milestone_ladder"|"achievement","why":"...","sourceIntentIds":["intent-0"],"habits":[{"title":"...","daysPerWeek":3,"basedOnTargetId":"tgt id or null"}],"tasks":[{"title":"...","dueOffsetDays":7}],"measure":{"unit":"...","start":0,"target":100,"steps":5} or null,"rampSteps":[{"frequencyPerWeek":3,"durationWeeks":4}] or null,"targetDate":"2027-06-30" or null}]}`
}

/**
 * v25 — tray de-duplication, client side. The prompt asks for no repeats, but
 * the tray is now re-drafted on every goal the user adds, so the same move WILL
 * come back worded differently sooner or later. Compared on a normalised title:
 * case, punctuation and doubled spaces are noise; the words are the goal.
 */
export function normalizeGoalTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/** Drop drafts already present in `have` (the room's goals + the standing tray)
 * and drafts that repeat each other. Pure, so "nothing new came back" is a
 * testable outcome rather than something only an LLM call can produce. */
export function dropDuplicateSuggestions<T extends { title: string }>(drafts: T[], have: string[]): T[] {
  const seen = new Set(have.map(normalizeGoalTitle).filter(Boolean))
  const kept: T[] = []
  for (const d of drafts) {
    const key = normalizeGoalTitle(d.title)
    if (!key || seen.has(key)) continue
    seen.add(key)
    kept.push(d)
  }
  return kept
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
      // v24 — every goal carries an explicit area. Without this the coverage
      // maths falls back to pillar fan-out and lights rooms the user never fed.
      areaId: goalAreaId({ pillarId: pillar.id }),
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
  // v23 — refine RESHAPES the plan of a goal; it must not silently delete the
  // user's own work on it. `parseGoalGenResponse` never emits the qualification
  // layer, so spreading its output used to wipe every hand-written field:
  // up to 150 reasons, belief and desire ratings, the pain-why, the reward, the
  // stake, the pre-mortem, the feeling, the affirmation sentence — and `areaId`,
  // whose loss silently re-routed the goal to a different Blueprint area. One
  // "make it calisthenics" cost all of it, with no warning. Everything the user
  // authored is carried over; only the decomposition is replaced.
  //
  // `type` is pinned too: the refine prompt only offers habit_ramp and
  // milestone_ladder, so an `achievement` goal would come back as a ladder with
  // an invented measure.
  const keepsType = g.type === existing.type
  return {
    ...g,
    id: existing.id,
    targetDate: existing.targetDate ?? null,
    habits: g.habits.map((h, i) => ({ ...h, id: `${existing.id}-h${idSeed}-${i}` })),
    tasks: g.tasks.map((t, i) => ({ ...t, id: `${existing.id}-t${idSeed}-${i}` })),
    ...(existing.type === "achievement" && !keepsType ? { type: existing.type, measure: null } : {}),
    // The user's qualification layer, preserved verbatim.
    areaId: existing.areaId ?? null,
    smartSentence: existing.smartSentence ?? null,
    beliefLevel: existing.beliefLevel ?? null,
    desireLevel: existing.desireLevel ?? null,
    painWhy: existing.painWhy ?? null,
    reward: existing.reward ?? null,
    stake: existing.stake ?? null,
    obstacles: existing.obstacles ?? null,
    feeling: existing.feeling ?? null,
    ...(existing.reasonsList?.length ? { reasonsList: existing.reasonsList } : {}),
    ...(existing.feedsGoalIds?.length ? { feedsGoalIds: existing.feedsGoalIds } : {}),
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
    placeholder: z.boolean().optional(),
  })).min(1),
  tasks: z.array(z.object({ id: z.string(), title: z.string().min(1), dueOffsetDays: z.number().int().min(0) })),
  measure: z.object({
    unit: z.string(), start: z.number(), target: z.number(),
    steps: z.number().int().min(2).max(12),
    protocol: z.string().max(40).optional(),
  }).nullable(),
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
  // v17 — the goal graph.
  feedsGoalIds: z.array(z.string()).max(12).optional(),
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
  verdict: z.enum(["achieved", "on-track", "over-achieved", "likely-miss", "not-started", "modified", "cancelled", "rescheduled", "pushed", "reshaped", "displaced", "paused", "deferred-by-choice"]),
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
  // v23 — the weekly review's in-progress draft. The form is the largest block
  // of writing in the product and was component-local, so navigating away mid
  // review threw it all away. Saved on every change, cleared when the review
  // itself is saved. Only ONE draft: an unfinished review from a past week is
  // still the review you were writing.
  weeklyDraft: z.object({
    weekStart: z.string().regex(ISO_DATE),
    areaRatings: z.record(z.string(), z.number().int().min(0).max(10)),
    note: z.string().max(2000).optional(),
    focusPillarId: z.string().nullable().optional(),
    magicMoment: z.string().max(1000).optional(),
    accomplishment: z.string().max(1000).optional(),
    lesson: z.string().max(1000).optional(),
    challenge: z.string().max(1000).optional(),
    outcomes: z.array(z.object({
      areaId: z.string(),
      outcome: z.string().max(300),
      why: z.string().max(500),
      weekday: z.number().int().min(0).max(6).optional(),
    })).max(3).optional(),
    captures: z.array(z.object({ text: z.string().max(300), areaId: z.string().nullable() })).max(50).optional(),
    savedAt: z.string().regex(ISO_DATE),
  }).optional(),
  // v23 — the last date the user opened the daily loop, so roll-over can cover
  // every day they were away instead of only yesterday.
  lastSeen: z.string().regex(ISO_DATE).optional(),
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
  // v23 — the raw vision prose as typed, when it differs from the ANALYSED
  // `vision` above. The Guide's vision textarea writes this; without it, prose
  // written after the first goal existed was dropped on every reload.
  visionDraft: z.string().max(20000).optional(),
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
    // v23 — the question the primary question REPLACED. Without it the user can
    // never see what they were rewriting away from, which is the whole point of
    // the exercise.
    primaryQuestionOld: z.string().max(300).optional(),
    // v23 — the mission's three parts kept separately, so "rewrite it" can put
    // them back in the boxes instead of demanding all three be retyped.
    missionParts: z.object({
      name: z.string().max(80),
      be: z.string().max(200),
      doGive: z.string().max(200),
    }).optional(),
  }).optional(),
  yourTens: z.record(z.string(), z.string().max(1000)).optional(),
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
  // v19 — the season's area ranking; focusAreaIds is its top slice.
  areaRank: z.array(z.string()).max(24).optional(),
  // v20 — single vs partnered, so the relationship area shows the right
  // toolkit. "unset" = never asked; we don't assume.
  relationshipStatus: z.enum(["single", "partnered", "unset"]).optional(),
  // v21 — belief work + the raw brainstorm list.
  beliefs: z.array(z.object({
    id: z.string().min(1),
    old: z.string().min(1).max(300),
    replacement: z.string().max(300).optional(),
    useful: z.boolean().optional(),
    evidence: z.array(z.string().min(1).max(300)).max(30).optional(),
    references: z.array(z.string().regex(ISO_DATE)).max(400).optional(),
    startedAt: z.string().regex(ISO_DATE).optional(),
  })).max(40).optional(),
  rawWants: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1).max(300),
    years: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10), z.literal(20)]).nullable(),
    circled: z.boolean(),
  })).max(300).optional(),
  // v20 — approach-ladder reps, keyed by rung level.
  approachReps: z.record(z.string(), z.number().int().min(0).max(9999)).optional(),
  // v20 — the guided build: which sessions are finished, and the year debrief
  // (the only session whose output has no existing home).
  guideDone: z.array(z.string()).max(20).optional(),
  yearDebrief: z.object({
    good: z.array(z.string().min(1).max(300)).max(30),
    challenges: z.array(z.string().min(1).max(300)).max(30),
    lessons: z.array(z.string().min(1).max(300)).max(30),
  }).optional(),
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
  // v23 — the rules exercise is CATCH the old rule, then rewrite it. Only the
  // rewrite was ever kept, so half the exercise was discarded the moment you
  // picked a different value. `valueRules` stays the rendered list (daily card,
  // incantations, copy artifact); this is the worksheet behind it.
  ruleWork: z.array(z.object({
    id: z.string().min(1),
    value: z.string().min(1).max(60),
    old: z.string().max(300),
    rewritten: z.string().max(300).optional(),
  })).max(60).optional(),
  // v23 — the morning-ritual audit ("write out your current morning, mark each
  // act empowering or draining"). It was a local-state worksheet: 6-10 lines
  // typed and lost on navigation, and the draining acts are exactly what the
  // designed ritual is supposed to replace, so they need to survive next to it.
  ritualAudit: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1).max(200),
    mark: z.enum(["up", "down"]).nullable(),
  })).max(40).optional(),
  // v23 — the approach-session debrief. Five inputs that had no `onChange` at
  // all: React never saw a keystroke, so the text died on any re-render. It is
  // the only artifact in the relationship room that produces learning.
  sessionJournals: z.array(z.object({
    id: z.string().min(1),
    date: z.string().regex(ISO_DATE),
    reps: z.string().max(120),
    body: z.string().max(1000),
    felt: z.string().max(1000),
    her: z.string().max(1000),
    next: z.string().max(1000),
  })).max(200).optional(),
  customAreas: z.array(z.object({ id: z.string().min(1), label: z.string().min(1).max(60), color: z.string().min(1).max(20) })).max(12).optional(),
  wheelWants: z.array(z.object({ id: z.string().min(1), areaId: z.string().min(1), text: z.string().min(1).max(200) })).max(36).optional(),
  baselineRatings: z.record(z.string(), z.number().min(0).max(10)).optional(),
  // v17 — when each baseline rating was set, so the first weekly review knows
  // how stale it is; and the life-wide affirmations list.
  baselineRatedAt: z.record(z.string(), z.string().regex(ISO_DATE)).optional(),
  affirmations: z.array(z.string().min(1).max(300)).max(100).optional(),
  areaScope: z.record(z.string(), z.enum(["deep", "sketched", "later"])).optional(),
  // v25 — the sequential intake. `intakeSeen` is the reveal trail: a question id
  // lands here when it is answered and when it is waved past with "I'm not sure
  // yet". Cap is generous because the trail is one short id per question.
  intakeSeen: z.array(z.string().min(1).max(60)).max(200).optional(),
  // v25 — your 0 per area, the pair of yourTens. Same shape and cap.
  yourZeros: z.record(z.string(), z.string().max(1000)).optional(),
  // v25 — the Perfect Day write-up. Same cap as the vision draft; it is prose of
  // the same kind. The goal qualification stack is NOT mirrored here: desire,
  // reward, stake, obstacles and pain-why already live on VisionGoalDraft.
  perfectDay: z.string().max(20000).optional(),
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
    // v24 — legacy goals predate the one-taxonomy rule; give them the area
    // their pillar primarily maps to rather than letting them feed nothing.
    const areaId = goalAreaId(g)
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
      areaId,
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

/**
 * v20 — which rung of the approach ladder is live, given reps logged per rung.
 * Progression gates on REPS, not on feeling ready — his rule. Returns the
 * highest rung whose predecessors are all satisfied.
 */
export function approachRung(
  reps: Record<string, number> | undefined,
  ladder: Array<{ level: number; repsToAdvance: number }>,
): number {
  const r = reps ?? {}
  for (const rung of ladder) {
    if (rung.repsToAdvance === 0) return rung.level
    if ((r[String(rung.level)] ?? 0) < rung.repsToAdvance) return rung.level
  }
  return ladder[ladder.length - 1]?.level ?? 1
}

// ---------------------------------------------------------------------------
// v21 — COURSE CORRECTION, BELIEF WORK, AND THE DIVERGENT PHASE.
// ---------------------------------------------------------------------------

/** The moves he makes on a goal that's behind, IN ORDER. Dropping is last, and
 * he names the trap himself: changing a goal is also the dabbler's escape
 * hatch. Hence the guard-rail question on every move past the first. */
export interface CorrectionMove {
  id: "approach" | "push" | "reshape" | "displace" | "drop"
  title: string
  ask: string
  /** The verdict this move records, if any. */
  verdict: VisionGoalVerdict | null
  /** True when the user must answer the strategic-vs-excitement question first. */
  needsGuardRail: boolean
}

export const CORRECTION_MOVES: CorrectionMove[] = [
  { id: "approach", title: "Change the approach", verdict: "on-track", needsGuardRail: false,
    ask: "Keep the goal and the date. What would you do differently? \u201cKeep changing your approach until you get what you want.\u201d" },
  { id: "push", title: "Push the deadline", verdict: "pushed", needsGuardRail: true,
    ask: "Same goal, later date \u2014 three to six months out, rather than calling it a miss." },
  { id: "reshape", title: "Reshape it", verdict: "reshaped", needsGuardRail: true,
    ask: "Same intent, different container \u2014 a year-long habit becomes a 30-day challenge." },
  { id: "displace", title: "Displace it", verdict: "displaced", needsGuardRail: true,
    ask: "Something else took its place. Name what displaced it \u2014 if you can't, this is a drop." },
  { id: "drop", title: "Let it go", verdict: "deferred-by-choice", needsGuardRail: true,
    ask: "Deliberately, not by default: \u201cI could have achieved it but I decided not to.\u201d That's a choice, not a failure." },
]

/** His guard-rail. Flexibility is good; dabbling wears its clothes. */
export const CORRECTION_GUARD_RAIL = {
  question: "Be honest: is this a strategic reason, or did you just lose the excitement?",
  strategic: "Strategic, something changed",
  lostIt: "I lost the excitement",
  /** What to show when they admit it's the second one. */
  lostItAdvice: "Then look at the goal's WHY before you change the goal. Losing excitement usually means the reasons were thin. Run the reasons drill first.",
  quote: "flexibility is a good thing but you got to be careful with it",
  videoId: "TRGRznrMSec",
}

/** The bi-weekly after-action check-in — his cleanest ready-made question set. */
export const BIWEEKLY_CHECKIN = [
  "Are you on track?",
  "Are you making progress?",
  "Are you behind?",
  "What changes do you need to make, if any?",
]

/** Is a bi-weekly check-in due? Every 14 days from the plan's start. */
export function biweeklyCheckinDue(startDate: string, today: string): boolean {
  const d = dayNumber(startDate, today)
  return d > 0 && d % 14 === 0
}

/** v21 — how many days into the 30-60 day conditioning window a belief is, and
 * whether it has cleared the minimum. Null when no replacement is written yet. */
export function beliefConditioning(
  belief: { replacement?: string; startedAt?: string; references?: string[] },
  today: string,
): { day: number; references: number; installed: boolean } | null {
  if (!belief.replacement || !belief.startedAt) return null
  const day = Math.max(0, dayNumber(belief.startedAt, today))
  const references = belief.references?.length ?? 0
  return { day, references, installed: day >= 30 && references >= 10 }
}

/** v21 — the horizon numbering pass over a raw brainstorm. He literally writes
 * a number beside each line: 1, 3, 5, 10 or 20 years. */
export const HORIZON_YEARS = [1, 3, 5, 10, 20] as const
export type HorizonYears = (typeof HORIZON_YEARS)[number]

/**
 * v21 — the 80/20 cut. He applies it TWICE: once to choose which goals make the
 * year, then again to the actions inside them. Returns the suggested keep count
 * for a list — a fifth, floored at 1, and never more than his stated 15-20.
 */
export function paretoKeepCount(total: number): number {
  if (total <= 0) return 0
  return Math.min(20, Math.max(1, Math.round(total * 0.2)))
}

/** Wants tagged for this year and circled — the output of the divergent phase. */
export function circledThisYear(
  wants: Array<{ years: number | null; circled: boolean; text: string; id: string }> | undefined,
): Array<{ id: string; text: string }> {
  return (wants ?? []).filter((w) => w.circled && w.years === 1).map((w) => ({ id: w.id, text: w.text }))
}

// ---------------------------------------------------------------------------
// v20 — THE GUIDED BUILD. His order of operations, one exercise at a time.
// He always starts ABOVE the areas and derives them: vision -> purpose ->
// identity -> conduct -> areas -> per-area -> goals. Our flow starts inside a
// room, which is fine once you know the method and wrong when you don't. The
// Guide is the teaching path; the normal flow stays fully usable beside it.
// ---------------------------------------------------------------------------

export type GuideSessionId =
  | "state" | "debrief" | "vision" | "driving" | "areas" | "rooms"
  | "brainstorm" | "qualify" | "chunk" | "rituals" | "commit"

export interface GuideSession {
  id: GuideSessionId
  /** Short label for the rail. */
  title: string
  /** The question the session actually asks. */
  ask: string
  /** Why it sits HERE in the order — his words, paraphrased into our voice. */
  why: string
  /** Roughly how long, so the rail can warn about doing too much at once. */
  minutes: number
  /** True when the session writes nothing — a gate or a prompt only. */
  gateOnly?: boolean
}

/** His sequence. Order is load-bearing: he states the dependencies explicitly
 * ("what is my ultimate vision for each of these areas even before I get into
 * the goals"; "the step before this is you got to know what is your 10"). */
export const GUIDE_SESSIONS: GuideSession[] = [
  { id: "state", title: "Get in state", minutes: 5, gateOnly: true,
    ask: "Stand up, shake out, breathe. Are you somewhere you can think?",
    why: "This is the first step, before any of the work. In a bad state the answers don't come." },
  { id: "debrief", title: "Debrief the year", minutes: 20,
    ask: "What was all the good? Then the challenges. Then what you learned.",
    why: "Good strictly first, and no \u201cbut\u201d \u2014 saying it cheapens the win. Do this before setting anything new." },
  { id: "vision", title: "Your vision", minutes: 45,
    ask: "Write the life you want, present tense, no limits. Then read it aloud.",
    why: "The most important first step in managing a life. If it doesn't give you goosebumps read aloud, it isn't done." },
  { id: "driving", title: "Purpose, identity, conduct", minutes: 30,
    ask: "Why are you here? Who are you? What are your standards?",
    why: "Three separate documents, in this order, immediately after the vision \u2014 not after the goals." },
  { id: "areas", title: "Your areas", minutes: 15,
    ask: "Which areas does your vision imply? Rename each one so it pulls.",
    why: "Areas come FROM the vision, not from a fixed list. And the name matters: \u201cphysical power\u201d beats \u201cfitness\u201d." },
  { id: "rooms", title: "Room by room", minutes: 40,
    ask: "For each area that matters: what does a 10 look like, where are you today, why does it matter, who are you here?",
    why: "The 10 comes before the score. Without a 10 there is nothing to measure against. This is where the vision becomes per-area." },
  { id: "brainstorm", title: "Brainstorm & cut", minutes: 30,
    ask: "Dump everything you want, unfiltered. Then mark each one 1/3/5/10/20 years and circle this year's.",
    why: "Divergent before convergent. Without a raw list there is nothing for 80/20 to cut." },
  { id: "qualify", title: "Qualify each goal", minutes: 30,
    ask: "For each: the sentence, belief and desire, the why and the pain-why, the reward and the stake.",
    why: "Belief AND desire both 7+ or reshape it. A goal you don't believe is a wish." },
  { id: "chunk", title: "Chunk it down", minutes: 15,
    ask: "Break each one-year goal into 90 days, then 30.",
    why: "Every yearly goal breaks into 90-day and monthly targets, with the arithmetic done." },
  { id: "rituals", title: "Rituals & the week", minutes: 20,
    ask: "Design the morning, then size the week honestly.",
    why: "How you start the day decides the day. And a plan that doesn't fit the week won't survive it." },
  { id: "commit", title: "Commit", minutes: 10,
    ask: "Sign it, and start.",
    why: "Set-and-forget is the most common failure. Signing starts the loop; it doesn't end the work." },
]

export const guideSession = (id: GuideSessionId): GuideSession | undefined =>
  GUIDE_SESSIONS.find((s) => s.id === id)

export interface GuideProgress {
  /** Sessions completed, in the order they were finished. */
  done: GuideSessionId[]
  /** The session the rail should offer next, or null when the build is done. */
  next: GuideSessionId | null
  /** Completed / total. */
  doneCount: number
  total: number
  /** Minutes of work left if they did everything remaining in one sitting.
   * The rail uses this to suggest stopping — the dosage guidance. */
  minutesLeft: number
  /** How long the NEXT session takes. v24: this, not the four-hour total, is
   * what a blank slate should be shown. */
  nextMinutes: number
}

/**
 * v20 — where the user is in the guided build. Sessions are OPTIONAL and
 * skippable, so "next" is simply the first not-yet-done session in his order:
 * skipping one doesn't strand you, and doing them out of order is allowed.
 */
/** v24 — what a session's output looks like in the saved plan. The Guide used
 * to be a manual checklist, so it announced "0 of 10 done" over a plan with a
 * vision, goals, values, an identity and a signed manifesto. A session is done
 * when its OUTPUT EXISTS, whether it was produced here or in the plan screens. */
export type GuideEvidence = Partial<{
  vision: string
  yearDebrief: { good: string[]; challenges: string[]; lessons: string[] }
  drivingForce: VisionDrivingForce | null
  areaPlans: Record<string, VisionAreaPlan>
  rawWants: Array<{ circled: boolean }>
  goals: ReadonlyArray<{ beliefLevel?: number | null; desireLevel?: number | null; tasks?: readonly unknown[]; rampSteps?: readonly unknown[] | null }>
  ritual: VisionRitual | null
  committedAt: string | null
}>

/** Did this session's work happen, anywhere in the product? */
export function guideSessionSatisfied(id: GuideSessionId, e: GuideEvidence): boolean {
  const d = e.yearDebrief
  switch (id) {
    // A gate with no output — only an explicit tick can mark it.
    case "state": return false
    case "debrief": return (d?.good.length ?? 0) > 0
    case "vision": return (e.vision ?? "").trim().length > 0
    case "driving": return !!e.drivingForce && ((e.drivingForce.purpose ?? "").trim().length > 0 || e.drivingForce.identity.length > 0)
    case "areas": return Object.values(e.areaPlans ?? {}).some((a) => (a.name ?? "").trim() || (a.purpose ?? "").trim() || (a.identity ?? "").trim())
    case "brainstorm": return (e.rawWants ?? []).length > 0
    case "qualify": return (e.goals ?? []).some((g) => (g.beliefLevel ?? 0) >= 1 && (g.desireLevel ?? 0) >= 1)
    case "chunk": return (e.goals ?? []).some((g) => (g.tasks?.length ?? 0) > 0 || (g.rampSteps?.length ?? 0) > 1)
    case "rituals": return (e.ritual?.items.length ?? 0) > 0
    case "commit": return !!e.committedAt
    default: return false
  }
}

export function guideProgress(done: string[] | undefined, evidence: GuideEvidence = {}): GuideProgress {
  // Ticked by hand OR evidenced by the plan itself.
  const set = new Set([
    ...(done ?? []),
    ...GUIDE_SESSIONS.filter((s) => guideSessionSatisfied(s.id, evidence)).map((s) => s.id),
  ])
  const ordered = GUIDE_SESSIONS.filter((s) => set.has(s.id)).map((s) => s.id)
  const next = GUIDE_SESSIONS.find((s) => !set.has(s.id))?.id ?? null
  const remaining = GUIDE_SESSIONS.filter((s) => !set.has(s.id))
  return {
    done: ordered,
    next,
    doneCount: ordered.length,
    total: GUIDE_SESSIONS.length,
    minutesLeft: remaining.reduce((n, s) => n + s.minutes, 0),
    nextMinutes: remaining[0]?.minutes ?? 0,
  }
}

/**
 * The dosage rule: several sessions in one sitting is already a lot.
 *
 * v24 — this used to fire on REMAINING work, so a blank slate was greeted with
 * "that's over two hours left, do a couple and come back" before it had done
 * anything: a warning about volume, addressed to someone who had not started,
 * sitting under a line that said 260 minutes. Two different numbers for the
 * same quantity, and an instruction to stop aimed at someone at zero.
 *
 * It now fires on work COMPLETED — which is the thing the dosage rule is
 * actually about — and only once enough is behind you for stopping to be real
 * advice.
 */
export const GUIDE_SITTING_SESSIONS = 3

export function guideSittingWarning(p: GuideProgress): string | null {
  if (p.next === null) return null
  if (p.doneCount < GUIDE_SITTING_SESSIONS) return null
  return `That's ${p.doneCount} in one sitting — a lot of thinking. This keeps: stop here and come back to the rest.`
}

/**
 * v23 — which sessions the PLAN ITSELF proves are done.
 *
 * The rail used to count clicks on "Mark done, next", so a user with a full,
 * signed plan was still told "0 of 11 done · about 4 hours left" — the product
 * refusing to read work it was already storing. Completion is now evidence of
 * the artifact each session exists to produce; the manual list stays as an
 * override, so skipping and marking-done by hand both still work.
 *
 * `state` is a structural subset of VisionPlanState, so callers pass the live
 * sandbox without a cast.
 */
export function derivedGuideDone(state: {
  vision?: string
  yearDebrief?: { good: string[] } | null
  drivingForce?: { purpose: string; identity: string[] } | null
  areaPlans?: Record<string, { name?: string } | undefined> | null
  yourTens?: Record<string, string> | null
  rawWants?: Array<{ circled: boolean }> | null
  goals?: Array<{ beliefLevel?: number | null; desireLevel?: number | null; milestones?: unknown[] | null }> | null
  ritual?: unknown
  committedAt?: string | null
}): GuideSessionId[] {
  const done: GuideSessionId[] = []
  const goals = state.goals ?? []
  // "state" is a gate that produces no artifact — only an explicit mark ends it.
  if ((state.yearDebrief?.good?.length ?? 0) > 0) done.push("debrief")
  if ((state.vision ?? "").trim()) done.push("vision")
  if ((state.drivingForce?.purpose ?? "").trim() && (state.drivingForce?.identity?.length ?? 0) > 0) done.push("driving")
  if (Object.values(state.areaPlans ?? {}).some((p) => (p?.name ?? "").trim())) done.push("areas")
  if (Object.values(state.yourTens ?? {}).some((t) => (t ?? "").trim())) done.push("rooms")
  if ((state.rawWants ?? []).some((w) => w.circled)) done.push("brainstorm")
  if (goals.length > 0 && goals.every((g) => g.beliefLevel != null && g.desireLevel != null)) done.push("qualify")
  if (goals.length > 0 && goals.every((g) => (g.milestones?.length ?? 0) > 0)) done.push("chunk")
  if (state.ritual) done.push("rituals")
  if (state.committedAt) done.push("commit")
  return done
}

/** The rail's completion set: what the plan proves, plus what was hand-marked. */
export function guideDoneSet(
  manual: string[] | undefined,
  state: Parameters<typeof derivedGuideDone>[0],
): string[] {
  return [...new Set([...(manual ?? []), ...derivedGuideDone(state)])]
}

// ---------------------------------------------------------------------------
// v19 — AREA PRIORITISATION. He works 1-3 areas at a time and lets the rest
// slide on purpose ("one or two or three core areas that I'm really focusing on
// at a time"). The product had two overlapping ways to say that — a flat <=3
// focus set and a deep/sketched/later scope — so this replaces both with ONE
// ordered ranking. Focus and maintenance are TIERS OF THE RANK, not new state.
// ---------------------------------------------------------------------------

/** How many of the top-ranked areas may be in focus at once. His number. */
export const MAX_FOCUS_AREAS = 3

export type AreaTier = "focus" | "maintenance"

/** Where an area sits given the season's ranking. Areas outside the rank are
 * maintenance — an unranked area is not an error, it just isn't a priority. */
export function areaTier(areaRank: string[], focusCount: number, areaId: string): AreaTier {
  const i = areaRank.indexOf(areaId)
  if (i < 0) return "maintenance"
  return i < Math.min(Math.max(1, focusCount), MAX_FOCUS_AREAS) ? "focus" : "maintenance"
}

/**
 * v19 — the ONLY writer of the ranking and its focus projection. Keeping
 * `focusAreaIds` as a stored projection (32 call sites read it) is safe only
 * because it is written here and nowhere else; the invariant
 * `focusAreaIds === areaRank.slice(0, focusCount)` is asserted in tests.
 * Fail-closed: duplicates, unknown ids and an out-of-range focus count throw
 * rather than silently producing a ranking the user didn't ask for.
 */
export function setAreaPriority(
  rank: string[],
  focusCount: number,
  knownIds: string[],
): { areaRank: string[]; focusAreaIds: string[] } {
  if (new Set(rank).size !== rank.length) throw new Error("An area can't appear twice in the ranking")
  const known = new Set(knownIds)
  for (const id of rank) if (!known.has(id)) throw new Error(`Unknown area "${id}"`)
  if (!Number.isInteger(focusCount) || focusCount < 1 || focusCount > MAX_FOCUS_AREAS) {
    throw new Error(`Focus is 1-${MAX_FOCUS_AREAS} areas, got ${focusCount}`)
  }
  return { areaRank: [...rank], focusAreaIds: rank.slice(0, Math.min(focusCount, rank.length)) }
}

/**
 * v19 — migration. Builds a ranking from whatever the plan already carries, so
 * an existing sandbox keeps its meaning: the old focus set first (order kept),
 * then areas the retired `areaScope` marked "deep", then "sketched", then the
 * rest in canonical order. Idempotent — re-running on its own output is a no-op.
 */
export function deriveAreaRank(state: {
  areaRank?: string[]
  focusAreaIds?: string[]
  areaScope?: Record<string, string>
  areaPlans?: Record<string, unknown>
}, extraIds: string[] = []): string[] {
  const canonical = [...LIFE_MASTERY_AREAS.map((a) => a.id), ...extraIds]
  const seen = new Set<string>()
  const out: string[] = []
  const push = (id: string) => {
    if (!seen.has(id)) { seen.add(id); out.push(id) }
  }
  for (const id of state.areaRank ?? []) push(id)
  for (const id of state.focusAreaIds ?? []) push(id)
  const scope = state.areaScope ?? {}
  for (const tier of ["deep", "sketched"]) {
    for (const id of canonical) if (scope[id] === tier) push(id)
  }
  for (const id of canonical) push(id)
  return out
}

/**
 * v19 — the +1 rule. "How can I bring myself to a three next week" — the target
 * for a weak area is one level up, never 10. Returns null once an area is at
 * the success level, where the useful move is holding, not climbing.
 */
export function nextLevelTarget(rating: number | null | undefined): number | null {
  if (rating == null || !Number.isFinite(rating)) return null
  if (rating >= 10) return null
  return Math.min(10, Math.floor(rating) + 1)
}

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
      // v24 — one taxonomy: the third goal-creating path stamps its area too,
      // so routine picks feed exactly one room like every other goal.
      areaId: goalAreaId({ pillarId: pillar.id }),
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

/**
 * v23 — roll every day the user was away, not just yesterday.
 *
 * The daily loop called `rolloverAdhoc(prev, yesterday, today)` on mount, so
 * missing two days stranded Monday's unfinished items on Monday's plan forever
 * — invisible, with nothing anywhere saying they existed. Walks forward from
 * `since` so a chain of empty days still carries the work through, and caps at
 * 60 days back because "unfinished since March" is archaeology, not a to-do.
 */
export function rolloverAdhocSince(progress: VisionProgress, since: string | null | undefined, today: string): VisionProgress {
  const start = since && since < today ? since : addDays(today, -1)
  const days = Math.min(60, Math.max(1, dayNumber(start, today)))
  let out = progress
  for (let i = days; i >= 1; i--) out = rolloverAdhoc(out, addDays(today, -i), today)
  return out
}

/** How many days of unfinished work `rolloverAdhocSince` would carry, so the
 * daily loop can say "you were away 3 days" instead of silently merging. */
export function daysAway(since: string | null | undefined, today: string): number {
  if (!since || since >= today) return 0
  return Math.max(0, dayNumber(since, today) - 1)
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

/**
 * v23 — the day-1 room ratings become review week 0.
 *
 * The user rates every room they open during planning, and that was the end of
 * it: Track's wheel reads `weeklyReviews` only, so it stayed empty for six
 * days; `lastRatingsBefore` had nothing to compare the first review against;
 * and the +1 rule, the Δ column and the ghost dots were all blank in exactly
 * the week a new user most needs to see movement. Seeded at confirm time,
 * stamped the day BEFORE the plan starts so it sorts first and can never
 * collide with a real week.
 *
 * Idempotent, and never overwrites: if week 0 already exists it is left alone.
 */
export function seedBaselineReview(
  progress: VisionProgress,
  baselineRatings: Record<string, number> | undefined,
): VisionProgress {
  const ratings = baselineRatings ?? {}
  const clean: Record<string, number> = {}
  for (const [id, v] of Object.entries(ratings)) {
    if (Number.isFinite(v)) clean[id] = Math.max(0, Math.min(10, Math.round(v)))
  }
  if (Object.keys(clean).length === 0) return progress
  const weekStart = addDays(progress.startDate, -7)
  const existing = progress.weeklyReviews ?? []
  if (existing.some((r) => r.weekStart === weekStart)) return progress
  const baseline: VisionWeeklyReview = {
    weekStart,
    areaRatings: clean,
    note: "Where you started. The scores you gave each room while building the plan.",
    focusPillarId: null,
  }
  return { ...progress, weeklyReviews: [baseline, ...existing] }
}

/** The most recent review STRICTLY BEFORE `weekStart` — powers "last week you
 * were a 4" (compare against previous weeks, aim one point higher). */
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
    // M5 — "reach at least 12%" is the wrong sentence for a goal that improves
    // downward: body fat, race times, debt. "At least" sets a floor, and on a
    // descending goal the floor is the thing you are trying to get under.
    if (measureDirection(goal.measure) === "down") {
      return `I will easily get down to ${goal.measure.target} ${goal.measure.unit} or below (from ${goal.measure.start})${purpose}${by}.`
    }
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
  mode: "create" | "track" | "library"
  /** DOM anchor id of the section the action lives in. */
  anchor: string
}

export interface PendingActionInput {
  committedAt: string | null
  values: string[]
  awayValues?: string[]
  drivingForce: { purpose: string; reasons: string[]; identity: string[] } | null
  yourTens: Record<string, string>
  areaPlans?: Record<string, { name?: string; purpose?: string; identity?: string; maintenance?: string }>
  focusAreaIds?: string[]
  /** v23 — the season ranking, so the badge asks for depth in the areas the
   * user chose and only a floor everywhere else. */
  areaRank?: string[]
  focusCount?: number
  ritual: VisionRitual | null
  goals: VisionGoalDraft[] | null
  /** Goal ids in the user's priority order, so "write your reasons" starts
   * with the goal they said matters most rather than the first one parsed. */
  priorityIds?: string[]
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
  const { committedAt, values, awayValues, drivingForce, yourTens, areaPlans, focusAreaIds, ritual, goals, priorityIds = [], progress, confirmed, today } = input
  // v23 — the badge used to demand a 10, a goal and a why in ALL TWELVE areas,
  // which is the exact even-wheel completionism the focus/maintenance doctrine
  // exists to remove: it nagged "9 areas have none" the morning after the user
  // deliberately chose two. Depth is asked of focus areas; a maintenance area
  // is honoured with a floor, not a goal.
  const rank = input.areaRank ?? focusAreaIds ?? []
  const count = input.focusCount ?? Math.max(1, Math.min(MAX_FOCUS_AREAS, focusAreaIds?.length ?? 0))
  const hasSeason = rank.length > 0 && (focusAreaIds?.length ?? 0) > 0
  const focusAreas = hasSeason
    ? LIFE_MASTERY_AREAS.filter((a) => areaTier(rank, count, a.id) === "focus")
    : LIFE_MASTERY_AREAS

  if (!committedAt) out.push({ id: "commit", label: "Commit to mastery", mode: "create", anchor: "lm-foundation" })
  else if (values.length < 3) out.push({ id: "values", label: "Do the values exercise", mode: "create", anchor: "lm-foundation" })
  else if (!awayValues || awayValues.length === 0)
    out.push({ id: "away", label: "Name what you're running from. Your away-from values", mode: "create", anchor: "lm-foundation" })
  if (goals && goals.length > 0) {
    if (!drivingForce?.purpose.trim()) out.push({ id: "purpose", label: "Write your purpose. The why behind the vision", mode: "create", anchor: "lm-driving-force" })
    // The why comes BEFORE the belief rating in his order — you cannot honestly
    // rate belief in a goal you have not said why you want. This nag could not
    // exist until goals stopped being created with a fabricated reason.
    const noWhy = goalsNeedingWhy(goals, priorityIds)
    if (noWhy.length > 0)
      out.push({
        id: "goal-why",
        label: noWhy.length === 1
          ? `Write why you want "${noWhy[0].title}"`
          : `Write the reasons behind ${noWhy.length} goals — start with "${noWhy[0].title}"`,
        mode: "create", anchor: "lm-goals",
      })
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
    const tensMissing = focusAreas.filter((a) => !(yourTens[a.id] ?? "").trim())
    if (tensMissing.length > 0)
      out.push({
        id: "tens",
        label: hasSeason
          ? `Write your 10 in ${tensMissing.map((a) => a.label).join(", ")}`
          : `Write your 10 in every room (${LIFE_MASTERY_AREAS.length - tensMissing.length}/${LIFE_MASTERY_AREAS.length})`,
        mode: "create", anchor: "lm-vision",
      })
    const emptyAreas = focusAreas.filter((a) => !goals.some((g) => goalFeedsArea(g, a.id)))
    if (emptyAreas.length > 0)
      out.push({
        id: "area-goals",
        label: hasSeason
          ? `Set a goal in ${emptyAreas.map((a) => a.label).join(", ")} — your focus for this season`
          : `Set a goal in every area — ${emptyAreas.length} area${emptyAreas.length === 1 ? " has" : "s have"} none`,
        mode: "library", anchor: "lm-lifeplan",
      })
    const noPurpose = focusAreas.filter((a) => !(areaPlans?.[a.id]?.purpose ?? "").trim()).length
    if (noPurpose > 0 && noPurpose < focusAreas.length)
      out.push({ id: "area-purpose", label: `Write the why for ${noPurpose} more area${noPurpose === 1 ? "" : "s"}`, mode: "library", anchor: "lm-lifeplan" })
    else if (noPurpose > 0 && noPurpose === focusAreas.length)
      out.push({ id: "area-purpose", label: hasSeason ? "Write a why for each focus area" : "Write a why for each life area", mode: "library", anchor: "lm-lifeplan" })
    // The maintenance tier asks for one thing only: the floor it must not drop
    // below. That is what honouring a non-focus area looks like here.
    if (hasSeason) {
      const noFloor = LIFE_MASTERY_AREAS.filter(
        (a) => areaTier(rank, count, a.id) === "maintenance" && !(areaPlans?.[a.id]?.maintenance ?? "").trim(),
      ).length
      if (noFloor > 0)
        out.push({ id: "floors", label: `Set a floor for ${noFloor} area${noFloor === 1 ? "" : "s"} you're not focusing on`, mode: "create", anchor: "lm-season-priority" })
    }
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
    // NO fabricated why. It used to default to "Because <area> is part of the
    // life I said I want" — a sentence the user never wrote, sitting in the
    // one field the whole framework turns on ("the reasons are the fuel").
    // Worse, it read as answered: nothing could ever prompt for a why, because
    // no goal ever lacked one. Same class as the "Work toward: …" placeholder.
    // Empty is honest, and it is what makes the gap visible.
    why: input.why.trim(),
    sourceIntentIds: [],
    habits: [{
      id: `${id}-h0`,
      title: input.type === "habit_ramp" ? title : `Work toward: ${title}`,
      daysPerWeek: days,
      sourceTargetId: null,
      // M8 — for a practice the habit IS the goal, so it is real. For anything
      // else the title is auto-derived and names no action; flagged so the
      // card can ask what the user will actually do.
      ...(input.type === "habit_ramp" ? {} : { placeholder: true }),
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
  }
}

// ---------------------------------------------------------------------------
// v18 — THE REASONS. "The reasons are the fuel for the fire — the more reasons,
// the more motivated you'll be." The drill already existed; what was missing is
// any help producing a hundred of them from a blank box. Two aids, both pure:
// convert the VEHICLE into the ends it actually serves, and prompt across the
// classes of reason people don't think to write.
// ---------------------------------------------------------------------------

/** One class of reason, with the question that pulls it out. Deliberately
 * concrete and unsqueamish — a reason list you'd read aloud to your mother is
 * a reason list that doesn't move you, and the drill's own rule is no filter. */
export interface ReasonPrompt {
  id: string
  label: string
  question: string
}

export const REASON_PROMPTS: ReasonPrompt[] = [
  { id: "daily", label: "The daily texture", question: "What is an ordinary Tuesday like once you have this? Name the small things." },
  { id: "body", label: "The body", question: "What does this give you physically. Touch, sex, energy, how you feel in your own skin?" },
  { id: "identity", label: "Who you become", question: "Who are you once this is true, and what does that person do differently?" },
  { id: "cost", label: "The cost of not", question: "What does another three years exactly like this one take from you?" },
  { id: "others", label: "Who else feels it", question: "Who else's life is different because you did this?" },
  { id: "unlocks", label: "What it unlocks", question: "What becomes possible after this that isn't possible now?" },
  { id: "proof", label: "The proof", question: "What would this prove to you. And to whom?" },
  { id: "feeling", label: "The feeling", question: "What do you get to STOP feeling? What do you get to start feeling?" },
]

export interface VehicleReading {
  /** The matched vehicle label, e.g. "Relationship". */
  label: string
  /** The ends it actually serves — editable seeds, never the final word. */
  ends: string[]
}

/**
 * v18 — read a goal title as a VEHICLE and name the ends underneath it.
 * "Get a girlfriend" is not an end; it's how you get intimacy, sex, company,
 * being chosen. A goal stated as a vehicle with an empty why has nothing to
 * pull on, which is exactly the state most goals sit in today.
 *
 * Reuses VEHICLE_CONVERSIONS (previously wired only into the values exercise).
 * Returns null when the title names no known vehicle — we do not guess.
 */
export function readGoalVehicle(title: string): VehicleReading | null {
  const t = title.trim()
  if (!t) return null
  const hit = VEHICLE_CONVERSIONS.find((v) => v.match.test(t))
  return hit ? { label: hit.label, ends: [...hit.ends] } : null
}

/** v18 — the prompt for expanding a reason list. The model MUST write in the
 * user's own register (their existing reasons are the style sample) and must
 * not sanitise: blunt physical and status reasons are the ones that work. */
export function buildReasonsPrompt(goalTitle: string, why: string, existing: string[], want: number): string {
  return `The user is doing the "100 reasons" drill for ONE goal. Reasons are the fuel: the more reasons, the more motivated they are. The first ten are surface; the real ones are past thirty.

GOAL: ${goalTitle}
${why.trim() ? `THEIR ONE-LINE WHY: ${why.trim()}\n` : ""}${existing.length ? `REASONS THEY ALREADY WROTE (${existing.length}) — match this voice exactly:\n${existing.map((r) => `- ${r}`).join("\n")}` : "They haven't written any yet."}

Write ${want} MORE reasons this goal must happen. Rules:
1. Write as THEM, first person, the way they already write — same bluntness, same vocabulary, same length. If their reasons are short and raw, yours are short and raw.
2. Do NOT sanitise. Physical reasons (sex, touch, being wanted), status reasons, spite, loneliness, envy — these are the ones that actually move people. A reason list that sounds polite is a reason list that does nothing.
3. Cover different ANGLES, not one angle restated: the ordinary day, the body, who they become, the cost of not doing it, who else it touches, what it unlocks, what it proves, what they stop feeling.
4. No duplicates of what they wrote. No preamble, no numbering, no commentary.
5. Each reason on its own line, starting with "Because " only if that reads naturally — otherwise just state it.

Respond with STRICT JSON only:
{"reasons":["...","..."]}`
}

/** Validate + de-duplicate an LLM reason expansion against what's already there.
 * Fail-closed: unparseable or empty output throws, never silently returns []. */
export function parseReasonsResponse(raw: string, existing: string[]): string[] {
  let data: unknown
  try {
    data = JSON.parse(stripFences(raw))
  } catch {
    throw new Error("LLM returned unparseable output (not JSON)")
  }
  const parsed = z.object({ reasons: z.array(z.string().min(1).max(200)).min(1).max(60) }).safeParse(data)
  if (!parsed.success) throw new Error("LLM response did not match the reasons schema")
  const seen = new Set(existing.map((r) => r.trim().toLowerCase()))
  const out: string[] = []
  for (const r of parsed.data.reasons) {
    const t = r.trim()
    const k = t.toLowerCase()
    if (!t || seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  if (out.length === 0) throw new Error("Every suggested reason duplicated one you already have")
  return out
}

export const VisionReasonsRequestSchema = z.object({
  goalTitle: z.string().min(1).max(200),
  why: z.string().max(500).optional().default(""),
  existing: z.array(z.string().min(1).max(200)).max(150).default([]),
  want: z.number().int().min(1).max(40).default(20),
})
export type VisionReasonsRequest = z.infer<typeof VisionReasonsRequestSchema>

/** v17 — verbs that name a thing you either did or didn't do. */
const ACHIEVEMENT_VERBS = [
  "get", "achieve", "earn", "win", "land", "pass", "launch", "publish", "ship",
  "finish", "complete", "graduate", "qualify", "obtain", "buy", "move", "quit",
  "marry", "hit", "reach", "become",
  // M4 — verbs that name a finish line. Safe to add: a line with a count > 1
  // still becomes a ladder via R3a, so "write 50 songs" is unaffected while
  // "write the terms of service" stops being a thrice-weekly practice.
  "take", "start", "write", "rewrite", "release", "record", "compete",
  "present", "contribute", "cancel", "play", "hire", "sell", "open", "close",
]

/**
 * M8 — a STATE: an absence you want, or a capacity you want back. "No pain in
 * my left knee" and "full range of motion" are binary and contain no action at
 * all, which is exactly why they need to be recognised — as a practice they
 * become a thrice-weekly habit named after the outcome, which is what the old
 * default did.
 *
 * Cue-based rather than "has no verb", because "presence with my kids" has no
 * verb either and IS a practice. A wrong cue is worse than no cue.
 */
const STATE_CUES: RegExp[] = [
  /^(no|zero|without)\b/i,
  /\bfree from\b/i,
  /\b(pain|symptom|injury|debt)[\s-]free\b/i,
  /\bfull (range|recovery|use|mobility|movement)\b/i,
]

/** M2/M6 — word numerals intake actually meets in goal lists. */
const WORD_NUMERALS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, once: 1, twice: 2, thrice: 3,
}

/**
 * M6 — units we recognise by name, so the unit never has to be guessed from
 * word position. The old rule took the word AFTER the number, else the word
 * BEFORE it, which made "Bench 28 kg, 3x6-8" a goal measured in "Bench": the
 * trailing comma on "kg," failed the character class and it fell back to the
 * preceding word. Position is now the last resort, and only forward.
 */
const UNIT_ALIASES: Record<string, string> = {
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  km: "km", kilometre: "km", kilometres: "km", kilometer: "km", kilometers: "km",
  mi: "mi", mile: "mi", miles: "mi",
  m: "m", metre: "m", metres: "m", meter: "m", meters: "m",
  cm: "cm", g: "g", gram: "g", grams: "g",
  min: "min", mins: "min", minute: "min", minutes: "min",
  hr: "hr", hrs: "hr", hour: "hr", hours: "hr",
  sec: "sec", secs: "sec", second: "sec", seconds: "sec",
  rep: "reps", reps: "reps", set: "sets", sets: "sets",
  step: "steps", steps: "steps", page: "pages", pages: "pages",
  word: "words", words: "words", day: "days", days: "days",
  week: "weeks", weeks: "weeks", month: "months", months: "months",
  year: "years", years: "years",
}

/** M3 — the period a rhythm is expressed in. Deliberately short: "every meal",
 * "every time" and "every session" are NOT rhythms, and a list of period words
 * is the only thing that keeps them out. */
/** Words that mean "this is how OFTEN", as opposed to what you do that often.
 * "3 times a week" is all rhythm; "20 emails a week" is a quantity of emails. */
const FREQ_WORDS = /^(times?|x|×|days?|once|twice|thrice)$/i
const PERIOD_DAY = /^(day|morning|evening|night|afternoon)s?$/i
const PERIOD_WEEK = /^weeks?$/i
const PERIOD_MONTH = /^months?$/i
const WEEKDAY = /^(mon|tues?|wednes|thurs?|fri|satur|sun)day$/i

/** M7 — route cues. Each is a literal the review screen can show back, because
 * a suggestion the user cannot inspect is indistinguishable from a bug. */
const RULE_CUES: RegExp[] = [
  /^remember\b/i, /^never\b/i, /^always\b/i, /^don'?t forget\b/i,
]
/** Verdicts other people deliver. Not goals — 5-10 year wants. */
const HORIZON_CUES: RegExp[] = [
  /\bbest[\s-]?selling\b/i, /\bworld'?s (best|greatest|leading)\b/i,
  /\bfamous\b/i, /#\s?1\b/i, /\bnumber one\b/i, /\bviral\b/i,
  /\brecogni[sz]ed as\b/i, /\bbiggest\b/i, /\bgreatest\b/i,
  /\bmost \w+ in the (world|country|city)\b/i,
]
const IDENTITY_CUES: RegExp[] = [
  /^i am\b/i, /^i'm\b/i, /^be (a|an|the kind|someone|more)\b/i,
  /^be \w+ (around|with|in|under)\b/i, /^become someone\b/i,
  /\bhave confidence\b/i,
]

/**
 * M7 — which store a written line belongs in. Returns "goal" unless a literal
 * cue fires; never guesses. Order matters: a superlative outranks the "be a…"
 * identity shape, so "Be the biggest band in this city" is a horizon want and
 * "Be a patient father" is an identity.
 */
export function readGoalRoute(raw: string): { route: GoalRoute; cue: string | null } {
  const t = raw.trim()
  if (!t) return { route: "goal", cue: null }
  for (const groups of [
    { route: "rule" as const, cues: RULE_CUES },
    { route: "horizon-want" as const, cues: HORIZON_CUES },
    { route: "identity" as const, cues: IDENTITY_CUES },
  ]) {
    for (const re of groups.cues) {
      const m = t.match(re)
      if (m) return { route: groups.route, cue: m[0] }
    }
  }
  return { route: "goal", cue: null }
}

/** Which way a measure improves. `start === target` is rejected upstream. */
export function measureDirection(m: Pick<VisionMeasure, "start" | "target">): "up" | "down" {
  return m.target >= m.start ? "up" : "down"
}

/**
 * M5 — the halfway target, for the belief rule ("under 7? shrink it until you
 * believe it"). Halving the TARGET is only correct for a goal that climbs:
 * halving a body-fat target of 14% suggests 7%, which is not a smaller goal,
 * it is a much larger one. Halve the RANGE instead — that shrinks either way.
 */
export function shrunkTarget(m: Pick<VisionMeasure, "start" | "target">): number {
  const half = m.start + (m.target - m.start) / 2
  return Number.isInteger(m.start) && Number.isInteger(m.target) ? Math.round(half) : Number(half.toFixed(2))
}

/**
 * M8 — a goal with nothing to actually do. A state ("no pain in my left knee")
 * names an outcome and carries no action at all: no number to climb, no
 * checkpoints, and only the auto-generated "Work toward: …" stand-in habit.
 *
 * It is NOT enough to check `habits.length === 0` — every goal is created with
 * one habit, which is exactly why these were invisible: the placeholder made a
 * wish look like a plan, and it went on the calendar three times a week.
 */
/**
 * CAPTURE IS NOT PLANNING.
 *
 * Getting a written list into the system fast is genuinely valuable — the list
 * exists, and demanding the whole method before accepting it loses the list.
 * But what comes out the other side is a set of CAPTURED lines, and the
 * product used to present them as finished goals: a fabricated why, a
 * fabricated deadline, a "Work toward: …" habit on the calendar. Three
 * defaults, each of which read as an answer and so could never be questioned.
 *
 * A captured line becomes a goal when the user has supplied the things the
 * method actually turns on. Deliberately the SHORT list — the reasons drill,
 * the reward, the stake, the obstacle pre-mortem and the chunking are depth,
 * asked for later. These four are the difference between a wish and a goal:
 *   · a reason (the fuel — re-read on the days you don't feel like it)
 *   · belief and desire, both rated (under 7 and the goal must be reshaped)
 *   · a date you chose (a target with no date is a wish with a number)
 */
export function goalIsPlanned(goal: Pick<VisionGoalDraft, "why" | "beliefLevel" | "desireLevel" | "targetDate" | "type">): boolean {
  if (!goal.why.trim()) return false
  if (goal.beliefLevel == null || goal.desireLevel == null) return false
  // A practice is ongoing by nature — "by June" is legitimate but not required.
  if (goal.type !== "habit_ramp" && !goal.targetDate) return false
  return true
}

/** What a single captured line is still missing, in the order it should be asked. */
export function goalGaps(goal: Pick<VisionGoalDraft, "why" | "painWhy" | "beliefLevel" | "desireLevel" | "targetDate" | "type">): string[] {
  const out: string[] = []
  if (!goal.why.trim()) out.push("a reason")
  if (goal.beliefLevel == null || goal.desireLevel == null) out.push("belief & desire")
  if (goal.type !== "habit_ramp" && !goal.targetDate) out.push("a date")
  if (!goal.painWhy?.trim()) out.push("the cost of not")
  return out
}

/** One step of the framework's derivation chain, and whether it exists yet. */
export interface ConformanceStep {
  id: string
  label: string
  /** Why the method puts it here — shown so the readout teaches, not just scores. */
  note: string
  done: boolean
}

export interface PlanConformance {
  steps: ConformanceStep[]
  stepsDone: number
  stepsTotal: number
  goalsTotal: number
  goalsPlanned: number
  /** Goals that are captured lines, not yet goals — with what each still needs. */
  captured: Array<{ id: string; title: string; gaps: string[] }>
}

/**
 * How much of the method this plan actually has, measured against his own
 * order rather than against whether our features were used. This exists so
 * nobody has to hand-inspect a plan to discover it is 1/10 of the framework
 * with twelve goals in it that look finished.
 */
export function planConformance(state: {
  committedAt?: string | null
  values?: string[]
  vision?: string
  drivingForce?: VisionDrivingForce | null
  yourTens?: Record<string, string>
  areaPlans?: Record<string, VisionAreaPlan>
  goals?: VisionGoalDraft[] | null
}): PlanConformance {
  const areaPlans = Object.values(state.areaPlans ?? {})
  const goals = state.goals ?? []
  const steps: ConformanceStep[] = [
    { id: "commit", label: "Commit to mastery", note: "Every area at once. The dabbler and master gate the whole method opens with.", done: !!state.committedAt },
    { id: "values", label: "Your values, ranked", note: "Elicited BEFORE the vision, so the vision can be checked against them.", done: (state.values?.length ?? 0) > 0 },
    { id: "vision", label: "The vision", note: "What the perfect life looks like, before anything gets measured.", done: !!state.vision?.trim() },
    { id: "purpose", label: "Your purpose", note: "One non-negotiable statement of why the vision matters. The reasons are the fuel.", done: !!state.drivingForce?.purpose?.trim() },
    { id: "identity", label: "Who you're committed to being", note: "\"I am…\" — the state you condition every day, not a task.", done: (state.drivingForce?.identity?.length ?? 0) > 0 },
    { id: "tens", label: "Your 10 in each room", note: "You cannot rate an area 0-10 without first saying what YOUR 10 is.", done: Object.values(state.yourTens ?? {}).some((t) => t.trim()) },
    { id: "area-why", label: "Why each room matters", note: "The area-level why the goals underneath it inherit.", done: areaPlans.some((a) => a.purpose?.trim()) },
    { id: "goals", label: "Goals in your rooms", note: "The moves that close the gap between where you are and your 10.", done: goals.length > 0 },
    { id: "reasons", label: "A reason under every goal", note: "Written directly under the goal. This is what you re-read when motivation goes.", done: goals.length > 0 && goals.every((g) => g.why.trim()) },
    { id: "ritual", label: "A daily ritual", note: "The conditioning loop. Without it the plan stays a document.", done: goals.length > 0 && goals.every((g) => g.beliefLevel != null && g.desireLevel != null) },
  ]
  const captured = goals.filter((g) => !goalIsPlanned(g)).map((g) => ({ id: g.id, title: g.title, gaps: goalGaps(g) }))
  return {
    steps,
    stepsDone: steps.filter((s) => s.done).length,
    stepsTotal: steps.length,
    goalsTotal: goals.length,
    goalsPlanned: goals.length - captured.length,
    captured,
  }
}

/**
 * A goal nobody has given a reason for. The framework's order is goal → why,
 * written directly underneath it, and the daily loop exists to re-read those
 * reasons: "anytime you're not motivated, all you got to do is remind yourself
 * why do I want this?" A goal with no why has nothing to re-read.
 */
export function goalNeedsWhy(goal: Pick<VisionGoalDraft, "why">): boolean {
  return !goal.why.trim()
}

/** Goals with no reason, hardest-hitting first: the ones the user ranked top
 * are the ones worth the drill. 80/20 — nobody writes twelve whys in a sitting,
 * and the framework doesn't ask them to. */
export function goalsNeedingWhy(goals: VisionGoalDraft[], priorityIds: string[] = []): VisionGoalDraft[] {
  const rank = new Map(priorityIds.map((id, i) => [id, i]))
  return goals
    .filter(goalNeedsWhy)
    .sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9))
}

export function goalNeedsAction(goal: Pick<VisionGoalDraft, "habits" | "tasks" | "measure">): boolean {
  if (goal.measure) return false
  if (goal.tasks.length > 0) return false
  return goal.habits.every((h) => h.placeholder)
}

/**
 * M8 — attach a real action to a goal, retiring the "Work toward: …"
 * placeholder the goal was created with. The placeholder is dropped only when
 * a real habit replaces it, so a goal is never left with an empty habit list
 * (the schema requires at least one, and the balancer needs something to
 * schedule).
 */
export function addGoalAction(
  goals: VisionGoalDraft[],
  goalId: string,
  action: { title: string; daysPerWeek: number },
): VisionGoalDraft[] {
  const title = action.title.trim()
  if (!title) throw new Error("An action needs a title")
  const days = Math.min(7, Math.max(1, Math.round(action.daysPerWeek)))
  return goals.map((g) => {
    if (g.id !== goalId) return g
    const real = g.habits.filter((h) => !h.placeholder)
    let n = 0
    while (g.habits.some((h) => h.id === `${g.id}-a${n}`)) n++
    return {
      ...g,
      habits: [...real, { id: `${g.id}-a${n}`, title, daysPerWeek: days, sourceTargetId: null }],
    }
  })
}

/**
 * M4 — how many rungs a ladder should have. A five-rung climb from 0 to 1 is
 * a checkbox wearing a ladder's clothes; a five-rung climb from 3.1 to 3.6 GPA
 * is perfectly sensible. So: integer measures get at most their own range,
 * fractional ones keep the default.
 */
export function ladderSteps(start: number, target: number): number {
  const range = Math.abs(target - start)
  if (!Number.isInteger(start) || !Number.isInteger(target)) return 5
  return Math.min(5, Math.max(2, Math.round(range)))
}

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

/** One number found in a line, with whatever unit sits against it. */
interface NumToken {
  value: number
  unit: string | null
  /** Offset and length in the working text, so the token can be cut out. */
  index: number
  length: number
}

/** Thousands separators are noise inside a number and meaningful between words
 * ("Skullcrushers, 30 kg"). Only strip the comma when digits sit on both sides. */
function stripThousands(s: string): string {
  return s.replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
}

/** Read every numeric token in the line, resolving its unit by NAME first and
 * by position only as a fallback — and only forward, never backward. */
function scanNumbers(text: string): NumToken[] {
  const out: NumToken[] = []
  // The k/m multiplier must be ATTACHED ("10k"). With a space it is a unit
  // word — that ambiguity is what made "28 kg" a 28,000-rep goal waiting to
  // happen.
  const re = /(?<![\w.])([$€£])?\s?(\d+(?:\.\d+)?)(k|m)?(?![\w.])/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const [whole, currency, digits, mult] = m
    // Ordinals and bare years are never measures ("my 1st marathon", "in 2026").
    const rest = text.slice(m.index + whole.length)
    if (/^(st|nd|rd|th)\b/i.test(rest)) continue
    if (!mult && !currency && /^(19|20)\d{2}$/.test(digits)) continue

    const isDistance = DISTANCE_VERBS.test(text)
    // "run 10k" is ten kilometres; "earn 10k" is ten thousand. The verb decides.
    const kIsUnit = isDistance && /^k$/i.test(mult ?? "")
    let value = Number(digits)
    if (!kIsUnit) {
      if (/^k$/i.test(mult ?? "")) value *= 1000
      if (/^m$/i.test(mult ?? "")) value *= 1_000_000
    }

    let unit: string | null = null
    if (currency) unit = currency
    else if (kIsUnit) unit = "km"
    else if (/^\s*%/.test(rest)) unit = "%"
    else {
      const nextWord = rest.trim().split(/\s+/)[0] ?? ""
      // Two forms: `key` for the alias lookup (letters only, so "kg," matches
      // "kg"), `display` for the fallback unit, which keeps internal hyphens
      // because "pull-ups" is a better unit than "pullups".
      const key = nextWord.replace(/[^a-z%]/gi, "").toLowerCase()
      const display = nextWord.replace(/^[^a-z]+|[^a-z]+$/gi, "").toLowerCase()
      if (key === "%" || nextWord.startsWith("%")) unit = "%"
      else if (UNIT_ALIASES[key]) unit = UNIT_ALIASES[key]
      else if (MONEY_VERBS.test(text)) unit = "$"
      else if (isDistance) unit = "km"
      // Position fallback: a plain word directly after the number is a
      // serviceable unit ("100 users", "50 songs"). A word BEFORE it never is.
      else if (/^[a-z][a-z-]*$/i.test(display)) unit = display
    }
    out.push({ value, unit, index: m.index, length: whole.length })
  }
  return out
}

/** Word numerals, for lines that spell the count out ("swim once a week"). */
function scanWordNumeral(text: string): { value: number; index: number; length: number } | null {
  const re = new RegExp(`\\b(${Object.keys(WORD_NUMERALS).join("|")})\\b`, "i")
  const m = text.match(re)
  if (!m || m.index === undefined) return null
  return { value: WORD_NUMERALS[m[1].toLowerCase()], index: m.index, length: m[0].length }
}

/** M6 — pull "3x6-8" / "5x5" off the line. Requires digits on BOTH sides of the
 * x, so "18 kg x 10" (which is a weight and a rep count, not a protocol) is
 * left alone. */
function extractProtocol(text: string): { text: string; protocol: string | null } {
  const m = text.match(/(?<![\w.])(\d+)\s*[x×]\s*(\d+(?:\s*[-–]\s*\d+)?)(?![\w.])/i)
  if (!m || m.index === undefined) return { text, protocol: null }
  const protocol = `${m[1]}×${m[2].replace(/\s*[-–]\s*/, "-")}`
  const cleaned = (text.slice(0, m.index) + text.slice(m.index + m[0].length))
    .replace(/[,;]\s*$/, "").replace(/\s+/g, " ").trim()
  return { text: cleaned || text, protocol }
}

/** M2 — an explicit "where I am now". Deliberately narrow: a bare "at N" would
 * swallow "present at one conference", so only unambiguous phrasings count. */
const BASELINE_RE = /\b(?:from|currently|now at|starting at|starting from)\s+([$€£])?\s?(\d+(?:\.\d+)?)\s*(%)?/i
/** M2/M5 — the two-ended form. Always a ladder, whichever way it points. */
const FROM_TO_RE = /\bfrom\s+([$€£])?\s?(\d+(?:\.\d+)?)\s*(%)?.*?\bto\s+([$€£])?\s?(\d+(?:\.\d+)?)\s*(%)?/i

/**
 * Turn one line of natural text into a goal reading. The rules the user can
 * feel: an explicit "from X to Y" is a ladder, a rhythm is a PRACTICE, a
 * number is a TARGET you climb to (or down to), and a thing you either did or
 * didn't is an ACHIEVEMENT. Pure; the caller supplies today so it is testable
 * and resume-safe.
 *
 * Rules run in order, first match wins — the order is what makes it
 * predictable. R0 sits above the rhythm rule because "from 4 a day to 0" names
 * a range, and the "a day" inside it is part of the unit, not a cadence.
 */
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

/**
 * A deadline the user actually WROTE. Removing the fabricated today+365 left a
 * real gap: "bench 100 kg by June" carries a date, and it was being discarded
 * along with the invented ones. Fabricating a date and ignoring a stated one
 * are the same mistake wearing different clothes.
 *
 * Returns the ISO date and the text with the phrase removed, or null. Never
 * guesses — an unparseable "by soon" stays in the title and leaves the date
 * missing, which `goalGaps` reports honestly.
 */
export function readWrittenDate(text: string, todayISO: string): { date: string; rest: string } | null {
  const cut = (m: RegExpMatchArray, date: string) => ({
    date,
    rest: (text.slice(0, m.index) + text.slice((m.index ?? 0) + m[0].length)).replace(/\s*[,;]\s*$/, "").replace(/\s+/g, " ").trim(),
  })
  const iso = text.match(/\bby\s+(\d{4}-\d{2}-\d{2})\b/i)
  if (iso) return cut(iso, iso[1])

  const named = text.match(new RegExp(`\\bby\\s+(?:the\\s+end\\s+of\\s+)?(${MONTHS.join("|")})\\b(?:\\s+(\\d{4}))?`, "i"))
  if (named) {
    const mi = MONTHS.indexOf(named[1].toLowerCase())
    const [ty, tm] = [Number(todayISO.slice(0, 4)), Number(todayISO.slice(5, 7))]
    // No year given: the next time that month comes round, never one behind.
    const year = named[2] ? Number(named[2]) : mi + 1 >= tm ? ty : ty + 1
    const last = new Date(Date.UTC(year, mi + 1, 0)).getUTCDate()
    return cut(named, `${year}-${String(mi + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`)
  }

  const rel = text.match(/\bin\s+(\d+)\s+(days?|weeks?|months?|years?)\b/i)
  if (rel) {
    const n = Number(rel[1])
    const days = /day/i.test(rel[2]) ? n : /week/i.test(rel[2]) ? n * 7 : /month/i.test(rel[2]) ? n * 30 : n * 365
    return cut(rel, addDays(todayISO, days))
  }

  const eoy = text.match(/\bby\s+(?:the\s+)?end\s+of\s+(?:the\s+)?year\b/i)
  if (eoy) return cut(eoy, `${todayISO.slice(0, 4)}-12-31`)
  return null
}

export function classifyGoalInput(raw: string, todayISO: string): GoalReading {
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  const original = raw.trim().replace(/\s+/g, " ")
  // A date the user wrote is pulled out first, so it never lands in a measure
  // ("by 2027" is not a target of 2027) and never clutters the title.
  const dated = readWrittenDate(stripThousands(original), todayISO)
  const { text: deProtocol, protocol } = extractProtocol(dated?.rest ?? stripThousands(original))
  const text = deProtocol
  const writtenDate = dated?.date ?? null
  const lower = text.toLowerCase()
  const { route, cue } = readGoalRoute(original)
  const base = { why: "", route, routeCue: cue }
  const tidy = (s: string) => cap(s.replace(/\s*[,;]\s*$/, "").replace(/\s+/g, " ").trim() || text)
  const withProtocol = (m: VisionMeasure): VisionMeasure => (protocol ? { ...m, protocol } : m)

  // ---- R0: an explicit two-ended range is always a ladder, either direction.
  const ft = text.match(FROM_TO_RE)
  if (ft) {
    const start = Number(ft[2])
    const target = Number(ft[5])
    if (start !== target) {
      const unit = ft[1] ?? ft[4] ?? (ft[3] || ft[6] ? "%" : null)
        ?? scanNumbers(text).find((n) => n.unit)?.unit ?? "reps"
      const title = tidy(text.slice(0, ft.index).trim() || text)
      return {
        ...base, title, type: "milestone_ladder", daysPerWeek: 3,
        measure: withProtocol({ unit, start, target, steps: ladderSteps(start, target) }),
        targetDate: writtenDate,
      }
    }
  }

  // ---- R1: a rhythm is always a practice.
  const cadence = readCadence(text)
  if (cadence) {
    return {
      ...base, title: tidy(cadence.title), type: "habit_ramp",
      daysPerWeek: cadence.days, measure: null, targetDate: writtenDate,
      ...(cadence.monthly ? { monthly: true } : {}),
    }
  }

  // ---- baseline (one-ended), applied to whatever shape follows.
  const bl = text.match(BASELINE_RE)
  const stripped = bl ? (text.slice(0, bl.index) + text.slice((bl.index ?? 0) + bl[0].length)) : text
  const explicitStart = bl ? Number(bl[2]) : null

  // ---- R2: a gradable comparative is a practice, not a finish line.
  const comparative = /\b(better|fitter|stronger|healthier|happier|leaner|calmer|sharper|more \w+)\b/i.test(text)

  const digits = scanNumbers(stripped)
  const word = digits.length === 0 ? scanWordNumeral(stripped) : null
  const num: { value: number; unit: string | null } | null =
    digits[0] ?? (word ? { value: word.value, unit: null } : null)
  const descending = /\b(under|sub|below|less than|fewer than|within)\b/i.test(text)

  const buildMeasure = (target: number, unit: string | null): VisionMeasure => {
    const start = explicitStart ?? 0
    return withProtocol({
      unit: unit ?? "reps", start, target: target || 1, steps: ladderSteps(start, target || 1),
    })
  }
  /** A climb of exactly one rung is a checkbox. Only when the user did NOT
   * give a baseline — "from 7 to 8" is a range they chose, and we honour it. */
  const isCheckbox = (target: number) => explicitStart === null && target === 1

  // Once the baseline is a FIELD, repeating it in the title is duplication that
  // goes stale the moment the user edits the number: "10 pull-ups, from 6"
  // would still read "from 6" after they moved the start to 8.
  const titleText = bl ? stripped : text
  // No fabricated date. `addDays(today, 365)` put "by 30 July 2027" on every
  // captured line — a deadline nobody chose, on a field the SMART sentence
  // reads out loud. Third field of this shape (why, the Work-toward habit,
  // this): a default that reads as an answer is a question you can never be
  // asked again. Null is honest, and `planConformance` counts it as missing.
  const finishLine = (): GoalReading => ({
    ...base, title: tidy(titleText), type: "achievement", daysPerWeek: 3,
    measure: null, targetDate: writtenDate,
  })
  const ladder = (target: number, unit: string | null): GoalReading => ({
    ...base, title: tidy(titleText), type: "milestone_ladder", daysPerWeek: 3,
    measure: buildMeasure(target, unit), targetDate: writtenDate,
  })

  if (!comparative) {
    const firstWord = lower.split(/\s+/)[0] ?? ""
    const hasVerb = ACHIEVEMENT_VERBS.includes(firstWord)
    const hasOrdinal = /\b(my )?first\b|\b1st\b/i.test(text)
    const hasNamed = NAMED_ACHIEVEMENTS.some((n) => lower.includes(n))
    if (hasVerb || hasOrdinal || hasNamed) {
      // R3a — an achievement verb with a real count is a ladder ("publish 3
      // articles"). R3b — everything else on this branch is binary, including
      // a descending target with no baseline: we never invent a start.
      if (num && !descending && !isCheckbox(num.value)) return ladder(num.value, num.unit)
      return finishLine()
    }
  }

  // ---- R4: a bare number is a target you climb to (or down to, with a start).
  if (num && !comparative) {
    if (descending && explicitStart === null) return finishLine()
    if (isCheckbox(num.value)) return finishLine()
    return ladder(num.value, num.unit)
  }

  // ---- R5a: a STATE — an absence or a restored capacity. Binary by nature,
  // and it carries no action at all, which is why M8 asks what you will
  // actually do about it. Cue-based on purpose: "no verb" would have caught
  // "presence with my kids", which is a practice, not a state.
  if (!comparative && STATE_CUES.some((re) => re.test(text))) return finishLine()

  // ---- R5b: everything else is a practice. One tap flips it.
  return { ...base, title: tidy(text), type: "habit_ramp", daysPerWeek: 3, measure: null, targetDate: writtenDate }
}

/**
 * M1 — words people actually write above a block of goals, mapped to the
 * Blueprint area they mean. Exact area labels are matched first (see
 * `headingToArea`); this table is for the everyday synonyms.
 */
const AREA_ALIASES: Record<string, string> = {
  health: "lm_health", wellbeing: "lm_health", "well-being": "lm_health",
  body: "lm_health", sleep: "lm_health", nutrition: "lm_health",
  diet: "lm_health", medical: "lm_health", energy: "lm_health",
  fitness: "lm_fitness", training: "lm_fitness", gym: "lm_fitness",
  strength: "lm_fitness", exercise: "lm_fitness", workout: "lm_fitness",
  workouts: "lm_fitness", sport: "lm_fitness", sports: "lm_fitness",
  mind: "lm_mindset", mindset: "lm_mindset", beliefs: "lm_mindset",
  psychology: "lm_mindset", mental: "lm_mindset", learning: "lm_mindset",
  growth: "lm_mindset", emotions: "lm_emotions", feelings: "lm_emotions",
  happiness: "lm_emotions", mood: "lm_emotions", emotional: "lm_emotions",
  relationship: "lm_relationship", relationships: "lm_relationship",
  dating: "lm_relationship", love: "lm_relationship", romance: "lm_relationship",
  intimacy: "lm_relationship", partner: "lm_relationship", marriage: "lm_relationship",
  mission: "lm_mission", purpose: "lm_mission", work: "lm_mission",
  career: "lm_mission", business: "lm_mission", job: "lm_mission",
  school: "lm_mission", study: "lm_mission", studies: "lm_mission",
  company: "lm_mission", professional: "lm_mission", education: "lm_mission",
  money: "lm_money", finance: "lm_money", finances: "lm_money",
  wealth: "lm_money", income: "lm_money", savings: "lm_money",
  debt: "lm_money", financial: "lm_money", budget: "lm_money",
  family: "lm_family", kids: "lm_family", children: "lm_family",
  parents: "lm_family", friends: "lm_friends", friendship: "lm_friends",
  friendships: "lm_friends", social: "lm_friends", community: "lm_friends",
  fun: "lm_fun", hobbies: "lm_fun", hobby: "lm_fun", adventure: "lm_fun",
  travel: "lm_fun", play: "lm_fun", music: "lm_fun", games: "lm_fun",
  gaming: "lm_fun", recreation: "lm_fun",
  contribution: "lm_contribution", giving: "lm_contribution",
  charity: "lm_contribution", volunteering: "lm_contribution",
  impact: "lm_contribution", service: "lm_contribution",
  spirituality: "lm_spirituality", spiritual: "lm_spirituality",
  faith: "lm_spirituality", religion: "lm_spirituality",
  meditation: "lm_spirituality", soul: "lm_spirituality",
}

/** Words that may sit between area words in a heading without making it prose. */
const HEADING_CONNECTORS = new Set(["and", "or", "the", "my", "amp"])

/**
 * M1 — the Blueprint area a heading names, or null. Exact label or alias wins.
 *
 * The multi-word fallback requires EVERY word to be an area word or a
 * connector, so "Health & Fitness" resolves and "Build the company" does not.
 * A first-recognised-word scan looks harmless and is not: "company" is a
 * Mission alias, so "Build the company" resolved to Mission, was taken for a
 * heading, and the goal disappeared out of the list while everything below it
 * was silently re-filed.
 */
export function headingToArea(heading: string): string | null {
  const t = heading.trim().replace(/[:：]\s*$/, "").toLowerCase()
  if (!t) return null
  const exact = LIFE_MASTERY_AREAS.find((a) => a.label.toLowerCase() === t)
  if (exact) return exact.id
  if (AREA_ALIASES[t]) return AREA_ALIASES[t]
  const words = t.split(/[^a-z-]+/).filter(Boolean)
  if (words.length < 2) return null
  let found: string | null = null
  for (const w of words) {
    if (AREA_ALIASES[w]) found ??= AREA_ALIASES[w]
    else if (!HEADING_CONNECTORS.has(w)) return null
  }
  return found
}

/** Leading list markers people paste in: "1.", "1)", "- ", "* ", "• ", "a." */
const LIST_MARKER = /^\s*(?:[-*•–]|\d+[.)]|[a-z][.)])\s+/i
/** A sub-item marker — a bare letter bullet, or "12a." under "12." */
const SUBITEM_MARKER = /^\s*(?:[a-z][.)]|\d+[a-z][.)])\s+/i

/**
 * A line that names a section rather than a goal. Cue-based: a trailing colon,
 * or a short line that IS an area name. Never "it looks like a title".
 *
 * The two guards matter more than the match. `headingToArea` scans for ANY
 * recognised word, so without them "Become debt free" reads as a Money heading
 * — three words, contains "debt" — and the goal disappears out of the list
 * while silently re-filing everything under it. A heading has no digits in it
 * and does not open with a verb.
 */
function isHeading(line: string): boolean {
  const t = line.trim().replace(/^\d+[.)]\s*/, "")
  if (!t) return false
  if (/[:：]\s*$/.test(t)) return true
  if (/\d/.test(t)) return false
  const firstWord = t.toLowerCase().split(/\s+/)[0] ?? ""
  if (ACHIEVEMENT_VERBS.includes(firstWord)) return false
  return t.split(/\s+/).length <= 3 && headingToArea(t) !== null
}

/**
 * M1 — read a pasted goal list. Pure: writes nothing, creates nothing. Every
 * line comes back as a row the review screen can show and the user can correct
 * before anything is created.
 *
 * Headings set the area for the rows beneath them. A heading we cannot map is
 * reported in `unresolvedHeadings` and its rows carry `areaId: null`, which the
 * review screen requires the user to resolve — we never file a goal in a room
 * we guessed.
 */
export function parseGoalList(raw: string, todayISO: string): GoalListParse {
  const rows: GoalListRow[] = []
  const unresolved: string[] = []
  let heading: string | null = null
  let areaId: string | null = null
  // Stack of {indent, rowId} for nesting — a row's parent is the nearest
  // preceding row at a strictly smaller indent.
  const stack: Array<{ indent: number; id: string }> = []
  let n = 0

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    if (isHeading(line)) {
      heading = line.trim().replace(/[:：]\s*$/, "").replace(/^\d+[.)]\s*/, "")
      areaId = headingToArea(heading)
      if (!areaId && !unresolved.includes(heading)) unresolved.push(heading)
      stack.length = 0
      continue
    }
    const leading = line.match(/^[ \t]*/)?.[0] ?? ""
    // A bare letter bullet is a sub-item even without whitespace indentation —
    // "12a." under "12." is how people write sub-goals in a flat text file.
    const indent = leading.replace(/\t/g, "    ").length + (SUBITEM_MARKER.test(line) ? 2 : 0)
    const text = line.trim().replace(LIST_MARKER, "").trim()
    if (!text) continue

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop()
    const id = `row-${n++}`
    rows.push({
      id,
      raw: text,
      reading: classifyGoalInput(text, todayISO),
      areaId,
      heading,
      parentRowId: stack.length ? stack[stack.length - 1].id : null,
    })
    stack.push({ indent, id })
  }
  return { rows, unresolvedHeadings: unresolved }
}

/**
 * The comparable core of a title: no numbers, no units, no punctuation, and
 * trailing plurals flattened, so "get 10 downloads" and "get 100 download"
 * collapse to the same key. Crude on purpose — it only ever decides whether to
 * OFFER a merge, and the review screen shows exactly what would be absorbed.
 */
function titleStem(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\d.,]+/g, " ")
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ")
    .trim()
}

/** The number a row is "about": its target, or the count in its title when the
 * row is a checkbox ("get 1 download" — a single rung, so it carries no
 * measure, but it is still the bottom of somebody's ladder). */
function rowValue(r: GoalListRow): number | null {
  if (r.reading.measure) return r.reading.measure.target
  if (r.reading.type !== "achievement") return null
  const m = r.reading.title.match(/(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/)
  return m ? Number(m[1]) : null
}

/** One offered collapse of several written lines into a single goal. */
export interface GoalListMerge {
  keptRowId: string
  absorbedRowIds: string[]
  kind: "ladder" | "ramp"
  /** Human summary for the review screen ("1 → 10 → 100 downloads"). */
  summary: string
}

/**
 * People write an escalating goal as several lines — "get 1 download", "get 10
 * downloads", "get 100 downloads" — because a list has no other way to say it.
 * That is one goal with a ladder, and one goal with a ramp when what escalates
 * is the rhythm rather than the number.
 *
 * Returns the collapsed rows plus a description of every merge, so the review
 * screen can show what happened and the user can undo any of it. Never merges
 * silently and never merges a single row.
 */
export function mergeEscalations(rows: GoalListRow[]): { rows: GoalListRow[]; merges: GoalListMerge[] } {
  const groups = new Map<string, GoalListRow[]>()
  for (const r of rows) {
    if (r.parentRowId) continue // a sub-item belongs to its parent, not to a ladder
    const t = r.reading.type
    // A ladder group spans shapes: "get 1 download" is a checkbox on its own
    // (a climb of one rung is not a ladder) but it is plainly the bottom of the
    // ladder its neighbours describe. Grouping on type alone left it stranded.
    const kind = t === "habit_ramp" ? "ramp" : rowValue(r) !== null ? "ladder" : null
    if (!kind) continue
    const key = `${r.areaId ?? "?"}|${kind}|${titleStem(r.reading.title)}`
    const g = groups.get(key)
    if (g) g.push(r)
    else groups.set(key, [r])
  }

  const merges: GoalListMerge[] = []
  const absorbed = new Set<string>()
  const rewritten = new Map<string, GoalListRow>()

  for (const group of groups.values()) {
    if (group.length < 2) continue
    const first = group[0]

    if (first.reading.type !== "habit_ramp") {
      const values = group.map((r) => rowValue(r)!).filter((v) => v !== null)
      if (new Set(values).size < 2) continue // same number twice is a duplicate, not a ladder
      const sorted = [...values].sort((a, b) => a - b)
      const start = Math.min(...group.map((r) => r.reading.measure?.start ?? 0), sorted[0] - 1 < 0 ? 0 : 0)
      const target = sorted[sorted.length - 1]
      if (target === start) continue
      const unit = group.find((r) => r.reading.measure?.unit)?.reading.measure?.unit ?? "reps"
      const widest = group.reduce((a, b) => ((rowValue(b) ?? 0) > (rowValue(a) ?? 0) ? b : a))
      rewritten.set(first.id, {
        ...first,
        reading: {
          ...first.reading,
          type: "milestone_ladder",
          // The widest line's title is the honest one: it names the end state.
          title: widest.reading.title,
          measure: {
            ...(first.reading.measure ?? {}), unit, start, target,
            steps: Math.max(2, Math.min(8, sorted.length)),
          },
          targetDate: first.reading.targetDate ?? widest.reading.targetDate,
        },
      })
      for (const r of group.slice(1)) absorbed.add(r.id)
      merges.push({
        keptRowId: first.id, absorbedRowIds: group.slice(1).map((r) => r.id), kind: "ladder",
        summary: `${sorted.join(" → ")} ${unit}`,
      })
      continue
    }

    // habit_ramp — what escalates is the rhythm.
    const freqs = group.map((r) => r.reading.daysPerWeek)
    if (new Set(freqs).size < 2) continue
    const sorted = [...freqs].sort((a, b) => a - b)
    rewritten.set(first.id, {
      ...first,
      reading: { ...first.reading, daysPerWeek: sorted[sorted.length - 1] },
    })
    for (const r of group.slice(1)) absorbed.add(r.id)
    merges.push({
      keptRowId: first.id, absorbedRowIds: group.slice(1).map((r) => r.id), kind: "ramp",
      summary: `${sorted.join(" → ")}×/week`,
    })
  }

  return {
    rows: rows.filter((r) => !absorbed.has(r.id)).map((r) => rewritten.get(r.id) ?? r),
    merges,
  }
}

/** The ramp phases an escalating rhythm implies — four weeks at each rung. */
export function rampFromEscalation(freqs: number[], weeksPerPhase = 4): HabitRampStep[] {
  const uniq = [...new Set(freqs)].sort((a, b) => a - b)
  return uniq.map((f) => ({ frequencyPerWeek: f, durationWeeks: weeksPerPhase }))
}

/**
 * M3 — read a rhythm however it is written, and refuse to read one where there
 * isn't one. "every meal", "every time", "within a day" and "the same day" all
 * used to be invisible; the first two now stay invisible because the period
 * word must be a real period, and the last two because a bare "a day" needs a
 * count in front of it to be a rhythm at all.
 *
 * Returns the frequency in days per week, plus the title with the rhythm
 * phrase removed. `monthly` marks a cadence that does not belong in the weekly
 * balancer at all.
 */
export function readCadence(text: string): { days: number; monthly: boolean; title: string } | null {
  const cut = (m: RegExpMatchArray) =>
    (text.slice(0, m.index) + text.slice((m.index ?? 0) + m[0].length))
      .replace(/\s*[,;]\s*$/, "").replace(/\s+/g, " ").trim()

  // "3 times a week" · "2 blog posts per week" · "7 hours a night" · "once a week"
  //
  // Runs BEFORE the bare "every <period>" branch: in "talk to 5 customers every
  // week" both patterns match, and the count is the whole point of the line.
  const numAlt = `\\d+(?:\\.\\d+)?|${Object.keys(WORD_NUMERALS).join("|")}`
  const rate = text.match(
    new RegExp(`\\b(${numAlt})\\b\\s*((?:[a-z-]+\\s+){0,3}?)((?:a|an|per|each|every)\\s+([a-z]+))\\b`, "i"),
  )
  if (rate) {
    const n = Number(rate[1]) || WORD_NUMERALS[rate[1].toLowerCase()] || 1
    const middle = rate[2].trim()
    const p = rate[4]
    // What sits between the count and the period decides how much of the line
    // is rhythm. "3 TIMES a week" is all rhythm — the title is what's left.
    // "20 cold EMAILS a week" is a quantity of a thing: cut only "a week", or
    // the goal ends up titled "Send".
    const numeralIsFreq = FREQ_WORDS.test(rate[1])
    const allFreq = middle === "" ? numeralIsFreq : middle.split(/\s+/).every((w) => FREQ_WORDS.test(w))
    const periodOnly: RegExpMatchArray = Object.assign([rate[3]], { index: (rate.index ?? 0) + rate[0].length - rate[3].length })
    const title = cut(allFreq ? rate : periodOnly)
    // A period of "day"/"night" means the rhythm is daily and the count is a
    // quantity ("7 hours a night"). A period of "week" means the count IS the
    // rhythm, floored at daily when the volume exceeds seven ("20 emails a
    // week" needs most days; the count stays in the title).
    if (PERIOD_DAY.test(p)) return { days: 7, monthly: false, title }
    if (PERIOD_WEEK.test(p)) return { days: Math.min(7, Math.max(1, Math.round(n))), monthly: false, title }
    if (PERIOD_MONTH.test(p)) return { days: 1, monthly: true, title }
  }

  // "every day" / "each morning" / "every Sunday" / "every other week"
  const every = text.match(/\b(?:every|each)\s+(?:other\s+)?([a-z]+)\b/i)
  if (every) {
    const p = every[1]
    if (PERIOD_DAY.test(p)) return { days: 7, monthly: false, title: cut(every) }
    if (PERIOD_WEEK.test(p) || WEEKDAY.test(p)) return { days: 1, monthly: false, title: cut(every) }
    if (PERIOD_MONTH.test(p)) return { days: 1, monthly: true, title: cut(every) }
  }

  // "3x/week" · "5x per wk"
  const slash = text.match(/\b(\d+)\s*[x×]\s*(?:\/|per\s+|a\s+)?(?:wk|weeks?)\b/i)
  if (slash) return { days: Math.min(7, Math.max(1, Number(slash[1]))), monthly: false, title: cut(slash) }

  // Bare adverbs, but only as a trailing adverb. "Reach $10,000 monthly
  // recurring revenue" is not a monthly ritual — there, "monthly" is an
  // adjective on the noun that follows it.
  const bare = text.match(/[,\s]\b(daily|nightly|weekly|monthly)\b\s*$/i)
  if (bare) {
    const w = bare[1].toLowerCase()
    if (w === "daily" || w === "nightly") return { days: 7, monthly: false, title: cut(bare) }
    if (w === "weekly") return { days: 1, monthly: false, title: cut(bare) }
    return { days: 1, monthly: true, title: cut(bare) }
  }
  return null
}

// ---------------------------------------------------------------------------
// v25 — the sequential intake.
//
// The order is the source's: debrief the year, commit and audit what has driven
// you, write the vision and everything that hangs off it, break life into areas,
// then set goals. Questions reveal one at a time so the page scrolls instead of
// paginating, and a question counts as revealed once it is answered OR waved
// past, which is what makes "I'm not sure yet" work without stranding anyone.
// ---------------------------------------------------------------------------

/**
 * Has this question been given a real answer? Reads the field the question
 * actually writes, so progress survives a reload and a returning user lands
 * where they stopped rather than at the start.
 *
 * Deliberately NOT consulting `intakeSeen`: seen means "shown and moved past",
 * answered means "there is data". The reveal logic below needs both, separately.
 */
export function isIntakeAnswered(state: VisionPlanState, id: string): boolean {
  const some = (a?: unknown[]) => Array.isArray(a) && a.length > 0
  const text = (s?: string | null) => typeof s === "string" && s.trim().length > 0
  switch (id) {
    case "back_good": return some(state.yearDebrief?.good)
    case "back_challenges": return some(state.yearDebrief?.challenges)
    case "back_lessons": return some(state.yearDebrief?.lessons)
    case "commit": return text(state.committedAt)
    case "values_audit": return some(state.values)
    case "vision": return text(state.visionDraft) || text(state.vision)
    case "perfect_day": return text(state.perfectDay)
    case "purpose": return text(state.drivingForce?.purpose)
    case "identity": return some(state.drivingForce?.identity)
    case "conduct": return some(state.drivingForce?.conduct)
    // The re-design pass is the one that produces away-from values, so their
    // presence is the signal it actually ran. Re-ranking alone leaves no trace
    // distinguishable from the page-1 audit.
    case "values_redesign": return some(state.awayValues)
    // These gates used to ask for state the visible UI never produced, so page 3
    // could not be completed at all. Each one now matches exactly what the
    // editor on that page writes when the user works it.
    case "areas_pick": return some(state.areaRank) || Object.keys(state.areaScope ?? {}).length > 0
      || Object.keys(state.yourTens ?? {}).length > 0
    // One area with BOTH ends written is the real unit of work here. Demanding
    // every area, or a separate purpose gate, meant a user who did the exercise
    // properly still saw a disabled button.
    case "areas_room": return Object.keys(state.yourTens ?? {}).some(
      (id) => text(state.yourTens?.[id]) && text(state.yourZeros?.[id]))
    case "brainstorm": return some(state.rawWants) || some(state.goalInbox) || state.goals.length > 0
    case "qualify": return state.goals.length > 0
    case "action_plan": return state.goals.some((g) => text(g.why) || g.tasks.length > 0 || g.habits.length > 0)
    case "sign": return state.confirmed
    default: return false
  }
}

/** Answered, or waved past with "I'm not sure yet". */
export function isIntakeSettled(state: VisionPlanState, id: string): boolean {
  return isIntakeAnswered(state, id) || (state.intakeSeen ?? []).includes(id)
}

/**
 * Does this question hold everything behind it? An optional question never
 * does. The Perfect Day is an on-ramp for people stuck on the vision box, so
 * leaving it blank must not gate the next question, complete the page, or send
 * a returning user back to it.
 */
function blocksIntake(state: VisionPlanState, q: IntakeQuestion): boolean {
  return !q.optional && !isIntakeSettled(state, q.id)
}

/**
 * The questions to render on a page: every settled one, plus the first that
 * is not. Answering the last visible question re-runs this and the next one
 * mounts, which is the whole no-Next-button mechanic.
 */
export function revealedIntakeQuestions(state: VisionPlanState, page: IntakePageId): IntakeQuestion[] {
  const all = questionsForPage(page)
  const out: IntakeQuestion[] = []
  for (const q of all) {
    out.push(q)
    if (blocksIntake(state, q)) break
  }
  return out
}

/** Every required question on the page is settled, so the page can hand off. */
export function isIntakePageComplete(state: VisionPlanState, page: IntakePageId): boolean {
  return !questionsForPage(page).some((q) => blocksIntake(state, q))
}

/**
 * Page 0 asks you to debrief a year. On a first run there is no year in the
 * system to debrief, so it is offered and skippable. Once there is a completed
 * plan behind the user, the annual re-run treats it as required.
 */
export function isAnnualRerun(state: VisionPlanState): boolean {
  return state.confirmed || !!state.progress
}

export interface IntakePosition {
  page: IntakePageId
  /** The first unsettled question, or null when the whole intake is settled. */
  questionId: string | null
}

/**
 * Where to drop a returning user. The first page holding an unsettled question,
 * and that question. A user mid-plan therefore reopens on the thing they were
 * in the middle of instead of at the beginning.
 *
 * Page 0 is skipped on a first run so a brand new user is not asked to review a
 * year the app knows nothing about.
 */
export function deriveIntakePosition(state: VisionPlanState): IntakePosition {
  const pages = INTAKE_PAGES.filter((p) => !(p.optionalOnFirstRun && !isAnnualRerun(state)))
  for (const page of pages) {
    const q = questionsForPage(page.id).find((x) => blocksIntake(state, x))
    if (q) return { page: page.id, questionId: q.id }
  }
  const last = pages[pages.length - 1]
  return { page: last.id, questionId: null }
}
