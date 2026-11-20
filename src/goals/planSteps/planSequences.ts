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
 * - `deeper` is empty for now: Phase 7 (V3) fills it with the short, skippable prompts that appear in place.
 *
 * Which sequence is active is a plan answer on the copy space (`start:new:sequence`); without one it is V1.
 */

import { ROUTES } from "@/src/shared/routes"
import { TAB_LABELS, TAB_ORDER, USE_STEPS } from "@/src/goals/data/northStar"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { SEQUENCE_KEY } from "@/src/goals/planSteps/planFacts"
import { STEP_SECTIONS } from "@/src/goals/planSteps/planSections"

/** A short, skippable question that shows up in place (Phase 7). */
export interface DeeperPrompt {
  id: string
}

export interface Screen {
  /** The address segment: `/plan/new/<id>`. Unique inside a sequence. */
  id: string
  /** The real step part that draws this screen. */
  step: NorthStarTabId
  /** Which part of the step this screen shows; empty means the whole step (Phase 6.2). */
  section?: string
  /** `build` screens sit in the Frame (Back, save state, Next); `daily` screens run full width. */
  kind: "build" | "daily"
  deeper?: DeeperPrompt[]
}

export interface Sequence {
  id: string
  label: string
  screens: Screen[]
}

/** The screens of one step: one per section when the step is split (Phase 6.2), else one for the whole step. */
export function screensOfStep(step: NorthStarTabId): Screen[] {
  const kind = USE_STEPS.includes(step) ? "daily" : "build"
  const sections = (STEP_SECTIONS as Partial<Record<NorthStarTabId, readonly string[]>>)[step]
  if (!sections) return [{ id: step, step, section: "", kind, deeper: [] }]
  return sections.map((section): Screen => ({ id: section, step, section, kind, deeper: [] }))
}

/** V1: today's twelve steps in the real tool's order, long steps split into short screens by topic. */
const V1: Sequence = {
  id: "v1",
  label: "V1",
  screens: TAB_ORDER.flatMap(screensOfStep),
}

export const SEQUENCES: readonly Sequence[] = [V1]
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

/**
 * The screen an address segment names. A bare step id of a split step (`/plan/new/star`, an old link) falls back to the
 * step's first screen in this sequence.
 */
export const screenById = (seq: Sequence, screenId: string): Screen | null =>
  seq.screens.find((s) => s.id === screenId) ??
  (TAB_ORDER.includes(screenId as NorthStarTabId) ? seq.screens.find((s) => s.step === screenId) ?? null : null)

/** The screen that draws a section, or null when the sequence has none (an area or goal section, or one left out). */
export const screenForSection = (seq: Sequence, section: string): Screen | null => seq.screens.find((s) => s.section === section) ?? null

/** The screens of a step in this sequence, in order. */
export const screensForStep = (seq: Sequence, step: NorthStarTabId): Screen[] => seq.screens.filter((s) => s.step === step)

export function nextScreen(seq: Sequence, screen: Screen): Screen | null {
  const i = seq.screens.findIndex((s) => s.id === screen.id)
  return i >= 0 ? seq.screens[i + 1] ?? null : null
}

export function prevScreen(seq: Sequence, screen: Screen): Screen | null {
  const i = seq.screens.findIndex((s) => s.id === screen.id)
  return i > 0 ? seq.screens[i - 1] : null
}

/** The address of a screen. */
export const screenRoute = (_seq: Sequence, screen: Screen): string => `${ROUTES.planNew}/${screen.id}`

/** The first screen that draws a step (a step id names where a jump should land). */
export const screenForStep = (seq: Sequence, step: NorthStarTabId): Screen | null => seq.screens.find((s) => s.step === step) ?? null

/** The address a jump to a step lands on, or null when the sequence has no screen for it. */
export function stepRoute(seq: Sequence, step: NorthStarTabId): string | null {
  const screen = screenForStep(seq, step)
  return screen ? screenRoute(seq, screen) : null
}

/** What a Back or Next button says for `target`: the step's name, or "Part 2 of 3" when it stays inside a split step. */
export function navLabel(seq: Sequence, here: Screen, target: Screen): string {
  if (target.step === here.step && target.section) {
    const parts = screensForStep(seq, target.step)
    return `Part ${parts.findIndex((p) => p.id === target.id) + 1} of ${parts.length}`
  }
  return TAB_LABELS[target.step]
}
