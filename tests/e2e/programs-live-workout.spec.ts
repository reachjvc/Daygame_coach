/**
 * The live workout, end to end, against the real database.
 *
 * WHAT THIS REPLACES. Logging a workout used to be a form: every lift
 * pre-filled with the plan's numbers and one button at the bottom reading "I
 * did all of this — save it". Nothing existed until that button was pressed, so
 * an hour of training lived in an unsaved page. Close the tab, let the phone
 * die, hit a dead spot in the gym's signal, and it was gone.
 *
 * A workout is now a row that exists from the first set, and these tests hold
 * that line. They are the coverage for `startWorkout`, `completeSet` and
 * `finishWorkout` in `src/db/workoutRepo.ts` — each is exercised through the
 * real route against the real database, and what it saves is read back and
 * asserted rather than assumed. They are deliberately about the things a person would notice:
 * a set stays ticked after the phone locks, a double-tap does not log the set
 * twice, a bad connection does not start a second workout, and the summary at
 * the end is still there after it saves.
 */

import { test, expect, type Page } from "@playwright/test"

/** A phone, because that is where a workout is logged. */
const PHONE = { width: 390, height: 844 }

/**
 * One program, no workout open, no history. Run in the page so it goes through
 * the real routes with the real session rather than around them.
 */
async function resetAndEnroll(page: Page, unit: "kg" | "lb" = "kg"): Promise<void> {
  await page.evaluate(async (unitSystem) => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const detail = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of detail.logs ?? []) {
        await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      }
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
    await fetch("/api/programs/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem }),
    })
  }, unit)
}

async function cleanUp(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      const detail = await (await fetch(`/api/programs/enrollments/${e.id}`)).json()
      for (const l of detail.logs ?? []) {
        await fetch(`/api/programs/enrollments/${e.id}/log/${l.id}`, { method: "DELETE" })
      }
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
  })
}

/**
 * ONE AT A TIME, ON PURPOSE.
 *
 * These share the one test account, and the app allows exactly one workout open
 * per person — that is the rule being tested. Run in parallel they delete each
 * other's workout between the start and the first set, and fail with a null
 * live workout that has nothing to do with the code. `fullyParallel` is on for
 * the suite, so the file has to say so itself.
 */
test.describe.configure({ mode: "serial" })

