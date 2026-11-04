import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * COMMIT AND TEMPLATES ARE PARTS OF OTHER STEPS NOW (Plans/life-plan-rebuild.md, N1).
 *
 * Through the real page and the real account: the rail no longer lists them,
 * an old link to either lands on its new home with the part it was for in
 * front of you, and a commitment made on Everything is kept on the account's
 * north star across a reload with this browser's copy thrown away.
 */

const COMMITMENT = "E2E: I am in, until the end of June."

test.describe("the folded steps", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star." })
  })

  test("a Templates link opens the ready-made sets on Where to start", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=templates`)
    await expect(page.getByRole("heading", { name: "Where do you want to start?" })).toBeVisible()
    await expect(page.getByText("Pick what you are taking on")).toBeVisible()

    const rail = page.getByRole("navigation", { name: "Sections" })
    await expect(rail.getByRole("button")).toHaveCount(11)
    await expect(rail.getByRole("button", { name: /Templates/ })).toHaveCount(0)
    await expect(rail.getByRole("button", { name: /^\d+\s*Commit/ })).toHaveCount(0)

    // The door closes the sets and opens them again.
    await page.getByRole("button", { name: /Close the ready-made sets/ }).click()
    await expect(page.getByText("Pick what you are taking on")).toHaveCount(0)
    await page.getByRole("button", { name: /Start from a ready-made set/ }).click()
    await expect(page.getByText("Pick what you are taking on")).toBeVisible()
  })

  test("a Commit link lands on the commitment at the foot of Everything, and it is kept", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=commit`)
    const box = page.getByRole("textbox", { name: "Commit to it" })
    await expect(box).toBeInViewport()
    await expect(page.getByRole("heading", { name: "Everything, in one place" })).toBeVisible()

    await box.fill(COMMITMENT)
    await page.getByRole("button", { name: "I commit to this" }).click()

    await expect.poll(async () => {
      const res = await page.request.get("/api/life-plan")
      const body = (await res.json()) as { plan: { north_stars: Array<{ commitment: string | null; ended_on: string | null }> } }
      return body.plan.north_stars.filter((s) => s.ended_on === null).map((s) => s.commitment)
    }, { timeout: 15_000 }).toEqual([COMMITMENT])

    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await expect(page.getByRole("textbox", { name: "Commit to it" })).toHaveValue(COMMITMENT)
    await expect(page.getByText(/Committed on/)).toBeVisible()
  })
})
