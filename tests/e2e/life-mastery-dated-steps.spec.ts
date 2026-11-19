import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan, thisWeeksReview } from "./helpers/lifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import { addDays, dayIn } from "./helpers/accountClock"

/**
 * STEPS WITH DAYS (Plans/life-plan-dated-steps.md), through the real page and
 * the real account: a finish-line goal's step whose day was three days ago is
 * on Today as three days late; ticking it there saves it done, with today as
 * its day, and it leaves the list; the week's review counts it.
 */

function plan(zone: string) {
  // the account's calendar, not the runner's (helpers/accountClock.ts says why)
  const daysFromNow = (n: number) => addDays(dayIn(zone), n)
  return {
    version: 1,
    seq: 6,
    northStar: "E2E: a plan with a north star.",
    areas: [{ id: "lm_mission", label: "Mission", sublabel: "Work", color: "#14b8a6", custom: false }],
    routines: [],
    goals: [
      {
        id: "g1", areaId: "lm_mission", title: "E2E launch the app", type: "achievement", targetDate: daysFromNow(20),
        feedsGoalIds: [], values: [],
        checkpoints: [
          { id: "c2", title: "E2E landing page", done: false, celebration: "", dueOn: daysFromNow(-3) },
          { id: "c3", title: "E2E pricing", done: false, celebration: "", dueOn: daysFromNow(5) },
        ],
      },
    ],
    priorityIds: ["g1"],
    review: {},
    answers: {},
    currentValues: [],
    values: [],
    seasonFocusId: null,
  }
}

test("a late step is on Today, and ticking it there keeps the day", async ({ page, account, accountTimezone }) => {
  await seedLifePlan(page, account.id, plan(accountTimezone))
  await page.goto(`${ROUTES.plan}?step=today`)
  await expect(page.getByText("Saved to your account.")).toBeVisible()
  const due = page.getByTestId("today-steps-due")
  await expect(due).toContainText("E2E landing page")
  await expect(due).toContainText("3 days late")
  await expect(due).not.toContainText("E2E pricing")

  await due.getByRole("button", { name: "Done: E2E landing page (E2E launch the app)" }).click()
  await expect(page.getByTestId("today-steps-due")).toHaveCount(0)
  await expect
    .poll(async () => {
      const body = (await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }
      return body.plan.checkpoints.map((c) => [c.title, c.done, c.done_on ?? null]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    }, { timeout: 15_000 })
    .toEqual([["E2E landing page", true, dayIn(accountTimezone)], ["E2E pricing", false, null]])

  await page.goto(thisWeeksReview(accountTimezone))
  await page.getByRole("button", { name: /Your other goals/ }).click()
  await expect(page.getByTestId("review-goals")).toContainText("1 of 2 steps done · 1 in this stretch")
})
