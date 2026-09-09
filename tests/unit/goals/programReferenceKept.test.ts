/**
 * A PROGRAM WITH NO NAMED DAYS IS STILL A PROGRAM YOU STARTED.
 *
 * Both of these returned the plan untouched whenever the day names were empty,
 * which threw away the program reference along with them. Two real cases hit it
 * every time: an endurance program prescribes blocks rather than named days,
 * and a save from the goals planner carries selections with no day names. In
 * both, somebody started a program and their plan went on saying nothing was
 * running — so the Life Mastery week and the training screen disagreed, with no
 * way to tell which was right.
 */

import { describe, it, expect } from "vitest"
import { applyProgramToWorkoutRoutine, emptyNsPlan } from "@/src/goals/northStarService"
import type { NsRoutineProgram } from "@/src/goals/types"

const PROGRAM: NsRoutineProgram = {
  programId: "couch-to-5k",
  enrollmentId: "e1",
  label: "Couch to 5K",
  startedAt: "2026-09-09T10:00:00.000Z",
}

const workoutRoutine = (plan: ReturnType<typeof emptyNsPlan>) =>
  plan.routines.find((r) => r.blueprintId === "workout")

describe("starting a program the plan has no day names for", () => {
  it("still records that the program is running", () => {
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), [], undefined, PROGRAM)
    expect(workoutRoutine(plan)?.program).toMatchObject({ enrollmentId: "e1" })
  })

  it("leaves the days alone rather than blanking a week already written", () => {
    const withDays = applyProgramToWorkoutRoutine(emptyNsPlan(), ["Upper", "Lower"], undefined, PROGRAM)
    const before = workoutRoutine(withDays)!.splitDays.map((d) => d.name)

    const after = applyProgramToWorkoutRoutine(withDays, [], undefined, PROGRAM)
    expect(workoutRoutine(after)!.splitDays.map((d) => d.name)).toEqual(before)
  })

  it("changes nothing at all when there is no program and no days", () => {
    const plan = emptyNsPlan()
    expect(applyProgramToWorkoutRoutine(plan, [], undefined, null)).toBe(plan)
  })

  it("still writes the days when there are some", () => {
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), ["Push", "Pull", "Legs"], undefined, PROGRAM)
    expect(workoutRoutine(plan)!.splitDays.map((d) => d.name)).toEqual(["Push", "Pull", "Legs"])
    expect(workoutRoutine(plan)!.program).toMatchObject({ enrollmentId: "e1" })
  })
})
