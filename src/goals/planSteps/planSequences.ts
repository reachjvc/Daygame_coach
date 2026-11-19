/**
 * THE ORDER OF SCREENS IS DATA (Plans/plan-new-from-real.md, Phase 4.1, decision T2).
 *
 * A sequence is an ordered list of screens. A screen names one of the real tool's twelve steps (the real part that
 * draws it), the address segment it lives at (`/plan/new/<screen id>`), and whether it builds the plan or is used
 * every day. A version to try is one more entry in `SEQUENCES`, not more code.
 *
 * - `section` is empty for now: Phase 6.2 fills it when a long step is split over several screens.
 * - `deeper` is empty for now: Phase 7 (V3) fills it with the short, skippable prompts that appear in place.
 *
 * Which sequence is active is a plan answer on the copy space (`start:new:sequence`); without one it is V1.
 */

import { ROUTES } from "@/src/shared/routes"
import { TAB_ORDER, USE_STEPS } from "@/src/goals/data/northStar"
import type { NorthStarTabId, NsPlan } from "@/src/goals/types"
import { SEQUENCE_KEY } from "@/src/goals/planSteps/planFacts"

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

/** V1: today's twelve steps in the real tool's order. Build and daily split as `NorthStarFlow` splits them. */
const V1: Sequence = {
  id: "v1",
  label: "V1",
  screens: TAB_ORDER.map((step): Screen => ({
    id: step,
    step,
    section: "",
    kind: USE_STEPS.includes(step) ? "daily" : "build",
    deeper: [],
  })),
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

export const screenById = (seq: Sequence, screenId: string): Screen | null => seq.screens.find((s) => s.id === screenId) ?? null

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
