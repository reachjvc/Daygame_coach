/**
 * A RUNNING PROGRAM'S WRITES, THROUGH THE REPO, AGAINST THE REAL SCHEMA.
 *
 * Starting, restarting, resuming, ending, erasing, editing and skipping a
 * program are what decide which weights the owner is asked to lift next. Each
 * function here is called as the app calls it, as a signed-in user with real
 * row security, and checked three ways:
 *
 *   1. the enrollment row holds every field the function sets (and the ones it
 *      must not touch are as they were);
 *   2. another account's enrollment, made first, is byte-identical afterwards;
 *   3. an end, a reset or an erase changes the target row and nothing else.
 *
 * "Filter alone" runs the call with the server's key, which row security does
 * not apply to, so the repo's own `user_id` filter is the only fence.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, admin, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import {
  deleteEnrollmentPermanently,
  enrollInProgram,
  ensureEnrollment,
  resetEnrollment,
  resumeEnrollment,
  reviseSessionLog,
  skipSession,
  unenroll,
  updateEnrollmentSchedule,
} from "@/src/db/programRepo"
import { finishWorkout, startWorkout } from "@/src/db/workoutRepo"
import { getProgram } from "@/src/programs/data/catalog"
import type { ProgramSchedule } from "@/src/programs/types"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

function actWithoutRowSecurity(user: TestUser): void {
  actAs({ ...user, client: admin() })
}

type Row = Record<string, unknown>

async function enrollmentRow(id: string): Promise<Row | undefined> {
  const [row] = await asOwner((q) => q("select * from program_enrollments where id = $1", [id]))
  return row
}

async function enrollmentText(id: string): Promise<string | undefined> {
  const [row] = await asOwner((q) => q("select t::text as r from program_enrollments t where id = $1", [id]))
  return row ? String(row.r) : undefined
}

/** A second account with a running program of its own, made first; what must survive byte for byte. */
async function aBystander(label: string) {
  const other = await newUser(label)
  actAs(other)
  const { enrollment } = await enrollInProgram(other.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
  return { other, id: enrollment.id, before: await enrollmentText(enrollment.id) }
}

async function aSession(userId: string, enrollmentId: string): Promise<string> {
  const workout = await startWorkout(userId, { enrollmentId, clientKey: `k-${randomUUID()}` })
  await finishWorkout(userId, workout.id, { intensity: 3 })
  return workout.id
}

describe("enrollInProgram", () => {
  it("writes the whole enrollment row: program, level, unit, seeds, cursor, name, bar, start day, maxes", async () => {
    const { other, id: theirs, before } = await aBystander("pr-en-other")
    void other
    const me = await newUser("pr-en-mine")
    actAs(me)

    const { enrollment, displaced } = await enrollInProgram(me.id, {
      programId: "stronglifts-5x5",
      level: "intermediate",
      unitSystem: "lb",
      barWeightKg: 15,
      label: "My squat block",
      startedOn: "2026-10-05",
      oneRepMaxes: { squat: 140 },
    })

    expect(displaced).toEqual([])
    const row = (await enrollmentRow(enrollment.id))!
    expect(row).toMatchObject({
      user_id: me.id,
      program_id: "stronglifts-5x5",
      level: "intermediate",
      unit_system: "lb",
      is_active: true,
      custom_schedule: null,
      label: "My squat block",
      cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
      maxes: { squat: 140 },
    })
    expect(Number(row.bar_weight_kg)).toBe(15)
    expect(String(row.started_on)).toContain("2026")
    expect(Object.keys(row.exercise_state as object).length).toBeGreaterThan(0)
    expect(row.initial_exercise_state).toEqual(row.exercise_state)
    expect(row.replay_events).toEqual([])
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("a custom week is stored with the week it started as, in its first replay event", async () => {
    const me = await newUser("pr-en-custom")
    actAs(me)
    const week = { kind: "linear_rotation", days: [{ id: "d1", label: "Day", exercises: [] }] } as unknown as ProgramSchedule
    const base = getProgram("stronglifts-5x5")!.schedule
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg", customSchedule: base })
    void week
    const row = (await enrollmentRow(enrollment.id))!
    expect(row.custom_schedule).toEqual(JSON.parse(JSON.stringify(base)))
    const events = row.replay_events as { kind: string; schedule: unknown }[]
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe("schedule")
    expect(events[0].schedule).toEqual(JSON.parse(JSON.stringify(base)))
  })

  it("starting another program in the same discipline pauses the first, reports it, and touches no other account", async () => {
    const { id: theirs, before } = await aBystander("pr-disp-other")
    const me = await newUser("pr-disp-me")
    actAs(me)
    const first = (await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })).enrollment
    const firstBefore = (await enrollmentRow(first.id))!

    const { enrollment: second, displaced } = await enrollInProgram(me.id, { programId: "starting-strength", level: "beginner", unitSystem: "kg" })

    expect(displaced.map((e) => e.id)).toEqual([first.id])
    const firstAfter = (await enrollmentRow(first.id))!
    expect(firstAfter.is_active).toBe(false)
    expect({ ...firstAfter, is_active: true }).toEqual(firstBefore)
    expect((await enrollmentRow(second.id))!.is_active).toBe(true)
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("starting the program already running is not a restart: the row is byte-identical", async () => {
    const me = await newUser("pr-en-twice")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const before = await enrollmentText(enrollment.id)

    const again = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })

    expect(again.enrollment.id).toBe(enrollment.id)
    expect(again.displaced).toEqual([])
    expect(await enrollmentText(enrollment.id)).toBe(before)
  })
})

describe("ensureEnrollment", () => {
  it("creates the enrollment once, then leaves it exactly as it is", async () => {
    const { id: theirs, before } = await aBystander("pr-ens-other")
    const me = await newUser("pr-ens-me")
    actAs(me)
    const selection = { programId: "stronglifts-5x5", level: "beginner" as const, unitSystem: "kg" as const }

    const first = await ensureEnrollment(me.id, selection)
    expect(first.created).toBe(true)
    expect(await enrollmentRow(first.enrollment.id)).toMatchObject({ user_id: me.id, program_id: "stronglifts-5x5", is_active: true, unit_system: "kg" })
    const written = await enrollmentText(first.enrollment.id)

    const second = await ensureEnrollment(me.id, selection)

    expect(second).toMatchObject({ created: false })
    expect(second.enrollment.id).toBe(first.enrollment.id)
    expect(await enrollmentText(first.enrollment.id)).toBe(written)
    expect(await enrollmentText(theirs)).toBe(before)
  })
})

describe("unenroll", () => {
  it("archives the program and keeps every other column and the sessions logged on it", async () => {
    const { id: theirs, before } = await aBystander("pr-un-other")
    const me = await newUser("pr-un-me")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const workoutId = await aSession(me.id, enrollment.id)
    const was = (await enrollmentRow(enrollment.id))!

    await unenroll(me.id, enrollment.id)

    const now = (await enrollmentRow(enrollment.id))!
    expect(now.is_active).toBe(false)
    expect({ ...now, is_active: true }).toEqual(was)
    const [log] = await asOwner((q) => q("select enrollment_id from workout_logs where id = $1", [workoutId]))
    expect(log.enrollment_id).toBe(enrollment.id)
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("is refused while a workout is open on the program, and the program is untouched", async () => {
    const me = await newUser("pr-un-busy")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    await startWorkout(me.id, { enrollmentId: enrollment.id, clientKey: `k-${randomUUID()}` })
    const before = await enrollmentText(enrollment.id)

    await expect(unenroll(me.id, enrollment.id)).rejects.toThrow("Finish or throw away the open workout first.")

    expect(await enrollmentText(enrollment.id)).toBe(before)
  })

  it("filter alone: another account's program is not ended under your own id", async () => {
    const { id: theirs, before } = await aBystander("pr-un-fa-other")
    const me = await newUser("pr-un-fa-me")
    actWithoutRowSecurity(me)

    await unenroll(me.id, theirs).catch(() => undefined)

    expect(await enrollmentText(theirs)).toBe(before)
  })
})

describe("resumeEnrollment", () => {
  it("restarts a finished program exactly where it was, pausing the running one and reporting it", async () => {
    const { id: theirs, before } = await aBystander("pr-re-other")
    const me = await newUser("pr-re-me")
    actAs(me)
    const old = (await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })).enrollment
    await aSession(me.id, old.id)
    await unenroll(me.id, old.id)
    const ended = (await enrollmentRow(old.id))!
    const running = (await enrollInProgram(me.id, { programId: "starting-strength", level: "beginner", unitSystem: "kg" })).enrollment
    const runningBefore = (await enrollmentRow(running.id))!

    const { enrollment, displaced } = await resumeEnrollment(me.id, old.id)

    expect(enrollment.id).toBe(old.id)
    expect(displaced.map((e) => e.id)).toEqual([running.id])
    const now = (await enrollmentRow(old.id))!
    expect(now.is_active).toBe(true)
    expect({ ...now, is_active: false }).toEqual(ended)
    expect((now.cursor as { sessionCount: number }).sessionCount).toBe(1)
    const paused = (await enrollmentRow(running.id))!
    expect(paused.is_active).toBe(false)
    expect({ ...paused, is_active: true }).toEqual(runningBefore)
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("refuses a program that is already running and changes nothing", async () => {
    const me = await newUser("pr-re-running")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const before = await enrollmentText(enrollment.id)
    await expect(resumeEnrollment(me.id, enrollment.id)).rejects.toThrow("That program is already running")
    expect(await enrollmentText(enrollment.id)).toBe(before)
  })
})

describe("resetEnrollment", () => {
  it("rewinds the cursor, keeps the weights, records the reset, and changes no other column", async () => {
    const { id: theirs, before } = await aBystander("pr-rs-other")
    const me = await newUser("pr-rs-me")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    await aSession(me.id, enrollment.id)
    const was = (await enrollmentRow(enrollment.id))!
    expect((was.cursor as { sessionCount: number }).sessionCount).toBe(1)

    await resetEnrollment(me.id, enrollment.id)

    const now = (await enrollmentRow(enrollment.id))!
    expect(now.cursor).toEqual({ cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 })
    expect(now.exercise_state).toEqual(was.exercise_state)
    const events = now.replay_events as { kind: string }[]
    expect(events).toHaveLength((was.replay_events as unknown[]).length + 1)
    expect(events[events.length - 1].kind).toBe("reset")
    for (const column of ["user_id", "program_id", "level", "unit_system", "is_active", "initial_exercise_state", "custom_schedule", "label", "started_on"]) {
      expect(now[column], column).toEqual(was[column])
    }
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("filter alone: another account's program is not reset under your own id", async () => {
    const { id: theirs, before } = await aBystander("pr-rs-fa-other")
    const me = await newUser("pr-rs-fa-me")
    actWithoutRowSecurity(me)
    await expect(resetEnrollment(me.id, theirs)).rejects.toThrow()
    expect(await enrollmentText(theirs)).toBe(before)
  })
})

describe("updateEnrollmentSchedule", () => {
  it("saves the edited week and a typed weight, keeps a dropped lift's state, records the edit, and touches no other account", async () => {
    const { id: theirs, before } = await aBystander("pr-sc-other")
    const me = await newUser("pr-sc-me")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const was = (await enrollmentRow(enrollment.id))!
    const base = JSON.parse(JSON.stringify(getProgram("stronglifts-5x5")!.schedule)) as { days: { exercises: { id: string }[] }[] }
    const droppedLift = base.days[0].exercises[base.days[0].exercises.length - 1].id
    base.days[0].exercises = base.days[0].exercises.slice(0, -1)

    await updateEnrollmentSchedule(me.id, enrollment.id, base as unknown as ProgramSchedule, { squat: 100 })

    const now = (await enrollmentRow(enrollment.id))!
    expect(now.custom_schedule).toEqual(base)
    const state = now.exercise_state as Record<string, { workingWeight: number }>
    expect(state.squat.workingWeight).toBe(100)
    expect(state[droppedLift]).toEqual((was.exercise_state as Record<string, unknown>)[droppedLift])
    const events = now.replay_events as { kind: string }[]
    expect(events.map((e) => e.kind)).toEqual(["schedule", "weight"])
    for (const column of ["user_id", "program_id", "level", "unit_system", "is_active", "initial_exercise_state", "label"]) {
      expect(now[column], column).toEqual(was[column])
    }
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("passing null puts the catalogue week back", async () => {
    const me = await newUser("pr-sc-null")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const base = JSON.parse(JSON.stringify(getProgram("stronglifts-5x5")!.schedule)) as { days: { exercises: unknown[] }[] }
    base.days[0].exercises = base.days[0].exercises.slice(0, 1)
    await updateEnrollmentSchedule(me.id, enrollment.id, base as unknown as ProgramSchedule)
    expect((await enrollmentRow(enrollment.id))!.custom_schedule).not.toBeNull()

    await updateEnrollmentSchedule(me.id, enrollment.id, null)

    expect((await enrollmentRow(enrollment.id))!.custom_schedule).toBeNull()
  })

  it("is refused while a workout is open on the program, and nothing is written", async () => {
    const me = await newUser("pr-sc-busy")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    await startWorkout(me.id, { enrollmentId: enrollment.id, clientKey: `k-${randomUUID()}` })
    const before = await enrollmentText(enrollment.id)
    await expect(updateEnrollmentSchedule(me.id, enrollment.id, null, { squat: 999 })).rejects.toThrow()
    expect(await enrollmentText(enrollment.id)).toBe(before)
  })
})

describe("skipSession", () => {
  it("advances the cursor without logging a workout, keeps the weights, and records the skip", async () => {
    const { id: theirs, before } = await aBystander("pr-sk-other")
    const me = await newUser("pr-sk-me")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const was = (await enrollmentRow(enrollment.id))!

    await skipSession(me.id, enrollment.id)

    const now = (await enrollmentRow(enrollment.id))!
    expect((now.cursor as { dayIndex: number }).dayIndex).toBe(1)
    expect(now.exercise_state).toEqual(was.exercise_state)
    const events = now.replay_events as { kind: string }[]
    expect(events.map((e) => e.kind)).toEqual(["skip"])
    expect(await asOwner((q) => q("select 1 from workout_logs where user_id = $1", [me.id]))).toHaveLength(0)
    for (const column of ["user_id", "program_id", "level", "unit_system", "is_active", "initial_exercise_state"]) {
      expect(now[column], column).toEqual(was[column])
    }
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("filter alone: another account's program is not skipped under your own id", async () => {
    const { id: theirs, before } = await aBystander("pr-sk-fa-other")
    const me = await newUser("pr-sk-fa-me")
    actWithoutRowSecurity(me)
    await expect(skipSession(me.id, theirs)).rejects.toThrow()
    expect(await enrollmentText(theirs)).toBe(before)
  })
})

describe("deleteEnrollmentPermanently", () => {
  it("erases an ended program, keeps the workouts logged on it (un-linked), and no other row", async () => {
    const { id: theirs, before } = await aBystander("pr-dl-other")
    const me = await newUser("pr-dl-me")
    actAs(me)
    const gone = (await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })).enrollment
    const workoutId = await aSession(me.id, gone.id)
    await unenroll(me.id, gone.id)
    const kept = (await enrollInProgram(me.id, { programId: "starting-strength", level: "beginner", unitSystem: "kg" })).enrollment
    const keptBefore = await enrollmentText(kept.id)

    await deleteEnrollmentPermanently(me.id, gone.id)

    expect(await enrollmentRow(gone.id)).toBeUndefined()
    const [log] = await asOwner((q) => q("select enrollment_id, ended_at from workout_logs where id = $1", [workoutId]))
    expect(log.enrollment_id).toBeNull()
    expect(log.ended_at).not.toBeNull()
    expect(await enrollmentText(kept.id)).toBe(keptBefore)
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("refuses a program that is still running, and it stays", async () => {
    const me = await newUser("pr-dl-running")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const before = await enrollmentText(enrollment.id)
    await expect(deleteEnrollmentPermanently(me.id, enrollment.id)).rejects.toThrow("Only a program you have already ended can be deleted permanently")
    expect(await enrollmentText(enrollment.id)).toBe(before)
  })

  it("filter alone: another account's ended program is not erased under your own id", async () => {
    const other = await newUser("pr-dl-fa-other")
    actAs(other)
    const theirs = (await enrollInProgram(other.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })).enrollment
    await unenroll(other.id, theirs.id)
    const before = await enrollmentText(theirs.id)
    const me = await newUser("pr-dl-fa-me")
    actWithoutRowSecurity(me)

    await expect(deleteEnrollmentPermanently(me.id, theirs.id)).rejects.toThrow("Only a program you have already ended")

    expect(await enrollmentText(theirs.id)).toBe(before)
  })
})

describe("reviseSessionLog", () => {
  it("removes the session and puts the program back as if it was never done; other sessions and accounts are untouched", async () => {
    const { id: theirs, before } = await aBystander("pr-rv-other")
    const me = await newUser("pr-rv-me")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const firstId = await aSession(me.id, enrollment.id)
    const secondId = await aSession(me.id, enrollment.id)
    const firstBefore = await asOwner((q) => q("select t::text as r from workout_logs t where id = $1", [firstId]))

    await reviseSessionLog(me.id, enrollment.id, secondId)

    expect(await asOwner((q) => q("select 1 from workout_logs where id = $1", [secondId]))).toHaveLength(0)
    expect(await asOwner((q) => q("select t::text as r from workout_logs t where id = $1", [firstId]))).toEqual(firstBefore)
    const now = (await enrollmentRow(enrollment.id))!
    expect((now.cursor as { sessionCount: number }).sessionCount).toBe(1)
    expect(await enrollmentText(theirs)).toBe(before)
  })

  it("refuses to remove a session that is still open", async () => {
    const me = await newUser("pr-rv-open")
    actAs(me)
    const { enrollment } = await enrollInProgram(me.id, { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const open = await startWorkout(me.id, { enrollmentId: enrollment.id, clientKey: `k-${randomUUID()}` })
    await expect(reviseSessionLog(me.id, enrollment.id, open.id)).rejects.toThrow()
    expect(await asOwner((q) => q("select 1 from workout_logs where id = $1", [open.id]))).toHaveLength(1)
  })
})
