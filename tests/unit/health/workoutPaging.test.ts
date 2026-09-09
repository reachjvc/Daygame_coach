// @vitest-environment node
/**
 * A YEAR OF TRAINING MUST COME BACK WHOLE.
 *
 * What happened, in plain terms: the database will not hand over more than
 * 1,000 rows at once, and it does not say so — you just get 1,000 and no
 * warning. Reading a year of training asked for 2,444 sets in one go, sorted by
 * set number, so the 1,000 that came back were every warm-up, every first set
 * and every second set, and nothing after that. Every five-set squat day in
 * History showed two sets. Worse, the correction screen saves back the list it
 * was shown, so opening an old workout and pressing Save would have deleted the
 * missing sets from the database for real.
 *
 * These tests put a fake database in front of the repository that enforces the
 * same 1,000-row cap, and insist the reader still returns everything.
 */

import { afterEach, describe, expect, test, vi } from "vitest"

const CAP = 1000

/**
 * A database that behaves like the real one: it returns at most `CAP` rows per
 * request, whatever you ask for, and never mentions it.
 */
function cappedSupabase(logCount: number, setsPerLog: number) {
  const requests: { table: string; from: number; to: number }[] = []

  const logs = Array.from({ length: logCount }, (_, i) => ({
    id: `log-${String(i).padStart(4, "0")}`,
    user_id: "u1",
    logged_at: `2026-01-01T0${i % 10}:00:00Z`,
    duration_min: 60,
    ended_at: "2026-01-01T01:00:00Z",
  }))
  // Set 1 is a warm-up and sets 1..setsPerLog-1 are working sets, which is what
  // a real workout looks like — and why set number alone cannot order them.
  const sets = logs.flatMap((l) =>
    Array.from({ length: setsPerLog }, (_, i) => ({
      id: `${l.id}-set-${String(i).padStart(3, "0")}`,
      log_id: l.id,
      set_number: i === 0 ? 1 : i,
      set_kind: i === 0 ? "warmup" : "working",
      exercise: "Squat",
      weight_kg: 100,
      reps: 5,
      completed_at: `2026-01-01T00:0${i}:00Z`,
    }))
  )

  const table = (name: string) => {
    let from = 0
    let to = CAP - 1
    let ranged = false
    let ids: string[] | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      ilike: () => chain,
      or: () => chain,
      not: () => chain,
      order: () => chain,
      in: (_col: string, values: string[]) => {
        ids = values
        return chain
      },
      range: (a: number, b: number) => {
        from = a
        to = b
        ranged = true
        return chain
      },
      then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => {
        requests.push({ table: name, from, to })
        const all = name === "workout_logs" ? logs : sets.filter((s) => !ids || ids.includes(s.log_id))
        // The cap applies whether or not a range was asked for. That is the
        // whole trap: an unpaged read looks like it worked.
        const window = ranged ? all.slice(from, to + 1) : all
        return resolve({ data: window.slice(0, CAP), error: null })
      },
    }
    return chain
  }

  return { client: { from: table }, requests }
}

afterEach(() => vi.resetModules())

async function readWith(logCount: number, setsPerLog: number) {
  const { client, requests } = cappedSupabase(logCount, setsPerLog)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => client }))
  const { getWorkoutLogsWithSets } = await import("@/src/db/healthRepo")
  return { result: await getWorkoutLogsWithSets("u1", 3650), requests }
}

describe("reading a training history", () => {
  test("a year of training keeps every set of every workout", async () => {
    // 140 workouts of 18 sets is 2,520 rows — the live account that broke this.
    const { result } = await readWith(140, 18)
    expect(result).toHaveLength(140)
    for (const log of result) {
      expect(log.sets, `workout ${log.id} came back short`).toHaveLength(18)
    }
  })

  test("the sets are read in pages, not asked for all at once", async () => {
    const { requests } = await readWith(140, 18)
    const setReads = requests.filter((r) => r.table === "workout_sets")
    expect(setReads.length).toBeGreaterThan(1)
    for (const r of setReads) expect(r.to - r.from + 1).toBeLessThanOrEqual(CAP)
  })

  test("more workouts than fit in one page are all returned", async () => {
    // Four sessions a week passes 1,000 workouts in five years, and it is the
    // RECENT ones that fall off the end — the ones somebody would look for.
    const { result } = await readWith(1400, 1)
    expect(result).toHaveLength(1400)
  })

  test("a history that exactly fills a page still asks once more", async () => {
    // Otherwise the row after a perfectly full page is invisible forever.
    const { requests } = await readWith(CAP, 1)
    expect(requests.filter((r) => r.table === "workout_logs")).toHaveLength(2)
  })

  test("the warm-up stays ahead of the working set it shares a number with", async () => {
    // Both are "set 1". Sorting on the number alone leaves them free to swap,
    // and then the row you clicked to edit is not the row you get.
    const { result } = await readWith(3, 5)
    for (const log of result) {
      expect(log.sets[0].set_kind).toBe("warmup")
      expect(log.sets.map((s) => s.set_number)).toEqual([1, 1, 2, 3, 4])
    }
  })

  test("a small history is read in a single request", async () => {
    const { requests } = await readWith(3, 5)
    expect(requests.filter((r) => r.table === "workout_sets")).toHaveLength(1)
  })
})
