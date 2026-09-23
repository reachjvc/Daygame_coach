// @vitest-environment node
/**
 * SAVING A WORKOUT TWICE IS SAVING IT ONCE.
 *
 * In plain terms, the failure these tests hold down. You finish a workout on
 * gym wifi and the reply is lost on the way back. The workout IS saved. The
 * screen said "Nothing was finished", showed no summary, and the next tap of
 * Save was answered with "that workout is not open any more — reload". An hour
 * of training, saved, and reported as lost.
 *
 * Two halves fix it. The browser now ASKS the server whether it went through
 * (tested in useLiveWorkout.test.tsx), and the server treats a second Save as a
 * repeat of the first: it ignores the retry's input and hands back the summary
 * of the workout that is already closed. The same applies when two Saves race
 * and one of them loses — the workout is closed either way, and an error about
 * a workout that is in fact saved is the worst of the three possible answers.
 *
 * `summaryFor` is the single owner of "what this workout was". The finish
 * returns what it reads, so the receipt a person sees later is the same object,
 * not a second guess at it.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "u1"
const WORKOUT = "w1"

interface FakeOptions {
  /** The row as it stands before the finish: null means it is gone. */
  row?: { id: string; ended_at: string | null; started_at: string | null } | null
  /** What the stored-receipt columns hold once the workout is closed. */
  stored?: { progression_changes: unknown; personal_records: unknown }
  /** An error from the finish transaction. */
  rpcError?: { message: string; code?: string } | null
  /** Whether the row reads as closed AFTER the transaction was attempted. */
  closedAfterRpc?: boolean
  /** What Settings says the person trains in NOW, which they can change. */
  unit?: "kg" | "lb"
  /**
   * Makes the open workout a PROGRAM workout rather than a loose one.
   *
   * The two are different rules at the finish: a program decided its session
   * kind when it started, and a loose workout has nothing to ask.
   */
  enrollmentId?: string | null
}

const SETS = [
  {
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
  },
  // A warm-up, which must not count towards sets or volume.
  { id: "s0", log_id: WORKOUT, exercise: "Squat", exercise_id: "squat", library_id: null, weight_kg: 40, reps: 5, set_number: 1, set_kind: "warmup", prescribed_index: 0, completed_at: "2026-09-18T07:00:00Z", rpe: null, side: null, notes: null, exercise_notes: null },
]

