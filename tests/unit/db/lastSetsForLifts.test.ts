// @vitest-environment node
/**
 * THE READ BEHIND "WHAT DID I DO LAST TIME".
 *
 * The function this replaces (`liftHistory`) got four things wrong at once,
 * and three of them are invisible until you are standing at a rack:
 *
 * 1. It destructured `{ data }` and dropped the query error, so a read that
 *    failed rendered as "you have never done this lift".
 * 2. It returned stored KILOGRAMS to a screen labelled in pounds.
 * 3. It matched on the exercise name only, so a week calling it "Back Squat"
 *    never counted towards Squat.
 * 4. It ordered by `logged_at` alone, so two workouts on one day could swap
 *    places between two reads of the same data.
 *
 * The database here is a fake keyed by table name; the real function runs and
 * what it asks for is asserted.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createFakeSupabase, type Row } from "../../helpers/fakeSupabase"

const USER = "u1"

interface Asked {
  columns: string
  orders: { column: string; ascending?: boolean }[]
  limit: number | null
  filters: string[]
}

function fakeSupabase(
  rows: unknown[] | null,
  error: { message: string } | null = null
): { client: { from: (name: string) => unknown }; asked: Asked } {
  const asked: Asked = { columns: "", orders: [], limit: null, filters: [] }
  const chain: Record<string, unknown> = {
    select: (cols: string) => {
      asked.columns = cols
      return chain
    },
    eq: (col: string) => {
      asked.filters.push(`eq:${col}`)
      return chain
    },
    not: (col: string, op: string, value: unknown) => {
      asked.filters.push(`not:${col}:${op}:${String(value)}`)
      return chain
    },
    order: (column: string, opts?: { ascending?: boolean }) => {
      asked.orders.push({ column, ...opts })
      return chain
    },
    limit: (n: number) => {
      asked.limit = n
      return Promise.resolve({ data: rows, error })
    },
  }
  return { client: { from: () => chain }, asked }
}

async function readWith(rows: unknown[] | null, error: { message: string } | null = null) {
  const fake = fakeSupabase(rows, error)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  const repo = await import("@/src/db/workoutRepo")
  return { repo, fake }
}

/**
 * The shared in-memory engine, for the questions about WHICH workouts are read:
 * its filters and sort run, so a dropped `user_id` or `ended_at` filter, or a
 * missing tie-break, changes the answer. It ignores the select list, so each
 * log row carries its nested `workout_sets` as PostgREST would embed them.
 */
async function readFrom(tables: Record<string, Row[]>) {
  const client = createFakeSupabase(tables)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => client }))
  return import("@/src/db/workoutRepo")
}

/** One finished workout, as PostgREST nests its sets. */
const log = (
  loggedAt: string,
  sets: { exercise: string; library_id?: string | null; weight_kg: number; reps: number; set_number: number; set_kind?: string }[]
) => ({
  logged_at: loggedAt,
  workout_sets: sets.map((s) => ({ set_kind: "working", library_id: null, ...s })),
})

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})

