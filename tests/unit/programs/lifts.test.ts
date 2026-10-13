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
  customLiftId,
  freeLiftEntry,
  libraryExercise,
  patternForName,
  searchLibrary,
  canBeUnweighted,
} from "@/src/programs/data/exerciseLibrary"
import { addDay, addExercise, loadExerciseFromLibrary, scheduleDays } from "@/src/programs/customize"
import { formatProgramText, parseProgramText } from "@/src/programs/programText"
import { CustomScheduleSchema } from "@/src/programs/schemas"
import type { LoadExercise, ProgramSchedule } from "@/src/programs/types"

const emptyWeek = (): ProgramSchedule => ({ kind: "linear_rotation", days: [] })

/** One day holding a bench press with `drops` written on it literally. */
function benchWithDrops(drops: number): ProgramSchedule {
  const schedule = addDay(emptyWeek(), "Push")
  const dayId = scheduleDays(schedule)[0].id
  const out = addExercise(schedule, dayId, libraryExercise("lib_bench_press")!).schedule
  if (out.kind !== "linear_rotation") throw new Error("fixture: a days-and-lifts week")
  return {
    kind: "linear_rotation",
    days: out.days.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e, dropSets: drops })) })),
  }
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
      if (e.assisted) continue // handled by its own test below
      const { beginner, intermediate, advanced } = e.suggestedKg
      expect(intermediate).toBeGreaterThanOrEqual(beginner)
      expect(advanced).toBeGreaterThanOrEqual(intermediate)
    }
    expect(libraryExercise("lib_push_up")!.suggestedKg.advanced).toBe(0)
  })

  test("an assisted lift's numbers FALL with level — the weight is help", () => {
    // The assisted pull-up was seeded 25 → 40 → 55, which says an advanced
    // lifter needs more help than a beginner, and then the engine ratcheted the
    // assistance upward every session. Both were backwards.
    for (const e of EXERCISE_LIBRARY.filter((x) => x.assisted)) {
      const { beginner, intermediate, advanced } = e.suggestedKg
      expect(intermediate, `${e.name} intermediate`).toBeLessThanOrEqual(beginner)
      expect(advanced, `${e.name} advanced`).toBeLessThanOrEqual(intermediate)
    }
  })

  test("a hold is measured in seconds and does not gain weight for existing", () => {
    // A plank arrived as "3 × 1 rep" on double progression, so making "one rep"
    // on all three sets added 2.5 kg to it every session, for ever.
    const plank = loadExerciseFromLibrary(libraryExercise("lib_plank")!, "x_plank")
    expect(plank.repUnit).toBe("sec")
    expect(plank.progression.kind).toBe("none")
    // A loaded carry is also timed, but it DOES progress — by adding weight for
    // the same time, which is how a carry gets harder.
    const carry = loadExerciseFromLibrary(libraryExercise("lib_farmer_carry")!, "x_carry")
    expect(carry.repUnit).toBe("sec")
    expect(carry.progression.kind).toBe("linear_load")
  })
})

/**
 * `freeLiftEntry` is the one rule for a lift the library does not know: the
 * program editor's search builds from it, and so does the text parser.
 */
