/**
 * Workout programs — SCHEMA TESTS.
 *
 * THE BUG THESE EXIST FOR. Ending a program used to be a hard `DELETE` on
 * `program_enrollments`. `program_session_logs.enrollment_id` is declared
 * `ON DELETE CASCADE`, so one click erased every session the person had ever
 * logged — a year of training, gone, behind a confirm() that said "your logged
 * sessions will be removed" and was treated as a feature. Ending a program now
 * archives it (`is_active = false`) and only a program you have already ended
 * can be erased on purpose.
 *
 * THE DANGER HAS SINCE MOVED, and this file moved with it. Sessions no longer
 * live in their own table: `program_session_logs` was a second copy of every
 * workout and was folded into `workout_logs` (20260907100000), which hangs off
 * the enrollment with `ON DELETE SET NULL`. So erasing a program now KEEPS the
 * training and merely stops calling it that — the cascade that made a hard
 * delete catastrophic is gone by construction rather than by discipline.
 *
 * Two schema facts still hold this up:
 *
 *   1. **Erasing a program keeps its workouts, un-linked.** That you trained is
 *      not the program's fact to erase. If this ever becomes a cascade again,
 *      "End program" is one misread away from destroying a year. Pinned by
 *      `workoutSchema.integration.test.ts` ("erasing the program keeps the
 *      workouts, and what day they were"), which also checks the day survives.
 *   2. **The unique index is PARTIAL**, pinned here. `… WHERE is_active` is what lets any
 *      number of finished enrollments of one program sit beside a single live
 *      one. Drop the `WHERE` and archiving breaks the moment somebody returns to
 *      a program they did before — and it breaks at *enrollment* time, far from
 *      the change that caused it.
 *
 * Like the other files here, these run raw SQL against the testcontainers
 * PostgreSQL rather than calling `programRepo` — the container is plain Postgres
 * and the repo needs a Supabase client. See the same note in
 * `goalRepo.integration.test.ts`. What can be proven at this layer is the shape
 * of the database, which is exactly where this feature's danger lives.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

const CURSOR = JSON.stringify({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 })

async function enroll(
  userId: string,
  programId = "stronglifts-5x5",
  isActive = true
): Promise<string> {
  const client = await getClient()
  try {
    const r = await client.query(
      `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, cursor, is_active)
       VALUES ($1, $2, 'beginner', 'kg', $3::jsonb, $4) RETURNING id`,
      [userId, programId, CURSOR, isActive]
    )
    return r.rows[0].id
  } finally {
    await client.end()
  }
}

async function logSessions(enrollmentId: string, userId: string, n: number): Promise<void> {
  const client = await getClient()
  try {
    for (let i = 0; i < n; i++) {
      await client.query(
        `INSERT INTO workout_logs
           (user_id, session_type, duration_min, intensity, enrollment_id, program_day_id, program_cycle, program_week)
         VALUES ($2, 'weights', 52, 3, $1, 'A', 1, 1)`,
        [enrollmentId, userId]
      )
    }
  } finally {
    await client.end()
  }
}

async function countSessions(enrollmentId: string): Promise<number> {
  const client = await getClient()
  try {
    const r = await client.query(
      `SELECT count(*)::int AS n FROM workout_logs WHERE enrollment_id = $1`,
      [enrollmentId]
    )
    return r.rows[0].n
  } finally {
    await client.end()
  }
}

/** One statement, one connection — the pattern the sibling files here use. */
async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getClient()
  try {
    return (await client.query(text, params)).rows as T[]
  } finally {
    await client.end()
  }
}

async function isActive(id: string): Promise<boolean> {
  const [row] = await sql<{ is_active: boolean }>(
    `SELECT is_active FROM program_enrollments WHERE id = $1`,
    [id]
  )
  return row!.is_active
}

