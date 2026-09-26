// @vitest-environment node
/**
 * WHEN A WORKOUT WRITE FAILS, WHO IS TALKING?
 *
 * Until 2026-09-26 it was Postgres, to a person standing at a squat rack. The
 * owner's screen, mid-workout:
 *
 *     That Squat set could not be saved: new row violates row-level security
 *     policy for table "workout_sets"
 *
 * Nothing was wrong with their permissions. `workout_sets` has no user column —
 * its policy asks whether the PARENT workout exists and is yours — so an RLS
 * refusal is how the database says "there is no such workout". The workout had
 * been discarded on a second device in the gap between `completeSet` checking
 * it was open and `completeSet` writing the row. Reproduced against the running
 * app by discarding on one client while five ticks were in flight from another:
 * 18 refusals in 40 tries, and the FIRST of each burst came back as a foreign
 * key violation rather than an RLS one — same cause, two different codes, which
 * is exactly why this is settled by asking rather than by reading the code.
 *
 * THE THREE ANSWERS, and the reason the repo asks a second question instead of
 * mapping error codes: "the write failed" is not a fact about the workout. The
 * workout is gone, or finished, or still sitting there open with a genuine
 * failure against it, and those are three different sentences.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const WORKOUT = "w1"

/** What the workout row looks like on the second question. */
type Fate = "gone" | "finished" | "open"

const liveRow = {
  id: WORKOUT,
  user_id: USER,
  session_type: "weights",
  started_at: "2026-09-26T18:00:00Z",
  ended_at: null,
  enrollment_id: null,
  program_day_id: null,
  program_cycle: null,
  program_week: null,
  adjustments: {},
  notes: null,
  rpe: null,
  client_key: "k1",
  logged_at: "2026-09-26T18:00:00Z",
  workout_sets: [],
}

/**
 * A database that takes the write and then answers the question the repo asks
 * about it.
 *
 * Reads are told apart by the COLUMNS asked for, which is how the repo itself
 * tells its two reads apart: the live read takes `*, workout_sets(*)`, and the
 * question after a failure takes `ended_at` alone.
 */
function fakeSupabase(opts: { writeError: { code?: string; message: string } | null; fate: Fate }) {
  /** Every select string, so a test can prove the second question was asked. */
  const selects: string[] = []

  const table = (name: string) => {
    let selected = ""
    let writing = false
    const chain: Record<string, unknown> = {
      select: (cols: string) => {
        selected = cols
        selects.push(`${name}:${cols}`)
        return chain
      },
      insert: () => {
        writing = true
        return chain
      },
      update: () => {
        writing = true
        return chain
      },
      delete: () => {
        writing = true
        return chain
      },
      eq: () => chain,
      is: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => resolve(),
      single: () => resolve(),
      then: (done: (v: unknown) => unknown) => resolve().then(done),
    }

    function resolve() {
      if (writing) return Promise.resolve({ data: null, error: opts.writeError })
      if (name === "profiles") return Promise.resolve({ data: { weight_unit: "kg" }, error: null })
      if (name !== "workout_logs") return Promise.resolve({ data: null, error: null })

      // The second question: is it gone, finished, or still open?
      if (selected === "ended_at") {
        if (opts.fate === "gone") return Promise.resolve({ data: null, error: null })
        return Promise.resolve({
          data: { ended_at: opts.fate === "finished" ? "2026-09-26T19:00:00Z" : null },
          error: null,
        })
      }
      // The live read that `requireLive` makes before any write.
      return Promise.resolve({ data: liveRow, error: null })
    }

    return chain
  }

  return { client: { from: table }, selects }
}

async function repoWith(opts: { writeError: { code?: string; message: string } | null; fate: Fate }) {
  const fake = fakeSupabase(opts)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => "Europe/Copenhagen",
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
  }))
  const repo = await import("@/src/db/workoutRepo")
  return { repo, fake }
}

const aSet = {
  exerciseId: "squat",
  exercise: "Squat",
  weight: 60,
  reps: 5,
  setNumber: 1,
  kind: "working" as const,
  side: null,
}

/** The two the database really sends for a parent that is not there. */
const RLS = { code: "42501", message: 'new row violates row-level security policy for table "workout_sets"' }
const FK = {
  code: "23503",
  message: 'insert or update on table "workout_sets" violates foreign key constraint "workout_sets_log_id_fkey"',
}

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("a set written into a workout that is no longer there", () => {
  test("says it was thrown away somewhere else, not what the database said", async () => {
    const { repo } = await repoWith({ writeError: RLS, fate: "gone" })
    await expect(repo.completeSet(USER, WORKOUT, aSet)).rejects.toThrow(
      /thrown away somewhere else/i
    )
  })

  test("the database's own sentence never reaches the caller", async () => {
    const { repo } = await repoWith({ writeError: RLS, fate: "gone" })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: Error) => e)
    // The exact words the owner was shown. This is the assertion the whole
    // change exists for, made against the real message the database sends.
    expect((thrown as Error).message).not.toMatch(/row-level security/i)
    expect((thrown as Error).message).not.toMatch(/workout_sets/)
    expect((thrown as Error).message).not.toMatch(/violates/i)
  })

  test("a foreign key violation is the same fact and gets the same sentence", async () => {
    // The first refusal of each burst arrives as a foreign key violation and
    // the rest as RLS. Mapping error codes would have caught one of the two.
    const { repo } = await repoWith({ writeError: FK, fate: "gone" })
    await expect(repo.completeSet(USER, WORKOUT, aSet)).rejects.toThrow(/thrown away somewhere else/i)
  })

  test("it carries the code the screen acts on, so the screen can stop drawing a workout", async () => {
    const { errorBody } = await import("@/src/programs/errors")
    const { repo } = await repoWith({ writeError: RLS, fate: "gone" })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: unknown) => e)
    expect(errorBody(thrown)).toEqual({
      error: "This workout was thrown away somewhere else, so that change was not saved.",
      code: "workout_gone",
    })
  })

  test("finished on the other device is a different sentence from thrown away", async () => {
    const { repo } = await repoWith({ writeError: RLS, fate: "finished" })
    await expect(repo.completeSet(USER, WORKOUT, aSet)).rejects.toThrow(/already finished somewhere else/i)
  })

  test("a workout that is still open owns its failure, and does not claim to be gone", async () => {
    // The write really failed and the workout is fine. Saying "thrown away on
    // another device" here would be a fabrication, which is the failure mode of
    // guessing from an error code instead of asking.
    const { repo } = await repoWith({
      writeError: { code: "08006", message: "connection failure" },
      fate: "open",
    })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: Error) => e)
    expect((thrown as Error).message).toMatch(/That set could not be saved/i)
    expect((thrown as Error).message).not.toMatch(/thrown away|finished/i)
    expect((thrown as Error).message).not.toMatch(/connection failure/)
  })

  test("the second question is actually asked — the verdict is read, not assumed", async () => {
    const { repo, fake } = await repoWith({ writeError: RLS, fate: "gone" })
    await repo.completeSet(USER, WORKOUT, aSet).catch(() => null)
    expect(
      fake.selects,
      "without this read the answer is a guess about which of three states the workout is in"
    ).toContain("workout_logs:ended_at")
  })
})
