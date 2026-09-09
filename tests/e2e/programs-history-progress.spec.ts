/**
 * History and Progress: seeing what you have done, and what it added up to.
 *
 * WHAT WAS MISSING. Every set had been recorded for months with no screen that
 * would show them back. The nearest thing was a list of dates with a delete
 * button — you could remove a workout you did not recognise, but you could not
 * look at it first. And nothing anywhere answered "am I lifting more than I was
 * three months ago", which is the question the whole feature exists for.
 *
 * The rules these pin are decisions, not details: the row shows the top WORKING
 * set (a 60 kg warm-up is not what the session was), warm-ups are marked when
 * you open it, and the weekly total counts working sets only.
 */

import { test, expect } from "@playwright/test"

test.describe.configure({ mode: "serial" })

test("shows what each workout was, and what the weeks added up to", async ({ page }) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto("/programs")
  // Seed a couple of real workouts so both tabs have something to show.
  const made = await page.evaluate(async () => {
    const ids: string[] = []
    const days = ["2026-09-01", "2026-09-03", "2026-09-05"]
    for (const d of days) {
      const res = await fetch("/api/health/workout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_type: "weights", duration_min: 55, intensity: 3, entry_date: d,
          sets: [
            { exercise: "ZZHist Squat", weight_kg: 60, reps: 5, set_number: 1, set_kind: "warmup" },
            { exercise: "ZZHist Squat", weight_kg: 120, reps: 5, set_number: 2, set_kind: "working" },
            { exercise: "ZZHist Bench", weight_kg: 90, reps: 5, set_number: 1, set_kind: "working" },
          ],
        }),
      })
      const b = await res.json().catch(() => null)
      if (b?.id) ids.push(b.id)
    }
    return ids
  })
  expect(made.length, "seeding must work").toBe(3)

  await page.reload({ waitUntil: "networkidle" })

  await page.getByRole("button", { name: "History" }).first().click()
  await expect(page.getByTestId("workout-history")).toBeVisible({ timeout: 20000 })
  const histText = await page.getByTestId("workout-history").innerText()
  expect(histText).toContain("ZZHist Squat")
  expect(histText, "the top WORKING set, not the warm-up").toContain("120")
  await page.screenshot({ path: ".playwright-mcp/p4-history.png" })

  // Open the SEEDED one and see every set, warm-up marked.
  await page
    .getByTestId("workout-history")
    .getByRole("button", { name: /ZZHist/ })
    .first()
    .click()
  await page.waitForTimeout(800)
  const detail = await page.getByTestId("workout-history").innerText()
  // Case-insensitive: the label is uppercased by the stylesheet, and innerText
  // returns what is rendered rather than what is in the markup.
  expect(detail, "a warm-up is marked, so the volume total makes sense").toMatch(/warmup/i)
  expect(detail, "and the working set is there in full").toContain("120")
  await page.screenshot({ path: ".playwright-mcp/p4-history-open.png" })

  await page.getByRole("button", { name: "Progress" }).first().click()
  await expect(page.getByTestId("week-dots")).toBeVisible({ timeout: 20000 })
  const prog = await page.locator("body").innerText()
  expect(prog).toContain("Your bests")
  expect(prog, "the estimated max is a separate figure").toContain("est. max")
  await page.screenshot({ path: ".playwright-mcp/p4-progress.png", fullPage: true })

  // Remove every seeded workout, including any a failed earlier run left.
  await page.evaluate(async () => {
    const logs = await (await fetch("/api/health/workout?days=3650&include=sets")).json()
    for (const l of logs as { id: string; sets?: { exercise: string }[] }[]) {
      if ((l.sets ?? []).some((s) => s.exercise.startsWith("ZZHist"))) {
        await fetch(`/api/health/workout?id=${l.id}`, { method: "DELETE" })
      }
    }
  })
})

  /**
 * CORRECTING A WORKOUT, not just deleting it.
 *
 * You could remove a session you did not recognise and you could not look at
 * it first, let alone fix it. Typing 100 where you meant 10 meant losing the
 * session and writing it out again.
 *
 * This is the coverage for `reviseWorkout` in `src/db/workoutRepo.ts`: what it
 * writes is read back from the server and asserted, not assumed.
 */
test("corrects a set and removes one that never happened", async ({ page }) => {
await page.goto("/programs")
const id = await page.evaluate(async () => {
  const logs = await (await fetch("/api/health/workout?days=3650&include=sets")).json()
  for (const l of logs as { id: string; sets?: { exercise: string }[] }[]) {
    if ((l.sets ?? []).some((s) => s.exercise.startsWith("ZZEdit"))) {
      await fetch(`/api/health/workout?id=${l.id}`, { method: "DELETE" })
    }
  }
  const res = await fetch("/api/health/workout", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_type: "weights", duration_min: 40, intensity: 3,
      sets: [
        { exercise: "ZZEdit Press", weight_kg: 100, reps: 5, set_number: 1, set_kind: "working" },
        { exercise: "ZZEdit Press", weight_kg: 100, reps: 5, set_number: 2, set_kind: "working" },
      ],
    }),
  })
  return (await res.json()).id as string
})

