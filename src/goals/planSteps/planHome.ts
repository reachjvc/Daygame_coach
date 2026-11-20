/**
 * THE PLAN HOME OVER THE REAL STEPS (Plans/plan-new-from-real.md, Phase 6.3, his picks Q4 and Q4b).
 *
 * Pure rules, no I/O: which step is "Next up", the one-line Done summary of each step, and which step the home puts on
 * its build list. They read the sequence (`planSequences.ts`) and the one numbers rule (`planNumbers.ts`), so the home,
 * the step picker and "Still to fill in" always say the same thing. There are NO LOCKS (Q4b): every step is open at all
 * times; Next up only suggests.
 *
 * NEXT UP, in this order (the first rule that fits wins):
 *   1. the season has ended            -> the season's first screen ("close this season and start the next")
 *   2. this week's check-in is due     -> the review's first screen
 *   3. a build step is not done        -> the first such step in the sequence's order, on the screen that holds
 *                                         its first missing box; "Start" when nothing of it is written, else "Continue"
 *   4. nothing left                    -> Today
 * Only steps that carry a ring count for rule 3 (the fork, the catalogue and the daily steps have nothing to fill in).
 */

import type { NorthStarTabId, NsAccount, NsPlan } from "@/src/goals/types"
import { SCORED_TABS, TAB_BLURBS, TAB_LABELS } from "@/src/goals/data/northStar"
import { COMMIT_KEY } from "@/src/goals/data/northStarStart"
import { DEFAULT_REVIEW_DAY, dueNow } from "@/src/goals/dueNowService"
import * as ns from "@/src/goals/northStarService"
import { ratedAreaCount } from "@/src/goals/reviewService"
import { onPath, screenForSection, screenRoute, screensForStep, sequenceById, type Screen, type Sequence } from "@/src/goals/planSteps/planSequences"
import { SECTION_TITLES } from "@/src/goals/planSteps/sectionTitles"
import type { SectionId } from "@/src/goals/planSteps/planSections"
import { ROUTES } from "@/src/shared/routes"
import type { PlanNumbers } from "@/src/goals/planSteps/planNumbers"

/** What the account knows that the plan does not: the one thing is the season's sentence. */
export const accountOf = (plan: NsPlan): NsAccount => ({ hasOneThing: !!plan.season?.sentence.trim() })

/** The steps on the home's build list, in the sequence's order, once each. */
export function buildStepsOf(seq: Sequence): NorthStarTabId[] {
  const out: NorthStarTabId[] = []
  for (const s of seq.screens) if (s.kind === "build" && !out.includes(s.step)) out.push(s.step)
  return out
}

/** The daily steps' screens (Today, Track, Journal, Review), first screen of each. */
export function dailyScreensOf(seq: Sequence): Screen[] {
  const out: Screen[] = []
  for (const s of seq.screens) if (s.kind === "daily" && !out.some((o) => o.step === s.step)) out.push(s)
  return out
}

export type NextUp =
  | { kind: "season-ended" | "review-due"; screen: Screen; step: NorthStarTabId }
  | { kind: "build"; screen: Screen; href: string; step: NorthStarTabId; started: boolean; job: string; chip: string | null }
  | { kind: "all-set"; screen: Screen | null; step: "today" }

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/**
 * Where the first thing a step still needs is filled in: the step's first chip decides both the words Next up shows and
 * this address, so they cannot disagree. The chip's section screen, else the area sheet it names, else the step's first screen.
 */
export function targetToFill(seq: Sequence, step: NorthStarTabId, numbers: PlanNumbers): { screen: Screen; href: string } | null {
  const chip = chipsOnPath(seq, step, numbers)[0]
  const first = screensForStep(seq, step)[0]
  const screen = (chip?.section ? screenForSection(seq, chip.section) : null) ?? first
  if (!screen) return null
  if (chip?.areaId) {
    const now = screensForStep(seq, chip.tab)[0] ?? screen
    return { screen: now, href: `${screenRoute(seq, now)}?area=${encodeURIComponent(chip.areaId)}` }
  }
  return { screen, href: screenRoute(seq, screen) }
}

/**
 * The chips of a step that "Next up" may send to. On a version with a Deepen list (V2, V3) a chip whose field sits on a
 * Deepen screen is not a next step (it waits on the list), and a step the version calls optional stops holding "Next up"
 * once anything of it is written. V1 has no list, so every chip counts, as before.
 */
export function chipsOnPath(seq: Sequence, step: NorthStarTabId, numbers: PlanNumbers) {
  const s = numbers.steps[step]
  if (!seq.deepen?.length) return s.chips
  if (seq.optionalSteps?.includes(step) && s.state !== "empty") return []
  return s.chips.filter((c) => (c.section ? onPath(seq, c.section) : onPath(seq, c.tab)))
}

/** The screen of `targetToFill`. */
export const screenToFill = (seq: Sequence, step: NorthStarTabId, numbers: PlanNumbers): Screen | null => targetToFill(seq, step, numbers)?.screen ?? null

