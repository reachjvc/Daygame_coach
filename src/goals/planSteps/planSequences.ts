/**
 * THE ORDER OF SCREENS IS DATA (Plans/plan-new-from-real.md, Phase 4.1, decision T2).
 *
 * A sequence is an ordered list of screens. A screen names one of the real tool's twelve steps (the real part that
 * draws it), the address segment it lives at (`/plan/new/<screen id>`), and whether it builds the plan or is used
 * every day. A version to try is one more entry in `SEQUENCES`, not more code.
 *
 * - `section` names one part of a long step (`planSections.ts`): a split step is several screens, each with its own
 *   section id as its address (`/plan/new/star.vision`). `/plan/new/<step>` still works and lands on the step's first
 *   screen. Every section of a split step appears exactly once per sequence, on its path or on its Deepen list.
 * - `deepen` (V2, V3) holds the screens that are not on the walk-through path: they stay one tap away on the plan home's
 *   Deepen list and keep their addresses, so every screen of V1 is on the path or on the Deepen list exactly once.
 * - `prompts` (V3) turns on the short, skippable cards that offer a Deepen screen in place (`DeeperPrompts`).
 *
 * Which sequence is active is a plan answer on the copy space (`start:new:sequence`); without one it is V1.
 */

import { ROUTES } from "@/src/shared/routes"
import { TAB_LABELS, TAB_ORDER, USE_STEPS } from "@/src/goals/data/northStar"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { SEQUENCE_KEY } from "@/src/goals/planSteps/planFacts"
import { STEP_SECTIONS } from "@/src/goals/planSteps/planSections"
import { SECTION_SHORT } from "@/src/goals/planSteps/sectionTitles"

export interface Screen {
  /** The address segment: `/plan/new/<id>`. Unique inside a sequence. */
  id: string
  /** The real step part that draws this screen. */
  step: NorthStarTabId
  /** Which part of the step this screen shows; empty means the whole step (Phase 6.2). */
  section?: string
  /** `build` screens sit in the Frame (Back, save state, Next); `daily` screens run full width. */
  kind: "build" | "daily"
}

export interface Sequence {
  id: string
  label: string
  /** What the version is, in a line (the switcher shows it). */
  blurb: string
  /** The walk-through path, in order. */
  screens: Screen[]
  /** Screens off the path, on the plan home's Deepen list (V2, V3). */
  deepen?: Screen[]
  /** Steps whose own chips do not hold "Next up" once they are started (the wheel's score is optional now). */
  optionalSteps?: NorthStarTabId[]
  /** V3: show the short "go deeper" cards in place, for the areas in the season. */
  prompts?: boolean
}

/** The screens of one step: one per section when the step is split (Phase 6.2), else one for the whole step. */
export function screensOfStep(step: NorthStarTabId): Screen[] {
  const kind = USE_STEPS.includes(step) ? "daily" : "build"
  const sections = (STEP_SECTIONS as Partial<Record<NorthStarTabId, readonly string[]>>)[step]
  if (!sections) return [{ id: step, step, section: "", kind }]
  return sections.map((section): Screen => ({ id: section, step, section, kind }))
}

/** V1: today's twelve steps in the real tool's order, long steps split into short screens by topic. */
const V1: Sequence = {
  id: "v1",
  label: "V1",
  blurb: "Today's order, every part in turn",
  screens: TAB_ORDER.flatMap(screensOfStep),
}

const byId = (id: string): Screen => {
  const screen = V1.screens.find((s) => s.id === id)
  if (!screen) throw new Error(`no screen ${id}`)
  return screen
}

/** The screens of V1 that sit on V2's path, in V2's order: north star first, a quick start, then the daily steps. */
const V2_PATH = ["star.vision", "now", "season.areas", "pick", "season.one-thing", "systems", "track", "today", "journal", "review.open", "review.goals", "review.write"]

/** V2 and V3 share the path; the Deepen list is every other screen of V1, in V1's order. */
const V2_SCREENS = V2_PATH.map(byId)
const V2_DEEPEN = V1.screens.filter((s) => !V2_PATH.includes(s.id))

const V2: Sequence = {
  id: "v2",
  label: "V2",
  blurb: "North star first, a quick start, the rest on a Deepen list",
  screens: V2_SCREENS,
  deepen: V2_DEEPEN,
  optionalSteps: ["now"],
}

const V3: Sequence = {
  id: "v3",
  label: "V3",
  blurb: "Like V2, with short go-deeper cards in place",
  screens: V2_SCREENS,
  deepen: V2_DEEPEN,
  optionalSteps: ["now"],
  prompts: true,
}

export const SEQUENCES: readonly Sequence[] = [V1, V2, V3]
export const DEFAULT_SEQUENCE_ID = V1.id

/** The sequence an id names; an unknown or missing id gives V1. */
export function sequenceById(id: string | null | undefined): Sequence {
  return SEQUENCES.find((s) => s.id === id) ?? V1
}

