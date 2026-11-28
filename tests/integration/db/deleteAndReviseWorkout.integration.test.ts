/**
 * DELETING OR CORRECTING A FINISHED WORKOUT IS ONE STEP, AGAINST A REAL POSTGRES.
 *
 * WHAT IS BEING PROVEN, in plain words. Deleting (or correcting) a finished
 * session that belongs to a program has two halves: the session changes, and
 * the program's weights are put back to what they were without it. Both halves
 * must land together or neither may. These tests call the two database
 * functions as a signed-in person, the way the app will, through the same
 * route the app uses (PostgREST), so row security and the program-numbers
 * guard (`program_numbers_only_by_the_app`) are in force as in production.
 *
 * Every test makes its own user and counts only that user's rows.
 * 55000 is Postgres's "object not in the right state": the refusal these two
 * functions use for "gone", "still open" and "the program moved on".
 */
import { createClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import { asOwner, newUser, stackEnv, type TestUser } from "@/tests/db/harness"

const START_STATE = { bench: { workingWeight: 60 } }
const START_CURSOR = { dayIndex: 0, cycle: 1, week: 1, sessionCount: 3 }
const BACKED_STATE = { bench: { workingWeight: 57.5 } }
const BACKED_CURSOR = { dayIndex: 0, cycle: 1, week: 1, sessionCount: 2 }

interface Arranged {
  user: TestUser
  enrollmentId: string
  workoutId: string
}

/** A user, a program at three finished sessions, and one finished session on it with two sets. */
async function aFinishedProgramWorkout(label: string): Promise<Arranged> {
  const user = await newUser(label)
  return asOwner(async (q) => {
    const [enrollment] = await q(
      `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, exercise_state, cursor)
       VALUES ($1, 'stronglifts_5x5', 'beginner', 'kg', $2, $3) RETURNING id`,
      [user.id, JSON.stringify(START_STATE), JSON.stringify(START_CURSOR)]
    )
    const [workout] = await q(
      `INSERT INTO workout_logs
         (user_id, session_type, started_at, logged_at, ended_at, duration_min, intensity,
          enrollment_id, program_day_id, program_cycle, program_week)
       VALUES ($1, 'weights', '2026-11-01T10:00:00Z', '2026-11-01T10:00:00Z', '2026-11-01T11:00:00Z', 60, 3,
               $2, 'dayA', 1, 1) RETURNING id`,
      [user.id, enrollment!.id]
    )
    await q(
      `INSERT INTO workout_sets (log_id, exercise, exercise_id, weight_kg, reps, set_number)
       VALUES ($1, 'Bench Press', 'bench', 60, 5, 1), ($1, 'Bench Press', 'bench', 60, 5, 2)`,
      [workout!.id]
    )
    return { user, enrollmentId: String(enrollment!.id), workoutId: String(workout!.id) }
  })
}

async function workoutCount(workoutId: string): Promise<number> {
  const [row] = await asOwner((q) => q(`SELECT count(*)::int AS n FROM workout_logs WHERE id = $1`, [workoutId]))
  return Number(row!.n)
}

async function setsOf(workoutId: string) {
  return asOwner((q) =>
    q(
      `SELECT exercise, weight_kg::float AS weight_kg, reps, set_number, completed_at, prescribed_index
       FROM workout_sets WHERE log_id = $1 ORDER BY set_number`,
      [workoutId]
    )
  )
}

async function programOf(enrollmentId: string) {
  const [row] = await asOwner((q) =>
    q(`SELECT exercise_state, cursor FROM program_enrollments WHERE id = $1`, [enrollmentId])
  )
  return row!
}

const deleteArgs = (a: Arranged, over: Record<string, unknown> = {}) => ({
  p_workout_id: a.workoutId,
  p_exercise_state: BACKED_STATE,
  p_cursor: BACKED_CURSOR,
  p_expected_session_count: 3,
  ...over,
})

const reviseArgs = (a: Arranged, over: Record<string, unknown> = {}) => ({
  p_workout_id: a.workoutId,
  p_sets: [{ exercise: "Bench Press", exercise_id: "bench", weight_kg: 65, reps: 3, set_number: 1 }],
  p_exercise_state: BACKED_STATE,
  p_cursor: BACKED_CURSOR,
  p_expected_session_count: 3,
  ...over,
})

describe("delete_program_workout", () => {
  it("removes the finished workout and its sets", async () => {
    const a = await aFinishedProgramWorkout("del-removes")
    const { error } = await a.user.client.rpc("delete_program_workout", deleteArgs(a))
    expect(error).toBeNull()
    expect(await workoutCount(a.workoutId)).toBe(0)
    expect(await setsOf(a.workoutId)).toEqual([])
  })

  it("puts the program's weights and position back in the same call", async () => {
    const a = await aFinishedProgramWorkout("del-program")
    const { error } = await a.user.client.rpc("delete_program_workout", deleteArgs(a))
    expect(error).toBeNull()
    expect(await programOf(a.enrollmentId)).toMatchObject({ exercise_state: BACKED_STATE, cursor: BACKED_CURSOR })
  })

  it("deletes a workout with no program and leaves every program alone", async () => {
    const a = await aFinishedProgramWorkout("del-loose")
    await asOwner((q) => q(`UPDATE workout_logs SET enrollment_id = NULL, program_day_id = NULL, program_cycle = NULL, program_week = NULL WHERE id = $1`, [a.workoutId]))
    const { error } = await a.user.client.rpc(
      "delete_program_workout",
      deleteArgs(a, { p_exercise_state: null, p_cursor: null, p_expected_session_count: null })
    )
    expect(error).toBeNull()
    expect(await workoutCount(a.workoutId)).toBe(0)
    expect(await programOf(a.enrollmentId)).toMatchObject({ exercise_state: START_STATE, cursor: START_CURSOR })
  })

  it("refuses when the program moved on, and then deletes nothing", async () => {
    const a = await aFinishedProgramWorkout("del-stale")
    const { error } = await a.user.client.rpc("delete_program_workout", deleteArgs(a, { p_expected_session_count: 2 }))
    expect(error?.code).toBe("55000")
    expect(await workoutCount(a.workoutId)).toBe(1)
    expect(await programOf(a.enrollmentId)).toMatchObject({ exercise_state: START_STATE, cursor: START_CURSOR })
  })

  it("refuses a workout that is still open", async () => {
    const a = await aFinishedProgramWorkout("del-open")
    const [open] = await asOwner((q) =>
      q(
        `INSERT INTO workout_logs (user_id, session_type, started_at, logged_at)
         VALUES ($1, 'weights', '2026-11-02T10:00:00Z', '2026-11-02T10:00:00Z') RETURNING id`,
        [a.user.id]
      )
    )
    const { error } = await a.user.client.rpc("delete_program_workout", deleteArgs(a, { p_workout_id: open!.id, p_exercise_state: null, p_cursor: null }))
    expect(error?.code).toBe("55000")
    expect(await workoutCount(String(open!.id))).toBe(1)
  })

  it("refuses somebody else's workout, and it stays", async () => {
    const mine = await aFinishedProgramWorkout("del-owner")
    const stranger = await newUser("del-stranger")
    const { error } = await stranger.client.rpc("delete_program_workout", deleteArgs(mine))
    expect(error?.code).toBe("55000")
    expect(await workoutCount(mine.workoutId)).toBe(1)
    expect(await programOf(mine.enrollmentId)).toMatchObject({ exercise_state: START_STATE })
  })

  it("is not callable without signing in", async () => {
    const a = await aFinishedProgramWorkout("del-anon")
    const env = stackEnv()
    const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await anon.rpc("delete_program_workout", deleteArgs(a))
    expect(error?.code).toBe("42501")
    expect(await workoutCount(a.workoutId)).toBe(1)
  })
})

describe("revise_program_workout", () => {
  it("replaces the sets with exactly the list it was given", async () => {
    const a = await aFinishedProgramWorkout("rev-replaces")
    const { error } = await a.user.client.rpc("revise_program_workout", reviseArgs(a))
    expect(error).toBeNull()
    expect(await setsOf(a.workoutId)).toMatchObject([{ exercise: "Bench Press", weight_kg: 65, reps: 3, set_number: 1 }])
  })

  it("puts the program's weights and position back in the same call", async () => {
    const a = await aFinishedProgramWorkout("rev-program")
    const { error } = await a.user.client.rpc("revise_program_workout", reviseArgs(a))
    expect(error).toBeNull()
    expect(await programOf(a.enrollmentId)).toMatchObject({ exercise_state: BACKED_STATE, cursor: BACKED_CURSOR })
  })

  it("keeps when each set was ticked and which prescribed slot it was", async () => {
    const a = await aFinishedProgramWorkout("rev-order")
    const ticked = "2026-11-01T10:12:00.000Z"
    const { error } = await a.user.client.rpc(
      "revise_program_workout",
      reviseArgs(a, {
        p_sets: [{ exercise: "Bench Press", exercise_id: "bench", weight_kg: 60, reps: 5, set_number: 1, completed_at: ticked, prescribed_index: 0 }],
      })
    )
    expect(error).toBeNull()
    const [set] = await setsOf(a.workoutId)
    expect(new Date(set!.completed_at as string).toISOString()).toBe(ticked)
    expect(set!.prescribed_index).toBe(0)
  })

  it("refuses when the program moved on, and keeps the old sets", async () => {
    const a = await aFinishedProgramWorkout("rev-stale")
    const { error } = await a.user.client.rpc("revise_program_workout", reviseArgs(a, { p_expected_session_count: 2 }))
    expect(error?.code).toBe("55000")
    expect(await setsOf(a.workoutId)).toMatchObject([{ weight_kg: 60, reps: 5 }, { weight_kg: 60, reps: 5 }])
    expect(await programOf(a.enrollmentId)).toMatchObject({ exercise_state: START_STATE, cursor: START_CURSOR })
  })

  it("refuses somebody else's workout, and its sets stay", async () => {
    const mine = await aFinishedProgramWorkout("rev-owner")
    const stranger = await newUser("rev-stranger")
    const { error } = await stranger.client.rpc("revise_program_workout", reviseArgs(mine))
    expect(error?.code).toBe("55000")
    expect(await setsOf(mine.workoutId)).toHaveLength(2)
  })

  it("is not callable without signing in", async () => {
    const a = await aFinishedProgramWorkout("rev-anon")
    const env = stackEnv()
    const anon = createClient(env.API_URL, env.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await anon.rpc("revise_program_workout", reviseArgs(a))
    expect(error?.code).toBe("42501")
    expect(await setsOf(a.workoutId)).toHaveLength(2)
  })
})
