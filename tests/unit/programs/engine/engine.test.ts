/**
 * The rebuilt engine, feature by feature (Plans/program-builder.md, Phase 2).
 *
 * Golden equivalence (`golden/goldenSpec.test.ts`) proves the old programs
 * did not change; this file proves what the format ADDS does what it says:
 * calendar weeks, ranges of sets, effort targets, back-offs from today's top
 * set, and the new progression rules.
 */

import { describe, expect, test } from "vitest"
import {
  advance,
  applySession,
  calendarWeek,
  dayForToday,
  deriveFromEarlierSets,
  describeResolved,
  e1rm,
  place,
  prescribe,
  prescribeSlot,
  replay,
  roundLoad,
  rtsPercent,
  seed,
  simulate,
  START_CURSOR,
  type EngineEnrollment,
} from "@/src/programs/engine"
import { checkSpec } from "@/src/programs/spec/schema"
import type { ProgramSpec, SlotSpec } from "@/src/programs/spec/types"
import type { LoggedExercise } from "@/src/programs/types"
import { starscream } from "../../../fixtures/programs/corpus/starscream"

/** A one-day program around the given lifts, checked so a test cannot run on an invalid spec. */
function program(slots: SlotSpec[], calendar: Partial<ProgramSpec["calendar"]> = {}, extra: Partial<ProgramSpec> = {}): ProgramSpec {
  const spec: ProgramSpec = {
    specVersion: 2,
    name: "Test",
    unit: "kg",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat", ...calendar },
    days: [{ id: "d1", label: "Day 1", slots }],
    ...extra,
  }
  const checked = checkSpec(spec)
  if (!checked.ok) throw new Error(checked.problems.join("\n"))
  return spec
}

function enrolled(spec: ProgramSpec, start: Parameters<typeof seed>[1], unit: "kg" | "lb" = "kg"): EngineEnrollment {
  return { id: "e", unitSystem: unit, ...seed(spec, start, unit) }
}

const log = (spec: ProgramSpec, enr: EngineEnrollment, entries: LoggedExercise[], week = enr.cursor.week) =>
  applySession(spec, enr, { enrollment_id: "e", dayId: spec.days[enr.cursor.dayIndex].id, cycle: enr.cursor.cycle, week, entries }, { programId: "t" })

const sets = (...pairs: [number, number][]) => pairs.map(([reps, weight], i) => ({ setNumber: i + 1, reps, weight }))

// ---------------------------------------------------------------------------

