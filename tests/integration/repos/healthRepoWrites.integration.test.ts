/**
 * THE HEALTH LOGS, WRITTEN AND DELETED THROUGH THE REPO, AGAINST THE REAL SCHEMA.
 *
 * Weight, sleep and nutrition are what a person types in by hand and cannot
 * type again. Per write: the row holds every field the function was given;
 * another account's rows, made first, are byte-identical afterwards; a delete
 * takes the target row and no other.
 *
 * Row security backs every one of these repo filters, so a test as the signed-in
 * user cannot tell whether the repo's own `user_id` filter is there. The
 * "filter alone" tests therefore run the same call with the server's key (which
 * row security does not apply to): then the repo's filter is the only fence.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, admin, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import {
  createNutritionLog,
  createSleepLog,
  createWeightLog,
  deleteNutritionLog,
  deleteSleepLog,
  deleteWeightLog,
  deleteWorkoutLog,
} from "@/src/db/healthRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

/** The signed-in user's session replaced by the server's key: the repo's own filter is the only fence. */
function actWithoutRowSecurity(user: TestUser): void {
  actAs({ ...user, client: admin() })
}

async function rowText(table: string, id: string): Promise<string | undefined> {
  const [row] = await asOwner((q) => q(`select t::text as r from ${table} t where id = $1`, [id]))
  return row ? String(row.r) : undefined
}

describe("createWeightLog", () => {
  it("writes every field it was given, for the caller, and leaves another account's rows byte-identical", async () => {
    const other = await newUser("hw-other")
    actAs(other)
    const theirs = await createWeightLog(other.id, { weight_kg: 90.5, time_of_day: "evening" })
    const theirsBefore = await rowText("weight_logs", theirs.id)

    const me = await newUser("hw-mine")
    actAs(me)
    const made = await createWeightLog(me.id, {
      weight_kg: 81.25,
      time_of_day: "morning",
      photo_url: "https://example.test/p.jpg",
      logged_at: "2026-11-01T07:30:00.000Z",
    })

    const [row] = await asOwner((q) => q("select * from weight_logs where id = $1", [made.id]))
    expect(row).toMatchObject({ user_id: me.id, time_of_day: "morning", photo_url: "https://example.test/p.jpg" })
    expect(Number(row.weight_kg)).toBe(81.25)
    expect(new Date(row.logged_at as string).toISOString()).toBe("2026-11-01T07:30:00.000Z")
    expect(made.id).toBe(row.id)
    expect(await rowText("weight_logs", theirs.id)).toBe(theirsBefore)
  })

  it("a row written for somebody else's id is refused by the database, and nothing lands", async () => {
    const victim = await newUser("hw-victim")
    const intruder = await newUser("hw-intruder")
    actAs(intruder)

    await expect(createWeightLog(victim.id, { weight_kg: 1, time_of_day: "morning" })).rejects.toThrow(/Failed to create weight log/)

    const rows = await asOwner((q) => q("select id from weight_logs where user_id = $1", [victim.id]))
    expect(rows).toHaveLength(0)
  })
})

describe("deleteWeightLog", () => {
  it("removes the target row only: the same account's other row and another account's are untouched", async () => {
    const other = await newUser("hw-del-other")
    actAs(other)
    const theirs = await createWeightLog(other.id, { weight_kg: 70, time_of_day: "morning" })
    const theirsBefore = await rowText("weight_logs", theirs.id)

    const me = await newUser("hw-del-me")
    actAs(me)
    const gone = await createWeightLog(me.id, { weight_kg: 80, time_of_day: "morning" })
    const kept = await createWeightLog(me.id, { weight_kg: 81, time_of_day: "evening" })
    const keptBefore = await rowText("weight_logs", kept.id)

    await deleteWeightLog(me.id, gone.id)

    expect(await rowText("weight_logs", gone.id)).toBeUndefined()
    expect(await rowText("weight_logs", kept.id)).toBe(keptBefore)
    expect(await rowText("weight_logs", theirs.id)).toBe(theirsBefore)
  })

  it("filter alone: another account's id, asked for under your own id, deletes nothing", async () => {
    const other = await newUser("hw-fa-other")
    actAs(other)
    const theirs = await createWeightLog(other.id, { weight_kg: 70, time_of_day: "morning" })
    const theirsBefore = await rowText("weight_logs", theirs.id)
    const me = await newUser("hw-fa-me")
    actWithoutRowSecurity(me)

    await deleteWeightLog(me.id, theirs.id)

    expect(await rowText("weight_logs", theirs.id)).toBe(theirsBefore)
  })
})