describe("program schema", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  describe("deleting a person", () => {
    test("deleting a person takes their programs and sessions with them", async () => {
      const userId = await createTestUser("gdpr@example.com")
      const enrollmentId = await enroll(userId)
      await logSessions(enrollmentId, userId, 2)

      const client = await getClient()
      try {
        await client.query(`DELETE FROM profiles WHERE id = $1`, [userId])
        const left = await client.query(
          `SELECT count(*)::int AS n FROM program_enrollments WHERE user_id = $1`,
          [userId]
        )
        expect(left.rows[0].n).toBe(0)
      } finally {
        await client.end()
      }
      expect(await countSessions(enrollmentId)).toBe(0)
    })
  })

  describe("the active-enrollment index is partial, so a past program is not in the way", () => {
    test("refuses two ACTIVE enrollments of the same program", async () => {
      const userId = await createTestUser("dupe@example.com")
      await enroll(userId, "stronglifts-5x5", true)
      await expect(enroll(userId, "stronglifts-5x5", true)).rejects.toMatchObject({
        code: "23505",
        constraint: "uq_program_enrollments_active",
      })
    })

    test("allows returning to a program you finished — the archived one does not block it", async () => {
      // The case the partial index exists for. Without `WHERE is_active` this
      // throws, and it throws at enrollment time, nowhere near the change.
      const userId = await createTestUser("return@example.com")
      const first = await enroll(userId, "stronglifts-5x5", true)

      const client = await getClient()
      try {
        await client.query(`UPDATE program_enrollments SET is_active = false WHERE id = $1`, [first])
      } finally {
        await client.end()
      }

      await expect(enroll(userId, "stronglifts-5x5", true)).resolves.toBeTruthy()
    })

    test("two people may run the same program at once", async () => {
      const a = await createTestUser("a@example.com")
      const b = await createTestUser("b@example.com")
      await enroll(a, "stronglifts-5x5", true)
      await expect(enroll(b, "stronglifts-5x5", true)).resolves.toBeTruthy()
    })
  })

  describe("what may be written", () => {
    test("rejects a level the app does not have", async () => {
      const userId = await createTestUser("level@example.com")
      const client = await getClient()
      try {
        await expect(
          client.query(
            `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, cursor)
             VALUES ($1, 'x', 'expert', 'kg', $2::jsonb)`,
            [userId, CURSOR]
          )
        ).rejects.toMatchObject({ code: "23514", constraint: "program_enrollments_level_check" })
      } finally {
        await client.end()
      }
    })

    test("rejects an RPE outside 1-10, and accepts none at all", async () => {
      const userId = await createTestUser("rpe@example.com")
      const enrollmentId = await enroll(userId)
      const client = await getClient()
      try {
        await expect(
          client.query(
            `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, enrollment_id, program_day_id, program_cycle, program_week, rpe)
             VALUES ($2, 'weights', 52, 3, $1, 'A', 1, 1, 11)`,
            [enrollmentId, userId]
          )
          // Production names this one `workout_logs_rpe_range`; the mirror's is
          // the generated name. Same rule, same bounds.
        ).rejects.toMatchObject({ code: "23514", constraint: "workout_logs_rpe_check" })
        await expect(
          client.query(
            `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, enrollment_id, program_day_id, program_cycle, program_week, rpe)
             VALUES ($2, 'weights', 52, 3, $1, 'A', 1, 1, NULL)`,
            [enrollmentId, userId]
          )
        ).resolves.toBeTruthy()
      } finally {
        await client.end()
      }
    })

    test("a workout may belong to no program, but not to one that does not exist", async () => {
      // A loose workout — a class, an improvised session — is a first-class
      // case and always was; it is the whole "Anything else" tab. Pointing at
      // an enrollment that is not there is a different thing, and refused.
      //
      // REFUSED BY THE OWNERSHIP TRIGGER, NOT THE FOREIGN KEY. The trigger runs
      // BEFORE the row is written and finds no enrollment of yours with that id,
      // so the foreign key is never reached — a bare `toThrow()` here read as
      // proof of the key while the trigger did the refusing. The key itself is
      // pinned by `userDataCascades.integration.test.ts`.
      const userId = await createTestUser("orphan@example.com")
      const client = await getClient()
      try {
        await expect(
          client.query(
            `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity)
             VALUES ($1, 'weights', 52, 3)`,
            [userId]
          )
        ).resolves.toBeTruthy()
        await expect(
          client.query(
            `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, enrollment_id, program_day_id, program_cycle, program_week)
             VALUES ($1, 'weights', 52, 3, gen_random_uuid(), 'A', 1, 1)`,
            [userId]
          )
        ).rejects.toMatchObject({ code: "P0001", message: "A workout can only be attached to your own program" })
      } finally {
        await client.end()
      }
    })
  })
})


