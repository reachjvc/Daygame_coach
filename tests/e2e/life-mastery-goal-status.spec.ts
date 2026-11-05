import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"

/**
 * A GOAL CAN BE ACHIEVED, PAUSED OR DROPPED (Plans/life-plan-goal-status.md),
 * through the real page and the real account: a goal opened from Today is
 * paused; it is paused on the account, gone from Today across a reload, and
 * named in this week's review.
 */

const PLAN = {
  version: 1,
  seq: 3,
  northStar: "E2E: a plan with a north star.",
  areas: [{ id: "lm_fitness", label: "Fitness", sublabel: "Strength", color: "#0ea5e9", custom: false }],
  routines: [],
  goals: [
    {
      id: "g1", areaId: "lm_fitness", title: "E2E gym sessions", type: "habit_ramp", why: "Energy",
      daysPerWeek: 4, perWeek: null, rampSteps: null, targetDate: null, feedsGoalIds: [], values: [],
    },
  ],
  priorityIds: ["g1"],
  review: {},
  answers: {},
  currentValues: [],
  values: [],
  seasonFocusId: null,
}

test("a goal paused from its card leaves Today and is named in the week's review", async ({ page, account }) => {
  await seedLifePlan(page, account.id, PLAN)
  await page.goto(`${ROUTES.plan}?step=today`)
  await expect(page.getByText("Saved to your account.")).toBeVisible()
  await page.getByRole("button", { name: "Open E2E gym sessions to change its date or its numbers" }).click()

  const status = page.getByRole("group", { name: "Where E2E gym sessions is" })
  await status.getByRole("button", { name: "Paused" }).click()
  await expect(status.getByRole("button", { name: "Paused" })).toHaveAttribute("aria-pressed", "true")
  await expect
    .poll(async () => ((await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }).plan.goals[0].status, { timeout: 15_000 })
    .toBe("paused")

  await page.evaluate(() => window.localStorage.clear())
  await page.goto(`${ROUTES.plan}?step=today`)
  await expect(page.getByText("Saved to your account.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Log one E2E gym sessions" })).toHaveCount(0)

  await page.goto(`${ROUTES.plan}?step=review`)
  await expect(page.getByTestId("review-changed")).toContainText("E2E gym sessions: Paused")
})
