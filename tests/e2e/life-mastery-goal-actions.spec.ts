import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * A GOAL'S ACTION IS A ROUTINE STEP (Plans/life-plan-rebuild.md, Phase 4, Q5).
 *
 * Through the real page and the real account: an action written on a goal card
 * lands in its area's "actions" routine as a step serving the goal, is kept on
 * the account, shows on Today where it is ticked, and goes again when it is
 * taken off the goal it was written for.
 */

const GOAL = "E2E: Run 10 km"
const ACTION = "E2E: Run three times"

type Rows = {
  routines: Array<{ id: string; label: string; blueprint_id: string }>
  steps: Array<{ id: string; routine_id: string; title: string; days_per_week: number }>
  step_serves: Array<{ step_id: string; goal_id: string }>
}

async function accountRows(page: Page): Promise<Rows> {
  const res = await page.request.get("/api/life-plan")
  return ((await res.json()) as { plan: Rows }).plan
}

async function openGoalCard(page: Page) {
  await page.goto(`${ROUTES.plan}?step=recap`)
  await page.getByRole("button", { name: /My goals/ }).click()
  await page.getByRole("button", { name: /What you want to experience/ }).click()
  await page.getByRole("button", { name: `Open ${GOAL}` }).click()
}

test.describe("a goal's action", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, {
      version: 1,
      seq: 10,
      northStar: "E2E: a plan with a north star.",
      goals: [{ id: "g1", areaId: "lm_fitness", title: GOAL, type: "achievement", feedsGoalIds: [] }],
    })
  })

  test("is a step in the area's actions routine, kept on the account, and on Today", async ({ page }) => {
    await openGoalCard(page)
    await page.getByRole("textbox", { name: `Add an action for ${GOAL}` }).fill(ACTION)
    await page.getByRole("combobox", { name: "Days per week for the new action" }).selectOption("3")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await expect(page.getByText("In Fitness actions")).toBeVisible()

    await expect.poll(async () => {
      const rows = await accountRows(page)
      const routine = rows.routines.find((r) => r.blueprint_id === "actions")
      const step = rows.steps.find((s) => s.title === ACTION)
      return {
        routine: routine?.label ?? null,
        inIt: !!step && step.routine_id === routine?.id,
        days: step?.days_per_week ?? null,
        serves: step ? rows.step_serves.filter((x) => x.step_id === step.id).length : 0,
      }
    }, { timeout: 15_000 }).toEqual({ routine: "Fitness actions", inIt: true, days: 3, serves: 1 })

    // On Today, from the account, with this browser's copy thrown away.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByText(ACTION).first()).toBeVisible({ timeout: 15_000 })

    // Taken off the only goal it served, the step and its routine go.
    await openGoalCard(page)
    await page.getByRole("button", { name: `Remove action ${ACTION}` }).click()
    await expect(page.getByText("In Fitness actions")).toHaveCount(0)
    await expect.poll(async () => {
      const rows = await accountRows(page)
      return [rows.steps.some((s) => s.title === ACTION), rows.routines.some((r) => r.blueprint_id === "actions")]
    }, { timeout: 20_000 }).toEqual([false, false])
  })
})
