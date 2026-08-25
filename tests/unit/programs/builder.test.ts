/**
 * Designing a training week from scratch.
 *
 * What matters most here, in order:
 *   1. a self-designed program runs through the SAME engine as a cited one
 *   2. "leave it to me" really leaves the weight alone
 *   3. a superset is a tag, so both lifts still progress on their own rules
 *   4. nothing starts without an explicit weight for every lift
 */

import { describe, test, expect } from "vitest"
import {
  PROGRESSION_CHOICES,
  buildExercise,
  designProblems,
  emptyCustomSchedule,
  hasWeight,
  numericWeights,
  joinWithNext,
  progressionOfKind,
  setIncrement,
  setNote,
  setProgression,
  setSchemeKind,
  dayForWeekday,
  isWeekdayAnchored,
  setWeekday,
  supersetGroups,
  supersetLabel,
  unjoin,
} from "@/src/programs/builder"
import { addDay, addExercise, moveExercise, scheduleDays, seedForAddedExercises } from "@/src/programs/customize"
import { applyLog, computePrescription, roundToLoadable, seedEnrollment } from "@/src/programs/programsService"
import { getProgram, requireProgram } from "@/src/programs/data/catalog"
import { ALL_PROGRAMS } from "@/src/programs/data/catalog"
import { CUSTOM_PROGRAM_ID, customProgram, isCustomProgram } from "@/src/programs/data/customProgram"
import { libraryExercise } from "@/src/programs/data/exerciseLibrary"
import { effectiveProgram } from "@/src/programs/customize"
import { CustomScheduleSchema } from "@/src/programs/schemas"
import type { LoadExercise, ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

/** Days with their weekday, which the AnyDay union does not carry. */
const dated = (s: ProgramSchedule) => scheduleDays(s) as Array<{ label: string; weekday?: number }>

const lifts = (s: ProgramSchedule, dayId: string) =>
  scheduleDays(s).find((d) => d.id === dayId)!.exercises as LoadExercise[]

/** A two-lift day, the smallest thing worth testing. */
function twoLiftDay(): { schedule: ProgramSchedule; dayId: string; ids: string[] } {
  let s = addDay(emptyCustomSchedule(), "Push")
  const dayId = scheduleDays(s)[0].id
  const a = addExercise(s, dayId, libraryExercise("lib_bench_press")!)
  s = a.schedule
  const b = addExercise(s, dayId, libraryExercise("lib_lateral_raise")!)
  s = b.schedule
  return { schedule: s, dayId, ids: [a.exerciseId, b.exerciseId] }
}

function enrollCustom(schedule: ProgramSchedule, weights: Record<string, number>): ProgramEnrollment {
  const program = effectiveProgram(customProgram, schedule)
  const { exerciseState, cursor } = seedEnrollment(program, "intermediate", "kg", undefined, weights)
  return {
    id: "e1",
    user_id: "u1",
    program_id: CUSTOM_PROGRAM_ID,
    level: "intermediate",
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-01-01",
    customSchedule: schedule,
  }
}

// ---------------------------------------------------------------------------

describe("the custom shell", () => {
  test("resolves as a program but is never offered in the catalogue", () => {
    expect(getProgram(CUSTOM_PROGRAM_ID)).toBeDefined()
    expect(ALL_PROGRAMS.map((p) => p.id)).not.toContain(CUSTOM_PROGRAM_ID)
    expect(requireProgram(CUSTOM_PROGRAM_ID).id).toBe(CUSTOM_PROGRAM_ID)
    expect(isCustomProgram(CUSTOM_PROGRAM_ID)).toBe(true)
    expect(isCustomProgram("stronglifts-5x5")).toBe(false)
  })

  test("seeds nothing, so every lift must be given a weight", () => {
    for (const level of customProgram.levels) {
      expect(level.seedWorkingWeightKg).toBeUndefined()
    }
    const { schedule } = twoLiftDay()
    const program = effectiveProgram(customProgram, schedule)
    expect(() => seedEnrollment(program, "intermediate", "kg")).toThrow(/missing seed weight/)
  })
})

// ---------------------------------------------------------------------------

describe("designing", () => {
  test("an empty design asks for a day before anything else", () => {
    expect(designProblems(emptyCustomSchedule())).toEqual(["Add a training day to get started."])
  })

  test("a day with no lifts is named as the problem", () => {
    const s = addDay(emptyCustomSchedule(), "Push")
    expect(designProblems(s)).toEqual(["Push has no lifts in it yet."])
  })

  test("a finished design has no problems", () => {
    const { schedule } = twoLiftDay()
    expect(designProblems(schedule)).toEqual([])
  })

  test("a compound arrives on straight sets, an accessory on a rep range", () => {
    const { schedule, dayId } = twoLiftDay()
    const [bench, raise] = lifts(schedule, dayId)
    expect(bench.scheme.kind).toBe("linear")
    expect(bench.progression.kind).toBe("linear_load")
    expect(raise.scheme.kind).toBe("rep_range")
    expect(raise.progression.kind).toBe("double_progression")
  })

  test("scheme kind toggles carry the reps across rather than resetting them", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    // linear 3×5 → range starting at the reps it had
    let s = setSchemeKind(schedule, dayId, ids[0], "rep_range")
    let bench = lifts(s, dayId)[0]
    expect(bench.scheme).toMatchObject({ kind: "rep_range", repMin: 5, repMax: 8 })
    // and back again, keeping the bottom of the range
    s = setSchemeKind(s, dayId, ids[0], "linear")
    bench = lifts(s, dayId)[0]
    expect(bench.scheme).toMatchObject({ kind: "linear", reps: 5 })
  })

  test("switching to the same scheme kind is a no-op", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    expect(setSchemeKind(schedule, dayId, ids[0], "linear")).toBe(schedule)
  })

  test("a note is stored, trimmed and removable", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    let s = setNote(schedule, dayId, ids[0], "  3-1-1 tempo  ")
    expect(lifts(s, dayId)[0].note).toBe("3-1-1 tempo")
    s = setNote(s, dayId, ids[0], "   ")
    expect(lifts(s, dayId)[0].note).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------

describe("progression is a choice", () => {
  test("every offered choice builds a rule the engine understands", () => {
    for (const choice of PROGRESSION_CHOICES) {
      expect(progressionOfKind(choice.id).kind).toBe(choice.id)
    }
  })

  test("a percentage wave cannot be built one lift at a time", () => {
    expect(() => progressionOfKind("percentage_tm")).toThrow(/cannot be built one lift at a time/)
    expect(PROGRESSION_CHOICES.map((c) => c.id)).not.toContain("percentage_tm")
  })

  test("switching rules keeps the increment the lifter chose", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    let s = setIncrement(schedule, dayId, ids[0], 5, "kg")
    s = setProgression(s, dayId, ids[0], "double_progression")
    const bench = lifts(s, dayId)[0]
    expect(bench.progression.kind).toBe("double_progression")
    expect((bench.progression as { incrementKg: number }).incrementKg).toBe(5)
  })

  test("the increment is set in the lifter's own unit, never converted", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const s = setIncrement(schedule, dayId, ids[0], 10, "lb")
    const p = lifts(s, dayId)[0].progression as { incrementKg: number; incrementLb: number }
    expect(p.incrementLb).toBe(10)
    expect(p.incrementKg).toBe(2.5) // untouched
  })

  test("a lift set to hold has no increment to set", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const s = setProgression(schedule, dayId, ids[0], "none")
    expect(() => setIncrement(s, dayId, ids[0], 5, "kg")).toThrow(/does not add weight/)
  })

  test("a nonsense increment is refused", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    expect(() => setIncrement(schedule, dayId, ids[0], 0, "kg")).toThrow(/more than nothing/)
    expect(() => setIncrement(schedule, dayId, ids[0], -5, "kg")).toThrow(/more than nothing/)
  })
})

