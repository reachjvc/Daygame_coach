import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * READINGS ON A NUMBER GOAL (Plans/life-plan-readings.md), through the real
 * page and the real account: a body weight read 92 kg twelve days ago shows
 * in the week's review; 87.5 written there is on the account as today's
 * reading, across a reload with this browser's copy thrown away, and earns
 * "Halfway to 80 kg" in the same review.
 */

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const PLAN = {
  version: 1,
  seq: 3,
  northStar: "E2E: a plan with a north star.",
  areas: [{ id: "lm_fitness", label: "Fitness", sublabel: "Strength", color: "#0ea5e9", custom: false }],
  routines: [],
  goals: [
    {
      id: "g1", areaId: "lm_fitness", title: "E2E body weight", type: "milestone_ladder", unit: "kg",
      ladder: { start: 95, target: 80, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
      targetDate: null, feedsGoalIds: [], values: [],
    },
  ],
  priorityIds: ["g1"],
  review: {},
  answers: {},
  currentValues: [],
  values: [],
  seasonFocusId: null,
}

test("a number goal's reading, written in the week's review", async ({ page, account }) => {
  await seedLifePlan(page, account.id, PLAN)
  const before = new Date()
  before.setDate(before.getDate() - 12)
  const res = await page.request.put("/api/life-plan/day", { data: { date: dayKey(before), numbers: { g1: 92 } } })
  expect(res.status(), await res.text()).toBe(200)

  await page.goto(`${ROUTES.plan}?step=review`)
  await expect(page.getByText("Saved to your account.")).toBeVisible()
  const numbers = page.getByTestId("review-numbers")
  await expect(numbers).toContainText("E2E body weight")
  await expect(numbers).toContainText("latest 92 kg")

  const box = page.getByLabel("Today's reading for E2E body weight")
  await box.fill("87,5")
  await box.press("Enter")
  await expect(numbers).toContainText("latest 87.5 kg")
  await expect(page.getByTestId("review-earned")).toContainText("Halfway to 80 kg")
  await expect
    .poll(async () => ((await (await page.request.get("/api/life-plan/day")).json()) as { numbers: Record<string, Record<string, number>> }).numbers[dayKey(new Date())]?.g1, { timeout: 15_000 })
    .toBe(87.5)

  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByTestId("review-numbers")).toContainText("latest 87.5 kg")
})
