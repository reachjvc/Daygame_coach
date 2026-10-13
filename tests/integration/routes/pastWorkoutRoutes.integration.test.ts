/**
 * WRITING UP A WORKOUT YOU HAVE ALREADY DONE, THROUGH ITS ROUTES, AGAINST THE REAL SCHEMA.
 *
 * Moved from `tests/e2e/health-past-workout.spec.ts`, whose two tests made
 * every call through `fetch` in a browser on the shared training account and
 * read nothing on screen. The path is the one the live screen and "Log a past
 * workout" both use — start, tick each set, finish — and the read-back is the
 * route History reads (`GET /api/health/workout`). Same handlers here, real
 * repos, production's schema, an account of the test's own.
 *
 * The two faults it pins, from the endpoint this path replaced:
 *
 * 1. A warm-up saved as a warm-up. The 2026-09-07 migration replaced the
 *    `is_warmup` boolean with `set_kind` while the old validator still listed
 *    `is_warmup`, so every warm-up single was stored as ordinary work, counted
 *    in the volume and able to be announced as a personal best.
 * 2. No half-written workout. The old path wrote the workout row before its
 *    sets, so a refused set left an empty FINISHED session counting towards the
 *    streak. Here a workout is not finished until you finish it, so at no point
 *    between Start and Finish does it appear in the finished list.
 */

import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, newUser } from "@/tests/db/harness"
import { call } from "./call"
import * as workouts from "@/app/api/workouts/route"
import * as live from "@/app/api/workouts/live/route"
import * as sets from "@/app/api/workouts/[id]/sets/route"
import * as finish from "@/app/api/workouts/[id]/finish/route"
import * as history from "@/app/api/health/workout/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

type Logged = { id: string; sets?: { set_kind: string; weight_kg: number }[] }

const finished = async (withSets = false) =>
  (await call<Logged[]>(history.GET, `/api/health/workout?days=3650${withSets ? "&include=sets" : ""}`)).body

const tick = (workoutId: string, set: { exercise: string; weight: number; reps: number; setNumber: number; kind: string }) =>
  call(sets.POST, `/api/workouts/${workoutId}/sets`, {
    method: "POST",
    params: { id: workoutId },
    body: { exerciseId: null, ...set },
  })

describe("a workout written up afterwards", () => {
  it("a warm-up set stays a warm-up, and the working set is what counts", async () => {
    const user = await newUser("warmup")
    actAs(user)
    const startedAt = new Date(Date.now() - 2 * 3600_000).toISOString()
    const endedAt = new Date(Date.now() - 3600_000).toISOString()

    const started = await call<{ id: string }>(workouts.POST, "/api/workouts", {
      method: "POST",
      body: { clientKey: `past-${randomUUID()}`, startedAt },
    })
    expect(started.status, JSON.stringify(started.body)).toBe(201)
    const id = started.body.id
    expect((await tick(id, { exercise: "ZZWarm Bench", weight: 40, reps: 5, setNumber: 1, kind: "warmup" })).status).toBe(200)
    expect((await tick(id, { exercise: "ZZWarm Bench", weight: 300, reps: 1, setNumber: 2, kind: "working" })).status).toBe(200)
    const done = await call(finish.POST, `/api/workouts/${id}/finish`, {
      method: "POST",
      params: { id },
      body: { startedAt, endedAt, intensity: 3, sessionType: "weights" },
    })
    expect(done.status, JSON.stringify(done.body)).toBe(200)

    const mine = (await finished(true)).find((l) => l.id === id)
    const stored = (mine?.sets ?? []).map((s) => `${s.weight_kg}:${s.set_kind}`).sort()
    expect(stored, "the warm-up must survive the save").toEqual(["300:working", "40:warmup"])
  })

  it("a workout with sets still being written is OPEN, never a finished empty one", async () => {
    const user = await newUser("half-written")
    actAs(user)
    const before = (await finished()).length

    const started = await call<{ id: string }>(workouts.POST, "/api/workouts", {
      method: "POST",
      body: { clientKey: `ghost-${randomUUID()}` },
    })
    expect(started.status, JSON.stringify(started.body)).toBe(201)
    const id = started.body.id
    const finishedWithNoSets = (await finished()).length - before

    const set = { exercise: "ZZTest Ghost", weight: 60, reps: 5, setNumber: 1, kind: "working" }
    expect((await tick(id, set)).status).toBe(200)
    // The SAME slot again — a set re-ticked after a correction. It updates the
    // row rather than being refused, which is why the old path's "workout row
    // written, sets refused" state has no equivalent here.
    const second = await tick(id, set)
    const finishedMidWrite = (await finished()).length - before
    const open = (await call<{ id: string } | null>(live.GET, "/api/workouts/live")).body

    expect(second.status, "re-ticking a set is not an error").toBe(200)
    expect(finishedWithNoSets, "no finished workout before any set").toBe(0)
    expect(finishedMidWrite, "and none part-way through writing them").toBe(0)
    expect(open?.id, "it is yours to finish or discard").toBe(id)
  })
})