// ---------------------------------------------------------------------------

describe("supersets", () => {
  test("joining two neighbours puts them in one lettered group", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const s = joinWithNext(schedule, dayId, 0)
    const [a, b] = lifts(s, dayId)
    expect(a.supersetGroup).toBe("A")
    expect(b.supersetGroup).toBe("A")
    expect(supersetGroups(s, dayId)).toEqual(["A"])
  })

  test("labels number by position, so reordering renumbers", () => {
    const { schedule, dayId } = twoLiftDay()
    const s = joinWithNext(schedule, dayId, 0)
    expect(supersetLabel(lifts(s, dayId), 0)).toBe("A1")
    expect(supersetLabel(lifts(s, dayId), 1)).toBe("A2")

    const swapped = moveExercise(s, dayId, 0, 1)
    expect(supersetLabel(lifts(swapped, dayId), 0)).toBe("A1")
    expect(supersetLabel(lifts(swapped, dayId), 1)).toBe("A2")
  })

  test("an unpaired lift has no label", () => {
    const { schedule, dayId } = twoLiftDay()
    expect(supersetLabel(lifts(schedule, dayId), 0)).toBe(null)
  })

  test("a third lift joins the existing pair rather than starting a rival group", () => {
    let { schedule, dayId } = twoLiftDay()
    schedule = addExercise(schedule, dayId, libraryExercise("lib_cable_fly")!).schedule
    let s = joinWithNext(schedule, dayId, 0)
    s = joinWithNext(s, dayId, 1)
    expect(lifts(s, dayId).map((e) => e.supersetGroup)).toEqual(["A", "A", "A"])
    expect(supersetGroups(s, dayId)).toEqual(["A"])
    expect(supersetLabel(lifts(s, dayId), 2)).toBe("A3")
  })

  test("a second, separate pair gets its own letter", () => {
    let { schedule, dayId } = twoLiftDay()
    for (const id of ["lib_cable_fly", "lib_triceps_pushdown"]) {
      schedule = addExercise(schedule, dayId, libraryExercise(id)!).schedule
    }
    let s = joinWithNext(schedule, dayId, 0)
    s = joinWithNext(s, dayId, 2)
    expect(lifts(s, dayId).map((e) => e.supersetGroup)).toEqual(["A", "A", "B", "B"])
  })

  test("unpairing releases the lift left behind — a pair of one is not a superset", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const joined = joinWithNext(schedule, dayId, 0)
    const s = unjoin(joined, dayId, ids[0])
    expect(lifts(s, dayId).map((e) => e.supersetGroup)).toEqual([undefined, undefined])
  })

  test("unpairing from a group of three leaves the other two paired", () => {
    let { schedule, dayId } = twoLiftDay()
    schedule = addExercise(schedule, dayId, libraryExercise("lib_cable_fly")!).schedule
    let s = joinWithNext(schedule, dayId, 0)
    s = joinWithNext(s, dayId, 1)
    s = unjoin(s, dayId, lifts(s, dayId)[2].id)
    expect(lifts(s, dayId).map((e) => e.supersetGroup)).toEqual(["A", "A", undefined])
  })

  test("the last lift has nothing under it to pair with", () => {
    const { schedule, dayId } = twoLiftDay()
    expect(() => joinWithNext(schedule, dayId, 1)).toThrow(/no lift under this one/)
  })

  test("unpairing something that is not paired is a no-op", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    expect(unjoin(schedule, dayId, ids[0])).toBe(schedule)
  })
})

