import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * A GOAL'S TIMEFRAME, AND THE GOAL IT FEEDS BY NAME (Plans/life-plan-rebuild.md, Phase 4).
 *
 * Through the real page and the real account: a subgoal's card names the goal
 * it feeds, a timeframe picked on the card is kept on the account across a
 * reload with this browser's copy thrown away, and the goals list on
 * Everything can show one list per timeframe.
 */

const BIG = "E2E: Run a marathon"
const SMALL = "E2E: Run 10 km"

test.describe("a goal's timeframe", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, {
      version: 1,
      seq: 10,
      northStar: "E2E: a plan with a north star.",
      goals: [
        { id: "g1", areaId: "lm_fitness", title: BIG, type: "achievement", feedsGoalIds: [] },
        { id: "g2", areaId: "lm_fitness", title: SMALL, type: "achievement", feedsGoalIds: ["g1"] },
      ],
    })
  })

  test("is picked on the goal card, kept on the account, and groups the goals list", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=recap`)
    await page.getByRole("button", { name: /My goals/ }).click()
    // Finish-line goals are listed under "what you want", closed by default.
    await page.getByRole("button", { name: /What you want to experience/ }).click()
    await page.getByRole("button", { name: `Open ${SMALL}` }).click()

    // The subgoal names the goal it feeds, not a count.
    await expect(page.getByText(`· feeds ${BIG}`)).toBeVisible()

    const timeframe = page.getByRole("group", { name: "Timeframe" })
    await timeframe.getByRole("button", { name: "1 year" }).click()
    await expect(timeframe.getByRole("button", { name: "1 year" })).toHaveAttribute("aria-pressed", "true")

    await expect.poll(async () => {
      const res = await page.request.get("/api/life-plan")
      const body = (await res.json()) as { plan: { goals: Array<{ title: string; timeframe: string | null }> } }
      return Object.fromEntries(body.plan.goals.map((g) => [g.title, g.timeframe]))
    }, { timeout: 15_000 }).toEqual({ [BIG]: null, [SMALL]: "1y" })

    await page.evaluate(() => window.localStorage.clear())
    await page.goto(`${ROUTES.plan}?step=recap`)
    await page.getByRole("button", { name: /My goals/ }).click()
    await page.getByRole("group", { name: "Show by" }).getByRole("button", { name: "Timeframe" }).click()
    await expect(page.getByRole("heading", { name: "1 year" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "No timeframe yet" })).toBeVisible()
  })
})
