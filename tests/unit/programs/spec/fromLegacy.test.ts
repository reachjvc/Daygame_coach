/**
 * Today's programs convert to the new format literally (Phase 1.3).
 *
 * Literal is the point: the rebuilt engine has to reproduce every golden
 * prescription from these specs, so ids, names, set numbering and every
 * number in every rule are carried across unchanged.
 */

import { describe, expect, test } from "vitest"
import { ALL_PROGRAMS, requireProgram } from "@/src/programs/data/catalog"
import { customProgram } from "@/src/programs/data/customProgram"
import { convertLegacy, specFromLegacy } from "@/src/programs/spec/fromLegacy"
import { checkSpec } from "@/src/programs/spec/schema"
import { readSpec, SpecInvalidError, SpecVersionError } from "@/src/programs/spec/read"
import { parseProgramText } from "@/src/programs/programText"
import type { LoadExercise, ProgramSchedule } from "@/src/programs/types"

const KEPT = ["couch-to-5k", "5k-to-10k", "splits-mobility", "sprint-triathlon", "olympic-triathlon", "half-ironman"]

describe("the 13 built-ins", () => {
  test("the seven lifting programs convert to valid programs; the six others stay on their own engine (Q3)", () => {
    const converted: string[] = []
    const kept: string[] = []
    for (const p of ALL_PROGRAMS) {
      const r = convertLegacy(p)
      if ("kept" in r) kept.push(p.id)
      else {
        expect(checkSpec(r.spec).ok, p.id).toBe(true)
        converted.push(p.id)
      }
    }
    expect(kept.sort()).toEqual([...KEPT].sort())
    expect(converted.sort()).toEqual(
      ["stronglifts-5x5", "wendler-531", "starting-strength", "push-pull-legs", "upper-lower", "phul", "bodyweight-foundations"].sort()
    )
  })

  test("a lift on two days is two slots sharing one set of numbers", () => {
    const spec = specFromLegacy(requireProgram("stronglifts-5x5"))
    const squats = spec.days.flatMap((d) => d.slots.filter((s) => s.lift && "name" in s.lift && s.lift.name === "Squat"))
    expect(squats.map((s) => [s.id, s.stateKey])).toEqual([
      ["squat", undefined],
      ["squat~2", "squat"],
    ])
    expect(squats[0].sets).toEqual([{ id: "work", kind: "working", count: 5, reps: 5, load: { from: "working" } }])
    expect(squats[0].progression).toEqual({ kind: "add-on-success", inc: { kg: 2.5, lb: 5 }, failsBeforeDrop: 3, dropPct: 0.1 })
    expect(spec.calendar).toEqual({ days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" })
  })

  test("the deadlift's smaller jump after its first stall survives", () => {
    const spec = specFromLegacy(requireProgram("stronglifts-5x5"))
    const dl = spec.days[1].slots.find((s) => s.id === "deadlift")!
    expect(dl.progression).toMatchObject({ inc: { kg: 5, lb: 10 }, afterStallInc: { kg: 2.5, lb: 5 } })
  })

  test('"4×5, then 1×5+" is four working sets and one all-out set; "1×5+" is the all-out set alone', () => {
    const spec = specFromLegacy(requireProgram("push-pull-legs"))
    const slot = (id: string) => spec.days.flatMap((d) => d.slots).find((s) => s.id === id)!
    expect(slot("bb_bench").sets).toEqual([
      { id: "work", kind: "working", count: 4, reps: 5, load: { from: "working" } },
      { id: "last", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working" } },
    ])
    expect(slot("bb_deadlift").sets).toEqual([{ id: "last", kind: "amrap", count: 1, reps: { atLeast: 5 }, load: { from: "working" } }])
    expect(slot("bb_triceps")).toMatchObject({ group: "A", sets: [{ reps: { min: 8, max: 12 } }], progression: { kind: "double", inc: { kg: 2.5, lb: 5 } } })
  })

  test("a 5/3/1 wave is one set group listed set by set, weeks 2–4 as week changes, on a training max at 90%", () => {
    const spec = specFromLegacy(requireProgram("wendler-531"))
    expect(spec.calendar).toEqual({ days: "in-order", weekCounting: "completed", lengthWeeks: 4, atEnd: "repeat" })
    expect(spec.maxes).toEqual([
      { lift: "ohp", kind: "tm", tmPct: 0.9 },
      { lift: "deadlift", kind: "tm", tmPct: 0.9 },
      { lift: "bench", kind: "tm", tmPct: 0.9 },
      { lift: "squat", kind: "tm", tmPct: 0.9 },
    ])
    const squat = spec.days[3].slots[0]
    expect(squat.sets[0]).toEqual({
      id: "main",
      kind: "working",
      count: 3,
      reps: 5,
      load: { from: "max", max: "tm", pct: 0.65 },
      perSet: [
        { reps: 5, pct: 0.65 },
        { reps: 5, pct: 0.75 },
        { reps: { atLeast: 5 }, pct: 0.85 },
      ],
    })
    expect(squat.weeks!.map((w) => [w.weeks, w.perSet!.map((p) => p.pct)])).toEqual([
      ["2", [0.7, 0.8, 0.9]],
      ["3", [0.75, 0.85, 0.95]],
      ["4", [0.4, 0.5, 0.6]],
    ])
    expect(squat.weeks![2].perSet!.every((p) => typeof p.reps === "number")).toBe(true)
    expect(squat.progression).toEqual({ kind: "cycle-bump", inc: { kg: 5, lb: 10 }, roundMax: true, missDropPct: 0.1 })
  })

  test("a calisthenics ladder becomes a ladder of named variations", () => {
    const spec = specFromLegacy(requireProgram("bodyweight-foundations"))
    const pull = spec.days[0].slots[0]
    expect(pull).toMatchObject({
      id: "cal_pull",
      lift: { name: "Pull-up progression" },
      group: "A",
      restSec: 90,
      sets: [{ id: "work", kind: "working", count: 3, reps: { min: 5, max: 8 }, load: { from: "bodyweight" } }],
      progression: { kind: "ladder", advanceAt: { reps: 8 } },
    })
    expect((pull.progression as { lifts: { name: string }[] }).lifts.map((l) => l.name)).toEqual([
      "Scapular pull",
      "Arch hang",
      "Negative pull-up",
      "Pull-up",
      "Archer pull-up",
    ])
  })
})

describe("weeks somebody wrote or edited", () => {
  const custom = (schedule: ProgramSchedule) => specFromLegacy(customProgram, { customSchedule: schedule, name: "My week", unit: "lb" })

  test("a written week converts with its supersets, drop sets, weights' unit and name", () => {
    const { schedule, problems } = parseProgramText("Push\nBench Press 3x8\n+ Lateral Raise 3x12-20\nTriceps Pushdown 3x10 +2 drops")
    expect(problems).toEqual([])
    const spec = custom(schedule)
    expect(spec.name).toBe("My week")
    expect(spec.unit).toBe("lb")
    const [bench, raise, push] = spec.days[0].slots
    expect(bench.group).toBe("A")
    expect(raise.group).toBe("A")
    expect(push.dropSets).toBe(2)
  })

  test("a week pinned to weekdays runs on weekdays; a half-pinned one runs in order and keeps its pins", () => {
    const { schedule } = parseProgramText("Push\nBench Press 3x8\n\nPull\nBarbell Row 3x8")
    const days = (schedule as { days: { weekday?: number }[] }).days
    days[0].weekday = 1
    expect(custom(schedule).calendar.days).toBe("in-order")
    expect(custom(schedule).days[0].weekday).toBe(1)
    days[1].weekday = 4
    expect(custom(schedule).calendar.days).toBe("weekdays")
  })

  test("a saved week with an empty day converts as a draft and not as a program to start", () => {
    const { schedule } = parseProgramText("Push\nBench Press 3x8")
    const withEmpty = { ...schedule, days: [...(schedule as { days: unknown[] }).days, { id: "d2", label: "Pull", exercises: [] }] } as ProgramSchedule
    expect(() => custom(withEmpty)).toThrow(/Day 2 "Pull" › slots: needs at least 1/)
    const draft = convertLegacy(customProgram, { customSchedule: withEmpty, draft: true })
    expect("spec" in draft && draft.spec.days[1].slots).toEqual([])
  })

  test("a timed lift is held in seconds; assistance keeps its direction; 'leave it to me' holds", () => {
    const plank: LoadExercise = { id: "p", name: "Plank", metricType: "load", repUnit: "sec", scheme: { kind: "rep_range", sets: 3, repMin: 20, repMax: 40 }, progression: { kind: "none" } }
    const assisted: LoadExercise = {
      id: "a",
      name: "Assisted Pull-up",
      metricType: "load",
      loadStyle: "free",
      scheme: { kind: "linear", sets: 3, reps: 8 },
      progression: { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1, direction: "down" },
    }
    const spec = custom({ kind: "linear_rotation", days: [{ id: "d1", label: "Day", exercises: [plank, assisted] }] })
    const [p, a] = spec.days[0].slots
    expect(p.sets[0].reps).toEqual({ seconds: { min: 20, max: 40 } })
    expect(p.progression).toEqual({ kind: "hold" })
    expect(a.lift).toEqual({ name: "Assisted Pull-up", loadStyle: "free" })
    expect(a.progression).toMatchObject({ direction: "down" })
  })

  test("a stall jump in one unit only falls back to the full jump in the other, as the old engine did", () => {
    const ex: LoadExercise = {
      id: "x",
      name: "Bench Press",
      metricType: "load",
      scheme: { kind: "linear", sets: 3, reps: 5 },
      progression: { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1, stallIncrementKg: 1.25 },
    }
    const spec = custom({ kind: "linear_rotation", days: [{ id: "d1", label: "Day", exercises: [ex] }] })
    expect(spec.days[0].slots[0].progression).toMatchObject({ afterStallInc: { kg: 1.25, lb: 5 } })
  })

  test("what the old format could hold but cannot mean is refused, by name", () => {
    const wave: LoadExercise = {
      id: "w",
      name: "Squat",
      metricType: "load",
      scheme: { kind: "percentage_tm", setsByWeek: { 1: [{ pctTM: 0.65, reps: 5 }] } },
      progression: { kind: "percentage_tm", tmIncrementKg: 5, tmIncrementLb: 10 },
    }
    expect(() => custom({ kind: "linear_rotation", days: [{ id: "d", label: "D", exercises: [wave] }] })).toThrow(/percentage wave in a program with no weeks/)
    expect(() => custom({ kind: "weekly_waved", weeks: 2, days: [{ id: "d", label: "D", exercises: [wave] }] })).toThrow(/has no sets for week 2/)
    expect(() =>
      custom({
        kind: "skill_routine",
        days: [
          {
            id: "d",
            label: "D",
            exercises: [
              {
                id: "s",
                name: "Push-up progression",
                metricType: "skill_tier",
                tiers: [
                  { id: "a", name: "A", sets: 3, unlockReps: 8 },
                  { id: "b", name: "B", sets: 4, unlockReps: 8 },
                ],
              },
            ],
          },
        ],
      })
    ).toThrow(/different sets or reps, which a ladder cannot hold/)
  })
})

describe("reading a stored program", () => {
  const good = () => specFromLegacy(requireProgram("upper-lower"))

  test("a valid stored program reads back as itself", () => {
    expect(readSpec(JSON.parse(JSON.stringify(good())))).toEqual(good())
  })

  test("a program from a newer app is refused out loud, not half-read", () => {
    expect(() => readSpec({ ...good(), specVersion: 3 })).toThrow(SpecVersionError)
    expect(() => readSpec({ ...good(), specVersion: 3 })).toThrow(/saved in format 3 by a newer version of the app/)
  })

  test("a program with no version, or a strange one, is refused", () => {
    const unversioned: Partial<ReturnType<typeof good>> = good()
    delete unversioned.specVersion
    expect(() => readSpec(unversioned)).toThrow(/without a format version/)
    expect(() => readSpec({ ...good(), specVersion: "2" })).toThrow(/format "2", which this app does not read/)
    expect(() => readSpec(null)).toThrow(SpecInvalidError)
    expect(() => readSpec([good()])).toThrow(/not a program at all/)
  })

  test("a current-version program that breaks the rules is refused with every reason", () => {
    const broken = { ...good(), calendar: { ...good().calendar, lengthWeeks: 0 } }
    try {
      readSpec(broken)
      throw new Error("read")
    } catch (e) {
      expect(e).toBeInstanceOf(SpecInvalidError)
      expect((e as SpecInvalidError).problems.join()).toMatch(/lengthWeeks: is below the smallest allowed/)
    }
  })
})
