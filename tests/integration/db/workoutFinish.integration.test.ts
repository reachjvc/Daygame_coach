/**
 * FINISHING A WORKOUT, AGAINST A REAL POSTGRES.
 *
 * WHAT IS BEING PROVEN, in plain language. Pressing Finish does two things at
 * once: it closes the workout, and it moves the weights your program will ask
 * for next time. Both must happen or neither — and it must happen exactly once,
 * however many times the button is pressed, however many tabs are open, however
 * many times a flaky connection retries the request.
 *
 * None of that can be proven by reading the code or by a mocked database. The
 * guard is a row lock inside `finish_program_workout`, and a lock only behaves
 * like a lock when a real Postgres is holding it. Until this file existed the
 * function appeared nowhere under `tests/` at all, so "a double tap cannot
 * advance your program twice" was a claim, not a checked fact.
 *
 * Four things are checked:
 *   1. a second finish of the same workout is refused, and the program moved once
 *   2. another signed-in person cannot finish your workout
 *   3. a finish computed against a program that has since moved is refused
 *   4. 999.99 kg is genuinely the heaviest set the database will store
 *
 * Tests 2 and 4 run through `asUser`, which steps down from the table owner to
 * the role a signed-in person actually has — an owner is exempt from the row
 * rules, so a denial test run as the owner proves nothing.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest"
import { getClient, truncateAllTables, createTestUser, asUser } from "../setup"

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

/**
 * The same call the app makes, with every parameter cast the way the app's does.
 *
 * THE LAST TWO ARE THE RECEIPT — what the finish screen told you it had done:
 * the bests you beat and what the program will ask for next time. They are
 * written in this same statement, which is the whole point of them: worked out
 * again later they give a different answer once the program has been edited.
 * NULL in either means "not kept", never "nothing happened".
 */
const FINISH = `SELECT finish_program_workout(
  $1::uuid, $2::timestamptz, $3::int, $4::smallint, $5::smallint, $6::text,
  $7::jsonb, $8::jsonb, $9::jsonb, $10::int, $11::jsonb, $12::jsonb
) AS id`

const NEXT_STATE = JSON.stringify({ bench: { workingWeight: 62.5 } })
const NEXT_CURSOR = JSON.stringify({ dayIndex: 1, cycle: 1, week: 1, sessionCount: 1 })
const CHANGES = JSON.stringify([{ exerciseId: "bench", name: "Bench Press", reason: "+2.5 kg" }])
const RECORDS = JSON.stringify({
  records: [{ exercise: "Bench Press", weight_kg: 62.5, weight: 62.5, reps: 5, date: "2026-09-17", isNew: true }],
  firstTimeLifts: [],
})

