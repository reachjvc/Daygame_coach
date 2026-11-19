/**
 * THE LIVE WORKOUT'S REMOVALS AND CHANGES, THROUGH THE REPO, AGAINST THE REAL SCHEMA.
 *
 * `deleteSet`, `adjustWorkout` and `discardWorkout` are what the owner presses
 * in the middle of a session. Per function: the rows hold what was asked for,
 * another account's open workout (made first) is byte-identical afterwards, and
 * a removal takes the target and nothing beside it.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { adjustWorkout, completeSet, deleteSet, discardWorkout, finishWorkout, startWorkout } from "@/src/db/workoutRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

async function text(table: string, key: string, value: string): Promise<string[]> {
  const rows = await asOwner((q) => q(`select t::text as r from ${table} t where ${key} = $1 order by 1`, [value]))
  return rows.map((r) => String(r.r))
}

/** An open loose workout with three ticked squat sets, as a signed-in user. */
async function anOpenWorkout(label: string) {
  const user = await newUser(label)
  actAs(user)
  const workout = await startWorkout(user.id, { clientKey: `k-${randomUUID()}` })
  for (const n of [1, 2, 3]) {
    await completeSet(user.id, workout.id, { exerciseId: null, exercise: "Squat", weight: 100 + n, reps: 5, setNumber: n })
  }
  return { user, id: workout.id }
}

describe("deleteSet", () => {
  it("removes the one set and leaves the others and another account's workout byte-identical", async () => {
    const theirs = await anOpenWorkout("ws-ds-other")
    const theirLog = await text("workout_logs", "id", theirs.id)
    const theirSets = await text("workout_sets", "log_id", theirs.id)
    const mine = await anOpenWorkout("ws-ds-me")
    actAs(mine.user)
    const [two] = await asOwner((q) => q("select id from workout_sets where log_id = $1 and set_number = 2", [mine.id]))
    const keptBefore = (await text("workout_sets", "log_id", mine.id)).filter((r) => !r.includes(String(two.id)))

    const live = await deleteSet(mine.user.id, mine.id, String(two.id))

    expect(live.sets.map((s) => s.setNumber)).toEqual([1, 3])
    expect(await text("workout_sets", "log_id", mine.id)).toEqual(keptBefore)
    expect(await text("workout_logs", "id", theirs.id)).toEqual(theirLog)
    expect(await text("workout_sets", "log_id", theirs.id)).toEqual(theirSets)
  })

  it("a set id that belongs to another workout deletes nothing, even asked for through your own", async () => {
    const theirs = await anOpenWorkout("ws-ds-x-other")
    const theirSets = await text("workout_sets", "log_id", theirs.id)
    const [theirOne] = await asOwner((q) => q("select id from workout_sets where log_id = $1 and set_number = 1", [theirs.id]))
    const mine = await anOpenWorkout("ws-ds-x-me")
    actAs(mine.user)

    await deleteSet(mine.user.id, mine.id, String(theirOne.id))

    expect(await text("workout_sets", "log_id", theirs.id)).toEqual(theirSets)
    expect(await asOwner((q) => q("select 1 from workout_sets where log_id = $1", [mine.id]))).toHaveLength(3)
  })
})

describe("adjustWorkout", () => {
  it("writes what changed on the day, merges rather than replaces, and leaves another account's workout alone", async () => {
    const theirs = await anOpenWorkout("ws-aw-other")
    const theirLog = await text("workout_logs", "id", theirs.id)
    const mine = await anOpenWorkout("ws-aw-me")
    actAs(mine.user)

    await adjustWorkout(mine.user.id, mine.id, { skipped: ["bench"], rest: { squat: 150 } })
    await adjustWorkout(mine.user.id, mine.id, { order: ["squat", "bench"], notes: "felt heavy", rpe: 8.5 })

    const [row] = await asOwner((q) => q("select adjustments, notes, rpe, user_id, ended_at from workout_logs where id = $1", [mine.id]))
    expect(row.adjustments).toEqual({ skipped: ["bench"], rest: { squat: 150 }, order: ["squat", "bench"] })
    expect(row.notes).toBe("felt heavy")
    expect(Number(row.rpe)).toBe(8.5)
    expect(row.user_id).toBe(mine.user.id)
    expect(row.ended_at).toBeNull()
    expect(await text("workout_logs", "id", theirs.id)).toEqual(theirLog)
  })

  it("a patch without notes or rpe does not clear the ones already saved", async () => {
    const mine = await anOpenWorkout("ws-aw-keep")
    actAs(mine.user)
    await adjustWorkout(mine.user.id, mine.id, { notes: "keep me", rpe: 7 })
    await adjustWorkout(mine.user.id, mine.id, { skipped: ["row"] })
    const [row] = await asOwner((q) => q("select notes, rpe from workout_logs where id = $1", [mine.id]))
    expect(row.notes).toBe("keep me")
    expect(Number(row.rpe)).toBe(7)
  })
})

describe("discardWorkout", () => {
  it("throws away the open workout and its sets, and only that one", async () => {
    const theirs = await anOpenWorkout("ws-dw-other")
    const theirLog = await text("workout_logs", "id", theirs.id)
    const theirSets = await text("workout_sets", "log_id", theirs.id)
    const mine = await anOpenWorkout("ws-dw-me")
    actAs(mine.user)

    await discardWorkout(mine.user.id, mine.id)

    expect(await asOwner((q) => q("select 1 from workout_logs where id = $1", [mine.id]))).toHaveLength(0)
    expect(await asOwner((q) => q("select 1 from workout_sets where log_id = $1", [mine.id]))).toHaveLength(0)
    expect(await text("workout_logs", "id", theirs.id)).toEqual(theirLog)
    expect(await text("workout_sets", "log_id", theirs.id)).toEqual(theirSets)
  })

  it("will not throw away a workout that is already finished: it stays, byte for byte", async () => {
    const mine = await anOpenWorkout("ws-dw-done")
    actAs(mine.user)
    await finishWorkout(mine.user.id, mine.id, { intensity: 3, sessionType: "weights" })
    const log = await text("workout_logs", "id", mine.id)
    const sets = await text("workout_sets", "log_id", mine.id)

    await expect(discardWorkout(mine.user.id, mine.id)).rejects.toThrow()

    expect(await text("workout_logs", "id", mine.id)).toEqual(log)
    expect(await text("workout_sets", "log_id", mine.id)).toEqual(sets)
  })

  it("another account's workout id is refused and the workout is untouched", async () => {
    const theirs = await anOpenWorkout("ws-dw-x-other")
    const theirLog = await text("workout_logs", "id", theirs.id)
    const me = await newUser("ws-dw-x-me")
    actAs(me)

    await expect(discardWorkout(me.id, theirs.id)).rejects.toThrow()

    expect(await text("workout_logs", "id", theirs.id)).toEqual(theirLog)
  })
})
