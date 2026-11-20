/**
 * ONE FUNCTION FOR EVERY PERCENTAGE AND EVERY "STILL TO FILL IN" CHIP ON `/plan/new`
 * (Plans/plan-new-from-real.md, Phase 6.5, his pick Q6).
 *
 * The real tool counts three times: `stepState` (the ring), `stepParts` (the number and the line under a step's name) and
 * `planTodos` (the chips). They were written apart and they disagree. The walk of 2026-11-18 found, among others:
 *   - North star at 50 % after the paragraph and every box under it were filled (the other half was a ladder of seven
 *     questions that sits behind "Stuck on the blank box?" and is nowhere in the chips);
 *   - the season step "empty" (0 %) while its four answers were written;
 *   - a step with chips that is 100 %, and a step at 40 % with no chip at all (values with one or two ranked).
 *
 * Here each scored step is a list of BOXES. A box says how much of it is filled (`have` of `of`), how much it weighs, and
 * the chip that names what is missing and where to fill it. From that one list come, and only from it:
 *   - the step's fraction and percent (weights add to 1),
 *   - its state (`empty` when no box has anything, `done` when every box is full),
 *   - its parts (for the "NN % · what is left" line),
 *   - its chips.
 * So: done <=> 100 % <=> no chip; empty <=> 0 %; and a chip exists exactly for a box that is not full.
 *
 * The ladder of seven questions on the north star is a way to write the paragraph, not a box of its own: its answers
 * count toward the paragraph until it is written, and the step is done without them (PROPOSED; the owner has not said yes).
 *
 * `/plan` keeps `northStarService`'s own numbers; this is used on `/plan/new` only.
 */