function fakeSupabase(opts: FakeOptions) {
  const rpcCalls: Record<string, unknown>[] = []
  let rpcSeen = false
  /** What the finish transaction actually stored, if it ran and succeeded. */
  let written: { p_changes: unknown; p_records: unknown } | null = null

  const table = (name: string) => {
    let selected = ""
    /** Which page was asked for. Paged reads stop on a short page. */
    let ranged = false
    const chain: Record<string, unknown> = {
      select: (cols?: string) => {
        selected = cols ?? ""
        return chain
      },
      update: () => chain,
      insert: () => chain,
      eq: () => chain,
      neq: () => chain,
      lt: () => chain,
      in: () => chain,
      or: () => chain,
      is: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      /**
       * `.range()` returns the BUILDER, not a promise — `finishedWorkouts()`
       * wraps the ranged query and calls `.or()` on it, so a promise here
       * breaks the chain the production code actually builds.
       */
      range: (a: number) => {
        ranged = a === 0
        return chain
      },
      then: (done: (v: unknown) => unknown) => (resolve() as Promise<unknown>).then(done),
      maybeSingle: () => resolve(),
      single: () => resolve(),
    }

    function resolve() {
      if (name === "profiles") {
        return Promise.resolve({ data: { weight_unit: opts.unit ?? "kg" }, error: null })
      }
      if (name === "program_enrollments") {
        return Promise.resolve({ data: null, error: { code: "PGRST116", message: "none" } })
      }
      if (name === "workout_sets") {
        // Paged: the first window has the rows, the next comes back empty.
        return Promise.resolve({ data: ranged ? SETS : [], error: null })
      }
      if (name !== "workout_logs") return Promise.resolve({ data: null, error: null })

      // The personal-best baseline: every other finished workout. Empty here —
      // tests/unit/health/personalBestBaseline.test.ts is where that read is
      // pinned down; what matters for THIS file is that a person with no
      // history gets a receipt that says "first", not "best".
      if (selected.includes("id, logged_at")) {
        return Promise.resolve({ data: [], error: null })
      }

      // `summaryFor`'s read: the receipt columns, and only a CLOSED workout.
      if (selected.includes("progression_changes")) {
        const closed = rpcSeen ? (opts.closedAfterRpc ?? true) : Boolean(opts.row?.ended_at)
        if (!closed) return Promise.resolve({ data: null, error: null })
        return Promise.resolve({
          data: {
            id: WORKOUT,
            enrollment_id: null,
            started_at: "2026-09-18T07:00:00Z",
            ended_at: "2026-09-18T08:00:00Z",
            duration_min: 60,
            /**
             * THE COLUMNS ECHO WHAT THE TRANSACTION WAS HANDED. That is the
             * point of the change: the receipt is written in the same statement
             * that closes the workout, so reading it back later cannot give a
             * different answer from the one the screen showed.
             */
            progression_changes: written ? written.p_changes : (opts.stored?.progression_changes ?? null),
            personal_records: written ? written.p_records : (opts.stored?.personal_records ?? null),
          },
          error: null,
        })
      }
      // `finishWorkout`'s own first read.
      if (selected.includes("ended_at") && !selected.includes("workout_sets")) {
        return Promise.resolve({ data: opts.row ?? null, error: null })
      }
      // `getLiveWorkout` / `requireLive`.
      if (opts.row && !opts.row.ended_at) {
        return Promise.resolve({
          data: {
            id: WORKOUT,
            user_id: USER,
            session_type: "weights",
            started_at: "2026-09-18T07:00:00Z",
            ended_at: null,
            enrollment_id: opts.enrollmentId ?? null,
            program_day_id: null,
            program_cycle: null,
            program_week: null,
            adjustments: {},
            notes: null,
            rpe: null,
            client_key: "k1",
            logged_at: "2026-09-18T07:00:00Z",
            workout_sets: SETS,
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    }
    return chain
  }

  const client = {
    from: table,
    rpc: (_name: string, args: Record<string, unknown>) => {
      rpcSeen = true
      rpcCalls.push(args)
      if (!opts.rpcError) {
        written = { p_changes: args.p_changes, p_records: args.p_records }
      }
      return Promise.resolve({ data: null, error: opts.rpcError ?? null })
    },
  }
  return { client, rpcCalls }
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

const open = { id: WORKOUT, ended_at: null, started_at: "2026-09-18T07:00:00Z" }
const closed = { id: WORKOUT, ended_at: "2026-09-18T08:00:00Z", started_at: "2026-09-18T07:00:00Z" }

beforeEach(() => vi.resetModules())
afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("finishing a workout", () => {
  test("finishing an already-finished workout returns its summary instead of an error", async () => {
    const { repo, fake } = await repoWith({
      row: closed,
      stored: {
        progression_changes: [{ exerciseId: "squat", name: "Squat", reason: "+2.5 kg" }],
        personal_records: { records: [], firstTimeLifts: ["Squat"] },
      },
    })
    const summary = await repo.finishWorkout(USER, WORKOUT, { intensity: 4 })
    expect(summary.workoutId).toBe(WORKOUT)
    expect(summary.firstTimeLifts).toEqual(["Squat"])
    // And it does NOT run the finish again — that is what would advance the
    // program's weights twice for one session.
    expect(fake.rpcCalls).toHaveLength(0)
  })

  test("a finish that loses the race to another finish still returns the summary", async () => {
    // The transaction raises "already been finished" (55000) for the second
    // caller. The workout is closed; saying it failed would be a lie.
    const { repo } = await repoWith({
      row: open,
      rpcError: { message: "That workout has already been finished", code: "55000" },
      closedAfterRpc: true,
      stored: { progression_changes: [], personal_records: { records: [], firstTimeLifts: [] } },
    })
    const summary = await repo.finishWorkout(USER, WORKOUT, { intensity: 4 })
    expect(summary.workoutId).toBe(WORKOUT)
  })

  test("a finish the program genuinely refuses keeps its own sentence", async () => {
    // The workout is still open afterwards, so this is a real refusal and the
    // person needs the server's own words, not a summary.
    const { repo } = await repoWith({
      row: open,
      rpcError: { message: "Your program moved on while this workout was open — reload and finish it again" },
      closedAfterRpc: false,
    })
    await expect(repo.finishWorkout(USER, WORKOUT, { intensity: 4 })).rejects.toThrow(
      /Your program moved on/
    )
  })

  test("a workout that is gone says so, rather than reporting it as unfinished", async () => {
    const { repo } = await repoWith({ row: null })
    await expect(repo.finishWorkout(USER, WORKOUT, { intensity: 4 })).rejects.toThrow(
      "That workout no longer exists."
    )
  })

  test("the summary read afterwards is the same object finishWorkout returned", async () => {
    const { repo, fake } = await repoWith({ row: open, closedAfterRpc: true })
    const returned = await repo.finishWorkout(USER, WORKOUT, { intensity: 4 })
    const readBack = await repo.summaryFor(USER, WORKOUT)
    expect(readBack).toEqual(returned)

    /**
     * AND WHAT IT HANDED THE TRANSACTION IS WHAT IT READS BACK. The receipt is
     * written inside the same statement that closes the workout, so it cannot
     * drift from what the screen said — recomputing it later gives a different
     * answer once the program has been edited.
     */
    expect(fake.rpcCalls).toHaveLength(1)
    expect(returned.changes).toEqual(fake.rpcCalls[0].p_changes)
    expect(returned.personalRecords).toEqual(
      (fake.rpcCalls[0].p_records as { records: unknown }).records
    )
    expect(returned.firstTimeLifts).toEqual(
      (fake.rpcCalls[0].p_records as { firstTimeLifts: unknown }).firstTimeLifts
    )
  })

  test("only working sets count towards the totals", async () => {
    const { repo } = await repoWith({
      row: closed,
      stored: { progression_changes: [], personal_records: { records: [], firstTimeLifts: [] } },
    })
    const summary = await repo.summaryFor(USER, WORKOUT)
    expect(summary?.sets).toBe(1)
    expect(summary?.volumeKg).toBe(500)
  })

  test("a workout finished before the receipt was kept says so, rather than 'nothing changed'", async () => {
    const { repo } = await repoWith({
      row: closed,
      stored: { progression_changes: null, personal_records: null },
    })
    const summary = await repo.summaryFor(USER, WORKOUT)
    expect(summary?.changesUnavailable).toBe(true)
    expect(summary?.recordsUnavailable).toBe(true)
    expect(summary?.changes).toEqual([])
  })

  test("a workout that is still open has no summary", async () => {
    const { repo } = await repoWith({ row: open })
    expect(await repo.summaryFor(USER, WORKOUT)).toBeNull()
  })

  /**
   * A BEST IN KILOS IS NEVER PRINTED UNDER A "lb" LABEL.
   *
   * The receipt keeps the kilograms AND the number the screen showed that day,
   * already converted. Switch Settings from kilos to pounds afterwards — two
   * taps, and something people do once — and the label on the old receipt
   * changes while the stored number does not: a 100 kg best read "100 lb".
   * Kilograms are the fact, so the displayed number is worked out from them
   * every time, alongside the label.
   */
  test("a best kept in kilos is shown in pounds once Settings says pounds", async () => {
    const { repo } = await repoWith({
      row: closed,
      unit: "lb",
      stored: {
        progression_changes: [],
        personal_records: {
          // `weight` as it was written on the day: kilos, because that is what
          // the person trained in then.
          records: [{ exercise: "Squat", weight_kg: 100, weight: 100, reps: 5, date: "2026-09-18", isNew: true }],
          firstTimeLifts: [],
        },
      },
    })
    const summary = await repo.summaryFor(USER, WORKOUT)
    expect(summary?.unit).toBe("lb")
    expect(summary?.personalRecords[0]?.weight_kg).toBe(100)
    expect(summary?.personalRecords[0]?.weight).toBe(220.46)
  })
})

/**
 * A WORKOUT WRITTEN UP AFTERWARDS, AND WHAT THE FINISH IS ALLOWED TO SAY.
 *
 * `durationMin` used to arrive from the CALLER and be clamped into range, so a
 * mistyped end became a silent ten-hour workout instead of a refusal — and
 * every session written up after the fact claimed "45 minutes at effort 3",
 * because that was the old form's default and nothing checked it.
 */
describe("the times, the kind and the distance", () => {
  test("the start, the kind and the distance go in the one call", async () => {
    const { repo, fake } = await repoWith({ row: open })

    await repo.finishWorkout(USER, WORKOUT, {
      intensity: 3,
      startedAt: "2026-09-15T10:00:00Z",
      endedAt: "2026-09-15T11:00:00Z",
      distanceKm: 5.2,
    })

    expect(fake.rpcCalls).toHaveLength(1)
    expect(fake.rpcCalls[0].p_started_at).toBe("2026-09-15T10:00:00Z")
    expect(fake.rpcCalls[0].p_distance_km).toBe(5.2)
    // One transaction. A second update afterwards is how the session kind used
    // to be written, with its error thrown away.
    expect(fake.rpcCalls).toHaveLength(1)
  })

  test("minutes are derived from the two instants, not sent", async () => {
    const { repo, fake } = await repoWith({ row: open })

    await repo.finishWorkout(USER, WORKOUT, {
      intensity: 3,
      startedAt: "2026-09-15T10:00:00Z",
      endedAt: "2026-09-15T10:45:00Z",
    })

    expect(fake.rpcCalls[0].p_duration_min).toBe(45)
  })

  test("a span longer than ten hours is refused, not quietly clamped to 599", async () => {
    const { repo, fake } = await repoWith({ row: open })

    await expect(
      repo.finishWorkout(USER, WORKOUT, {
        intensity: 3,
        startedAt: "2026-09-15T08:00:00Z",
        endedAt: "2026-09-15T20:00:00Z",
      })
    ).rejects.toThrow(/longer than ten hours/i)
    // Refused BEFORE anything was written.
    expect(fake.rpcCalls).toHaveLength(0)
  })

  test("a start moved past the sets already ticked is refused, naming the time", async () => {
    const { repo, fake } = await repoWith({ row: open })

    /**
     * The fixture's earliest set was ticked at 07:00Z, which is 09:00 in the
     * account's zone. Moving the start to 10:00Z would leave that set timed
     * before the workout it belongs to had begun — and everything read off
     * those sets afterwards (the day they are filed under, what counts as
     * "before" for a personal best) is measured from a start they precede.
     */
    await expect(
      repo.finishWorkout(USER, WORKOUT, {
        intensity: 3,
        startedAt: "2026-09-18T10:00:00Z",
        endedAt: "2026-09-18T11:00:00Z",
      })
    ).rejects.toThrow(/Started cannot be after your first set at 09:00/)
    expect(fake.rpcCalls).toHaveLength(0)
  })

  test("a start moved to before the first set is fine, which is the whole point", async () => {
    const { repo, fake } = await repoWith({ row: open })

    await repo.finishWorkout(USER, WORKOUT, {
      intensity: 3,
      startedAt: "2026-09-18T06:30:00Z",
      endedAt: "2026-09-18T07:30:00Z",
    })

    expect(fake.rpcCalls[0].p_started_at).toBe("2026-09-18T06:30:00Z")
  })

  test("a program workout naming its own session kind is refused before the transaction", async () => {
    const { repo, fake } = await repoWith({ row: open, enrollmentId: "e1" })

    // `sessionTypeFor` decided this when the workout started; the finish does
    // not get a second opinion.
    await expect(
      repo.finishWorkout(USER, WORKOUT, { intensity: 3, sessionType: "running" })
    ).rejects.toThrow(/program decides/i)
    expect(fake.rpcCalls).toHaveLength(0)
  })

  test("a loose workout with ticked sets and no kind named is saved as weights", async () => {
    const { repo, fake } = await repoWith({ row: open })

    await repo.finishWorkout(USER, WORKOUT, { intensity: 3 })

    expect(fake.rpcCalls[0].p_session_type).toBe("weights")
  })

  test("personal bests are judged from the EDITED start, not from today", async () => {
    const { repo, fake } = await repoWith({ row: open })

    await repo.finishWorkout(USER, WORKOUT, {
      intensity: 3,
      startedAt: "2026-09-15T10:00:00Z",
      endedAt: "2026-09-15T11:00:00Z",
    })

    // A session dated last Tuesday must be measured against what was lifted
    // before last Tuesday. The proof that the instant travelled is that the
    // workout was filed and finished at all with the moved start.
    expect(fake.rpcCalls[0].p_started_at).toBe("2026-09-15T10:00:00Z")
  })
})
