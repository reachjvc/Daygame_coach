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
    await expect(
      repo.lastSetsForLifts(USER, [{ key: "squat", name: "Squat" }], "kg")
    ).rejects.toThrow(/could not be read/i)
  })

  test("asks for finished workouts only, newest first, with a tie-break and a bound", async () => {
    const { repo, fake } = await readWith([])
    await repo.lastSetsForLifts(USER, [{ key: "squat", name: "Squat" }], "kg")
    expect(fake.asked.filters).toContain("eq:user_id")
    expect(fake.asked.filters).toContain("not:ended_at:is:null")
    expect(fake.asked.orders).toEqual([{ column: "logged_at", ascending: false }, { column: "id" }])
    expect(fake.asked.limit).toBe(100)
    // Every column the conversion and the matching rule need, and no others.
    for (const column of ["exercise", "library_id", "weight_kg", "reps", "set_number", "set_kind"]) {
      expect(fake.asked.columns, `missing ${column}`).toContain(column)
    }
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
