/**
 * The schema rules the one-record-per-workout change rests on.
 *
 * Like the other files here, these run raw SQL against the testcontainers
 * PostgreSQL rather than calling a repo — the container is plain Postgres with
 * no Supabase auth, so a repo function has no client to talk to. What can only
 * be proven here is the part no TypeScript test can reach: that the DATABASE
 * refuses the states the app must never produce, whoever is writing.
 *
 * Every test names the bug it prevents. Three of them replace a whole class:
 * a workout that is both running and finished, two workouts running at once,
 * and a retry that logs the same session twice.
 */

import { describe, test, expect, beforeEach } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

const CURSOR = JSON.stringify({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 })

/** One statement, one connection — the pattern the sibling files here use. */
async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getClient()
  try {
    const r = await client.query(text, params)
    return r.rows as T[]
  } finally {
    await client.end()
  }
}

async function enroll(userId: string): Promise<string> {
  const rows = await sql<{ id: string }>(
    `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, cursor)
     VALUES ($1, 'stronglifts-5x5', 'beginner', 'kg', $2::jsonb) RETURNING id`,
    [userId, CURSOR]
  )
  return rows[0].id
}

let userId: string
let otherUserId: string
let enrollmentId: string

beforeEach(async () => {
  await truncateAllTables()
  userId = await createTestUser("lifter@example.test")
  otherUserId = await createTestUser("someone-else@example.test")
  enrollmentId = await enroll(userId)
})

describe("the three states a workout can be in", () => {
  test("written up after the fact: no start, no end, duration and effort known", async () => {
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity)
         VALUES ($1, 'weights', 52, 3)`,
        [userId]
      )
    ).resolves.toBeTruthy()
  })

  test("running: a start, no end, and no duration yet", async () => {
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at)
         VALUES ($1, 'weights', now(), now())`,
        [userId]
      )
    ).resolves.toBeTruthy()
  })

  test("a running workout may NOT claim a duration it cannot know", async () => {
    // The invented "45 minutes at effort 3" this whole change exists to remove.
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at, duration_min, intensity)
         VALUES ($1, 'weights', now(), now(), 45, 3)`,
        [userId]
      )
    ).rejects.toThrow(/workout_logs_lifecycle/)
  })

  test("a finished workout may NOT be missing its duration", async () => {
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, started_at, ended_at, logged_at)
         VALUES ($1, 'weights', now(), now(), now())`,
        [userId]
      )
    ).rejects.toThrow(/workout_logs_lifecycle/)
  })

  test("a workout cannot end before it started", async () => {
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, started_at, ended_at, logged_at, duration_min, intensity)
         VALUES ($1, 'weights', now(), now() - interval '1 hour', now(), 52, 3)`,
        [userId]
      )
    ).rejects.toThrow(/workout_logs_ended_after_start/)
  })

  test("a live workout belongs to the day it started, so the calendar has one answer", async () => {
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at)
         VALUES ($1, 'weights', now(), now() - interval '2 days')`,
        [userId]
      )
    ).rejects.toThrow(/workout_logs_logged_is_start/)
  })
})

