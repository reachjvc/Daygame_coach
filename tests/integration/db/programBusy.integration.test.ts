/**
 * A PROGRAM CANNOT BE SWITCHED OFF WHILE A WORKOUT IS OPEN ON IT.
 *
 * WHAT IS BEING PROVEN, in plain language. "End program", and starting a
 * different program of the same kind (which pauses the old one to make room),
 * both used to just switch the old program off. If you were mid-workout on it,
 * that workout then finished onto a plan nobody is shown any more: its weights
 * moved, invisibly, for something you had just ended — and the new program sat
 * at week 1 as though you had never trained.
 *
 * WHY IT IS HERE AND NOT IN THE UNIT SUITE. The app checks before it writes,
 * and `tests/unit/db/programRepoGuards.test.ts` proves that check. But a check
 * followed by a write has a gap of a few milliseconds where a Start can cross
 * an End, and there is no check at all for a script, the SQL editor or anything
 * holding the service key. The thing that actually holds for everybody is the
 * database trigger, and a trigger only behaves like a trigger when a real
 * Postgres is running it — so without this file the trigger was applied to
 * production with nothing anywhere proving it fires, or that it lets the
 * ordinary cases through.
 *
 * Four things are checked:
 *   1. ending a program with a workout open on it is refused, and it stays on
 *   2. ending a program with no workout open on it works
 *   3. a workout that is already finished does not block anything
 *   4. a workout typed in after the fact — no start time — is not "open"
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { getClient, truncateAllTables, createTestUser } from "../setup"

/** One statement, one connection — the pattern the sibling files here use. */
async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getClient()
  try {
    const res = await client.query(text, params)
    return res.rows as T[]
  } finally {
    await client.end()
  }
}

const END_IT = `UPDATE program_enrollments SET is_active = false WHERE id = $1`

async function isActive(id: string): Promise<boolean> {
  const [row] = await sql<{ is_active: boolean }>(
    `SELECT is_active FROM program_enrollments WHERE id = $1`,
    [id]
  )
  return row!.is_active
}

describe("a busy program refuses to be switched off", () => {
  let me = ""
  let enrollmentId = ""

  beforeEach(async () => {
    await truncateAllTables()
    me = await createTestUser("busy-program@example.com")
    const [enrollment] = await sql<{ id: string }>(
      `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, exercise_state, cursor)
       VALUES ($1, 'stronglifts_5x5', 'beginner', 'kg', $2, $3)
       RETURNING id`,
      [
        me,
        JSON.stringify({ bench: { workingWeight: 60 } }),
        JSON.stringify({ dayIndex: 0, cycle: 1, week: 1, sessionCount: 0 }),
      ]
    )
    enrollmentId = enrollment!.id
  })

  afterAll(async () => {
    await truncateAllTables()
  })

  it("ending a program is refused while a workout is open on it, and the program stays on", async () => {
    // Every column the table's own rules require of a workout that is RUNNING:
    // a start and no ending, no length or intensity yet, `logged_at` equal to
    // the start, and the program day it is answering.
    await sql(
      `INSERT INTO workout_logs
         (user_id, session_type, started_at, logged_at, enrollment_id, program_day_id, program_cycle, program_week)
       VALUES ($1, 'weights', now(), now(), $2, 'dayA', 1, 1)`,
      [me, enrollmentId]
    )

    // The sentence matters: it is the one the app shows, so a refusal that
    // reaches the screen through the database reads the same as one the app
    // caught itself.
    await expect(sql(END_IT, [enrollmentId])).rejects.toMatchObject({
      code: "55000",
      message: "Finish or throw away the open workout first.",
    })
    expect(await isActive(enrollmentId)).toBe(true)
  })

  it("ending a program with nothing open on it works", async () => {
    await sql(END_IT, [enrollmentId])
    expect(await isActive(enrollmentId)).toBe(false)
  })

  it("a workout that is already finished does not block anything", async () => {
    await sql(
      `INSERT INTO workout_logs
         (user_id, session_type, started_at, ended_at, logged_at, enrollment_id,
          program_day_id, program_cycle, program_week, duration_min, intensity)
       VALUES ($1, 'weights', now() - interval '1 hour', now(), now() - interval '1 hour', $2,
               'dayA', 1, 1, 60, 3)`,
      [me, enrollmentId]
    )
    await sql(END_IT, [enrollmentId])
    expect(await isActive(enrollmentId)).toBe(false)
  })

  it("a workout typed in after the fact is not a workout you are in", async () => {
    // The after-the-fact writer stores no start time. "Exists and has not
    // ended" would therefore have blocked every program anybody had ever
    // written a past session against — which is why the trigger asks for a
    // start time rather than for an ending.
    await sql(
      `INSERT INTO workout_logs
         (user_id, session_type, logged_at, enrollment_id, program_day_id, program_cycle, program_week,
          duration_min, intensity)
       VALUES ($1, 'weights', now(), $2, 'dayA', 1, 1, 45, 3)`,
      [me, enrollmentId]
    )
    await sql(END_IT, [enrollmentId])
    expect(await isActive(enrollmentId)).toBe(false)
  })
})