describe("the calendar", () => {
  test("weeks by the calendar are Monday-to-Sunday from the week the program started", () => {
    expect(calendarWeek("2026-10-19", "2026-10-19")).toBe(1)
    expect(calendarWeek("2026-10-19", "2026-10-25")).toBe(1)
    expect(calendarWeek("2026-10-19", "2026-10-26")).toBe(2)
    expect(calendarWeek("2026-10-21", "2026-10-26")).toBe(2)
    expect(calendarWeek("2026-10-19", "2027-01-04")).toBe(12)
    expect(calendarWeek("2026-10-19", "2026-10-01")).toBe(1)
  })

  test("a weekday program on a rest day names the next session, and Saturday's next is next week's Monday", () => {
    const spec = starscream.spec
    expect(dayForToday(spec, 3)).toEqual({ dayIndex: 2, restDay: false, scheduledWeekday: 3, wrapsIntoNextWeek: false })
    expect(dayForToday(spec, 6)).toEqual({ dayIndex: 0, restDay: true, scheduledWeekday: 1, wrapsIntoNextWeek: true })
    const sat = place(spec, START_CURSOR, { startedOn: "2026-10-19", clock: { today: "2026-10-24", todayWeekday: 6 } })
    expect(sat).toMatchObject({ dayIndex: 0, restDay: true, week: 2 })
  })

  test("Starscream finishes after week 12; the same program set to repeat goes on to cycle 2", () => {
    const spec = starscream.spec
    const last = place(spec, START_CURSOR, { startedOn: "2026-10-19", clock: { today: "2027-01-08", todayWeekday: 5 } })
    expect(last).toMatchObject({ week: 12, complete: false, dayIndex: 4 })
    const after = place(spec, START_CURSOR, { startedOn: "2026-10-19", clock: { today: "2027-01-11", todayWeekday: 1 } })
    expect(after).toMatchObject({ week: 13, complete: true })
    const looping = { ...spec, calendar: { ...spec.calendar, atEnd: "repeat" as const } }
    expect(place(looping, START_CURSOR, { startedOn: "2026-10-19", clock: { today: "2027-01-11", todayWeekday: 1 } })).toMatchObject({ week: 1, cycle: 2, complete: false })
  })

  test("by workouts completed, a finishing program runs one past its last week and is then complete", () => {
    const spec = program([{ id: "s", lift: { lib: "lib_bench_press" }, sets: [{ id: "w", kind: "working", count: 3, reps: 5, load: { from: "working" } }], progression: { kind: "hold" } }], { lengthWeeks: 2, atEnd: "finish" })
    let cursor = START_CURSOR
    cursor = advance(spec, cursor, 0)
    expect(cursor).toMatchObject({ week: 2, sessionCount: 1 })
    cursor = advance(spec, cursor, 0)
    expect(cursor).toMatchObject({ week: 3, sessionCount: 2 })
    expect(place(spec, cursor).complete).toBe(true)
  })

  test("phases, deload and test weeks are named on the week they cover", () => {
    const spec = program(
      [{ id: "s", lift: { lib: "lib_bench_press" }, sets: [{ id: "w", kind: "working", count: 3, reps: 5, load: { from: "working" } }], progression: { kind: "hold" } }],
      { lengthWeeks: 6, phases: [{ label: "Base", weeks: "1-3" }, { label: "Peak", weeks: "4-6" }], deloadWeeks: "3", testWeeks: "6" }
    )
    expect(place(spec, { ...START_CURSOR, week: 3 })).toMatchObject({ phase: "Base", deload: true, test: false })
    expect(place(spec, { ...START_CURSOR, week: 6 })).toMatchObject({ phase: "Peak", deload: false, test: true })
    const enr = enrolled(spec, { working: { s: 100 } })
    expect(prescribe(spec, { ...enr, cursor: { ...START_CURSOR, week: 3 } }, { programId: "t" })).toMatchObject({ phase: "Base", deloadWeek: true, periodised: true })
  })
})

// ---------------------------------------------------------------------------

