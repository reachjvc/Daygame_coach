import { test, expect as baseExpect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { emptyNsPlan } from "@/src/goals/northStarService"
import { AREA_REVIEW_COPY, REVIEW_PERIOD_COPY, TAB_LABELS } from "@/src/goals/data/northStar"
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
    await expect(page.getByTestId("next")).toHaveText(`${TAB_LABELS.now} →`)
    expect(errors).toEqual([])
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })

  test("an area sheet and a goal card open on one section, switch with chips, and show it all", async ({ page, account }) => {
    test.setTimeout(900_000)
    await seedAndCopy(page, account.id)
    const plan = fullPlan()
    const area = plan.areas[0]
    const goal = plan.goals[0]
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    // the area sheet, from the Your 10s screen
    await page.goto(`${ROUTES.planNew}/now?area=${area.id}`, { timeout: NAV })
    const sheet = page.getByRole("dialog")
    await expect(sheet.getByTestId("area-sections")).toBeVisible({ timeout: NAV })
    await expect(sheet.getByText(AREA_REVIEW_COPY.ten.question).first()).toBeVisible()
    await expect(sheet.getByText(AREA_REVIEW_COPY.purpose.question, { exact: true })).toHaveCount(1) // only the chip
    await sheet.getByTestId("area-section-area.why").click()
    await expect(sheet.getByText(AREA_REVIEW_COPY.purpose.question, { exact: true })).toHaveCount(2) // chip and question
    await expect(sheet.getByText(AREA_REVIEW_COPY.ten.question, { exact: true })).toHaveCount(1)
    expect(new URL(page.url()).searchParams.get("part")).toBe("area.why")
    await sheet.getByTestId("area-section-all").click()
    await expect(sheet.getByText(AREA_REVIEW_COPY.ten.question, { exact: true })).toHaveCount(2)
    await expect(sheet.getByText(AREA_REVIEW_COPY.purpose.question, { exact: true })).toHaveCount(2)
    // the goal card, from the Experiences screen
    await page.goto(`${ROUTES.planNew}/milestones?area=${goal.areaId}&goal=${goal.id}`, { timeout: NAV })
    const card = page.getByRole("dialog")
    await expect(card.getByTestId("goal-sections")).toBeVisible({ timeout: NAV })
    await expect(card.getByTestId("goal-section-goal.shape")).toHaveAttribute("aria-pressed", "true")
    await expect(card.getByLabel(/^Why you want:/)).toHaveCount(0)
    await card.getByTestId("goal-section-goal.why").click()
    await expect(card.getByLabel(/^Why you want:/)).toHaveCount(1)
    await card.getByTestId("goal-section-goal.stops").click()
    await expect(card.getByLabel(/^Why you want:/)).toHaveCount(0)
    await card.getByTestId("goal-section-all").click()
    await expect(card.getByLabel(/^Why you want:/)).toHaveCount(1)
    expect(errors).toEqual([])
  })

  test("the review period survives a move between the review's screens and a reload", async ({ page, account }) => {
    test.setTimeout(600_000)
    await seedAndCopy(page, account.id)
    await page.goto(`${ROUTES.planNew}/review.open`, { timeout: NAV })
    await expect(page.getByTestId("review-period")).toBeVisible({ timeout: NAV })
    const now = (await page.getByTestId("review-period").textContent())?.trim()
    await page.getByRole("button", { name: REVIEW_PERIOD_COPY.earlierPeriod }).click()
    await expect(page.getByTestId("review-period")).not.toHaveText(now ?? "")
    const earlier = (await page.getByTestId("review-period").textContent())?.trim()
    await expect.poll(() => new URL(page.url()).searchParams.get("period")).toMatch(/^week-\d{4}-\d{2}-\d{2}$/)
    await page.getByTestId("next").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(`${ROUTES.planNew}/review.goals`)
    await expect(page.getByTestId("review-period")).toHaveText(earlier ?? "", { timeout: NAV })
    await page.reload({ timeout: NAV })
    await expect(page.getByTestId("review-period")).toHaveText(earlier ?? "", { timeout: NAV })
  })
})

test.describe("the plan home (Q4, Q4b, Q5)", () => {
  test("shows the season band, Next up, a status and summary for every step, no locks, Plan my week, earlier notes", async ({ page, account }) => {
    test.setTimeout(900_000)
    const plan = { ...emptyNsPlan(), northStar: "A life I chose, with a house by the water.", answers: { star_why: "Because I said so.", identity_total: "A man who keeps his word." }, season: { id: "s1", startedOn: "2026-11-01", endsOn: "2099-12-31", sentence: "Run the half marathon." }, rungs: { place: "A small house near the water." } }
    await seedAndCopy(page, account.id, plan, { everyDayStep: false })
    const ownerBefore = await fingerprint(account.id)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    const home = page.getByTestId("plan-home")
    await expect(home).toBeVisible({ timeout: NAV })
    // season band: his sentence, with days left
    await expect(home.getByTestId("season-band")).toContainText("Run the half marathon.")
    await expect(home.getByTestId("season-band")).toContainText(/days left/)
    // Next up: the north star's second screen (paragraph and why are written; the boxes under it are not)
    await expect(home.getByTestId("next-up-name")).toHaveText(TAB_LABELS.star)
    await expect(home.getByTestId("next-up-go")).toHaveText("Continue")
    await expect(home.getByTestId("next-up")).toContainText(/questions under the paragraph/)
    // every build step has a row with a status; the north star shows its Done summary; none is locked
    for (const step of ["star", "now", "pick", "systems", "milestones", "focus", "values", "recap"]) await expect(home.getByTestId(`home-${step}`)).toBeVisible()
    await expect(home.getByTestId("home-star-summary")).toContainText("A life I chose")
    await expect(home.getByTestId("home-star-state")).toHaveText(/^\d+ %$/)
    await expect(home.getByText(/^After /)).toHaveCount(0) // the first rebuild's "After <module>" lock
    // a later step opens at once, whatever the earlier ones hold
    await home.getByTestId("home-values-open").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(`${ROUTES.planNew}/values.so-far`)
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    // the earlier notes: his own old text no new screen asks for (the ladder answer), copyable
    await expect(page.getByTestId("earlier-notes")).toBeVisible()
    // the parts of a split step are each one tap away
    await page.getByTestId("home-star-parts").click()
    await page.getByTestId("home-part-star.self").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(`${ROUTES.planNew}/star.self`)
    // Plan my week: the guided build, on the copy
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    await page.getByTestId("deepen-week-open").click()
    await expect(page.getByTestId("plan-my-week")).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    await expect(page.getByText("Your goals", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Make them real").first()).toBeVisible()
    expect(errors).toEqual([])
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })
})
