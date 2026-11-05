import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"

/**
 * THE REVIEW READS THE WEEK BACK (Plans/life-plan-review-reads-back.md),
 * through the real page and the real account.
 *
 * Last week's review set out what this week was to bring; this week has five
 * approaches logged. The Review step shows last week's outcomes, the goal at
 * 5 of 21, and the routine; an answer on the goal is saved with the review on
 * the account and is there after a reload. And the weekly-review step on
 * Today, which pointed at the Journal's questions, opens the Review step.
 */

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Last week's Monday and Sunday, Monday to Sunday as the app counts. */
function lastWeek(): { start: string; end: string } {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) - 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: dayKey(monday), end: dayKey(sunday) }
}

const OUTCOMES = "E2E: three evenings out."

function plan() {
  const week = lastWeek()
  return {
    version: 1,
    seq: 5,
    northStar: "E2E: a plan with a north star.",
    areas: [{ id: "lm_relationship", label: "Relationship", sublabel: "Love", color: "#f43f5e", custom: false }],
    routines: [
      {
        id: "r1", label: "E2E business routine", blueprintId: "morning", kind: "sequence", areaId: null, serves: [],
        daysPerWeek: 7, splitDays: [],
        steps: [
          { id: "s1", title: "E2E weekly review", minutes: 30, daysPerWeek: 1, dimension: "mind", servesGoalIds: [], days: [], startMin: null, goesTo: "journal:weekly-review" },
          { id: "s2", title: "E2E cold shower", minutes: 5, daysPerWeek: 7, dimension: "body", servesGoalIds: [], days: [], startMin: null },
        ],
      },
    ],
    goals: [
      {
        id: "g1", areaId: "lm_relationship", title: "E2E approaches", type: "habit_ramp", why: "To meet her",
        daysPerWeek: 7, perWeek: 21, unit: "approaches", rampSteps: null, targetDate: null, feedsGoalIds: [], values: [],
      },
    ],
    priorityIds: ["g1"],
    reviews: [
      {
        id: `week-${week.start}`, cadence: "week", periodStart: week.start, periodEnd: week.end, writtenOn: week.end,
        scores: {}, magicMoments: "", lessons: "", nextOutcomes: OUTCOMES,
      },
    ],
    review: {},
    answers: {},
    currentValues: [],
    values: [],
    seasonFocusId: null,
  }
}

test.describe("the Review step reads the week back", () => {
  test("last week's outcomes, the goal against its number, an answer kept on the account, the routine", async ({ page, account }) => {
    await seedLifePlan(page, account.id, plan())
    const res = await page.request.put("/api/life-plan/day", { data: { date: dayKey(new Date()), numbers: { g1: 5 } } })
    expect(res.status(), await res.text()).toBe(200)

    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByText("Saved to your account.")).toBeVisible()
    await expect(page.getByTestId("review-previous-outcomes")).toContainText(OUTCOMES)
    const goals = page.getByTestId("review-goals")
    await expect(goals).toContainText("E2E approaches")
    await expect(goals).toContainText("5 of 21")
    await expect(page.getByTestId("review-routines")).toContainText("E2E business routine")
    // Nothing ticked yet; what it plans so far depends on the day of the week.
    await expect(page.getByTestId("review-routines")).toContainText(/0 of \d+/)

    await page.getByRole("button", { name: "Behind: E2E approaches" }).click()
    await expect(page.getByRole("button", { name: "Behind: E2E approaches" })).toHaveAttribute("aria-pressed", "true")
    await expect
      .poll(async () => {
        const body = (await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }
        return body.plan.review_goals.map((r) => r.verdict)
      }, { timeout: 15_000 })
      .toEqual(["behind"])

    await page.evaluate(() => window.localStorage.clear())
    await page.reload()
    await expect(page.getByRole("button", { name: "Behind: E2E approaches" })).toHaveAttribute("aria-pressed", "true")
  })

  test("the weekly-review step on Today opens the Review step", async ({ page, account }) => {
    await seedLifePlan(page, account.id, plan())
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByText("Saved to your account.")).toBeVisible()
    await page.getByRole("button", { name: "E2E weekly review — open This week's review" }).click()
    await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible()
    await expect(page.getByTestId("review-goals")).toBeVisible()
  })
})
