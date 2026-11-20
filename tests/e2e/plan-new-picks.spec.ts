import { test, expect as baseExpect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { fingerprint, seedAndCopy } from "./helpers/planNewCopy"
import { screenRoute, sequenceById } from "@/src/goals/planSteps/planSequences"
import { STEP_SECTIONS } from "@/src/goals/planSteps/planSections"

/**
 * HIS PICKS ON /plan/new (Plans/plan-new-from-real.md, Phase 6), on the copy space.
 *   6.2 long steps are short screens by topic; each keeps "see it all on one page"; the review period survives a screen change.
 * The owner's rows never move.
 */
const expect = baseExpect.configure({ timeout: 45_000 })
const NAV = 120_000
const V1 = sequenceById("v1")

test.describe.configure({ mode: "serial" })

test.describe("the split screens", () => {
  test("every section has its own screen; the short screen shows less than see-it-all; Next walks the parts", async ({ page, account }) => {
    test.setTimeout(900_000)
    await seedAndCopy(page, account.id)
    const ownerBefore = await fingerprint(account.id)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    for (const [step, list] of Object.entries(STEP_SECTIONS)) {
      const ids = list as readonly string[]
      const heights: number[] = []
      for (const id of ids) {
        await page.goto(`${ROUTES.planNew}/${id}`, { timeout: NAV })
        await expect(page.getByTestId(`sequence-${id}`)).toBeVisible({ timeout: NAV })
        await expect(page.getByTestId("section-title")).toContainText(`Part ${ids.indexOf(id) + 1} of ${ids.length}`)
        heights.push(await page.evaluate(() => document.documentElement.scrollHeight))
      }
      // See it all: the whole real step on one page, longer than any single part.
      await page.goto(`${screenRoute(V1, V1.screens.find((s) => s.step === step)!)}?all=1`, { timeout: NAV })
      await expect(page.getByTestId("see-it-all")).toHaveText("Back to the short screens", { timeout: NAV })
      const all = await page.evaluate(() => document.documentElement.scrollHeight)
      expect(all, `${step}: see-it-all is longer than every part`).toBeGreaterThan(Math.max(...heights))
    }
    // an old step address lands on the step's first screen
    await page.goto(`${ROUTES.planNew}/star`, { timeout: NAV })
    await expect(page.getByTestId("sequence-star.vision")).toBeVisible({ timeout: NAV })
    // Next from the first part is the second part of the same step, then the next step
    await page.getByTestId("next").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(`${ROUTES.planNew}/star.self`)
    await expect(page.getByTestId("next")).toHaveText("North star's next →".replace("North star's next", "Your 10s"))
    expect(errors).toEqual([])
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })
})
