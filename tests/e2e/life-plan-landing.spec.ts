import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan, planWithSteps } from "./helpers/lifePlan"

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
