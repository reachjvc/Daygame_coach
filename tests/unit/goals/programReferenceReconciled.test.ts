/**
 * THE PLAN CANNOT BE THE AUTHORITY ON WHAT IS RUNNING.
 *
 * The reference was written once, when a program was started from Life
 * Mastery, and removed only by Life Mastery's own End button. Everything else
 * left it wrong:
 *
 *   - End the program on the Training page → the plan still points at a row
 *     that stopped prescribing, and goes on describing it as your week.
 *   - Start a program on your phone → the laptop's plan knows nothing about
 *     it, because the reference lives in that browser's storage.
 *   - Clear your browser data → the link is gone while the program runs on.
 *
 * So the plan reconciles against the database every time it opens. The six
 * cases below are every way that can go, including the two that must change
 * nothing — a failed read is NOT "nothing is running", and an unchanged plan
 * must come back identical so no save fires.
 */

import { describe, it, expect } from "vitest"
import {
  applyProgramToWorkoutRoutine,
  emptyNsPlan,
  reconcileProgramReference,
} from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

const NOW = "2026-09-19T10:00:00.000Z"

const workout = (plan: NsPlan) => plan.routines.find((r) => r.blueprintId === "workout")

const enrollment = (id: string, started_at: string) => ({ id, started_at })

/** A plan already pointing at `enr-1`. */
const tracking = (id = "enr-1") => applyProgramToWorkoutRoutine(emptyNsPlan(), NOW, { enrollmentId: id })

describe("reconciling the plan against what is actually running", () => {
  it("a program ended elsewhere is detached, and the week stays", () => {
    const plan = tracking()
    const after = reconcileProgramReference(plan, [], NOW)

    expect(workout(after)?.program).toBeNull()
    // The week the person wrote is not deleted because a program stopped.
    expect(workout(after)?.splitDays).toEqual(workout(plan)?.splitDays)
    expect(workout(after)?.daysPerWeek).toBe(workout(plan)?.daysPerWeek)
  })

  it("a program started elsewhere is adopted, and gets a routine to live in", () => {
    // The default routine set ships with no workout routine at all, so this is
    // the fresh-browser case: nothing in storage, a program running.
    const after = reconcileProgramReference(emptyNsPlan(), [enrollment("enr-9", "2026-09-18T08:00:00.000Z")], NOW)

    expect(workout(after)).toBeDefined()
    expect(workout(after)?.program).toEqual({ enrollmentId: "enr-9" })
  })

  it("a reference that is still running comes back as the very same object", () => {
    const plan = tracking()
    // Identity, not equality: the effect that calls this writes to storage on
    // any change, so returning a copy would save on every single mount.
    expect(reconcileProgramReference(plan, [enrollment("enr-1", "2026-09-01T08:00:00.000Z")], NOW)).toBe(plan)
  })

  it("two running and none referenced: the most recently started wins", () => {
    const after = reconcileProgramReference(
      emptyNsPlan(),
      [
        enrollment("enr-old", "2026-07-15T08:00:00.000Z"),
        enrollment("enr-new", "2026-09-10T08:00:00.000Z"),
      ],
      NOW
    )
    expect(workout(after)?.program).toEqual({ enrollmentId: "enr-new" })
  })

  it("two running and one referenced: the reference is left alone", () => {
    const plan = tracking("enr-old")
    const after = reconcileProgramReference(
      plan,
      [
        enrollment("enr-old", "2026-07-15T08:00:00.000Z"),
        enrollment("enr-new", "2026-09-10T08:00:00.000Z"),
      ],
      NOW
    )
    // Running two programs at once is a real state. The newer one does not get
    // to hijack a plan that already names the older.
    expect(after).toBe(plan)
  })

  it("nothing running and nothing referenced changes nothing", () => {
    const plan = emptyNsPlan()
    expect(reconcileProgramReference(plan, [], NOW)).toBe(plan)
  })

  it("detaches only the reference that died, not a second one that is fine", () => {
    // Two routines can each name a program; only the dead one goes.
    let plan = tracking("enr-dead")
    const second = plan.routines.find((r) => r.blueprintId !== "workout")!
    plan = {
      ...plan,
      routines: plan.routines.map((r) =>
        r.id === second.id ? { ...r, program: { enrollmentId: "enr-alive" } } : r
      ),
    }

    const after = reconcileProgramReference(plan, [enrollment("enr-alive", "2026-09-01T08:00:00.000Z")], NOW)

    expect(workout(after)?.program).toBeNull()
    expect(after.routines.find((r) => r.id === second.id)?.program).toEqual({ enrollmentId: "enr-alive" })
  })
})