describe("createSleepLog", () => {
  it("writes every field it was given, for the caller, and leaves another account's rows byte-identical", async () => {
    const other = await newUser("sl-other")
    actAs(other)
    const theirs = await createSleepLog(other.id, { bedtime: "2026-11-01T22:00:00Z", wake_time: "2026-11-02T06:00:00Z" })
    const theirsBefore = await rowText("sleep_logs", theirs.id)

    const me = await newUser("sl-mine")
    actAs(me)
    const made = await createSleepLog(me.id, {
      bedtime: "2026-11-01T23:15:00.000Z",
      wake_time: "2026-11-02T07:45:00.000Z",
      quality: 5,
      logged_at: "2026-11-02T08:00:00.000Z",
    })

    const [row] = await asOwner((q) => q("select * from sleep_logs where id = $1", [made.id]))
    expect(row.user_id).toBe(me.id)
    expect(new Date(row.bedtime as string).toISOString()).toBe("2026-11-01T23:15:00.000Z")
    expect(new Date(row.wake_time as string).toISOString()).toBe("2026-11-02T07:45:00.000Z")
    expect(row.quality).toBe(5)
    expect(new Date(row.logged_at as string).toISOString()).toBe("2026-11-02T08:00:00.000Z")
    expect(await rowText("sleep_logs", theirs.id)).toBe(theirsBefore)
  })

  it("without a quality, the database's default of 3 is what is stored", async () => {
    const me = await newUser("sl-default")
    actAs(me)
    const made = await createSleepLog(me.id, { bedtime: "2026-11-01T23:00:00Z", wake_time: "2026-11-02T07:00:00Z" })
    expect(made.quality).toBe(3)
  })
})

describe("deleteSleepLog", () => {
  it("removes the target row only", async () => {
    const other = await newUser("sl-del-other")
    actAs(other)
    const theirs = await createSleepLog(other.id, { bedtime: "2026-11-01T22:00:00Z", wake_time: "2026-11-02T06:00:00Z" })
    const theirsBefore = await rowText("sleep_logs", theirs.id)
    const me = await newUser("sl-del-me")
    actAs(me)
    const gone = await createSleepLog(me.id, { bedtime: "2026-11-01T22:00:00Z", wake_time: "2026-11-02T06:00:00Z" })
    const kept = await createSleepLog(me.id, { bedtime: "2026-11-02T22:00:00Z", wake_time: "2026-11-03T06:00:00Z", quality: 4 })
    const keptBefore = await rowText("sleep_logs", kept.id)

    await deleteSleepLog(me.id, gone.id)

    expect(await rowText("sleep_logs", gone.id)).toBeUndefined()
    expect(await rowText("sleep_logs", kept.id)).toBe(keptBefore)
    expect(await rowText("sleep_logs", theirs.id)).toBe(theirsBefore)
  })

  it("filter alone: another account's id, asked for under your own id, deletes nothing", async () => {
    const other = await newUser("sl-fa-other")
    actAs(other)
    const theirs = await createSleepLog(other.id, { bedtime: "2026-11-01T22:00:00Z", wake_time: "2026-11-02T06:00:00Z" })
    const theirsBefore = await rowText("sleep_logs", theirs.id)
    const me = await newUser("sl-fa-me")
    actWithoutRowSecurity(me)

    await deleteSleepLog(me.id, theirs.id)

    expect(await rowText("sleep_logs", theirs.id)).toBe(theirsBefore)
  })
})

describe("createNutritionLog", () => {
  it("writes every field it was given, for the caller, and leaves another account's rows byte-identical", async () => {
    const other = await newUser("nl-other")
    actAs(other)
    const theirs = await createNutritionLog(other.id, { quality_score: 2, note: "theirs" })
    const theirsBefore = await rowText("nutrition_logs", theirs.id)

    const me = await newUser("nl-mine")
    actAs(me)
    const made = await createNutritionLog(me.id, {
      quality_score: 4,
      note: "chicken and rice",
      protein_g: 55.5,
      calories: 2100,
      logged_at: "2026-11-03T12:00:00.000Z",
    })

    const [row] = await asOwner((q) => q("select * from nutrition_logs where id = $1", [made.id]))
    expect(row).toMatchObject({ user_id: me.id, quality_score: 4, note: "chicken and rice", calories: 2100 })
    expect(Number(row.protein_g)).toBe(55.5)
    expect(new Date(row.logged_at as string).toISOString()).toBe("2026-11-03T12:00:00.000Z")
    expect(await rowText("nutrition_logs", theirs.id)).toBe(theirsBefore)
  })
})

