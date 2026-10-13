// @vitest-environment node
/**
 * ONE ESTIMATE FORMULA, NOT TWO.
 *
 * In plain terms: the app shows an "estimated one-rep max" in two places — the
 * Squat tile on the dashboard (`getExerciseMax`) and the "est. max" beside each
 * lift in Your bests (`liftBestsAllTime`). They used the same Epley formula,
 * except the bests list capped it at ten reps and the tile did not. Above ten
 * reps Epley runs away: a 60 kg set of twenty comes out as 100 kg, a weight the
 * person has never lifted. So the same set produced 100 on one screen and 60 on
 * the other, neither labelled as measuring anything different.
 *
 * `cappedEstimate` is now the one formula, and both read it. The two repo
 * functions run here, unchanged, over the same rows in the shared in-memory
 * database — so a tile that went back to its own arithmetic, or stopped
 * filtering what the list filters, gives a different number from the list.
 */

import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"
import { createFakeSupabase, type Row } from "../../helpers/fakeSupabase"
import { cappedEstimate } from "@/src/health/healthService"
import { estimateOneRepMax } from "@/src/programs/programsService"

const USER = "u1"

/**
 * The shared fake's `or()` knows only the null checks `finishedWorkouts` builds,
 * and throws on anything else rather than guessing. `getExerciseMax` asks
 * `library_id.eq.<id>,exercise.ilike.<name>`, so this file teaches it those two
 * operators: the OR is evaluated here over the same tables and handed to the
 * fake as an `in("id", …)`, which it already understands. Any other operator
 * still throws.
 */
function withLiftMatching(tables: Record<string, Row[]>) {
  const client = createFakeSupabase(tables)
  return {
    ...client,
    from: (table: string) => {
      const query = client.from(table)
      const nullChecksOnly = query.or.bind(query)
      query.or = (filter: string) => {
        const terms = filter.split(",")
        if (terms.every((t) => /^[a-z_]+\.(not\.)?is\.null$/.test(t))) return nullChecksOnly(filter)
        const matchers = terms.map((term) => {
          const m = term.match(/^([a-z_]+)\.(eq|ilike)\.(.+)$/)
          if (!m) throw new Error(`exerciseMax's or() does not understand "${term}"`)
          const [, column, op, value] = m
          if (op === "eq") return (r: Row) => r[column] === value
          const pattern = value
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/%/g, ".*")
            .replace(/_/g, ".")
          return (r: Row) => typeof r[column] === "string" && new RegExp(`^${pattern}$`, "i").test(r[column] as string)
        })
        const ids = (tables[table] ?? []).filter((r) => matchers.some((match) => match(r))).map((r) => r.id)
        return query.in("id", ids)
      }
      return query
    },
  }
}

async function bothScreens(tables: Record<string, Row[]>) {
  const client = withLiftMatching(tables)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => client }))
  vi.doMock("@/src/db/settingsRepo", () => ({ getUserTimezone: async () => "Europe/Copenhagen" }))
  const repo = await import("@/src/db/healthRepo")
  const tile = await repo.getExerciseMax(USER, "Squat")
  const list = (await repo.liftBestsAllTime(USER)).find((b) => /squat/i.test(b.exercise))
  return { tile, list: list ? Math.round(list.bestEstimatedMaxKg) : null }
}

const workout = (id: string, loggedAt: string, open = false): Row => ({
  id,
  user_id: USER,
  logged_at: loggedAt,
  started_at: loggedAt,
  ended_at: open ? null : loggedAt,
})

let setSeq = 0
const squat = (logId: string, weight_kg: number, reps: number, set_kind = "working"): Row => ({
  id: `s${String(++setSeq).padStart(3, "0")}`,
  log_id: logId,
  exercise: "Squat",
  library_id: null,
  weight_kg,
  reps,
  set_number: setSeq,
  set_kind,
  completed_at: null,
})

beforeEach(() => {
  vi.resetModules()
  setSeq = 0
})
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("the 1RM tile and Your bests", () => {
  it("read the same history and give the same estimate", async () => {
    const { tile, list } = await bothScreens({
      workout_logs: [
        workout("w1", "2026-09-01T10:00:00Z"),
        workout("w2", "2026-09-08T10:00:00Z"),
        // Still open: neither screen counts a workout that is not finished.
        workout("w3", "2026-09-15T10:00:00Z", true),
      ],
      workout_sets: [
        squat("w1", 100, 5),
        // A warm-up single, heavier than anything worked: counted by neither.
        squat("w1", 140, 1, "warmup"),
        squat("w2", 105, 3),
        squat("w3", 150, 3),
      ],
    })
    expect(tile).toBe(117) // 100 × 5, Epley: 116.7
    expect(list).toBe(tile)
  })

  it("agree on a twenty-rep set: both say the weight itself", async () => {
    // This is the case that used to differ — 100 on the tile, 60 in the list.
    const { tile, list } = await bothScreens({
      workout_logs: [workout("w1", "2026-09-01T10:00:00Z")],
      workout_sets: [squat("w1", 60, 20)],
    })
    expect(tile).toBe(60)
    expect(list).toBe(60)
  })

  it("caps exactly above ten reps, and not at ten", () => {
    expect(cappedEstimate(60, 10)).toBe(estimateOneRepMax(60, 10))
    expect(cappedEstimate(60, 11)).toBe(60)
  })

  it("a single is the weight, not an inflated version of it", () => {
    expect(cappedEstimate(140, 1)).toBe(140)
  })
})