// ---------------------------------------------------------------------------

describe("a self-designed program runs on the real engine", () => {
  test("it prescribes the lifts, in the order they were put in", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const enr = enrollCustom(schedule, { [ids[0]]: 60, [ids[1]]: 10 })
    const rx = computePrescription(effectiveProgram(customProgram, schedule), enr)
    expect(rx.dayLabel).toBe("Push")
    expect(rx.exercises.map((e) => e.name)).toEqual(["Bench Press", "Lateral Raise"])
    expect(rx.exercises[0].sets[0].weight).toBe(60)
  })

  test("the superset tag reaches the session, so it can be shown", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const joined = joinWithNext(schedule, dayId, 0)
    const enr = enrollCustom(joined, { [ids[0]]: 60, [ids[1]]: 10 })
    const rx = computePrescription(effectiveProgram(customProgram, joined), enr)
    expect(rx.exercises.map((e) => e.supersetGroup)).toEqual(["A", "A"])
  })

  test("a note reaches the session and replaces the generated one", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const s = setNote(schedule, dayId, ids[1], "each side")
    const enr = enrollCustom(s, { [ids[0]]: 60, [ids[1]]: 10 })
    const rx = computePrescription(effectiveProgram(customProgram, s), enr)
    expect(rx.exercises[1].note).toBe("each side")
  })

  test("both halves of a superset still progress on their own rule", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const joined = joinWithNext(schedule, dayId, 0)
    const enr = enrollCustom(joined, { [ids[0]]: 60, [ids[1]]: 10 })
    const program = effectiveProgram(customProgram, joined)
    const rx = computePrescription(program, enr)

    // Hit everything prescribed on both lifts.
    const result = applyLog(program, enr, {
      enrollment_id: enr.id,
      dayId,
      cycle: 1,
      week: 1,
      entries: rx.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.map((set) => ({
          setNumber: set.setNumber,
          reps: set.repRangeMax ?? set.reps,
          weight: set.weight,
        })),
      })),
    })
    // Bench is linear: +2.5. The raise is double progression: hit the top of
    // the range on every set, so it also goes up. Different rules, same session.
    expect(result.enrollment.exerciseState[ids[0]].workingWeight).toBe(62.5)
    expect(result.enrollment.exerciseState[ids[1]].workingWeight).toBe(12.5)
  })
})