describe("what a lift asks for", () => {
  test("a range of sets prescribes its low end and says how far it goes", () => {
    const spec = program([{ id: "s", lift: { lib: "lib_bench_press" }, sets: [{ id: "w", kind: "working", count: { min: 3, max: 5 }, reps: { min: 5, max: 10 }, load: { from: "working" } }], progression: { kind: "hold" } }])
    const ex = prescribeSlot(spec, spec.days[0].slots[0], 1, enrolled(spec, { working: { s: 100 } }))
    expect(ex.sets).toHaveLength(3)
    expect(ex.groups).toEqual([{ id: "w", kind: "working", countMin: 3, countMax: 5 }])
    expect(describeResolved(ex)).toBe("3-5x5-10@100")
  })

  test("an effort target sits on every set, or on the last one only; a cap is a ceiling", () => {
    const spec = program([
      { id: "a", lift: { lib: "lib_bench_press" }, sets: [{ id: "w", kind: "working", count: 3, reps: 5, load: { from: "effort" }, effort: { rpe: { min: 7, max: 8 } } }], progression: { kind: "by-effort" } },
      { id: "b", lift: { lib: "lib_ohp" }, sets: [{ id: "w", kind: "working", count: 4, reps: 6, load: { from: "choose" }, effort: { rir: 1, lastSetOnly: true, cap: true } }], progression: { kind: "hold" } },
    ])
    const enr = enrolled(spec, {})
    const a = prescribeSlot(spec, spec.days[0].slots[0], 1, enr)
    expect(a.sets.map((s) => [s.rpe, s.rpeMax, s.pick])).toEqual([[7, 8, "effort"], [7, 8, "effort"], [7, 8, "effort"]])
    const b = prescribeSlot(spec, spec.days[0].slots[1], 1, enr)
    expect(b.sets.map((s) => s.rir ?? null)).toEqual([null, null, null, 1])
    expect(b.sets[3].cap).toBe(true)
    expect(describeResolved(b)).toBe("4x6@? rir<=1(last)")
  })

  test("a week change replaces only what it names, only in its weeks; `skip` drops the group", () => {
    const spec = program(
      [
        {
          id: "s",
          lift: { lib: "lib_bench_press" },
          sets: [
            { id: "top", kind: "top", count: 1, reps: { min: 2, max: 5 }, load: { from: "effort" }, effort: { rpe: 8.5 } },
            { id: "back", kind: "backoff", count: 3, reps: 8, load: { from: "set", group: "top", pct: 0.8 } },
          ],
          weeks: [
            { weeks: "12", set: "top", reps: { min: 1, max: 5 }, effort: { rpe: 9 } },
            { weeks: "4", set: "back", skip: true },
          ],
          progression: { kind: "by-effort", group: "top" },
        },
      ],
      { lengthWeeks: 12, atEnd: "finish" }
    )
    const enr = enrolled(spec, {})
    const at = (w: number) => describeResolved(prescribeSlot(spec, spec.days[0].slots[0], w, enr))
    expect(at(1)).toBe("1x2-5@? rpe8.5, 3x8@?")
    expect(at(12)).toBe("1x1-5@? rpe9, 3x8@?")
    expect(at(4)).toBe("1x2-5@? rpe8.5")
  })

  test("a pyramid lists its sets; a percentage of another lift's working weight; a fixed amount on top", () => {
    const spec = program([
      { id: "sq", lift: { lib: "lib_back_squat" }, sets: [{ id: "w", kind: "working", count: 3, reps: 5, load: { from: "working" }, perSet: [{ pct: 0.8 }, { pct: 0.9, reps: 3 }, { pct: 1, reps: { atLeast: 1 } }] }], progression: { kind: "hold" } },
      { id: "fs", lift: { lib: "lib_front_squat" }, sets: [{ id: "w", kind: "working", count: 3, reps: 5, load: { from: "working", of: "sq", pct: 0.7, plus: { kg: 2.5, lb: 5 } } }], progression: { kind: "hold" } },
    ])
    const enr = enrolled(spec, { working: { sq: 100 } })
    expect(describeResolved(prescribeSlot(spec, spec.days[0].slots[0], 1, enr))).toBe("1x5@80, 1x3@90, 1x1+@100")
    expect(describeResolved(prescribeSlot(spec, spec.days[0].slots[1], 1, enr))).toBe("3x5@72.5")
  })

  test("a percentage of a max says which max it is working from", () => {
    const spec = program([{ id: "b", lift: { lib: "lib_bench_press" }, sets: [{ id: "w", kind: "working", count: 1, reps: 5, load: { from: "max", max: "rm", pct: 0.85 } }], progression: { kind: "hold" } }], {}, { maxes: [{ lift: "b", kind: "rm", reps: 5 }] })
    const ex = prescribeSlot(spec, spec.days[0].slots[0], 1, enrolled(spec, { maxes: { b: 100 } }))
    expect(ex.note).toBe("5RM 100kg")
    expect(describeResolved(ex)).toBe("1x5@85")
  })

  test("bodyweight, bodyweight plus, timed holds and a rep total", () => {
    const spec = program([
      { id: "p", lift: { lib: "lib_pull_up" }, sets: [{ id: "w", kind: "working", count: 3, reps: 8, load: { from: "bodyweight" } }], progression: { kind: "hold" } },
      { id: "d", lift: { lib: "lib_dip" }, sets: [{ id: "w", kind: "working", count: 3, reps: 8, load: { from: "bodyweight", plusKg: 10 } }], progression: { kind: "hold" } },
      { id: "h", lift: { lib: "lib_plank" }, sets: [{ id: "w", kind: "working", count: 3, reps: { seconds: { min: 30, max: 45 } }, load: { from: "bodyweight" } }], progression: { kind: "hold" } },
      { id: "c", lift: { lib: "lib_chin_up" }, sets: [{ id: "w", kind: "working", count: 1, reps: { total: 100 }, load: { from: "bodyweight" } }], progression: { kind: "hold" } },
    ])
    const enr = enrolled(spec, {})
    const [p, d, h, c] = spec.days[0].slots.map((s) => prescribeSlot(spec, s, 1, enr))
    expect(describeResolved(p)).toBe("3x8@bw")
    expect(d.bodyweight).toBeUndefined()
    expect(d.sets[0].weight).toBe(10)
    expect(h.repUnit).toBe("sec")
    expect(describeResolved(h)).toBe("3x30-45s@bw")
    expect(describeResolved(c)).toBe("1xt100@bw")
  })

  test("a program's own rounding rounds bar weights like a spreadsheet; dumbbells keep their own precision", () => {
    const nearest = { unit: "kg" as const, rounding: { stepKg: 2.5, mode: "nearest" as const } }
    expect(roundLoad(84, "barbell", nearest)).toBe(85)
    expect(roundLoad(84, "barbell", { unit: "kg" })).toBe(82.5)
    expect(roundLoad(14, "barbell", nearest)).toBe(20)
    expect(roundLoad(13.3, "free", nearest)).toBe(13.5)
    // The gym's own plates when the program says nothing: a 15 kg bar and 2.5 kg plates.
    expect(roundLoad(41, "barbell", { unit: "kg", plates: { barWeight: 15, smallestPlate: 2.5 } })).toBe(40)
  })
})