/**
 * THE SIX PROGRAM WRITES HAPPEN COMPLETELY, OR NOT AT ALL.
 *
 * WHAT IS BEING PROVEN, in plain language. Every button that moves a program
 * used to write two or three separate things with nothing holding them
 * together: the old program was switched off and then the new one inserted, a
 * session was deleted and then the weights recalculated, a write-up inserted a
 * workout and then its sets and then advanced the plan. Each of those pairs
 * could come apart, and when it did the app was left in a state nobody had
 * asked for — on no program at all, or with the weights of a session that no
 * longer exists.
 *
 * WHY HERE AND NOT IN THE UNIT SUITE. "Together or not at all" is a property of
 * a transaction, and only a real Postgres has one. A fake client can prove the
 * app sends ONE call (the unit tests do that); only this can prove that the
 * refused half takes the other half with it.
 */
describe("a program write is one statement", () => {
  beforeEach(async () => {
    await truncateAllTables()
  })

  async function sessionCount(id: string): Promise<number> {
    const [row] = await sql<{ n: number }>(
      `SELECT (cursor ->> 'sessionCount')::int AS n FROM program_enrollments WHERE id = $1`,
      [id]
    )
    return row!.n
  }

  /** A workout you are in the middle of: started, not ended. */
  async function openWorkout(userId: string, enrollmentId: string): Promise<string> {
    const [row] = await sql<{ id: string }>(
      `INSERT INTO workout_logs (user_id, session_type, enrollment_id, program_day_id,
                                 program_cycle, program_week, started_at, logged_at)
        VALUES ($1, 'weights', $2, 'A', 1, 1, now(), now()) RETURNING id`,
      [userId, enrollmentId]
    )
    return row!.id
  }

  test("ending a program with a workout open on it is refused, and the program stays running", async () => {
    const me = await createTestUser("end-busy@example.com")
    const running = await enroll(me)
    await openWorkout(me, running)

    await expect(sql(`SELECT end_enrollment($1)`, [running])).rejects.toThrow(
      /Finish or throw away the open workout first/
    )
    // The whole point: the refusal left it prescribing rather than half-ended.
    expect(await isActive(running)).toBe(true)
  })

  test("ending a program with nothing open on it stops it prescribing", async () => {
    const me = await createTestUser("end-free@example.com")
    const running = await enroll(me)

    await sql(`SELECT end_enrollment($1)`, [running])
    expect(await isActive(running)).toBe(false)
  })

  test("a start whose insert is refused leaves the program you were on running", async () => {
    const me = await createTestUser("start-refused@example.com")
    // Already on StrongLifts, and on a week of my own. Starting StrongLifts
    // again while the first one is still live is refused by
    // uq_program_enrollments_active — and the week of my own was the thing
    // being paused to make room.
    const strongLifts = await enroll(me, "stronglifts-5x5")
    const myOwnWeek = await enroll(me, "custom")

    await expect(
      sql(`SELECT start_enrollment($1::jsonb, $2::uuid[])`, [
        JSON.stringify({
          user_id: me,
          program_id: "stronglifts-5x5",
          level: "beginner",
          unit_system: "kg",
          exercise_state: {},
          initial_exercise_state: {},
          cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
        }),
        [myOwnWeek],
      ])
      // The unique index by name, not merely "something went wrong": a test
      // that accepts any error passes when the function does not exist at all.
    ).rejects.toThrow(/uq_program_enrollments_active/)

    expect(await isActive(myOwnWeek)).toBe(true)
    expect(await isActive(strongLifts)).toBe(true)
    const [row] = await sql<{ n: number }>(
      `SELECT count(*)::int AS n FROM program_enrollments WHERE user_id = $1`,
      [me]
    )
    expect(row!.n).toBe(2)
  })

  test("a start that goes through pauses what it displaced, in the same statement", async () => {
    const me = await createTestUser("start-ok@example.com")
    const myOwnWeek = await enroll(me, "custom")

    const [row] = await sql<{ start_enrollment: { id: string; is_active: boolean } }>(
      `SELECT start_enrollment($1::jsonb, $2::uuid[])`,
      [
        JSON.stringify({
          user_id: me,
          program_id: "stronglifts-5x5",
          level: "beginner",
          unit_system: "kg",
          exercise_state: { squat: { workingWeight: 60, consecutiveFails: 0 } },
          initial_exercise_state: { squat: { workingWeight: 60, consecutiveFails: 0 } },
          cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
          replay_events: [{ at: "2026-09-18T08:00:00.000Z", kind: "schedule", schedule: null, seeded: {} }],
        }),
        [myOwnWeek],
      ]
    )
    expect(row!.start_enrollment.is_active).toBe(true)
    expect(await isActive(myOwnWeek)).toBe(false)
    // The starting schedule is part of the history from the first moment.
    const [events] = await sql<{ kinds: string[] }>(
      `SELECT array_agg(e ->> 'kind') AS kinds
         FROM program_enrollments, jsonb_array_elements(replay_events) e
        WHERE program_enrollments.id = $1`,
      [row!.start_enrollment.id]
    )
    expect(events!.kinds).toEqual(["schedule"])
  })

  test("a start is refused while a workout is open on the program it would displace", async () => {
    const me = await createTestUser("start-busy@example.com")
    const myOwnWeek = await enroll(me, "custom")
    await openWorkout(me, myOwnWeek)

    await expect(
      sql(`SELECT start_enrollment($1::jsonb, $2::uuid[])`, [
        JSON.stringify({
          user_id: me,
          program_id: "stronglifts-5x5",
          level: "beginner",
          unit_system: "kg",
          exercise_state: {},
          initial_exercise_state: {},
          cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
        }),
        [myOwnWeek],
      ])
    ).rejects.toThrow(/Finish or throw away the open workout first/)

    expect(await isActive(myOwnWeek)).toBe(true)
    const [row] = await sql<{ n: number }>(
      `SELECT count(*)::int AS n FROM program_enrollments WHERE user_id = $1`,
      [me]
    )
    expect(row!.n).toBe(1)
  })

  test("removing a session and moving the weights is one statement — a stale session count is refused and the session stays", async () => {
    const me = await createTestUser("remove-stale@example.com")
    const running = await enroll(me)
    await logSessions(running, me, 2)
    await sql(
      `UPDATE program_enrollments SET cursor = jsonb_set(cursor, '{sessionCount}', '2') WHERE id = $1`,
      [running]
    )
    const [session] = await sql<{ id: string }>(
      `SELECT id FROM workout_logs WHERE enrollment_id = $1 LIMIT 1`,
      [running]
    )

    // The app counted five sessions when it worked the new weights out; the
    // program says two. That calculation is about a different history.
    await expect(
      sql(`SELECT remove_session_and_replay($1, $2, '{}'::jsonb, $3::jsonb, NULL, 5)`, [
        session!.id,
        running,
        JSON.stringify({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 1 }),
      ])
    ).rejects.toThrow(/moved on while this was being recalculated/)

    expect(await countSessions(running)).toBe(2)
    expect(await sessionCount(running)).toBe(2)

    // With the count it actually read, the session goes and the weights move
    // in the same breath.
    await sql(
      `SELECT remove_session_and_replay($1, $2, $3::jsonb, $4::jsonb, NULL, 2)`,
      [
        session!.id,
        running,
        JSON.stringify({ squat: { workingWeight: 62.5, consecutiveFails: 0 } }),
        JSON.stringify({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 1 }),
      ]
    )
    expect(await countSessions(running)).toBe(1)
    expect(await sessionCount(running)).toBe(1)
    const [state] = await sql<{ w: string }>(
      `SELECT exercise_state -> 'squat' ->> 'workingWeight' AS w
         FROM program_enrollments WHERE id = $1`,
      [running]
    )
    expect(Number(state!.w)).toBe(62.5)
  })

  test("a correction refused for a stale count leaves the old sets exactly as they were", async () => {
    const me = await createTestUser("correct-stale@example.com")
    const running = await enroll(me)
    await logSessions(running, me, 1)
    const [session] = await sql<{ id: string }>(
      `SELECT id FROM workout_logs WHERE enrollment_id = $1`,
      [running]
    )
    await sql(
      `INSERT INTO workout_sets (log_id, exercise, exercise_id, weight_kg, reps, set_number)
        VALUES ($1, 'Squat', 'squat', 60, 5, 1)`,
      [session!.id]
    )

    await expect(
      sql(`SELECT replace_sets_and_replay($1, $2::jsonb, $3, '{}'::jsonb, $4::jsonb, NULL, 9)`, [
        session!.id,
        JSON.stringify([
          { exercise: "Squat", exercise_id: "squat", weight_kg: 100, reps: 5, set_number: 1 },
        ]),
        running,
        JSON.stringify({ cycle: 1, week: 1, dayIndex: 1, sessionCount: 1 }),
      ])
    ).rejects.toThrow(/moved on while this was being recalculated/)

    const [kept] = await sql<{ n: number; w: string }>(
      `SELECT count(*)::int AS n, max(weight_kg)::text AS w FROM workout_sets WHERE log_id = $1`,
      [session!.id]
    )
    // The delete and the insert are in the same transaction as the refusal, so
    // the workout still holds exactly the set it held before.
    expect(kept!.n).toBe(1)
    expect(Number(kept!.w)).toBe(60)
  })

  test("a correction that SUCCEEDS keeps when each set was ticked and which slot it answered", async () => {
    /**
     * THE MIGRATION THIS FILE EXISTS TO PROVE (20260927120000).
     *
     * `replace_sets_and_replay` deletes every set and re-inserts the payload,
     * and its INSERT named twelve columns — `completed_at` and
     * `prescribed_index` were not among them — so both came back NULL on every
     * corrected row. `inWorkoutOrder` sorts on `completed_at` first and puts
     * rows without one LAST, so a corrected workout reverted to slot order
     * permanently: the instants are gone and cannot be rebuilt.
     *
     * The sibling test above drives the same function and cannot see this at
     * all, because it asserts the REFUSAL path — where nothing is inserted. The
     * claim is about what a successful insert keeps, so the test has to let one
     * succeed.
     *
     * Two sets deliberately out of slot order (set 2 ticked before set 1) so
     * "the timestamps survived" cannot pass by coincidence on a workout whose
     * slot order and performed order agree.
     */
    const me = await createTestUser("correct-keeps-order@example.com")
    const running = await enroll(me)
    await logSessions(running, me, 1)
    const [session] = await sql<{ id: string }>(
      `SELECT id FROM workout_logs WHERE enrollment_id = $1`,
      [running]
    )

    const corrected = [
      {
        exercise: "Squat",
        exercise_id: "squat",
        weight_kg: 100,
        reps: 5,
        set_number: 1,
        completed_at: "2026-09-27T02:52:09.000Z",
        prescribed_index: 0,
      },
      {
        exercise: "Squat",
        exercise_id: "squat",
        weight_kg: 100,
        reps: 5,
        set_number: 2,
        completed_at: "2026-09-27T02:44:38.187Z",
        prescribed_index: 1,
      },
    ]

    /**
     * 0, NOT 1. `logSessions` inserts `workout_logs` rows and never touches the
     * enrollment's cursor, so `sessionCount` is still the 0 that `enroll` set.
     * Passing 1 made the optimistic guard refuse — which is the sibling test's
     * assertion, not this one's, and it passed through this test as a thrown
     * error rather than a wrong answer.
     */
    await sql(`SELECT replace_sets_and_replay($1, $2::jsonb, $3, '{}'::jsonb, $4::jsonb, NULL, 0)`, [
      session!.id,
      JSON.stringify(corrected),
      running,
      JSON.stringify({ cycle: 1, week: 1, dayIndex: 1, sessionCount: 1 }),
    ])

    const rows = await sql<{ set_number: number; completed_at: string | null; prescribed_index: number | null }>(
      `SELECT set_number, completed_at, prescribed_index
         FROM workout_sets WHERE log_id = $1 ORDER BY set_number`,
      [session!.id]
    )

    expect(rows).toHaveLength(2)
    // NOT NULL is the whole point — this is what the old column list threw away.
    expect(rows.map((r) => r.completed_at)).not.toContain(null)
    expect(rows.map((r) => r.prescribed_index)).toEqual([0, 1])
    // And the instants are the ones sent, so the workout still reads in the
    // order it was performed: set 2 first, which is not its slot order.
    const byInstant = [...rows].sort((a, b) =>
      String(a.completed_at) < String(b.completed_at) ? -1 : 1
    )
    expect(byInstant.map((r) => r.set_number)).toEqual([2, 1])
  })

  test("the same write-up sent twice records one workout and advances the program once", async () => {
    const me = await createTestUser("retry-writeup@example.com")
    const running = await enroll(me)
    const workout = {
      user_id: me,
      session_type: "weights",
      duration_min: 52,
      intensity: 3,
      enrollment_id: running,
      program_day_id: "A",
      program_cycle: 1,
      program_week: 1,
      client_key: "phase1-retry-key",
    }
    const sets = [{ exercise: "Squat", exercise_id: "squat", weight_kg: 60, reps: 5, set_number: 1 }]
    const advanced = JSON.stringify({ cycle: 1, week: 1, dayIndex: 1, sessionCount: 1 })

    const [first] = await sql<{ log_session_and_advance: { workout_id: string; inserted: boolean } }>(
      `SELECT log_session_and_advance($1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, 0)`,
      [JSON.stringify(workout), JSON.stringify(sets), JSON.stringify({}), advanced]
    )
    expect(first!.log_session_and_advance.inserted).toBe(true)
    expect(await sessionCount(running)).toBe(1)

    // The retry. It answers with the workout that is already there and touches
    // nothing — note that it is sent with the SAME expected count of 0, which
    // no longer matches: a no-op must not be refused for being stale.
    const [second] = await sql<{ log_session_and_advance: { workout_id: string; inserted: boolean } }>(
      `SELECT log_session_and_advance($1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, 0)`,
      [JSON.stringify(workout), JSON.stringify(sets), JSON.stringify({}), advanced]
    )
    expect(second!.log_session_and_advance.inserted).toBe(false)
    expect(second!.log_session_and_advance.workout_id).toBe(first!.log_session_and_advance.workout_id)

    expect(await countSessions(running)).toBe(1)
    expect(await sessionCount(running)).toBe(1)
    const [setRows] = await sql<{ n: number }>(
      `SELECT count(*)::int AS n FROM workout_sets WHERE log_id = $1`,
      [first!.log_session_and_advance.workout_id]
    )
    expect(setRows!.n).toBe(1)
  })

  test("running a finished program again pauses what it displaces, in one statement", async () => {
    const me = await createTestUser("resume-one@example.com")
    const finished = await enroll(me, "custom", false)
    const running = await enroll(me, "stronglifts-5x5")

    const [row] = await sql<{ resume_enrollment: { id: string; is_active: boolean } }>(
      `SELECT resume_enrollment($1, $2::uuid[])`,
      [finished, [running]]
    )
    expect(row!.resume_enrollment.is_active).toBe(true)
    expect(await isActive(running)).toBe(false)

    // And a second attempt says so rather than reporting success.
    await expect(sql(`SELECT resume_enrollment($1, $2::uuid[])`, [finished, []])).rejects.toThrow(
      /already running/
    )
  })
})