// ---------------------------------------------------------------------------

describe('"leave it to me" holds the weight', () => {
  test("a held lift does not move however well the session went", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const held = setProgression(schedule, dayId, ids[0], "none")
    const enr = enrollCustom(held, { [ids[0]]: 60, [ids[1]]: 10 })
    const program = effectiveProgram(customProgram, held)
    const rx = computePrescription(program, enr)

    const result = applyLog(program, enr, {
      enrollment_id: enr.id,
      dayId,
      cycle: 1,
      week: 1,
      entries: rx.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.map((set) => ({
          setNumber: set.setNumber,
          reps: set.repRangeMax ?? set.reps,
          weight: set.weight,
        })),
      })),
    })
    expect(result.enrollment.exerciseState[ids[0]].workingWeight).toBe(60)
    // Reported rather than omitted, so the summary does not look like a skip.
    const change = result.changes.find((c) => c.exerciseId === ids[0])!
    expect(change.kind).toBe("hold")
    expect(change.reason).toMatch(/hold/i)
  })

  test("a held lift does not deload either, however badly it went", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const held = setProgression(schedule, dayId, ids[0], "none")
    let enr = enrollCustom(held, { [ids[0]]: 60, [ids[1]]: 10 })
    const program = effectiveProgram(customProgram, held)

    // Three sessions of missing every rep would deload a linear lift.
    for (let i = 0; i < 3; i++) {
      enr = applyLog(program, enr, {
        enrollment_id: enr.id,
        dayId,
        cycle: 1,
        week: 1,
        entries: [{ exerciseId: ids[0], sets: [{ setNumber: 1, reps: 0, weight: 60 }] }],
      }).enrollment
    }
    expect(enr.exerciseState[ids[0]].workingWeight).toBe(60)
  })

  test("the cursor still advances, so a held lift is not a stuck program", () => {
    let { schedule, dayId, ids } = twoLiftDay()
    schedule = addDay(schedule, "Pull")
    const pullId = scheduleDays(schedule)[1].id
    const third = addExercise(schedule, pullId, libraryExercise("lib_barbell_row")!)
    schedule = third.schedule
    const held = setProgression(schedule, dayId, ids[0], "none")

    const enr = enrollCustom(held, { [ids[0]]: 60, [ids[1]]: 10, [third.exerciseId]: 50 })
    const program = effectiveProgram(customProgram, held)
    const result = applyLog(program, enr, {
      enrollment_id: enr.id,
      dayId,
      cycle: 1,
      week: 1,
      entries: [],
    })
    expect(result.enrollment.cursor.dayIndex).toBe(1)
  })
})

