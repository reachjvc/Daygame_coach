// @vitest-environment node
/**
 * FIXING A NUMBER MUST NOT CHANGE WHEN THE SET HAPPENED.
 *
 * `completeSet` upserts on the slot — "tapping the same set twice corrects it
 * rather than adding a second one", says its own comment — and the payload it
 * built carried `completed_at: new Date().toISOString()`. The UPDATE sent the
 * whole payload, so re-tapping a set to fix its weight rewrote its timestamp
 * to now.
 *
 * Harmless while `inWorkoutOrder` sorted on `set_number`. The moment it
 * started sorting on `completed_at` (2026-09-27) the corrected set jumped to
 * the end of the workout on the receipt, in History and in the correction
 * editor:
 *
 *   Squat 1 | Squat 3 | Bench 1 | Bench 2 | Bench 3 | Squat 2
 *
 * WHY THIS FILE EXISTS SEPARATELY from `setsInWorkoutOrder.test.ts`. That one
 * feeds rows to the comparator and asserts the order. It cannot see this bug
 * at all: it hands the comparator timestamps that are already right.
 * `prove-guard.sh` said so — reverting `workoutRepo.ts` left it green. The
 * claim is about the WRITE, so the test has to read the write.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const WORKOUT = "w1"

/** The set already on the server, ticked half an hour ago. */
const EXISTING = {
  id: "s1",
  exercise: "Squat",
  exercise_id: null,
  set_number: 1,
  set_kind: "working",
  side: null,
  weight_kg: 100,
  reps: 5,
  completed_at: "2026-09-27T08:05:00.000Z",
  notes: null,
  exercise_notes: null,
  rpe: null,
  prescribed_index: null,
  library_id: null,
}

const live = {
  id: WORKOUT,
  user_id: USER,
  started_at: "2026-09-27T08:00:00Z",
  ended_at: null,
  enrollment_id: null,
  program_day_id: null,
  program_cycle: null,
  program_week: null,
  adjustments: {},
  notes: null,
  rpe: null,
  unit_system: "kg",
  // `LIVE_SELECT` is "*, workout_sets(*)", so the sets arrive NESTED on the
  // log row. The first version of this fake returned them from a separate
  // `workout_sets` query, so `live.sets` was empty, `completeSet` found no
  // slot to correct and INSERTED — and the test failed for a hole in its own
  // fixture rather than for the thing it is about.
  workout_sets: [EXISTING],
}


function fakeSupabase() {
  const updates: Record<string, unknown>[] = []
  const inserts: Record<string, unknown>[] = []
  const table = (name: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      is: () => chain,
      not: () => chain,
      in: () => chain,
      gte: () => chain,
      lte: () => chain,
      or: () => chain,
      order: () => chain,
      range: () => chain,
      limit: () => chain,
      maybeSingle: () =>
        Promise.resolve({ data: name === "workout_logs" ? live : null, error: null }),
      single: () => Promise.resolve({ data: name === "workout_logs" ? live : null, error: null }),
      update: (row: Record<string, unknown>) => {
        updates.push(row)
        return chain
      },
      insert: (row: Record<string, unknown>) => {
        inserts.push(row)
        return chain
      },
      then: (done: (v: unknown) => unknown) =>
        Promise.resolve({
          data: name === "workout_sets" ? [EXISTING] : [],
          error: null,
        }).then(done),
    }
    return chain
  }
  return { updates, inserts, client: { from: table, rpc: () => Promise.resolve({ data: null, error: null }) } }
}

async function repo() {
  const fake = fakeSupabase()
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => "Europe/Copenhagen",
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
    getUserClock: async () => ({ timezone: "Europe/Copenhagen" }),
  }))
  return { repo: await import("@/src/db/workoutRepo"), fake }
}

const aSet = {
  exerciseId: null,
  exercise: "Squat",
  weight: 105,
  reps: 5,
  setNumber: 1,
  kind: "working" as const,
  side: null,
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("re-ticking a set that is already saved", () => {
  test("never sends completed_at, so the set keeps the time it was done", async () => {
    const { repo: r, fake } = await repo()
    await r.completeSet(USER, WORKOUT, aSet).catch(() => null)

    expect(fake.updates.length, "it should have corrected the row, not added one").toBeGreaterThan(0)
    for (const payload of fake.updates) {
      expect(
        Object.keys(payload),
        "an update that carries completed_at rewrites when the set happened"
      ).not.toContain("completed_at")
    }
    // And it really is the correction — the new weight went.
    expect(fake.updates[0].weight_kg).toBe(105)
  })

  test("a NEW set still records when it was done, which is the whole point", async () => {
    // The insert must keep stamping, or nothing has a time and the ordering
    // falls back to slot for every workout.
    const { repo: r, fake } = await repo()
    await r.completeSet(USER, WORKOUT, { ...aSet, setNumber: 4 }).catch(() => null)

    expect(fake.inserts.length, "a set in a free slot is an insert").toBeGreaterThan(0)
    expect(fake.inserts[0].completed_at, "a new set must know when it happened").toBeTruthy()
  })
})
