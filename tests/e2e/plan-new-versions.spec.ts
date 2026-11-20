import { test, expect as baseExpect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import * as ns from "@/src/goals/northStarService"
import { fingerprint, seedAndCopy, withDb } from "./helpers/planNewCopy"
import { navLabel, nextScreen, prevScreen, screenRoute, sequenceById, type Sequence } from "@/src/goals/planSteps/planSequences"
import { SEQUENCE_KEY, SORTER_KEY, deeperKey } from "@/src/goals/planSteps/planFacts"
import { deepenItems } from "@/src/goals/planSteps/planHome"

/**
 * THE VERSIONS TO TRY ON /plan/new (Plans/plan-new-from-real.md, Phase 7), on the copy space.
 *   - the switcher (order V1-V3, sorter S1-S3) sets two plan answers, survives a reload, and touches no data;
 *   - each version is walkable end to end, as a new user and on copied data, and its Deepen screens open;
 *   - V3's go-deeper cards show only for areas in the season; "Not now" sticks;
 *   - S2 says where a line went and Undo puts it back; S3 asks first and both buttons do what they say.
 * The owner's rows never move.
 */
const expect = baseExpect.configure({ timeout: 45_000 })
const NAV = 120_000

test.describe.configure({ mode: "serial" })

const newUser = (extra: Record<string, string> = {}) => ({ ...ns.emptyNsPlan(), answers: { ...extra } })

/** What the copy plan holds as answers, as text, straight from the database. */
async function answersText(sandboxId: string): Promise<string> {
  return withDb(async (db) => (await db.query("select x::text as t from public.life_plan_answers x where user_id = $1", [sandboxId])).rows.map((r) => r.t).join("\n"))
}
const waitForAnswer = (sandboxId: string, needle: string) => expect.poll(async () => (await answersText(sandboxId)).includes(needle), { timeout: 60_000 }).toBe(true)

/** Next, clicked from the first screen to the last: each lands where the sequence says, and the bar words it as the real tool does. */
async function walkPath(page: Page, seq: Sequence) {
  const first = seq.screens[0]
  await page.goto(screenRoute(seq, first), { timeout: NAV })
  for (let screen = first; ; ) {
    await expect(page.getByTestId(`sequence-${screen.id}`)).toBeVisible({ timeout: NAV })
    expect(new URL(page.url()).pathname).toBe(screenRoute(seq, screen))
    await expect(page.locator("h1, h2").filter({ hasText: /\S/ }).first()).toBeVisible()
    const next = nextScreen(seq, screen)
    const prev = prevScreen(seq, screen)
    await expect(page.getByTestId("back")).toHaveCount(prev ? 1 : 0)
    if (!next) {
      await expect(page.getByTestId("next")).toHaveCount(0)
      return
    }
    await expect(page.getByTestId("next")).toHaveCount(1)
    await expect(page.getByTestId("next")).toHaveText(`${navLabel(seq, screen, next)} →`)
    await page.getByTestId("next").click()
    await expect.poll(() => new URL(page.url()).pathname, { timeout: NAV }).toBe(screenRoute(seq, next))
    screen = next
  }
}

/** Every Deepen screen opens, has its Back to the list, and its own Back and Next along the list. */
async function openDeepen(page: Page, seq: Sequence) {
  for (const screen of seq.deepen ?? []) {
    await page.goto(screenRoute(seq, screen), { timeout: NAV })
    await expect(page.getByTestId(`sequence-${screen.id}`)).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("back-to-deepen")).toBeVisible()
    const prev = prevScreen(seq, screen)
    const next = nextScreen(seq, screen)
    await expect(page.getByTestId("back")).toHaveCount(prev ? 1 : 0)
    await expect(page.getByTestId("next")).toHaveCount(next ? 1 : 0)
  }
}

