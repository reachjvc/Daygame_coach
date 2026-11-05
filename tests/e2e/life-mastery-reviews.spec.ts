import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan } from "./helpers/lifePlan"
import type { PlanRows } from "@/src/db/lifePlanTypes"

/**
 * REVIEWS: A WEEK, MONTH, QUARTER OR YEAR (Plans/life-plan-rebuild.md, Phase 5).
 *
 * Through the real page and the real account: a weekly review scores an area
 * and keeps its magic moments; both are on the account across a reload with
 * this browser's copy thrown away; the first review copied from Your 10s shows
 * as "last time" and starts the scores over time; and a month, a quarter and a
 * year can each be written.
 */

const MOMENT = "E2E: the long walk on Sunday."

async function accountReviews(page: import("@playwright/test").Page) {
  const res = await page.request.get("/api/life-plan")
  const body = (await res.json()) as { plan: PlanRows }
  return [...body.plan.reviews].sort((a, b) => a.cadence.localeCompare(b.cadence)).map((r) => ({
    cadence: r.cadence,
    magic: r.magic_moments,
    outcomes: r.next_outcomes,
    scores: body.plan.review_scores.filter((s) => s.review_id === r.id).map((s) => s.score),
  }))
}

test.describe("the Review step", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, {
      version: 1,
      seq: 10,
      northStar: "E2E: a plan with a north star.",
      review: { lm_health: { fortnight: 3 } },
      // As the migration copies it: the Your 10s scores, two weeks to 23 Sep.
      reviews: [
        {
          id: "fortnight-2026-09-10", cadence: "fortnight", periodStart: "2026-09-10", periodEnd: "2026-09-23",
          writtenOn: "2026-09-23", scores: { lm_health: 3 }, magicMoments: "", lessons: "", nextOutcomes: "",
        },
      ],
    })
  })

  test("writes a week, keeps it on the account, and shows the scores over time", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible()
    await expect(page.getByTestId("review-last")).toHaveText("No weekly review yet.")
    // The copied first review is what health scored last time.
    // The app's en-GB dates; newer ICU spells September "Sept".
    await expect(page.getByText(/^last time 3, 10 – 23 Sept? 2026$/)).toBeVisible()

    await page.getByRole("button", { name: /^Score Health 7 out of 10/ }).click()
    await expect(page.getByRole("button", { name: /^Score Health 7 out of 10/ })).toHaveAttribute("aria-pressed", "true")
    await page.getByLabel("Magic moments").fill(MOMENT)
    await page.getByLabel("Lessons").click()

    await expect.poll(() => accountReviews(page), { timeout: 15_000 }).toEqual([
      { cadence: "fortnight", magic: "", outcomes: "", scores: [3] },
      { cadence: "week", magic: MOMENT, outcomes: "", scores: [7] },
    ])

    await page.evaluate(() => window.localStorage.clear())
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByTestId("review-last")).toContainText("Last weekly review: today")
    await expect(page.getByLabel("Magic moments")).toHaveValue(MOMENT)
    const overTime = page.getByTestId("review-over-time")
    await expect(overTime.getByRole("row", { name: /Health/ })).toContainText("3")
    await expect(overTime.getByRole("row", { name: /Health/ })).toContainText("7")

    // The week before is empty, and looking at it writes nothing.
    await page.getByRole("button", { name: "Earlier", exact: true }).click()
    await expect(page.getByLabel("Magic moments")).toHaveValue("")
    await page.getByRole("button", { name: "Back to now" }).click()
    await expect(page.getByLabel("Magic moments")).toHaveValue(MOMENT)
  })

  /**
   * YOUR 10s READS AND RATES THE REVIEWS (the owner, 2026-11-05). The wheel
   * shows the latest review's score; rating an area there writes this week's
   * review, the one the Review step opens; the old two-week number on the
   * area row is left as it was, for Phase 7.
   */
  test("Your 10s shows the latest review and rates into this week's", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=now`)
    const health = page.getByRole("button", { name: /^Health\. .*Open it\.$/ })
    await expect(health).toHaveAccessibleName(/Rated 3 out of 10/)
    await health.click()
    await expect(page.getByTestId("area-latest-score")).toHaveText(/^The wheel shows 3, from your review of 10 – 23 Sept? 2026\.$/)

    await page.getByRole("button", { name: "Rate Health 7 out of 10 for this week" }).click()
    await expect(page.getByRole("button", { name: "Rate Health 7 out of 10 for this week" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("area-latest-score")).toHaveCount(0)
    await expect.poll(() => accountReviews(page), { timeout: 15_000 }).toEqual([
      { cadence: "fortnight", magic: "", outcomes: "", scores: [3] },
      { cadence: "week", magic: "", outcomes: "", scores: [7] },
    ])
    const areas = async () => ((await (await page.request.get("/api/life-plan")).json()) as { plan: PlanRows }).plan.areas
    expect((await areas()).find((a) => a.label === "Health")?.review_fortnight).toBe(3)

    // The Review step holds the same score, across a reload with this browser's copy thrown away.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByRole("button", { name: /^Score Health 7 out of 10/ })).toHaveAttribute("aria-pressed", "true")
    await page.goto(`${ROUTES.plan}?step=now`)
    await expect(health).toHaveAccessibleName(/Rated 7 out of 10/)

    // A second click takes this week's score out; the wheel goes back to September's.
    await health.click()
    await page.getByRole("button", { name: "Rate Health 7 out of 10 for this week" }).click()
    await expect(page.getByTestId("area-latest-score")).toBeVisible()
    await expect.poll(() => accountReviews(page), { timeout: 15_000 }).toEqual([
      { cadence: "fortnight", magic: "", outcomes: "", scores: [3] },
    ])
    await page.keyboard.press("Escape")
    await expect(health).toHaveAccessibleName(/Rated 3 out of 10/)
  })

  test("writes a month, a quarter and a year, each its own review", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=review`)
    const kinds = page.getByRole("group", { name: "How often" })
    for (const [kind, text] of [["Month", "E2E: month"], ["Quarter", "E2E: quarter"], ["Year", "E2E: year"]] as const) {
      await kinds.getByRole("button", { name: kind }).click()
      await expect(kinds.getByRole("button", { name: kind })).toHaveAttribute("aria-pressed", "true")
      await page.getByLabel("Next outcomes").fill(text)
      await page.getByLabel("Lessons").click()
    }
    await expect.poll(async () => (await accountReviews(page)).map((r) => [r.cadence, r.outcomes]).sort(), { timeout: 15_000 }).toEqual([
      ["fortnight", ""],
      ["month", "E2E: month"],
      ["quarter", "E2E: quarter"],
      ["year", "E2E: year"],
    ])
    await kinds.getByRole("button", { name: "Month" }).click()
    await expect(page.getByLabel("Next outcomes")).toHaveValue("E2E: month")
  })
})
