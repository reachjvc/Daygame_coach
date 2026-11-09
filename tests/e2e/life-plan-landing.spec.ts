import { test, expect, signIn } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan, planWithSteps, openBuildSteps } from "./helpers/lifePlan"

/**
 * WHERE /plan OPENS (Plans/life-plan-after-setup.md, Phase 1).
 *
 * A plan with something to do (an active goal or a routine step) opens on
 * Today; one with nothing to do opens on North star, as before; a link that
 * names a step still opens that step. The account fixture is shared by one
 * worker's tests, so every test seeds its own plan first.
 */

const current = (page: Page) => page.getByRole("navigation", { name: "Sections" }).locator('[aria-current="page"]')
const inUse = () => planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])

test.describe("where the plan opens", () => {
  test("a plan with nothing to do opens on North star", async ({ page, account }) => {
    await seedLifePlan(page, account.id, planWithSteps([]))
    await page.goto(ROUTES.plan)
    await expect(current(page)).toContainText("North star")
  })

  test("a plan with a routine step opens on Today", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    await page.goto(ROUTES.plan)
    await expect(current(page)).toContainText("Today")
  })

  test("an asked step still wins", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(current(page)).toContainText("Review")
  })

  test("Review opens without a React key warning", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    const errors: string[] = []
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByTestId("review-last")).toBeVisible()
    await page.getByRole("button", { name: /^Score .+ 4 out of 10/ }).first().click()
    await expect(page.getByText("Saved to your account.")).toBeVisible()
    await page.reload()
    await expect(page.getByTestId("review-last")).toBeVisible()
    expect(errors.filter((e) => e.includes("same key"))).toEqual([])
  })
})

test.describe("the step cards", () => {
  test("a plan in use shows the use steps first and folds the rest", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    await page.goto(ROUTES.plan)
    const cards = page.getByRole("navigation", { name: "Sections" }).getByRole("button")
    await expect(cards.nth(0)).toHaveText(/^\d+\s*Today/)
    await expect(cards.nth(1)).toHaveText(/^\d+\s*Review/)
    await expect(cards.nth(2)).toHaveText(/^\d+\s*Journal/)
    await expect(cards.nth(3)).toHaveText(/^\d+\s*Track/)
    await expect(page.getByRole("button", { name: /^\d+\s*North star/ })).toHaveCount(0)
    await openBuildSteps(page)
    await expect(page.getByRole("button", { name: /^\d+\s*North star/ })).toHaveCount(1)
  })

  test.describe("@phone", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test("on a phone the step list folds into one line", async ({ page, account }) => {
      await seedLifePlan(page, account.id, inUse())
      await page.goto(ROUTES.plan)
      const nav = page.getByRole("navigation", { name: "Sections" })
      await expect(nav).toBeHidden()
      const toggle = page.getByRole("button", { name: /^Today · all steps/ })
      await expect(toggle).toBeVisible()
      await toggle.click()
      await expect(nav).toBeVisible()
    })
  })
})

test.describe("words and folds", () => {
  const withStar = () => ({ ...inUse(), northStar: "A calm, strong life." })

  test("Review shows the north star", async ({ page, account }) => {
    await seedLifePlan(page, account.id, withStar())
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByTestId("review-north-star")).toContainText("A calm, strong life.")
  })

  test("How today went starts folded", async ({ page, account }) => {
    await seedLifePlan(page, account.id, withStar())
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByRole("button", { name: /^How today went/ })).toHaveAttribute("aria-expanded", "false")
    await expect(page.getByRole("button", { name: /today: 4 out of 10/ })).toHaveCount(0)
    await page.getByRole("button", { name: /^How today went/ }).click()
    await expect(page.getByRole("button", { name: /today: 4 out of 10/ }).first()).toBeVisible()
  })

  test("an account with no plan yet says its writing goes to the account", async ({ page, context, throwawayAccount }) => {
    await context.clearCookies()
    await signIn(page, throwawayAccount)
    await page.goto(`${ROUTES.plan}?step=star`)
    await expect(page.getByText("Saves to your account as you write.")).toBeVisible()
  })
})
