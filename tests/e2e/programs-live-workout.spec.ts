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
import { PHONE, cleanUp, resetAndEnroll } from "./helpers/training.helper"

/**
 * The phone size and the two account-cleaning helpers now live in
 * `helpers/training.helper.ts`: the menus spec needs exactly the same pair,
 * and two copies of "clean the account" is two chances to clean it
 * differently — which shows up as the NEXT spec failing for a reason that has
 * nothing to do with its own code.
 */

/**
 * A lift this account has provably never done, by construction.
 *
 * THE ALTERNATIVE DESTROYED THE ACCOUNT'S HISTORY, and it did it silently. To
 * prove "a first is not a best" a test needs a lift with nothing behind it, and
 * the obvious way to get one is to delete every workout on the account first.
 * That is what an earlier version of these two tests did — and this account
 * carries the seeded training year (roughly 150 sessions, written by
 * `npm run seed:training`) that History, Progress, the month paging and the
 * all-time bests are measured against. One run of this file wiped all of it.
 * The tests passed; the fixture the rest of the suite depends on was gone.
 *
 * A name nobody has lifted is a first with nothing deleted. Every run mints its
 * own, so the same test can prove BOTH halves in one session: the first finish
 * has nothing to beat, the second beats it.
 */
function unlifted(what: string): string {
  return `ZZ ${what} ${Date.now().toString(36)}`
}

/**
 * Add a lift that is not in the 165-entry library, so it carries no library id
 * and is matched by name alone — which is what makes `unlifted` reliable.
 */
async function addOwnLift(page: Page, name: string): Promise<void> {
  await page.getByTestId("add-lift").click()
  await page.getByTestId("add-lift-search").fill(name)
  await page.getByTestId("add-lift-own").click()
  await expect(page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 20000 })
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

/**
 * When the running test began, a minute of slack back.
 *
 * Everything the account gained after this instant is this test's own, because
 * the `training` project runs one worker on one account — which is what lets
 * the cleanup remove a FINISHED workout without going anywhere near the seeded
 * training year.
 */
let startedAt = new Date().toISOString()

