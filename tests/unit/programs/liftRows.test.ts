/**
 * ROWS ARE SLOTS, NOT POSITIONS.
 *
 * The screen drew "as many rows as were prescribed" and found each row's set
 * with `setNumber === n && kind !== "warmup"`. The database's rule is
 * `(lift, kind, number, side)` — a different rule — and the gap between them
 * is where three faults lived: a warm-up set 1 marked the working row done, a
 * re-tagged set kept occupying the slot it had left, and a set ticked into a
 * slot nobody prescribed had no row on screen at all while still counting in
 * the totals.
 */

import { describe, it, expect } from "vitest"
import { applyLiftOrder, liftRows, moveLift, setLabel, setSlot } from "@/src/programs/programsService"
import type { LiveWorkoutSet, PrescribedSet } from "@/src/programs/types"

/** A prescribed set, in full — `amrap` and `weightKg` are not optional. */
const spec = (setNumber: number, over: Partial<PrescribedSet> = {}): PrescribedSet => ({
  setNumber,
  reps: 5,
  amrap: false,
  weight: 100,
  weightKg: 100,
  ...over,
})

const squat = {
  exerciseId: "squat",
  sets: [spec(1), spec(2), spec(3)],
}

const ticked = (over: Partial<LiveWorkoutSet> & { setNumber: number }): LiveWorkoutSet => ({
  id: `s${over.setNumber}-${over.kind ?? "working"}`,
  exerciseId: "squat",
  exercise: "Squat",
  weight: 100,
  weightKg: 100,
  reps: 5,
  kind: "working",
  prescribedIndex: null,
  completedAt: "2026-09-23T10:00:00Z",
  rpe: null,
  side: null,
  ...over,
})

describe("setSlot", () => {
  it("is the database's own uniqueness expression", () => {
    // uq_workout_sets_slot: (log_id, COALESCE(exercise_id, exercise),
    // set_kind, set_number, COALESCE(side, ''))
    expect(setSlot({ exerciseId: "squat", exercise: "Squat", kind: "working", setNumber: 1, side: null })).toBe(
      "squat|working|1|"
    )
  })

  it("falls back to the name for a workout off any program", () => {
    expect(setSlot({ exerciseId: null, exercise: "Squat", kind: "warmup", setNumber: 2, side: "left" })).toBe(
      "Squat|warmup|2|left"
    )
  })

  it("tells a warm-up set 1 from a working set 1", () => {
    const warm = setSlot({ exerciseId: "squat", exercise: "Squat", kind: "warmup", setNumber: 1, side: null })
    const work = setSlot({ exerciseId: "squat", exercise: "Squat", kind: "working", setNumber: 1, side: null })
    expect(warm).not.toBe(work)
  })
})

describe("setLabel", () => {
  it("is W for a warm-up, D for a drop, the number otherwise", () => {
    expect(setLabel("warmup", 1)).toBe("W1")
    expect(setLabel("drop", 2)).toBe("D2")
    expect(setLabel("working", 3)).toBe("3")
    expect(setLabel("amrap", 5)).toBe("5")
  })
})

