// @vitest-environment node
/**
 * STARTING A WORKOUT: the day it opens, and every way it can be refused.
 *
 * In plain terms, the two things these tests hold down:
 *
 * 1. The card says "Today: Legs" and Start has to open Legs. It used to open
 *    whatever the program's own counter pointed at, which drifts away from the
 *    calendar the first time you miss a day.
 * 2. When the server will not start a workout, it says so in a sentence. It
 *    used to hand back the database's own complaint — "duplicate key value
 *    violates unique constraint uq_workout_logs_client_key" — and every card
 *    printed it.
 *
 * The database here is a fake keyed by table name. It is not a mock of the
 * repository: the real `startWorkout` runs, and what it inserts is asserted.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { pushPullLegs } from "@/src/programs/data/bodybuilding/pushPullLegs"
import { strongLifts5x5 } from "@/src/programs/data/strength/stronglifts5x5"
import { seedEnrollment } from "@/src/programs/programsService"
import type { ProgramSchedule } from "@/src/programs/types"

const USER = "u1"
const TZ = "Europe/Copenhagen"

/** Push/Pull/Legs, pinned to Monday, Wednesday and Friday. */
function pinnedSchedule(): ProgramSchedule {
  if (pushPullLegs.schedule.kind !== "linear_rotation") throw new Error("shape changed")
  const days = pushPullLegs.schedule.days.slice(0, 3)
  return {
    kind: "linear_rotation",
    days: [
      { ...days[0], weekday: 1 },
      { ...days[1], weekday: 3 },
      { ...days[2], weekday: 5 },
    ],
  }
}

interface FakeOptions {
  /** The enrollment row, or null for "no such program". */
  enrollment?: Record<string, unknown> | null
  /** A workout that is open right now. */
  live?: Record<string, unknown> | null
  /** A row already carrying the client key. */
  keyRow?: Record<string, unknown> | null
  /** What the INSERT answers with, when it must not succeed. */
  insertError?: { code?: string; message: string } | null
  /** A live workout that only appears once the insert has failed. */
  liveAfterInsert?: Record<string, unknown> | null
}

const liveRow = (over: Record<string, unknown> = {}) => ({
  id: "w-open",
  user_id: USER,
  session_type: "weights",
  started_at: "2026-09-18T06:00:00Z",
  ended_at: null,
  enrollment_id: "e1",
  program_day_id: "pull_a",
  program_cycle: 1,
  program_week: 1,
  adjustments: {},
  notes: null,
  rpe: null,
  client_key: "key-open",
  logged_at: "2026-09-18T06:00:00Z",
  workout_sets: [],
  ...over,
})

