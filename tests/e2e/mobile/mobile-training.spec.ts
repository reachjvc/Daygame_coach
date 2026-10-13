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
 * It measures at whatever phone its project gives it (it sets no viewport of
 * its own), on the worker's own account (tests/e2e/fixtures/test.ts), which
 * every test empties first.
 */

import { test, expect } from "../fixtures/test"
import { openTab } from "../helpers/trainingTabs"
import { guardTrainingAccount, resetTraining } from "../helpers/training.helper"
/** Refuses to run as anybody but a throwaway fixture account — see the helper. */
guardTrainingAccount()

/**
 * NO `afterAll` CLEANUP ANY MORE. "a session records what you actually did"
 * finishes a workout dated today, and on the SHARED training account that row
 * put the card into its `done` state for every file after this one — four
 * failures in one run, measured 2026-09-26. The account is the worker's own
 * now, and `resetTraining` clears anything finished in the last two days at the
 * start of every training test, so the next test is protected where it begins.
 */

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
 * NOT SERIAL ANY MORE. These were, because they shared one account and each
 * cleared its enrollments in `beforeEach` — in parallel that was two tests
 * deleting each other's program mid-assertion. Each worker has an account of
 * its own now and runs one test at a time on it; every test below starts from
 * the empty account `beforeEach` leaves and enrols what it needs itself.
 */
test.describe("training on a phone", () => {
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

    // Start from nothing so the run does not depend on what a previous one left:
    // no program, no ended programs (they would lengthen the page and make the
    // height assertion depend on run order), nothing open, and nothing finished
    // in the last two days (which puts the card in its `done` state, with no
    // Start). The helper says why each one matters.
    await page.goto("/programs")
    await resetTraining(page)
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
    const strip = page.getByTestId("week-strip")
    await expect(strip).toBeVisible({ timeout: 15000 })

    // MEASURED, which is what the name always claimed: it asserted only that
    // the strip was visible, which a row of 20px days also is.
    const days = strip.locator('[data-testid^="week-day-"]')
    await expect(days).toHaveCount(7)
    for (const box of await days.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return { day: el.getAttribute("data-testid"), width: Math.round(r.width), height: Math.round(r.height) }
      }),
    )) {
      expect(box.height, `${box.day} is ${box.height}px tall`).toBeGreaterThanOrEqual(44)
      expect(box.width, `${box.day} is ${box.width}px wide`).toBeGreaterThanOrEqual(44)
    }
  })
})