// ---------------------------------------------------------------------------

describe("back-offs from today's top set", () => {
  const spec = starscream.spec
  const enr = enrolled(spec, {})
  const monday = () => prescribe(spec, enr, { programId: "starscream", dayIndex: 0 }).exercises

  test("before the top set is done the range is unknown, not 0 kg", () => {
    const bench = monday()[0]
    const back = bench.sets.filter((s) => s.groupId === "back")
    expect(back.every((s) => s.weight === 0 && s.derive?.group === "top")).toBe(true)
    expect(describeResolved(bench)).toBe("1x2-5@? rpe8.5, 3-5x5-10@?")
  })

  test("the moment the top set is ticked, the range is 70–80% of it, rounded as the sheet rounds", () => {
    const ctx = { unit: "kg" as const, rounding: spec.rounding }
    const [bench] = deriveFromEarlierSets(monday(), [{ slot: "mon_bench", groupId: "top", weight: 105, reps: 4 }], ctx)
    // mround(105 × 0.7, 2.5) = 72.5; mround(105 × 0.8, 2.5) = 85.
    expect(bench.sets.filter((s) => s.groupId === "back").map((s) => [s.weight, s.weightMax])).toEqual([[72.5, 85], [72.5, 85], [72.5, 85]])
  })

  test("the heaviest top set counts, and a set with no group is matched by its row", () => {
    const ctx = { unit: "kg" as const, rounding: spec.rounding }
    const [bench] = deriveFromEarlierSets(
      monday(),
      [
        { slot: "mon_bench", groupId: "top", weight: 100, reps: 5 },
        { slot: "mon_bench", setNumber: 1, weight: 110, reps: 3 },
      ],
      ctx
    )
    expect(bench.sets[1]).toMatchObject({ weight: 77.5, weightMax: 87.5 })
  })

  test("a back-off can be worked out from another lift done earlier the same day", () => {
    const two = program([
      { id: "dl", lift: { lib: "lib_deadlift" }, sets: [{ id: "top", kind: "top", count: 1, reps: 3, load: { from: "effort" }, effort: { rpe: 9 } }], progression: { kind: "by-effort" } },
      { id: "rdl", lift: { lib: "lib_rdl" }, sets: [{ id: "w", kind: "working", count: 3, reps: 8, load: { from: "set", slot: "dl", group: "top", pct: 0.5 } }], progression: { kind: "hold" } },
    ])
    const day = prescribe(two, enrolled(two, {}), { programId: "t" }).exercises
    const filled = deriveFromEarlierSets(day, [{ slot: "dl", groupId: "top", weight: 200, reps: 3 }], { unit: "kg" })
    expect(filled[1].sets[0]).toMatchObject({ weight: 100 })
  })
})

// ---------------------------------------------------------------------------