test.describe("live workout", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000)
    startedAt = new Date(Date.now() - 60_000).toISOString()
    await page.setViewportSize(PHONE)
    await page.goto("/programs")
    await resetAndEnroll(page)
  })

  test.afterEach(async ({ page }) => {
    // `startedAt` scopes the cleanup to the workouts THIS test opened. Without
    // it a finished workout dated today stays on the account, and the Tracking
    // card's `done` state then offers no Start to the test after this one.
    await cleanUp(page, startedAt).catch(() => {})
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
    /**
     * A lift with no past, minted for this run, so the first finish below has
     * nothing to beat and the second one does — without deleting a single row
     * of the account's training year. See `unlifted`.
     */
    const lift = unlifted("Press")
    await page.reload({ waitUntil: "networkidle" })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })
    await addOwnLift(page, lift)

    /**
     * Typed in by hand, on the lift added on the day — which is the last card
     * on the screen, hence `.last()`. Two things at once: the number saved is
     * the number typed, not one the app rounded to a plate on the way past, and
     * the lift has no history, so the summary has to call it a first.
     */
    const heavy = 185
    await page
      .getByRole("spinbutton", { name: /weight for set 1/i })
      .last()
      .fill(String(heavy))
    await page.getByRole("spinbutton", { name: /reps for set 1/i }).last().fill("5")
    await page.getByTestId("tick-1").last().click()
    await page.getByRole("spinbutton", { name: /weight for set 2/i }).last().fill(String(heavy))
    await page.getByRole("spinbutton", { name: /reps for set 2/i }).last().fill("5")
    await page.getByTestId("tick-2").last().click()
    await expect(page.getByTestId("tick-2").last()).toHaveAttribute("aria-pressed", "true")

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
    /**
     * "Volume (kg)", not "kg lifted". The finish sheet stopped drawing its own
     * figures when the receipt became one component shared with
     * /programs/workout/[id] (Phase 6 step 19) — and this assertion was left
     * on the old wording, so this file has been red since that commit. The
     * browser suite is not in the pre-commit hook, which is how it stayed
     * red quietly.
     */
    await expect(summary).toContainText(/Volume \(kg\)/i)
    // And what the program will ask for next time, per lift.
    await expect(summary).toContainText(/next time/i)

    /**
     * A FIRST IS NOT A BEST — and this used to assert that it was.
     *
     * Nobody has ever lifted this name, so there is nothing to beat and "New
     * best" on it would mean nothing. It is named as a first instead.
     */
    await expect(summary).toContainText(/first time logged/i)
    await expect(summary).toContainText(lift)
    await expect(summary, "nothing to beat is not a best").not.toContainText(/new best/i)

    // The set that was still saving when Finish was pressed is in the totals.
    await expect(summary).toContainText("2")

    // It survives a repaint rather than flashing past.
    await page.waitForTimeout(1500)
    await expect(summary).toBeVisible()

    /**
     * NOW THERE IS A HISTORY, so a heavier set the next session IS a best — and
     * once, not once per set.
     */
    /**
     * THROUGH THE DOOR THAT EXISTS, which is not Start any more.
     *
     * Having trained today, the card offers "See today's workout" and NO Start
     * — deliberately: "offering one on a day somebody has finished invites a
     * second workout for the same session" (`TodayCard`, the `done` state).
     * This half of the test asserted the removed button and had been failing
     * silently since that decision landed; the browser suite is not in the
     * pre-commit hook.
     *
     * A second session on one day is a loose workout, which is both the door
     * the app offers and what a person doing two sessions actually has.
     */
    await page.goto("/programs")
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId("see-todays-workout")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-loose-workout").first().click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    // The same name again. A lift added on the day lives on the workout, not on
    // the program, so the second session has to add it back — and because the
    // name is the same, the first session's sets are the history it beats.
    await addOwnLift(page, lift)

    const heavier = heavy + 5
    await page
      .getByRole("spinbutton", { name: /weight for set 1/i })
      .last()
      .fill(String(heavier))
    await page.getByRole("spinbutton", { name: /reps for set 1/i }).last().fill("5")
    const savedAgain = page.waitForResponse(
      (r) => r.url().includes("/sets") && r.request().method() === "POST"
    )
    await page.getByTestId("tick-1").last().click()
    await savedAgain
    await page.getByTestId("finish-workout").click()
    await page.getByRole("button", { name: /save this workout/i }).click()

    const second = page.getByTestId("workout-summary")
    await expect(second).toBeVisible({ timeout: 20000 })
    /**
     * "Personal bests", which is what the shared receipt calls the section.
     * The finish sheet said "New best" while it drew its own figures; one
     * receipt means one wording, and this assertion was left on the old one.
     */
    await expect(second).toContainText(/personal bests/i)
    const best = second.getByRole("listitem").filter({ hasText: new RegExp(String(heavier)) })
    await expect(best).toHaveCount(1)
    await expect(best).toContainText(lift)
    await expect(second, "the squat is not new any more").not.toContainText(/first time logged/i)
  })

  /**
   * A LIFT YOU HAVE NEVER DONE HAS NOTHING TO BEAT.
   *
   * Add Front Squat on the day, tick one set, finish: this used to come back as
   * "New best — Front Squat", against an empty history. That is not a best, it
   * is a first, and the difference is the whole point of the label.
   */
  test("a lift never done before is 'first time logged', not a new best", async ({ page }) => {
    /**
     * Only the added lift is ticked here, so no other lift gains a history and
     * nothing has to be deleted to make this true. The name is minted for this
     * run, so "never done before" is a fact about the account rather than a
     * hope about the order the tests ran in.
     */
    const lift = unlifted("Landmine Press")
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.getByTestId("add-lift")).toBeVisible({ timeout: 20000 })
    await addOwnLift(page, lift)

    const saved = page.waitForResponse(
      (r) => r.url().includes("/sets") && r.request().method() === "POST"
    )
    const rows = page.getByRole("spinbutton", { name: /weight for set 1/i })
    await rows.last().fill("60")
    await page.getByRole("spinbutton", { name: /reps for set 1/i }).last().fill("8")
    await page.getByTestId("tick-1").last().click()
    await saved

    await page.getByTestId("finish-workout").click()
    await page.getByRole("button", { name: /save this workout/i }).click()

    const summary = page.getByTestId("workout-summary")
    await expect(summary).toBeVisible({ timeout: 20000 })
    await expect(summary).toContainText(/first time logged/i)
    await expect(summary).toContainText(lift)
    await expect(summary).not.toContainText(/new best/i)
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
  // "Volume (lb)" — the shared receipt's own label. The finish sheet said
  // "lb lifted" while it drew its own figures; one receipt, one wording.
  expect(summary).toMatch(/Volume \(lb\)/)
  expect(summary, "1125 lb of volume, in pounds").toMatch(/1125|1,125/)
  })

  /**
   * A WORKOUT THAT BELONGS TO NO PROGRAM. The set-by-set screen could only be
   * opened by starting today's prescribed session, so anything improvised had
   * to be written up afterwards from memory. And a screen that can only record
   * what was prescribed punishes you for the gym being busy: the squat rack is
   * taken, you do front squats, and there was nowhere to put them.
   */
  test("starts with no program, takes a lift added on the day, and keeps it", async ({ page }) => {
  await page.goto("/programs")
  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
  })
  await page.reload({ waitUntil: "networkidle" })
  // ON TODAY, not on a fourth tab. "Anything else" existed to hold this button
  // and a form that is now deleted; the button belongs beside today's session.
  await page.getByTestId("start-loose-workout").click()
  await page.waitForURL("**/programs/live", { timeout: 20000 })

  // An empty workout: nothing prescribed, but a way to fill it.
  await expect(page.getByTestId("add-lift")).toBeVisible({ timeout: 20000 })
  await page.getByTestId("add-lift").click()
  await page.getByTestId("add-lift-search").fill("front squat")
  await page.waitForTimeout(800)
  await page.getByTestId("add-lift-results").getByRole("button").first().click()

  await expect(page.getByText(/front squat/i).first()).toBeVisible({ timeout: 20000 })
  const saved = page.waitForResponse((r) => r.url().includes("/sets") && r.request().method() === "POST")
  await page.getByRole("spinbutton", { name: /weight for set 1/i }).first().fill("60")
  await page.getByRole("spinbutton", { name: /reps for set 1/i }).first().fill("8")
  await page.getByTestId("tick-1").first().click()
  await saved

  // It survives a reload, like every other set.
  await page.reload({ waitUntil: "networkidle" })
  await expect(page.getByText(/front squat/i).first()).toBeVisible({ timeout: 20000 })
  const stillTicked = await page.getByTestId("tick-1").first().getAttribute("aria-pressed")
  console.log("LOOSE", JSON.stringify({ stillTicked }))
  expect(stillTicked).toBe("true")

  await page.evaluate(async () => {
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
  })
  })

  /**
   * A RUN IS A RUN IN THE DATABASE.
   *
   * Two failures in one flow. Starting a workout wrote the literal "weights",
   * so every live run counted as a gym session and the running tiles never
   * moved — and the live screen could not even OPEN for a running plan,
   * because the code that resolves the day asked a plan-of-weeks for its list
   * of days and threw. The `endurance-plan` card rendering is the proof of the
   * second; the `session_type` read back is the proof of the first.
   */
  test("a run started from its program is a run in the database", async ({ page }) => {
    await page.goto("/programs")
    await page.evaluate(async () => {
      const live = await (await fetch("/api/workouts/live")).json()
      if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
      for (const e of await (await fetch("/api/programs/enrollments")).json()) {
        await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: "couch-to-5k",
          level: "beginner",
          unitSystem: "kg",
        }),
      })
    })

    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })

    // The screen opens at all — this is the crash the day-resolution fix closes.
    await expect(page.getByTestId("endurance-plan")).toBeVisible({ timeout: 20000 })

    await page.getByTestId("finish-workout").click()
    await page.getByRole("button", { name: /save this workout/i }).click()
    await expect(page.getByTestId("workout-summary")).toBeVisible({ timeout: 20000 })

    const kinds = await page.evaluate(async () => {
      const logs = await (await fetch("/api/health/workout?days=1")).json()
      return (logs as { session_type: string }[]).map((l) => l.session_type)
    })
    expect(kinds, "a run, not a gym session").toContain("running")
  })

  /**
   * ENDING A PROGRAM YOU ARE MID-WORKOUT ON.
   *
   * Asserted at the API, because the End buttons on /programs still ignore the
   * reply (that is Phase 5's work) — so today a refused End silently looks like
   * nothing happened, which IS the right outcome, just not a visible one. What
   * matters is that the program is still there and the open workout still has
   * something to finish onto.
   */
  test("End is refused while a workout is open on the program, by the API", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" })

    const out = await page.evaluate(async () => {
      const enrollments = await (await fetch("/api/programs/enrollments")).json()
      const enrollmentId = enrollments[0].id
      await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, clientKey: "busy-" + String(Date.now()) }),
      })
      const end = await fetch(`/api/programs/enrollments/${enrollmentId}`, { method: "DELETE" })
      const body = await end.json()
      const stillActive = (await (await fetch("/api/programs/enrollments")).json()).some(
        (e: { id: string }) => e.id === enrollmentId
      )
      return { status: end.status, error: body?.error, stillActive }
    })

    expect(out.status).toBe(409)
    expect(out.error).toBe("Finish or throw away the open workout first.")
    expect(out.stillActive, "the program is still running").toBe(true)
  })

  /**
   * THE SAVE WENT THROUGH AND THE ANSWER NEVER CAME BACK.
   *
   * Playwright lets the request reach the real server and then throws the reply
   * away, which is exactly what a gym basement does. The workout is saved; the
   * browser heard nothing. It used to say "Nothing was finished", show no
   * summary, and leave a used-up start key behind so every later Start was
   * refused too. It now asks the server whether a workout is still open, finds
   * none, and fetches the summary the person earned.
   */
  test("a dropped finish reply still ends in the summary, and Start works afterwards", async ({
    page,
  }) => {
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })

    const saved = page.waitForResponse(
      (r) => r.url().includes("/sets") && r.request().method() === "POST"
    )
    await page.getByTestId("tick-1").first().click()
    await saved

    // The server processes the finish; the page never hears the answer.
    await page.route("**/finish", async (route) => {
      await route.fetch()
      await route.abort()
    })

    await page.getByTestId("finish-workout").click()
    await page.getByRole("button", { name: /save this workout/i }).click()

    await expect(page.getByTestId("workout-summary")).toBeVisible({ timeout: 30000 })
    await page.unroute("**/finish")

    /**
     * AND THE KEY THIS WORKOUT USED IS SPENT AND GONE.
     *
     * That is the mechanism the test is about: the retry key is minted in the
     * browser and was never cleared, so it outlived the workout it opened and
     * every later Start was refused by a unique index.
     *
     * It used to prove this by pressing Start again — which the card no longer
     * offers on a day you have finished a session (`TodayCard`'s `done` state,
     * deliberately: "offering one on a day somebody has finished invites a
     * second workout for the same session"). So the key is read where it
     * lives, and the Start is proved to come back by removing today's workout
     * — which is what tomorrow does anyway.
     */
    const keysAfter = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("live-workout-start-key-v1") ?? "{}")
    )
    expect(Object.keys(keysAfter as Record<string, string>)).toHaveLength(0)

    await page.goto("/programs")
    await page.evaluate(async () => {
      const logs = (await (await fetch("/api/health/workout?days=1")).json()) as { id: string }[]
      for (const l of logs) await fetch(`/api/health/workout?id=${l.id}`, { method: "DELETE" })
    })
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
  })

  /**
   * FINISHED ON THE LAPTOP, STARTING ON THE PHONE.
   *
   * The retry key is minted in the browser and kept until a start succeeds. It
   * was never cleared afterwards, so it outlived the workout it opened: finish
   * that workout anywhere else and this browser's next Start re-used a key the
   * database had already seen, was refused by a unique index, and printed
   * "duplicate key value violates unique constraint" on the card — every tap,
   * for ever, with nothing a person could do about it.
   */
  test("finished on another device, Start on this one still works", async ({ page, browser }) => {
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })

    // The other device: a second browser context on the same account.
    const other = await browser.newContext({ storageState: "tests/e2e/.auth/user.json" })
    const otherPage = await other.newPage()
    await otherPage.goto("/programs")
    await otherPage.evaluate(async () => {
      const live = await (await fetch("/api/workouts/live")).json()
      await fetch(`/api/workouts/${live.id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intensity: 4 }),
      })
    })
    await other.close()

    /**
     * Back on this device, with the used-up key still in its localStorage —
     * and today's session now finished, which the card answers with "See
     * today's workout" rather than a Start. Removing that workout is what
     * tomorrow does; the point of the test is the KEY, which this browser
     * still holds either way.
     */
    await page.goto("/programs")
    await page.evaluate(async () => {
      const logs = (await (await fetch("/api/health/workout?days=1")).json()) as { id: string }[]
      for (const l of logs) await fetch(`/api/health/workout?id=${l.id}`, { method: "DELETE" })
    })
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.locator("body")).not.toContainText("duplicate key")
  })

  /**
   * TWO TAPS IN THE SAME INSTANT.
   *
   * Two tabs, or the Tracking card and the Training page within a second of
   * each other. Both requests found nothing open, both tried to insert, and the
   * loser hit a unique index — whose complaint ("duplicate key value violates
   * unique constraint uq_workout_logs_live") went straight to the screen. The
   * loser is now told a workout is open and handed it, which is the same answer
   * a second tap a moment later gets.
   */
  test("two starts at once open one workout and never show a database message", async ({ page }) => {
    await page.reload({ waitUntil: "networkidle" })

    const out = await page.evaluate(async () => {
      const enrollments = await (await fetch("/api/programs/enrollments")).json()
      const enrollmentId = enrollments[0].id
      const start = (key: string) =>
        fetch("/api/workouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollmentId, clientKey: key }),
        })

      const stamp = String(Date.now())
      const [a, b] = await Promise.all([start(`race-a-${stamp}`), start(`race-b-${stamp}`)])
      const bodies = [await a.json(), await b.json()]
      const live = await (await fetch("/api/workouts/live")).json()
      return {
        statuses: [a.status, b.status].sort(),
        bodies: JSON.stringify(bodies),
        winnerId: live?.id ?? null,
        openWorkoutIds: bodies.map((x) => x?.id ?? x?.workout?.id ?? null),
        codes: bodies.map((x) => x?.code ?? null),
      }
    })

    // One created it; the other was told it was already open.
    expect(out.statuses).toEqual([201, 409])
    expect(out.codes).toContain("already_open")
    expect(out.bodies, "the database's own words must never reach a person").not.toContain(
      "duplicate key"
    )
    // Both replies name the SAME workout, so either tab can just go to it.
    expect(new Set(out.openWorkoutIds).size).toBe(1)
    expect(out.openWorkoutIds[0]).toBe(out.winnerId)
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
      r.finishedWorkoutId = workout.id
      r.finishStatus = (await finish()).status
      /**
       * Finishing twice must not advance the program twice — and must not
       * report a failure either. A second Save is what a lost reply looks like
       * from the browser, and the workout IS saved, so it is answered with the
       * same summary rather than "not open any more".
       */
      const second = await finish()
      r.secondFinishStatus = second.status
      r.secondFinishSummaryId = (await second.json())?.workoutId
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
    expect(out.secondFinishStatus, "a repeat Save returns the same summary").toBe(200)
    expect(out.secondFinishSummaryId, "and it is the same workout's summary").toBe(
      out.finishedWorkoutId
    )
    expect(out.liveAfterFinish, "no workout is open once it is finished").toBeNull()
  })
})