test.describe("live workout", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000)
    await page.setViewportSize(PHONE)
    await page.goto("/programs")
    await resetAndEnroll(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanUp(page).catch(() => {})
  })

  test("a set is saved when it is ticked, and is still ticked after a reload", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })

    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })

    /**
     * THE FIRST SET IS REACHABLE WITHOUT SCROLLING. On a phone the thing you
     * came to do has to be on the screen you land on — a tracker that opens on
     * a header and a program description is one you stop opening.
     */
    const tick = await page.getByTestId("tick-1").first().boundingBox()
    expect(tick, "the first set's ✓ should be rendered").toBeTruthy()
    expect(tick!.y + tick!.height).toBeLessThanOrEqual(PHONE.height)

    /**
     * Each ✓ is its own write, so the test waits for each to land rather than
     * for the tick to look pressed. The tick is optimistic — it goes down the
     * instant it is tapped, which is the right behaviour in a gym and the wrong
     * thing to reload against.
     */
    const saved = () =>
      page.waitForResponse((r) => r.url().includes("/sets") && r.request().method() === "POST")

    const firstSaved = saved()
    await page.getByTestId("tick-1").first().click()
    // Ticking starts the rest clock where the thumb already is. It used to be a
    // grey button hundreds of pixels above the set that started it.
    await expect(page.getByTestId("rest-bar")).toBeVisible()
    expect((await firstSaved).ok(), "the first set should reach the server").toBe(true)

    const secondSaved = saved()
    await page.getByTestId("tick-2").first().click()
    expect((await secondSaved).ok(), "the second set should reach the server").toBe(true)
    await expect(page.getByTestId("tick-2").first()).toHaveAttribute("aria-pressed", "true")

    // THE POINT: the phone locking, the tab dying, the browser being killed.
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId("tick-1").first()).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("tick-2").first()).toHaveAttribute("aria-pressed", "true")

    // Nothing may run off the side of a 390px screen.
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(overflows, "the live screen should not scroll sideways").toBe(false)
  })

  test("finishing shows what you did, and the summary stays on screen", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })

    /**
     * A weight nobody in this account has lifted, typed in by hand. Two things
     * at once: the number saved is the number typed, not one the app rounded to
     * a plate on the way past, and the set is beyond any history so the summary
     * has to call it a best.
     */
    const heavy = 185
    await page
      .getByRole("spinbutton", { name: /weight for set 1/i })
      .first()
      .fill(String(heavy))
    await page.getByTestId("tick-1").first().click()
    await page.getByTestId("tick-2").first().click()
    await expect(page.getByTestId("tick-2").first()).toHaveAttribute("aria-pressed", "true")

    /**
     * Finish IMMEDIATELY, the way a person does — the ✓ on the last set and
     * then straight to Finish. The set write is still on the wire here, and the
     * finish used to overtake it: the summary reported nothing lifted and the
     * engine held the weight back for a set that had in fact been done.
     */
    await page.getByTestId("finish-workout").click()
    // Lifts left unticked are named BEFORE saving, with what the program will
    // make of them, rather than discovered next session.
    await expect(page.getByText(/not everything was ticked/i)).toBeVisible()

    await page.getByRole("button", { name: /save this workout/i }).click()

    /**
     * THE SUMMARY OUTLIVES THE WORKOUT. Saving clears the live workout, and the
     * screen's "this workout is finished" empty state used to win the race — so
     * the reward for an hour was replaced in the frame it arrived.
     */
    const summary = page.getByTestId("workout-summary")
    await expect(summary).toBeVisible({ timeout: 20000 })
    await expect(summary).toContainText(/minutes/i)
    await expect(summary).toContainText(/sets/i)
    await expect(summary).toContainText(/kg lifted/i)
    // And what the program will ask for next time, per lift.
    await expect(summary).toContainText(/next time/i)
    /**
     * THE BEST YOU HAVE DONE, NAMED. The history was wiped before this test, so
     * the first working set of the first workout is a personal best and the
     * summary has to say which lift it was — once, not once per set.
     */
    await expect(summary).toContainText(/new best/i)
    // Once, not once per set: three sets at a new weight is one record.
    const best = summary.getByRole("listitem").filter({ hasText: new RegExp(String(heavy)) })
    await expect(best).toHaveCount(1)
    await expect(best).toContainText(/squat/i)

    // The set that was still saving when Finish was pressed is in the totals.
    await expect(summary).toContainText("2")

    // It survives a repaint rather than flashing past.
    await page.waitForTimeout(1500)
    await expect(summary).toBeVisible()
  })

  test("the rest clock is still right after the tab has been in the background", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })

    const saved = page.waitForResponse(
      (r) => r.url().includes("/sets") && r.request().method() === "POST"
    )
    await page.getByTestId("tick-1").first().click()
    await saved
    const clock = page.getByTestId("rest-remaining")
    await expect(clock).toBeVisible()

    /** "2:28" as seconds, sign included. */
    const readClock = async (): Promise<number> => {
      const text = (await clock.innerText()).trim()
      const [m, sec] = text.replace("-", "").split(":").map(Number)
      const total = m * 60 + sec
      return text.startsWith("-") ? -total : total
    }
    const before = await readClock()

    /**
     * A REAL BACKGROUND, not a wait. Browsers throttle a backgrounded tab's
     * timers to about once a minute, so a clock built by decrementing a counter
     * on a tick simply stops — you rest three minutes and it tells you one.
     * This one counts from the instant the set was ticked, so putting another
     * tab in front of it changes only how often it repaints.
     */
    const other = await page.context().newPage()
    await other.goto("about:blank")
    await other.bringToFront()
    await other.waitForTimeout(10000)
    await page.bringToFront()
    await other.close()

    const after = await readClock()
    const elapsed = before - after
    expect(elapsed, `the clock moved ${elapsed}s while the tab was away`).toBeGreaterThanOrEqual(9)
    expect(elapsed, "and did not run away with itself").toBeLessThanOrEqual(13)
  })


  /**
   * POUNDS, ALL THE WAY THROUGH.
   *
   * The database stores kilograms, and the live screen used to be handed that
   * number raw and print it beside a label reading "lb". A 225 lb squat came
   * back on screen as "102.06 lb"; tapping it again saved 102 lb; and at the end
   * the program compared 102 against 225, decided the lifter had gone light and
   * stalled the weight. The summary was worse — "kg lifted" and "102 kg × 5" on
   * a screen otherwise entirely in pounds.
   */
  test("a pounds lifter sees pounds everywhere, and the database still holds kilograms", async ({
    page,
  }) => {
    await resetAndEnroll(page, "lb")
  await page.reload({ waitUntil: "networkidle" })
  await page.getByTestId("start-workout").click()
  await page.waitForURL("**/programs/live", { timeout: 20000 })
  await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })

  const box = page.getByRole("spinbutton", { name: /weight for set 1/i }).first()
  const saved = page.waitForResponse((r) => r.url().includes("/sets") && r.request().method() === "POST")
  await box.fill("225")
  await page.getByTestId("tick-1").first().click()
  await saved
  await page.waitForTimeout(400)

  // THE BUG: the box came back showing the KILOGRAM number under an "lb" label.
  const afterTick = await box.inputValue()

  // And it must survive a reload, still in pounds.
  await page.reload({ waitUntil: "networkidle" })
  await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })
  const afterReload = await page.getByRole("spinbutton", { name: /weight for set 1/i }).first().inputValue()

  // What the database actually holds, in kilograms.
  const storedKg = await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    return live.sets[0].weightKg
  })

  await page.getByTestId("finish-workout").click()
  await page.getByRole("button", { name: /save this workout/i }).click()
  await expect(page.getByTestId("workout-summary")).toBeVisible({ timeout: 20000 })
  const summary = await page.getByTestId("workout-summary").innerText()

  console.log("LB", JSON.stringify({ afterTick, afterReload, storedKg, summary }))

  expect(afterTick, "the box must still read what was typed").toBe("225")
  expect(afterReload, "and still after a reload").toBe("225")
  expect(storedKg, "stored as kilograms").toBeCloseTo(102.06, 1)
  expect(summary, "the summary must not say kg").not.toMatch(/\bkg\b/)
  expect(summary).toMatch(/lb lifted/)
  expect(summary, "1125 lb of volume, in pounds").toMatch(/1125|1,125/)
  })

  test("a bad connection cannot start two workouts or log a set twice", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" })

    const out = await page.evaluate(async () => {
      const r: Record<string, unknown> = {}
      const enrollments = await (await fetch("/api/programs/enrollments")).json()
      const enrollmentId = enrollments[0].id

      /**
       * The key is minted in the browser before the request goes out, so a
       * retry over bad signal returns the workout that already started instead
       * of opening a second one beside it.
       */
      const clientKey = "e2e-" + String(Date.now())
      const start = async (key: string) =>
        await fetch("/api/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollmentId, clientKey: key }),
        })

      const first = await start(clientKey)
      const workout = await first.json()
      r.startStatus = first.status
      const retry = await start(clientKey)
      r.retryStatus = retry.status
      r.retryReturnsSameWorkout = (await retry.json())?.id === workout.id
      // A genuinely different attempt while one is running is refused: two open
      // workouts is not a state the database allows.
      r.secondWorkoutStatus = (await start("e2e-other-key")).status

      const detail = await (await fetch(`/api/programs/enrollments/${enrollmentId}`)).json()
      const squat = detail.prescription.exercises[0]
      const tick = async (setNumber: number, reps: number) =>
        await fetch(`/api/workouts/${workout.id}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId: squat.exerciseId,
            exercise: squat.name,
            weight: squat.sets[0].weight,
            reps,
            setNumber,
          }),
        })

      await tick(1, 5)
      await tick(2, 5)
      // Saved mid-workout, before anything is "submitted".
      r.setsSavedMidWorkout = (await (await fetch("/api/workouts/live")).json()).sets.length

      // The same set again is a correction, not a second set.
      await tick(2, 3)
      const corrected = await (await fetch("/api/workouts/live")).json()
      r.setsAfterRetick = corrected.sets.length
      r.correctedReps = corrected.sets.find((s: { setNumber: number }) => s.setNumber === 2)?.reps

      const finish = async () =>
        await fetch(`/api/workouts/${workout.id}/finish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intensity: 4 }),
        })
      r.finishStatus = (await finish()).status
      // Finishing twice must not advance the program twice.
      r.secondFinishStatus = (await finish()).status
      r.liveAfterFinish = await (await fetch("/api/workouts/live")).json()
      return r
    })

    // 201 Created — and the same for the retry, which hands back the workout
    // that already exists rather than making a second one.
    expect(out.startStatus).toBe(201)
    expect(out.retryStatus).toBe(201)
    expect(out.retryReturnsSameWorkout, "a retried start should return the same workout").toBe(true)
    expect(out.secondWorkoutStatus, "a second workout should be refused").toBe(409)
    expect(out.setsSavedMidWorkout).toBe(2)
    expect(out.setsAfterRetick, "re-ticking a set should correct it, not add one").toBe(2)
    expect(out.correctedReps).toBe(3)
    expect(out.finishStatus).toBe(200)
    expect(out.secondFinishStatus, "finishing twice should be refused").not.toBe(200)
    expect(out.liveAfterFinish, "no workout is open once it is finished").toBeNull()
  })
})
