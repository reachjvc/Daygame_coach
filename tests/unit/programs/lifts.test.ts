/**
 * The lift pool, the lifts you write yourself, and the two modifiers.
 *
 * Three separate reports drove this file:
 *
 *   - "we have assisted pull up, but not an actual pull up" — we had both, and
 *     neither could be found, because every name in the pool carries hyphens
 *     and nobody types them.
 *   - the pool being too small to design a real week from.
 *   - no way to say "drop set" at all.
 */

import { describe, test, expect } from "vitest"
import {
  EXERCISE_LIBRARY,
  PATTERN_ORDER,
  customLibraryEntry,
  libraryExercise,
  patternForName,
  searchLibrary,
} from "@/src/programs/data/exerciseLibrary"
import { addDay, addExercise, scheduleDays } from "@/src/programs/customize"
import { emptyCustomSchedule } from "@/src/programs/components/CustomProgramBuilder"
import { setDropSets } from "@/src/programs/builder"
import { formatProgramText, parseProgramText } from "@/src/programs/programText"
import { CustomScheduleSchema } from "@/src/programs/schemas"
import type { LoadExercise, ProgramSchedule } from "@/src/programs/types"

const dayOf = (s: ProgramSchedule) => scheduleDays(s)[0]
const lifts = (s: ProgramSchedule) => dayOf(s).exercises as LoadExercise[]

function oneLiftDay() {
  const schedule = addDay(emptyCustomSchedule(), "Push")
  const dayId = scheduleDays(schedule)[0].id
  return { ...addExercise(schedule, dayId, libraryExercise("lib_bench_press")!), dayId }
}

describe("finding a lift", () => {
  test("finds a hyphenated lift however it is typed", () => {
    // The exact report: the pool held Pull-up all along.
    for (const q of ["pull up", "pullup", "Pull-Up", "pull-up", "  PULL UP "]) {
      expect(searchLibrary(q).map((e) => e.name)).toContain("Pull-up")
    }
  })

  test("does not answer with the assisted one and not the real one", () => {
    const names = searchLibrary("pull up").map((e) => e.name)
    expect(names).toContain("Pull-up")
    expect(names).toContain("Assisted Pull-up")
    // …and the plain one leads, because it is the one that was asked for.
    expect(names.indexOf("Pull-up")).toBeLessThan(names.indexOf("Assisted Pull-up"))
  })

  test("puts a name that starts with the query above one that merely contains it", () => {
    const names = searchLibrary("row").map((e) => e.name)
    expect(names.indexOf("Barbell Row")).toBeLessThan(names.indexOf("Rear Delt Row"))
  })

  test("finds a lift under the word people actually use for it", () => {
    expect(searchLibrary("military press").map((e) => e.name)).toContain("Overhead Press")
    expect(searchLibrary("press up").map((e) => e.name)).toContain("Push-up")
    expect(searchLibrary("rfess").map((e) => e.name)).toContain("Bulgarian Split Squat")
  })

  test("returns nothing for nothing, rather than the whole pool", () => {
    expect(searchLibrary("")).toEqual([])
    expect(searchLibrary("   ")).toEqual([])
    expect(searchLibrary("xyzzy")).toEqual([])
  })
})

describe("the pool itself", () => {
  test("has no duplicate ids or names", () => {
    const ids = EXERCISE_LIBRARY.map((e) => e.id)
    const names = EXERCISE_LIBRARY.map((e) => e.name.toLowerCase())
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
  })

  test("offers something in every movement pattern the picker lists", () => {
    // A pattern heading with nothing under it is a dead end in the UI.
    for (const pattern of PATTERN_ORDER) {
      expect(EXERCISE_LIBRARY.filter((e) => e.pattern === pattern).length).toBeGreaterThan(0)
    }
  })

  test("every entry resolves back to its own pattern by name", () => {
    // patternForName drives the swap picker; an entry it cannot place would
    // offer the whole pool as alternatives to itself.
    for (const e of EXERCISE_LIBRARY) expect(patternForName(e.name)).toBe(e.pattern)
  })

  test("rep ranges are the right way round and sets are sane", () => {
    for (const e of EXERCISE_LIBRARY) {
      expect(e.defaultRepMax).toBeGreaterThanOrEqual(e.defaultRepMin)
      expect(e.defaultSets).toBeGreaterThan(0)
      expect(e.defaultSets).toBeLessThanOrEqual(20)
    }
  })

  test("suggested weights climb with level, and bodyweight movements stay at zero", () => {
    for (const e of EXERCISE_LIBRARY) {
      const { beginner, intermediate, advanced } = e.suggestedKg
      expect(intermediate).toBeGreaterThanOrEqual(beginner)
      expect(advanced).toBeGreaterThanOrEqual(intermediate)
    }
    expect(libraryExercise("lib_push_up")!.suggestedKg.advanced).toBe(0)
  })
})