describe("one workout at a time, logged once", () => {
  test("a second workout cannot be started while one is running", async () => {
    // Otherwise "resume" has two answers and the finish screen has to guess.
    const start = `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at)
                   VALUES ($1, 'weights', now(), now())`
    await sql(start, [userId])
    await expect(sql(start, [userId])).rejects.toThrow(/uq_workout_logs_live/)
  })

  test("finishing the first one frees the slot", async () => {
    await sql(
      `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at)
       VALUES ($1, 'weights', now(), now())`,
      [userId]
    )
    await sql(
      `UPDATE workout_logs SET ended_at = now(), duration_min = 52, intensity = 3 WHERE user_id = $1`,
      [userId]
    )
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at)
         VALUES ($1, 'weights', now(), now())`,
        [userId]
      )
    ).resolves.toBeTruthy()
  })

  test("a retry with the same browser key cannot log the session twice", async () => {
    // THE BUG. A save that failed halfway left the weights advanced and said
    // nothing, so the next thing anybody did was press the button again.
    const insert = `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, client_key)
                    VALUES ($1, 'weights', 52, 3, 'browser-abc')`
    await sql(insert, [userId])
    await expect(sql(insert, [userId])).rejects.toThrow(/uq_workout_logs_client_key/)
  })

  test("two different people may use the same browser key", async () => {
    const insert = `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, client_key)
                    VALUES ($1, 'weights', 52, 3, 'browser-abc')`
    await sql(insert, [userId])
    await expect(sql(insert, [otherUserId])).resolves.toBeTruthy()
  })
})

describe("a workout's program", () => {
  test("program context is all present or absent", async () => {
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, enrollment_id)
         VALUES ($1, 'weights', 52, 3, $2)`,
        [userId, enrollmentId]
      )
    ).rejects.toThrow(/workout_logs_program_context/)
  })

  test("cannot be attached to somebody else's program", async () => {
    // A row policy sees the row you wrote, never the row you point at, so this
    // has to be a trigger. `.claude/rules/database.md`.
    await expect(
      sql(
        `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, enrollment_id, program_day_id, program_cycle, program_week)
         VALUES ($1, 'weights', 52, 3, $2, 'A', 1, 1)`,
        [otherUserId, enrollmentId]
      )
    ).rejects.toThrow(/only be attached to your own program/)
  })

  test("erasing the program keeps the workouts, and what day they were", async () => {
    // Q4: that you trained is not the program's fact to erase. The context
    // columns survive so History can still say "Workout A · cycle 1".
    await sql(
      `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity, enrollment_id, program_day_id, program_cycle, program_week)
       VALUES ($1, 'weights', 52, 3, $2, 'A', 3, 1)`,
      [userId, enrollmentId]
    )
    await sql(`DELETE FROM program_enrollments WHERE id = $1`, [enrollmentId])
    const rows = await sql<{ enrollment_id: string | null; program_day_id: string; program_cycle: number }>(
      `SELECT enrollment_id, program_day_id, program_cycle FROM workout_logs WHERE user_id = $1`,
      [userId]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].enrollment_id).toBeNull()
    expect(rows[0].program_day_id).toBe("A")
    expect(rows[0].program_cycle).toBe(3)
  })
})

describe("the sets in a workout", () => {
  let logId: string
  beforeEach(async () => {
    const rows = await sql<{ id: string }>(
      `INSERT INTO workout_logs (user_id, session_type, duration_min, intensity)
       VALUES ($1, 'weights', 52, 3) RETURNING id`,
      [userId]
    )
    logId = rows[0].id
  })

  type SetRow = {
    exercise: string
    exercise_id: string | null
    weight_kg: number
    reps: number
    set_number: number
    set_kind: string
    side: string | null
  }
  const addSet = (opts: Partial<SetRow> = {}) => {
    const row: SetRow = {
      exercise: "Squat",
      exercise_id: null,
      weight_kg: 60,
      reps: 5,
      set_number: 1,
      set_kind: "working",
      side: null,
      ...opts,
    }
    return sql(
      `INSERT INTO workout_sets (log_id, exercise, exercise_id, weight_kg, reps, set_number, set_kind, side)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [logId, row.exercise, row.exercise_id, row.weight_kg, row.reps, row.set_number, row.set_kind, row.side]
    )
  }

  test("zero reps is a real answer — attempted and failed", async () => {
    // It used to be `reps > 0`, so a cleared box crashed the save AFTER the
    // program had already advanced the weights, with nothing on screen.
    await expect(addSet({ reps: 0 })).resolves.toBeTruthy()
  })

  test("a warm-up and a working set can both be number one", async () => {
    await addSet({ set_kind: "warmup" })
    await expect(addSet({ set_kind: "working" })).resolves.toBeTruthy()
  })

  test("the same slot cannot be written twice", async () => {
    await addSet()
    await expect(addSet()).rejects.toThrow(/uq_workout_sets_slot/)
  })

  test("the same lift on the left and the right are two sets, not a clash", async () => {
    await addSet({ side: "left" })
    await expect(addSet({ side: "right" })).resolves.toBeTruthy()
  })

  test("deleting the workout takes its sets with it", async () => {
    await addSet()
    await sql(`DELETE FROM workout_logs WHERE id = $1`, [logId])
    const rows = await sql(`SELECT 1 FROM workout_sets WHERE log_id = $1`, [logId])
    expect(rows).toHaveLength(0)
  })

  test("a set can be corrected in place — the whole point of the merge", async () => {
    // `program_session_logs` had read, insert and delete policies and NO
    // update, so the app reported success and changed nothing. These rows have
    // always been updatable; the engine now reads them.
    await addSet({ reps: 5 })
    await sql(`UPDATE workout_sets SET reps = 3 WHERE log_id = $1`, [logId])
    const rows = await sql<{ reps: number }>(
      `SELECT reps FROM workout_sets WHERE log_id = $1`,
      [logId]
    )
    expect(rows[0].reps).toBe(3)
  })
})

describe("the second copy is gone", () => {
  test("program_session_logs no longer exists", async () => {
    const rows = await sql(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_session_logs'`
    )
    expect(rows).toHaveLength(0)
  })
})
