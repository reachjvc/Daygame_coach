/**
 * Editing a picked program.
 *
 * The contract these lock down, in order of how badly they hurt when broken:
 *   1. an unedited enrollment still runs the catalog program (copy-on-write)
 *   2. an edited one runs the user's version through the SAME engine
 *   3. editing mid-program does not reset anybody's working weights
 *   4. an added lift cannot reach the engine without a starting weight
 *   5. endurance plans refuse to be edited rather than half-editing
 */

import { describe, test, expect } from "vitest"
import {
  addDay,
  addExercise,
  clampCursorDay,
  editableSchedule,
  effectiveProgram,
  isCustomizable,
  isModified,
  materializeSchedule,
  missingWorkingWeights,
  moveDay,
  moveExercise,
  removeDay,
  removeExercise,
  renameDay,
  scheduleDays,
  scheduleProblems,
  seedForAddedExercises,
  swapExercise,
  updateExerciseScheme,
  type AnyExercise,
} from "@/src/programs/customize"
import { computePrescription, seedEnrollment } from "@/src/programs/programsService"
import { ALL_PROGRAMS, requireProgram } from "@/src/programs/data/catalog"
import { EXERCISE_LIBRARY, libraryExercise, patternForName } from "@/src/programs/data/exerciseLibrary"
import { CustomScheduleSchema } from "@/src/programs/schemas"
import type { ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

/** Flatten every exercise in a schedule — the union of day kinds needs the hint. */
const allEx = (s: ProgramSchedule): AnyExercise[] =>
  scheduleDays(s).flatMap((d) => d.exercises as AnyExercise[])

const upperLower = requireProgram("upper-lower")
const strongLifts = requireProgram("stronglifts-5x5")
const wendler = requireProgram("wendler-531")
const c25k = requireProgram("couch-to-5k")

function enrollmentFor(
  programId: string,
  level: "beginner" | "intermediate" | "advanced",
  customSchedule: ProgramSchedule | null = null,
  oneRms?: Record<string, number>,
  workingWeights?: Record<string, number>
): ProgramEnrollment {
  const program = effectiveProgram(requireProgram(programId), customSchedule)
  const { exerciseState, cursor } = seedEnrollment(program, level, "kg", oneRms, workingWeights)
  return {
    id: "e1",
    user_id: "u1",
    program_id: programId,
    level,
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-01-01",
    customSchedule,
  }
}

// ---------------------------------------------------------------------------

describe("copy-on-write resolution", () => {
  test("a null custom schedule returns the catalog program unchanged", () => {
    expect(effectiveProgram(upperLower, null)).toBe(upperLower)
    expect(effectiveProgram(upperLower, undefined)).toBe(upperLower)
  })

  test("a custom schedule replaces the schedule and nothing else", () => {
    const edited = renameDay(materializeSchedule(upperLower), "upper", "Push Day")
    const eff = effectiveProgram(upperLower, edited)
    expect(eff.id).toBe(upperLower.id)
    expect(eff.name).toBe(upperLower.name)
    expect(eff.levels).toBe(upperLower.levels)
    expect(scheduleDays(eff.schedule)[0].label).toBe("Push Day")
  })

  test("materializing does not alias the catalog — editing a copy cannot corrupt it", () => {
    const snapshot = materializeSchedule(upperLower)
    renameDay(snapshot, "upper", "Mutated")
    const days = scheduleDays(snapshot) as Array<{ id: string; label: string; exercises: unknown[] }>
    days[0].exercises.length = 0
    expect(scheduleDays(upperLower.schedule)[0].label).toBe("Upper")
    expect(scheduleDays(upperLower.schedule)[0].exercises.length).toBeGreaterThan(0)
  })

  test("a schedule of the wrong kind is refused rather than run", () => {
    const skill = materializeSchedule(requireProgram("bodyweight-foundations"))
    expect(() => effectiveProgram(upperLower, skill)).toThrow(/skill_routine.*linear_rotation/)
  })

  test("isModified is false for an untouched snapshot and true after an edit", () => {
    const snap = materializeSchedule(upperLower)
    expect(isModified(upperLower, snap)).toBe(false)
    expect(isModified(upperLower, renameDay(snap, "upper", "Push"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------

describe("day editing", () => {
  test("rename, reorder, add and remove days", () => {
    let s = materializeSchedule(upperLower)
    s = renameDay(s, "lower", "Legs")
    expect(scheduleDays(s).map((d) => d.label)).toEqual(["Upper", "Legs"])

    s = moveDay(s, 0, 1)
    expect(scheduleDays(s).map((d) => d.label)).toEqual(["Legs", "Upper"])

    s = addDay(s, "Arms & Delts")
    expect(scheduleDays(s).map((d) => d.label)).toEqual(["Legs", "Upper", "Arms & Delts"])
    expect(scheduleDays(s)[2].id).toBe("custom_arms_delts")

    s = removeDay(s, "custom_arms_delts")
    expect(scheduleDays(s)).toHaveLength(2)
  })

  test("moving off either end is a no-op, not a crash", () => {
    const s = materializeSchedule(upperLower)
    expect(moveDay(s, 0, -1)).toBe(s)
    expect(moveDay(s, 1, 1)).toBe(s)
  })

  test("the last day cannot be removed — the cursor would have nowhere to point", () => {
    let s = materializeSchedule(upperLower)
    s = removeDay(s, "upper")
    expect(() => removeDay(s, "lower")).toThrow(/at least one training day/)
  })

  test("a blank day name is refused", () => {
    expect(() => addDay(materializeSchedule(upperLower), "   ")).toThrow(/needs a name/)
    expect(() => renameDay(materializeSchedule(upperLower), "upper", " ")).toThrow(/needs a name/)
  })

  test("two days named the same get distinct ids", () => {
    let s = addDay(materializeSchedule(upperLower), "Extra")
    s = addDay(s, "Extra")
    const ids = scheduleDays(s).map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ---------------------------------------------------------------------------

describe("exercise editing", () => {
  test("adding a library lift puts it at the end of the day with its own id", () => {
    const entry = libraryExercise("lib_pull_up")!
    const { schedule, exerciseId } = addExercise(materializeSchedule(upperLower), "upper", entry)
    const upper = scheduleDays(schedule).find((d) => d.id === "upper")!
    expect(upper.exercises.at(-1)!.id).toBe(exerciseId)
    expect(upper.exercises.at(-1)!.name).toBe("Pull-up")
  })

  test("a swap keeps the slot but takes the replacement's own prescription", () => {
    const entry = libraryExercise("lib_lateral_raise")!
    const before = scheduleDays(upperLower.schedule).find((d) => d.id === "upper")!
    const index = before.exercises.findIndex((e) => e.id === "ul_ohp")

    const { schedule } = swapExercise(materializeSchedule(upperLower), "upper", "ul_ohp", entry)
    const after = scheduleDays(schedule).find((d) => d.id === "upper")!
    expect(after.exercises[index].name).toBe("Lateral Raise")
    expect(after.exercises).toHaveLength(before.exercises.length)
    // Not 3×8-12 carried over from the OHP slot — the raise's own 3×12-20.
    const scheme = (after.exercises[index] as { scheme: { repMax: number } }).scheme
    expect(scheme.repMax).toBe(20)
  })

  test("a compound swaps in on linear loading, an accessory on double progression", () => {
    const { schedule } = swapExercise(
      materializeSchedule(upperLower),
      "upper",
      "ul_curl",
      libraryExercise("lib_dip")!
    )
    const dip = allEx(schedule).find((e) => e.name === "Dip")! as unknown as {
      scheme: { kind: string }
      progression: { kind: string }
    }
    expect(dip.scheme.kind).toBe("linear")
    expect(dip.progression.kind).toBe("linear_load")
  })

  test("reordering and removing exercises", () => {
    let s = materializeSchedule(upperLower)
    s = moveExercise(s, "upper", 0, 1)
    const upper = scheduleDays(s).find((d) => d.id === "upper")!
    expect(upper.exercises[0].id).toBe("ul_row")

    s = removeExercise(s, "upper", "ul_row")
    expect(scheduleDays(s).find((d) => d.id === "upper")!.exercises.map((e) => e.id)).not.toContain("ul_row")
  })

  test("a day cannot be emptied — an empty day prescribes nothing", () => {
    let s = materializeSchedule(upperLower)
    const upperIds = scheduleDays(s).find((d) => d.id === "upper")!.exercises.map((e) => e.id)
    for (const id of upperIds.slice(0, -1)) s = removeExercise(s, "upper", id)
    expect(() => removeExercise(s, "upper", upperIds.at(-1)!)).toThrow(/at least one exercise/)
  })

  test("editing an unknown day is an error, not a silent no-op", () => {
    expect(() => removeExercise(materializeSchedule(upperLower), "nope", "ul_row")).toThrow(/No day nope/)
  })
})

// ---------------------------------------------------------------------------

describe("an empty training day is never startable", () => {
  test("scheduleProblems names the day, so the UI can say which one", () => {
    const s = addDay(materializeSchedule(upperLower), "Arms")
    expect(scheduleProblems(s)).toEqual(["Arms has no exercises in it yet."])
  })

  test("a complete schedule has no problems", () => {
    expect(scheduleProblems(materializeSchedule(upperLower))).toEqual([])
  })

  test("filling the day clears the problem", () => {
    let s = addDay(materializeSchedule(upperLower), "Arms")
    s = addExercise(s, "custom_arms", libraryExercise("lib_barbell_curl")!).schedule
    expect(scheduleProblems(s)).toEqual([])
  })

  test("the wire schema refuses it too, independently of the UI gate", () => {
    const s = addDay(materializeSchedule(upperLower), "Arms")
    expect(CustomScheduleSchema.safeParse(s).success).toBe(false)
  })

  test("endurance plans report no problems rather than throwing", () => {
    expect(scheduleProblems(c25k.schedule)).toEqual([])
  })
})

describe("sets and reps", () => {
  test("a rep range can be re-specced", () => {
    const s = updateExerciseScheme(materializeSchedule(upperLower), "upper", "ul_bench", {
      sets: 5,
      repMin: 3,
      repMax: 5,
    })
    const bench = allEx(s).find((e) => e.id === "ul_bench")! as unknown as {
      scheme: { sets: number; repMin: number; repMax: number }
    }
    expect(bench.scheme).toMatchObject({ sets: 5, repMin: 3, repMax: 5 })
  })

  test("a linear scheme can be re-specced", () => {
    const s = updateExerciseScheme(materializeSchedule(strongLifts), "A", "squat", { sets: 3, reps: 8 })
    const squat = allEx(s).find((e) => e.id === "squat")! as unknown as {
      scheme: { sets: number; reps: number }
    }
    expect(squat.scheme).toMatchObject({ sets: 3, reps: 8 })
  })

  test("nonsense set and rep counts are refused", () => {
    const s = materializeSchedule(upperLower)
    expect(() => updateExerciseScheme(s, "upper", "ul_bench", { sets: 0 })).toThrow(/at least 1/)
    expect(() => updateExerciseScheme(s, "upper", "ul_bench", { sets: 2.5 })).toThrow(/whole number/)
    expect(() => updateExerciseScheme(s, "upper", "ul_bench", { repMin: 10, repMax: 5 })).toThrow(
      /cannot be below/
    )
  })

  test("a 5/3/1 main lift refuses a sets/reps edit — the wave IS the program", () => {
    const s = materializeSchedule(wendler)
    const day = scheduleDays(s)[0]
    const pct = day.exercises.find(
      (e) => (e as { scheme: { kind: string } }).scheme.kind === "percentage_tm"
    )!
    expect(() => updateExerciseScheme(s, day.id, pct.id, { sets: 4 })).toThrow(/percentage wave/)
  })
})

// ---------------------------------------------------------------------------

describe("the engine runs the edited program", () => {
  test("a renamed and reordered program prescribes the user's first day", () => {
    let s = materializeSchedule(upperLower)
    s = moveDay(s, 0, 1) // Lower first
    s = renameDay(s, "lower", "Leg Day")
    const enr = enrollmentFor("upper-lower", "intermediate", s)
    const rx = computePrescription(effectiveProgram(upperLower, s), enr)
    expect(rx.dayLabel).toBe("Leg Day")
  })

  test("a removed exercise stops being prescribed; an added one starts", () => {
    let s = materializeSchedule(upperLower)
    s = removeExercise(s, "upper", "ul_curl")
    const added = addExercise(s, "upper", libraryExercise("lib_face_pull")!)
    s = added.schedule

    const enr = enrollmentFor("upper-lower", "intermediate", s, undefined, {
      [added.exerciseId]: 25,
    })
    const rx = computePrescription(effectiveProgram(upperLower, s), enr)
    const names = rx.exercises.map((e) => e.name)
    expect(names).not.toContain("Barbell Curl")
    expect(names).toContain("Face Pull")
  })

  test("an added exercise is prescribed at the weight the user supplied, not a guess", () => {
    const { schedule, exerciseId } = addExercise(
      materializeSchedule(upperLower),
      "upper",
      libraryExercise("lib_face_pull")!
    )
    const program = effectiveProgram(upperLower, schedule)
    // No supplied weight → the engine refuses to seed rather than inventing one.
    expect(() => seedEnrollment(program, "intermediate", "kg")).toThrow(/missing seed weight/)

    const { exerciseState } = seedEnrollment(program, "intermediate", "kg", undefined, {
      [exerciseId]: 30,
    })
    expect(exerciseState[exerciseId].workingWeight).toBe(30)
  })
})

// ---------------------------------------------------------------------------

describe("editing mid-program", () => {
  test("surviving lifts keep their working weight, fails and training max", () => {
    const enr = enrollmentFor("upper-lower", "intermediate")
    // Pretend a few sessions have happened.
    enr.exerciseState["ul_bench"] = { workingWeight: 82.5, consecutiveFails: 1 }
    enr.exerciseState["ul_squat"] = { workingWeight: 105, consecutiveFails: 0 }

    const { schedule, exerciseId } = addExercise(
      editableSchedule(upperLower, enr.customSchedule),
      "upper",
      libraryExercise("lib_face_pull")!
    )
    const next = seedForAddedExercises(schedule, enr.exerciseState, { [exerciseId]: 25 }, "kg")

    expect(next["ul_bench"]).toEqual({ workingWeight: 82.5, consecutiveFails: 1 })
    expect(next["ul_squat"]).toEqual({ workingWeight: 105, consecutiveFails: 0 })
    expect(next[exerciseId]).toEqual({ workingWeight: 25, consecutiveFails: 0 })
  })

  test("a removed lift keeps its state, so putting it back does not reset it", () => {
    const enr = enrollmentFor("upper-lower", "intermediate")
    enr.exerciseState["ul_curl"] = { workingWeight: 40, consecutiveFails: 0 }
    const schedule = removeExercise(materializeSchedule(upperLower), "upper", "ul_curl")
    const next = seedForAddedExercises(schedule, enr.exerciseState, {}, "kg")
    expect(next["ul_curl"]).toEqual({ workingWeight: 40, consecutiveFails: 0 })
  })

  test("an added lift with no starting weight is refused", () => {
    const enr = enrollmentFor("upper-lower", "intermediate")
    const { schedule } = addExercise(
      materializeSchedule(upperLower),
      "upper",
      libraryExercise("lib_face_pull")!
    )
    expect(() => seedForAddedExercises(schedule, enr.exerciseState, {}, "kg")).toThrow(
      /no starting weight/
    )
    // A NEGATIVE weight is still nonsense. Zero is not: it is bodyweight, and
    // refusing it made push-ups and unweighted pull-ups impossible to enrol.
    expect(() => seedForAddedExercises(schedule, enr.exerciseState, { lib_face_pull: -5 }, "kg")).toThrow(
      /no starting weight/
    )
  })

  test("the cursor is pulled back in range when days are removed under it", () => {
    const s = removeDay(materializeSchedule(upperLower), "lower")
    expect(clampCursorDay(s, 1)).toBe(0)
    expect(clampCursorDay(s, 0)).toBe(0)
  })

  test("missingWorkingWeights lists exactly the lifts the level does not seed", () => {
    const { schedule, exerciseId } = addExercise(
      materializeSchedule(upperLower),
      "upper",
      libraryExercise("lib_face_pull")!
    )
    const missing = missingWorkingWeights(upperLower, schedule, "intermediate", "kg")
    expect(missing.map((m) => m.exerciseId)).toEqual([exerciseId])
    expect(missing[0].name).toBe("Face Pull")
    expect(missing[0].suggested).toBeGreaterThan(0) // library suggestion, shown for confirmation
  })
})

// ---------------------------------------------------------------------------

describe("endurance plans refuse to be edited", () => {
  test("isCustomizable is false and materializing throws", () => {
    expect(isCustomizable(c25k)).toBe(false)
    expect(isCustomizable(upperLower)).toBe(true)
    expect(() => materializeSchedule(c25k)).toThrow(/cannot be customized/)
  })

  test("scheduleDays refuses a week-based plan rather than returning nothing", () => {
    expect(() => scheduleDays(c25k.schedule)).toThrow(/weeks, not days/)
  })
})

// ---------------------------------------------------------------------------

describe("the wire schema", () => {
  test("every customizable catalog program round-trips through it", () => {
    for (const id of ["upper-lower", "stronglifts-5x5", "wendler-531", "push-pull-legs", "phul"]) {
      const parsed = CustomScheduleSchema.safeParse(materializeSchedule(requireProgram(id)))
      expect(parsed.success, `${id} failed: ${parsed.error?.issues[0]?.message}`).toBe(true)
    }
  })

  test("an endurance schedule is rejected at the wire, independently of customize.ts", () => {
    expect(CustomScheduleSchema.safeParse(c25k.schedule).success).toBe(false)
  })

  test("arithmetic the engine would choke on is rejected", () => {
    const base = materializeSchedule(upperLower) as unknown as {
      kind: string
      days: Array<{ exercises: Array<Record<string, unknown>> }>
    }
    const bad = structuredClone(base)
    bad.days[0].exercises[0].scheme = { kind: "linear", sets: 0, reps: 5 }
    expect(CustomScheduleSchema.safeParse(bad).success).toBe(false)

    const nan = structuredClone(base)
    nan.days[0].exercises[0].progression = { kind: "linear_load", incrementKg: -5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 }
    expect(CustomScheduleSchema.safeParse(nan).success).toBe(false)

    const empty = structuredClone(base)
    empty.days = []
    expect(CustomScheduleSchema.safeParse(empty).success).toBe(false)
  })

  test("a scheme and progression that disagree are rejected", () => {
    const base = materializeSchedule(upperLower) as unknown as {
      days: Array<{ exercises: Array<Record<string, unknown>> }>
    }
    const mismatched = structuredClone(base)
    mismatched.days[0].exercises[0].scheme = { kind: "percentage_tm", setsByWeek: { 1: [{ pctTM: 0.85, reps: 5 }] } }
    expect(CustomScheduleSchema.safeParse(mismatched).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------

describe("the swap pool", () => {
  test("catalog lift names resolve to a movement pattern, so a swap offers like for like", () => {
    expect(patternForName("Bench Press")).toBe("horizontal_push")
    expect(patternForName("Barbell Row")).toBe("horizontal_pull")
    expect(patternForName("  squat  ")).toBe("squat") // trimmed, then via the alias table
    // Genuinely not in the pool. This was "Sled Push" until the library grew
    // one, which is the failure mode to watch: the assertion is about an
    // UNKNOWN name, so it has to name something nobody is about to add.
    expect(patternForName("Atlas Stone Over Bar")).toBe(null)
    expect(patternForName("Back Squat")).toBe("squat")
  })

  /**
   * Guards the swap picker's usefulness, not just its correctness. A program
   * added with a lift name the library does not know still WORKS — the picker
   * falls back to the whole pool — so nothing would fail loudly. It would just
   * quietly get worse for that lift, which is what this catches.
   */
  test("every load exercise in the catalog resolves to a movement pattern", () => {
    const unresolved: string[] = []
    for (const program of ALL_PROGRAMS) {
      if (program.metricType !== "load") continue
      const s = program.schedule
      if (s.kind !== "linear_rotation" && s.kind !== "weekly_waved") continue
      for (const d of s.days) {
        for (const e of d.exercises) if (!patternForName(e.name)) unresolved.push(`${program.id}: ${e.name}`)
      }
    }
    expect(unresolved, `Add these to EXERCISE_LIBRARY or NAME_ALIASES:\n${unresolved.join("\n")}`).toEqual([])
  })

  test("aliases do not merge lifts that only share a word", () => {
    expect(patternForName("Squat")).toBe("squat")
    expect(patternForName("Front Squat")).toBe("squat")
    // Same pattern, but they resolve via their own entries, not by substring.
    expect(patternForName("Goblet Squat")).toBe("squat")
    expect(patternForName("Calf Raise")).toBe("calves")
    expect(patternForName("Not A Lift")).toBe(null)
  })

  test("every library entry builds an exercise the wire schema accepts", () => {
    let s = materializeSchedule(upperLower)
    for (const entry of EXERCISE_LIBRARY) {
      s = addExercise(s, "upper", libraryExercise(entry.id)!).schedule
    }
    const day = scheduleDays(s).find((d) => d.id === "upper")!
    expect(new Set(day.exercises.map((e) => e.id)).size).toBe(day.exercises.length) // no id collisions
  })
})
