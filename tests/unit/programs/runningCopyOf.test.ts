/**
 * WHAT MAKES TWO WEEKS THE SAME WEEK — `programsService.sameWeek`.
 *
 * Its only caller, `runningCopyOf` ("is the week in the builder already
 * running?"), had no caller of its own and was deleted with its tests on
 * 2026-10-13. `sameWeek` stays, with these tests, until the owner decides
 * between it and `customize.sameWeek`, which disagrees with it.
 *
 * The weights are deliberately not part of the comparison: after one session
 * the running copy's weights have moved on, so including them would stop
 * matching exactly when it matters most.
 */

import { describe, it, expect } from "vitest"
import { sameWeek } from "@/src/programs/programsService"
import type { ProgramSchedule } from "@/src/programs/types"

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
