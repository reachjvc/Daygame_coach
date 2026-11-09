import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan, thisWeeksReview } from "./helpers/lifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"

/**
 * ACHIEVEMENTS (Plans/life-plan-achievements.md; Q11), through the real page
 * and the real account.
 *
 * A counted goal that feeds a bigger one (the owner's example: the goal is a
 * girlfriend, the system is approaching). Nine approaches are on the account
 * for today; one more on Today makes ten, and the page says so where it was
 * earned. The goal card lists what it has and what is next, and the Review
 * step celebrates the week first and can keep it in Magic moments, on the
 * account. (The bigger goal's list is `goalAchievementsCard.test.tsx`.)
 */

const PLAN = {
  version: 1,
  seq: 3,
  areas: [{ id: "lm_relationship", label: "Relationship", sublabel: "Love", color: "#f43f5e", custom: false }],
  routines: [],
  goals: [
    {
      id: "g1", areaId: "lm_relationship", title: "E2E approaches", type: "habit_ramp", why: "To meet her",
      daysPerWeek: 7, perWeek: 21, unit: "approaches", rampSteps: null, targetDate: null, feedsGoalIds: ["g2"], values: [],
    },
    { id: "g2", areaId: "lm_relationship", title: "E2E a girlfriend", type: "achievement", targetDate: null, feedsGoalIds: [], values: [] },
  ],
  priorityIds: ["g1", "g2"],
  review: {},
  answers: {},
  currentValues: [],
  values: [],
  seasonFocusId: null,
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

test.describe("achievements", () => {
  test("ten approaches: said on Today, listed on the goals, celebrated first in the week's review", async ({ page, account, accountTimezone }) => {
    await seedLifePlan(page, account.id, PLAN)
    const res = await page.request.put("/api/life-plan/day", { data: { date: todayKey(), numbers: { g1: 9 } } })
    expect(res.status(), await res.text()).toBe(200)

    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByText("Saved to your account.")).toBeVisible()
    await expect(page.getByTestId("earned-today")).not.toContainText("10 approaches in all")
    await page.getByRole("button", { name: "Log one E2E approaches" }).click()
    await expect(page.getByTestId("earned-today")).toContainText("10 approaches in all")

    // The goal's own card: what it has, and what is next.
    await page.getByRole("button", { name: "Open E2E approaches to change its date or its numbers" }).click()
    const own = page.getByRole("list", { name: "Achievements on E2E approaches" })
    await expect(own).toContainText("10 approaches in all")
    await expect(page.getByTestId("achievement-next").first()).toHaveText("Next: 25 approaches in all (15 to go)")

    // The week's review starts with it, and can keep it in Magic moments.
    await page.goto(thisWeeksReview(accountTimezone))
    const earned = page.getByTestId("review-earned")
    await expect(earned).toContainText("E2E approaches:")
    await expect(earned).toContainText("10 approaches in all")
    await earned.getByRole("button", { name: "Add these to Magic moments" }).click()
    await expect(page.getByLabel("Magic moments")).toHaveValue(/E2E approaches: 10 approaches in all/)
    await expect(earned.getByRole("button", { name: "Added" })).toBeDisabled()
    await expect
      .poll(async () => {
        const body = (await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }
        return body.plan.reviews.map((r) => r.magic_moments).join("\n")
      }, { timeout: 15_000 })
      .toContain("E2E approaches: 10 approaches in all")
  })
})