for (const id of ["v1", "v2", "v3"]) {
  const seq = sequenceById(id)
  test.describe(`${id.toUpperCase()}: walked end to end`, () => {
    test("as a new user: Next walks the whole path; the Deepen list and its screens open", async ({ page, account }) => {
      test.setTimeout(1_500_000)
      await seedAndCopy(page, account.id, newUser({ [SEQUENCE_KEY]: id }), { everyDayStep: false })
      const ownerBefore = await fingerprint(account.id)
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      await walkPath(page, seq)
      if (seq.deepen) {
        await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
        await expect(page.getByTestId("deepen-list")).toBeVisible({ timeout: NAV })
        const hrefs = await page.getByTestId("deepen-list").getByRole("link").evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname))
        for (const item of deepenItems(seq)) expect(hrefs).toContain(new URL(item.href, "http://x").pathname)
        await openDeepen(page, seq)
      } else {
        await expect(page.getByTestId("deepen-list")).toHaveCount(0)
      }
      expect(errors).toEqual([])
      expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
    })

    test("on copied data: the same walk, nothing breaks", async ({ page, account }) => {
      test.setTimeout(1_500_000)
      const full = fullPlan()
      await seedAndCopy(page, account.id, { ...full, answers: { ...full.answers, [SEQUENCE_KEY]: id } })
      const ownerBefore = await fingerprint(account.id)
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      await walkPath(page, seq)
      if (seq.deepen) await openDeepen(page, seq)
      expect(errors).toEqual([])
      expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
    })
  })
}

test.describe("the switcher", () => {
  test("is on the copy space, big enough to tap, saved as two answers, and switching loses nothing", async ({ page, account }) => {
    test.setTimeout(900_000)
    const full = fullPlan()
    const sandboxId = await seedAndCopy(page, account.id, full)
    const ownerBefore = await fingerprint(account.id)
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    const sw = page.getByTestId("version-switcher")
    await expect(sw).toBeVisible({ timeout: NAV })
    // Default V1 + S1; every button at least 44 px, on a phone.
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId("version-v1")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("sorter-s1")).toHaveAttribute("aria-pressed", "true")
    for (const b of await sw.getByRole("button").all()) {
      const box = (await b.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await expect(page.getByTestId("deepen-list")).toHaveCount(0)
    const summaryBefore = await page.getByTestId("counts").innerText()
    await page.getByTestId("version-v2").click()
    await page.getByTestId("sorter-s3").click()
    await expect(page.getByTestId("deepen-list")).toBeVisible()
    await waitForAnswer(sandboxId, `${SEQUENCE_KEY}`)
    await waitForAnswer(sandboxId, `${SORTER_KEY}`)
    expect(await page.getByTestId("counts").innerText(), "data did not change").toBe(summaryBefore)
    await page.reload({ timeout: NAV })
    await expect(page.getByTestId("version-v2")).toHaveAttribute("aria-pressed", "true", { timeout: NAV })
    await expect(page.getByTestId("sorter-s3")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("deepen-list")).toBeVisible()
    // It shows on a screen too, and V3 after V2 and back to V1 keep the plan.
    await page.goto(`${ROUTES.planNew}/star.vision`, { timeout: NAV })
    await expect(page.getByTestId("version-switcher")).toBeVisible({ timeout: NAV })
    await page.getByTestId("version-v3").click()
    await page.getByTestId("version-v1").click()
    await page.getByTestId("sorter-s1").click()
    await expect(page.getByTestId("version-v1")).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator("#" + "north-star-paragraph")).toHaveValue(full.northStar, { timeout: NAV })
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    await expect(page.getByTestId("counts")).toHaveText(summaryBefore)
    await expect(page.getByTestId("deepen-list")).toHaveCount(0)
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })
})

