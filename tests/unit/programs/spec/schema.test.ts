/**
 * The program format's rules, field by field (Plans/program-builder.md, Phase 1).
 *
 * One program that uses EVERY field of the format passes; then each rule is
 * broken on its own and must be refused with a sentence that says where.
 */

import { describe, expect, test } from "vitest"
import { checkSpec, SPEC_LIMITS } from "@/src/programs/spec/schema"
import { formatWeekSet, parseWeekSet, weekSetHas, weeksIn } from "@/src/programs/spec/weeks"
import type { ProgramSpec } from "@/src/programs/spec/types"

/** Every field of the format, at least once. */
function everything(): ProgramSpec {
  return {
    specVersion: 2,
    name: "Everything",
    blurb: "A program that uses every field.",
    credit: "by the tests",
    unit: "kg",
    calendar: {
      days: "weekdays",
      weekCounting: "calendar",
      lengthWeeks: 12,
      atEnd: "finish",
      phases: [
        { label: "Base", weeks: "1-6" },
        { label: "Peak", weeks: "7-12" },
      ],
      deloadWeeks: "4,8",
      testWeeks: "12",
    },
    maxes: [
      { lift: "bench", kind: "tm", tmPct: 0.9 },
      { lift: "squat", kind: "1rm" },
      { lift: "front", kind: "rm", reps: 5, derivedFrom: { lift: "squat", pct: 0.7 } },
    ],
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "mon",
        label: "Monday",
        weekday: 1,
        slots: [
          {
            id: "bench",
            lift: { lib: "lib_bench_press" },
            choices: [{ lib: "lib_bench_press" }, { name: "Spoto Press", loadStyle: "barbell" }],
            group: "A",
            note: "Pause the first rep.",
            restSec: 180,
            sets: [
              { id: "warm", kind: "warmup", count: 2, reps: 5, load: { from: "working", pct: 0.5 } },
              {
                id: "top",
                kind: "top",
                count: 1,
                reps: { min: 2, max: 5 },
                load: { from: "effort" },
                effort: { rpe: 8.5 },
                restSec: 240,
                note: "Leave one in the tank.",
              },
              {
                id: "back",
                kind: "backoff",
                count: { min: 3, max: 5 },
                reps: { min: 5, max: 10 },
                options: [
                  { count: 3, reps: 10 },
                  { count: 10, reps: 3 },
                ],
                load: { from: "set", group: "top", pct: { min: 0.7, max: 0.8 } },
                effort: { rir: { min: 1, max: 2 }, lastSetOnly: true, cap: true },
              },
              {
                id: "wave",
                kind: "working",
                count: 3,
                reps: 5,
                load: { from: "max", max: "tm", pct: 0.65, plus: { kg: 2.5, lb: 5 } },
                perSet: [{ pct: 0.65 }, { pct: 0.75, reps: 3 }, { pct: 0.85, reps: { atLeast: 1 }, restSec: 300 }],
              },
              { id: "amrap", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working", of: "squat" } },
              { id: "drop", kind: "drop", count: 2, reps: { total: 30 }, load: { from: "choose" } },
              { id: "rp", kind: "restpause", count: 1, reps: { seconds: { min: 20, max: 30 } }, load: { from: "bodyweight", plusKg: 10 } },
            ],
            weeks: [
              { weeks: "12", set: "top", reps: { min: 1, max: 5 }, effort: { rpe: 9 } },
              { weeks: "4,8", set: "back", skip: true },
              {
                weeks: "2",
                set: "wave",
                count: 3,
                perSet: [{ pct: 0.7 }, { pct: 0.8 }, { pct: 0.9 }],
                options: [
                  { count: 3, reps: 5 },
                  { count: 5, reps: 3 },
                ],
                load: { from: "max", max: "tm", pct: 0.7 },
                restSec: 200,
                note: "Week 2",
              },
            ],
            progression: { kind: "cycle-bump", inc: { kg: 2.5, lb: 5 }, onlyIfAllDone: true, missDropPct: 0.1, group: "wave" },
            stateKey: "bench",
          },
          {
            id: "squat",
            lift: { name: "Squat", loadStyle: "barbell" },
            perSide: false,
            dropSets: 2,
            sets: [{ id: "work", kind: "working", count: 5, reps: 5, load: { from: "max", max: "1rm", pct: 0.8 } }],
            progression: {
              kind: "add-on-success",
              inc: { kg: 2.5, lb: 5 },
              failsBeforeDrop: 3,
              dropPct: 0.1,
              afterStallInc: { kg: 1.25, lb: 2.5 },
              direction: "up",
              group: "work",
            },
          },
          {
            id: "front",
            lift: { lib: "lib_front_squat" },
            sets: [{ id: "work", kind: "working", count: 3, reps: 5, load: { from: "max", max: "rm", pct: 0.9 } }],
            progression: { kind: "double", inc: { kg: 2.5, lb: 5 }, dropAfterFails: 2, dropPct: 0.1, group: "work" },
          },
        ],
      },
      {
        id: "wed",
        label: "Wednesday",
        weekday: 3,
        slots: [
          {
            id: "row",
            lift: { lib: "lib_barbell_row" },
            sets: [{ id: "last", kind: "amrap", count: 1, reps: { atLeast: 1 }, load: { from: "working" } }],
            progression: {
              kind: "amrap-table",
              group: "last",
              table: [
                { minReps: 2, inc: { kg: 2.5, lb: 5 } },
                { minReps: 6, inc: { kg: 5, lb: 10 } },
              ],
              target: "working",
              failsBeforeDrop: 2,
              dropPct: 0.1,
            },
          },
          {
            id: "press",
            lift: { lib: "lib_ohp" },
            sets: [{ id: "last", kind: "amrap", count: 1, reps: { atLeast: 10 }, load: { from: "working" } }],
            progression: { kind: "per-extra-rep", group: "last", standard: 10, perRep: { kg: 1, lb: 2.5 }, capReps: 10, target: "working" },
          },
          {
            id: "dl",
            lift: { lib: "lib_deadlift" },
            sets: [{ id: "t1", kind: "working", count: 5, reps: { atLeast: 3 }, load: { from: "working" } }],
            progression: {
              kind: "stages",
              stages: [
                [{ id: "t1", kind: "working", count: 5, reps: { atLeast: 3 }, load: { from: "working" } }],
                [{ id: "t1", kind: "working", count: 6, reps: { atLeast: 2 }, load: { from: "working" } }],
                [{ id: "t1", kind: "working", count: 10, reps: { atLeast: 1 }, load: { from: "working" } }],
              ],
              inc: { kg: 5, lb: 10 },
              onFailLast: { retest: true, resetPct: 0.85, resetInc: { kg: 7.5, lb: 15 } },
            },
          },
        ],
      },
      {
        id: "fri",
        label: "Friday",
        weekday: 5,
        slots: [
          {
            id: "curl",
            lift: { lib: "lib_barbell_curl" },
            sets: [{ id: "work", kind: "working", count: 3, reps: { min: 8, max: 12 }, load: { from: "choose" }, effort: { rir: 2 } }],
            progression: { kind: "add-set-per-week", maxSets: 6, group: "work" },
          },
          {
            id: "fri_bench",
            lift: { lib: "lib_bench_press" },
            sets: [{ id: "work", kind: "working", count: { min: 4, max: 6 }, reps: { min: 5, max: 6 }, load: { from: "effort" }, effort: { rpe: 9, lastSetOnly: true, cap: true } }],
            progression: { kind: "by-effort", group: "work" },
          },
          {
            id: "pullup",
            lift: { name: "Pull-up progression" },
            sets: [{ id: "work", kind: "working", count: 3, reps: { min: 5, max: 8 }, load: { from: "bodyweight" } }],
            progression: { kind: "ladder", lifts: [{ name: "Negative pull-up" }, { lib: "lib_pull_up" }], advanceAt: { reps: 8 } },
          },
          {
            id: "plank",
            lift: { lib: "lib_plank" },
            sets: [{ id: "hold", kind: "working", count: 3, reps: { seconds: 30 }, load: { from: "bodyweight" } }],
            progression: { kind: "hold" },
          },
        ],
      },
    ],
  }
}