describe("deleteNutritionLog", () => {
  it("removes the target row only", async () => {
    const other = await newUser("nl-del-other")
    actAs(other)
    const theirs = await createNutritionLog(other.id, { quality_score: 3, note: "x" })
    const theirsBefore = await rowText("nutrition_logs", theirs.id)
    const me = await newUser("nl-del-me")
    actAs(me)
    const gone = await createNutritionLog(me.id, { quality_score: 3, note: "gone" })
    const kept = await createNutritionLog(me.id, { quality_score: 5, note: "kept", calories: 1800 })
    const keptBefore = await rowText("nutrition_logs", kept.id)

    await deleteNutritionLog(me.id, gone.id)

    expect(await rowText("nutrition_logs", gone.id)).toBeUndefined()
    expect(await rowText("nutrition_logs", kept.id)).toBe(keptBefore)
    expect(await rowText("nutrition_logs", theirs.id)).toBe(theirsBefore)
  })

  it("filter alone: another account's id, asked for under your own id, deletes nothing", async () => {
    const other = await newUser("nl-fa-other")
    actAs(other)
    const theirs = await createNutritionLog(other.id, { quality_score: 3, note: "x" })
    const theirsBefore = await rowText("nutrition_logs", theirs.id)
    const me = await newUser("nl-fa-me")
    actWithoutRowSecurity(me)

    await deleteNutritionLog(me.id, theirs.id)

    expect(await rowText("nutrition_logs", theirs.id)).toBe(theirsBefore)
  })
})

async function aWorkout(userId: string, over: { started?: string | null; ended?: string | null } = {}): Promise<string> {
  const id = randomUUID()
  await asOwner(async (q) => {
    const started = over.started === undefined ? "2026-11-01T09:00:00Z" : over.started
    const ended = over.ended === undefined ? "2026-11-01T09:45:00Z" : over.ended
    // the table's lifecycle rule: an open workout has no duration or intensity, a finished one has both
    await q(
      `insert into workout_logs (id, user_id, session_type, duration_min, intensity, logged_at, started_at, ended_at)
       values ($1, $2, 'weights', $3, $4, coalesce($5::timestamptz, now()), $5, $6)`,
      [id, userId, ended ? 45 : null, ended ? 3 : null, started, ended]
    )
    await q(
      `insert into workout_sets (log_id, exercise, set_number, reps, weight_kg) values ($1, 'Squat', 1, 5, 100)`,
      [id]
    )
  })
  return id
}

describe("deleteWorkoutLog", () => {
  it("deletes the target workout and its sets, and only that one", async () => {
    const other = await newUser("wl-other")
    const theirs = await aWorkout(other.id)
    const theirsBefore = await rowText("workout_logs", theirs)
    const me = await newUser("wl-me")
    actAs(me)
    const gone = await aWorkout(me.id)
    const kept = await aWorkout(me.id)
    const keptBefore = await rowText("workout_logs", kept)

    const answer = await deleteWorkoutLog(me.id, gone)

    expect(answer).toEqual({ recalculated: false, deleted: true })
    expect(await rowText("workout_logs", gone)).toBeUndefined()
    expect(await asOwner((q) => q("select 1 from workout_sets where log_id = $1", [gone]))).toHaveLength(0)
    expect(await rowText("workout_logs", kept)).toBe(keptBefore)
    expect(await asOwner((q) => q("select 1 from workout_sets where log_id = $1", [kept]))).toHaveLength(1)
    expect(await rowText("workout_logs", theirs)).toBe(theirsBefore)
  })

  it("an id that is another account's, or nobody's, is not a delete: it says so and changes nothing", async () => {
    const other = await newUser("wl-nd-other")
    const theirs = await aWorkout(other.id)
    const theirsBefore = await rowText("workout_logs", theirs)
    const me = await newUser("wl-nd-me")
    actWithoutRowSecurity(me)

    expect(await deleteWorkoutLog(me.id, theirs)).toEqual({ recalculated: false, deleted: false })
    expect(await deleteWorkoutLog(me.id, randomUUID())).toEqual({ recalculated: false, deleted: false })

    expect(await rowText("workout_logs", theirs)).toBe(theirsBefore)
  })

  it("refuses a workout still open, and leaves it and its sets in place", async () => {
    const me = await newUser("wl-open")
    actAs(me)
    const open = await aWorkout(me.id, { started: "2026-11-01T09:00:00Z", ended: null })
    const before = await rowText("workout_logs", open)

    await expect(deleteWorkoutLog(me.id, open)).rejects.toThrow()

    expect(await rowText("workout_logs", open)).toBe(before)
    expect(await asOwner((q) => q("select 1 from workout_sets where log_id = $1", [open]))).toHaveLength(1)
  })
})
