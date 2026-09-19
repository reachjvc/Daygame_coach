/**
 * THE PLAN STORES WHICH PROGRAM, NOT A COPY OF IT — AND REMEMBERS IT.
 *
 * Two faults, one cause.
 *
 * IT COPIED. Starting a program wrote the program's day names into the plan's
 * own week and set "days a week" to how many there were. The number was
 * visibly wrong — StrongLifts is two day TEMPLATES trained three times a week,
 * so the plan read "2 days a week", and the Recommended Routine read "1×/wk".
 * The names were worse: they were editable in the Systems step, so somebody
 * could rename Workout A to "Chest day" in their plan and the program never
 * heard about it. Two versions of one week, and nothing able to say which was
 * right.
 *
 * IT FORGOT. `loadNsPlan` rebuilt every routine WITHOUT its `program` field, so
 * whatever was written was dropped on the very next page load. The plan has
 * never once remembered which program it follows — start StrongLifts from Life
 * Mastery, reload, and the link is gone with nothing saying so.
 */

import { describe, it, expect } from "vitest"
import {
  applyProgramToWorkoutRoutine,
  emptyNsPlan,
  loadNsPlan,
  serializeNsPlan,
} from "@/src/goals/northStarService"
import type { NsPlan, NsRoutineProgram } from "@/src/goals/types"

const PROGRAM: NsRoutineProgram = { enrollmentId: "e1" }

const workoutRoutine = (plan: NsPlan) => plan.routines.find((r) => r.blueprintId === "workout")

describe("starting a program", () => {
  it("records the reference, and adds the training routine when the plan has none", () => {
    // The default routine set ships without a workout routine, so a program
    // started from a fresh plan used to have nowhere to record itself.
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), undefined, PROGRAM)
    expect(workoutRoutine(plan)?.program).toEqual({ enrollmentId: "e1" })
  })

  it("does not touch the written days or the days-a-week number", () => {
    const before = applyProgramToWorkoutRoutine(emptyNsPlan(), undefined, PROGRAM)
    const routineBefore = workoutRoutine(before)!

    const after = applyProgramToWorkoutRoutine(before, undefined, { enrollmentId: "e2" })
    const routineAfter = workoutRoutine(after)!

    // A hand-written week is not wrong just because a program is running, and
    // it is what the plan returns to when the program ends.
    expect(routineAfter.splitDays).toEqual(routineBefore.splitDays)
    expect(routineAfter.daysPerWeek).toBe(routineBefore.daysPerWeek)
    expect(routineAfter.program).toEqual({ enrollmentId: "e2" })
  })

  it("changes nothing at all when there is no program", () => {
    const plan = emptyNsPlan()
    expect(applyProgramToWorkoutRoutine(plan, undefined, null)).toBe(plan)
  })
})

describe("a reference survives a reload", () => {
  it("is still there after serialize then load", () => {
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), undefined, PROGRAM)

    const reloaded = loadNsPlan(serializeNsPlan(plan))!
    // This is the assertion that failed for the whole life of the feature.
    expect(workoutRoutine(reloaded)?.program).toEqual({ enrollmentId: "e1" })
  })

  it("an older save carrying the copies loads with only the id", () => {
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), undefined, PROGRAM)
    const raw = JSON.parse(serializeNsPlan(plan)) as {
      routines: { blueprintId: string; program?: Record<string, unknown> }[]
    }
    const routine = raw.routines.find((r) => r.blueprintId === "workout")!
    routine.program = {
      enrollmentId: "e1",
      programId: "stronglifts-5x5",
      label: "StrongLifts 5×5",
      startedAt: "2026-07-15T10:00:00.000Z",
    }

    const reloaded = loadNsPlan(JSON.stringify(raw))!
    // The copies are dropped on purpose: the name is read live now, so keeping
    // a stale one is how the plan came to disagree with the Training page.
    expect(workoutRoutine(reloaded)?.program).toEqual({ enrollmentId: "e1" })
  })

  it("a reference with no enrollment id is not a reference", () => {
    const plan = applyProgramToWorkoutRoutine(emptyNsPlan(), undefined, PROGRAM)
    const raw = JSON.parse(serializeNsPlan(plan)) as {
      routines: { blueprintId: string; program?: unknown }[]
    }
    raw.routines.find((r) => r.blueprintId === "workout")!.program = { label: "StrongLifts 5×5" }

    const reloaded = loadNsPlan(JSON.stringify(raw))!
    expect(workoutRoutine(reloaded)?.program).toBeNull()
  })

  it("a plan that never had one loads with none, not undefined", () => {
    const reloaded = loadNsPlan(serializeNsPlan(emptyNsPlan()))!
    for (const routine of reloaded.routines) expect(routine.program ?? null).toBeNull()
  })
})