import type { NorthStarTabId, NsAccount, NsPlan } from "@/src/goals/types"
import { NO_ACCOUNT } from "@/src/goals/types"
import { SCORED_TABS, TAB_ORDER } from "@/src/goals/data/northStar"
import { COMMIT_DATE_KEY, COMMIT_KEY, ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import { STAR_WHY_ID } from "@/src/goals/data/northStar"
import * as ns from "@/src/goals/northStarService"
import { VISION_RUNGS } from "@/src/goals/data/lifeMasteryWhy"
import { ratedAreaCount } from "@/src/goals/reviewService"

export interface NumberBox {
  id: string
  /** The part's name, for the line under a step's name ("Areas rated"). */
  label: string
  have: number
  of: number
  /** Its share of the step; a step's weights add to 1. */
  weight: number
  /** What is still missing, in the chip's words. Shown only while the box is not full. */
  chip: string
  /** The screen section that holds the field (`planSections.ts`); the step's first screen when absent. */
  section?: string
}

export interface PlanChip {
  id: string
  text: string
  tab: NorthStarTabId
  section?: string
}

export interface StepNumbers {
  step: NorthStarTabId
  state: ns.NsStepState
  /** 0..1; 1 exactly when `state` is `done`, 0 exactly when it is `empty`. */
  fraction: number
  parts: ns.NsStepPart[]
  boxes: NumberBox[]
  chips: PlanChip[]
}

export interface PlanNumbers {
  /** The same shape `planProgress` has, so every real part that takes one (`StepPicker`, `PlanProgressList`, Due now) agrees. */
  progress: ns.NsPlanProgress
  states: Record<NorthStarTabId, ns.NsStepState>
  steps: Record<NorthStarTabId, StepNumbers>
  /** Every chip, in the real step order: what "Still to fill in" shows. */
  chips: PlanChip[]
  /** Which steps are done, as `nsProgress().done` has it (the step bar reads it). */
  done: Record<NorthStarTabId, boolean>
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The boxes of one scored step. Every box that can be unfilled carries its own chip. */
export function stepBoxes(plan: NsPlan, tab: NorthStarTabId, account: NsAccount, today: string): NumberBox[] {
  const filled = (key: string) => ns.answerOf(plan, key).trim().length > 0
  const single = (id: string, label: string, done: boolean, weight: number, chip: string, section?: string): NumberBox => ({
    id, label, have: done ? 1 : 0, of: 1, weight, chip, section,
  })

  if (tab === "star") {
    const total = ns.starWorkTotal()
    const answered = ns.starWorkAnswered(plan)
    return [
      // The ladder is a way to write the paragraph: lines answered there count toward it until it is written.
      {
        id: "star",
        label: "North star paragraph",
        have: plan.northStar.trim().length > 0 ? 1 : 0.9 * (ns.rungsAnswered(plan) / VISION_RUNGS.length), // never a full box until the paragraph is written
        of: 1,
        weight: 1 / 3,
        chip: "Your north star paragraph",
        section: "star.vision",
      },
      single("why", "Why it matters", filled(STAR_WHY_ID), 1 / 3, "Why that life matters to you", "star.vision"),
      {
        id: "under",
        label: "Questions under the paragraph answered",
        have: answered,
        of: total,
        weight: 1 / 3,
        chip: `${plural(total - answered, "question", "questions")} under the paragraph still blank`,
        section: "star.self",
      },
    ]
  }

  if (tab === "now") {
    const n = plan.areas.length
    const rated = ratedAreaCount(plan, today)
    const pictured = plan.areas.filter((a) => ns.areaReview(plan, a.id).ten.trim().length > 0).length
    return [
      { id: "rated", label: "Areas rated", have: rated, of: n, weight: 1 / 2, chip: `${n - rated} of ${n} areas still unrated` },
      { id: "ten", label: "Areas with a 10 written", have: pictured, of: n, weight: 1 / 2, chip: `${n - pictured} areas with no 10 written` },
    ]
  }

  if (tab === "milestones") {
    const milestones = ns.milestoneGoals(plan)
    if (milestones.length === 0) return [single("first", "First milestone", false, 1, "No goals written yet")]
    const noWhy = milestones.filter((g) => !ns.goalHasWhy(g)).length
    const noDate = milestones.filter((g) => !g.targetDate).length
    return [
      { id: "why", label: "Milestones with a why", have: milestones.length - noWhy, of: milestones.length, weight: 1 / 2, chip: `${noWhy} ${noWhy === 1 ? "goal needs" : "goals need"} a why` },
      { id: "date", label: "Milestones with a date", have: milestones.length - noDate, of: milestones.length, weight: 1 / 2, chip: `${noDate} ${noDate === 1 ? "goal has" : "goals have"} no date` },
    ]
  }

  if (tab === "systems") {
    const n = ns.milestoneGoals(plan).length
    if (n === 0) {
      const any = ns.systemGoals(plan).length > 0 || plan.routines.some((r) => r.steps.length > 0)
      return [single("any", "A system or routine", any, 1, "No system or routine yet")]
    }
    const bare = ns.milestonesWithoutSystems(plan).length
    return [{
      id: "running",
      label: "Milestones with something running at them",
      have: n - bare,
      of: n,
      weight: 1,
      chip: `${bare} ${bare === 1 ? "goal names" : "goals name"} an outcome with no action`,
    }]
  }

  if (tab === "focus") {
    const w = 1 / 8
    return [
      single("areas", "Season areas", plan.seasonAreaIds.length > 0, w, "No season areas picked", "season.areas"),
      single("focus", "Focus area", plan.seasonFocusId != null, w, "No focus area for the season", "season.areas"),
      single("one", "One-thing sentence", account.hasOneThing, w, "The one-thing sentence", "season.one-thing"),
      single("why", "Its why", filled(ONE_ANSWERS.why), w, "Why the one thing matters", "season.why"),
      single("cost", "Its cost", filled(ONE_ANSWERS.cost), w, "What it costs if it does not happen", "season.why"),
      single("identity", "Who it makes you", filled(ONE_ANSWERS.identity), w, "Who you would have to be", "season.who"),
      single("values", "The values it serves", filled(ONE_ANSWERS.values), w, "The values it serves", "season.who"),
      single("goal", "A goal serving the one thing", plan.goals.some((g) => g.servesOneThing), w, "A goal that serves the one thing", "season.one-thing"),
    ]
  }

  if (tab === "values") {
    const have = Math.min(plan.values.length, 3)
    return [{ id: "ranked", label: "Values ranked", have, of: 3, weight: 1, chip: have === 0 ? "Ask yourself what you value most" : "Put three values in order", section: "values.order" }]
  }

  if (tab === "recap") {
    const said = filled(COMMIT_KEY)
    return [
      single("said", "Commitment sentence", said, 1 / 2, "Your commitment sentence", "everything.commit"),
      // A date only counts once there is a sentence for it to be on.
      single("date", "Commitment date", said && filled(COMMIT_DATE_KEY), 1 / 2, "The date you commit", "everything.commit"),
    ]
  }

  return []
}

/** One step's numbers, all from its boxes. */
export function stepNumbers(plan: NsPlan, tab: NorthStarTabId, account: NsAccount = NO_ACCOUNT, today: string = ns.todayISO()): StepNumbers {
  const boxes = stepBoxes(plan, tab, account, today)
  const anything = boxes.some((b) => b.have > 0)
  const everything = boxes.length > 0 && boxes.every((b) => b.have >= b.of)
  const raw = boxes.reduce((sum, b) => sum + (b.of > 0 ? (b.weight * Math.min(b.have, b.of)) / b.of : 0), 0)
  const state: ns.NsStepState = !anything ? "empty" : everything ? "done" : "started"
  // Done is exactly 1 and empty exactly 0, whatever float noise the weights add up to.
  const fraction = state === "done" ? 1 : state === "empty" ? 0 : Math.max(0, Math.min(raw, 0.999999))
  return {
    step: tab,
    state,
    fraction,
    parts: boxes.map(({ label, have, of, weight }) => ({ label, have, of, weight })),
    boxes,
    chips: boxes.filter((b) => b.have < b.of).map((b) => ({ id: `${tab}.${b.id}`, text: b.chip, tab, section: b.section })),
  }
}

/** Every step's numbers at once, and the plan's total. The one source `/plan/new` reads. */
export function planNumbers(plan: NsPlan, account: NsAccount = NO_ACCOUNT, today: string = ns.todayISO()): PlanNumbers {
  const steps = Object.fromEntries(TAB_ORDER.map((tab) => [tab, SCORED_TABS.includes(tab) ? stepNumbers(plan, tab, account, today) : unscored(tab)])) as Record<NorthStarTabId, StepNumbers>
  const scored = TAB_ORDER.filter((tab) => SCORED_TABS.includes(tab))
  const mean = scored.reduce((sum, tab) => sum + steps[tab].fraction, 0) / scored.length
  let mostLeft: NorthStarTabId | null = null
  for (const tab of scored) {
    const left = 1 - steps[tab].fraction
    if (left > 0 && (mostLeft === null || left > 1 - steps[mostLeft].fraction)) mostLeft = tab
  }
  const progress: ns.NsPlanProgress = {
    percent: ns.percentDown(mean),
    steps: Object.fromEntries(scored.map((tab) => [tab, { fraction: steps[tab].fraction, parts: steps[tab].parts }])) as ns.NsPlanProgress["steps"],
    mostLeft,
  }
  return {
    progress,
    states: Object.fromEntries(TAB_ORDER.map((tab) => [tab, steps[tab].state])) as Record<NorthStarTabId, ns.NsStepState>,
    steps,
    chips: TAB_ORDER.flatMap((tab) => steps[tab].chips),
    done: Object.fromEntries(TAB_ORDER.map((tab) => [tab, steps[tab].state === "done"])) as Record<NorthStarTabId, boolean>,
  }
}

/** A step with nothing to fill in (the fork, Track, Today, Journal, Review, the catalogue): never anything but empty. */
function unscored(tab: NorthStarTabId): StepNumbers {
  return { step: tab, state: "empty", fraction: 0, parts: [], boxes: [], chips: [] }
}