/** The sequence this plan is trying (the `start:new:sequence` answer), V1 when none. */
export function sequenceOfPlan(plan: Pick<NsPlan, "answers">): Sequence {
  return sequenceById(plan.answers[SEQUENCE_KEY]?.trim())
}

export const screensOf = (seqId: string): Screen[] => sequenceById(seqId).screens

/** Every screen a version has: the path, then the Deepen list. Addresses and jumps find a screen in either. */
export const allScreens = (seq: Sequence): Screen[] => (seq.deepen?.length ? [...seq.screens, ...seq.deepen] : seq.screens)

/** True when the screen is on the Deepen list and not on the path. */
export const isDeepen = (seq: Sequence, screen: Screen): boolean => !!seq.deepen?.some((s) => s.id === screen.id)

/** Whether a section (or an unsplit step's own screen) is on the walk-through path. */
export const onPath = (seq: Sequence, sectionOrStep: string): boolean => seq.screens.some((s) => s.section === sectionOrStep || (!s.section && s.step === sectionOrStep))

/**
 * The screen an address segment names. A bare step id of a split step (`/plan/new/star`, an old link) falls back to the
 * step's first screen in this sequence.
 */
export const screenById = (seq: Sequence, screenId: string): Screen | null =>
  allScreens(seq).find((s) => s.id === screenId) ??
  (TAB_ORDER.includes(screenId as NorthStarTabId) ? allScreens(seq).find((s) => s.step === screenId) ?? null : null)

/** The screen that draws a section, or null when the sequence has none (an area or goal section, or one left out). */
export const screenForSection = (seq: Sequence, section: string): Screen | null => allScreens(seq).find((s) => s.section === section) ?? null

/** The screens of a step in this sequence, in order. */
export const screensForStep = (seq: Sequence, step: NorthStarTabId): Screen[] => allScreens(seq).filter((s) => s.step === step)

/** The list a screen walks along: the path, or (for a Deepen screen) the Deepen list. */
const walkOf = (seq: Sequence, screen: Screen): Screen[] => (isDeepen(seq, screen) ? seq.deepen ?? [] : seq.screens)

export function nextScreen(seq: Sequence, screen: Screen): Screen | null {
  const walk = walkOf(seq, screen)
  const i = walk.findIndex((s) => s.id === screen.id)
  return i >= 0 ? walk[i + 1] ?? null : null
}

export function prevScreen(seq: Sequence, screen: Screen): Screen | null {
  const walk = walkOf(seq, screen)
  const i = walk.findIndex((s) => s.id === screen.id)
  return i > 0 ? walk[i - 1] : null
}

/** The address of a screen. */
export const screenRoute = (_seq: Sequence, screen: Screen): string => `${ROUTES.planNew}/${screen.id}`

/** The first screen that draws a step (a step id names where a jump should land). */
export const screenForStep = (seq: Sequence, step: NorthStarTabId): Screen | null =>
  seq.screens.find((s) => s.step === step) ?? seq.deepen?.find((s) => s.step === step) ?? null

/** The address a jump to a step lands on, or null when the sequence has no screen for it. */
export function stepRoute(seq: Sequence, step: NorthStarTabId): string | null {
  const screen = screenForStep(seq, step)
  return screen ? screenRoute(seq, screen) : null
}

/** The parts of a screen's step along the walk the screen is on: the path, or (for a Deepen screen) the Deepen list. */
export const walkPartsOf = (seq: Sequence, screen: Screen): Screen[] => walkOf(seq, screen).filter((s) => s.step === screen.step)

/** The numbering of the steps in a version: the build steps (the path's first, then those only on the Deepen list), then the daily steps. */
export function stepOrder(seq: Sequence): NorthStarTabId[] {
  const out: NorthStarTabId[] = []
  for (const kind of ["build", "daily"] as const) for (const s of allScreens(seq)) if (s.kind === kind && !out.includes(s.step)) out.push(s.step)
  return out
}

/**
 * What a Back or Next button says for `target`: "Part 2 of 3" when it stays inside a split step (counted along the walk the
 * screen is on), else the step's name; and when the step has several screens, the screen's short name after it, so two
 * buttons that lead to different screens of one step never read alike.
 */
export function navLabel(seq: Sequence, here: Screen, target: Screen): string {
  if (target.step === here.step && target.section) {
    const parts = walkPartsOf(seq, target)
    return `Part ${parts.findIndex((p) => p.id === target.id) + 1} of ${parts.length}`
  }
  if (target.section && screensForStep(seq, target.step).length > 1) return `${TAB_LABELS[target.step] === "Values & identity" ? "Values" : TAB_LABELS[target.step]}: ${SECTION_SHORT[target.section] ?? target.section}`
  return TAB_LABELS[target.step]
}
