/**
 * SAVED TRAINING WEEKS, THROUGH THEIR ROUTES, AGAINST THE REAL SCHEMA.
 *
 * Moved from `tests/e2e/programs-drafts.spec.ts`, which drove all of this with
 * `fetch` from inside a browser on the shared training account and read nothing
 * on screen. The same handlers (`app/api/programs/drafts/**`) run here with
 * `programDraftRepo` and production's schema behind them.
 *
 * The rule this pins hardest: SAVING IS PERMISSIVE, STARTING IS NOT. A day with
 * nothing in it yet is a legal draft, because building a week over two sittings
 * is the ordinary case. It is not a legal program, and the refusal names the
 * day that is still empty rather than failing somewhere inside the engine.
 * (The table's own rules — the shape check, the per-person unique name, row
 * security — are `tests/integration/db/programDrafts.integration.test.ts`.)
 */

import { describe, it, expect, vi } from "vitest"
import { actAs, newUser } from "@/tests/db/harness"
import { call } from "./call"
import * as drafts from "@/app/api/programs/drafts/route"
import * as draft from "@/app/api/programs/drafts/[id]/route"
import * as startDraft from "@/app/api/programs/drafts/[id]/start/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const lift = (id: string, name: string) => ({
  id,
  name,
  metricType: "load",
  scheme: { kind: "linear", sets: 3, reps: 5 },
  progression: { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 },
})

/** A week with one day built and one still empty — the ordinary half-finished draft. */
const halfBuilt = () => ({
  kind: "linear_rotation",
  days: [
    { id: "mon", label: "Push", weekday: 1, exercises: [lift("bench", "Bench Press")] },
    { id: "wed", label: "Pull", weekday: 3, exercises: [] as ReturnType<typeof lift>[] },
  ],
})

type Draft = {
  id: string
  name: string
  schedule: { days: { label: string; exercises: unknown[] }[] }
  workingWeights: Record<string, number>
}

describe("a saved training week", () => {
  it("survives a rename, refuses to start half-built, and starts under its own name", async () => {
    // Somebody else's week first, so "lists none of theirs" has something to hide.
    const someoneElse = await newUser("drafts-other")
    actAs(someoneElse)
    const theirs = await call(drafts.POST, "/api/programs/drafts", {
      method: "POST",
      body: { name: "Their Week", schedule: halfBuilt() },
    })
    expect(theirs.status, JSON.stringify(theirs.body)).toBe(201)

    const me = await newUser("drafts")
    actAs(me)
    const listed = await call<Draft[]>(drafts.GET, "/api/programs/drafts")
    expect(listed.status).toBe(200)
    expect(listed.body, "another account's drafts must not be listed").toEqual([])

    const week = halfBuilt()
    const made = await call<Draft>(drafts.POST, "/api/programs/drafts", {
      method: "POST",
      body: { name: "E2E Week", schedule: week, workingWeights: { bench: 60 }, unitSystem: "kg" },
    })
    expect(made.status, JSON.stringify(made.body)).toBe(201)
    const id = made.body.id
    const read = (await call<Draft>(draft.GET, `/api/programs/drafts/${id}`, { params: { id } })).body

    // A half-built week SAVES...
    expect(read.schedule.days.map((d) => `${d.label}:${d.exercises.length}`), "a half-built week saves as it is").toEqual([
      "Push:1",
      "Pull:0",
    ])

    // ...but does not START, and it names the day that is empty.
    const blocked = await call(startDraft.POST, `/api/programs/drafts/${id}/start`, {
      method: "POST",
      params: { id },
      body: "{}",
    })
    expect(blocked.status, "and is refused a start").toBe(422)
    expect(blocked.body.error).toMatch(/Pull/)

    // A duplicate name is refused in words.
    const dupe = await call(drafts.POST, "/api/programs/drafts", {
      method: "POST",
      body: { name: "E2E Week", schedule: week },
    })
    expect(dupe.body.error).toMatch(/already have a week/i)

    // Rename without resending the week: the week must survive.
    expect(
      (await call(draft.PATCH, `/api/programs/drafts/${id}`, { method: "PATCH", params: { id }, body: { name: "E2E Week Renamed" } }))
        .status
    ).toBe(200)
    const renamed = (await call<Draft>(draft.GET, `/api/programs/drafts/${id}`, { params: { id } })).body
    expect(renamed.name).toBe("E2E Week Renamed")
    expect(renamed.schedule.days, "a rename must not empty the week").toHaveLength(2)
    expect(renamed.workingWeights.bench).toBe(60)

    // Fill the empty day, then it starts — under its own name.
    week.days[1]!.exercises = [lift("row", "Barbell Row")]
    const filled = await call(draft.PATCH, `/api/programs/drafts/${id}`, {
      method: "PATCH",
      params: { id },
      body: { schedule: week, workingWeights: { bench: 60, row: 40 } },
    })
    expect(filled.status, JSON.stringify(filled.body)).toBe(200)
    const started = await call<{ enrollment?: { label: string; program_id: string }; error?: string }>(
      startDraft.POST,
      `/api/programs/drafts/${id}/start`,
      { method: "POST", params: { id }, body: "{}" }
    )
    expect(started.body.error ?? null).toBeNull()
    expect(started.status).toBe(201)
    expect(started.body.enrollment?.label, "it starts under its own name").toBe("E2E Week Renamed")
    expect(started.body.enrollment?.program_id).toBe("custom")

    // And it can be deleted, leaving none behind.
    expect((await call(draft.DELETE, `/api/programs/drafts/${id}`, { method: "DELETE", params: { id } })).status).toBe(200)
    expect((await call<Draft[]>(drafts.GET, "/api/programs/drafts")).body).toEqual([])
  })
})
