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
import { openTab } from "./helpers/trainingTabs"
import { seedFinishedWorkout, deleteWorkoutsNamed } from "./helpers/seedWorkout"

test.describe.configure({ mode: "serial" })

test("shows what each workout was, and what the weeks added up to", async ({ page }) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto("/programs")
  // Seed a couple of real workouts so both tabs have something to show.
  const made: string[] = []
  for (const d of ["2026-09-01", "2026-09-03", "2026-09-05"]) {
    made.push(
      await seedFinishedWorkout(page, {
        startedAt: `${d}T10:00:00.000Z`,
        endedAt: `${d}T10:55:00.000Z`,
        sets: [
          { exercise: "ZZHist Squat", weightKg: 60, reps: 5, setNumber: 1, kind: "warmup" },
          { exercise: "ZZHist Squat", weightKg: 120, reps: 5, setNumber: 2 },
          { exercise: "ZZHist Bench", weightKg: 90, reps: 5, setNumber: 3 },
        ],
      })
    )
  }
  expect(made.length, "seeding must work").toBe(3)

  await page.reload({ waitUntil: "networkidle" })

  await openTab(page, "history")
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

  await openTab(page, "progress")
  await expect(page.getByTestId("week-dots")).toBeVisible({ timeout: 20000 })
  /**
   * WAITING FOR THE BESTS SEPARATELY, and this changed on purpose.
   *
   * "Your bests" used to be worked out in the browser from the 365 days this
   * screen had already loaded — which is why it meant "your bests this year"
   * and gave a different answer from the finish summary for the same set. It is
   * now one server read over ALL of your training, so it lands on its own
   * schedule and `week-dots` no longer implies it is here.
   */
  await expect(page.getByTestId("lift-bests")).toBeVisible({ timeout: 20000 })
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
await deleteWorkoutsNamed(page, "ZZEdit")
const id = await seedFinishedWorkout(page, {
  sets: [
    { exercise: "ZZEdit Press", weightKg: 100, reps: 5, setNumber: 1 },
    { exercise: "ZZEdit Press", weightKg: 100, reps: 5, setNumber: 2 },
  ],
})

await page.reload({ waitUntil: "networkidle" })
await openTab(page, "history")
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
  await openTab(page, "history")
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
  await openTab(page, "history")
  // Delete lives inside the workout now, not on the row — a destructive control
  // does not belong beside the one you tap 141 times.
  await page.getByTestId(`history-row-${seeded.workoutId}`).click()
  /**
   * THE APP'S OWN DIALOG, not the browser's.
   *
   * These two tests registered a `page.once("dialog")` handler and clicked
   * delete — which was right while this was a `window.confirm`. It became a
   * themed `Dialog` on 2026-09-22 ("the last three browser confirm() boxes in
   * training") and the handler then waited for a native box that never comes:
   * the click opened the dialog, nothing confirmed it, and the assertion
   * "the workout should be gone" failed. Both have been red since that commit.
   */
  await page.getByTestId(`history-delete-${seeded.workoutId}`).click()
  await page.getByTestId("confirm-delete-workout").click()
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

/**
 * DELETING A SESSION ON A PROGRAM YOU EDITED AFTER STARTING IT.
 *
 * WHAT WENT WRONG, in plain language. Editing a program after starting it left
 * no record of what the week had looked like, so replaying its history ran every
 * earlier session against TODAY's week — and for a week you wrote yourself, the
 * shell the program is filed under has one placeholder day nobody has weights
 * for. The replay threw. The delete had already committed, so the session went
 * and the weights stayed advanced by it, and the screen said the delete had
 * failed. Three statements, all true, and the result was nonsense.
 *
 * This is the whole path at once: build a week, start it, add a lift to it,
 * train twice, delete a session. The assertions read the numbers back from the
 * server, not off the screen.
 *
 * It cleans up ONLY what it made. The shared training account carries a seeded
 * year of workouts that later phases measure against.
 */
test("deleting a session on a program edited after it started moves the weights back", async ({ page }) => {
  test.setTimeout(240000)
  await page.goto("/programs")

  const lift = (id: string, name: string) => ({
    id,
    name,
    metricType: "load" as const,
    scheme: { kind: "linear" as const, sets: 5, reps: 5 },
    progression: {
      kind: "linear_load" as const,
      incrementKg: 2.5,
      incrementLb: 5,
      deloadAfterFails: 3,
      deloadPct: 0.1,
    },
  })

  const seeded = await page.evaluate(
    async (built) => {
      // A workout left open by an earlier spec would refuse every end below.
      const live0 = await (await fetch("/api/workouts/live")).json()
      if (live0) await fetch(`/api/workouts/${live0.id}`, { method: "DELETE" })

      const twoLifts = {
        kind: "linear_rotation",
        days: [{ id: "d1", label: "Full body", exercises: [built.squat, built.bench] }],
      }
      const made = await (
        await fetch("/api/programs/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId: "custom",
            level: "intermediate",
            unitSystem: "kg",
            customSchedule: twoLifts,
            workingWeights: { zzsquat: 100, zzbench: 60 },
            label: "ZZEdited week",
          }),
        })
      ).json()
      if (!made?.enrollment?.id) return { error: made?.error ?? "enrol failed" }
      const enrollmentId = made.enrollment.id

      const threeLifts = {
        kind: "linear_rotation",
        days: [
          { id: "d1", label: "Full body", exercises: [built.squat, built.bench, built.facepull] },
        ],
      }

      /**
       * ONE SESSION, THEN THE EDIT, THEN A SECOND — in that order, because the
       * order is the whole point.
       *
       * The fault this test exists for is a session logged BEFORE a lift
       * existed. Editing first would put the face pull in both sessions, and
       * then deleting one would simply walk it back a step — which the replay
       * managed even when it was broken. Only a remaining session that predates
       * the lift forces the replay to know which schedule was in force when,
       * and that is what used to throw.
       */
      const ids: string[] = []
      for (let i = 0; i < 2; i++) {
        if (i === 1) {
          // THE EDIT. A third lift, added after the program was already
          // running — the lift that had no starting weight to replay from.
          const edited = await fetch(`/api/programs/enrollments/${enrollmentId}/schedule`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customSchedule: threeLifts, workingWeights: { zzfacepull: 20 } }),
          })
          if (!edited.ok) return { error: (await edited.json().catch(() => null))?.error ?? "edit failed" }
        }
        const detail = await (await fetch(`/api/programs/enrollments/${enrollmentId}`)).json()
        const started = await (
          await fetch("/api/workouts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enrollmentId, clientKey: `edit-del-${i}-${Date.now()}` }),
          })
        ).json()
        for (const ex of detail.prescription.exercises) {
          for (const set of ex.sets) {
            await fetch(`/api/workouts/${started.id}/sets`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                exerciseId: ex.exerciseId,
                exercise: ex.name,
                weight: set.weight,
                reps: set.reps,
                setNumber: set.setNumber,
                kind: "working",
              }),
            })
          }
        }
        await fetch(`/api/workouts/${started.id}/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intensity: 3 }),
        })
        ids.push(started.id)
      }

      const after = await (await fetch(`/api/programs/enrollments/${enrollmentId}`)).json()
      const weight = (name: string) =>
        after.prescription.exercises.find((e: { name: string }) => e.name === name)?.sets[0].weight
      return {
        enrollmentId,
        lastWorkoutId: ids[1],
        squatNow: weight("ZZSquat"),
        faceNow: weight("ZZFace Pull"),
      }
    },
    { squat: lift("zzsquat", "ZZSquat"), bench: lift("zzbench", "ZZBench"), facepull: lift("zzfacepull", "ZZFace Pull") }
  )

  expect(seeded.error, "seeding must work").toBeUndefined()
  // Two clean sessions from 100 kg at 2.5 kg a time.
  expect(seeded.squatNow, "two clean sessions should have moved the squat up twice").toBe(105)
  // The added lift trained once, in session two — it did not exist for session one.
  expect(seeded.faceNow, "the added lift should have moved once from 20").toBe(22.5)

  /**
   * THE SECOND SESSION, not the first — and the reason matters.
   *
   * The engine ratchets from what was actually LIFTED: session two was done at
   * 102.5, so removing session one leaves the squat exactly where session two
   * put it. That assertion would pass whether or not the replay worked. Removing
   * the last session is the one that has a different right answer, so it is the
   * one worth asserting. (The plan wrote "the first"; this is the same code path
   * with an assertion that can actually fail.)
   */
  await page.reload({ waitUntil: "networkidle" })
  await openTab(page, "history")
  await page.getByTestId(`history-row-${seeded.lastWorkoutId}`).click()
  // The app's own dialog, as above.
  await page.getByTestId(`history-delete-${seeded.lastWorkoutId}`).click()
  await page.getByTestId("confirm-delete-workout").click()
  await page.waitForTimeout(3000)

  const after = await page.evaluate(async (ids) => {
    const detail = await (await fetch(`/api/programs/enrollments/${ids.enrollmentId}`)).json()
    const logs = await (await fetch("/api/health/workout?days=3650")).json()
    const weight = (name: string) =>
      detail.prescription.exercises.find((e: { name: string }) => e.name === name)?.sets[0].weight
    return {
      stillThere: (logs as { id: string }[]).some((l) => l.id === ids.lastWorkoutId),
      squatNow: weight("ZZSquat"),
      faceNow: weight("ZZFace Pull"),
    }
  }, seeded)

  console.log("EDITED-DELETE", JSON.stringify({ ...seeded, ...after }))
  expect(after.stillThere, "the session should be gone").toBe(false)
  // One session left, so the squat has moved once rather than twice — and the
  // lift the edit added is back at the 20 kg the edit gave it, which is the
  // number that used to make the whole replay throw instead.
  expect(after.squatNow, "the weights should have moved back by one session").toBe(102.5)
  expect(after.faceNow, "the added lift is back at the weight the edit gave it").toBe(20)

  // Only what this test made.
  await page.evaluate(async (ids) => {
    const d = await (await fetch(`/api/programs/enrollments/${ids.enrollmentId}`)).json()
    for (const l of d.logs ?? [])
      await fetch(`/api/programs/enrollments/${ids.enrollmentId}/log/${l.id}`, { method: "DELETE" })
    await fetch(`/api/programs/enrollments/${ids.enrollmentId}`, { method: "DELETE" })
    await fetch(`/api/programs/enrollments/${ids.enrollmentId}?permanent=1`, { method: "DELETE" })
  }, seeded)
})

/**
 * EVERY CONTROL ON THESE TWO TABS IS THUMB-SIZED, MEASURED AT 390 px.
 *
 * The route sweep visits `/programs` and finds it clean — but History and
 * Progress are TABS, and their controls are not in the page until somebody
 * opens them. So the sweep has never seen the filter, the month toggles, the
 * per-set delete or the export button, and "/programs owes nothing" was a
 * statement about the Today tab.
 *
 * A class list is not a measurement; this reads the rendered boxes.
 */
test("every control on History and Progress is thumb-sized", async ({ page }) => {
  test.setTimeout(240000)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto("/programs")

  const seeded = await seedFinishedWorkout(page, {
    startedAt: "2026-09-02T10:00:00.000Z",
    sets: [{ exercise: "ZZTap Squat", weightKg: 100, reps: 5, setNumber: 1 }],
  })

  try {
    for (const tab of ["history", "progress"] as const) {
      await openTab(page, tab)
      /**
       * WAIT FOR THE TAB'S OWN CONTENT. Both tabs are lazy, and the first
       * version of this test measured the Suspense fallback — nine chrome
       * controls, no tab content, and a pass that meant nothing. It only
       * showed up because I planted a 32px control and the test did not
       * notice.
       */
      await expect(
        page.getByTestId(tab === "history" ? "workout-history" : "week-dots")
      ).toBeVisible({ timeout: 30000 })

      /** Everything a finger is meant to hit, on the tab that is showing. */
      const tooSmall = await page.evaluate(() => {
        const out: string[] = []
        for (const el of document.querySelectorAll("button, a[href], [role=combobox], select, input")) {
          const box = el.getBoundingClientRect()
          if (box.width === 0 || box.height === 0) continue
          // Only what is actually on screen: the other tab is rendered and
          // hidden so its state survives a switch.
          if (el.closest("[hidden]")) continue
          if (box.height < 44) {
            out.push(`${el.tagName}${el.getAttribute("data-testid") ?? ""} ${Math.round(box.height)}px`)
          }
        }
        return out
      })
      expect(tooSmall, `${tab}: ${tooSmall.join(", ")}`).toEqual([])

      const tooSmallText = await page.evaluate(() => {
        const out: string[] = []
        for (const el of document.querySelectorAll("*")) {
          if (el.closest("[hidden]")) continue
          if (!el.textContent?.trim() || el.children.length > 0) continue
          const size = parseFloat(getComputedStyle(el).fontSize)
          if (size < 12) out.push(`${el.tagName} ${size}px: ${el.textContent.trim().slice(0, 20)}`)
        }
        return out
      })
      expect(tooSmallText, `${tab}: ${tooSmallText.join(", ")}`).toEqual([])
    }
  } finally {
    await deleteWorkoutsNamed(page, "ZZTap Squat").catch(() => {})
    void seeded
  }
})
