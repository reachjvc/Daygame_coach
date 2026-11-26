import { test, expect as baseExpect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { fingerprint, seedAndCopy } from "./helpers/planNewCopy"
import { SEQUENCE_KEY } from "@/src/goals/planSteps/planFacts"
import { TAB_ORDER } from "@/src/goals/data/northStar"

/**
 * THE OLD VERSION ON /plan/new: today's plan on the copy, every page whole (the owner's ask, 2026-11-26).
 * Each of the twelve steps shows on /plan/new/<step> every line today's flow on the same copy (/plan/sandbox) shows for it;
 * no step is cut into parts, and the area sheet and goal card show no part chips. The owner's rows never move.
 */
const expect = baseExpect.configure({ timeout: 45_000 })
const NAV = 120_000

async function lines(page: Page): Promise<string[]> {
  // Open every fold in the content, so a closed one does not hide lines on one side only.
  for (let pass = 0; pass < 3; pass++) {
    await page.evaluate(() => {
      document.querySelectorAll("details:not([open])").forEach((d) => ((d as HTMLDetailsElement).open = true))
      document.querySelectorAll<HTMLElement>('button[aria-expanded="false"]').forEach((b) => { if (!b.closest("#plan-sections") && !b.hasAttribute("data-fold-skip")) b.click() })
    })
    await page.waitForLoadState("networkidle")
  }
  return (await page.locator("body").innerText()).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean)
}

async function open(page: Page, url: string): Promise<string[]> {
  await page.goto(url, { timeout: NAV })
  // Both pages draw the paragraph box on the north star step only; the step's own text is what is compared, so wait
  // until the plan has loaded (the copy-space banner, then no requests left).
  await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible({ timeout: NAV })
  await page.waitForLoadState("networkidle")
  return lines(page)
}

test.describe.configure({ mode: "serial" })

test("Old: every step is one whole page with every line today's flow shows for it", async ({ page, account }) => {
  test.setTimeout(1_200_000)
  const full = fullPlan()
  await seedAndCopy(page, account.id, { ...full, answers: { ...full.answers, [SEQUENCE_KEY]: "old" } })
  const ownerBefore = await fingerprint(account.id)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))

  const steps = [...TAB_ORDER]
  const oldFlow: Record<string, string[]> = {}
  for (const step of steps) oldFlow[step] = await open(page, `${ROUTES.planSandbox}?step=${step}`)
  // Lines every step page of today's flow shares are its frame (banner, step picker), not the step's own content.
  const frame = new Set(oldFlow[steps[0]].filter((l) => steps.every((s) => oldFlow[s].includes(l))))

  for (const step of steps) {
    const here = await open(page, `${ROUTES.planNew}/${step}`)
    await expect(page).toHaveURL(new RegExp(`${ROUTES.planNew}/${step}(\\?|$)`))
    await expect(page.getByTestId("section-bar")).toHaveCount(0)
    const missing = oldFlow[step].filter((l) => !frame.has(l) && !here.includes(l))
    expect(missing, `${step}: lines today's flow shows that the Old version does not`).toEqual([])
  }

  // A saved link to a part lands on its whole page.
  await page.goto(`${ROUTES.planNew}/star.self`, { timeout: NAV })
  await expect(page.locator("#north-star-paragraph")).toHaveValue(full.northStar, { timeout: NAV })
  await expect(page.getByTestId("star-values-pointer")).toBeVisible()

  // The area sheet and the goal card show every part at once: no part chips.
  const area = full.areas[0]
  const goal = full.goals[0]
  await page.goto(`${ROUTES.planNew}/now?area=${area.id}`, { timeout: NAV })
  await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: NAV })
  await expect(page.getByTestId("area-sections")).toHaveCount(0)
  await page.goto(`${ROUTES.planNew}/milestones?area=${goal.areaId}&goal=${goal.id}`, { timeout: NAV })
  await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: NAV })
  await expect(page.locator('[data-testid^="goal-section-"]')).toHaveCount(0)

  expect(errors).toEqual([])
  expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
})

test("the switcher offers Old first and keeps it after a reload", async ({ page, account }) => {
  test.setTimeout(600_000)
  await seedAndCopy(page, account.id, fullPlan())
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
  const sw = page.getByTestId("version-switcher")
  await expect(sw).toBeVisible({ timeout: NAV })
  await expect(sw.getByRole("button").first()).toHaveText("Old")
  await page.getByTestId("version-old").click()
  await expect(page.getByTestId("version-old")).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("version-blurb")).toContainText("Exactly today's plan")
  await expect.poll(async () => { await page.reload({ timeout: NAV }); return page.getByTestId("version-old").getAttribute("aria-pressed") }, { timeout: 90_000 }).toBe("true")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.goto(`${ROUTES.planNew}/star`, { timeout: NAV })
  await expect(page.locator("#north-star-paragraph")).toBeVisible({ timeout: NAV })
  await page.waitForLoadState("networkidle")
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: test.info().outputPath("old-star-390.png"), fullPage: true })
})
