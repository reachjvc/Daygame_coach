/**
 * THE PROGRAM FORMAT'S DATABASE — Plans/program-builder.md, Phase 3.
 *
 * Migration 20261022100000 (half-step RPE, slot and set group on a set, a
 * running program's own spec, versions, programs people build) and
 * 20261022110000 (a program's calculated numbers are written only by the
 * app's program functions). Checked as the database itself answers, as a
 * signed-in user where row security and the guard apply, and through the
 * app's own repo functions where those are what a person triggers.
 */

import { describe, expect, it, vi } from "vitest"
import { actAs, asOwner, asUser, newUser } from "@/tests/db/harness"
import { changeEnrollmentUnit, enrollInProgram, resetEnrollment, skipSession } from "@/src/db/programRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const SPEC = {
  specVersion: 2,
  name: "Test week",
  unit: "kg",
  calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
  days: [{ id: "d1", label: "Day", slots: [] }],
}

/** A running StrongLifts, started the way the app starts one. */
async function startedProgram(label: string) {
  const user = await newUser(label)
  actAs(user)
  const { enrollment } = await enrollInProgram(user.id, { programId: "stronglifts-5x5", level: "intermediate", unitSystem: "kg" })
  return { user, id: enrollment.id }
}

describe("a program's calculated numbers are written only by the app's program functions", () => {
  it("refuses a signed-in user writing the working weights straight into the table", async () => {
    const { user, id } = await startedProgram("lock-state")
    await expect(
      asUser(user.id, (q) => q(`UPDATE program_enrollments SET exercise_state = '{"squat":{"workingWeight":500}}' WHERE id = $1`, [id]))
    ).rejects.toMatchObject({ code: "42501", message: expect.stringMatching(/worked out by the app/) })
    for (const column of ["cursor", "replay_events", "initial_exercise_state"]) {
      await expect(
        asUser(user.id, (q) => q(`UPDATE program_enrollments SET ${column} = '{}' WHERE id = $1`, [id])),
        column
      ).rejects.toMatchObject({ code: "42501" })
    }
    const [row] = await asOwner((q) => q(`SELECT exercise_state -> 'squat' ->> 'workingWeight' AS w FROM program_enrollments WHERE id = $1`, [id]))
    expect(row.w).toBe("60")
  })

  it("refuses a signed-in user inserting a program row with numbers of their own", async () => {
    const user = await newUser("lock-insert")
    await expect(
      asUser(user.id, (q) =>
        q(
          `INSERT INTO program_enrollments (user_id, program_id, level, unit_system, cursor, exercise_state)
           VALUES ($1, 'stronglifts-5x5', 'beginner', 'kg', '{"cycle":1,"week":1,"dayIndex":0,"sessionCount":0}', '{"squat":{"workingWeight":500}}')`,
          [user.id]
        )
      )
    ).rejects.toMatchObject({ code: "42501", message: expect.stringMatching(/started through the app/) })
  })

  it("still lets the user change what is theirs to change: the label, and ending the program", async () => {
    const { user, id } = await startedProgram("lock-label")
    await asUser(user.id, (q) => q(`UPDATE program_enrollments SET label = 'Mine' WHERE id = $1`, [id]))
    await asUser(user.id, (q) => q(`SELECT end_enrollment($1)`, [id]))
    const [row] = await asOwner((q) => q(`SELECT label, is_active FROM program_enrollments WHERE id = $1`, [id]))
    expect(row).toEqual({ label: "Mine", is_active: false })
  })

  it("does not stand in the way of the app: reset, skip and a change of unit all still land", async () => {
    const { user, id } = await startedProgram("lock-app")
    await skipSession(user.id, id)
    let [row] = await asOwner((q) => q(`SELECT cursor, replay_events FROM program_enrollments WHERE id = $1`, [id]))
    expect((row.cursor as { sessionCount: number }).sessionCount).toBe(1)
    expect((row.replay_events as { kind: string }[]).map((e) => e.kind)).toEqual(["skip"])

    await resetEnrollment(user.id, id)
    ;[row] = await asOwner((q) => q(`SELECT cursor FROM program_enrollments WHERE id = $1`, [id]))
    expect((row.cursor as { sessionCount: number }).sessionCount).toBe(0)

    const first = await changeEnrollmentUnit(user.id, id, "lb")
    const again = await changeEnrollmentUnit(user.id, id, "lb")
    expect([first.changed, again.changed]).toEqual([true, false])
    ;[row] = await asOwner((q) => q(`SELECT unit_system, exercise_state -> 'squat' ->> 'workingWeight' AS w FROM program_enrollments WHERE id = $1`, [id]))
    expect(row).toEqual({ unit_system: "lb", w: "130" })
  })

  it("save_program_state refuses a calculation made against a different history", async () => {
    const { user, id } = await startedProgram("lock-stale")
    await expect(
      asUser(user.id, (q) => q(`SELECT save_program_state($1, '{"cursor":{"cycle":1,"week":1,"dayIndex":1,"sessionCount":1}}', '{"sessionCount":5}')`, [id]))
    ).rejects.toMatchObject({ code: "55000" })
  })

  it("save_program_state cannot reach somebody else's program", async () => {
    const { id } = await startedProgram("lock-owner")
    const intruder = await newUser("lock-intruder")
    const [res] = await asUser(intruder.id, (q) => q(`SELECT save_program_state($1, '{"exercise_state":{}}') AS r`, [id]))
    expect(res.r).toBeNull()
    const [row] = await asOwner((q) => q(`SELECT exercise_state = '{}'::jsonb AS wiped FROM program_enrollments WHERE id = $1`, [id]))
    expect(row.wiped).toBe(false)
  })
})

