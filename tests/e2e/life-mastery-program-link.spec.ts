/**
 * A PROGRAM STARTED ON THE TRAINING PAGE IS THE SAME PROGRAM IN THE PLAN.
 *
 * This is the walk the whole phase exists for. The plan used to keep its OWN
 * copy of the training week — the day names, the program's name, how many days
 * a week — beside a reference to the enrollment that actually owns it. Every
 * screen then read whichever copy was nearest, and they disagreed:
 *
 *   - The Systems step offered to rename days the program never heard about.
 *   - It said "2 days a week" for StrongLifts, which is trained three times.
 *   - The Templates step warned that your written week "is not the week any of
 *     these prescribe" — about the program you were running.
 *   - Open the laptop after starting on the phone and the plan knew nothing.
 *   - Every week you built yourself was called "Your own program".
 *
 * ── WHY THIS SPEC WAS REWRITTEN, 2026-09-23 ─────────────────────────────────
 *
 * It used to start programs FROM the Templates step, because that step held a
 * catalogue, a picker, an editor and a builder — a second copy of the training
 * feature living inside the plan, and the copy nobody maintained. Phase 8 step
 * 3 replaced all of it with one status card. So the walk now goes the way a
 * person actually goes: start on the Training page, come back, and the plan
 * says what you are on.
 *
 * It also seeded a plan into `localStorage` and asserted against it. That
 * stopped working the day the account acquired a plan row of its own —
 * `decideOnLoad` rightly prefers the account, so the seed was silently
 * discarded and the failure read as "the card is broken". Nothing is seeded
 * now, and nothing needs to be: the card is drawn from the enrollment list, not
 * from the plan.
 *
 * The second browser context is the part no unit test can fake: a browser that
 * has never pressed Start, which must still name the program running on the
 * account.
 *
 * In the `training` project: it starts programs on the shared account.
 */

import { test, expect, type Page } from "@playwright/test"
import { LIFE_MASTERY } from "@/src/shared/lifeMasteryRoutes"

const TEMPLATES = `${LIFE_MASTERY}?step=templates`

/** Every enrollment this spec made, ended and then removed. */
async function cleanUp(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // A workout left open refuses every end below.
    const live = await (await fetch("/api/workouts/live")).json()
    if (live) await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })
    for (const e of await (await fetch("/api/programs/enrollments")).json()) {
      await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
    }
  })
}

/** Start a catalogue program the way a person does: on the Training page. */
async function startStrongLifts(page: Page): Promise<void> {
  await page.goto("/programs?view=programs", { waitUntil: "networkidle" })
  await page.getByRole("button", { name: /StrongLifts/i }).first().click()
  await page.getByTestId("start-program").click()
  await page.waitForURL(/\/programs/, { timeout: 30000 })
}

/** The Templates step's card, once the enrollment read has landed. */
async function openTemplates(page: Page) {
  await page.goto(TEMPLATES, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: /Templates/ }).first().click()
  const card = page.getByTestId("lm-training-program")
  await expect(card).toBeVisible({ timeout: 20000 })
  return card
}