test.describe("V3: the go-deeper cards", () => {
  /** Health and Money are in the season (the fixture's); the third area has a 10 and a goal but is not. */
  const plan = (version: string) => {
    let p = fullPlan()
    const other = p.areas[2]
    p = ns.setAreaReview(p, other.id, { ten: "A picture of this one." })
    p = ns.addGoal(p, other.id, "Read twelve books")
    return { p: { ...p, answers: { ...p.answers, [SEQUENCE_KEY]: version } }, other, health: p.areas[0], otherGoal: p.goals[p.goals.length - 1] }
  }

  test("show only for areas in the season, never in V1 or V2, and 'Not now' sticks", async ({ page, account }) => {
    test.setTimeout(1_200_000)
    const { p, other, health, otherGoal } = plan("v3")
    const healthGoal = p.goals[0]
    const sandboxId = await seedAndCopy(page, account.id, p)
    const ownerBefore = await fingerprint(account.id)
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))

    // North star: after the paragraph.
    await page.goto(`${ROUTES.planNew}/star.vision`, { timeout: NAV })
    await expect(page.getByTestId("deeper-star")).toContainText("What happens if you never get there?", { timeout: NAV })
    await page.getByTestId("deeper-star-not-now").click()
    await expect(page.getByTestId("deeper-star")).toHaveCount(0)
    await waitForAnswer(sandboxId, deeperKey("star"))
    await page.reload({ timeout: NAV })
    await expect(page.getByTestId("sequence-star.vision")).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("deeper-star")).toHaveCount(0)

    // Area: a season area with a 10 gets the card; an area outside the season does not.
    await page.goto(`${ROUTES.planNew}/now?area=${other.id}`, { timeout: NAV })
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("area-sections")).toBeVisible()
    await expect(page.getByTestId("deeper-area")).toHaveCount(0)
    await page.goto(`${ROUTES.planNew}/now?area=${health.id}`, { timeout: NAV })
    const card = page.getByTestId("deeper-area")
    await expect(card).toContainText(`Go deeper on ${health.label}?`, { timeout: NAV })
    await expect(card).toContainText("Why it matters · what stops you · values")
    for (const b of await card.getByRole("button").all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    // Opening it goes to the area's why section.
    await page.getByTestId("deeper-area-open").click()
    await expect(page.getByTestId("area-section-area.why")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByTestId("deeper-area")).toHaveCount(0)
    await waitForAnswer(sandboxId, deeperKey("area", health.id))

    // Goal: a goal in a season area gets "What could stop you?", one outside the season does not.
    await page.goto(`${ROUTES.planNew}/milestones?area=${other.id}&goal=${otherGoal.id}`, { timeout: NAV })
    await expect(page.getByTestId("goal-sections")).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("deeper-goal")).toHaveCount(0)
    await page.goto(`${ROUTES.planNew}/milestones?area=${healthGoal.areaId}&goal=${healthGoal.id}`, { timeout: NAV })
    await expect(page.getByTestId("deeper-goal")).toContainText("What could stop you?", { timeout: NAV })
    await page.getByTestId("deeper-goal-not-now").click()
    await expect(page.getByTestId("deeper-goal")).toHaveCount(0)
    await waitForAnswer(sandboxId, deeperKey("goal", healthGoal.id))
    await page.reload({ timeout: NAV })
    await expect(page.getByTestId("goal-sections")).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("deeper-goal")).toHaveCount(0)
    // The sections the cards open stay on the sheet and the card (everything is still there).
    await expect(page.getByTestId("goal-section-goal.stops")).toBeVisible()
    expect(errors).toEqual([])
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })

  test("the goal card's open button goes to its 'what could stop you' part", async ({ page, account }) => {
    test.setTimeout(600_000)
    const { p } = plan("v3")
    const goal = p.goals[1]
    await seedAndCopy(page, account.id, p)
    await page.goto(`${ROUTES.planNew}/milestones?area=${goal.areaId}&goal=${goal.id}`, { timeout: NAV })
    await expect(page.getByTestId("deeper-goal")).toBeVisible({ timeout: NAV })
    await page.getByTestId("deeper-goal-open").click()
    await expect(page.getByTestId("goal-section-goal.stops")).toHaveAttribute("aria-pressed", "true")
  })

  test("V1 and V2 never show them", async ({ page, account }) => {
    test.setTimeout(900_000)
    for (const v of ["v1", "v2"]) {
      const { p, health } = plan(v)
      await seedAndCopy(page, account.id, p)
      await page.goto(`${ROUTES.planNew}/star.vision`, { timeout: NAV })
      await expect(page.getByTestId("sequence-star.vision")).toBeVisible({ timeout: NAV })
      await expect(page.getByTestId("deeper-star")).toHaveCount(0)
      await page.goto(`${ROUTES.planNew}/now?area=${health.id}`, { timeout: NAV })
      await expect(page.getByTestId("area-sections")).toBeVisible({ timeout: NAV })
      await expect(page.getByTestId("deeper-area")).toHaveCount(0)
    }
  })
})

