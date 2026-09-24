/**
 * A WEEK YOU WROTE YOURSELF, FROM THE BOX TO A RUNNING PROGRAM.
 *
 * `POST /api/programs/drafts/[id]/start` had never had a caller on any screen:
 * the one thing a saved week is FOR could not be done to one. Saved weeks lived
 * inside a builder in Life Mastery, behind a mode switch, on a step most people
 * never opened, with a 32-px delete square and no Start at all.
 *
 * This is the path a person actually takes, and it is here because I walked it
 * by hand first and a measurement nobody will take again is not a test.
 *
 * In the `training` project: it writes drafts and enrollments on the shared
 * training account.
 */

import { test, expect, type Page } from "@playwright/test"
import { PHONE, cleanUp, guardTrainingAccount } from "./helpers/training.helper"

test.use({ viewport: PHONE })
test.describe.configure({ mode: "serial" })
/** Refuses to run as anybody but the training account — see the helper. */
guardTrainingAccount()


const WEEK = "Push\nBench Press 3x8 @60\n\nPull\nBarbell Row 3x8 @50"

/** Nothing running, nothing open, and no saved weeks left by an earlier run. */
async function wipe(page: Page): Promise<void> {
  await page.goto("/programs", { waitUntil: "networkidle" })
  await cleanUp(page)
  await page.evaluate(async () => {
    for (const d of await (await fetch("/api/programs/drafts")).json()) {
      await fetch(`/api/programs/drafts/${d.id}`, { method: "DELETE" })
    }
  })
}

/** Write the week and give it a name through the dialog. */
async function writeAndName(page: Page, text: string, name: string, action: "week-save" | "week-start") {
  await page.goto("/programs?view=build", { waitUntil: "networkidle" })
  await page.getByTestId("week-text").fill(text)
  await expect(page.getByTestId("week-readback")).toBeVisible()
  await page.getByTestId(action).click()
  // `#week-name`, not the label: `getByLabel` also matches the dialog itself.
  await page.locator("#week-name").fill(name)
  await page.getByTestId("week-name-save").click()
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(180000)
  await wipe(page)
})

test.afterEach(async ({ page }) => {
  await wipe(page)
})

test("a written week saved for later is listed with the programs, and loads back into the box", async ({
  page,
}) => {
  await writeAndName(page, WEEK, "Test week", "week-save")

  await page.goto("/programs", { waitUntil: "networkidle" })
  const saved = page.getByTestId("saved-weeks")
  await expect(saved).toBeVisible({ timeout: 30000 })
  await expect(saved).toContainText("Test week")
  // Counted from the week itself, not from a stored number.
  await expect(saved).toContainText("2 days · 2 lifts")

  // Every action is behind the row's ⋮, which is a whole fingertip.
  const menu = page.locator('[data-testid^="saved-week-menu-"]').first()
  const box = await menu.boundingBox()
  expect(box, "premise: the options button must be measurable").toBeTruthy()
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44)

  await menu.click()
  await page.getByTestId("saved-week-open").click()
  await expect(page.getByTestId("week-text")).toHaveValue(WEEK)
})

test("Start this week starts it under its own name, and the card says that name", async ({
  page,
}) => {
  /**
   * WITHOUT THE NAME every self-built week is "Your own program" — the shared
   * catalogue shell's title — in the live header, in History and on the card.
   * Three weeks in and all of them read the same.
   */
  await writeAndName(page, WEEK, "Winter block", "week-save")

  await page.goto("/programs", { waitUntil: "networkidle" })
  await page.locator('[data-testid^="saved-week-menu-"]').first().click()
  await page.getByTestId("saved-week-start").click()

  // `?program=` is set only once the start has come back.
  await page.waitForURL(/[?&]program=/, { timeout: 30000 })
  const card = page.getByTestId("today-card")
  await expect(card).toBeVisible({ timeout: 30000 })
  await expect(card).toContainText("Winter block")
  await expect(card, "the catalogue shell's name must never surface").not.toContainText(
    "Your own program"
  )
  // And it is the week that was written, not the shell's placeholder day.
  await expect(card).toContainText("Bench Press")

  const running = await page.evaluate(async () =>
    ((await (await fetch("/api/programs/enrollments")).json()) as { program_id: string; label: string | null }[]).map(
      (e) => `${e.program_id}:${e.label}`
    )
  )
  expect(running).toEqual(["custom:Winter block"])
})

test("a half-built week can be saved, and its Start is refused by name", async ({ page }) => {
  /**
   * SAVING IS PERMISSIVE, STARTING IS NOT. Building a week over two sittings is
   * the ordinary case, and refusing to SAVE a half-built one is how the builder
   * came to lose everything when the tab was closed. It is not a legal program,
   * and the refusal names the day that is still empty rather than failing
   * somewhere inside the engine.
   */
  await writeAndName(page, "Push\nBench Press 3x8 @60\n\nLegs", "Half a week", "week-save")

  await page.goto("/programs", { waitUntil: "networkidle" })
  await expect(page.getByTestId("saved-weeks")).toContainText("Half a week")

  await page.locator('[data-testid^="saved-week-menu-"]').first().click()
  await page.getByTestId("saved-week-start").click()

  /**
   * SCOPED TO THE SECTION. `getByRole("alert")` also matches an empty alert
   * region the Next dev overlay keeps in the page — the second time today that
   * overlay has answered a selector meant for the app, after it offered three
   * buttons under 44 px to a touch-target scan.
   */
  const refusal = page.getByTestId("saved-weeks").getByRole("alert")
  await expect(refusal).toBeVisible({ timeout: 30000 })
  await expect(refusal, "the refusal names the empty day").toContainText(/legs/i)
  // And nothing was started on the strength of it.
  const running = await page.evaluate(async () =>
    ((await (await fetch("/api/programs/enrollments")).json()) as unknown[]).length
  )
  expect(running).toBe(0)
})