/** Break one thing in a copy and return the sentences. */
function problemsAfter(change: (s: ProgramSpec) => void): string[] {
  const spec = everything()
  change(spec)
  const checked = checkSpec(spec)
  return checked.ok ? [] : checked.problems
}

const bench = (s: ProgramSpec) => s.days[0].slots[0]

describe("a program using every field of the format", () => {
  test("is valid", () => {
    const checked = checkSpec(everything())
    expect(checked.ok ? [] : checked.problems).toEqual([])
  })
})

describe("a draft", () => {
  test("may have a day with no lifts yet; a program to start may not", () => {
    const spec = everything()
    spec.days[1].slots = []
    expect(checkSpec(spec, { draft: true }).ok).toBe(true)
    expect(checkSpec(spec).ok).toBe(false)
  })
})

describe("the shape: every key is known, every number bounded", () => {
  test.each<[string, (s: ProgramSpec) => void, RegExp]>([
    ["an unknown top-level key", (s) => Object.assign(s, { colour: "red" }), /"colour" is not part of the program format/],
    ["an unknown key on a set group", (s) => Object.assign(bench(s).sets[1], { tempo: "3010" }), /Day 1 "Monday" › lib_bench_press › set group "top": "tempo" is not part/],
    ["a misspelt field on a lift", (s) => Object.assign(bench(s), { superset: "A" }), /"superset" is not part/],
    ["another format version", (s) => Object.assign(s, { specVersion: 3 }), /specVersion: is format 3; this app reads format 2/],
    ["no name", (s) => Object.assign(s, { name: "  " }), /name: cannot be empty/],
    ["a name too long", (s) => Object.assign(s, { name: "x".repeat(81) }), /name: is longer than 80 characters/],
    ["no unit", (s) => Object.assign(s, { unit: "stone" }), /unit: should be one of "kg", "lb"/],
    ["no days", (s) => Object.assign(s, { days: [] }), /days: needs at least 1/],
    ["a day with no lifts", (s) => Object.assign(s.days[1], { slots: [] }), /Day 2 "Wednesday" › slots: needs at least 1/],
    ["a weekday of 8", (s) => Object.assign(s.days[0], { weekday: 8 }), /weekday: is above the largest allowed \(7\)/],
    ["zero sets", (s) => Object.assign(bench(s).sets[0], { count: 0 }), /count/],
    ["a rep range running backwards", (s) => Object.assign(bench(s).sets[1], { reps: { min: 5, max: 2 } }), /reps/],
    ["a set range running backwards", (s) => Object.assign(bench(s).sets[2], { count: { min: 5, max: 3 } }), /count/],
    ["RPE 8.3", (s) => Object.assign(bench(s).sets[1], { effort: { rpe: 8.3 } }), /effort/],
    ["RPE 11", (s) => Object.assign(bench(s).sets[1], { effort: { rpe: 11 } }), /effort/],
    ["RPE and RIR together", (s) => Object.assign(bench(s).sets[1], { effort: { rpe: 8, rir: 2 } }), /give RPE or RIR, not both/],
    ["an effort with no target", (s) => Object.assign(bench(s).sets[1], { effort: { cap: true } }), /needs an RPE or an RIR/],
    ["a percentage of 0", (s) => Object.assign(bench(s).sets[0], { load: { from: "working", pct: 0 } }), /load/],
    ["a percentage of 300%", (s) => Object.assign(bench(s).sets[0], { load: { from: "working", pct: 3 } }), /load/],
    ["a load source that does not exist", (s) => Object.assign(bench(s).sets[0], { load: { from: "vibes" } }), /from: should be one of/],
    ["a set-by-set list longer than the sets", (s) => Object.assign(bench(s).sets[3], { count: 2 }), /one entry per set/],
    ["a set-by-set list with a range of sets", (s) => Object.assign(bench(s).sets[3], { count: { min: 3, max: 4 } }), /one entry per set/],
    ["one option only", (s) => Object.assign(bench(s).sets[2], { options: [{ count: 3, reps: 10 }] }), /options: needs at least 2/],
    ["a rest of 5 seconds", (s) => Object.assign(bench(s), { restSec: 5 }), /restSec: is below the smallest allowed \(15\)/],
    ["a superset tag with a space", (s) => Object.assign(bench(s), { group: "A 1" }), /superset tag/],
    ["an id with a slash", (s) => Object.assign(bench(s), { id: "a/b" }), /letters, digits/],
    ["a week set that cannot be read", (s) => Object.assign(bench(s).weeks![0], { weeks: "twelve" }), /"twelve" is not a week/],
    ["a week set running backwards", (s) => Object.assign(bench(s).weeks![0], { weeks: "5-3" }), /runs backwards/],
    ["a program longer than a year", (s) => Object.assign(s.calendar, { lengthWeeks: 53 }), /lengthWeeks: is above the largest allowed \(52\)/],
    ["a negative increment", (s) => Object.assign(s.days[0].slots[1].progression, { inc: { kg: -2.5, lb: 5 } }), /inc/],
    ["a deload of 95%", (s) => Object.assign(s.days[0].slots[1].progression, { dropPct: 0.95 }), /dropPct: is above the largest allowed/],
    ["a progression rule that does not exist", (s) => Object.assign(s.days[0].slots[1], { progression: { kind: "magic" } }), /kind: should be one of/],
    ["a ladder that advances on both reps and seconds", (s) => Object.assign(s.days[2].slots[2].progression, { advanceAt: { reps: 8, seconds: 30 } }), /advance on reps or on seconds/],
    ["a single stage", (s) => Object.assign(s.days[1].slots[2].progression, { stages: [[s.days[1].slots[2].sets[0]]] }), /stages: needs at least 2/],
    ["a rep max with no reps", (s) => Object.assign(s.maxes![2], { reps: undefined }), /a rep max names its reps/],
    ["a 1RM at a percentage", (s) => Object.assign(s.maxes![1], { tmPct: 0.9 }), /only a training max is taken at a percentage/],
    ["a rounding step of 0", (s) => Object.assign(s.rounding!, { stepKg: 0 }), /stepKg: is below the smallest allowed/],
    ["one choice only", (s) => Object.assign(bench(s), { choices: [{ lib: "lib_bench_press" }] }), /choices: needs at least 2/],
    ["a drop-set count of 9", (s) => Object.assign(s.days[0].slots[1], { dropSets: 9 }), /dropSets: is above the largest allowed \(4\)/],
  ])("%s is refused", (_, change, message) => {
    const problems = problemsAfter(change)
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.join("\n")).toMatch(message)
  })

  test(`more than ${SPEC_LIMITS.days} days, or ${SPEC_LIMITS.slotsPerDay} lifts in a day, is refused`, () => {
    expect(problemsAfter((s) => (s.days = Array.from({ length: 15 }, (_, i) => ({ ...s.days[2], id: `d${i}`, weekday: undefined })))).join()).toMatch(/days: can hold at most 14/)
    expect(problemsAfter((s) => (s.days[2].slots = Array.from({ length: 31 }, (_, i) => ({ ...s.days[2].slots[3], id: `p${i}` })))).join()).toMatch(/slots: can hold at most 30/)
  })

  test("a program over 64 KB is refused before anything else", () => {
    const problems = problemsAfter((s) => (s.blurb = undefined, s.days[0].slots[0].note = "x".repeat(500), s.days = Array.from({ length: 14 }, (_, d) => ({ id: `d${d}`, label: "x".repeat(120), slots: Array.from({ length: 30 }, (_, i) => ({ ...s.days[2].slots[3], id: `p${d}_${i}`, note: "y".repeat(500) })) }))))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/the most a program can be is 64 KB/)
  })
})

