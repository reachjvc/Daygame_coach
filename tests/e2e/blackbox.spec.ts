import { test, expect } from "@playwright/test"
import { QUIT_VICE, viceStep } from "@/src/shared/lifeMasteryRoutes"

/**
 * The Black Box, end to end.
 *
 * Walks the one path the whole feature exists for: land on it, start a run,
 * have the thought, be answered by your own record, file the close call, and
 * see the run survive it. Unit tests cover the arithmetic; this covers the
 * thing a person actually does at eleven at night.
 *
 * Built from the route constants, so the next time Life Mastery moves this does
 * not assert an address that no longer exists.
 */

/** Serial: every test writes the same browser-local record. */
test.describe.configure({ mode: "serial" })

type Page = import("@playwright/test").Page

/**
 * The record lives in localStorage, and every Playwright test gets a fresh
 * browser context — so state does NOT carry from one test to the next even in
 * serial mode. Each test seeds exactly the record it needs, which also means
 * any one of them can be run on its own.
 */
async function seed(page: Page, record: unknown | null) {
  await page.goto(QUIT_VICE)
  await page.evaluate((r) => {
    if (r === null) window.localStorage.removeItem("vice-blackbox-v1")
    else window.localStorage.setItem("vice-blackbox-v1", JSON.stringify(r))
  }, record)
  await page.reload()
}

/** A record with one run still going, started a fortnight ago. */
function liveRun(extraReports: unknown[] = []) {
  const started = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  return {
    version: 1,
    attempts: [{
      id: "a1", viceId: "nicotine", label: "Smoking or vaping", startedOn: started,
      startedBy: "Read my own record", structure: ["Told a specific person"],
      endedOn: null, endedByReportId: null,
    }],
    reports: extraReports,
  }
}

test.describe("the Black Box", () => {
  test("clicking Vices lands on it, not on the old hub", async ({ page }) => {
    await seed(page, null)
    await expect(page.getByRole("heading", { name: "Black Box", level: 1 })).toBeVisible()
    // The old module is reachable, but only by the one line at the foot.
    await expect(page.getByRole("link", { name: /the flows, tools and reading/i })).toBeVisible()
  })

  test("the old module still works at its own address", async ({ page }) => {
    await page.goto(viceStep("old"))
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible({ timeout: 15000 })
  })

  test("a run can be started, and it shows up as days", async ({ page }) => {
    await seed(page, null)
    // On an empty record the primary action is entering history; starting a run
    // now is the quiet one. Both are buttons, so this asserts the real label.
    await page.getByRole("button", { name: "Or start one now" }).click()
    await page.getByRole("button", { name: "Smoking or vaping" }).click()
    await page.getByRole("button", { name: "Told a specific person" }).click()
    await page.getByRole("button", { name: "Start the run" }).click()

    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
    await expect(page.getByText("This run, still going")).toBeVisible()
    // The record survives a reload, which is the whole point of storing it.
    await page.reload()
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()
  })

  test("the thought door answers honestly when there is no history", async ({ page }) => {
    await seed(page, liveRun())
    await page.getByRole("button", { name: /having a thought/i }).click()
    await page.getByRole("button", { name: /I felt fine/i }).first().click()

    // It must say there is nothing to compare with, and invent no pattern.
    await expect(page.getByText(/first time you have written this one down/i)).toBeVisible()
  })

  test("filing a close call keeps the run alive and pays out next time", async ({ page }) => {
    await seed(page, liveRun())
    await page.getByRole("button", { name: /having a thought/i }).click()
    await page.getByRole("button", { name: /I felt fine/i }).first().click()
    await page.getByRole("button", { name: /File this as a close call/i }).click()

    await page.getByRole("textbox", { name: /What was the thought/i }).fill("One wouldn't undo this")
    await page.getByRole("button", { name: "File it" }).click()

    // The run is untouched: still going, and the close call cost nothing.
    await expect(page.getByRole("heading", { name: "This run", exact: true })).toBeVisible()

    // And the door now has something to say about that same thought.
    await page.getByRole("button", { name: /having a thought/i }).click()
    await page.getByRole("button", { name: /I felt fine/i }).first().click()
    // Scoped to the dialog: the landing page also shows this wording in the
    // cost list, and an assertion that passes from either place proves neither.
    const answer = page.getByRole("dialog")
    await expect(answer.getByText(/never ended a run/i)).toBeVisible()
    await expect(answer.getByText("One wouldn't undo this")).toBeVisible()
  })

  test("a run you already had can be entered, which is how the chart gets a history", async ({ page }) => {
    await seed(page, null)
    await page.getByRole("button", { name: /Add a run you already had/i }).click()

    // On an empty record there is no earlier run to take the vice from, so the
    // form asks instead of filing it as nicotine — which is what it used to do.
    await expect(page.getByRole("button", { name: "Add it" })).toBeDisabled()
    await page.getByRole("button", { name: "Smoking or vaping" }).click()

    await page.locator("#pr-from").fill("2025-02-10")
    await page.locator("#pr-to").fill("2025-05-09")
    await expect(page.getByText("89 days")).toBeVisible()

    await page.getByRole("button", { name: "Add it" }).click()

    // It lands on the chart as a finished run, and does NOT become the live one.
    await expect(page.getByRole("heading", { name: "No run going" })).toBeVisible()
    await expect(page.getByText("Longest run")).toBeVisible()
    await page.reload()
    await expect(page.getByText("Longest run")).toBeVisible()
  })

  test("a run that ends before it starts is refused", async ({ page }) => {
    await seed(page, null)
    await page.getByRole("button", { name: /Add a run you already had/i }).click()
    await page.getByRole("button", { name: "Smoking or vaping" }).click()
    await page.locator("#pr-from").fill("2025-05-09")
    await page.locator("#pr-to").fill("2025-02-10")
    await expect(page.getByText(/ends before it starts/i)).toBeVisible()
    await expect(page.getByRole("button", { name: "Add it" })).toBeDisabled()
  })

  test("going through with it ends the run, and the run keeps its days", async ({ page }) => {
    await seed(page, liveRun())
    await page.getByRole("button", { name: "File a report" }).click()
    await page.getByRole("button", { name: /I did it/i }).click()
    await page.getByRole("textbox", { name: /What was the thought/i }).fill("Thought I could handle one")
    await page.getByRole("button", { name: "File it" }).click()

    // Nothing resets: the ended run is still on the chart and still counted.
    await expect(page.getByRole("heading", { name: "No run going" })).toBeVisible()
    await expect(page.getByText("Across every run")).toBeVisible()
    await expect(page.getByText(/Everything above stays exactly as it is/i)).toBeVisible()
  })
})
