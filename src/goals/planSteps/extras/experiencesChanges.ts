/** Things to have done (E4). Pure; thin over the plan's own list functions. */

import { addExperiences, promoteExperience, removeExperience, toggleExperienceDone, updateExperience } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import { addToSeason } from "../planChanges"
import { activeAreas } from "../planFacts"

export const addThing = (plan: NsPlan, title: string, areaId: string | null): NsPlan => addExperiences(plan, title.trim(), areaId)
export const tickThing = (plan: NsPlan, id: string, today: string): NsPlan => toggleExperienceDone(plan, id, today)
export const dropThing = removeExperience
export const setThingArea = (plan: NsPlan, id: string, areaId: string | null): NsPlan => updateExperience(plan, id, { areaId })

/** Chase one this season: it becomes a Finish line goal in the season. Null when it is already chased or has no area to sit in. */
export function chaseThing(plan: NsPlan, id: string): { plan: NsPlan; goalId: string } | null {
  const item = plan.experiences.find((e) => e.id === id)
  if (!item || item.goalId) return null
  const area = item.areaId && plan.areas.some((a) => a.id === item.areaId) ? item.areaId : plan.seasonAreaIds[0] ?? activeAreas(plan)[0]?.id
  if (!area) return null
  const moved = promoteExperience(plan, id, area)
  const goalId = moved.experiences.find((e) => e.id === id)?.goalId
  if (!goalId) return null
  return { plan: addToSeason(moved, goalId), goalId }
}
