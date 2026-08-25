/**
 * Lifts you invented, remembered and tracked.
 *
 * The report: "if i add a new exercise, like one arm tricep, it should become
 * auto-filled the next time i want it… since i want to track progress on the
 * individual lifts."
 *
 * Two halves. Remembering it is convenience. The half that matters is IDENTITY:
 * the same lift must be the same id, because `exerciseState` is keyed by id and
 * two ids means two working weights that drift apart.
 */

import { describe, test, expect } from "vitest"
import {
  forgetCustomLift,
  isCustomLiftId,
  parseCustomLifts,
  rememberCustomLift,
  searchCustomLifts,
  serializeCustomLifts,
} from "@/src/programs/customLifts"
import { customLibraryEntry, libraryExercise } from "@/src/programs/data/exerciseLibrary"
import { addDay, addExercise, scheduleDays } from "@/src/programs/customize"
import { emptyCustomSchedule } from "@/src/programs/builder"
import type { LoadExercise, ProgramSchedule } from "@/src/programs/types"

const tricep = () => customLibraryEntry("One Arm Tricep", "arms")!
const liftsIn = (s: ProgramSchedule, i: number) => scheduleDays(s)[i].exercises as LoadExercise[]

describe("the same lift is the same lift", () => {
  test("the id comes from the name, so typing it again finds the same lift", () => {
    expect(customLibraryEntry("One Arm Tricep", "arms")!.id).toBe(
      customLibraryEntry("one arm tricep", "arms")!.id
    )
    expect(customLibraryEntry("  One   Arm   Tricep  ", "arms")!.id).toBe(tricep().id)
  })

  test("a different name is a different lift", () => {
    expect(customLibraryEntry("One Arm Tricep", "arms")!.id).not.toBe(
      customLibraryEntry("Two Arm Tricep", "arms")!.id
    )
  })

  test("custom ids are recognisable", () => {
    expect(isCustomLiftId(tricep().id)).toBe(true)
    expect(isCustomLiftId("lib_bench_press")).toBe(false)
  })
})

describe("adding the same lift to two days", () => {
  /**
   * THE BUG THIS COVERS. Every add used to get a fresh suffixed id, so the same
   * lift on two days became two working weights — your bench on Monday and a
   * separate bench on Thursday, drifting apart.
   */
  test("shares one id across days, so progress accrues to one lift", () => {
    let s = addDay(emptyCustomSchedule(), "Push")
    let out = addExercise(s, scheduleDays(s)[0].id, tricep())
    s = out.schedule
    s = addDay(s, "Pull")
    const second = addExercise(s, scheduleDays(s)[1].id, tricep())
    expect(second.exerciseId).toBe(out.exerciseId)
    expect(liftsIn(second.schedule, 1)[0].id).toBe(liftsIn(second.schedule, 0)[0].id)
  })

  test("catalog lifts share too — your bench is your bench", () => {
    let s = addDay(emptyCustomSchedule(), "Push A")
    const a = addExercise(s, scheduleDays(s)[0].id, libraryExercise("lib_bench_press")!)
    s = addDay(a.schedule, "Push B")
    const b = addExercise(s, scheduleDays(s)[1].id, libraryExercise("lib_bench_press")!)
    expect(b.exerciseId).toBe(a.exerciseId)
  })

  test("but twice in ONE day is two slots, which the log has to tell apart", () => {
    let s = addDay(emptyCustomSchedule(), "Push")
    const dayId = scheduleDays(s)[0].id
    const a = addExercise(s, dayId, tricep())
    const b = addExercise(a.schedule, dayId, tricep())
    expect(b.exerciseId).not.toBe(a.exerciseId)
    const ids = liftsIn(b.schedule, 0).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("remembering", () => {
  test("a lift is stored once, newest first, however often it is re-added", () => {
    let list = rememberCustomLift([], tricep())
    list = rememberCustomLift(list, customLibraryEntry("Sled Drag", "quads")!)
    list = rememberCustomLift(list, tricep())
    expect(list).toHaveLength(2)
    expect(list[0].name).toBe("One Arm Tricep")
  })

  test("re-adding updates the stored entry rather than duplicating it", () => {
    const list = rememberCustomLift(
      rememberCustomLift([], customLibraryEntry("One Arm Tricep", "chest")!),
      customLibraryEntry("One Arm Tricep", "arms")!
    )
    expect(list).toHaveLength(1)
    expect(list[0].group).toBe("arms")
  })

  test("forgetting removes exactly one", () => {
    const list = rememberCustomLift(rememberCustomLift([], tricep()), customLibraryEntry("Sled Drag", "quads")!)
    const after = forgetCustomLift(list, tricep().id)
    expect(after.map((l) => l.name)).toEqual(["Sled Drag"])
  })

  test("a round trip through storage keeps them", () => {
    const list = rememberCustomLift([], tricep())
    expect(parseCustomLifts(serializeCustomLifts(list))).toEqual(list)
  })

  test("junk in storage loses the list, never the page", () => {
    expect(parseCustomLifts(null)).toEqual([])
    expect(parseCustomLifts("not json")).toEqual([])
    expect(parseCustomLifts('{"not":"an array"}')).toEqual([])
    expect(parseCustomLifts('[{"id":"x"}]')).toEqual([]) // not a lift
    expect(parseCustomLifts('[{"id":"custom_x","name":"X","group":"nope","pattern":"arms","defaultSets":3,"defaultRepMin":8,"defaultRepMax":12,"suggestedKg":{}}]')).toEqual([])
  })

  test("one bad entry does not discard the good ones beside it", () => {
    const good = serializeCustomLifts([tricep()])
    const mixed = `[${JSON.stringify({ id: "broken" })},${good.slice(1, -1)}]`
    expect(parseCustomLifts(mixed).map((l) => l.name)).toEqual(["One Arm Tricep"])
  })

  test("searching your own lifts is a plain contains match", () => {
    const list = rememberCustomLift(rememberCustomLift([], tricep()), customLibraryEntry("Sled Drag", "quads")!)
    expect(searchCustomLifts(list, "tricep").map((l) => l.name)).toEqual(["One Arm Tricep"])
    expect(searchCustomLifts(list, "arm").map((l) => l.name)).toEqual(["One Arm Tricep"])
    expect(searchCustomLifts(list, "")).toEqual([])
    expect(searchCustomLifts(list, "zzz")).toEqual([])
  })
})
