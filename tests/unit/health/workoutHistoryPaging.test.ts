// @vitest-environment node
/**
 * HISTORY REACHES ALL THE WAY BACK, AND SAYS WHEN IT HAS.
 *
 * The screen asked for `days=365` and paged that array in the browser. A
 * workout from two years ago was not "further down the list" — it had never
 * been read, and no part of the screen knew the difference. "Show more" then
 * ran out of rows and disappeared, which reads as "that is everything".
 *
 * A MONTH IS THE UNIT because a month is what the screen draws: the list is
 * grouped by month with a total under each header, and a page that ended
 * mid-month would make that total a lie — "September: 4 sessions" with the
 * fifth on the next page.
 *
 * The fake database here enforces the same 1,000-row cap as the real one and
 * sorts and limits the way PostgREST does, so a read that relies on "the
 * newest row before this instant" is actually tested rather than handed
 * whichever row happened to be first in the array.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createFakeSupabase, type Row } from "@/tests/helpers/fakeSupabase"

const TZ = "America/New_York"

/** One finished workout, with sets, on a given instant. */
function workout(id: string, loggedAt: string, sets: { exercise: string; reps?: number }[]): {
  log: Row
  sets: Row[]
} {
  return {
    log: {
      id,
      user_id: "u1",
      session_type: "weights",
      duration_min: 60,
      intensity: 3,
      logged_at: loggedAt,
      started_at: loggedAt,
      ended_at: loggedAt,
    },
    sets: sets.map((s, i) => ({
      id: `${id}-s${i}`,
      log_id: id,
      exercise: s.exercise,
      weight_kg: 100,
      reps: s.reps ?? 5,
      set_number: i + 1,
      set_kind: "working",
      exercise_id: null,
      library_id: null,
      prescribed_index: null,
      completed_at: loggedAt,
      rpe: null,
      side: null,
      notes: null,
      exercise_notes: null,
    })),
  }
}

async function repoWith(built: { log: Row; sets: Row[] }[]) {
  const tables: Record<string, Row[]> = {
    workout_logs: built.map((b) => b.log),
    workout_sets: built.flatMap((b) => b.sets),
    profiles: [{ id: "u1", timezone: TZ, weight_unit: "kg" }],
  }
  const fake = createFakeSupabase(tables)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake }))
  const repo = await import("@/src/db/healthRepo")
  return { repo, tables }
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
})

describe("readHistoryMonths", () => {
  /** Fourteen months of training, one workout on the 15th of each month. */
  const fourteenMonths = Array.from({ length: 14 }, (_, i) => {
    const month = 12 - (i % 12)
    const year = i < 12 ? 2026 : 2025
    const key = `${year}-${String(((11 - i % 12) % 12) + 1).padStart(2, "0")}`
    void month
    return workout(`w-${i}`, `${key}-15T15:00:00Z`, [{ exercise: "Squat" }])
  })

  test("pages back a whole month at a time", async () => {
    const { repo } = await repoWith(fourteenMonths)
    const page = await repo.readHistoryMonths("u1", {
      timezone: TZ,
      before: "2027-01-01T00:00:00Z",
      minRows: 2,
      maxMonths: 12,
    })

    // Two workouts asked for, so two months read — never half of a third.
    expect(page.months).toHaveLength(2)
    for (const month of page.months) {
      expect(month.monthKey).toMatch(/^\d{4}-\d{2}$/)
      // Every workout in a month page belongs to that month.
      for (const log of month.logs) {
        expect(log.logged_at >= month.monthStart).toBe(true)
      }
    }
    // And it says there is more, because it asked.
    expect(page.nextBefore).toBe(page.months.at(-1)!.monthStart)
  })

  test("says when it has reached the beginning, and only then", async () => {
    const { repo } = await repoWith([
      workout("only", "2026-09-15T15:00:00Z", [{ exercise: "Squat" }]),
    ])
    const page = await repo.readHistoryMonths("u1", {
      timezone: TZ,
      before: "2026-10-01T00:00:00Z",
      minRows: 20,
    })
    expect(page.months).toHaveLength(1)
    /**
     * `null` is the server having LOOKED. The old screen's "Show more" simply
     * stopped appearing when the loaded array ran out, which is the same
     * gesture for "that is everything" and "I only fetched a year".
     */
    expect(page.nextBefore).toBeNull()
  })

  test("is empty and final for an account with nothing in it", async () => {
    const { repo } = await repoWith([])
    const page = await repo.readHistoryMonths("u1", { timezone: TZ })
    expect(page.months).toEqual([])
    expect(page.nextBefore).toBeNull()
  })

  test("a filtered page carries only that lift's workouts and only its sets", async () => {
    const { repo } = await repoWith([
      workout("mixed", "2026-09-15T15:00:00Z", [
        { exercise: "Squat" },
        { exercise: "Bench Press" },
      ]),
      workout("bench-only", "2026-09-10T15:00:00Z", [{ exercise: "Bench Press" }]),
    ])
    const page = await repo.readHistoryMonths("u1", {
      timezone: TZ,
      before: "2026-10-01T00:00:00Z",
      lift: "Squat",
    })

    const logs = page.months.flatMap((m) => m.logs)
    expect(logs.map((l) => l.id), "the bench-only session is not a Squat session").toEqual(["mixed"])
    /**
     * And the sets are the lift's alone, because the month header's total is
     * computed from them: "8,000 kg of Squat" must not include the bench.
     */
    expect(logs[0].sets.map((s) => s.exercise)).toEqual(["Squat"])
  })

  test("files a 23:30 workout on the last day of a month under that month", async () => {
    // 2026-05-31T23:30 in New York is 2026-06-01T03:30Z. The month is the
    // account's, so this is May.
    const { repo } = await repoWith([
      workout("late", "2026-06-01T03:30:00Z", [{ exercise: "Squat" }]),
    ])
    const page = await repo.readHistoryMonths("u1", {
      timezone: TZ,
      before: "2026-07-01T00:00:00Z",
    })
    expect(page.months[0].monthKey).toBe("2026-05")
    expect(page.months[0].logs.map((l) => l.id)).toEqual(["late"])
  })

  test("returns a month's workouts newest first", async () => {
    const { repo } = await repoWith([
      workout("early", "2026-09-05T15:00:00Z", [{ exercise: "Squat" }]),
      workout("late", "2026-09-25T15:00:00Z", [{ exercise: "Squat" }]),
    ])
    const page = await repo.readHistoryMonths("u1", {
      timezone: TZ,
      before: "2026-10-01T00:00:00Z",
    })
    expect(page.months[0].logs.map((l) => l.id)).toEqual(["late", "early"])
  })
})