describe("a running program's own copy of its program, and its versions", () => {
  it("starting with a spec records version 1; saving a new spec records version 2", async () => {
    const user = await newUser("versions")
    const [started] = await asUser(user.id, (q) =>
      q(
        `SELECT start_enrollment(jsonb_build_object(
           'user_id', $1::text, 'program_id', 'custom', 'level', 'intermediate', 'unit_system', 'kg',
           'exercise_state', '{}'::jsonb, 'initial_exercise_state', '{}'::jsonb,
           'cursor', '{"cycle":1,"week":1,"dayIndex":0,"sessionCount":0}'::jsonb,
           'spec', $2::jsonb, 'spec_version', 2, 'started_on', '2026-10-19', 'maxes', '{"bench":100}'::jsonb
         ), NULL) AS row`,
        [user.id, JSON.stringify(SPEC)]
      )
    )
    const id = (started.row as { id: string }).id
    expect(started.row).toMatchObject({ spec_version: 2, started_on: "2026-10-19", maxes: { bench: 100 } })

    await asUser(user.id, (q) => q(`SELECT save_program_state($1, jsonb_build_object('spec', $2::jsonb, 'spec_version', 2))`, [id, JSON.stringify({ ...SPEC, name: "Edited" })]))
    const versions = await asUser(user.id, (q) => q(`SELECT version, spec ->> 'name' AS name FROM program_versions WHERE enrollment_id = $1 ORDER BY version`, [id]))
    expect(versions).toEqual([
      { version: 1, name: "Test week" },
      { version: 2, name: "Edited" },
    ])
  })

  it("versions are append-only and private: no edits, no deletes, nobody else's", async () => {
    // Starting the program wrote version 1; the owner may add the next.
    const { user, id } = await startedProgram("versions-private")
    await asUser(user.id, (q) => q(`INSERT INTO program_versions (enrollment_id, user_id, version, spec, spec_version) VALUES ($1, $2, 2, $3, 2)`, [id, user.id, JSON.stringify(SPEC)]))
    const touched = await asUser(user.id, (q) => q(`UPDATE program_versions SET version = 9 WHERE enrollment_id = $1 RETURNING id`, [id]))
    expect(touched).toEqual([])
    const removed = await asUser(user.id, (q) => q(`DELETE FROM program_versions WHERE enrollment_id = $1 RETURNING id`, [id]))
    expect(removed).toEqual([])

    const intruder = await newUser("versions-intruder")
    expect(await asUser(intruder.id, (q) => q(`SELECT id FROM program_versions WHERE enrollment_id = $1`, [id]))).toEqual([])
    await expect(
      asUser(intruder.id, (q) => q(`INSERT INTO program_versions (enrollment_id, user_id, version, spec, spec_version) VALUES ($1, $2, 3, $3, 2)`, [id, intruder.id, JSON.stringify(SPEC)]))
    ).rejects.toMatchObject({ code: "42501" })
  })

  it("a stored spec over 64 KB is refused by the database itself", async () => {
    const user = await newUser("versions-size")
    const huge = { ...SPEC, blurb: "x".repeat(70_000) }
    await expect(
      asUser(user.id, (q) => q(`INSERT INTO user_programs (user_id, name, spec, spec_version) VALUES ($1, 'Big', $2, 2)`, [user.id, JSON.stringify(huge)]))
    ).rejects.toMatchObject({ code: "23514", constraint: "user_programs_spec_shape" })
  })
})