describe("a lift you write yourself", () => {
  test("keeps the name as typed, tidied, under the one custom id rule", () => {
    const entry = freeLiftEntry("  Cable   Thing  ")!
    expect(entry.name).toBe("Cable Thing")
    expect(entry.id).toBe(customLiftId("Cable Thing"))
  })

  test("is free-loaded on double progression with no starting weight, because we know nothing about it", () => {
    // Guessing barbell floors a 6 kg movement at the 20 kg bar, and a made-up
    // suggested weight under a made-up lift is a number pretending to be advice.
    const entry = freeLiftEntry("Cable Thing")!
    const lift = loadExerciseFromLibrary(entry, entry.id)
    expect(lift.loadStyle).toBe("free")
    expect(lift.progression.kind).toBe("double_progression")
    expect(Object.values(entry.suggestedKg)).toEqual([0, 0, 0])
  })

  test("refuses a name that is not one", () => {
    expect(freeLiftEntry("")).toBeNull()
    expect(freeLiftEntry("   ")).toBeNull()
  })

  test("does not join the library everyone else sees", () => {
    const before = EXERCISE_LIBRARY.length
    freeLiftEntry("Cable Thing")
    expect(EXERCISE_LIBRARY.length).toBe(before)
    expect(patternForName("Cable Thing")).toBeNull()
  })

  test("goes into a day and passes the wire schema like any other lift", () => {
    const schedule = addDay(emptyWeek(), "Arms")
    const dayId = scheduleDays(schedule)[0].id
    const out = addExercise(schedule, dayId, freeLiftEntry("Cable Thing")!).schedule
    expect((scheduleDays(out)[0].exercises[0] as LoadExercise).name).toBe("Cable Thing")
    expect(CustomScheduleSchema.safeParse(out).success).toBe(true)
  })
})

describe("drop sets", () => {
  test("survive the written form, which is the only way they could be lost", () => {
    // formatProgramText writes them out; the parser's last rule is "whatever is
    // left is the name", so an unread suffix would come back as a lift called
    // "Bench Press +2 drops" — matching nothing in the library or workout_sets.
    const text = formatProgramText(benchWithDrops(2))
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
    expect(CustomScheduleSchema.safeParse(benchWithDrops(3)).success).toBe(true)
  })
})

/**
 * WHICH LIFTS CAN BE DONE WITH NOTHING ADDED.
 *
 * In plain terms, why this matters: an empty weight box means two different
 * things. On a bench press it means "I forgot to type it", and the set must not
 * be saved as 0 kg. On a pull-up it means "just me, no plates" — the truth, and
 * it saves as 0. The library is the one place that knows which is which, and it
 * derives the answer from the beginner seed weight rather than carrying a
 * second hand-written flag that could drift from it.
 *
 * The rule is NOT "all three seeds are zero". Pull-up is 0/5/20, chin-up
 * 0/5/20, dip 0/10/25, inverted row 0/0/10 — an advanced lifter adds plates to
 * every one of them, and that rule would have refused a beginner's pull-up.
 */
describe("lifts you can do with nothing added", () => {
  test("a lift seeded at 0 for beginners can be done unweighted, and only those", () => {
    for (const ex of EXERCISE_LIBRARY) {
      expect(ex.unweightedOk === true, `${ex.name} (beginner ${ex.suggestedKg.beginner})`).toBe(
        ex.suggestedKg.beginner === 0
      )
    }
  })

  test("names the lifts a person would expect on each side of the line", () => {
    for (const name of ["Pull-up", "Dip", "Push-up"]) {
      expect(canBeUnweighted(undefined, name), name).toBe(true)
    }
    // Assisted Pull-up is seeded WITH assistance, so a blank box there is a
    // missing number, not "nothing added".
    for (const name of ["Bench Press", "Assisted Pull-up", "Barbell Squat"]) {
      expect(canBeUnweighted(undefined, name), name).toBe(false)
    }
  })

  test("answers by library id as well as by name", () => {
    const pullUp = EXERCISE_LIBRARY.find((e) => e.name === "Pull-up")!
    expect(canBeUnweighted(pullUp.id)).toBe(true)
    const bench = EXERCISE_LIBRARY.find((e) => e.name === "Bench Press")!
    expect(canBeUnweighted(bench.id)).toBe(false)
  })

  test("a lift nobody recognises is treated as needing a weight", () => {
    // The safe direction: refusing a blank weight costs one typed zero,
    // accepting it stores a set at 0 kg that no total can explain.
    expect(canBeUnweighted(undefined, "Reverse Hyper Machine")).toBe(false)
    expect(canBeUnweighted("lib_not_a_lift")).toBe(false)
    expect(canBeUnweighted()).toBe(false)
  })
})