describe("liftRows", () => {
  it("draws one row per prescribed set, in order, with nothing ticked", () => {
    const rows = liftRows(squat, [])
    expect(rows.map((r) => r.setNumber)).toEqual([1, 2, 3])
    expect(rows.every((r) => r.done === null)).toBe(true)
    expect(rows[0].prescribed).toEqual(spec(1))
  })

  it("puts a ticked set in its own slot's row, not in the row with its number", () => {
    const rows = liftRows(squat, [ticked({ setNumber: 1, kind: "warmup" })])
    // Four rows: the warm-up, and the three working sets the program asked for
    // — the warm-up did NOT mark working set 1 done.
    expect(rows.map((r) => setLabel(r.kind, r.setNumber))).toEqual(["W1", "1", "2", "3"])
    expect(rows[0].done?.kind).toBe("warmup")
    expect(rows[1].done).toBeNull()
  })

  it("hands the working slot back when a ticked set is re-tagged out of it", () => {
    // This is what the PATCH does: the set moves to warmup|1, and the program
    // still wants three working sets, so the empty row returns.
    const rows = liftRows(squat, [ticked({ setNumber: 1, kind: "warmup" })])
    expect(rows.filter((r) => r.kind === "working" && r.done === null)).toHaveLength(3)
  })

  it("gives a row to a set nobody prescribed rather than hiding it", () => {
    const rows = liftRows(squat, [ticked({ setNumber: 1, kind: "drop", reps: 8 })])
    expect(rows.map((r) => setLabel(r.kind, r.setNumber))).toEqual(["1", "2", "3", "D1"])
    expect(rows[3].prescribed).toBeNull()
  })

  it("reveals extra working rows, pre-filled from the last prescribed set", () => {
    const rows = liftRows(squat, [], { extra: 2 })
    expect(rows.map((r) => r.setNumber)).toEqual([1, 2, 3, 4, 5])
    expect(rows[4].prescribed).toEqual(spec(5))
  })

  it("does not grow a row for every set ticked beyond the prescription", () => {
    // Ticking a revealed fourth set used to make the count 4 AND add a fifth
    // empty row, and another for every set after that.
    const rows = liftRows(squat, [ticked({ setNumber: 4 })], { extra: 1 })
    expect(rows.map((r) => r.setNumber)).toEqual([1, 2, 3, 4])
  })

  it("writes an untouched row as the kind it was tagged, before it is ticked", () => {
    const rows = liftRows(squat, [], { kinds: { "squat|working|1|": "warmup" } })
    expect(setLabel(rows[0].kind, rows[0].setNumber)).toBe("W1")
    /**
     * And it loses the prescription with the tag. The program asked for
     * 100 kg × 5 as a WORKING set; 100 kg pre-filled in a warm-up box is a
     * number nobody prescribed, and the one most likely to be ticked by
     * accident.
     */
    expect(rows[0].prescribed).toBeNull()
    // It has no "last time" any more either — there is no honest previous for
    // a warm-up somebody decided to add today.
    expect(rows[0].workingIndex).toBeNull()
  })

  it("keeps the prescription when the tag puts the row back as it was", () => {
    const rows = liftRows(squat, [], { kinds: { "squat|working|1|": "working" } })
    expect(rows[0].prescribed?.weight).toBe(100)
  })

  it("matches a tagged row's ticked set in the slot it was tagged into", () => {
    const rows = liftRows(squat, [ticked({ setNumber: 1, kind: "warmup" })], {
      kinds: { "squat|working|1|": "warmup" },
    })
    expect(rows[0].done?.kind).toBe("warmup")
    // And the set is not ALSO drawn as an orphan row of its own.
    expect(rows.filter((r) => r.done?.kind === "warmup")).toHaveLength(1)
  })

  it("hides a row swiped away on this phone, and only an untouched one", () => {
    const rows = liftRows(squat, [], { hidden: ["squat|working|3|"] })
    expect(rows.map((r) => r.setNumber)).toEqual([1, 2])
  })

  it("keeps a hidden row's set when that set exists, because a fact cannot be swiped", () => {
    const rows = liftRows(squat, [ticked({ setNumber: 3 })], { hidden: ["squat|working|3|"] })
    expect(rows.map((r) => r.setNumber)).toEqual([1, 2, 3])
    expect(rows[2].done?.id).toBe("s3-working")
  })

  it("orders warm-ups first, then working sets, then what came off the end", () => {
    const rows = liftRows(squat, [
      ticked({ setNumber: 1, kind: "drop" }),
      ticked({ setNumber: 2, kind: "warmup" }),
      ticked({ setNumber: 1, kind: "warmup" }),
    ])
    expect(rows.map((r) => setLabel(r.kind, r.setNumber))).toEqual(["W1", "W2", "1", "2", "3", "D1"])
  })

  it("an amrap set keeps its own kind, so its row and its set agree", () => {
    const amrap = {
      exerciseId: "bench",
      sets: [spec(1, { weight: 80, weightKg: 80 }), spec(2, { weight: 80, weightKg: 80, amrap: true })],
    }
    const rows = liftRows(amrap, [
      { ...ticked({ setNumber: 2, kind: "amrap", reps: 9 }), exerciseId: "bench", exercise: "Bench Press" },
    ])
    expect(rows).toHaveLength(2)
    expect(rows[1].done?.reps).toBe(9)
  })
})

