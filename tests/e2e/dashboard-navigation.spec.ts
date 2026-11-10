import { test, expect, signIn, SIGNED_OUT } from "./fixtures/test"
import { urlOf } from "@/tests/support/appRoutes"
import { ROUTES } from "@/src/shared/routes"
import { TOOLS, ALL_TOOLS_TILE } from "@/components/navTabs"
import { grantPurchase } from "./helpers/purchase"
import { SELECTORS } from "./helpers/selectors"

const AUTH_TIMEOUT = 15000

/**
 * HOME'S TILES AND ALL TOOLS LEAD WHERE THEY SAY.
 *
 * It was one test of the Dashboard's two module cards (Scenarios, Inner
 * Game), which link to the same page for every account and so could be
 * asserted exactly. Home replaced the Dashboard (Plans/site-navigation-build.md,
 * Phase 1) and holds every tool, so every tile and every All tools row is
 * opened here, in a real browser, the way risk 3 of that plan asks: a tool
 * nobody can reach is a tool that does not exist.
 *
 * Ask Coach turns away anyone who has not paid, so an account that has not
 * paid must see its tile open the plans, and a payer must see Coach. On an
 * account of its own: paying is not undone, and the worker's account is
 * shared by every test the worker runs.
 */
test("every tile on Home and every row in All tools opens its page", async ({ page }) => {
  for (const tool of TOOLS.filter((t) => t.tile && t.access !== "paid")) {
    await page.goto(ROUTES.dashboard, { timeout: AUTH_TIMEOUT })
    const tile = page.getByTestId(SELECTORS.dashboard.tile(tool.id))
    await expect(tile).toBeVisible({ timeout: AUTH_TIMEOUT })
    await Promise.all([page.waitForURL(urlOf(tool.href), { timeout: AUTH_TIMEOUT }), tile.click()])
  }
  await page.goto(ROUTES.dashboard, { timeout: AUTH_TIMEOUT })
  await Promise.all([
    page.waitForURL(urlOf(ALL_TOOLS_TILE.href, "$"), { timeout: AUTH_TIMEOUT }),
    page.getByTestId(SELECTORS.dashboard.tile("all")).click(),
  ])
  for (const tool of TOOLS.filter((t) => t.access !== "paid")) {
    await page.goto(ROUTES.tools, { timeout: AUTH_TIMEOUT })
    const row = page.getByTestId(`tools-row-${tool.id}`)
    await Promise.all([page.waitForURL(urlOf(tool.href), { timeout: AUTH_TIMEOUT }), row.click()])
  }
})

test.describe("a throwaway account", () => {
  test.use({ storageState: SIGNED_OUT })
  test("the Coach tile opens the plans for someone who has not paid, and Coach for a payer", async ({
    page,
    throwawayAccount: account,
  }) => {
    await signIn(page, account)
    await page.goto(ROUTES.dashboard, { timeout: AUTH_TIMEOUT })
    const coach = page.getByTestId(SELECTORS.dashboard.tile("coach"))
    await expect(coach).toHaveAttribute("data-access", "locked", {
      timeout: AUTH_TIMEOUT,
    })
    await expect(coach).toHaveAttribute("href", "/#pricing")

    await grantPurchase(account.id)
    await page.goto(ROUTES.dashboard, { timeout: AUTH_TIMEOUT })
    await expect(coach).toHaveAttribute("data-access", "open", {
      timeout: AUTH_TIMEOUT,
    })
    await Promise.all([page.waitForURL(urlOf(ROUTES.coach, "(\\?from=|$)") /* the tile carries Home as the way back */, { timeout: AUTH_TIMEOUT }), coach.click()])
  })
})