test.describe("Life Mastery and the training database", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    test.setTimeout(240000)
    await page.setViewportSize({ width: 1280, height: 1000 })
    await page.goto(LIFE_MASTERY, { waitUntil: "networkidle" })
    await cleanUp(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanUp(page)
  })

  test("a program ended elsewhere is reported as finished, with a way on", async ({ page }) => {
    /**
     * THE STATE THE FIXTURE ACTUALLY PRODUCES, and the one that matters most.
     *
     * `cleanUp` ends every enrollment on the account, which is exactly what
     * ending a program on the Training page does. The plan is still pointing at
     * it, so the reconciliation drops the reference and says so — a plan that
     * had been describing that program, possibly for months, does not simply
     * go quiet about it.
     *
     * I first wrote this asserting "No program yet" and it failed, correctly:
     * on an account whose plan holds a reference to a program that has just
     * ended, "nothing running" is NOT the empty state. The empty state is what
     * the next load shows, once the dropped reference has been saved — a
     * timing this browser test would have to race, and which
     * `tests/unit/goals/trainingProgramCard.test.tsx` draws directly instead.
     */
    await startStrongLifts(page)
    await openTemplates(page)
    await cleanUp(page)

    const card = await openTemplates(page)
    await expect(card).toContainText("finished")
    // The reassurance that matters when a program stops: the training is kept.
    await expect(card).toContainText("everything you logged is kept")

    // THE TRAINING PAGE IS SOMEWHERE YOU GO AND COME BACK FROM. Without the
    // return address it is somewhere you end up.
    const next = card.getByRole("link", { name: /Choose what is next/i })
    const href = (await next.getAttribute("href")) ?? ""
    expect(href).toContain("view=programs")
    expect(decodeURIComponent(href)).toContain("step=templates")

    await expect(card.getByRole("link", { name: /Build my own/i })).toBeVisible()
  })

  test("a program started on the Training page is named here, in a browser that never pressed Start", async ({
    page,
    browser,
  }) => {
    await startStrongLifts(page)

    const card = await openTemplates(page)
    await expect(card).toContainText("StrongLifts 5×5")
    // Its days, in turn — never a weekly count, because A/B alternating is
    // three sessions one week and two the next and both are correct.
    await expect(card).toContainText("in turn")
    await expect(card).not.toContainText(/\d+×\/wk/)
    await expect(card).not.toContainText(/days a week/i)
    // Started today and not trained yet is not a program you forgot.
    await expect(card).toContainText("Not trained yet")

    const change = card.getByRole("link", { name: /Change program/i })
    expect(await change.getAttribute("href")).toContain("view=programs")
    await expect(card.getByRole("link", { name: /Today's session/i })).toBeVisible()

    /**
     * A SECOND BROWSER THAT HAS NEVER SEEN THIS PLAN.
     *
     * This is what starting on the phone and opening the laptop looks like.
     * The card is drawn from the enrollment list rather than from anything in
     * storage, so it must say exactly the same thing.
     */
    const other = await browser.newContext({ storageState: "tests/e2e/.auth/user.json" })
    const fresh = await other.newPage()
    try {
      await fresh.setViewportSize({ width: 1280, height: 1000 })
      const elsewhere = await openTemplates(fresh)
      await expect(elsewhere).toContainText("StrongLifts 5×5")
      await expect(elsewhere).toContainText("in turn")
    } finally {
      await other.close()
    }
  })

  test("two programs running are both named, and the card says why that matters", async ({
    page,
  }) => {
    await startStrongLifts(page)
    // A second discipline, so the first is not paused by starting it.
    await page.goto("/programs?view=programs", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /Couch to 5K/i }).first().click()
    await page.getByTestId("start-program").click()
    await page.waitForURL(/\/programs/, { timeout: 30000 })

    const card = await openTemplates(page)
    await expect(card).toContainText("2 programs running")
    // Named, because "you have 2 programs" without saying which two is a
    // number nobody can act on.
    await expect(card).toContainText("StrongLifts 5×5")
    await expect(card).toContainText(/Couch to 5K/i)
    await expect(card).toContainText("Training shows one session a day")
  })

  test("leaving for Training and coming back returns to the step you were on", async ({ page }) => {
    await page.goto(TEMPLATES, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: /Systems/ }).first().click()

    // The address follows the step. `replaceState`, so it does NOT add a
    // history entry — pressing Back from here goes where you came from, which
    // is the point: the step is not a place you go back through.
    await expect(page).toHaveURL(/step=systems/)

    // THE CASE THIS EXISTS FOR. Follow a link out, press Back, and Life
    // Mastery used to reopen on the north star paragraph whatever step you
    // had been working on.
    await page.goto("/programs", { waitUntil: "networkidle" })
    await page.goBack()

    await expect(page).toHaveURL(/step=systems/)
    await expect(page.getByRole("heading", { name: /Systems|Your systems/i }).first()).toBeVisible({
      timeout: 20000,
    })
  })
})
