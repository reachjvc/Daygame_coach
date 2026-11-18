import {
  addBigGoal, addSeasonGoal, addAction, fileBigGoal, setCheckin, setPicture, setProtected, setSeasonAreas, setSeasonEnd, setSeasonFocusSentence,
  setTargetNumbers, markAreasDescribed, setGoalKind,
} from "@/src/goals/planSteps/planChanges"
import { newAccountPlan } from "@/src/goals/planStore"
import type { NsPlan } from "@/src/goals/types"

/** A plan that has finished every core module, built through the same changes the screens make (2026-11-18 is its today). */
export function builtCore(today = "2026-11-18"): NsPlan {
  let p = markAreasDescribed(newAccountPlan())
  p = setPicture(p, "A life I chose", today)
  p = addBigGoal(p, "Run my own business")
  const big = p.goals[0].id
  p = fileBigGoal(p, big, p.areas[0].id, 2030)
  p = setSeasonFocusSentence(p, "Get in shape", today)
  p = setSeasonEnd(p, "2027-02-18", today)
  p = setSeasonAreas(p, [p.areas[0].id])
  const made = addSeasonGoal(p, p.areas[0].id, "Bench 100")!
  p = setGoalKind(made.plan, made.id, "milestone_ladder")
  p = setTargetNumbers(p, made.id, { unit: "kg", from: 80, to: 100, count: 5, shape: "even", by: "2027-02-18" })
  p = { ...p, goals: p.goals.map((g) => (g.id === made.id ? { ...g, feedsGoalIds: [big] } : g)) }
  p = addAction(p, made.id, "Train", 3)
  const step = p.routines.flatMap((r) => r.steps).find((s) => s.title === "Train")!.id
  p = setProtected(p, step)
  p = setCheckin(p, { day: 7, hour: 19 })
  return p
}