describe("the new progression rules", () => {
  const amrap = (rule: SlotSpec["progression"]): SlotSpec => ({
    id: "s",
    lift: { lib: "lib_bench_press" },
    sets: [
      { id: "w", kind: "working", count: 2, reps: 5, load: { from: "working" } },
      { id: "plus", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working" } },
    ],
    progression: rule,
  })

  test("an AMRAP table reads the all-out set's reps and picks the jump", () => {
    const spec = program([amrap({ kind: "amrap-table", group: "plus", table: [{ minReps: 5, inc: { kg: 2.5, lb: 5 } }, { minReps: 10, inc: { kg: 5, lb: 10 } }], target: "working", failsBeforeDrop: 1, dropPct: 0.1 })])
    const enr = enrolled(spec, { working: { s: 100 } })
    expect(log(spec, enr, [{ exerciseId: "s", sets: sets([5, 100], [5, 100], [7, 100]) }]).enrollment.exerciseState.s.workingWeight).toBe(102.5)
    expect(log(spec, enr, [{ exerciseId: "s", sets: sets([5, 100], [5, 100], [12, 100]) }]).enrollment.exerciseState.s.workingWeight).toBe(105)
    const missed = log(spec, enr, [{ exerciseId: "s", sets: sets([5, 100], [5, 100], [3, 100]) }])
    expect(missed.enrollment.exerciseState.s.workingWeight).toBe(90)
    expect(missed.changes[0]).toMatchObject({ kind: "deload", reason: "1 miss on the all-out set → back off 10%" })
  })

  test("a bump per extra rep: by weight, capped; or by a percentage of the max", () => {
    const byWeight = program([amrap({ kind: "per-extra-rep", group: "plus", standard: 5, perRep: { kg: 1, lb: 2.5 }, capReps: 3, target: "working" })])
    const enr = enrolled(byWeight, { working: { s: 100 } })
    expect(log(byWeight, enr, [{ exerciseId: "s", sets: sets([5, 100], [5, 100], [10, 100]) }]).enrollment.exerciseState.s.workingWeight).toBe(103)
    const byPct = program(
      [
        {
          id: "s",
          lift: { lib: "lib_bench_press" },
          sets: [{ id: "plus", kind: "amrap", count: 1, reps: { atLeast: 6 }, load: { from: "max", max: "1rm", pct: 0.65 } }],
          progression: { kind: "per-extra-rep", group: "plus", standard: 6, pct: 0.01, target: "max" },
        },
      ],
      {},
      { maxes: [{ lift: "s", kind: "1rm" }] }
    )
    const e2 = enrolled(byPct, { maxes: { s: 200 } })
    // 3 reps past 6, at 1% of 200 each: 206. The max is a number to work from and is not rounded.
    expect(log(byPct, e2, [{ exerciseId: "s", sets: sets([9, 130]) }]).enrollment.exerciseState.s.oneRepMax).toBe(206)
  })

  test("stages hold the weight and change the scheme on a miss, then restart from the last stage-1 weight", () => {
    const stage = (count: number, reps: number) => [{ id: "t", kind: "working" as const, count, reps: { atLeast: reps }, load: { from: "working" as const } }]
    const spec = program([{ id: "s", lift: { lib: "lib_back_squat" }, sets: stage(5, 3), progression: { kind: "stages", stages: [stage(5, 3), stage(6, 2), stage(10, 1)], inc: { kg: 5, lb: 10 }, onFailLast: { resetInc: { kg: 7.5, lb: 15 } } } }])
    let enr = enrolled(spec, { working: { s: 100 } })
    enr = log(spec, enr, [{ exerciseId: "s", sets: sets(...Array.from({ length: 5 }, () => [3, 100] as [number, number])) }]).enrollment
    expect(enr.exerciseState.s).toMatchObject({ workingWeight: 105, stage: 0, stageOneWeight: 100 })
    enr = log(spec, enr, [{ exerciseId: "s", sets: sets([3, 105], [2, 105]) }]).enrollment
    expect(enr.exerciseState.s).toMatchObject({ workingWeight: 105, stage: 1 })
    expect(describeResolved(prescribeSlot(spec, spec.days[0].slots[0], 1, enr))).toBe("6x2+@105")
    enr = log(spec, enr, [{ exerciseId: "s", sets: sets([1, 105]) }]).enrollment
    enr = log(spec, enr, [{ exerciseId: "s", sets: sets([0, 105]) }]).enrollment
    expect(enr.exerciseState.s).toMatchObject({ workingWeight: 107.5, stage: 0 })
  })

  test("a retest after the last stage asks for a new max, then restarts at a share of it", () => {
    const stage = (count: number, reps: number) => [{ id: "t", kind: "working" as const, count, reps: { atLeast: reps }, load: { from: "working" as const } }]
    const spec = program([{ id: "s", lift: { lib: "lib_back_squat" }, sets: stage(5, 3), progression: { kind: "stages", stages: [stage(5, 3), stage(10, 1)], inc: { kg: 5, lb: 10 }, onFailLast: { retest: true, resetPct: 0.85 } } }])
    let enr = enrolled(spec, { working: { s: 100 } })
    enr = { ...enr, exerciseState: { s: { ...enr.exerciseState.s, stage: 1 } } }
    const failed = log(spec, enr, [{ exerciseId: "s", sets: sets([0, 100]) }])
    enr = failed.enrollment
    expect(enr.exerciseState.s.needsRetest).toBe(true)
    expect(prescribeSlot(spec, spec.days[0].slots[0], 1, enr).sets[0]).toMatchObject({ pick: "choose", kind: "top" })
    enr = log(spec, enr, [{ exerciseId: "s", sets: sets([5, 120]) }]).enrollment
    expect(enr.exerciseState.s).toMatchObject({ workingWeight: 102.5, stage: 0, needsRetest: false })
  })

  test("by effort keeps an estimated max from the reps and RPE, and suggests the next top set from it", () => {
    const spec = program([{ id: "s", lift: { lib: "lib_bench_press" }, sets: [{ id: "top", kind: "top", count: 1, reps: 5, load: { from: "effort" }, effort: { rpe: 8 } }], progression: { kind: "by-effort", group: "top" } }])
    const enr = log(spec, enrolled(spec, {}), [{ exerciseId: "s", sets: [{ setNumber: 1, reps: 5, weight: 100, rpe: 8, groupId: "top" }] }]).enrollment
    // 5 @ RPE 8 is 81.1% of a max: 100 / 0.811 = 123.3.
    expect(enr.exerciseState.s.e1rm).toBe(123.3)
    expect(prescribeSlot(spec, spec.days[0].slots[0], 1, enr).sets[0].suggested).toBe(100)
  })

  test("one more set each week, up to the most the rule allows", () => {
    const spec = program([{ id: "s", lift: { lib: "lib_barbell_curl" }, sets: [{ id: "w", kind: "working", count: 2, reps: { min: 10, max: 15 }, load: { from: "choose" } }], progression: { kind: "add-set-per-week", maxSets: 4 } }], { lengthWeeks: 5, atEnd: "finish" })
    const enr = enrolled(spec, {})
    expect([1, 2, 3, 4, 5].map((w) => prescribeSlot(spec, spec.days[0].slots[0], w, enr).sets.length)).toEqual([2, 3, 4, 4, 4])
  })

  test("a cycle bump that needs every set done holds when one was missed", () => {
    const spec = program(
      [{ id: "s", lift: { lib: "lib_ohp" }, sets: [{ id: "w", kind: "working", count: 2, reps: 5, load: { from: "max", max: "tm", pct: 0.9 } }], progression: { kind: "cycle-bump", inc: { kg: 2.5, lb: 5 }, onlyIfAllDone: true } }],
      { lengthWeeks: 1 },
      { maxes: [{ lift: "s", kind: "tm" }] }
    )
    const enr = enrolled(spec, { maxes: { s: 50 } })
    expect(log(spec, enr, [{ exerciseId: "s", sets: sets([5, 45], [5, 45]) }]).enrollment.exerciseState.s.trainingMax).toBe(52.5)
    expect(log(spec, enr, [{ exerciseId: "s", sets: sets([5, 45], [3, 45]) }]).enrollment.exerciseState.s.trainingMax).toBe(50)
  })

  test("a rule whose sets are not done this week judges nothing", () => {
    const spec = program(
      [
        {
          id: "s",
          lift: { lib: "lib_back_squat" },
          sets: [{ id: "w", kind: "working", count: 3, reps: 5, load: { from: "working" } }],
          weeks: [{ weeks: "1", set: "w", skip: true }],
          progression: { kind: "add-on-success", inc: { kg: 2.5, lb: 5 }, failsBeforeDrop: 3, dropPct: 0.1, group: "w" },
        },
      ],
      { lengthWeeks: 2 }
    )
    const r = log(spec, enrolled(spec, { working: { s: 100 } }), [{ exerciseId: "s", sets: [] }])
    expect(r.enrollment.exerciseState.s.workingWeight).toBe(100)
    expect(r.changes[0].reason).toMatch(/do not count toward the next step/)
  })

  test("a lift that needs a starting number and was given none is refused by name", () => {
    const spec = program([amrap({ kind: "hold" })])
    expect(() => seed(spec, {}, "kg")).toThrow("Bench Press needs a starting weight.")
    const tm = program([{ id: "s", lift: { lib: "lib_ohp" }, sets: [{ id: "w", kind: "working", count: 1, reps: 5, load: { from: "max", max: "tm", pct: 0.9 } }], progression: { kind: "hold" } }], {}, { maxes: [{ lift: "s", kind: "tm", tmPct: 0.9 }] })
    expect(() => seed(tm, {}, "kg")).toThrow(/Overhead Press needs a 1RM/)
    expect(seed(tm, { oneRepMaxes: { s: 100 } }, "kg").exerciseState.s.trainingMax).toBe(90)
  })
})

// ---------------------------------------------------------------------------

describe("an estimated one-rep max", () => {
  test("reads the RTS chart when an RPE was logged", () => {
    expect(rtsPercent(1, 10)).toBe(100)
    expect(rtsPercent(5, 8)).toBe(81.1)
    expect(rtsPercent(3, 9)).toBe(89.2)
    expect(rtsPercent(12, 6.5)).toBe(58.6)
    expect(rtsPercent(13, 8)).toBeNull()
    expect(rtsPercent(5, 8.3)).toBeNull()
  })

  test("falls back to Epley without an RPE, or off the chart", () => {
    expect(e1rm(100, 5)).toBe(116.7)
    expect(e1rm(100, 5, 6)).toBe(116.7)
    expect(e1rm(100, 1, 10)).toBe(100)
    expect(e1rm(0, 5, 8)).toBe(0)
  })
})

// ---------------------------------------------------------------------------

describe("replay", () => {
  test("a change of program mid-history judges later sessions against the new program", () => {
    const lift = (inc: number): SlotSpec => ({ id: "s", lift: { lib: "lib_bench_press" }, sets: [{ id: "w", kind: "working", count: 1, reps: 5, load: { from: "working" } }], progression: { kind: "add-on-success", inc: { kg: inc, lb: inc * 2 }, failsBeforeDrop: 3, dropPct: 0.1 } })
    const a = program([lift(2.5)])
    const b = program([lift(5)])
    const enr = enrolled(a, { working: { s: 100 } })
    const done = [{ exerciseId: "s", sets: sets([5, 100]) }]
    const replayed = replay(
      a,
      enr,
      [
        { entries: done, logged_at: "2026-01-01T10:00:00Z", dayId: "d1", cycle: 1, week: 1 },
        { entries: [{ exerciseId: "s", sets: sets([5, 102.5]) }], logged_at: "2026-01-03T10:00:00Z", dayId: "d1", cycle: 1, week: 1 },
      ],
      [{ at: "2026-01-02T10:00:00Z", kind: "schedule", schedule: null, seeded: {} }],
      { programId: "t", programAt: () => b }
    )
    expect(replayed.exerciseState.s.workingWeight).toBe(107.5)
    expect(replayed.cursor.sessionCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------

describe("simulate", () => {
  test("runs Starscream twelve weeks with the top sets it is given, back-offs worked out from them", () => {
    const sim = simulate(starscream.spec, { unit: "kg", start: {}, weeks: 12, picks: { mon_bench: { 1: 100, 12: 110 }, tue_deadlift: 110 } })
    expect(sim).toHaveLength(60)
    const mon12 = sim.find((s) => s.week === 12 && s.dayId === "mon")!
    expect(describeResolved(mon12.exercises[0])).toBe("1x1-5@? rpe9, 3-5x5-10@77.5-87.5")
  })
})
