// @vitest-environment node
/**
 * THE HISTORY A RECORD IS MEASURED FROM HAS TO BE ALL OF IT.
 *
 * In plain terms: the database hands over at most 1,000 rows per request and
 * says nothing about it. A year of training is around 2,400 set rows. So a
 * baseline read in one go comes back as an arbitrary slice of somebody's
 * training — and a SHORT baseline is worse than none, because the app then
 * announces records at weights the person has been lifting for months.
 *
 * The fake database here enforces the same silent cap the real one does.
 */

import { afterEach, describe, expect, test, vi } from "vitest"

const CAP = 1000

function cappedSupabase(logCount: number, setsPerLog: number, opts: { fail?: boolean } = {}) {
  const requests: { table: string; from: number; to: number }[] = []

  const logs = Array.from({ length: logCount }, (_, i) => ({
    id: `log-${String(i).padStart(4, "0")}`,
    // Ascending, one a day, so "before this one" is a real boundary.
    logged_at: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T0${i % 10}:00:00Z`,
  }))
  const sets = logs.flatMap((l) =>
    Array.from({ length: setsPerLog }, (_, i) => ({
      id: `${l.id}-set-${String(i).padStart(3, "0")}`,
      log_id: l.id,
      exercise: "Squat",
      weight_kg: 100,
      reps: 5,
      set_number: i + 1,
      set_kind: "working",
      completed_at: null,
    }))
  )

  const table = (name: string) => {
    let from = 0
    let to = CAP - 1
    let ranged = false
    let ids: string[] | null = null
    let before: string | null = null
    let excluded: string | null = null

    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      or: () => chain,
      not: () => chain,
      order: () => chain,
      lt: (_col: string, value: string) => {
        before = value
        return chain
      },
      neq: (_col: string, value: string) => {
        excluded = value
        return chain
      },
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
      then: (done: (v: { data: unknown[] | null; error: unknown }) => unknown) => {
        requests.push({ table: name, from, to })
        if (opts.fail) return done({ data: null, error: { message: "connection lost" } })
        const all =
          name === "workout_logs"
            ? logs.filter(
                (l) =>
                  (!before || l.logged_at < before) && (!excluded || l.id !== excluded)
              )
            : sets.filter((s) => !ids || ids.includes(s.log_id))
        const window = ranged ? all.slice(from, to + 1) : all
        return done({ data: window.slice(0, CAP), error: null })
      },
    }
    return chain
  }

  return { client: { from: table }, requests }
}

async function baselineWith(
  logCount: number,
  setsPerLog: number,
  before?: { workoutId: string; loggedAt: string },
  opts: { fail?: boolean } = {}
) {
  const fake = cappedSupabase(logCount, setsPerLog, opts)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  const { personalBestBaseline } = await import("@/src/db/healthRepo")
  return { result: await personalBestBaseline("u1", before), requests: fake.requests }
}

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})

describe("the personal-best baseline", () => {
  test("reads every finished set, not the first thousand", async () => {
    // 140 workouts of 10 sets is 1,400 rows — past the cap.
    const { result } = await baselineWith(140, 10)
    expect(result.sets).toHaveLength(1400)
    expect(result.unavailable).toBe(false)
  })

  test("the sets are asked for in pages", async () => {
    const { requests } = await baselineWith(140, 10)
    const setReads = requests.filter((r) => r.table === "workout_sets")
    expect(setReads.length).toBeGreaterThan(1)
    for (const r of setReads) expect(r.to - r.from + 1).toBeLessThanOrEqual(CAP)
  })

  test("excludes the workout being finished and anything logged after it", async () => {
    // Ten workouts, one an hour. Asking "before log-0005" must leave out
    // log-0005 itself and everything later — otherwise a workout's own sets
    // count as its own previous best.
    const { result } = await baselineWith(10, 1, {
      workoutId: "log-0005",
      loggedAt: "2026-01-06T05:00:00Z",
    })
    const logIds = new Set(result.sets.map((s) => s.log_id))
    expect(logIds.has("log-0005")).toBe(false)
    expect(logIds.has("log-0006")).toBe(false)
    expect(logIds.has("log-0004")).toBe(true)
  })

  test("every set carries the day its workout was logged", async () => {
    // Without it, a record cannot be dated and the all-time comparison has no
    // way to say which of two equal sets came first.
    const { result } = await baselineWith(3, 2)
    for (const s of result.sets) expect(s.logged_at).toMatch(/^2026-01-\d\d/)
  })

  test("a read that fails comes back flagged, not empty", async () => {
    // AN EMPTY HISTORY IS NOT AN UNREADABLE ONE. Against a blank past every set
    // is a record, so a failed read used to congratulate somebody on six bests
    // at weights they had been lifting for months.
    const { result } = await baselineWith(10, 5, undefined, { fail: true })
    expect(result.unavailable).toBe(true)
    expect(result.sets).toEqual([])
  })

  test("a person with no training at all is not a failure", async () => {
    const { result } = await baselineWith(0, 0)
    expect(result).toEqual({ sets: [], unavailable: false })
  })
})