describe("warm-up rows", () => {
  it("reveals as many as asked for, above the working sets, pre-filling nothing", () => {
    const rows = liftRows(squat, [], { warmups: 2 })
    expect(rows.map((r) => setLabel(r.kind, r.setNumber))).toEqual(["W1", "W2", "1", "2", "3"])
    // "50 % of set 1" would be a number nobody prescribed.
    expect(rows[0].prescribed).toBeNull()
  })

  it("does not draw a second W1 for a warm-up already ticked", () => {
    const rows = liftRows(squat, [ticked({ setNumber: 1, kind: "warmup" })], { warmups: 1 })
    expect(rows.filter((r) => r.kind === "warmup")).toHaveLength(1)
    expect(rows[0].done?.kind).toBe("warmup")
  })

  it("keeps a ticked warm-up on screen even with none revealed", () => {
    const rows = liftRows(squat, [ticked({ setNumber: 2, kind: "warmup" })])
    // W2 exists because a set exists at W2. A phantom W1 is not invented to
    // fill the gap: nothing was logged there.
    expect(rows.map((r) => setLabel(r.kind, r.setNumber))).toEqual(["W2", "1", "2", "3"])
  })

  it("a row tagged as a warm-up takes the next free warm-up number", () => {
    // W1 is revealed and set 1 is then tagged as a warm-up too. Both writing
    // `warmup|1` would mean the second tick CORRECTING the first set instead
    // of adding one.
    const rows = liftRows(squat, [], { warmups: 1, kinds: { "squat|working|1|": "warmup" } })
    expect(rows.map((r) => setLabel(r.kind, r.setNumber))).toEqual(["W1", "W2", "2", "3"])
  })

  it("a row tagged as a warm-up skips a number a ticked set already holds", () => {
    const rows = liftRows(squat, [ticked({ setNumber: 1, kind: "warmup" })], {
      kinds: { "squat|working|2|": "warmup" },
    })
    expect(rows.map((r) => setLabel(r.kind, r.setNumber))).toEqual(["W1", "W2", "1", "3"])
  })
})

describe("the order you did them in", () => {
  const lifts = [{ exerciseId: "squat" }, { exerciseId: "bench" }, { exerciseId: "row" }]

  it("draws the program's order when nothing was moved", () => {
    expect(applyLiftOrder(lifts, undefined).map((l) => l.exerciseId)).toEqual(["squat", "bench", "row"])
    expect(applyLiftOrder(lifts, []).map((l) => l.exerciseId)).toEqual(["squat", "bench", "row"])
  })

  it("draws the order that was recorded", () => {
    expect(applyLiftOrder(lifts, ["bench", "squat", "row"]).map((l) => l.exerciseId)).toEqual([
      "bench",
      "squat",
      "row",
    ])
  })

  it("does not lose a lift the order has never heard of", () => {
    // An order written before a lift was added on the day must not make that
    // lift vanish off the screen it was added to.
    const withAdded = [...lifts, { exerciseId: "added_curl" }]
    expect(applyLiftOrder(withAdded, ["row", "squat", "bench"]).map((l) => l.exerciseId)).toEqual([
      "row",
      "squat",
      "bench",
      "added_curl",
    ])
  })

  it("moves one lift one place, and refuses to move it off either end", () => {
    expect(moveLift(lifts, "bench", -1)).toEqual(["bench", "squat", "row"])
    expect(moveLift(lifts, "bench", 1)).toEqual(["squat", "row", "bench"])
    expect(moveLift(lifts, "squat", -1)).toEqual(["squat", "bench", "row"])
    expect(moveLift(lifts, "row", 1)).toEqual(["squat", "bench", "row"])
  })

  it("returns the whole list, because the order is stored whole", () => {
    // Building the list at the call site is how one lift's move comes to wipe
    // another's — the same reason `withRest` returns the whole map.
    expect(moveLift(lifts, "squat", 1)).toHaveLength(3)
  })
})
