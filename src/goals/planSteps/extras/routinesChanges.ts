/**
 * THE CHANGES THE ROUTINES SCREENS MAKE (Extra module Routines), as pure functions over `NsPlan`.
 *
 * A new routine starts empty: the old seeding adds a stack of steps in the old wording, which the new
 * version never offers. Steps come from the new library or from the person's own lines.
 */

import type { NsPlan, NsRoutine, NsRoutineKind } from "@/src/goals/types"
import { addCustomStep, updateRoutine, updateStep } from "@/src/goals/northStarService"
import { setStepDays } from "../planChanges"

export const ROUTINE_PICKS = ["morning", "evening", "training", "work", "people", "mind"] as const
export type RoutinePick = (typeof ROUTINE_PICKS)[number]

const BLUEPRINT: Record<RoutinePick, { blueprintId: string; kind: NsRoutineKind }> = {
  morning: { blueprintId: "morning", kind: "sequence" },
  evening: { blueprintId: "night", kind: "sequence" },
  training: { blueprintId: "workout", kind: "weekly" },
  work: { blueprintId: "work", kind: "weekly" },
  people: { blueprintId: "social", kind: "weekly" },
  mind: { blueprintId: "mind", kind: "sequence" },
}

/** Which words-file library a routine draws its step ideas from. */
export function libraryKeyOf(r: Pick<NsRoutine, "blueprintId">): RoutinePick | null {
  const hit = ROUTINE_PICKS.find((k) => BLUEPRINT[k].blueprintId === r.blueprintId)
  return hit ?? null
}

/** The pick a routine was made from, or null for the person's own. */
export const pickOf = libraryKeyOf

export interface StepInput {
  title: string
  minutes: number
  goesTo: string | null
  asks: string | null
}

/** An empty routine, serving every area, with no days yet. `label` is the name shown. */
export function makeRoutine(plan: NsPlan, pick: RoutinePick | "own", label: string): { plan: NsPlan; id: string } | null {
  const name = label.trim()
  if (!name) return null
  const seq = plan.seq + 1
  const id = `r${seq}`
  const base = pick === "own" ? { blueprintId: "", kind: "sequence" as NsRoutineKind } : BLUEPRINT[pick]
  const routine: NsRoutine = {
    id,
    label: name,
    blueprintId: base.blueprintId,
    kind: base.kind,
    areaId: null,
    serves: plan.areas.map((a) => a.id),
    steps: [],
    daysPerWeek: 0,
    splitDays: [],
    program: null,
  }
  return { plan: { ...plan, seq, routines: [...plan.routines, routine], updatedAt: new Date().toISOString() }, id }
}

/**
 * Make every routine in the list the plan lacks: picks it has already (by blueprint) are skipped, and so is
 * an own name it already has. Returns the ids made, in order.
 */
export function addRoutines(plan: NsPlan, picks: { pick: RoutinePick; label: string }[], own: string[]): { plan: NsPlan; ids: string[] } {
  let next = plan
  const ids: string[] = []
  for (const p of picks) {
    if (next.routines.some((r) => r.blueprintId === BLUEPRINT[p.pick].blueprintId)) continue
    const made = makeRoutine(next, p.pick, p.label)
    if (made) { next = made.plan; ids.push(made.id) }
  }
  for (const name of own) {
    if (next.routines.some((r) => r.label.trim().toLowerCase() === name.trim().toLowerCase())) continue
    const made = makeRoutine(next, "own", name)
    if (made) { next = made.plan; ids.push(made.id) }
  }
  return { plan: next, ids }
}

/**
 * Set a routine's steps to this list. A step the routine has by the same title keeps its id, its days and its goals;
 * steps no longer listed go; new ones are added in order. Blank titles are skipped.
 */
export function setRoutineSteps(plan: NsPlan, routineId: string, steps: StepInput[]): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const wanted = steps.map((s) => ({ ...s, title: s.title.trim() })).filter((s) => s.title)
  const keep = new Set(wanted.map((s) => s.title.toLowerCase()))
  let next = updateRoutine(plan, routineId, { steps: routine.steps.filter((s) => keep.has(s.title.trim().toLowerCase())) })
  const placed: string[] = []
  for (const w of wanted) {
    const have = next.routines.find((r) => r.id === routineId)!.steps.find((s) => s.title.trim().toLowerCase() === w.title.toLowerCase())
    if (!have) {
      next = addCustomStep(next, routineId, w.title, w.minutes, 1)
      const made = next.routines.find((r) => r.id === routineId)!.steps.at(-1)!
      placed.push(made.id)
      next = updateStep(next, routineId, made.id, { goesTo: w.goesTo, asks: w.asks?.trim() || null })
    } else {
      placed.push(have.id)
      next = updateStep(next, routineId, have.id, { minutes: w.minutes, goesTo: w.goesTo, asks: w.asks?.trim() || null })
    }
  }
  // The order the person gave is the order of the routine.
  const r2 = next.routines.find((r) => r.id === routineId)!
  const ordered = placed.map((id) => r2.steps.find((s) => s.id === id)!).filter(Boolean)
  return updateRoutine(next, routineId, { steps: ordered })
}

/** An ordered routine: the days and start time of every step, and how many days the routine runs. Days are 0 = Monday. */
export function setRoutineWhen(plan: NsPlan, routineId: string, days: number[], startMin: number | null): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const clean = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
  let next = plan
  for (const s of routine.steps) next = setStepDays(next, s.id, clean, startMin)
  return updateRoutine(next, routineId, { daysPerWeek: clean.length })
}

/** A weekly routine: how many times a week one step runs. */
export function setStepTimes(plan: NsPlan, routineId: string, stepId: string, times: number): NsPlan {
  return updateStep(plan, routineId, stepId, { daysPerWeek: times })
}

/** The training split: day names in order (the program link is not made here). */
export function setSplit(plan: NsPlan, routineId: string, names: string[]): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  let seq = plan.seq
  const days = names.map((n) => n.trim()).filter(Boolean).map((name) => ({ id: `d${++seq}`, name }))
  const next = { ...plan, seq }
  return updateRoutine(next, routineId, { splitDays: days })
}

/** Which areas a routine serves, and which goal (if any) each step moves. */
export function setServes(plan: NsPlan, routineId: string, areaIds: string[], stepGoals: Record<string, string | null>): NsPlan {
  const routine = plan.routines.find((r) => r.id === routineId)
  if (!routine) return plan
  const valid = new Set(plan.areas.map((a) => a.id))
  let next = updateRoutine(plan, routineId, { serves: areaIds.filter((a) => valid.has(a)) })
  const goals = new Set(plan.goals.map((g) => g.id))
  for (const [stepId, goalId] of Object.entries(stepGoals)) {
    if (!routine.steps.some((s) => s.id === stepId)) continue
    next = updateStep(next, routineId, stepId, { servesGoalIds: goalId && goals.has(goalId) ? [goalId] : [] })
  }
  return next
}

/** A step's start time as minutes after midnight, from "HH:MM"; null when it is not a time. */
export function parseClock(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  return h <= 23 && min <= 59 ? h * 60 + min : null
}

export const clockText = (min: number | null): string => (min == null ? "" : `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`)

/** Total rough minutes of an ordered routine. */
export const totalMinutes = (r: NsRoutine): number => r.steps.reduce((n, s) => n + (s.minutes || 0), 0)
