import { test, expect as baseExpect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { emptyNsPlan } from "@/src/goals/northStarService"
import { PROGRESS_COPY, TODO_COPY } from "@/src/goals/data/northStar"
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

  test("nothing disappears: every line of a step's see-it-all page is on one of its short screens", async ({ page, account }) => {
    test.setTimeout(900_000)
    await seedAndCopy(page, account.id)
    const lines = async () =>
      (await page.locator("body").innerText()).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean)
    const chrome = /^(Part \d+ of \d+|See it all on one page|Back to the short screens)/
    for (const [step, list] of Object.entries(STEP_SECTIONS)) {
      const ids = list as readonly string[]
      const union = new Set<string>()
      for (const id of ids) {
        await page.goto(`${ROUTES.planNew}/${id}`, { timeout: NAV })
        await expect(page.getByTestId(`sequence-${id}`)).toBeVisible({ timeout: NAV })
        await expect(page.getByTestId("see-it-all")).toBeVisible()
        await page.waitForTimeout(1500)
        for (const l of await lines()) union.add(l)
      }
      await page.goto(`${screenRoute(V1, V1.screens.find((s) => s.step === step)!)}?all=1`, { timeout: NAV })
      await expect(page.getByTestId("see-it-all")).toHaveText("Back to the short screens", { timeout: NAV })
      await page.waitForTimeout(1500)
      const missing = (await lines()).filter((l) => !chrome.test(l) && !union.has(l))
      expect(missing, `${step}: lines on the whole page that no short screen shows`).toEqual([])
    }
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

test.describe("one rule for every number (Q6)", () => {
  test("North star is 100 % on the picker, the progress list and the home, with no chip, once every box is filled", async ({ page, account }) => {
    test.setTimeout(600_000)
    const plan = {
      ...emptyNsPlan(),
      northStar: "A life I chose.",
      answers: { star_why: "Because I said so.", identity_total: "a", conduct: "b", become: "c", affirmations: "d" },
    }
    await seedAndCopy(page, account.id, plan, { everyDayStep: false })
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    // The picker's card, on a build screen
    await page.goto(`${ROUTES.planNew}/star.self`, { timeout: NAV })
    const card = page.locator("#plan-sections").getByRole("button", { name: new RegExp(`^\\d+\\s*${TAB_LABELS.star}`) }).first()
    await expect(card).toContainText(PROGRESS_COPY.railLine(1, []), { timeout: NAV })
    // "Still to fill in": nothing about the north star
    await expect(page.getByText("Your north star paragraph", { exact: true })).toHaveCount(0)
    await expect(page.getByText(/questions? under the paragraph still blank/)).toHaveCount(0)
    // The progress list on Everything: the same 100 %
    await page.goto(`${ROUTES.planNew}/everything.driving-force`, { timeout: NAV })
    const list = page.getByTestId("plan-progress")
    await expect(list).toBeVisible({ timeout: NAV })
    await expect(list.getByRole("button", { name: new RegExp(TAB_LABELS.star) })).toContainText("100 %")
    // The plan home: Done, and Next up has moved on
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    await expect(page.getByTestId("home-star-state")).toHaveText("Done", { timeout: NAV })
    await expect(page.getByTestId("home-star-chip")).toHaveCount(0)
    await expect(page.getByTestId("next-up-name")).not.toHaveText(TAB_LABELS.star)
    // The percentages on the home and the progress list are one number
    const total = (await page.getByTestId("plan-percent").textContent())?.trim()
    await page.goto(`${ROUTES.planNew}/everything.driving-force`, { timeout: NAV })
    await expect(page.getByTestId("plan-progress").getByRole("heading")).toContainText(String(total).replace(" %", " %"))
    expect(errors).toEqual([])
    void TODO_COPY
  })

  test("a part-filled north star names what is left on every surface, and the chip lands on the screen that holds it", async ({ page, account }) => {
    test.setTimeout(600_000)
    const plan = { ...emptyNsPlan(), northStar: "A life I chose.", answers: {} }
    await seedAndCopy(page, account.id, plan, { everyDayStep: false })
    await page.goto(`${ROUTES.planNew}/star.vision`, { timeout: NAV })
    const chip = page.getByRole("button", { name: /questions under the paragraph still blank/ })
    await expect(chip).toBeVisible({ timeout: NAV })
    await chip.click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(`${ROUTES.planNew}/star.self`)
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    await expect(page.getByTestId("home-star-chip")).toContainText(/Why that life matters to you/)
    await expect(page.getByTestId("home-star-state")).toHaveText(/^\d+ %$/)
  })
})

test.describe("buttons beside the drag (Q9)", () => {
  test("the value order moves a value up and down with buttons, saves to the copy and survives a reload", async ({ page, account }) => {
    test.setTimeout(600_000)
    const sandboxId = await seedAndCopy(page, account.id)
    const ownerBefore = await fingerprint(account.id)
    await page.goto(`${ROUTES.planNew}/values.order`, { timeout: NAV })
    const order = () => page.getByLabel(/^Reorder /).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))
    await expect(page.getByLabel(/^Reorder /).first()).toBeVisible({ timeout: NAV })
    const before = await order()
    expect(before.length).toBeGreaterThanOrEqual(2)
    // every row has both buttons, each at least 44 px, the first cannot go up and the last cannot go down
    const ups = page.getByRole("button", { name: /^Move .+ up$/ })
    const downs = page.getByRole("button", { name: /^Move .+ down$/ })
    await expect(ups).toHaveCount(before.length)
    await expect(downs).toHaveCount(before.length)
    for (const b of [...(await ups.all()), ...(await downs.all())]) {
      const box = await b.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    await expect(ups.first()).toBeDisabled()
    await expect(downs.last()).toBeDisabled()
    await downs.first().click()
    await expect.poll(order).toEqual([before[1], before[0], ...before.slice(2)])
    // saved to the copy (the store flushes), then the same order after a reload
    await expect.poll(async () => {
      const { rows } = await (await import("./helpers/planNewCopy")).withDb((db) => db.query("select count(*)::int as n from public.life_plan_values where user_id = $1", [sandboxId]))
      return rows[0].n
    }).toBeGreaterThan(0)
    await page.waitForTimeout(2500)
    await page.reload({ timeout: NAV })
    await expect(page.getByLabel(/^Reorder /).first()).toBeVisible({ timeout: NAV })
    expect(await order()).toEqual([before[1], before[0], ...before.slice(2)])
    // and back up
    await page.getByRole("button", { name: /^Move .+ up$/ }).nth(1).click()
    await expect.poll(order).toEqual(before)
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })

  test("the curve editor gets shape and step buttons beside the drag, 44 px high", async ({ page, account }) => {
    test.setTimeout(600_000)
    const full = fullPlan()
    const g = full.goals[0]
    const plan = { ...full, goals: full.goals.map((x, i) => (i === 0 ? { ...x, type: "milestone_ladder", unit: "km", ladder: { start: 0, target: 42, steps: 5, curveTension: 0, controlPoints: [], pins: [] } } : x)) }
    await seedAndCopy(page, account.id, plan)
    await page.goto(`${ROUTES.planNew}/milestones?area=${g.areaId}&goal=${g.id}`, { timeout: NAV })
    const card = page.getByRole("dialog")
    await expect(card.getByTestId("goal-sections")).toBeVisible({ timeout: NAV })
    const buttons = card.getByTestId("curve-buttons")
    await expect(buttons).toBeVisible({ timeout: NAV })
    for (const b of await buttons.getByRole("button").all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await expect(buttons.getByRole("button", { name: "Curve shape: Linear" })).toHaveAttribute("aria-pressed", "true")
    await buttons.getByRole("button", { name: "Curve shape: Many small wins" }).click()
    await expect(buttons.getByRole("button", { name: "Curve shape: Many small wins" })).toHaveAttribute("aria-pressed", "true")
    await expect(buttons.getByRole("button", { name: "Curve shape: Linear" })).toHaveAttribute("aria-pressed", "false")
    await buttons.getByRole("button", { name: /^More milestones/ }).click()
    await expect(card.locator("span", { hasText: /^6 milestones$/ })).toBeVisible()
  })
})

test.describe("once the plan is in use /plan/new opens on Today (Q10)", () => {
  test("opens on Today when a goal or a routine step exists; the plan home stays one tap away", async ({ page, account }) => {
    test.setTimeout(600_000)
    await seedAndCopy(page, account.id) // goals and a routine step: in use
    const ownerBefore = await fingerprint(account.id)
    await page.goto(ROUTES.planNew, { timeout: NAV })
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(`${ROUTES.planNew}/today`)
    await expect(page.getByTestId("sequence-today")).toBeVisible({ timeout: NAV })
    await page.getByTestId("plan-home-link").click()
    await expect(page.getByTestId("plan-home")).toBeVisible({ timeout: NAV })
    expect(new URL(page.url()).searchParams.get("home")).toBe("1")
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })

  test("a plan with nothing to do yet opens on the plan home", async ({ page, account }) => {
    test.setTimeout(600_000)
    await seedAndCopy(page, account.id, { ...emptyNsPlan(), northStar: "A life." }, { everyDayStep: false })
    await page.goto(ROUTES.planNew, { timeout: NAV })
    await expect(page.getByTestId("plan-home")).toBeVisible({ timeout: NAV })
    expect(new URL(page.url()).pathname).toBe(ROUTES.planNew)
  })
})