/**
 * A PROGRAM CANNOT BE SWITCHED OFF WHILE A WORKOUT IS OPEN ON IT — WHOEVER WRITES.
 *
 * Merged from `programBusy.integration.test.ts` on 2026-10-13. The tests above
 * go through `end_enrollment` and `start_enrollment`; these go through a bare
 * `UPDATE … SET is_active = false`, which is what a script, the SQL editor or
 * anything holding the service key would send. What refuses it is the trigger
 * `refuse_to_pause_a_busy_program`, and a trigger only behaves like one when a
 * real Postgres runs it. The app's own check before it writes is proven in
 * `tests/unit/db/programRepoGuards.test.ts`; it leaves a gap of a few
 * milliseconds where a Start can cross an End, and the trigger closes it.
 *
 * ("Ending a program with nothing open on it works" was dropped in the merge
 * (D5): `end_enrollment` above asserts the same.)
 */
describe("a busy program refuses to be switched off, whoever writes", () => {
  const END_IT = `UPDATE program_enrollments SET is_active = false WHERE id = $1`

  beforeEach(async () => {
    await truncateAllTables()
  })

  test("ending a program is refused while a workout is open on it, and the program stays on", async () => {
    const me = await createTestUser("busy-program@example.com")
    const running = await enroll(me)
    // Every column the table's own rules require of a workout that is RUNNING:
    // a start and no ending, no length or intensity yet, `logged_at` equal to
    // the start, and the program day it is answering.
    await sql(
      `INSERT INTO workout_logs
         (user_id, session_type, started_at, logged_at, enrollment_id, program_day_id, program_cycle, program_week)
       VALUES ($1, 'weights', now(), now(), $2, 'dayA', 1, 1)`,
      [me, running]
    )

    // The sentence matters: it is the one the app shows, so a refusal that
    // reaches the screen through the database reads the same as one the app
    // caught itself.
    await expect(sql(END_IT, [running])).rejects.toMatchObject({
      code: "55000",
      message: "Finish or throw away the open workout first.",
    })
    expect(await isActive(running)).toBe(true)
  })

  test("a workout that is already finished does not block anything", async () => {
    const me = await createTestUser("busy-program@example.com")
    const running = await enroll(me)
    await sql(
      `INSERT INTO workout_logs
         (user_id, session_type, started_at, ended_at, logged_at, enrollment_id,
          program_day_id, program_cycle, program_week, duration_min, intensity)
       VALUES ($1, 'weights', now() - interval '1 hour', now(), now() - interval '1 hour', $2,
               'dayA', 1, 1, 60, 3)`,
      [me, running]
    )
    await sql(END_IT, [running])
    expect(await isActive(running)).toBe(false)
  })

  test("a workout typed in after the fact is not a workout you are in", async () => {
    // The after-the-fact writer stores no start time. "Exists and has not
    // ended" would therefore have blocked every program anybody had ever
    // written a past session against — which is why the trigger asks for a
    // start time rather than for an ending.
    const me = await createTestUser("busy-program@example.com")
    const running = await enroll(me)
    await sql(
      `INSERT INTO workout_logs
         (user_id, session_type, logged_at, enrollment_id, program_day_id, program_cycle, program_week,
          duration_min, intensity)
       VALUES ($1, 'weights', now(), $2, 'dayA', 1, 1, 45, 3)`,
      [me, running]
    )
    await sql(END_IT, [running])
    expect(await isActive(running)).toBe(false)
  })
})