await page.reload({ waitUntil: "networkidle" })
await page.getByRole("button", { name: "History" }).first().click()
await page.getByTestId("workout-history").getByRole("button", { name: /ZZEdit/ }).first().click()
await page.getByTestId(`history-edit-open-${id}`).click()

// Fix a typo and drop the set that never happened.
await page.getByLabel("Weight for ZZEdit Press set 1").fill("110")
await page.getByLabel("Remove ZZEdit Press set 2").click()
await page.getByTestId(`history-save-${id}`).click()
await page.waitForTimeout(2500)

const after = await page.evaluate(async (logId) => {
  const logs = await (await fetch("/api/health/workout?days=3650&include=sets")).json()
  const mine = (logs as { id: string; sets?: { weight_kg: number; reps: number }[] }[]).find((l) => l.id === logId)
  return (mine?.sets ?? []).map((s) => `${s.weight_kg}x${s.reps}`)
}, id)
console.log("AFTER", JSON.stringify(after))
expect(after, "the correction is saved and the removed set is gone").toEqual(["110x5"])

await page.evaluate(async (logId) => {
  await fetch(`/api/health/workout?id=${logId}`, { method: "DELETE" })
}, id)
})

/**
 * CORRECTING A PROGRAM SESSION MOVES THE WEIGHTS THAT FOLLOW IT.
 *
 * This is the path that matters and the one that was never tested: the loose
 * case just swaps rows, but a session answering a program decided what every
 * session after it would ask for. It is the coverage for `recalculateEnrollment`
 * in `src/db/programRepo.ts`, whose result is read back from the server and
 * asserted rather than assumed. It also covers the things a correction used
 * to destroy on the way past — the warm-up, and the record of a skipped lift.
 */
test("correcting a program session moves the weights it prescribed", async ({ page }) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto("/programs")

  const seeded = await page.evaluate(async () => {
    // A clean program, then one session done in full.
    const live0 = await (await fetch("/api/workouts/live")).json()
    if (live0) await fetch(`/api/workouts/${live0.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const d = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of d.logs ?? []) await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
    const made = await (
      await fetch("/api/programs/enrollments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
    ).json()
    const enrollmentId = made.enrollment.id
    const asked = made.prescription.exercises[0]

    const started = await (
      await fetch("/api/workouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, clientKey: `revise-${Date.now()}` }),
      })
    ).json()

    // A warm-up and every prescribed working set, all made.
    await fetch(`/api/workouts/${started.id}/sets`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: asked.exerciseId, exercise: asked.name,
        weight: asked.sets[0].weight / 2, reps: 5, setNumber: 1, kind: "warmup",
      }),
    })
    for (const set of asked.sets) {
      await fetch(`/api/workouts/${started.id}/sets`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: asked.exerciseId, exercise: asked.name,
          weight: set.weight, reps: set.reps, setNumber: set.setNumber, kind: "working",
        }),
      })
    }
    await fetch(`/api/workouts/${started.id}/finish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intensity: 3 }),
    })

    const after = await (await fetch(`/api/programs/enrollments/${enrollmentId}`)).json()
    return {
      workoutId: started.id,
      enrollmentId,
      liftName: asked.name,
      // The warm-up plus every prescribed set — what the editor must show back.
      setCount: asked.sets.length + 1,
      askedAt: asked.sets[0].weight,
      // Every set made, so the next session asks for more.
      advancedTo: after.prescription.exercises.find((e: { name: string }) => e.name === asked.name)?.sets[0].weight,
    }
  })

  expect(seeded.advancedTo, "a full session should have moved the weight up").toBeGreaterThan(seeded.askedAt)

  // Correct it: the last set was actually a miss.
  await page.reload({ waitUntil: "networkidle" })
  await page.getByRole("button", { name: "History" }).first().click()
  // By id, not by lift name: an account with a year of training in it has many
  // workouts containing a squat, and the first one is not this one.
  await page.getByTestId(`history-row-${seeded.workoutId}`).click()
  await page.getByTestId(`history-edit-open-${seeded.workoutId}`).click()
  // The warm-up must be here to edit — it used to be deleted by a correction.
  await expect(page.getByTestId(`history-edit-${seeded.workoutId}`)).toContainText(/warmup/i)
  /**
   * EVERY SET IS HERE TO EDIT. On an account with a year of training the list
   * read came back capped at 1,000 rows, so this workout arrived with its first
   * two sets and nothing else — and saving would have deleted the rest. The
   * editor reads the workout on its own now; this counts what it got.
   */
  await expect(
    page.getByTestId(`history-edit-${seeded.workoutId}`).getByLabel(/^Reps for /)
  ).toHaveCount(seeded.setCount)
  await page.getByLabel(`Reps for ${seeded.liftName} set 5`).fill("1")
  await page.getByTestId(`history-save-${seeded.workoutId}`).click()
  await page.waitForTimeout(3000)

  const after = await page.evaluate(async (ids) => {
    const detail = await (await fetch(`/api/programs/enrollments/${ids.enrollmentId}`)).json()
    const logs = await (await fetch("/api/health/workout?days=3650&include=sets")).json()
    const mine = (logs as { id: string; sets?: { set_kind: string }[] }[]).find((l) => l.id === ids.workoutId)
    return {
      nowAsks: detail.prescription.exercises.find((e: { name: string }) => e.name === ids.liftName)?.sets[0].weight,
      kinds: (mine?.sets ?? []).map((s) => s.set_kind).sort(),
    }
  }, seeded)

  console.log("REVISED", JSON.stringify({ ...seeded, ...after }))
  expect(after.nowAsks, "a missed session must not still be advancing the weight").toBe(seeded.askedAt)
  expect(after.kinds, "the warm-up survives a correction").toContain("warmup")

  await page.evaluate(async (ids) => {
    const d = await (await fetch(`/api/programs/enrollments/${ids.enrollmentId}`)).json()
    for (const l of d.logs ?? []) await fetch(`/api/programs/enrollments/${ids.enrollmentId}/log/${l.id}`, { method: "DELETE" })
    await fetch(`/api/programs/enrollments/${ids.enrollmentId}`, { method: "DELETE" })
    await fetch(`/api/programs/enrollments/${ids.enrollmentId}?permanent=1`, { method: "DELETE" })
  }, seeded)
})