test.describe("review fixes", () => {
  test("V3 cards wait for three words and a free hand; the season screen offers the area card as an area is picked", async ({ page, account }) => {
    test.setTimeout(900_000)
    const full = fullPlan()
    const sandboxId = await seedAndCopy(page, account.id, { ...full, northStar: "", answers: { ...full.answers, [SEQUENCE_KEY]: "v3" } })
    await page.goto(`${ROUTES.planNew}/star.vision`, { timeout: NAV })
    const box = page.locator("#north-star-paragraph")
    await expect(box).toBeVisible({ timeout: NAV })
    await box.click()
    await box.fill("A life")
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
    await expect(page.getByTestId("deeper-star")).toHaveCount(0)
    await box.fill("A life I chose well")
    await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
    await expect(page.getByTestId("deeper-star")).toHaveCount(0) // still typing: nothing jumps
    await page.getByRole("heading").first().click()
    await box.blur()
    await expect(page.getByTestId("deeper-star")).toBeVisible()
    // The season screen: the card for each picked area; Not now sticks and is the same mark the wheel card uses.
    const health = full.areas[0]
    await page.goto(`${ROUTES.planNew}/season.areas`, { timeout: NAV })
    const card = page.getByTestId(`deeper-season-area-${health.id}`)
    await expect(card).toContainText(`Go deeper on ${health.label}?`, { timeout: NAV })
    await card.getByRole("button", { name: "Not now" }).click()
    await expect(card).toHaveCount(0)
    await waitForAnswer(sandboxId, deeperKey("area", health.id))
    await page.goto(`${ROUTES.planNew}/now?area=${health.id}`, { timeout: NAV })
    await expect(page.getByTestId("area-sections")).toBeVisible({ timeout: NAV })
    await expect(page.getByTestId("deeper-area")).toHaveCount(0)
    // Opening the other area's card goes to its why section.
    await page.goto(`${ROUTES.planNew}/season.areas`, { timeout: NAV })
    const money = full.areas[1]
    await page.getByTestId(`deeper-season-area-${money.id}`).getByRole("button", { name: "Go deeper" }).click()
    await expect(page.getByTestId("area-section-area.why")).toHaveAttribute("aria-pressed", "true", { timeout: NAV })
  })

  test("a fresh copy of the real plan keeps the version, the sorter and the Not-now marks", async ({ page, account }) => {
    test.setTimeout(900_000)
    const full = fullPlan()
    const sandboxId = await seedAndCopy(page, account.id, { ...full, answers: { ...full.answers, [SEQUENCE_KEY]: "v3", [SORTER_KEY]: "s2", [deeperKey("star")]: "no" } })
    // The real plan (the owner's) carries none of them; copy it in again.
    await withDb((db) => db.query("delete from public.life_plan_answers where user_id = $1 and prompt_id like 'start:new:%'", [account.id]))
    expect((await page.request.post("/api/plan-sandbox/copy")).status()).toBe(200)
    const text = await answersText(sandboxId)
    expect(text).toContain("start:new:sequence,v3")
    expect(text).toContain("start:new:sorter,s2")
    expect(text).toContain(deeperKey("star"))
    await page.goto(`${ROUTES.planNew}?home=1`, { timeout: NAV })
    await expect(page.getByTestId("version-v3")).toHaveAttribute("aria-pressed", "true", { timeout: NAV })
    await expect(page.getByTestId("sorter-s2")).toHaveAttribute("aria-pressed", "true")
  })
})

