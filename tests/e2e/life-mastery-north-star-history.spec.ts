import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * A NORTH STAR THAT IS REPLACED IS KEPT (Plans/life-plan-rebuild.md, Phase 2).
 *
 * Through the real page and the real account: start a new north star, see the
 * box empty, reload, and find the old paragraph under "earlier north stars",
 * read back from the database rather than from this browser.
 */

const OLD = "E2E: I live by the sea and build boats."

test.describe("the north star keeps its history", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, {
      version: 1,
      seq: 10,
      northStar: OLD,
      answers: { star_why: "E2E: to make people braver." },
    })
  })

  test("starting a new one keeps the old one, across a reload", async ({ page }) => {
    await page.goto(ROUTES.plan)
    const star = page.getByLabel("Your north star")
    await expect(star).toHaveValue(OLD)

    await page.getByRole("button", { name: "Start a new north star" }).click()
    await page.getByRole("button", { name: "Start a new one" }).click()
    await expect(star).toHaveValue("")

    // Saved to the account, then read back from it.
    await expect.poll(async () => {
      const res = await page.request.get("/api/life-plan")
      const body = (await res.json()) as { plan: { north_stars: Array<{ text: string; ended_on: string | null }> } }
      return body.plan.north_stars.filter((s) => s.ended_on !== null).map((s) => s.text)
    }, { timeout: 15_000 }).toEqual([OLD])

    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await expect(page.getByLabel("Your north star")).toHaveValue("")
    await page.getByRole("button", { name: /Show earlier north stars \(1\)/ }).click()
    await expect(page.getByText(OLD)).toBeVisible()
    await expect(page.getByText("Why: E2E: to make people braver.")).toBeVisible()
  })
})