/**
 * DELETING A SESSION MOVES THE WEIGHTS BACK DOWN.
 *
 * The bug: `deleteWorkoutLog` deleted the row and stopped. If the workout
 * answered a program, the weight it advanced you to stayed advanced — you
 * squatted 100 kg on Tuesday, the program moved you to 102.5, you deleted
 * Tuesday as a mistake, and it kept asking for 102.5 from a session that no
 * longer existed. There was no way back by hand: the state a log advanced FROM
 * is not stored.
 *
 * This asserts the number from the server, not from the screen.
 */
test("deleting a program session moves the weights back down", async ({ page }) => {
  test.setTimeout(240000)
  await page.goto("/programs")

  const seeded = await page.evaluate(async () => {
    const live0 = await (await fetch("/api/workouts/live")).json()
    if (live0) await fetch(`/api/workouts/${live0.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const d = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of d.logs ?? []) await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
    const made = await (
      await fetch("/api/programs/enrollments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
    ).json()
    const enrollmentId = made.enrollment.id
    const asked = made.prescription.exercises[0]

    const started = await (
      await fetch("/api/workouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, clientKey: `del-${Date.now()}` }),
      })
    ).json()
    for (const set of asked.sets) {
      await fetch(`/api/workouts/${started.id}/sets`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: asked.exerciseId, exercise: asked.name,
          weight: set.weight, reps: set.reps, setNumber: set.setNumber, kind: "working",
        }),
      })
    }
    await fetch(`/api/workouts/${started.id}/finish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intensity: 3 }),
    })
    const after = await (await fetch(`/api/programs/enrollments/${enrollmentId}`)).json()
    return {
      workoutId: started.id,
      enrollmentId,
      liftName: asked.name,
      askedAt: asked.sets[0].weight,
      advancedTo: after.prescription.exercises.find((e: { name: string }) => e.name === asked.name)?.sets[0].weight,
    }
  })

  expect(seeded.advancedTo, "a full session should have moved the weight up").toBeGreaterThan(seeded.askedAt)

  // Delete it the way a person does: the History tab.
  await page.reload({ waitUntil: "networkidle" })
  await page.getByRole("button", { name: "History" }).first().click()
  page.once("dialog", (d) => void d.accept())
  await page.getByTestId(`history-delete-${seeded.workoutId}`).click()
  await page.waitForTimeout(3000)

  const after = await page.evaluate(async (ids) => {
    const detail = await (await fetch(`/api/programs/enrollments/${ids.enrollmentId}`)).json()
    const logs = await (await fetch("/api/health/workout?days=3650")).json()
    return {
      nowAsks: detail.prescription.exercises.find((e: { name: string }) => e.name === ids.liftName)?.sets[0].weight,
      stillThere: (logs as { id: string }[]).some((l) => l.id === ids.workoutId),
    }
  }, seeded)

  console.log("DELETED", JSON.stringify({ ...seeded, ...after }))
  expect(after.stillThere, "the workout should be gone").toBe(false)
  expect(after.nowAsks, "a deleted session must not still be advancing the weight").toBe(seeded.askedAt)
})