test.describe("the sorter on Systems and Experiences", () => {
  const line = "Two dates a month"
  const areaOf = () => ns.emptyNsPlan().areas[0]
  /** The box a line is typed in on Systems (the real builder's own label). */
  const systemsBox = (page: Page) => page.getByLabel(/^What you will actually do in /)
  const type = async (page: Page, text: string) => {
    const box = systemsBox(page)
    await expect(box).toBeVisible({ timeout: NAV })
    await box.fill(text)
    await box.press("Enter")
  }
  /** The row a goal is listed as: the real list's own "Open <title>" (or, when it is open, "Close <title>") button. */
  const listed = (page: Page, title: string) => page.getByRole("button", { name: new RegExp(`^(Open|Close) ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) })
  const goalsOf = async (sandboxId: string, title: string) =>
    withDb(async (db) => (await db.query("select x::text as t from public.life_plan_goals x where user_id = $1 and x::text ilike $2", [sandboxId, `%${title}%`])).rows.length)

  test("S1: the line moves to Experiences without a word", async ({ page, account }) => {
    test.setTimeout(600_000)
    const area = areaOf()
    const sandboxId = await seedAndCopy(page, account.id, newUser({ [SORTER_KEY]: "s1" }), { everyDayStep: false })
    await page.goto(`${ROUTES.planNew}/systems?area=${area.id}`, { timeout: NAV })
    await type(page, line)
    await expect(page.getByTestId("sorter-notice")).toHaveCount(0)
    await expect(page.getByTestId("sorter-ask")).toHaveCount(0)
    await expect.poll(() => goalsOf(sandboxId, line), { timeout: 60_000 }).toBe(1)
    await page.goto(`${ROUTES.planNew}/milestones?area=${area.id}`, { timeout: NAV })
    await expect(listed(page, line).first()).toBeVisible({ timeout: NAV })
  })

  test("S2: it moves and says so; Undo puts it back on Systems and it stays there", async ({ page, account }) => {
    test.setTimeout(900_000)
    const area = areaOf()
    const sandboxId = await seedAndCopy(page, account.id, newUser({ [SORTER_KEY]: "s2" }), { everyDayStep: false })
    const ownerBefore = await fingerprint(account.id)
    await page.goto(`${ROUTES.planNew}/systems?area=${area.id}`, { timeout: NAV })
    await type(page, line)
    const notice = page.getByTestId("sorter-notice")
    await expect(notice).toContainText("Moved to Experiences")
    expect((await page.getByTestId("sorter-undo").boundingBox())!.height).toBeGreaterThanOrEqual(44)
    // Moved: it is not on the Systems list, it is on Experiences.
    await expect(listed(page, line)).toHaveCount(0)
    await page.getByTestId("sorter-undo").click()
    await expect(notice).toHaveCount(0)
    await expect(listed(page, line).first()).toBeVisible()
    // Saved as a Practice, and a reload keeps it on Systems; Experiences does not list it.
    await expect.poll(() => goalsOf(sandboxId, line), { timeout: 60_000 }).toBe(1)
    await expect.poll(async () => withDb(async (db) => (await db.query("select x::text as t from public.life_plan_goals x where user_id = $1", [sandboxId])).rows[0]?.t ?? ""), { timeout: 60_000 }).toContain("habit_ramp")
    await page.reload({ timeout: NAV })
    await expect(listed(page, line).first()).toBeVisible({ timeout: NAV })
    await page.goto(`${ROUTES.planNew}/milestones?area=${area.id}`, { timeout: NAV })
    await expect(page.getByTestId("sequence-milestones")).toBeVisible({ timeout: NAV })
    await expect(listed(page, line)).toHaveCount(0)
    expect(await fingerprint(account.id), "the owner's rows did not move").toEqual(ownerBefore)
  })

  test("S3: it asks first; 'Want it to happen' moves it, 'Every week' keeps it on Systems; nothing is written before the answer", async ({ page, account }) => {
    test.setTimeout(900_000)
    const area = areaOf()
    const sandboxId = await seedAndCopy(page, account.id, newUser({ [SORTER_KEY]: "s3" }), { everyDayStep: false })
    await page.goto(`${ROUTES.planNew}/systems?area=${area.id}`, { timeout: NAV })
    await type(page, line)
    const ask = page.getByTestId("sorter-ask")
    await expect(ask).toContainText("Something you do every week, or something you want to happen?")
    for (const b of await ask.getByRole("button").all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await expect(ask).toContainText(line)
    expect(await goalsOf(sandboxId, line)).toBe(0)
    // On a phone the question never covers the box that was typed in; it survives a reload, still unwritten.
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 740 })
      await expect(ask).toBeVisible()
      // Where the page leaves the box when asked to show it (centred), nothing of the question is over it.
      const covered = await systemsBox(page).evaluate((el) => {
        el.scrollIntoView({ block: "center" })
        const r = el.getBoundingClientRect()
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !(top === el || el.contains(top))
      })
      expect(covered, `the question covers the box at ${width} px`).toBe(false)
    }
    await page.reload({ timeout: NAV })
    await expect(page.getByTestId("sorter-ask")).toContainText(line, { timeout: NAV })
    expect(await goalsOf(sandboxId, line)).toBe(0)
    await page.getByTestId("sorter-want").click()
    await expect(ask).toHaveCount(0)
    await page.reload({ timeout: NAV })
    await expect(page.getByTestId("sorter-ask")).toHaveCount(0)
    await expect(page.getByTestId("sorter-notice")).toHaveCount(0)
    await expect(listed(page, line)).toHaveCount(0) // gone from Systems
    // A second line, answered "Every week", stays on Systems.
    await type(page, "Meet one new person")
    await expect(ask).toBeVisible()
    await page.getByTestId("sorter-every-week").click()
    await expect(ask).toHaveCount(0)
    await expect(listed(page, "Meet one new person").first()).toBeVisible()
    await expect.poll(() => goalsOf(sandboxId, "Meet one new person"), { timeout: 60_000 }).toBe(1)
    await expect.poll(() => goalsOf(sandboxId, line), { timeout: 60_000 }).toBe(1)
    await page.goto(`${ROUTES.planNew}/milestones?area=${area.id}`, { timeout: NAV })
    await expect(listed(page, line).first()).toBeVisible({ timeout: NAV })
    await expect(listed(page, "Meet one new person")).toHaveCount(0)
  })

  test("S3: a quit line answered 'Want it to happen' stays an experience after a reload", async ({ page, account }) => {
    test.setTimeout(900_000)
    const area = areaOf()
    const sandboxId = await seedAndCopy(page, account.id, newUser({ [SORTER_KEY]: "s3" }), { everyDayStep: false })
    await page.goto(`${ROUTES.planNew}/milestones?area=${area.id}`, { timeout: NAV })
    const wants = page.getByLabel(/^Everything you want in /)
    await expect(wants).toBeVisible({ timeout: NAV })
    await wants.fill("No weed")
    await wants.press("Enter")
    await expect(page.getByTestId("sorter-ask")).toContainText("No weed")
    await page.getByTestId("sorter-want").click()
    await expect.poll(() => goalsOf(sandboxId, "No weed"), { timeout: 60_000 }).toBe(1)
    await expect.poll(async () => withDb(async (db) => (await db.query("select x::text as t from public.life_plan_goals x where user_id = $1", [sandboxId])).rows[0]?.t ?? ""), { timeout: 60_000 }).not.toContain("habit_ramp")
    await page.reload({ timeout: NAV })
    await expect(listed(page, "No weed").first()).toBeVisible({ timeout: NAV })
  })
})