describe("programs people build themselves", () => {
  it("are their owner's alone", async () => {
    const owner = await newUser("own-program")
    const [made] = await asUser(owner.id, (q) => q(`INSERT INTO user_programs (user_id, name, spec, spec_version, starting_weights) VALUES ($1, 'Mine', $2, 2, '{"bench":60}') RETURNING id`, [owner.id, JSON.stringify(SPEC)]))
    await asUser(owner.id, (q) => q(`UPDATE user_programs SET name = 'Mine, renamed' WHERE id = $1`, [made.id]))

    const intruder = await newUser("own-program-intruder")
    expect(await asUser(intruder.id, (q) => q(`SELECT id FROM user_programs WHERE id = $1`, [made.id]))).toEqual([])
    expect(await asUser(intruder.id, (q) => q(`UPDATE user_programs SET name = 'Taken' WHERE id = $1 RETURNING id`, [made.id]))).toEqual([])
    await expect(
      asUser(intruder.id, (q) => q(`INSERT INTO user_programs (user_id, name, spec, spec_version) VALUES ($1, 'Planted', $2, 2)`, [owner.id, JSON.stringify(SPEC)]))
    ).rejects.toMatchObject({ code: "42501" })

    const [row] = await asOwner((q) => q(`SELECT name, updated_at > created_at AS touched FROM user_programs WHERE id = $1`, [made.id]))
    expect(row).toEqual({ name: "Mine, renamed", touched: true })
  })

  it("two programs of one person cannot share a name", async () => {
    const owner = await newUser("own-program-names")
    await asUser(owner.id, (q) => q(`INSERT INTO user_programs (user_id, name, spec, spec_version) VALUES ($1, 'Same', $2, 2)`, [owner.id, JSON.stringify(SPEC)]))
    await expect(
      asUser(owner.id, (q) => q(`INSERT INTO user_programs (user_id, name, spec, spec_version) VALUES ($1, 'Same', $2, 2)`, [owner.id, JSON.stringify(SPEC)]))
    ).rejects.toMatchObject({ code: "23505", constraint: "user_programs_user_id_name_key" })
  })
})

describe("a set in the new format", () => {
  async function openWorkout(label: string) {
    const user = await newUser(label)
    const [log] = await asOwner((q) => q(`INSERT INTO workout_logs (user_id, session_type, started_at, logged_at) VALUES ($1, 'weights', now(), now()) RETURNING id`, [user.id]))
    return { user, log: log.id as string }
  }

  it("keeps an RPE of 8.5, and refuses 8.3 and 11", async () => {
    const { user, log } = await openWorkout("rpe")
    const add = (rpe: number, n: number) =>
      asUser(user.id, (q) => q(`INSERT INTO workout_sets (log_id, exercise, weight_kg, reps, set_number, rpe) VALUES ($1, 'Bench Press', 100, 3, $2, $3) RETURNING rpe`, [log, n, rpe]))
    expect((await add(8.5, 1))[0].rpe).toBe("8.5")
    await expect(add(8.3, 2)).rejects.toMatchObject({ code: "23514", constraint: "workout_sets_rpe_range" })
    await expect(add(11, 3)).rejects.toMatchObject({ code: "23514", constraint: "workout_sets_rpe_range" })
    await asUser(user.id, (q) => q(`UPDATE workout_logs SET rpe = 7.5 WHERE id = $1`, [log]))
    await expect(asUser(user.id, (q) => q(`UPDATE workout_logs SET rpe = 7.25 WHERE id = $1`, [log]))).rejects.toMatchObject({ constraint: "workout_logs_rpe_range" })
  })

  it("says which slot and set group it answered, and may be a top set", async () => {
    const { user, log } = await openWorkout("slot")
    const [set] = await asUser(user.id, (q) =>
      q(`INSERT INTO workout_sets (log_id, exercise, weight_kg, reps, set_number, set_kind, slot_id, set_group_id) VALUES ($1, 'Bench Press', 100, 3, 1, 'top', 'mon_bench', 'top') RETURNING set_kind, slot_id, set_group_id`, [log])
    )
    expect(set).toEqual({ set_kind: "top", slot_id: "mon_bench", set_group_id: "top" })
    await expect(
      asUser(user.id, (q) => q(`INSERT INTO workout_sets (log_id, exercise, weight_kg, reps, set_number, set_kind) VALUES ($1, 'Bench Press', 100, 3, 2, 'heavy')`, [log]))
    ).rejects.toMatchObject({ code: "23514", constraint: "workout_sets_kind" })
  })

  it("finishing a workout takes a session RPE in half steps", async () => {
    const { user, log } = await openWorkout("finish-rpe")
    await asUser(user.id, (q) =>
      q(`SELECT finish_program_workout($1, now(), 45, 3::smallint, 8.5, NULL, NULL, NULL, NULL, 0, NULL, NULL)`, [log])
    )
    const [row] = await asOwner((q) => q(`SELECT rpe FROM workout_logs WHERE id = $1`, [log]))
    expect(row.rpe).toBe("8.5")
  })
})
