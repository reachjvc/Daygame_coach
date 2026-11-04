import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * THE ONE THING IS THE SEASON'S SENTENCE (Plans/life-plan-rebuild.md, Phase 3).
 *
 * Through the real page and the real account: the Season step holds the one
 * thing and the focus, the sentence saves into the plan's season row (not the
 * old one-thing route), and it is still there after a reload with this
 * browser's copy thrown away. An old link to the one thing step lands here.
 */

const SENTENCE = "E2E: run the half marathon in April."

test.describe("the season", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
  })

  test("the one thing is written on the Season step and kept on the account", async ({ page }) => {
    // The old step's link: it opens the one Season step, both halves on it.
    await page.goto(`${ROUTES.plan}?step=one`)
    await expect(page.getByRole("heading", { name: "What is the one thing?" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "What is this season about?" })).toBeVisible()

    const box = page.getByRole("textbox", { name: "Say it in your own words" })
    await box.fill(SENTENCE)
    // Enabled only once the account has answered (the read replaces the plan
    // on screen, and a sentence saved before it would go with it).
    await expect(page.getByTestId("one-thing-save")).toBeEnabled()
    await page.getByTestId("one-thing-save").click()

    await expect.poll(async () => {
      const res = await page.request.get("/api/life-plan")
      const body = (await res.json()) as { plan: { seasons: Array<{ sentence: string; ended_on: string | null }> } }
      return body.plan.seasons.filter((s) => s.ended_on === null).map((s) => s.sentence)
    }, { timeout: 15_000 }).toEqual([SENTENCE])

    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await expect(page.getByText(SENTENCE).first()).toBeVisible()
  })
})
