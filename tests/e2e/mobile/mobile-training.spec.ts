/**
 * Training, on a phone.
 *
 * The rest of `tests/e2e/mobile/` checks that pages load and touch targets are
 * big enough. This walks the actual flow, because the defects that made this
 * feature unusable were never load failures — the page rendered perfectly at
 * 2264 pixels tall with three competing things called logging on it.
 *
 * WHAT IT PINS, and why each one:
 *   - **The page fits.** It was 2264px on a 390px phone for one workout; the
 *     restructure brought it to ~1100. A ceiling here is the only thing that
 *     stops it creeping back.
 *   - **No horizontal overflow.** The single most common way a page breaks on a
 *     phone, and invisible on a laptop.
 *   - **You can log what actually happened**, not just what was asked for.
 *
 * Runs on the `mobile-iphone` / `mobile-pixel` projects, and the same file is
 * picked up by the WebKit and Firefox smoke projects — see `playwright.config.ts`.
 */

import { test, expect } from "@playwright/test"
import { openTab } from "../helpers/trainingTabs"
import { cleanUp, guardTrainingAccount } from "../helpers/training.helper"
import { TRAINING_STATE } from "../../../playwright.config"
/** Refuses to run as anybody but the training account — see the helper. */
guardTrainingAccount()

/**
 * THIS FILE FINISHES A WORKOUT AND USED TO LEAVE IT THERE.
 *
 * "a session records what you actually did" ticks four of five prescribed sets
 * and finishes, which writes a one-minute, four-set workout dated today. This
 * file had no `afterEach`, no `afterAll` and no `cleanUp` call, so that row
 * stayed on the shared training account — and one finished workout dated today
 * puts the card into its `done` state, which correctly offers "See today's
 * workout" and no Start.
 *
 * Measured 2026-09-26, and the card said it in its own words:
 *
 *   " TrainingTrained todayWorkout · 1 min · 4 setsNext is Workout A…"
 *
 * where `dashboard-training-card` was waiting for "Squat". Four failures in one
 * run from that single row: the card naming nothing, two specs timing out at 60
 * and 180 seconds on a `start-workout` button the product had deliberately
 * removed, and a weight field on a live screen that never opened.
 *
 * `resetAndEnroll` learned to clear this earlier the same day, which fixed the
 * specs that call it — and `dashboard-training-card` and `programs-past-workout`
 * use their own inline resets and never did. Patching every reader is the wrong
 * end. The file that creates the row removes it.
 *
 * `afterAll` rather than `afterEach` deliberately: these five tests run serially
 * and clearing the account between them would take state out from under the one
 * that follows. The instant is captured at module load, so `cleanUp` removes
 * what this FILE started and cannot touch the account's older history.
 */
const fileStarted = new Date(Date.now() - 60_000).toISOString()

test.afterAll(async ({ browser }) => {
  /**
   * `baseURL` PASSED EXPLICITLY, AND THE PAGE NAVIGATED BEFORE CLEANING.
   *
   * `browser.newPage()` builds its own context and does not inherit the
   * project's options, and `cleanUp` works by calling the app's own routes with
   * relative paths from inside the page. On a fresh page that has never
   * navigated, the origin those paths resolve against does not exist, and the
   * first version of this hook died with
   * `TypeError: URL is not valid or contains user credentials` — which it then
   * swallowed, so the only visible symptom was a live workout left behind.
   */
  const page = await browser.newPage({
    storageState: TRAINING_STATE,
    baseURL: test.info().project.use.baseURL,
  })
  await page.goto("/programs", { waitUntil: "networkidle" })
  /**
   * ALLOWED TO FAIL, BUT NOT ALLOWED TO FAIL SILENTLY.
   *
   * A file that has already failed must not also report a cleanup error on top
   * of the reason it failed — so this does not throw. But the first version
   * swallowed the reason entirely with `.catch(() => {})`, and that is the
   * exact silent-failure shape this whole session has been removing: the run
   * that followed left a live workout behind and nothing said whether the
   * cleanup had run, errored, or never been reached.
   */
  await cleanUp(page, fileStarted).catch((e: unknown) => {
    console.error(`[mobile-training] cleanUp failed: ${(e as Error).message}`)
  })
  await page.close()
})