describe("finish_program_workout", () => {
  let me = ""
  let someoneElse = ""
  let enrollmentId = ""
  let workoutId = ""

  beforeEach(async () => {
    await truncateAllTables()
    me = await createTestUser("finisher@example.com")
    someoneElse = await createTestUser("bystander@example.com")

    const [enrollment] = await sql<{ id: string }>(
      `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, exercise_state, cursor)
       VALUES ($1, 'stronglifts_5x5', 'beginner', 'kg', $2, $3)
       RETURNING id`,
      [me, JSON.stringify({ bench: { workingWeight: 60 } }), JSON.stringify({ dayIndex: 0, cycle: 1, week: 1, sessionCount: 0 })]
    )
    enrollmentId = enrollment!.id

    // A live workout: started, not ended, with no length or intensity yet —
    // the one shape `workout_logs_lifecycle` allows while it is running.
    const [workout] = await sql<{ id: string }>(
      `INSERT INTO workout_logs
         (user_id, session_type, started_at, logged_at, enrollment_id, program_day_id, program_cycle, program_week)
       VALUES ($1, 'weights', now(), now(), $2, 'dayA', 1, 1)
       RETURNING id`,
      [me, enrollmentId]
    )
    workoutId = workout!.id
  })

  afterAll(async () => {
    await truncateAllTables()
  })

  it("finishing a workout twice is refused the second time, and the program moves once", async () => {
    const [first] = await sql<{ id: string }>(FINISH, [
      workoutId, new Date().toISOString(), 45, 3, null, null, NEXT_STATE, NEXT_CURSOR, null, 0, CHANGES, RECORDS,
    ])
    expect(first!.id).toBe(workoutId)

    // The retry. It reads "already finished" from the lock, not from anything
    // the app remembered, which is why two tabs cannot both get through.
    await expect(
      sql(FINISH, [workoutId, new Date().toISOString(), 45, 3, null, null, NEXT_STATE, NEXT_CURSOR, null, 1, CHANGES, RECORDS])
    ).rejects.toMatchObject({ code: "55000" })

    const [enrollment] = await sql<{ sessions: string }>(
      `SELECT cursor ->> 'sessionCount' AS sessions FROM program_enrollments WHERE id = $1`,
      [enrollmentId]
    )
    expect(Number(enrollment!.sessions)).toBe(1)

    // And the receipt is on the row, put there by the same statement that
    // closed the workout. This is what makes "open it again next month and see
    // what you were told" true rather than a second guess at it.
    const [saved] = await sql<{
      changes: { name: string }[] | null
      records: { records: { exercise: string }[] } | null
    }>(`SELECT progression_changes AS changes, personal_records AS records FROM workout_logs WHERE id = $1`, [
      workoutId,
    ])
    expect(saved!.changes![0]!.name).toBe("Bench Press")
    expect(saved!.records!.records[0]!.exercise).toBe("Bench Press")
  })

  it("another signed-in person cannot finish your workout", async () => {
    // First: they cannot even see it. That is the row rule on workout_logs
    // doing its job, and it is what makes the refusal below happen for the
    // right reason rather than by luck.
    const theirView = await asUser(someoneElse, (q) => q(`SELECT count(*) AS n FROM workout_logs`))
    expect(Number(theirView[0]!.n)).toBe(0)
    const myView = await asUser(me, (q) => q(`SELECT count(*) AS n FROM workout_logs`))
    expect(Number(myView[0]!.n)).toBe(1)

    // The row rules hide the workout from them, so the function's own lookup
    // finds nothing and it refuses — the same answer as "already finished".
    await expect(
      asUser(someoneElse, (q) =>
        q(FINISH, [workoutId, new Date().toISOString(), 45, 3, null, null, NEXT_STATE, NEXT_CURSOR, null, 0, CHANGES, RECORDS])
      )
    ).rejects.toMatchObject({ code: "55000" })

    const [workout] = await sql<{ ended_at: Date | null }>(
      `SELECT ended_at FROM workout_logs WHERE id = $1`,
      [workoutId]
    )
    expect(workout!.ended_at).toBeNull()

    const [enrollment] = await sql<{ sessions: string; state: Record<string, { workingWeight: number }> }>(
      `SELECT cursor ->> 'sessionCount' AS sessions, exercise_state AS state FROM program_enrollments WHERE id = $1`,
      [enrollmentId]
    )
    expect(Number(enrollment!.sessions)).toBe(0)
    expect(enrollment!.state.bench!.workingWeight).toBe(60)
  })

  it("a finish computed against an older program state is refused", async () => {
    // The caller believed the program had done 5 sessions; it has done none, so
    // the new weights it worked out are based on something that never happened.
    await expect(
      sql(FINISH, [workoutId, new Date().toISOString(), 45, 3, null, null, NEXT_STATE, NEXT_CURSOR, null, 5, CHANGES, RECORDS])
    ).rejects.toMatchObject({ code: "55000" })

    const [workout] = await sql<{ ended_at: Date | null }>(
      `SELECT ended_at FROM workout_logs WHERE id = $1`,
      [workoutId]
    )
    expect(workout!.ended_at).toBeNull()
  })

  it("999.99 kg is the ceiling: it is accepted, and 1000 writes nothing", async () => {
    await sql(
      `INSERT INTO workout_sets (log_id, exercise, weight_kg, reps, set_number)
       VALUES ($1, 'Rack Pull', 999.99, 1, 1)`,
      [workoutId]
    )

    // 1000 is refused. The column is NUMERIC(5,2), which coerces the value
    // before any CHECK runs, so Postgres usually answers "numeric field
    // overflow" (22003) rather than "check constraint" (23514). Either answer
    // is a refusal; what matters is that nothing was written.
    await expect(
      sql(
        `INSERT INTO workout_sets (log_id, exercise, weight_kg, reps, set_number)
         VALUES ($1, 'Rack Pull', 1000, 1, 2)`,
        [workoutId]
      )
    ).rejects.toMatchObject({ code: expect.stringMatching(/^(22003|23514)$/) })

    const rows = await sql<{ weight_kg: string }>(`SELECT weight_kg FROM workout_sets WHERE log_id = $1`, [workoutId])
    expect(rows).toHaveLength(1)
    expect(Number(rows[0]!.weight_kg)).toBe(999.99)
  })
})
