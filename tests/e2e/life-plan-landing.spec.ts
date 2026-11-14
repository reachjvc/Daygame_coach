import { test, expect, signIn } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { seedLifePlan, planWithSteps, openBuildSteps } from "./helpers/lifePlan"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { dueWeekPeriod, isoWeekday } from "@/src/goals/dueNowService"
import { periodLabel, periodOf } from "@/src/goals/reviewService"

/**
 * WHERE /plan OPENS (Plans/life-plan-after-setup.md, Phase 1).
 *
 * A plan with something to do (an active goal or a routine step) opens on
 * Today; one with nothing to do opens on North star, as before; a link that
 * names a step still opens that step. The account fixture is shared by one
 * worker's tests, so every test seeds its own plan first.
 */

const current = (page: Page) => page.getByRole("navigation", { name: "Sections" }).locator('[aria-current="step"]')
const inUse = () => planWithSteps([{ id: "s1", title: "Stretch", daysPerWeek: 7 }])

test.describe("where the plan opens", () => {
  test("a plan with nothing to do opens on North star", async ({ page, account }) => {
    await seedLifePlan(page, account.id, planWithSteps([]))
    await page.goto(ROUTES.plan)
    await expect(current(page)).toContainText("North star")
  })

  test("a plan with a routine step opens on Today", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    await page.goto(ROUTES.plan)
    await expect(current(page)).toContainText("Today")
  })

  test("an asked step still wins", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(current(page)).toContainText("Review")
  })

  test("Review opens without a React key warning", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    const errors: string[] = []
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByTestId("review-last")).toBeVisible()
    await page.getByRole("button", { name: /^Score .+ 4 out of 10/ }).first().click()
    await expect(page.getByText("Saved to your account.")).toBeVisible()
    await page.reload()
    await expect(page.getByTestId("review-last")).toBeVisible()
    expect(errors.filter((e) => e.includes("same key"))).toEqual([])
  })
})

test.describe("the step cards", () => {
  test("a plan in use shows the use steps first and folds the rest", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    await page.goto(ROUTES.plan)
    const cards = page.getByRole("navigation", { name: "Sections" }).getByRole("button")
    await expect(cards.nth(0)).toHaveText(/^\d+\s*Today/)
    await expect(cards.nth(1)).toHaveText(/^\d+\s*Review/)
    await expect(cards.nth(2)).toHaveText(/^\d+\s*Journal/)
    await expect(cards.nth(3)).toHaveText(/^\d+\s*Track/)
    await expect(page.getByRole("button", { name: /^\d+\s*North star/ })).toHaveCount(0)
    await openBuildSteps(page)
    await expect(page.getByRole("button", { name: /^\d+\s*North star/ })).toHaveCount(1)
  })

  test.describe("@phone", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test("on a phone the step list folds into one line", async ({ page, account }) => {
      await seedLifePlan(page, account.id, inUse())
      await page.goto(ROUTES.plan)
      const nav = page.getByRole("navigation", { name: "Sections" })
      await expect(nav).toBeHidden()
      const toggle = page.getByRole("button", { name: /^Today · all steps/ })
      await expect(toggle).toBeVisible()
      await toggle.click()
      await expect(nav).toBeVisible()
    })
  })
})

test.describe("words and folds", () => {
  const withStar = () => ({ ...inUse(), northStar: "A calm, strong life." })

  test("Review shows the north star", async ({ page, account }) => {
    await seedLifePlan(page, account.id, withStar())
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByTestId("review-north-star")).toContainText("A calm, strong life.")
  })

  test("How today went starts folded", async ({ page, account }) => {
    await seedLifePlan(page, account.id, withStar())
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByRole("button", { name: /^How today went/ })).toHaveAttribute("aria-expanded", "false")
    await expect(page.getByRole("button", { name: /today: 4 out of 10/ })).toHaveCount(0)
    await page.getByRole("button", { name: /^How today went/ }).click()
    await expect(page.getByRole("button", { name: /today: 4 out of 10/ }).first()).toBeVisible()
  })

  test("an account with no plan yet says its writing goes to the account", async ({ page, context, throwawayAccount }) => {
    await context.clearCookies()
    await signIn(page, throwawayAccount)
    await page.goto(`${ROUTES.plan}?step=star`)
    await expect(page.getByText("Saves to your account as you write.")).toBeVisible()
  })
})

