/**
 * Saved training weeks, end to end against the real database.
 *
 * WHAT THIS REPLACES. A week you built in the program builder existed only
 * while the page was open — close the tab before pressing Start and it was
 * gone, and it could not follow you to another device. Separately,
 * `workout_templates` held a flat list of sets that prefilled a different
 * screen and could not be started as a program at all. Two things called "a
 * workout you saved", neither able to see the other.
 *
 * This is the coverage for `startDraft` in `src/db/programDraftRepo.ts`: what it
 * refuses, and what it writes onto the enrollment when it accepts.
 *
 * The rule this pins hardest: SAVING IS PERMISSIVE, STARTING IS NOT. A day with
 * nothing in it yet is a legal draft, because building a week over two sittings
 * is the ordinary case. It is not a legal program, and the refusal names the day
 * that is still empty rather than failing somewhere inside the engine.
 */

import { test, expect } from "@playwright/test"

/**
 * One at a time: these share the one test account, and each cleans it out. Run
 * in parallel they delete each other's drafts and fail for reasons that have
 * nothing to do with the code.
 */
test.describe.configure({ mode: "serial" })

test("a saved week survives a rename, refuses to start half-built, and starts under its own name", async ({ page }) => {
  test.setTimeout(180000)
  await page.goto("/programs")
  const out = await page.evaluate(async () => {
    const r: Record<string, unknown> = {}
    const j = async (res: Response) => ({ status: res.status, body: await res.json().catch(() => null) })

    // The two drafts the migration created belong to a DIFFERENT account, so
    // this one must see none of them. That is the row policy working through
    // the real app rather than only in a test harness.
    const listed = await j(await fetch("/api/programs/drafts"))
    r.listStatus = listed.status
    r.othersDraftsVisible = (listed.body as unknown[]).length

    const week = {
      kind: "linear_rotation",
      days: [
        { id: "mon", label: "Push", weekday: 1, exercises: [
          { id: "bench", name: "Bench Press", metricType: "load",
            scheme: { kind: "linear", sets: 3, reps: 5 },
            progression: { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 } },
        ] },
        { id: "wed", label: "Pull", weekday: 3, exercises: [] },
      ],
    }

    const made = await j(await fetch("/api/programs/drafts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E Week", schedule: week, workingWeights: { bench: 60 }, unitSystem: "kg" }),
    }))
    r.createStatus = made.status
    const id = (made.body as { id: string }).id

    // A half-built week SAVES...
    const read = await j(await fetch(`/api/programs/drafts/${id}`))
    r.savedDays = (read.body as { schedule: { days: { label: string; exercises: unknown[] }[] } })
      .schedule.days.map((d) => `${d.label}:${d.exercises.length}`)

    // ...but does not START, and it names the day that is empty.
    const badStart = await j(await fetch(`/api/programs/drafts/${id}/start`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    }))
    r.startBlockedStatus = badStart.status
    r.startBlockedMessage = (badStart.body as { error: string }).error

    // A duplicate name is refused in words.
    const dupe = await j(await fetch("/api/programs/drafts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E Week", schedule: week }),
    }))
    r.duplicateMessage = (dupe.body as { error: string }).error

    // Rename without resending the week: the week must survive.
    await fetch(`/api/programs/drafts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E Week Renamed" }),
    })
    const renamed = await j(await fetch(`/api/programs/drafts/${id}`))
    const rb = renamed.body as { name: string; schedule: { days: unknown[] }; workingWeights: Record<string, number> }
    r.renamedKeptWeek = rb.name === "E2E Week Renamed" && rb.schedule.days.length === 2 && rb.workingWeights.bench === 60

    // Fill the empty day, then it starts — under its own name.
    week.days[1].exercises = [{ id: "row", name: "Barbell Row", metricType: "load",
      scheme: { kind: "linear", sets: 3, reps: 5 },
      progression: { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 } }]
    await fetch(`/api/programs/drafts/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: week, workingWeights: { bench: 60, row: 40 } }),
    })
    const started = await j(await fetch(`/api/programs/drafts/${id}/start`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    }))
    r.startStatus = started.status
    const sb = started.body as { enrollment?: { label: string; program_id: string; unit_system: string }, error?: string }
    r.startError = sb.error ?? null
    r.enrollmentLabel = sb.enrollment?.label ?? null
    r.enrollmentProgram = sb.enrollment?.program_id ?? null

    // Clean up everything this test made.
    await fetch(`/api/programs/drafts/${id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      if (e.program_id === "custom") {
        await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }
    }
    r.afterDelete = ((await (await fetch("/api/programs/drafts")).json()) as unknown[]).length
    return r
  })
  console.log("DRAFTS", JSON.stringify(out, null, 1))

  expect(out.listStatus).toBe(200)
  expect(out.othersDraftsVisible, "another account's drafts must not be listed").toBe(0)
  expect(out.createStatus).toBe(201)
  expect(out.savedDays, "a half-built week saves as it is").toEqual(["Push:1", "Pull:0"])
  expect(out.startBlockedStatus, "and is refused a start").toBe(422)
  expect(out.startBlockedMessage).toMatch(/Pull/)
  expect(out.duplicateMessage).toMatch(/already have a week/i)
  expect(out.renamedKeptWeek, "a rename must not empty the week").toBe(true)
  expect(out.startError).toBeNull()
  expect(out.startStatus).toBe(201)
  expect(out.enrollmentLabel, "it starts under its own name").toBe("E2E Week Renamed")
  expect(out.enrollmentProgram).toBe("custom")
  expect(out.afterDelete, "and nothing of this test's is left behind").toBe(0)
})
