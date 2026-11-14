import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { addDays } from "@/src/goals/oneThingService"
import { dueWeekPeriod } from "@/src/goals/dueNowService"
import { periodLabel, periodOf, reviewIdFor } from "@/src/goals/reviewService"
import { seedLifePlan, planWithSteps } from "./helpers/lifePlan"

/**
 * DUE NOW, ON TOP OF TODAY (Plans/life-plan-after-setup.md, Phase 3).
 *
 * Through the real page and a test account: an unfinished plan leads with
 * "Your plan is N % done" and "Not now" keeps it hidden across a reload; an ended
 * season shows; and a review link that names a week opens that week.
 */

const current = (page: Page) => page.getByRole("navigation", { name: "Sections" }).locator('[aria-current="step"]')
const plain = () => planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])

test.describe("Due now", () => {
  test("an unfinished plan shows its percentage first, and Not now hides it", async ({ page, account }) => {
    await seedLifePlan(page, account.id, plain())
    await page.goto(ROUTES.plan)
    const first = page.getByTestId("due-now").locator("li").first()
    await expect(first).toHaveAttribute("data-testid", "due-finish-setup")
    // Only a routine is written: Systems is full, the other six steps empty, 14 %.
    await expect(first).toContainText(/Your plan is 14 % done/)
    await expect(first).toContainText("Most left: North star")
    await expect(first.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "14")
    await first.getByRole("button").first().click()
    await expect(current(page)).toContainText("North star")

    await page.goto(ROUTES.plan)
    await page.getByTestId("due-finish-setup").getByRole("button", { name: "Not now" }).click()
    await page.reload()
    // The cards render once the account's plan has loaded, which the footer tells.
    await expect(page.getByText(/^Saved (to your account|on this device)\.$/)).toBeVisible()
    await expect(page.getByTestId("due-finish-setup")).toHaveCount(0)
  })

  test("an ended season shows", async ({ page, account, accountTimezone }) => {
    const today = getTodayInTimezone(accountTimezone)
    await seedLifePlan(page, account.id, {
      ...plain(),
      season: { id: "s1", startedOn: addDays(today, -40), endsOn: addDays(today, -3), sentence: "Get fit" },
    })
    await page.goto(ROUTES.plan)
    const ended = page.getByTestId("due-season-ended")
    await expect(ended).toBeVisible()
    const position = await page.getByTestId("due-now").locator("li").evaluateAll((lis) => lis.findIndex((li) => li.getAttribute("data-testid") === "due-season-ended"))
    expect(position).toBeLessThanOrEqual(1)
  })

  test("a review link opens that week", async ({ page, account, accountTimezone }) => {
    const today = getTodayInTimezone(accountTimezone)
    await seedLifePlan(page, account.id, plain())
    // Three weeks back: never the week Review opens on by itself, so only the link can open it.
    const p = periodOf("week", addDays(dueWeekPeriod(today, 7).start, -21))
    await page.goto(`${ROUTES.plan}?step=review&period=${reviewIdFor(p)}`)
    await expect(page.getByTestId("review-period")).toHaveText(periodLabel(p))
  })
})
