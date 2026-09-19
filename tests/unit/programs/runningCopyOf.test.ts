/**
 * IS THE WEEK IN THE BUILDER ALREADY RUNNING?
 *
 * The builder's "started" flag was component state, so it returned to "idle"
 * on any remount, and the design saved in the browser was never marked as
 * started at all. Come back the next day, press the still-armed green Start,
 * and you have silently paused the copy you were three weeks into and begun a
 * fresh one from your typed weights.
 *
 * The weights are deliberately not part of the comparison: after one session
 * the running copy's weights have moved on, so including them would stop
 * matching exactly when it matters most.
 */

import { describe, it, expect } from "vitest"
import { runningCopyOf, sameWeek } from "@/src/programs/programsService"
import type { ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

const lift = (id: string, name: string) => ({
  id,
  name,
  metricType: "load" as const,
  scheme: { kind: "linear" as const, sets: 5, reps: 5 },
  progression: {
    kind: "linear_load" as const,
    incrementKg: 2.5,
    incrementLb: 5,
    deloadAfterFails: 3,
    deloadPct: 0.1,
  },
})

const week = (over: { label?: string; weekday?: number; lifts?: ReturnType<typeof lift>[] } = {}): ProgramSchedule => ({
  kind: "linear_rotation",
  days: [
    {
      id: "d1",
      label: over.label ?? "Full body",
      ...(over.weekday != null ? { weekday: over.weekday } : {}),
      exercises: over.lifts ?? [lift("lib_squat", "Squat"), lift("lib_bench_press", "Bench Press")],
    },
  ],
})

const enrollment = (over: Partial<ProgramEnrollment> = {}): ProgramEnrollment =>
  ({
    id: "e1",
    user_id: "u1",
    program_id: "custom",
    level: "intermediate",
    unitSystem: "kg",
    exerciseState: {},
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
    is_active: true,
    started_at: "2026-09-14T10:00:00.000Z",
    customSchedule: week(),
    ...over,
  }) as ProgramEnrollment

describe("matching a design against what is running", () => {
  it("matches by the id the design recorded", () => {
    const running = enrollment({ id: "e-recorded", customSchedule: week({ label: "Something else" }) })
    // The id wins even when the week has since been edited on the Training page.
    expect(runningCopyOf({ enrollmentId: "e-recorded", schedule: week() }, [running])).toBe(running)
  })

  it("falls back to an equal week when no id was recorded", () => {
    const running = enrollment()
    expect(runningCopyOf({ enrollmentId: null, schedule: week() }, [running])).toBe(running)
  })

  it("never matches a catalogue program, however its week reads", () => {
    const stronglifts = enrollment({ program_id: "stronglifts-5x5" })
    expect(runningCopyOf({ enrollmentId: null, schedule: week() }, [stronglifts])).toBeNull()
  })

  it("does not match a different week", () => {
    const running = enrollment({ customSchedule: week({ label: "Upper" }) })
    expect(runningCopyOf({ enrollmentId: null, schedule: week({ label: "Lower" }) }, [running])).toBeNull()
  })

  it("a recorded id that is no longer running falls through to the week", () => {
    // Ended on the Training page, then rebuilt: the id is stale, the week is not.
    const running = enrollment({ id: "e-new" })
    expect(runningCopyOf({ enrollmentId: "e-ended", schedule: week() }, [running])).toBe(running)
  })

  it("nothing running matches nothing", () => {
    expect(runningCopyOf({ enrollmentId: "e1", schedule: week() }, [])).toBeNull()
  })
})

describe("what makes two weeks the same week", () => {
  it("the weights are not part of it", () => {
    // THE CASE THIS EXISTS FOR: after one session the running copy's weights
    // have moved. A comparison including them would stop matching exactly when
    // it matters most.
    expect(sameWeek(week(), week())).toBe(true)
  })

  it("a renamed day is a different week", () => {
    expect(sameWeek(week({ label: "Upper" }), week({ label: "Lower" }))).toBe(false)
  })

  it("a changed weekday pin is a different week", () => {
    expect(sameWeek(week({ weekday: 1 }), week({ weekday: 4 }))).toBe(false)
    expect(sameWeek(week({ weekday: 1 }), week({ weekday: 1 }))).toBe(true)
  })

  it("a different lift, or a different scheme, is a different week", () => {
    expect(sameWeek(week(), week({ lifts: [lift("lib_squat", "Squat")] }))).toBe(false)

    const heavier = { ...lift("lib_squat", "Squat"), scheme: { kind: "linear" as const, sets: 3, reps: 5 } }
    expect(sameWeek(week({ lifts: [heavier] }), week({ lifts: [lift("lib_squat", "Squat")] }))).toBe(false)
  })

  it("an empty week matches nothing, including another empty one", () => {
    const empty: ProgramSchedule = { kind: "linear_rotation", days: [] }
    expect(sameWeek(empty, empty)).toBe(false)
  })
})