describe("references between parts", () => {
  test.each<[string, (s: ProgramSpec) => void, RegExp]>([
    ["a week change for a set group the lift does not have", (s) => (bench(s).weeks![0].set = "heavy"), /Week 12 changes a set group "heavy" that lib_bench_press does not have/],
    ["a back-off worked out from a set that comes after it", (s) => (bench(s).sets[2].load = { from: "set", group: "wave", pct: 0.8 }), /worked out from "wave", which comes after it/],
    ["a back-off worked out from itself", (s) => (bench(s).sets[2].load = { from: "set", group: "back", pct: 0.8 }), /worked out from itself/],
    ["a back-off from a lift on another day", (s) => (s.days[2].slots[0].sets[0].load = { from: "set", group: "top", slot: "bench", pct: 0.8 }), /on another day/],
    ["a back-off from a lift later the same day", (s) => (bench(s).sets[2].load = { from: "set", group: "work", slot: "squat", pct: 0.8 }), /which comes after it/],
    ["a percentage of a max nobody gave", (s) => (s.maxes = s.maxes!.filter((m) => m.lift !== "squat")), /no max is given for it/],
    ["a percentage of the wrong kind of max", (s) => (s.days[0].slots[1].sets[0].load = { from: "max", max: "tm", pct: 0.8 }), /uses the TM of "squat", but its max is a 1RM/],
    ["a percentage of a lift that does not exist", (s) => (bench(s).sets[4].load = { from: "working", of: "nope" }), /"nope", which is no lift in this program/],
    ["a max for no lift", (s) => s.maxes!.push({ lift: "ghost", kind: "1rm" }), /A max is given for "ghost", which is no lift/],
    ["a max derived from a lift with no max", (s) => (s.maxes![2].derivedFrom = { lift: "row", pct: 0.7 }), /worked out from "row", which has no max/],
    ["two lifts with one id", (s) => (s.days[2].slots[1].id = "curl"), /Two lifts share the id "curl"/],
    ["two days with one id", (s) => (s.days[2].id = "mon"), /Two days share the id "mon"/],
    ["two set groups with one id", (s) => (bench(s).sets[1].id = "warm"), /two set groups are both called "warm"/],
    ["a weekday program with a day on no weekday", (s) => (s.days[1].weekday = undefined), /Wednesday has no weekday, and this program runs on weekdays/],
    ["two days on one weekday", (s) => (s.days[1].weekday = 1), /Monday and Wednesday are both on the same weekday/],
    ["a week past the end of the program", (s) => (bench(s).weeks![0].weeks = "13"), /names week 13, but the program is 12 weeks long/],
    ["a deload past the end", (s) => (s.calendar.deloadWeeks = "14"), /The deload weeks names week 14/],
    ["a progression following a missing group", (s) => (s.days[0].slots[1].progression = { kind: "double", inc: { kg: 2.5, lb: 5 }, group: "nope" }), /follows a set group "nope"/],
    ["an AMRAP table reading a set with no +", (s) => (s.days[1].slots[0].sets[0].reps = 5), /has no all-out \("\+"\) set/],
    ["a per-extra-rep rule with weight AND percentage", (s) => Object.assign(s.days[1].slots[1].progression, { pct: 0.01 }), /either a weight per extra rep or a percentage/],
    ["a cycle bump on an open-ended program", (s) => ((s.calendar.lengthWeeks = null), (s.calendar.phases = undefined), (s.calendar.deloadWeeks = undefined), (s.calendar.testWeeks = undefined)), /a once-a-cycle bump needs a program length/],
    ["a ladder chosen on the day", (s) => (s.days[2].slots[2].choices = [{ name: "A" }, { name: "B" }]), /a lift on a ladder cannot also be chosen/],
    ["a set-by-set week change with the wrong number of sets", (s) => (bench(s).weeks![2].count = 4), /lists 3 sets one by one, which needs exactly that many/],
  ])("%s is refused", (_, change, message) => {
    expect(problemsAfter(change).join("\n")).toMatch(message)
  })
})

describe("week sets", () => {
  test("read the way people write them", () => {
    expect(weeksIn("1-3,5")).toEqual([1, 2, 3, 5])
    expect(weeksIn(" 12 ")).toEqual([12])
    expect(weeksIn("3,1-2,2")).toEqual([1, 2, 3])
    expect(weekSetHas("1-11", 11)).toBe(true)
    expect(weekSetHas("1-11", 12)).toBe(false)
    expect(weekSetHas(undefined, 1)).toBe(false)
  })

  test("written back to the shortest text", () => {
    expect(formatWeekSet([5, 1, 2, 3, 9, 10])).toBe("1-3,5,9-10")
    expect(formatWeekSet([])).toBe("")
  })

  test("refuse what cannot be read, with the reason", () => {
    expect(parseWeekSet("")).toEqual({ error: "no weeks are named" })
    expect(parseWeekSet("0")).toEqual({ error: "weeks start at 1" })
    expect(parseWeekSet("1-60")).toEqual({ error: "week 60 is past the longest program (52 weeks)" })
    expect(() => weeksIn("a")).toThrow(/Week set "a"/)
  })
})