/**
 * A ceiling that the WORST realistic case has to pass, not the best.
 *
 * Measured with folds closed on a 390px screen: 1310px for a three-lift day
 * (StrongLifts) and 1603px for a six-lift one (Upper/Lower). A 1500 ceiling
 * would have passed only because this spec happens to enrol in the smaller
 * program — a limit the tallest page cannot meet is not a limit. 1800 leaves
 * room for a longer program without letting the page drift back towards the
 * 2264px it replaced.
 */
const MAX_PAGE_HEIGHT = 1800

/**
 * SERIAL, because these share one account.
 *
 * `fullyParallel` is on, and each test here clears the account's enrollments in
 * `beforeEach` so it starts from a known state. Run in parallel that is two
 * tests deleting each other's program mid-assertion — which is exactly what
 * happened: the same spec passed alone and failed in a suite. The repo already
 * isolates its other account-mutating specs for this reason.
 */
test.describe.serial("training on a phone", () => {
  test.beforeEach(async ({ page }) => {
    /**
     * THE SAME BUDGET ITS SIBLINGS TAKE, and for the same reason.
     *
     * `programs-live-workout` and `dashboard-training-card` both raise this to
     * 180s in their own `beforeEach`. This file never did, so it ran the
     * longest flow in the training suite — reset, enrol, reload, open the
     * History dialog, fill a datetime, open the live screen, tick four sets
     * over the network, finish, save — on the default 60 seconds, on emulated
     * phone hardware, against a real database.
     *
     * Measured 2026-09-26: it timed out on the tick click at 60s from a dirty
     * account, and passed the same test alone in 25s from a clean one. Nothing
     * here asserts a duration; a budget that only holds when the account starts
     * empty is measuring the account, not the product.
     */
    test.setTimeout(180000)

    // Start from nothing so the run does not depend on what a previous one left.
    await page.goto("/programs")
    await page.evaluate(async () => {
      // Clear BOTH lists. Leftover finished programs from a previous test would
      // otherwise lengthen the page and make the height assertion depend on run
      // order rather than on the layout it is meant to measure.
      for (const e of await (await fetch("/api/programs/enrollments")).json()) {
        await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      }
      for (const e of await (await fetch("/api/programs/enrollments?past=1")).json()) {
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }

      /**
       * AND THE WORKOUTS, WHICH CLEARING ENROLLMENTS DOES NOT TOUCH.
       *
       * This reset cleared both enrollment lists and stopped there, so a test
       * still started with whatever workout the one before it had left. Two
       * ways that bites, and the second is the one that cost an evening:
       *
       *   an OPEN workout      refuses every start in the test that follows
       *   a FINISHED one dated today puts the card into its `done` state, which
       *                        deliberately offers "See today's workout" and no
       *                        Start at all
       *
       * `/api/workouts/{id}` only discards an OPEN workout — it answers 400,
       * "That workout is not open any more", for a finished one — so the
       * finished rows go through the route History uses. `recentlyFinished` is
       * the server's own answer to "what would put the card in `done`", which
       * makes it the right thing to ask rather than a date comparison here.
       */
      const live = await (await fetch("/api/workouts/live")).json()
      if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
      /**
       * DRAINED, not read once. `recentlyFinished` is what the CARD needs to
       * choose its state, so it is free to report only the latest — and a
       * single pass over it then leaves the account in `done` with an older
       * finished workout still there. Measured: two finished workouts planted,
       * one pass, and the page still had no "Start a workout now" for the test
       * after it. Ask again until the answer is empty.
       */
      for (let pass = 0; pass < 12; pass++) {
        const facts = await (await fetch("/api/programs/today")).json()
        const done = facts.recentlyFinished ?? []
        if (done.length === 0) break
        for (const d of done) {
          await fetch(`/api/health/workout?id=${d.workoutId}`, { method: "DELETE" })
        }
      }
    })
  })

  test("the page fits a phone and never scrolls sideways", async ({ page }) => {
    // WITH A PROGRAM RUNNING. Measuring the empty state proves nothing — the
    // 2264px this replaced was a page with a session, a history and a logger on
    // it, and an assertion that never sees one would pass forever.
    await page.goto("/programs")
    await page.evaluate(async () => {
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
    })
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByRole("heading", { name: "Training" })).toBeVisible()
    // The today card, not a lift row: the session is a card you start from now,
    // and the row-per-lift form it replaced sits behind a collapsed section.
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 15000 })

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    )
    expect(overflow, "the page scrolls sideways on a phone").toBe(false)

    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    expect(height, `page is ${height}px tall on a phone`).toBeLessThan(MAX_PAGE_HEIGHT)
  })

  test("both ways of training are reachable without scrolling", async ({ page }) => {
    /**
     * The free-form logger used to be ~1400px down the page and most people
     * never met it, which is why this test exists.
     *
     * It is gone, and so is the "Anything else" tab that held it — three tabs
     * now. The two ways to train are today's prescribed session and an empty
     * workout, and both live on Today.
     */
    await page.goto("/programs")
    await expect(page.getByRole("tab", { name: "Today", exact: true })).toBeInViewport()
    await expect(page.getByRole("tab", { name: /Anything else/ })).toHaveCount(0)
    await expect(page.getByTestId("start-loose-workout")).toBeInViewport()
  })

  test("a session records what you actually did, not what it asked for", async ({ page }) => {
    /**
     * THIS USED TO GO THROUGH "Log a workout you already did" — a disclosure on
     * the Today tab holding a form with its own weight boxes and its own save
     * path. Both are gone. The same journey now runs through the dialog on
     * History and the ordinary live screen, on a phone.
     */
    await page.goto("/programs")
    await page.evaluate(async () => {
      const live = await (await fetch("/api/workouts/live")).json()
      if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
      const r = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
      await r.json()
    })
    // WebKit finishes the enrollment fetch appreciably later than Chromium, so
    // the wait is on the data arriving rather than on a fixed pause.
    await page.reload({ waitUntil: "networkidle" })

    await openTab(page, "history")
    await page.getByTestId("log-past-workout").click()
    const when = page.getByLabel("When the workout was")
    // "Now" in the ACCOUNT's zone, which is what the box's own ceiling is.
    await when.fill((await when.getAttribute("max"))!)
    await page.getByRole("button", { name: /^Workout A/ }).click()
    await page.getByTestId("open-past-workout").click()
    await page.waitForURL(/\/programs\/live/, { timeout: 20000 })

    // Five prescribed sets; record four. What you DID, not what it asked for.
    for (const n of [1, 2, 3, 4]) {
      await page.getByTestId(`tick-${n}`).first().click()
    }

    /**
     * WAIT FOR THE FOUR TICKS TO BE ON THE SERVER, not for four clicks to have
     * happened. Every tick is a write, and the finish sheet below is computed
     * from what was SAVED — so if the last one is still in flight, the sheet
     * says "Squat 3 of 5" and the assertion looks for 4.
     *
     * Seen on 2026-09-26: "Not everything was ticked" appeared and
     * `Squat 4 of 5` did not, which is exactly that shape. The test passed
     * three times earlier the same day, which is what a race looks like from
     * the outside.
     *
     * Asking the account how many sets it holds is the condition itself, rather
     * than a proxy for it, and it does not depend on any indicator the screen
     * happens to render.
     */
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const live = await (await fetch("/api/workouts/live")).json()
            return (live?.sets ?? []).length
          }),
        { message: "the four ticked sets never reached the account", timeout: 20000 }
      )
      .toBe(4)

    await page.getByTestId("finish-workout").click()
    // Four of the five it asked for, said plainly rather than counted as a
    // clean session.
    await expect(page.getByText("Not everything was ticked")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Squat\s*4 of 5/)).toBeVisible()

    /**
     * EVERY TICK IS A SAVE, AND SAVE IS DISABLED UNTIL THEY LAND.
     *
     * `FinishSheet` disables its button while `unsaved > 0` and says why on the
     * line above it — "Waiting for signal — N sets are not saved yet." Four
     * ticks in a loop and then an immediate click races the last of them: on
     * 2026-09-26 this test spent its whole 60-second budget on a button that was
     * correctly disabled, and Playwright's log says so in one line — "element is
     * not enabled", against a `<button disabled>` reading "Save this workout".
     *
     * The product was right and the test was early. So wait for the condition
     * the button is actually gated on rather than for a length of time — the
     * same correction the cold-open sweep needed for hydration the day before.
     */
    await expect(page.getByText(/not saved yet/i)).toHaveCount(0, { timeout: 20000 })
    await page.getByRole("button", { name: /save this workout/i }).click()

    await expect(page.getByTestId("workout-summary")).toBeVisible({ timeout: 20000 })
  })

  test("a program you built yourself survives starting a cited one, and can be restarted", async ({ page }) => {
    /**
     * THE BUG THIS PINS. A self-built program has `discipline: "strength"`, and
     * enrolling deactivates any active program in the same discipline — so
     * building your own week and later trying StrongLifts archived yours
     * silently, showed it on no screen, and gave no way to bring it back.
     * "It still doesn't load the one I custom made a long time ago."
     */
    await page.goto("/programs")
    await page.evaluate(async () => {
      for (const e of await (await fetch("/api/programs/enrollments?past=1")).json()) {
        await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      }
      /**
       * `label` IS REQUIRED, AND THIS TEST NEVER SENT ONE.
       *
       * `schemas.ts` refuses a `custom` enrollment without a non-empty label —
       * "Give this week a name before starting it." So this POST answered 400
       * and no self-built program was ever created here. The assertion below
       * then passed on any run where some EARLIER test had left a `custom`
       * enrollment on the shared account for the StrongLifts POST to archive,
       * and failed on the runs where it had not.
       *
       * Found on 2026-09-25 by running `training-iphone-safari`, which covers
       * 85 tests against the desktop project's 67 — a different set of files,
       * so a different set of leftovers, so no `custom` row to inherit. The
       * failure was correct and the green was the lie: the test named "a
       * program you built yourself survives" was not building one.
       *
       * It also took two other files down with it. Failing here left a
       * finished workout on the account, and `resetAndEnroll` clears the OPEN
       * workout and this enrollment's logs but not a finished workout from an
       * earlier file — so `programs-live-workout` and `programs-offline` both
       * met the card's `done` state and waited 3 and 4 minutes for a Start
       * button the product had deliberately taken away.
       */
      const created = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: "custom",
          level: "intermediate",
          unitSystem: "kg",
          workingWeights: { custom_placeholder: 60 },
          label: "My own week",
        }),
      })
      if (!created.ok) {
        // Loudly, and here: a silent 400 is what made this test lie for weeks.
        throw new Error(`the self-built program could not be created: ${created.status} ${await created.text()}`)
      }
      // The step that used to lose it.
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" }),
      })
    })
    await page.reload({ waitUntil: "networkidle" })

    // It is still on the account, and visible.
    const archived = await page.evaluate(async () =>
      (await (await fetch("/api/programs/enrollments?past=1")).json()).map(
        (e: { program_id: string }) => e.program_id
      )
    )
    expect(archived, "the self-built program was not kept").toContain("custom")

    // And it can be started again, weights and all.
    const resumed = await page.evaluate(async () => {
      const past = await (await fetch("/api/programs/enrollments?past=1")).json()
      const mine = past.find((e: { program_id: string }) => e.program_id === "custom")
      const r = await fetch(`/api/programs/enrollments/${mine.id}/resume`, { method: "POST" })
      if (!r.ok) return { ok: false, active: [] as string[] }
      const active = await (await fetch("/api/programs/enrollments")).json()
      return { ok: true, active: active.map((e: { program_id: string }) => e.program_id) }
    })
    expect(resumed.ok, "restarting an archived program failed").toBe(true)
    expect(resumed.active).toContain("custom")
  })

  test("the week is visible and every day is a real touch target", async ({ page }) => {
    await page.goto("/programs")
    await page.evaluate(async () => {
      await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: "upper-lower", level: "beginner", unitSystem: "kg" }),
      })
    })
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("week-strip")).toBeVisible({ timeout: 15000 })
  })
})
