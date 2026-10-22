/**
 * THE APP ON THE NEW ENGINE, AT ITS ROUTES — Plans/program-builder.md, Phase 4.
 *
 * Through the same handlers the screens call, on a real database: a started
 * program keeps its own copy and version 1; a program written in the format
 * starts as it is and prescribes its day by the calendar; a top set at RPE 8.5
 * is stored with its slot and set group and moves the lift's estimated max;
 * an edit records the next version; the account's plates reach the
 * prescription; and the old editor will not flatten a program it cannot show.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import { call } from "./call"
import * as enrollments from "@/app/api/programs/enrollments/route"
import * as enrollment from "@/app/api/programs/enrollments/[id]/route"
import * as schedule from "@/app/api/programs/enrollments/[id]/schedule/route"
import * as action from "@/app/api/programs/enrollments/[id]/action/route"
import * as workouts from "@/app/api/workouts/route"
import * as sets from "@/app/api/workouts/[id]/sets/route"
import * as finish from "@/app/api/workouts/[id]/finish/route"
import { saveTrainingSettings } from "@/src/db/workoutRepo"
import { materializeSchedule } from "@/src/programs/customize"
import { requireProgram } from "@/src/programs/data/catalog"
import type { PrescribedExercise, ProgramSchedule } from "@/src/programs/types"
import { starscream } from "../../fixtures/programs/corpus/starscream"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

afterEach(() => vi.useRealTimers())

type Detail = { prescription: { dayId: string; weeksTotal?: number; week: number; exercises: PrescribedExercise[] } }

async function startProgram(body: Record<string, unknown>): Promise<string> {
  const made = await call<{ enrollment: { id: string } }>(enrollments.POST, "/api/programs/enrollments", { method: "POST", body })
  expect(made.status, JSON.stringify(made.body)).toBe(201)
  return made.body.enrollment.id
}

const detailOf = async (id: string) =>
  (await call<Detail>(enrollment.GET, `/api/programs/enrollments/${id}`, { params: { id } })).body

describe("starting a program on the new engine", () => {
  it("a built-in keeps its own copy of the program, as version 1", async () => {
    const user = await newUser("spec-copy")
    actAs(user)
    const id = await startProgram({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })

    const [row] = await asOwner((q) => q(`SELECT spec ->> 'name' AS name, spec_version, started_on IS NOT NULL AS dated FROM program_enrollments WHERE id = $1`, [id]))
    expect(row).toEqual({ name: "StrongLifts 5×5", spec_version: 2, dated: true })
    const versions = await asOwner((q) => q(`SELECT version, spec ->> 'name' AS name FROM program_versions WHERE enrollment_id = $1`, [id]))
    expect(versions).toEqual([{ version: 1, name: "StrongLifts 5×5" }])
  })

  it("an edit to a running built-in is recorded as its next version", async () => {
    const user = await newUser("spec-edit")
    actAs(user)
    const id = await startProgram({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" })
    const edited = materializeSchedule(requireProgram("stronglifts-5x5")) as Extract<ProgramSchedule, { kind: "linear_rotation" }>
    edited.days[0].label = "Heavy A"

    const saved = await call(schedule.PUT, `/api/programs/enrollments/${id}/schedule`, { method: "PUT", params: { id }, body: { customSchedule: edited } })
    expect(saved.status, JSON.stringify(saved.body)).toBe(200)

    const versions = await asOwner((q) => q(`SELECT version, spec -> 'days' -> 0 ->> 'label' AS day FROM program_versions WHERE enrollment_id = $1 ORDER BY version`, [id]))
    expect(versions).toEqual([
      { version: 1, day: "Workout A" },
      { version: 2, day: "Heavy A" },
    ])
    expect((await detailOf(id)).prescription.dayId).toBe("A")
  })

  it("the account's own plates reach the prescription — the plate bug", async () => {
    const user = await newUser("plates")
    actAs(user)
    // A home gym with nothing smaller than 2.5 kg: the bar moves in 5 kg steps.
    await saveTrainingSettings(user.id, { unit: "kg", barWeightKg: 20, smallestPlateKg: 2.5 })
    const id = await startProgram({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg", workingWeights: { squat: 22.5 } })

    const squat = (await detailOf(id)).prescription.exercises.find((e) => e.exerciseId === "squat")!
    // 22.5 cannot be loaded with 2.5 kg plates; it used to be prescribed anyway.
    expect(squat.sets[0].weight).toBe(25)
  })
})

describe("a program written in the format: Starscream", () => {
  it("starts as it is, under its own name, on the day the calendar says", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-19T10:00:00Z")) // Monday, week 1
    const user = await newUser("starscream")
    actAs(user)
    const id = await startProgram({ programId: "custom", level: "intermediate", unitSystem: "kg", spec: starscream.spec, startedOn: "2026-10-19" })

    const [row] = await asOwner((q) => q(`SELECT label, program_id, started_on::text AS on FROM program_enrollments WHERE id = $1`, [id]))
    expect(row).toEqual({ label: "Starscream (12-week hypertrophy)", program_id: "custom", on: "2026-10-19" })

    const monday = (await detailOf(id)).prescription
    expect(monday).toMatchObject({ dayId: "mon", week: 1, weeksTotal: 12 })
    const bench = monday.exercises[0]
    expect(bench.sets.map((s) => [s.kind, s.reps, s.repRangeMax, s.pick ?? null, s.rpe ?? null])).toEqual([
      ["top", 2, 5, "effort", 8.5],
      ["backoff", 5, 10, null, null],
      ["backoff", 5, 10, null, null],
      ["backoff", 5, 10, null, null],
    ])
    expect(bench.sets[1].derive).toEqual({ slot: "mon_bench", group: "top", pct: { min: 0.7, max: 0.8 } })

    // Week 12's Monday, by the calendar.
    vi.setSystemTime(new Date("2027-01-04T10:00:00Z"))
    const week12 = (await detailOf(id)).prescription
    expect(week12).toMatchObject({ dayId: "mon", week: 12 })
    expect(week12.exercises[0].sets[0]).toMatchObject({ reps: 1, repRangeMax: 5, rpe: 9 })
  })

  it("a top set at RPE 8.5 is kept with its slot and set group, and moves the lift's estimated max", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-19T10:00:00Z"))
    const user = await newUser("starscream-top")
    actAs(user)
    const id = await startProgram({ programId: "custom", level: "intermediate", unitSystem: "kg", spec: starscream.spec, startedOn: "2026-10-19" })

    const started = await call<{ id: string }>(workouts.POST, "/api/workouts", { method: "POST", body: { enrollmentId: id, clientKey: `k-${randomUUID()}` } })
    expect(started.status, JSON.stringify(started.body)).toBe(201)
    const workoutId = started.body.id
    const ticked = await call(sets.POST, `/api/workouts/${workoutId}/sets`, {
      method: "POST",
      params: { id: workoutId },
      body: { exerciseId: "mon_bench", exercise: "Bench Press", weight: 100, reps: 4, setNumber: 1, kind: "top", rpe: 8.5, slotId: "mon_bench", setGroupId: "top" },
    })
    expect(ticked.status, JSON.stringify(ticked.body)).toBe(200)

    const [set] = await asOwner((q) => q(`SELECT set_kind, rpe::text AS rpe, slot_id, set_group_id FROM workout_sets WHERE log_id = $1`, [workoutId]))
    expect(set).toEqual({ set_kind: "top", rpe: "8.5", slot_id: "mon_bench", set_group_id: "top" })

    vi.setSystemTime(new Date("2026-10-19T11:00:00Z"))
    const done = await call(finish.POST, `/api/workouts/${workoutId}/finish`, { method: "POST", params: { id: workoutId }, body: { intensity: 3, rpe: 8.5 } })
    expect(done.status, JSON.stringify(done.body)).toBe(200)

    const [state] = await asOwner((q) => q(`SELECT exercise_state -> 'mon_bench' ->> 'e1rm' AS e1rm FROM program_enrollments WHERE id = $1`, [id]))
    // 4 reps at RPE 8.5 is 85.0% of a max on the RTS chart: 100 / 0.85.
    expect(Number(state.e1rm)).toBeCloseTo(117.6, 1)
  })

  it("a finished calendar program run again starts week 1 today, not just the counter", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2027-01-21T10:00:00Z")) // Thursday of week 14 from 19 Oct
    const user = await newUser("starscream-again")
    actAs(user)
    const id = await startProgram({ programId: "custom", level: "intermediate", unitSystem: "kg", spec: starscream.spec, startedOn: "2026-10-19" })
    expect((await call<{ prescription: { isComplete?: boolean } }>(enrollment.GET, `/api/programs/enrollments/${id}`, { params: { id } })).body.prescription.isComplete).toBe(true)

    const again = await call(action.POST, `/api/programs/enrollments/${id}/action`, { method: "POST", params: { id }, body: { action: "reset" } })
    expect(again.status, JSON.stringify(again.body)).toBe(200)
    const after = (await detailOf(id)).prescription as Detail["prescription"] & { isComplete?: boolean }
    expect(after).toMatchObject({ week: 1, dayId: "thu" })
    expect(after.isComplete).toBeUndefined()
    const [row] = await asOwner((q) => q(`SELECT started_on::text AS on FROM program_enrollments WHERE id = $1`, [id]))
    expect(row.on).toBe("2027-01-21")
  })

  it("a program in the format is not handed to the old editor, which would flatten its rules", async () => {
    const user = await newUser("starscream-edit")
    actAs(user)
    const id = await startProgram({ programId: "custom", level: "intermediate", unitSystem: "kg", spec: starscream.spec })
    const flat = materializeSchedule(requireProgram("stronglifts-5x5"))
    const saved = await call<{ error: string }>(schedule.PUT, `/api/programs/enrollments/${id}/schedule`, { method: "PUT", params: { id }, body: { customSchedule: flat } })
    expect(saved.status).toBeGreaterThanOrEqual(400)
    expect(saved.body.error).toMatch(/rules the old editor cannot show/)
  })

  it("a broken program is refused with the format's own sentence", async () => {
    const user = await newUser("starscream-broken")
    actAs(user)
    const broken = { ...starscream.spec, days: [{ ...starscream.spec.days[0], weekday: 9 }] }
    const made = await call<{ error: string }>(enrollments.POST, "/api/programs/enrollments", {
      method: "POST",
      body: { programId: "custom", level: "intermediate", unitSystem: "kg", spec: broken },
    })
    expect(made.status).toBeGreaterThanOrEqual(400)
    expect(made.body.error).toMatch(/weekday: is above the largest allowed \(7\)/)
  })
})