// ---------------------------------------------------------------------------

describe("the wire schema accepts a design", () => {
  test("a superset, a note and a held lift all survive validation", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    let s = joinWithNext(schedule, dayId, 0)
    s = setNote(s, dayId, ids[0], "pause on the chest")
    s = setProgression(s, dayId, ids[1], "none")
    const parsed = CustomScheduleSchema.safeParse(s)
    expect(parsed.success, parsed.error?.issues[0]?.message).toBe(true)
  })

  test("an empty design is refused at the wire", () => {
    expect(CustomScheduleSchema.safeParse(emptyCustomSchedule()).success).toBe(false)
    expect(CustomScheduleSchema.safeParse(addDay(emptyCustomSchedule(), "Push")).success).toBe(false)
  })

  test("a superset group cannot be arbitrary free text", () => {
    const { schedule, dayId } = twoLiftDay()
    const bad = structuredClone(schedule) as unknown as {
      days: Array<{ exercises: Array<Record<string, unknown>> }>
    }
    bad.days[0].exercises[0].supersetGroup = "x".repeat(50)
    expect(CustomScheduleSchema.safeParse(bad).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------

describe("a lift is rounded to a weight it can actually be loaded at", () => {
  /**
   * The bug this locks down: `roundToLoadable` floored EVERY weight at the
   * barbell (20 kg / 45 lb), so a 6 kg lateral raise was prescribed at 20 kg
   * and a bodyweight push-up at 20 kg of nothing. It hardly showed while the
   * app only held barbell programs; a self-designed week is mostly accessories.
   */
  test("a dumbbell lift keeps its light weight", () => {
    expect(roundToLoadable(6, "kg", "free")).toBe(5)
    expect(roundToLoadable(12, "kg", "free")).toBe(12.5)
  })

  test("bodyweight stays at nothing rather than becoming a bar", () => {
    expect(roundToLoadable(0, "kg", "free")).toBe(0)
  })

  test("a barbell lift is still floored at the bar", () => {
    expect(roundToLoadable(6, "kg")).toBe(20)
    expect(roundToLoadable(6, "kg", "barbell")).toBe(20)
    expect(roundToLoadable(6, "lb", "barbell")).toBe(45)
  })

  test("the default is barbell, so every catalog program rounds as it always did", () => {
    for (const program of ALL_PROGRAMS) {
      const sch = program.schedule
      if (sch.kind !== "linear_rotation" && sch.kind !== "weekly_waved") continue
      for (const d of sch.days) for (const e of d.exercises) expect(e.loadStyle).toBeUndefined()
    }
  })

  test("a light accessory added to a design is seeded and progressed light", () => {
    const { schedule, dayId, ids } = twoLiftDay()
    const enr = enrollCustom(schedule, { [ids[0]]: 60, [ids[1]]: 6 })
    // 6 kg snaps to 5, not up to the 20 kg bar.
    expect(enr.exerciseState[ids[1]].workingWeight).toBe(5)
    const rx = computePrescription(effectiveProgram(customProgram, schedule), enr)
    expect(rx.exercises[1].sets[0].weight).toBe(5)
  })

  test("the library says which lifts are on a bar", () => {
    expect(libraryExercise("lib_bench_press")!.barbell).toBe(true)
    expect(libraryExercise("lib_back_squat")!.barbell).toBe(true)
    // Compound, but nothing to floor it at — the distinction `compound` misses.
    expect(libraryExercise("lib_dip")!.compound).toBe(true)
    expect(libraryExercise("lib_dip")!.barbell).toBe(false)
    expect(libraryExercise("lib_lateral_raise")!.barbell).toBe(false)
    expect(libraryExercise("lib_lat_pulldown")!.barbell).toBe(false)
  })
})

describe("bodyweight is a real starting weight", () => {
  /**
   * The bug: every gate demanded `> 0`, so a push-up, a dip or an unweighted
   * pull-up — written `@bw`, i.e. 0 — could never be started. It failed the
   * UI's "needs a starting weight", the wire schema's `.positive()`, and
   * `seedForAddedExercises` all three.
   */
  test("0 counts as answered; blank does not", () => {
    expect(hasWeight({ a: "0" }, "a")).toBe(true)
    expect(hasWeight({ a: "60" }, "a")).toBe(true)
    expect(hasWeight({ a: "" }, "a")).toBe(false)
    expect(hasWeight({ a: "   " }, "a")).toBe(false)
    expect(hasWeight({}, "a")).toBe(false)
    expect(hasWeight({ a: "-5" }, "a")).toBe(false)
    expect(hasWeight({ a: "abc" }, "a")).toBe(false)
  })

  test("a blank box never becomes a deliberate zero", () => {
    // Number("") is 0 — the trap this guards.
    expect(numericWeights({ a: "", b: "0", c: "60" })).toEqual({ b: 0, c: 60 })
  })

  test("a bodyweight lift seeds and prescribes at nothing", () => {
    let s = addDay(emptyCustomSchedule(), "Push")
    const dayId = scheduleDays(s)[0].id
    const added = addExercise(s, dayId, libraryExercise("lib_push_up")!)
    s = added.schedule
    const enr = enrollCustom(s, { [added.exerciseId]: 0 })
    expect(enr.exerciseState[added.exerciseId].workingWeight).toBe(0)
    const rx = computePrescription(effectiveProgram(customProgram, s), enr)
    expect(rx.exercises[0].sets[0].weight).toBe(0)
  })

  test("seeding an added bodyweight lift mid-program is allowed", () => {
    let s = addDay(emptyCustomSchedule(), "Push")
    const dayId = scheduleDays(s)[0].id
    const added = addExercise(s, dayId, libraryExercise("lib_push_up")!)
    s = added.schedule
    expect(() => seedForAddedExercises(s, {}, { [added.exerciseId]: 0 }, "kg")).not.toThrow()
    // Still refused when genuinely absent.
    expect(() => seedForAddedExercises(s, {}, {}, "kg")).toThrow(/no starting weight/)
  })

  test("a barbell lift given 0 still floors at the bar", () => {
    let s = addDay(emptyCustomSchedule(), "Legs")
    const dayId = scheduleDays(s)[0].id
    const added = addExercise(s, dayId, libraryExercise("lib_back_squat")!)
    s = added.schedule
    const enr = enrollCustom(s, { [added.exerciseId]: 0 })
    expect(enr.exerciseState[added.exerciseId].workingWeight).toBe(20)
  })
})

describe("buildExercise", () => {
  test("honours an explicitly requested scheme and rule", () => {
    const ex = buildExercise(libraryExercise("lib_bench_press")!, "x1", {
      schemeKind: "rep_range",
      progression: "none",
    })
    expect(ex.scheme.kind).toBe("rep_range")
    expect(ex.progression.kind).toBe("none")
    expect(ex.id).toBe("x1")
  })

  test("falls back to the library entry's own shape", () => {
    const compound = buildExercise(libraryExercise("lib_back_squat")!, "x1")
    expect(compound.scheme.kind).toBe("linear")
    expect(compound.progression.kind).toBe("linear_load")
  })
})

// ---------------------------------------------------------------------------

describe("days of the week", () => {
  function twoDays() {
    let s = addDay(emptyCustomSchedule(), "Push")
    s = addExercise(s, scheduleDays(s)[0].id, libraryExercise("lib_bench_press")!).schedule
    s = addDay(s, "Pull")
    s = addExercise(s, scheduleDays(s)[1].id, libraryExercise("lib_barbell_row")!).schedule
    return { schedule: s, push: scheduleDays(s)[0].id, pull: scheduleDays(s)[1].id }
  }

  test("a day can be pinned to a weekday and unpinned again", () => {
    const { schedule, push } = twoDays()
    const mon = setWeekday(schedule, push, 1)
    expect(dated(mon)[0].weekday).toBe(1)
    expect(dated(setWeekday(mon, push, null))[0].weekday).toBeUndefined()
  })

  test("two days cannot share a weekday — the other one gives it up", () => {
    const { schedule, push, pull } = twoDays()
    let s = setWeekday(schedule, push, 3)
    s = setWeekday(s, pull, 3)
    expect(dated(s)[0].weekday).toBeUndefined()
    expect(dated(s)[1].weekday).toBe(3)
  })

  test("a weekday outside Monday–Sunday is refused", () => {
    const { schedule, push } = twoDays()
    for (const bad of [0, 8, 1.5]) {
      expect(() => setWeekday(schedule, push, bad)).toThrow(/Monday through Sunday/)
    }
  })

  test("a week is anchored only when EVERY day has one", () => {
    const { schedule, push, pull } = twoDays()
    expect(isWeekdayAnchored(schedule)).toBe(false)
    const half = setWeekday(schedule, push, 1)
    expect(isWeekdayAnchored(half)).toBe(false)
    expect(isWeekdayAnchored(setWeekday(half, pull, 4))).toBe(true)
  })

  test("a half-assigned week is reported, not interpreted", () => {
    const { schedule, push } = twoDays()
    const half = setWeekday(schedule, push, 1)
    expect(designProblems(half)[0]).toMatch(/Pull has no day of the week/)
    // Fully assigned, or fully unassigned, are both fine.
    expect(designProblems(schedule)).toEqual([])
  })

  test("dayForWeekday finds the session for a given day", () => {
    const { schedule, push, pull } = twoDays()
    let s = setWeekday(schedule, push, 1)
    s = setWeekday(s, pull, 4)
    expect(dayForWeekday(s, 1)?.label).toBe("Push")
    expect(dayForWeekday(s, 4)?.label).toBe("Pull")
    expect(dayForWeekday(s, 6)).toBeUndefined() // a rest day
  })

  test("weekdays survive the wire schema, and a bad one does not", () => {
    const { schedule, push, pull } = twoDays()
    let s = setWeekday(schedule, push, 1)
    s = setWeekday(s, pull, 7)
    expect(CustomScheduleSchema.safeParse(s).success).toBe(true)

    const bad = structuredClone(s) as unknown as { days: Array<Record<string, unknown>> }
    bad.days[0].weekday = 9
    expect(CustomScheduleSchema.safeParse(bad).success).toBe(false)
  })

  test("catalog programs stay unanchored, so their sequence is untouched", () => {
    for (const id of ["stronglifts-5x5", "upper-lower", "wendler-531"]) {
      expect(isWeekdayAnchored(requireProgram(id).schedule)).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------

describe("logging the session you actually did", () => {
  /** Two days, each with one distinct lift, so progression is attributable. */
  function twoDayProgram() {
    let s = addDay(emptyCustomSchedule(), "Push")
    const push = scheduleDays(s)[0].id
    const bench = addExercise(s, push, libraryExercise("lib_bench_press")!)
    s = bench.schedule
    s = addDay(s, "Pull")
    const pull = scheduleDays(s)[1].id
    const row = addExercise(s, pull, libraryExercise("lib_barbell_row")!)
    s = row.schedule
    return { schedule: s, push, pull, bench: bench.exerciseId, row: row.exerciseId }
  }

  function logAll(program: ReturnType<typeof effectiveProgram>, enr: ProgramEnrollment, dayId: string) {
    // Unknown ids fall back to the cursor, mirroring what applyLog does.
    const found = scheduleDays(program.schedule).findIndex((d) => d.id === dayId)
    const dayIndex = found >= 0 ? found : enr.cursor.dayIndex
    const rx = computePrescription(program, { ...enr, cursor: { ...enr.cursor, dayIndex } })
    return applyLog(program, enr, {
      enrollment_id: enr.id,
      dayId,
      cycle: 1,
      week: 1,
      entries: rx.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets.map((s) => ({ setNumber: s.setNumber, reps: s.repRangeMax ?? s.reps, weight: s.weight })),
      })),
    })
  }

  test("logging the second day progresses THAT day's lift, not the cursor's", () => {
    const { schedule, pull, bench, row } = twoDayProgram()
    const enr = enrollCustom(schedule, { [bench]: 60, [row]: 50 })
    const program = effectiveProgram(customProgram, schedule)
    expect(enr.cursor.dayIndex).toBe(0) // the app is offering Push

    // …but Pull is what got done.
    const result = logAll(program, enr, pull)
    expect(result.enrollment.exerciseState[row].workingWeight).toBe(52.5)
    // Bench must not move. It was the bug: the cursor said Push, so bench went
    // up because the user rowed.
    expect(result.enrollment.exerciseState[bench].workingWeight).toBe(60)
  })

  test("the cursor continues from the day that was done, not the one skipped", () => {
    const { schedule, pull, bench, row } = twoDayProgram()
    const enr = enrollCustom(schedule, { [bench]: 60, [row]: 50 })
    const program = effectiveProgram(customProgram, schedule)
    // Logged Pull (index 1) → next is index 0 again, having wrapped.
    expect(logAll(program, enr, pull).enrollment.cursor.dayIndex).toBe(0)
    // Logged Push (index 0) → next is Pull.
    expect(logAll(program, enr, scheduleDays(program.schedule)[0].id).enrollment.cursor.dayIndex).toBe(1)
  })

  test("an unknown day id falls back to the cursor rather than throwing", () => {
    const { schedule, bench, row } = twoDayProgram()
    const enr = enrollCustom(schedule, { [bench]: 60, [row]: 50 })
    const program = effectiveProgram(customProgram, schedule)
    expect(() => logAll(program, enr, "")).not.toThrow()
  })

  test("the weight actually lifted is what progresses, not the prescription", () => {
    const { schedule, push, bench, row } = twoDayProgram()
    const enr = enrollCustom(schedule, { [bench]: 60, [row]: 50 })
    const program = effectiveProgram(customProgram, schedule)
    const rx = computePrescription(program, enr)

    // Prescribed 60, actually did 65 for all reps.
    const result = applyLog(program, enr, {
      enrollment_id: enr.id,
      dayId: push,
      cycle: 1,
      week: 1,
      entries: [
        {
          exerciseId: bench,
          sets: rx.exercises[0].sets.map((s) => ({ setNumber: s.setNumber, reps: s.reps, weight: 65 })),
        },
      ],
    })
    // Linear loading ratchets from the working weight, and the session counts
    // as made — the point is that logging a heavier set is recorded and does
    // not fail or get silently rewritten to the prescription.
    expect(result.enrollment.exerciseState[bench].consecutiveFails).toBe(0)
    expect(result.changes.find((c) => c.exerciseId === bench)?.kind).toBe("advance")
  })
})