describe("a lift you write yourself", () => {
  test("keeps the name as typed, tidied", () => {
    const entry = customLibraryEntry("  Cable   Thing  ", "arms")!
    expect(entry.name).toBe("Cable Thing")
    expect(entry.pattern).toBe("arms")
  })

  test("is free-loaded with no starting weight, because we know nothing about it", () => {
    // Guessing barbell floors a 6 kg movement at the 20 kg bar, and a made-up
    // suggested weight under a made-up lift is a number pretending to be advice.
    const entry = customLibraryEntry("Cable Thing", "arms")!
    expect(entry.barbell).toBe(false)
    expect(entry.compound).toBe(false)
    expect(Object.values(entry.suggestedKg)).toEqual([0, 0, 0])
  })

  test("refuses a name that is not one", () => {
    expect(customLibraryEntry("", "arms")).toBeNull()
    expect(customLibraryEntry("   ", "arms")).toBeNull()
  })

  test("does not join the library everyone else sees", () => {
    const before = EXERCISE_LIBRARY.length
    customLibraryEntry("Cable Thing", "arms")
    expect(EXERCISE_LIBRARY.length).toBe(before)
    expect(patternForName("Cable Thing")).toBeNull()
  })

  test("goes into a day and passes the wire schema like any other lift", () => {
    const schedule = addDay(emptyCustomSchedule(), "Arms")
    const dayId = scheduleDays(schedule)[0].id
    const out = addExercise(schedule, dayId, customLibraryEntry("Cable Thing", "arms")!).schedule
    expect((scheduleDays(out)[0].exercises[0] as LoadExercise).name).toBe("Cable Thing")
    expect(CustomScheduleSchema.safeParse(out).success).toBe(true)
  })
})

describe("drop sets", () => {
  test("go on and come back off through the same control", () => {
    const { schedule, dayId } = oneLiftDay()
    const id = lifts(schedule)[0].id
    const on = setDropSets(schedule, dayId, id, 2)
    expect((lifts(on)[0] as LoadExercise).dropSets).toBe(2)
    const off = setDropSets(on, dayId, id, 0)
    expect((lifts(off)[0] as LoadExercise).dropSets).toBeUndefined()
  })

  test("are capped, because nine strips is a typo and not a plan", () => {
    const { schedule, dayId } = oneLiftDay()
    const id = lifts(schedule)[0].id
    expect((lifts(setDropSets(schedule, dayId, id, 9))[0] as LoadExercise).dropSets).toBe(4)
    expect((lifts(setDropSets(schedule, dayId, id, -3))[0] as LoadExercise).dropSets).toBeUndefined()
  })

  test("DO NOT TOUCH THE PRESCRIPTION — they are extra work, not extra sets", () => {
    // If drops became sets, the engine would read the working weight as having
    // collapsed and deload a lift that is going fine.
    const { schedule, dayId } = oneLiftDay()
    const id = lifts(schedule)[0].id
    const before = lifts(schedule)[0]
    const after = lifts(setDropSets(schedule, dayId, id, 3))[0]
    expect(after.scheme).toEqual(before.scheme)
    expect(after.progression).toEqual(before.progression)
  })

  test("survive the written form, which is the only way they could be lost", () => {
    // formatProgramText writes them out; the parser's last rule is "whatever is
    // left is the name", so an unread suffix would come back as a lift called
    // "Bench Press +2 drops" — matching nothing in the library or workout_sets.
    const { schedule, dayId } = oneLiftDay()
    const id = lifts(schedule)[0].id
    const text = formatProgramText(setDropSets(schedule, dayId, id, 2))
    expect(text).toContain("+2 drops")

    const parsed = parseProgramText(text)
    const back = scheduleDays(parsed.schedule)[0].exercises[0] as LoadExercise
    expect(back.name).toBe("Bench Press")
    expect(back.dropSets).toBe(2)
  })

  test("a trailing drop marker is not confused with a leading superset one", () => {
    const parsed = parseProgramText("Push\nBench Press 3x8 @60 +2 drops\n+ Dumbbell Fly 3x12")
    const [bench, fly] = scheduleDays(parsed.schedule)[0].exercises as LoadExercise[]
    expect(bench.dropSets).toBe(2)
    expect(bench.supersetGroup).toBeTruthy()
    expect(fly.supersetGroup).toBe(bench.supersetGroup)
    expect(fly.dropSets).toBeUndefined()
  })

  test("a design with drops still passes the wire schema", () => {
    const { schedule, dayId } = oneLiftDay()
    const id = lifts(schedule)[0].id
    expect(CustomScheduleSchema.safeParse(setDropSets(schedule, dayId, id, 3)).success).toBe(true)
  })
})