test.describe("the weekly review reminder", () => {
  test("switched on, Monday at 08:00, and still so after a reload", async ({ page, account }) => {
    await seedLifePlan(page, account.id, inUse())
    await page.goto(`${ROUTES.plan}?step=review`)
    const block = page.getByTestId("review-reminder")
    const toggle = block.getByRole("switch", { name: "Weekly reminder" })
    // Each change is one PUT; wait for it to land before the next.
    const saved = () => page.waitForResponse((r) => r.url().includes("/api/life-plan/reminders") && r.request().method() === "PUT" && r.ok())
    if ((await toggle.getAttribute("aria-checked")) !== "true") await Promise.all([saved(), toggle.click()])
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await Promise.all([saved(), block.getByLabel("Day").selectOption("1")])
    await expect(block.getByRole("status")).toHaveText("Saved to your account.")
    await Promise.all([saved(), block.getByLabel("Time").selectOption("8")])
    await expect(block.getByLabel("Time")).toHaveValue("8")
    await page.reload()
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await expect(block.getByLabel("Day")).toHaveValue("1")
    await expect(block.getByLabel("Time")).toHaveValue("8")
  })

  /**
   * Review picks its week from the reminder's day, once, when it opens
   * (Phase 6). The week it opens on with no link: the weekly card's week while
   * that card shows (3 days from the day), else this week.
   */
  const opensOn = (today: string, day: number) =>
    ((isoWeekday(today) - day + 7) % 7 <= 2 ? dueWeekPeriod(today, day) : periodOf("week", today))
  /** A day whose week differs from Sunday's today, when there is one (on a Sunday every day gives the same week). */
  const otherDay = (today: string) => [1, 2, 3, 4, 5, 6].find((d) => opensOn(today, d).start !== opensOn(today, 7).start) ?? 7

  test("Review waits for the reminder's day before it picks the week", async ({ page, account, accountTimezone }) => {
    const today = getTodayInTimezone(accountTimezone)
    const day = otherDay(today)
    await seedLifePlan(page, account.id, inUse())
    let release: () => void = () => {}
    const held = new Promise<void>((r) => { release = r })
    await page.route("**/api/life-plan/reminders", async (route) => {
      if (route.request().method() !== "GET") return route.continue()
      await held
      await route.fulfill({ json: { pushOn: false, reviewDay: day, reviewHour: 19, hasEnabledDevice: false } })
    })
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByText("Opening your reviews…")).toBeVisible()
    await expect(page.getByTestId("review-period")).toHaveCount(0)
    release()
    await expect(page.getByTestId("review-period")).toHaveText(periodLabel(opensOn(today, day)))
  })

  test("a failed reminder fetch still opens Review, on the default day's week", async ({ page, account, accountTimezone }) => {
    const today = getTodayInTimezone(accountTimezone)
    await seedLifePlan(page, account.id, inUse())
    await page.route("**/api/life-plan/reminders", (route) => route.abort())
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByTestId("review-period")).toHaveText(periodLabel(opensOn(today, 7)))
  })

  test("a reminder fetch that never answers opens Review after a short wait", async ({ page, account, accountTimezone }) => {
    const today = getTodayInTimezone(accountTimezone)
    await seedLifePlan(page, account.id, inUse())
    // Never answered: the step opens on its own after REMINDER_WAIT_MS (2 s).
    await page.route("**/api/life-plan/reminders", () => new Promise<void>(() => {}))
    await page.goto(`${ROUTES.plan}?step=review`)
    await expect(page.getByTestId("review-period")).toHaveText(periodLabel(opensOn(today, 7)), { timeout: 15_000 })
  })
})

test.describe("values live on step 7 (R1)", () => {
  test("step 1 has no value lists and points to step 7; step 7 shows what was written", async ({ page, account }) => {
    // Both lists written, as step 1 used to write them: the same two fields step 7 reads.
    await seedLifePlan(page, account.id, { ...inUse(), currentValues: ["Tidewater", "Lanternlight"], values: ["Ironwood", "Brightwater"] })
    await page.goto(`${ROUTES.plan}?step=star`)
    await expect(page.getByTestId("star-values-pointer")).toHaveText("Your values come later, on step 7, Values & identity.")
    await expect(page.getByText("What has been most important to you in your life?")).toHaveCount(0)
    await expect(page.getByText("What do your values need to be to create the life you want?")).toHaveCount(0)
    await page.goto(`${ROUTES.plan}?step=values`)
    await expect(page.getByText("What has been most important to you in your life?").first()).toBeVisible()
    for (const v of ["Tidewater", "Lanternlight", "Ironwood", "Brightwater"]) await expect(page.getByText(v, { exact: true }).first()).toBeVisible()
  })
})
