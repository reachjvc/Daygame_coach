import { test, expect, signIn } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"

/**
 * TWO LEAKS IN THE PLAN'S SAVE, through the real page and the real accounts
 * (Plans/life-plan-rebuild.md, after the wheel).
 *
 *   1. An edit to the plan made in the seconds before a reload was lost: the
 *      plan save waits a few seconds and the reload came first. It is now sent
 *      as the page goes.
 *   2. A tab opened for one account, left open while another account signed in
 *      in a second tab of the same browser, saved into the second account. It
 *      now refuses, and says so.
 */

async function weekScores(page: import("@playwright/test").Page) {
  const res = await page.request.get("/api/life-plan")
  const body = (await res.json()) as { plan: PlanRows | null }
  if (!body.plan) return null
  const weeks = new Set(body.plan.reviews.filter((r) => r.cadence === "week").map((r) => r.id))
  return body.plan.review_scores.filter((s) => weeks.has(s.review_id)).map((s) => s.score)
}

test.describe("the plan's save", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
  })

  test("keeps an edit made just before a reload", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=now`)
    await expect(page.getByText("Saved to your account.")).toBeVisible()
    await page.getByRole("button", { name: /^Health\. .*Open it\.$/ }).click()
    await page.getByRole("button", { name: "Rate Health 6 out of 10 for this week" }).click()
    // Well inside the save's wait: nothing has gone to the account yet.
    expect(await weekScores(page)).toEqual([])
    await page.reload()

    await expect.poll(() => weekScores(page), { timeout: 15_000 }).toEqual([6])
    await page.reload()
    await expect(page.getByRole("button", { name: /^Health\. .*Rated 6 out of 10\. Open it\.$/ })).toBeVisible()
  })

  test("refuses to save for an account it did not load", async ({ page, context, throwawayAccount }) => {
    await page.goto(`${ROUTES.plan}?step=now`)
    await expect(page.getByText("Saved to your account.")).toBeVisible()

    // Somebody signs in as another account in a second tab: the sign-in cookie is the browser's.
    const other = await context.newPage()
    await context.clearCookies()
    await signIn(other, throwawayAccount)

    // Back on the first tab: a plan edit and a day rating.
    await page.bringToFront()
    await page.getByRole("button", { name: /^Health\. .*Open it\.$/ }).click()
    await page.getByRole("button", { name: "Rate Health 7 out of 10 for this week" }).click()
    await page.getByRole("button", { name: "Rate Health 4 out of 10 today" }).click()
    await expect(page.getByText(/You signed in to another account in another tab/)).toBeVisible({ timeout: 15_000 })

    // The other account got nothing: no plan started, no day written.
    const plan = (await (await other.request.get("/api/life-plan")).json()) as { plan: PlanRows | null }
    expect(plan.plan).toBeNull()
    const days = (await (await other.request.get("/api/life-plan/day")).json()) as { daily: Record<string, unknown> }
    expect(days.daily).toEqual({})
  })
})
