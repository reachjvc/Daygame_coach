import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { planWithSteps, seedLifePlan } from "./helpers/lifePlan"

/**
 * A TODAY BOX THAT HOLDS A NUMBER (Plans/life-plan-rebuild.md, Phase 6).
 *
 * The phase's own test: a test account adds a number box, types a number,
 * reloads with this browser's copy thrown away, and sees it, on Today and on
 * the day's summary in the journal.
 */

const BOX = "E2E approaches"

test.describe("a number box", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, planWithSteps([{ id: "s90", title: "E2E walk", daysPerWeek: 7 }]))
  })

  test("is added on Today, keeps a number on the account, and shows on the day's summary", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=today`)
    await page.getByRole("button", { name: "Add a field" }).click()
    await page.getByLabel("What this field asks").fill(BOX)
    await page.getByLabel("Kind").selectOption("number")

    const box = page.getByLabel(BOX, { exact: true })
    await box.fill("5,5")
    await box.press("Enter")
    await expect(box).toHaveValue("5.5")

    await expect.poll(async () => {
      const res = await page.request.get("/api/life-plan/day")
      const body = (await res.json()) as { numbers?: Record<string, Record<string, number>> }
      return Object.values(body.numbers ?? {}).flatMap((row) => Object.values(row))
    }, { timeout: 15_000 }).toEqual([5.5])

    await page.evaluate(() => window.localStorage.clear())
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByLabel(BOX, { exact: true })).toHaveValue("5.5")

    await page.goto(`${ROUTES.plan}?step=journal`)
    await expect(page.getByTestId("journal-day-numbers").first()).toHaveText(`${BOX} 5.5`)

    // Emptied, it is gone from the account, not kept as zero.
    await page.goto(`${ROUTES.plan}?step=today`)
    const again = page.getByLabel(BOX, { exact: true })
    await again.fill("")
    await again.press("Enter")
    await expect.poll(async () => {
      const res = await page.request.get("/api/life-plan/day")
      const body = (await res.json()) as { numbers?: Record<string, Record<string, number>> }
      return Object.keys(body.numbers ?? {}).length
    }, { timeout: 15_000 }).toBe(0)
  })
})
