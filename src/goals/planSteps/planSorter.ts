/**
 * THE SORTER: WHERE A TYPED LINE LANDS (Plans/plan-new-from-real.md, Phase 7, Q8).
 *
 * Systems and Experiences are two halves of one list of goals. A line typed on either is read once (`shapeFromTitle`):
 * a rate ("Two dates a week") is a Practice, filed on Systems; anything else is a one-off, filed on Experiences. A line
 * typed on the other half is therefore filed somewhere the page it was typed on does not list. Today that happens
 * silently (S1). The copy space can try two other ways:
 *   S2: the line moves and says so, with Undo (Undo puts it back where it was typed and keeps it there);
 *   S3: the page asks first ("Something you do every week, or something you want to happen?") and files it as answered.
 * The choice is a plan answer (`SORTER_KEY`); `/plan` always sorts as S1.
 *
 * Pure rules over the plan; the real writers (`addGoalsFromDump`, `setGoalType`) do the filing.
 */

import * as ns from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import { SORTER_KEY } from "@/src/goals/planSteps/planFacts"

export type SorterId = "s1" | "s2" | "s3"
export const SORTERS: readonly { id: SorterId; label: string; blurb: string }[] = [
  { id: "s1", label: "S1", blurb: "Moves silently, as today" },
  { id: "s2", label: "S2", blurb: "Moves and says so, with Undo" },
  { id: "s3", label: "S3", blurb: "Asks first" },
]
export const DEFAULT_SORTER: SorterId = "s1"

/** The two halves a line can be filed on. */
export type Half = "systems" | "experiences"
export const HALF_NAME: Record<Half, string> = { systems: "Systems", experiences: "Experiences" }

export function sorterOfPlan(plan: Pick<NsPlan, "answers">): SorterId {
  const raw = plan.answers[SORTER_KEY]?.trim()
  return SORTERS.some((s) => s.id === raw) ? (raw as SorterId) : DEFAULT_SORTER
}

/** The half a line reads as: a rate is a system, everything else something to have done. */
export const homeOfLine = (title: string): Half => (ns.shapeFromTitle(title).type === "habit_ramp" ? "systems" : "experiences")

/** The lines of a typed text, split by where they read as belonging. */
export function sortLines(text: string, typedOn: Half): { stay: string[]; away: string[] } {
  const stay: string[] = []
  const away: string[] = []
  for (const line of ns.parseGoalDump(text)) (homeOfLine(line) === typedOn ? stay : away).push(line)
  return { stay, away }
}

/** The newest goal in an area with this title, if any. */
const newestGoal = (plan: NsPlan, areaId: string, title: string) =>
  [...plan.goals].reverse().find((g) => g.areaId === areaId && g.title.trim().toLowerCase() === title.trim().toLowerCase())

/** Undo: the line goes back to the half it was typed on, and stays there (its kind is stored, nothing re-reads it). */
export function moveLineTo(plan: NsPlan, areaId: string, title: string, half: Half, now = new Date().toISOString()): NsPlan {
  const goal = newestGoal(plan, areaId, title)
  if (!goal) return plan
  return ns.setGoalType(plan, goal.id, half === "systems" ? "habit_ramp" : "achievement", now)
}

/**
 * File one line on the half the person chose. On the half it reads as, this is exactly what a typed line does today; on
 * the other it is filed as it reads and then flipped with `setGoalType` (the same call Undo uses), which also settles
 * whether it is a prohibition: a quit line ("No weed") answered "Want it to happen" stops being one, so the answer
 * survives a reload.
 */
export function addLineOn(plan: NsPlan, areaId: string, title: string, half: Half, now = new Date().toISOString()): NsPlan {
  const filed = ns.addGoalsFromDump(plan, areaId, title, now)
  return homeOfLine(title) === half ? filed : moveLineTo(filed, areaId, title, half, now)
}

/** The sorter's choice, as a plan with the answer set. */
export const withSorter = (plan: NsPlan, id: SorterId): NsPlan => ns.setAnswer(plan, SORTER_KEY, id)