export function nextUp(seq: Sequence, plan: NsPlan, numbers: PlanNumbers, today: string): NextUp {
  const cards = dueNow(plan, today, { reviewDay: DEFAULT_REVIEW_DAY, hidden: new Set(), progress: null })
  const first = (step: NorthStarTabId) => screensForStep(seq, step)[0] ?? null
  const ended = cards.find((c) => c.kind === "season-ended")
  const seasonScreen = first("focus")
  if (ended && seasonScreen) return { kind: "season-ended", screen: seasonScreen, step: "focus" }
  const week = cards.find((c) => c.kind === "week")
  const reviewScreen = first("review")
  if (week && reviewScreen) return { kind: "review-due", screen: reviewScreen, step: "review" }
  for (const step of buildStepsOf(seq)) {
    if (!SCORED_TABS.includes(step) || numbers.steps[step].state === "done") continue
    if (chipsOnPath(seq, step, numbers).length === 0) continue
    const target = targetToFill(seq, step, numbers)
    if (!target) continue
    return {
      kind: "build",
      screen: target.screen,
      href: target.href,
      step,
      started: numbers.steps[step].state !== "empty",
      job: lowerFirst(TAB_BLURBS[step]),
      chip: chipsOnPath(seq, step, numbers)[0]?.text ?? null,
    }
  }
  return { kind: "all-set", screen: first("today"), step: "today" }
}

const clip = (text: string, n: number) => {
  const t = text.trim().replace(/\s+/g, " ")
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * THE DONE SUMMARY: one line of what a step holds, in the person's own numbers and words. Empty when nothing is
 * written there. Never a verdict, never a count that the step's own screens do not show.
 */
export function stepSummary(plan: NsPlan, step: NorthStarTabId, today: string): string {
  switch (step) {
    case "star": {
      const text = plan.northStar.trim()
      return text ? `${plan.horizonYears ? `${plan.horizonYears} years out: ` : ""}${clip(text, 90)}` : ""
    }
    case "now": {
      const rated = ratedAreaCount(plan, today)
      const pictured = plan.areas.filter((a) => ns.areaReview(plan, a.id).ten.trim()).length
      return rated + pictured > 0 ? `${rated} of ${plan.areas.length} areas rated · ${pictured} with a 10 written` : ""
    }
    case "milestones": {
      const m = ns.milestoneGoals(plan)
      const dated = m.filter((g) => g.targetDate).length
      return m.length > 0 ? `${plural(m.length, "experience", "experiences")} · ${dated} with a date` : ""
    }
    case "systems": {
      const routines = plan.routines.filter((r) => r.steps.length > 0)
      const steps = routines.reduce((n, r) => n + r.steps.length, 0)
      const weekly = ns.systemGoals(plan).length
      return routines.length + weekly > 0 ? `${plural(routines.length, "routine", "routines")} · ${plural(steps, "step", "steps")} · ${plural(weekly, "weekly goal", "weekly goals")}` : ""
    }
    case "focus": {
      const sentence = plan.season?.sentence.trim() ?? ""
      const areas = plan.seasonAreaIds.map((id) => plan.areas.find((a) => a.id === id)?.label).filter(Boolean)
      return [sentence ? clip(sentence, 90) : "", areas.length ? areas.join(", ") : ""].filter(Boolean).join(" · ")
    }
    case "values":
      return plan.values.length > 0 ? plan.values.slice(0, 3).join(" · ") : ""
    case "recap": {
      const said = ns.answerOf(plan, COMMIT_KEY).trim()
      return said ? clip(said, 90) : ""
    }
    default:
      return ""
  }
}


export interface DeepenItem {
  id: string
  title: string
  /** One line under the title. */
  blurb: string
  href: string
}

/**
 * THE DEEPEN LIST of a version (V2, V3), in V1's order: every screen off the path, plus "Your 10 per area", which is the
 * first part of an area's sheet on the wheel (the score and the 10 are one box in the real tool, so the wheel screen on
 * the path opens it; this entry is the way back to it). Empty for V1, which has no list.
 */
export function deepenItems(seq: Sequence): DeepenItem[] {
  if (!seq.deepen?.length) return []
  const out: DeepenItem[] = []
  for (const screen of sequenceById("v1").screens) {
    if (seq.deepen.some((d) => d.id === screen.id)) {
      out.push({
        id: screen.id,
        title: screen.section ? SECTION_TITLES[screen.section as SectionId] : TAB_LABELS[screen.step],
        blurb: screen.section ? TAB_LABELS[screen.step] : TAB_BLURBS[screen.step],
        href: screenRoute(seq, screen),
      })
    }
    if (screen.id === "now") out.push({ id: "tens", title: "Your 10 per area", blurb: "Open an area on the wheel: its 10 is the first part of its sheet.", href: `${ROUTES.planNew}/now` })
  }
  return out
}