function fakeSupabase(opts: FakeOptions) {
  const inserted: Record<string, unknown>[] = []
  let insertsSeen = 0

  const table = (name: string) => {
    let payload: Record<string, unknown> | null = null
    let selectedColumns = ""

    const chain: Record<string, unknown> = {
      select: (cols?: string) => {
        selectedColumns = cols ?? ""
        return chain
      },
      insert: (row: Record<string, unknown>) => {
        payload = row
        return chain
      },
      eq: () => chain,
      is: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => resolve("maybeSingle"),
      single: () => resolve("single"),
    }

    function resolve(mode: "single" | "maybeSingle") {
      if (payload) {
        insertsSeen += 1
        if (opts.insertError) {
          return Promise.resolve({ data: null, error: opts.insertError })
        }
        inserted.push(payload)
        return Promise.resolve({
          data: liveRow({ ...payload, id: "w-new", workout_sets: [] }),
          error: null,
        })
      }
      if (name === "program_enrollments") {
        const enr = opts.enrollment
        if (!enr) return Promise.resolve({ data: null, error: { code: "PGRST116", message: "none" } })
        return Promise.resolve({ data: enr, error: null })
      }
      if (name === "profiles") {
        return Promise.resolve({ data: { weight_unit: "kg" }, error: null })
      }
      if (name === "workout_logs") {
        // The key lookup asks for a narrow column list; the live read asks for
        // the whole row plus its sets. That is how they are told apart here.
        if (selectedColumns.includes("client_key") && !selectedColumns.includes("workout_sets")) {
          return Promise.resolve({ data: opts.keyRow ?? null, error: null })
        }
        const live = insertsSeen > 0 ? (opts.liveAfterInsert ?? null) : (opts.live ?? null)
        if (mode === "single" && !live) {
          return Promise.resolve({ data: null, error: { code: "PGRST116", message: "none" } })
        }
        return Promise.resolve({ data: live, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    }

    return chain
  }

  return { client: { from: table }, inserted, insertCount: () => insertsSeen }
}

async function startWith(opts: FakeOptions) {
  const fake = fakeSupabase(opts)
  vi.doMock("@/src/db/supabase", () => ({ createServerSupabaseClient: async () => fake.client }))
  vi.doMock("@/src/db/settingsRepo", () => ({
    getUserTimezone: async () => TZ,
    // The account has a zone somebody set; these tests are about which DAY is
    // picked, not about whether the app knows the zone.
    getUserClock: async () => ({ timezone: TZ, known: true }),
    getTrainingSettings: async () => ({ barWeightKg: 20, smallestPlateKg: 1.25 }),
  }))
  const repo = await import("@/src/db/workoutRepo")
  return { repo, fake }
}

const enrollmentRow = (over: Record<string, unknown> = {}) => {
  const seed = seedEnrollment(pushPullLegs, "beginner", "kg")
  return {
    id: "e1",
    user_id: USER,
    program_id: pushPullLegs.id,
    level: "beginner",
    unit_system: "kg",
    exercise_state: seed.exerciseState,
    cursor: seed.cursor,
    is_active: true,
    started_at: "2026-09-01T00:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
    custom_schedule: pinnedSchedule(),
    initial_exercise_state: seed.exerciseState,
    replay_events: [],
    bar_weight_kg: null,
    label: null,
    ...over,
  }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
  vi.doUnmock("@/src/db/supabase")
  vi.doUnmock("@/src/db/settingsRepo")
})

describe("which day Start opens", () => {
  test("starts the day the card named, not the day the cursor points at", async () => {
    // Friday 07:00 in Copenhagen. The cursor still sits on day 0 (Pull A,
    // Monday) because Wednesday was missed — the card says Legs A, and Start
    // used to open Pull A.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-18T05:00:00Z") })
    const { repo, fake } = await startWith({ enrollment: enrollmentRow() })
    await repo.startWorkout(USER, { enrollmentId: "e1", clientKey: "k1" })
    expect(fake.inserted[0].program_day_id).toBe("legs_a")
  })

  test("an unanchored program still starts the cursor's day", async () => {
    // StrongLifts is a sequence, not a calendar: missing Tuesday must not skip
    // Workout B. Nothing about this changed.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-18T05:00:00Z") })
    const seed = seedEnrollment(strongLifts5x5, "beginner", "kg")
    const { repo, fake } = await startWith({
        enrollment: enrollmentRow({
          program_id: strongLifts5x5.id,
          custom_schedule: null,
          exercise_state: seed.exerciseState,
          cursor: { ...seed.cursor, dayIndex: 1 },
          initial_exercise_state: seed.exerciseState,
        }),
      })
    await repo.startWorkout(USER, { enrollmentId: "e1", clientKey: "k1" })
    if (strongLifts5x5.schedule.kind !== "linear_rotation") throw new Error("shape changed")
    expect(fake.inserted[0].program_day_id).toBe(strongLifts5x5.schedule.days[1].id)
  })

  test("a day that is not in the program is refused by name", async () => {
    const { repo } = await startWith({ enrollment: enrollmentRow() })
    await expect(
      repo.startWorkout(USER, { enrollmentId: "e1", dayId: "not-a-day", clientKey: "k1" })
    ).rejects.toMatchObject({ code: "unknown_day", status: 409 })
  })

  test("a Couch to 5K session opens its prescription without asking for days", async () => {
    // A running plan has weeks, not days. Asking it for a day list THREW, so
    // the live screen could not open at all for a workout started on one.
    const { repo } = await startWith({
        enrollment: enrollmentRow({
          program_id: "couch-to-5k",
          custom_schedule: null,
          exercise_state: {},
          initial_exercise_state: {},
          cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
        }),
      })
    const resolved = await repo.prescriptionForDay(USER, "e1", "w1-r1")
    expect(resolved.prescription.dayId).toBeTruthy()
    expect(resolved.loadStyles).toEqual({})
  })
})

describe("refusing a start in a sentence", () => {
  test("a key whose workout is already finished is refused as spent, not as a database error", async () => {
    // Finish on the laptop, then tap Start on the phone: the phone still holds
    // the key it used, and the unique index refuses it. That used to arrive as
    // "duplicate key value violates unique constraint".
    const { repo } = await startWith({ keyRow: { id: "w-done" }, enrollment: enrollmentRow() })
    await expect(
      repo.startWorkout(USER, { enrollmentId: "e1", clientKey: "k1" })
    ).rejects.toMatchObject({ code: "start_key_spent", message: "That start was already used." })
  })

  test("a key on a workout that was written after the fact is spent too, and is never handed back as live", async () => {
    // A workout typed in afterwards carries a client key and has no start time.
    // Treating it as "the open workout" would hand back a row with no
    // `started_at` at all.
    const { repo } = await startWith({ keyRow: { id: "w-typed" }, live: null, enrollment: enrollmentRow() })
    await expect(
      repo.startWorkout(USER, { enrollmentId: "e1", clientKey: "k1" })
    ).rejects.toMatchObject({ code: "start_key_spent" })
  })

  test("a lost reply retried with the same key returns the workout it opened", async () => {
    const open = liveRow({ client_key: "k1" })
    const { repo, fake } = await startWith({ keyRow: { id: open.id }, live: open, enrollment: enrollmentRow() })
    const result = await repo.startWorkout(USER, { enrollmentId: "e1", clientKey: "k1" })
    expect(result.id).toBe("w-open")
    expect(fake.insertCount()).toBe(0)
  })

  test("a workout already open under a different key says so and carries it", async () => {
    const { repo } = await startWith({ keyRow: null, live: liveRow(), enrollment: enrollmentRow() })
    await expect(
      repo.startWorkout(USER, { enrollmentId: "e1", clientKey: "k2" })
    ).rejects.toMatchObject({ code: "already_open", workout: { id: "w-open" } })
  })

  test("two starts racing both end on the one workout, without a Postgres message", async () => {
    const { repo } = await startWith({
        enrollment: enrollmentRow(),
        insertError: { code: "23505", message: "duplicate key value violates unique constraint" },
        liveAfterInsert: liveRow({ id: "w-winner" }),
      })
    const failure = await repo
      .startWorkout(USER, { enrollmentId: "e1", clientKey: "k2" })
      .then(() => null)
      .catch((e: unknown) => e as Error & { code: string; workout?: { id: string } })
    expect(failure?.code).toBe("already_open")
    expect(failure?.workout?.id).toBe("w-winner")
    expect(failure?.message).not.toContain("duplicate key")
  })

  test("a start that fails for any other reason says a plain sentence", async () => {
    const { repo } = await startWith({
        enrollment: enrollmentRow(),
        insertError: { code: "42501", message: "permission denied for table workout_logs" },
      })
    const failure = await repo
      .startWorkout(USER, { enrollmentId: "e1", clientKey: "k2" })
      .then(() => null)
      .catch((e: unknown) => e as Error)
    expect(failure?.message).toBe("Could not start the workout.")
    expect(failure?.message).not.toContain("permission denied")
  })

  test("a program that is not there is refused as a missing program, not a crash", async () => {
    const { repo } = await startWith({ enrollment: null })
    await expect(
      repo.startWorkout(USER, { enrollmentId: "gone", clientKey: "k1" })
    ).rejects.toMatchObject({ code: "no_program", status: 404 })
  })
})

describe("what a workout counts as", () => {
  test("a live workout on a running program is stored as a run, on a mobility program as mobility, on StrongLifts as weights, on no program as weights", async () => {
    const cases: Array<[string, string]> = [
      ["couch-to-5k", "running"],
      ["splits-mobility", "mobility"],
      [strongLifts5x5.id, "weights"],
    ]
    for (const [programId, expected] of cases) {
      vi.resetModules()
      const { repo, fake } = await startWith({
          enrollment: enrollmentRow({
            program_id: programId,
            custom_schedule: null,
            exercise_state: {},
            initial_exercise_state: {},
            cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
          }),
        })
      await repo.startWorkout(USER, { enrollmentId: "e1", clientKey: "k1" })
      expect(fake.inserted[0].session_type, programId).toBe(expected)
    }

    vi.resetModules()
    const loose = await startWith({})
    await loose.repo.startWorkout(USER, { clientKey: "k1" })
    expect(loose.fake.inserted[0].session_type).toBe("weights")
  })
})
