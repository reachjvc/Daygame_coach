// @vitest-environment node
/**
 * THAT WAS A WARM-UP, NOT A WORKING SET.
 *
 * A set is logged as whatever the row it was ticked in was for. Then it turns
 * out to have been a warm-up, or a drop set taken off the end of the last one.
 * Until this existed the only correction was deleting the set and ticking it
 * again in another row, which loses the time it happened at — and on a lift
 * whose working sets are counted towards "did you finish the session", a
 * warm-up logged as working quietly says you did.
 *
 * THE SLOT COLLISION IS THE INTERESTING CASE. `uq_workout_sets_slot` means one
 * lift can hold exactly one warm-up set 1. Tagging a second one lands on
 * Postgres's complaint about a unique index, which no user can act on, so it
 * is refused here with a sentence naming both sets — and refused BEFORE the
 * write, so nothing is half-changed.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const WORKOUT = "w1"

const setRow = (over: Record<string, unknown> = {}) => ({
  id: "s1",
  log_id: WORKOUT,
  exercise: "Squat",
  exercise_id: "squat",
  library_id: null,
  weight_kg: 100,
  reps: 5,
  set_number: 1,
  set_kind: "working",
  prescribed_index: 0,
  completed_at: "2026-09-18T07:10:00Z",
  rpe: null,
  side: null,
  notes: null,
  exercise_notes: null,
  ...over,
})

interface FakeOptions {
  sets: Record<string, unknown>[]
  /** Null means no workout is open, which is what a finished one looks like. */
  open?: boolean
  updateError?: { message: string } | null
}

function fakeSupabase(opts: FakeOptions) {
  /** Every UPDATE payload the function sent, in order. */
  const updates: Record<string, unknown>[] = []

  const table = (name: string) => {
    let payload: Record<string, unknown> | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      update: (row: Record<string, unknown>) => {
        payload = row
        return chain
      },
      eq: () => chain,
      is: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => resolveRead(),
      single: () => resolveRead(),
      then: (done: (v: unknown) => unknown) =>
        (payload ? resolveUpdate() : resolveRead()).then(done),
    }

    function resolveUpdate() {
      if (!opts.updateError) updates.push(payload as Record<string, unknown>)
      return Promise.resolve({ data: null, error: opts.updateError ?? null })
    }

    function resolveRead() {
      if (name === "profiles") return Promise.resolve({ data: { weight_unit: "kg" }, error: null })
      if (name !== "workout_logs") return Promise.resolve({ data: null, error: null })
      // A finished workout is not an error: there is simply no open row.
      if (opts.open === false) return Promise.resolve({ data: null, error: null })
      return Promise.resolve({
        data: {
          id: WORKOUT,
          user_id: USER,
          session_type: "weights",
          started_at: "2026-09-18T07:00:00Z",
          ended_at: null,
          enrollment_id: null,
          program_day_id: null,
          program_cycle: null,
          program_week: null,
          adjustments: {},
          notes: null,
          rpe: null,
          client_key: "k1",
          logged_at: "2026-09-18T07:00:00Z",
          workout_sets: opts.sets,
        },
        error: null,
      })
    }

    return chain
  }

  return { client: { from: table }, updates }
}

async function repoWith(opts: FakeOptions) {
  const fake = fakeSupabase(opts)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => "Europe/Copenhagen",
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
  }))
  const repo = await import("@/src/db/workoutRepo")
  return { repo, fake }
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("updateSet", () => {
  test("writes the new kind, and nothing else, on that one set", async () => {
    const { repo, fake } = await repoWith({ sets: [setRow()] })
    await repo.updateSet(USER, WORKOUT, "s1", { kind: "warmup" })
    expect(fake.updates).toEqual([{ set_kind: "warmup" }])
  })

  test("writes the effort on its own", async () => {
    const { repo, fake } = await repoWith({ sets: [setRow()] })
    await repo.updateSet(USER, WORKOUT, "s1", { rpe: 9 })
    expect(fake.updates).toEqual([{ rpe: 9 }])
  })

  test("clears the effort explicitly, rather than by leaving it out or sending 0", async () => {
    const { repo, fake } = await repoWith({ sets: [setRow({ rpe: 9 })] })
    await repo.updateSet(USER, WORKOUT, "s1", { rpe: null })
    expect(fake.updates).toEqual([{ rpe: null }])
  })

  test("refuses a kind that would collide with a set already in that slot, before writing", async () => {
    const { repo, fake } = await repoWith({
      sets: [setRow(), setRow({ id: "s0", set_kind: "warmup", weight_kg: 40 })],
    })
    await expect(repo.updateSet(USER, WORKOUT, "s1", { kind: "warmup" })).rejects.toThrow(
      "Squat already has a warm-up set 1 — delete one of them first."
    )
    // Nothing half-changed: the refusal happened before the UPDATE.
    expect(fake.updates).toEqual([])
  })

  test("a warm-up set 1 and a working set 1 on DIFFERENT lifts do not collide", async () => {
    const { repo, fake } = await repoWith({
      sets: [setRow(), setRow({ id: "b1", exercise: "Bench Press", exercise_id: "bench", set_kind: "warmup" })],
    })
    await repo.updateSet(USER, WORKOUT, "s1", { kind: "warmup" })
    expect(fake.updates).toEqual([{ set_kind: "warmup" }])
  })

  test("re-tagging a set as what it already is writes nothing", async () => {
    const { repo, fake } = await repoWith({ sets: [setRow()] })
    await repo.updateSet(USER, WORKOUT, "s1", { kind: "working" })
    expect(fake.updates).toEqual([])
  })

  test("is refused once the workout is finished", async () => {
    const { repo } = await repoWith({ sets: [setRow()], open: false })
    await expect(repo.updateSet(USER, WORKOUT, "s1", { kind: "warmup" })).rejects.toThrow(
      /not open any more/i
    )
  })

  test("refuses a set that belongs to some other workout", async () => {
    const { repo } = await repoWith({ sets: [setRow()] })
    await expect(repo.updateSet(USER, WORKOUT, "someone-elses", { rpe: 8 })).rejects.toThrow(
      /not part of this workout/i
    )
  })

  test("says so in a sentence when the write itself fails", async () => {
    const { repo } = await repoWith({ sets: [setRow()], updateError: { message: "connection lost" } })
    await expect(repo.updateSet(USER, WORKOUT, "s1", { rpe: 8 })).rejects.toThrow(
      /Could not change that set: connection lost/
    )
  })
})
