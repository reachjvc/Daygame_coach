/**
 * THE LIVE WORKOUT'S REFUSALS, THROUGH ITS OWN ROUTES, AGAINST THE REAL SCHEMA.
 *
 * Moved from `tests/e2e/programs-live-workout.spec.ts`. These three tests opened
 * a phone-sized browser on the one shared training account, reset it, enrolled
 * it, and then made every assertion through `fetch` inside `page.evaluate` —
 * nothing on screen was read. So they are the same requests here, to the same
 * handlers (`app/api/workouts/**`, `app/api/programs/enrollments/**`), with the
 * real `workoutRepo` and `programRepo` behind them and production's schema
 * under those: its unique index on the one open workout, its lock in
 * `finish_program_workout`, its refusal to end a busy program.
 *
 * Each test has an account of its own (`newUser`), so nothing needs resetting
 * and they run beside every other file. What stays in the browser is what a
 * person sees — the ticked set after a reload, the summary, the rest clock.
 */

import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, newUser } from "@/tests/db/harness"
import { call } from "./call"
import * as enrollments from "@/app/api/programs/enrollments/route"
import * as enrollment from "@/app/api/programs/enrollments/[id]/route"
import * as workouts from "@/app/api/workouts/route"
import * as live from "@/app/api/workouts/live/route"
import * as sets from "@/app/api/workouts/[id]/sets/route"
import * as finish from "@/app/api/workouts/[id]/finish/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

type Workout = { id: string; sets: { setNumber: number; reps: number }[] }

/** A fresh account on StrongLifts, signed in — what `resetAndEnroll` made of the shared one. */
async function enrolledUser(label: string): Promise<string> {
  const user = await newUser(label)
  actAs(user)
  const made = await call(enrollments.POST, "/api/programs/enrollments", {
    method: "POST",
    body: { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" },
  })
  expect(made.status, JSON.stringify(made.body)).toBe(201)
  const active = await call<{ id: string }[]>(enrollments.GET, "/api/programs/enrollments")
  expect(active.body).toHaveLength(1)
  return active.body[0]!.id
}

const start = (enrollmentId: string, clientKey: string) =>
  call<{ id?: string; code?: string; error?: string; workout?: { id: string } }>(workouts.POST, "/api/workouts", {
    method: "POST",
    body: { enrollmentId, clientKey },
  })

const openWorkout = async () => (await call<Workout | null>(live.GET, "/api/workouts/live")).body

describe("the live workout, at its routes", () => {
  /**
   * ENDING A PROGRAM YOU ARE MID-WORKOUT ON. What matters is that the program
   * is still there and the open workout still has something to finish onto.
   */
  it("End is refused while a workout is open on the program", async () => {
    const enrollmentId = await enrolledUser("busy-end")
    expect((await start(enrollmentId, `busy-${randomUUID()}`)).status).toBe(201)

    const end = await call(enrollment.DELETE, `/api/programs/enrollments/${enrollmentId}`, {
      method: "DELETE",
      params: { id: enrollmentId },
    })

    expect(end.status).toBe(409)
    expect(end.body.error).toBe("Finish or throw away the open workout first.")
    const active = await call<{ id: string }[]>(enrollments.GET, "/api/programs/enrollments")
    expect(active.body.map((e) => e.id), "the program is still running").toContain(enrollmentId)
  })

  /**
   * TWO TAPS IN THE SAME INSTANT. Both requests used to find nothing open, both
   * inserted, and the loser's "duplicate key value violates unique constraint
   * uq_workout_logs_live" went straight to the screen.
   */
  it("two starts at once open one workout and never show a database message", async () => {
    const enrollmentId = await enrolledUser("race")
    const stamp = randomUUID()

    const [a, b] = await Promise.all([start(enrollmentId, `race-a-${stamp}`), start(enrollmentId, `race-b-${stamp}`)])
    const winner = await openWorkout()

    // One created it; the other was told it was already open.
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect([a.body.code, b.body.code]).toContain("already_open")
    expect(JSON.stringify([a.body, b.body]), "the database's own words must never reach a person").not.toContain(
      "duplicate key"
    )
    // Both replies name the SAME workout, so either tab can just go to it.
    const named = [a.body, b.body].map((x) => x.id ?? x.workout?.id ?? null)
    expect(new Set(named).size).toBe(1)
    expect(named[0]).toBe(winner?.id)
  })

  it("a bad connection cannot start two workouts or log a set twice", async () => {
    const enrollmentId = await enrolledUser("bad-signal")

    // The key is minted before the request goes out, so a retry returns the
    // workout that already started instead of opening a second beside it.
    const clientKey = `retry-${randomUUID()}`
    const first = await start(enrollmentId, clientKey)
    expect(first.status).toBe(201)
    const workoutId = first.body.id!
    const retry = await start(enrollmentId, clientKey)
    expect(retry.status).toBe(201)
    expect(retry.body.id, "a retried start should return the same workout").toBe(workoutId)
    // A genuinely different attempt while one is running is refused.
    expect((await start(enrollmentId, `other-${randomUUID()}`)).status, "a second workout should be refused").toBe(409)

    const detail = await call<{ prescription: { exercises: { exerciseId: string; name: string; sets: { weight: number }[] }[] } }>(
      enrollment.GET,
      `/api/programs/enrollments/${enrollmentId}`,
      { params: { id: enrollmentId } }
    )
    const squat = detail.body.prescription.exercises[0]!
    const tick = (setNumber: number, reps: number) =>
      call(sets.POST, `/api/workouts/${workoutId}/sets`, {
        method: "POST",
        params: { id: workoutId },
        body: { exerciseId: squat.exerciseId, exercise: squat.name, weight: squat.sets[0]!.weight, reps, setNumber },
      })

    expect((await tick(1, 5)).status).toBe(200)
    expect((await tick(2, 5)).status).toBe(200)
    // Saved mid-workout, before anything is "submitted".
    expect((await openWorkout())!.sets).toHaveLength(2)

    // The same set again is a correction, not a second set.
    expect((await tick(2, 3)).status).toBe(200)
    const corrected = (await openWorkout())!
    expect(corrected.sets, "re-ticking a set should correct it, not add one").toHaveLength(2)
    expect(corrected.sets.find((s) => s.setNumber === 2)?.reps).toBe(3)

    const finishIt = () =>
      call<{ workoutId?: string }>(finish.POST, `/api/workouts/${workoutId}/finish`, {
        method: "POST",
        params: { id: workoutId },
        body: { intensity: 4 },
      })
    expect((await finishIt()).status).toBe(200)
    // A second Save is what a lost reply looks like from the browser; the
    // workout IS saved, so it is answered with the same summary.
    const second = await finishIt()
    expect(second.status, "a repeat Save returns the same summary").toBe(200)
    expect(second.body.workoutId, "and it is the same workout's summary").toBe(workoutId)
    expect(await openWorkout(), "no workout is open once it is finished").toBeNull()
  })
})
