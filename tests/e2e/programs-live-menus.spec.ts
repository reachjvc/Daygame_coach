/**
 * THE MENUS ON THE LIVE SCREEN, IN A BROWSER, ON A PHONE.
 *
 * The screen's own spec (`programs-live-workout.spec.ts`) is about the sets: a
 * tick survives a reload, a double tap does not log twice, the summary is
 * still there after it saves. This one is about everything AROUND a set, which
 * is where the gym happens — the rack is taken, this lift needs longer today,
 * that was a warm-up not a working set, I did them in a different order, and
 * next Tuesday should ask for the lift I actually did.
 *
 * Every one of these was unreachable before Phase 6: a 26px "Skip this one"
 * chip and a read-only rest line were the whole of it.
 *
 * WHY A SECOND FILE RATHER THAN MORE TESTS IN THE FIRST. Both share the one
 * training account and each wipes it clean, so they cannot run beside each
 * other — they are in the `training` project, one worker, and serial within
 * the file. Splitting keeps each file's failures readable: a broken menu does
 * not report itself as a broken tick.
 */

import { test, expect } from "@playwright/test"
import { PHONE, cleanUp, resetAndEnroll } from "./helpers/training.helper"

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

test.describe("the live screen's menus", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000)
    startedAt = new Date(Date.now() - 60_000).toISOString()
    await page.setViewportSize(PHONE)
    await page.goto("/programs")
    await resetAndEnroll(page)
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("today-card")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("start-workout").click()
    await page.waitForURL("**/programs/live", { timeout: 20000 })
    await expect(page.getByTestId("set-row-1").first()).toBeVisible({ timeout: 20000 })
  })

  test.afterEach(async ({ page }) => {
    // `startedAt` scopes the cleanup to the workouts THIS test opened. Without
    // it a finished workout dated today stays on the account, and the Tracking
    // card's `done` state then offers no Start to the test after this one.
    await cleanUp(page, startedAt).catch(() => {})
  })

  test("the lift menu offers every answer a gym actually needs", async ({ page }) => {
    await page.getByLabel(/options for squat/i).click()
    const sheet = page.getByTestId("lift-menu")
    await expect(sheet).toBeVisible()

    for (const testId of [
      "lift-swap",
      "lift-move-up",
      "lift-move-down",
      "lift-add-warmup",
      "lift-history",
      "lift-skip",
    ]) {
      await expect(sheet.getByTestId(testId), `${testId} should be in the sheet`).toBeVisible()
    }
    // A PRESCRIBED lift is skipped, never removed: the program recorded that it
    // was asked for, and deleting it loses that.
    await expect(sheet.getByTestId("lift-remove")).toHaveCount(0)
    // The first lift cannot move up.
    await expect(sheet.getByTestId("lift-move-up")).toBeDisabled()

    // Every row a finger has to hit is at least 44px tall.
    for (const testId of ["lift-swap", "lift-move-down", "lift-add-warmup", "lift-history"]) {
      const box = await sheet.getByTestId(testId).boundingBox()
      expect(box!.height, `${testId} is ${box!.height}px`).toBeGreaterThanOrEqual(44)
    }
  })

  test("the rest edit reads 3:30 after two fast taps, and survives a reload", async ({ page }) => {
    /**
     * THREE MINUTES, AND IT SAYS WHOSE NUMBER IT IS.
     *
     * StrongLifts 5×5 does NOT specify rest — I checked the source after this
     * assertion failed against "the program's", which the plan's own wording
     * had led me to expect. Only the Recommended Routine carries `restSec`.
     * So 3:00 here is OUR compound default and "our suggestion" is the honest
     * caption: presenting our guess as the author's instruction would be
     * putting our numbers into somebody else's cited program.
     */
    await page.getByLabel(/options for squat/i).click()
    await expect(page.getByTestId("rest-target")).toHaveText("3:00")
    await expect(page.getByText("our suggestion")).toBeVisible()

    await page.getByTestId("rest-more").click()
    await page.getByTestId("rest-more").click()
    // The draft is the truth until the write lands: reading the saved value
    // between taps would start the second tap from 3:15.
    await expect(page.getByTestId("rest-target")).toHaveText("3:30")

    /**
     * ONE WRITE, WHEN THE SHEET CLOSES — and the test waits for the REPLY, not
     * for the request.
     *
     * Reloading as soon as the request has been issued cancels it: the first
     * version of this test asserted on `page.on("request")` and then reloaded,
     * which aborted the very write it was about to check for. It looked
     * exactly like a rest edit that does not persist, and I went looking for
     * the bug in the app.
     */
    const patches: string[] = []
    page.on("request", (r) => {
      if (r.method() === "PATCH" && /\/api\/workouts\/[^/]+$/.test(new URL(r.url()).pathname)) {
        patches.push(r.postData() ?? "")
      }
    })
    const written = page.waitForResponse(
      (r) => r.request().method() === "PATCH" && r.status() === 200,
      { timeout: 20000 }
    )
    await page.getByLabel("Close").click()
    await written
    expect(patches).toHaveLength(1)
    expect(patches[0]).toContain('"rest"')

    /**
     * And it is on the card after a reload, without opening the menu. The
     * phone locking between sets is what reloads this page, and an edited
     * rest that is only visible inside a sheet is one you cannot check.
     */
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByText(/rest 3:30/i).first()).toBeVisible({ timeout: 20000 })
    await page.getByLabel(/options for squat/i).click()
    await expect(page.getByText("your own")).toBeVisible()
  })

  test("a swap replaces the lift and keeps the sets already logged under the old one", async ({ page }) => {
    // Two sets of squats before the rack went are a fact, and a swap must not
    // relabel them as front squats.
    const saved = page.waitForResponse(
      (r) => r.request().method() === "POST" && /\/sets$/.test(new URL(r.url()).pathname),
      { timeout: 20000 }
    )
    await page.getByTestId("tick-1").first().click()
    await saved

    await page.getByLabel(/options for squat/i).click()
    await page.getByTestId("lift-swap").click()
    /**
     * The search is ALREADY OPEN. It was not: tapping "Swap this lift"
     * revealed a button reading "Add a lift" — the search's closed state,
     * inside a sheet whose heading already said what was happening — so the
     * swap took two taps and the second one was labelled the wrong action.
     * Found by this test timing out on a box that was not there.
     */
    await page.getByTestId("add-lift-search").fill("Front Squat")
    await page.getByTestId("add-lift-results").getByText("Front Squat", { exact: true }).click()

    await expect(page.getByText("Front Squat").first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/swapped for squat/i)).toBeVisible()

    // The finish sheet lists the original as swapped rather than as a miss.
    await page.getByTestId("finish-workout").click()
    await expect(page.getByText(/counts as a miss/i)).toHaveCount(0)
  })

  test("the set menu re-tags a set, and the program's own row comes back", async ({ page }) => {
    /**
     * WAIT FOR THE SERVER, NOT FOR THE ✓.
     *
     * The tick is optimistic — it goes down the instant it is tapped, which is
     * right in a gym and the wrong thing to re-tag against: until the write
     * lands the set has no row to PATCH, and the sheet correctly says so. The
     * first version of this test asserted on `aria-pressed` and then opened
     * the menu, and failed on the app behaving as designed.
     */
    const saved = page.waitForResponse(
      (r) => r.request().method() === "POST" && /\/sets$/.test(new URL(r.url()).pathname),
      { timeout: 20000 }
    )
    await page.getByTestId("tick-1").first().click()
    await saved
    await expect(page.getByTestId("tick-1").first()).toHaveAttribute("aria-pressed", "true")

    await page.getByTestId("lift-squat").getByTestId("set-menu-1").click()
    const sheet = page.getByTestId("set-menu")
    await expect(sheet).toBeVisible()
    await expect(sheet.getByTestId("set-kind-warmup")).toBeVisible()
    await expect(sheet.getByTestId("set-kind-working")).toBeVisible()
    await expect(sheet.getByTestId("set-kind-drop")).toBeVisible()
    await expect(sheet.getByTestId("set-delete")).toBeVisible()
    await expect(sheet.getByRole("slider")).toBeVisible()
    // The CHECK constraint on `set_kind` has no such value.
    await expect(page.getByText(/failure/i)).toHaveCount(0)

    await sheet.getByTestId("set-kind-warmup").click()

    // The set is now W1, and working set 1 is empty again because the program
    // still asked for five of them.
    const squat = page.getByTestId("lift-squat")
    await expect(squat.getByTestId("set-row-W1")).toBeVisible({ timeout: 20000 })
    // Three lifts on a StrongLifts day each have a set 1, so the question has
    // to name the squat: did ITS working row come back?
    await expect(squat.getByLabel("Save set 1")).toBeVisible()

    // And the database agrees.
    const kinds = await page.evaluate(async () => {
      const live = await (await fetch("/api/workouts/live")).json()
      return (live.sets as { kind: string }[]).map((s) => s.kind)
    })
    expect(kinds).toContain("warmup")
  })

  test("a swipe reveals Delete, and it removes the set from the workout", async ({ page }) => {
    // The same rule as the re-tag: a set the server has not seen cannot be
    // deleted on it.
    const saved = page.waitForResponse(
      (r) => r.request().method() === "POST" && /\/sets$/.test(new URL(r.url()).pathname),
      { timeout: 20000 }
    )
    await page.getByTestId("tick-1").first().click()
    await saved

    const row = page.getByTestId("lift-squat").getByTestId("set-row-1")
    const box = (await row.boundingBox())!
    const y = box.y + box.height / 2
    /**
     * THE EVENTS, NOT THE TOUCHSCREEN. `page.touchscreen` needs a context
     * created with `hasTouch`, and this project runs Desktop Chrome for the
     * same reason the rest of the training specs do — one account, one worker.
     * The row listens for touchstart/touchmove, so dispatching them is the
     * gesture as far as the component is concerned; what a real finger does
     * to a real phone is blocker B3's job, not a headless browser's.
     */
    // `identifier` is required by the Touch constructor, and Playwright builds
    // real Touch objects from these — without it the dispatch throws rather
    // than the gesture failing.
    const at = (clientX: number) => ({ touches: [{ identifier: 1, clientX, clientY: y }] })
    await row.dispatchEvent("touchstart", at(box.x + box.width - 20))
    await row.dispatchEvent("touchmove", at(box.x + box.width - 140))
    await expect(page.getByTestId("swipe-delete-1")).toBeVisible()

    await page.getByTestId("swipe-delete-1").click()
    await expect
      .poll(
        async () =>
          await page.evaluate(async () => {
            const live = await (await fetch("/api/workouts/live")).json()
            return (live.sets as unknown[]).length
          }),
        { timeout: 20000 }
      )
      .toBe(0)
  })

  test("a warm-up row starts empty, because nobody prescribed it", async ({ page }) => {
    await page.getByLabel(/options for squat/i).click()
    await page.getByTestId("lift-add-warmup").click()

    const weight = page.getByLabel(/weight for set W1 in kg/i)
    await expect(weight).toBeVisible({ timeout: 20000 })
    // "50 % of set 1" would be a number nobody asked for, and the working
    // weight pre-filled in a warm-up box is the easiest thing to tick by
    // accident.
    await expect(weight).toHaveValue("")
    await expect(page.getByLabel(/reps for set W1/i)).toHaveValue("")
  })

  test("the lift's name opens its history, and says what it found", async ({ page }) => {
    await page.getByTestId("lift-name-squat").click()
    const sheet = page.getByTestId("lift-history-sheet")
    await expect(sheet).toBeVisible()
    /**
     * Either answer is correct here — this account carries a seeded training
     * year, so Squat has history, and a reset account does not. What must
     * never appear is a blank sheet, which is what "could not load" used to
     * look like.
     */
    await expect
      .poll(async () => {
        if (await sheet.getByTestId("lift-history-sheet-rows").isVisible()) return "rows"
        if (await sheet.getByTestId("lift-history-sheet-empty").isVisible()) return "empty"
        if (await sheet.getByTestId("lift-history-sheet-failed").isVisible()) return "failed"
        return "loading"
      }, { timeout: 20000 })
      .not.toBe("loading")
    expect(await sheet.getByTestId("lift-history-sheet-failed").count()).toBe(0)
  })

  test("nothing on this screen is smaller than a fingertip, and there is one orange control", async ({ page }) => {
    /**
     * THE ONE ORANGE THING IS THE ONE THING TO DO. Two of them is a screen
     * with no primary action, which on the screen you look at between sets is
     * the difference between finding Finish and hunting for it.
     */
    const orange = await page.evaluate(() => {
      const target = "rgb(255, 107, 53)"
      return [...document.querySelectorAll("button, a")].filter((el) => {
        const style = getComputedStyle(el)
        return style.backgroundColor === target
      }).length
    })
    expect(orange).toBe(1)

    const small = await page.evaluate(() => {
      const offenders: string[] = []
      for (const el of document.querySelectorAll("button, a, input, [role=slider]")) {
        const box = el.getBoundingClientRect()
        if (box.width === 0 || box.height === 0) continue
        if (box.height < 44) offenders.push(`${el.tagName}.${el.className}: ${Math.round(box.height)}px`)
      }
      return offenders
    })
    expect(small, small.join("\n")).toEqual([])
  })
})
