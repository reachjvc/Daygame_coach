/**
 * THE SECTIONS OF THE LONG REAL PARTS (Plans/plan-new-from-real.md, Phase 6.2; spec: the split map).
 *
 * A long step is shown as several short screens, each one a SECTION: the real part with only that section's existing
 * blocks drawn. A part takes an optional `section` prop; without it the whole part is drawn, which is "see it all on
 * one page" on `/plan/new` and the only way `/plan` draws it.
 *
 * Ids are kebab-case after a dot, are never renamed once shipped, and are the only thing a sequence refers to.
 * `STEP_SECTIONS` lists them in the render order of the real part; a sequence may put them in any order (Phase 7).
 * Area and goal sections are not screens: they sit inside the area sheet and the goal card, and are picked with the
 * `?part=` address parameter (`AREA_SECTIONS`, `GOAL_SECTIONS`).
 */
import type { NorthStarTabId } from "@/src/goals/types"

export const STEP_SECTIONS = {
  star: ["star.vision", "star.self"],
  focus: ["season.one-thing", "season.why", "season.who", "season.areas", "season.order"],
  values: ["values.so-far", "values.lists", "values.order"],
  recap: ["everything.driving-force", "everything.plan", "everything.links", "everything.check", "everything.commit"],
  review: ["review.open", "review.goals", "review.write"],
} as const satisfies Partial<Record<NorthStarTabId, readonly string[]>>

export const AREA_SECTIONS = ["area.ten", "area.why"] as const
export const GOAL_SECTIONS = ["goal.shape", "goal.why", "goal.do", "goal.stops"] as const

export type StepSectionId = (typeof STEP_SECTIONS)[keyof typeof STEP_SECTIONS][number]
export type AreaSectionId = (typeof AREA_SECTIONS)[number]
export type GoalSectionId = (typeof GOAL_SECTIONS)[number]
export type SectionId = StepSectionId | AreaSectionId | GoalSectionId

/** Every section id, in order: steps, then the area sheet, then the goal card. */
export const ALL_SECTION_IDS: readonly SectionId[] = [
  ...Object.values(STEP_SECTIONS).flat(),
  ...AREA_SECTIONS,
  ...GOAL_SECTIONS,
]

/** The steps that are split over several screens. */
export const SPLIT_STEPS = Object.keys(STEP_SECTIONS) as (keyof typeof STEP_SECTIONS)[]

/** The step a step-section id belongs to, or null (area and goal sections belong to a sheet, not a step). */
export function stepOfSection(id: string): NorthStarTabId | null {
  for (const [step, ids] of Object.entries(STEP_SECTIONS)) if ((ids as readonly string[]).includes(id)) return step as NorthStarTabId
  return null
}

/** The `show(id)` test every split part starts with: no section means the whole part. */
export const showSection = (section: string | undefined | null, id: string): boolean => !section || section === id

/** Where a link that names a place inside a split part lands (the split map, section 0). */
export const ANCHOR_SECTION: Readonly<Record<string, StepSectionId>> = {
  "north-star-paragraph": "star.vision", // STAR_ANCHOR
  "recap-driving-force": "everything.driving-force", // RECAP_DRIVING_ANCHOR
  "recap-commit": "everything.commit", // RECAP_COMMIT_ANCHOR
}
