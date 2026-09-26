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
type Fate = "gone" | "finished" | "open" | "written-up" | "unreadable"

/** The workout disappears only AFTER the write has succeeded. */
type Vanishing = { goneAfterWrite?: boolean; liveReadFails?: boolean }

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
function fakeSupabase(opts: { writeError: { code?: string; message: string } | null; fate: Fate } & Vanishing) {
  /** Flipped by the first successful write, so the re-read after it finds nothing. */
  let written = false
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
      if (writing) {
        if (!opts.writeError) written = true
        return Promise.resolve({ data: null, error: opts.writeError })
      }
      if (name === "profiles") return Promise.resolve({ data: { weight_unit: "kg" }, error: null })
      if (name !== "workout_logs") return Promise.resolve({ data: null, error: null })

      // The second question: is it gone, finished, or still open? It asks for
      // BOTH lifecycle columns, because a session written up afterwards has no
      // end time and is not open — see src/db/workoutLifecycle.ts.
      if (selected === "started_at, ended_at") {
        if (opts.fate === "unreadable") {
          return Promise.resolve({ data: null, error: { code: "08006", message: "connection failure" } })
        }
        if (opts.fate === "gone") return Promise.resolve({ data: null, error: null })
        if (opts.fate === "written-up") {
          // No start and no end: a session typed in afterwards. Allowed by
          // `workout_logs_lifecycle`, and NOT open.
          return Promise.resolve({ data: { started_at: null, ended_at: null }, error: null })
        }
        return Promise.resolve({
          data: {
            started_at: "2026-09-26T18:00:00Z",
            ended_at: opts.fate === "finished" ? "2026-09-26T19:00:00Z" : null,
          },
          error: null,
        })
      }
      if (opts.liveReadFails) {
        return Promise.resolve({ data: null, error: { code: "57014", message: "statement timeout" } })
      }
      // The live read that `requireLive` makes before any write — and the
      // one it makes AFTER, which is where the workout can have gone.
      if (opts.goneAfterWrite && written) return Promise.resolve({ data: null, error: null })
      return Promise.resolve({ data: liveRow, error: null })
    }

    return chain
  }

  return { client: { from: table }, selects }
}

async function repoWith(opts: { writeError: { code?: string; message: string } | null; fate: Fate } & Vanishing) {
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

  test("a session written up afterwards is not 'open', so it is not told to tap again", async () => {
    /**
     * `workout_logs_lifecycle` allows a third shape: no start and no end, which
     * is a session typed in later. `fateOf` read `ended_at === null` and called
     * it open — so a failed write against one answered "Tap it again", retry
     * advice for a workout nobody can tick into. Three functions already knew
     * better; this one was written the same day and did not.
     */
    const { repo } = await repoWith({ writeError: RLS, fate: "written-up" })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: Error) => e)
    expect((thrown as Error).message).not.toMatch(/Tap it again/i)
    expect((thrown as Error).message).toMatch(/already finished somewhere else/i)
  })

  test("a question that could not be asked is not answered as a 'no'", async () => {
    /**
     * The fourth state, and the reason it exists. When the follow-up read
     * fails, "gone" would be a fabrication and the caller's "Tap it again"
     * would be retry advice about a workout that may not be there. It was
     * collapsed into the `open` branch until a review pointed out that
     * `unknown` and `open` were indistinguishable at every call site.
     */
    const { repo } = await repoWith({ writeError: RLS, fate: "unreadable" })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: Error) => e)
    const said = (thrown as Error).message
    expect(said).toMatch(/could not reach the server/i)
    expect(said, "it must not claim the workout is gone").not.toMatch(/thrown away|finished/i)
    expect(said, "nor tell them to retry into a workout that may not exist").not.toMatch(/Tap it again/i)
  })

  test("the second question is actually asked — the verdict is read, not assumed", async () => {
    const { repo, fake } = await repoWith({ writeError: RLS, fate: "gone" })
    await repo.completeSet(USER, WORKOUT, aSet).catch(() => null)
    expect(
      fake.selects,
      "without this read the answer is a guess about which of three states the workout is in"
    ).toContain("workout_logs:started_at, ended_at")
  })
  test("a workout that disappears AFTER the write is not reported as finished", async () => {
    /**
     * THE SUCCESS PATH, which is where this survived the first two rounds.
     *
     * Every write ended `return (await getLiveWorkout(userId))!`. Discard on
     * the laptop in the moment between the INSERT and that re-read and the
     * `!` is a lie: the route answers 200 with a body of `null`, the browser
     * sets its workout to null with nothing to say why, and the live screen
     * falls through to "This workout is finished." for a workout that was
     * thrown away. Nothing was red, because a 200 is a 200.
     */
    const { errorBody } = await import("@/src/programs/errors")
    const { repo } = await repoWith({ writeError: null, fate: "gone", goneAfterWrite: true })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: unknown) => e)
    expect(thrown, "it must not resolve with a null workout").toBeInstanceOf(Error)
    expect(errorBody(thrown)).toEqual({
      error: "This workout was thrown away somewhere else, so that change was not saved.",
      code: "workout_gone",
    })
  })

  test("a question that could not be asked is retryable, not a 4xx", async () => {
    /**
     * THE STATUS CODE IS THE WHOLE POINT, because the offline queue reads it.
     *
     * `useLiveWorkout`'s flush treats any 4xx as "this will never succeed on a
     * retry": it drops the set out of `localStorage`, takes the ✓ off the
     * screen and says "has been removed". So returning 400 for "the database
     * could not be reached" would throw a set away on a transient blip and tell
     * the person it had — the worst outcome in this file, introduced BY the
     * third state, which exists to be careful.
     */
    const { workoutErrorResponse } = await import("@/src/programs/errors")
    const { repo } = await repoWith({
      writeError: { code: "08006", message: "connection failure" },
      fate: "unreadable",
    })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: unknown) => e)
    const answer = workoutErrorResponse(thrown)
    expect(answer.status, "4xx tells the queue to delete the set").toBe(503)
    expect(answer.status).toBeGreaterThanOrEqual(500)
  })

  test("a read that failed anywhere on the write path is retryable too", async () => {
    /**
     * `CouldNotTell` was wired to `fateOf` alone, and the other three reads on
     * this path — `requireLive`'s, the re-read after the write, and the unit
     * lookup — still threw bare Errors, which the sets route answers 400. So
     * the disaster the class was added to prevent was still live on three of
     * four paths, and on one of them the INSERT had already committed: the set
     * was in the database while the screen deleted it and said it could not be
     * saved.
     */
    const { workoutErrorResponse } = await import("@/src/programs/errors")
    const { repo } = await repoWith({ writeError: null, fate: "open", liveReadFails: true })
    const thrown = await repo.completeSet(USER, WORKOUT, aSet).catch((e: unknown) => e)
    expect(workoutErrorResponse(thrown).status, "4xx makes the queue delete the set").toBe(503)
  })
})