describe("lastSetsForLifts", () => {
  test("converts the stored kilograms into the unit the person reads", async () => {
    const { repo } = await readWith([
      log("2026-09-18T10:00:00Z", [
        { exercise: "Bench Press", weight_kg: 61.23, reps: 5, set_number: 1 },
      ]),
    ])
    const byLift = await repo.lastSetsForLifts(USER, [{ key: "bench", name: "Bench Press" }], "lb")
    /**
     * 135 lb was stored as 61.23 kg, and comes back as 134.99 — the honest
     * result of a lossy round trip through a NUMERIC(5,2) column, kept
     * faithful here. The ROW rounds it to 135 for display, because it is a
     * number to copy into a box rather than a record of what was typed.
     */
    expect(byLift.bench[0].sets[0].weight).toBe(134.99)
  })

  test("matches a program-logged set, which carries no library id, by name", async () => {
    const { repo } = await readWith([
      log("2026-09-18T10:00:00Z", [
        { exercise: "Squat", library_id: null, weight_kg: 100, reps: 5, set_number: 1 },
      ]),
    ])
    const byLift = await repo.lastSetsForLifts(USER, [{ key: "squat", name: "Squat" }], "kg")
    expect(byLift.squat[0].sets.map((s) => s.reps)).toEqual([5])
  })

  test("matches a lift logged under another name through the library id", async () => {
    const { repo } = await readWith([
      log("2026-09-18T10:00:00Z", [
        { exercise: "Back Squat", library_id: "lib_back_squat", weight_kg: 100, reps: 5, set_number: 1 },
      ]),
    ])
    // The caller passes no library id: it is derived from the name here, by the
    // same function `completeSet` writes the column with.
    const byLift = await repo.lastSetsForLifts(USER, [{ key: "sq", name: "Squat" }], "kg")
    expect(byLift.sq).toHaveLength(1)
  })

  test("throws when the read fails, rather than answering 'never done'", async () => {
    const { repo } = await readWith(null, { message: "connection lost" })
    const thrown = await repo
      .lastSetsForLifts(USER, [{ key: "squat", name: "Squat" }], "kg")
      .catch((e: Error) => e)
    expect((thrown as Error).message).toMatch(/could not read your past sets/i)
    // And in the app's words, not the database's: a thrown message is handed to
    // the browser verbatim by every workout route.
    expect((thrown as Error).message).not.toMatch(/connection lost/)
  })

  test("last time is your newest FINISHED workout — not the open one, not someone else's", async () => {
    const squat = (weight_kg: number) => [
      { exercise: "Squat", library_id: null, weight_kg, reps: 5, set_number: 1, set_kind: "working" },
    ]
    const repo = await readFrom({
      workout_logs: [
        { id: "w-old", user_id: USER, logged_at: "2026-09-10T10:00:00Z", ended_at: "2026-09-10T11:00:00Z", workout_sets: squat(90) },
        { id: "w-last", user_id: USER, logged_at: "2026-09-15T10:00:00Z", ended_at: "2026-09-15T11:00:00Z", workout_sets: squat(100) },
        // Newer, but still open: these are the sets on screen right now.
        { id: "w-open", user_id: USER, logged_at: "2026-09-18T10:00:00Z", ended_at: null, workout_sets: squat(120) },
        // Newer and finished, but another account's.
        { id: "w-theirs", user_id: "u2", logged_at: "2026-09-19T10:00:00Z", ended_at: "2026-09-19T11:00:00Z", workout_sets: squat(140) },
      ],
    })
    const byLift = await repo.lastSetsForLifts(USER, [{ key: "squat", name: "Squat" }], "kg")
    expect(byLift.squat.map((w) => [w.at, w.sets[0].weight])).toEqual([["2026-09-15T10:00:00Z", 100]])
  })

  test("two workouts logged at the same instant answer the same whichever the database hands back first", async () => {
    const workout = (id: string, weight_kg: number) => ({
      id,
      user_id: USER,
      logged_at: "2026-09-15T10:00:00Z",
      ended_at: "2026-09-15T11:00:00Z",
      workout_sets: [{ exercise: "Squat", library_id: null, weight_kg, reps: 5, set_number: 1, set_kind: "working" }],
    })
    const answer = async (logs: Row[]) => {
      const repo = await readFrom({ workout_logs: logs })
      const byLift = await repo.lastSetsForLifts(USER, [{ key: "squat", name: "Squat" }], "kg")
      return byLift.squat[0].sets[0].weight
    }
    const one = await answer([workout("w-a", 100), workout("w-b", 105)])
    vi.resetModules()
    const other = await answer([workout("w-b", 105), workout("w-a", 100)])
    expect(other).toBe(one)
  })

  test("reads nothing at all when there are no lifts to ask about", async () => {
    const { repo, fake } = await readWith([])
    expect(await repo.lastSetsForLifts(USER, [], "kg")).toEqual({})
    expect(fake.asked.limit).toBeNull()
  })

  test("a lift never done is an empty list, never a zero", async () => {
    const { repo } = await readWith([
      log("2026-09-18T10:00:00Z", [
        { exercise: "Bench Press", weight_kg: 80, reps: 5, set_number: 1 },
      ]),
    ])
    const byLift = await repo.lastSetsForLifts(
      USER,
      [{ key: "dl", name: "Deadlift" }],
      "kg"
    )
    expect(byLift.dl).toEqual([])
  })
})
