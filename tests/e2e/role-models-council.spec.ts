import { test, expect, type Page } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { shownPeople } from "@/src/role-models/catalog"
import { seedLifePlan, thisWeeksReview } from "./helpers/lifePlan"

/**
 * YOUR COUNCIL, AND WHERE IT SHOWS IN THE PLAN (Plans/role-models.md, Phases 7-9, 12).
 *
 * Through the real pages and the account: add two people from their profiles,
 * reload, remove one; a sixth is refused in plain words; Today shows one member
 * a day and the next day the other; the weekly review asks each member's
 * question; the values step offers what you took; "What would he do?" writes
 * into the day's note; the value of the week takes a tick.
 */

const people = shownPeople()
const API = "/api/role-models/council"

async function add(page: Page, id: string, takenValues: string[]) {
  const res = await page.request.put(API, { data: { roleModelId: id, takenValues } })
  expect(res.status(), await res.text()).toBe(200)
}

test.describe("the council", () => {
  test("add two from their profiles, reload, remove one", async ({ page }) => {
    const [a, b] = people
    for (const p of [a, b]) {
      await page.goto(`${ROUTES.roleModels}/${p.id}`)
      await page.getByTestId("council-add").click()
      await page.getByRole("checkbox").first().check()
      await page.getByTestId("council-save").click()
      await expect(page.getByTestId("council-member-note")).toBeVisible()
    }
    await page.goto(ROUTES.roleModels)
    await page.reload()
    await expect(page.getByTestId(`council-member-${a.id}`)).toBeVisible()
    await expect(page.getByTestId(`council-member-${b.id}`)).toBeVisible()
    await page.getByRole("button", { name: `Remove ${a.name} from your council` }).click()
    await expect(page.getByTestId(`council-member-${a.id}`)).toHaveCount(0)
    await page.reload()
    await expect(page.getByTestId(`council-member-${b.id}`)).toBeVisible()
    await expect(page.getByTestId(`council-member-${a.id}`)).toHaveCount(0)
  })

  test("a sixth person is refused in plain words", async ({ page }) => {
    expect(people.length, "six validated people are needed").toBeGreaterThanOrEqual(6)
    for (const p of people.slice(0, 5)) await add(page, p.id, [p.values[0].word])
    const sixth = people[5]
    const res = await page.request.put(API, { data: { roleModelId: sixth.id, takenValues: [sixth.values[0].word] } })
    expect(res.status()).toBe(409)
    await page.goto(`${ROUTES.roleModels}/${sixth.id}`)
    await expect(page.getByTestId("council-full")).toHaveText("Your council has five people. Remove one before you add another.")
    await expect(page.getByTestId("council-add")).toBeDisabled()
  })
})

test.describe("the council in the plan", () => {
  test.beforeEach(async ({ page, account }) => {
    await seedLifePlan(page, account.id, { version: 1, seq: 10, northStar: "E2E: a plan with a north star.", values: ["Honesty"] })
  })

  test("with an empty council, Today shows no council card", async ({ page }) => {
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible()
    await page.waitForLoadState("networkidle")
    await expect(page.getByTestId("council-today")).toHaveCount(0)
  })

  test("Today shows one member a day, and the next day the other", async ({ page }) => {
    const [a, b] = people
    await add(page, a.id, [a.values[0].word])
    await add(page, b.id, [b.values[0].word])
    await page.clock.setFixedTime(new Date("2026-11-10T10:00:00Z"))
    await page.goto(`${ROUTES.plan}?step=today`)
    const first = (await page.getByTestId("council-today").locator("a").first().textContent())?.trim()
    await page.clock.setFixedTime(new Date("2026-11-11T10:00:00Z"))
    await page.reload()
    const second = (await page.getByTestId("council-today").locator("a").first().textContent())?.trim()
    expect(new Set([first, second])).toEqual(new Set([a.name, b.name]))
    await expect(page.getByTestId("council-today-line")).toHaveText(/^Today, as if (he|she) were watching\.$/)
  })

  test("What would he do? goes into the day's note", async ({ page }) => {
    const [a] = people
    await add(page, a.id, [a.values[0].word])
    await page.goto(`${ROUTES.plan}?step=today`)
    await page.getByTestId("what-would-he-do").click()
    await page.getByTestId("what-would-he-do-line").fill("E2E: take the stairs and say nothing.")
    await page.getByTestId("what-would-he-do-save").click()
    await expect(page.locator("#today-note")).toHaveValue(new RegExp(`What would ${a.name} do\\? E2E: take the stairs and say nothing\\.`))
    await page.reload()
    await expect(page.locator("#today-note")).toHaveValue(/E2E: take the stairs and say nothing\./)
  })

  test("the weekly review asks each member's question", async ({ page, accountTimezone }) => {
    const [a, b] = people
    await add(page, a.id, [a.values[0].word])
    await add(page, b.id, [b.values[0].word])
    await page.goto(thisWeeksReview(accountTimezone))
    await expect(page.getByTestId(`council-question-${a.id}`)).toContainText(a.councilQuestion.text)
    await expect(page.getByTestId(`council-question-${b.id}`)).toContainText(b.councilQuestion.text)
  })

  test("the values step offers what you took, and one tap adds it", async ({ page }) => {
    const a = people.find((p) => p.values.some((v) => v.word.toLowerCase() !== "honesty"))!
    const word = a.values.find((v) => v.word.toLowerCase() !== "honesty")!.word
    await add(page, a.id, [word])
    await page.goto(`${ROUTES.plan}?step=values`)
    const chip = page.getByTestId(`council-value-${word.toLowerCase()}`)
    await expect(chip).toBeVisible()
    await chip.click()
    await expect(chip).toHaveCount(0)
  })

  test("the value of the week takes a tick on Today", async ({ page }) => {
    const [a] = people
    const word = a.values[0].word
    await add(page, a.id, [word])
    const res = await page.request.put("/api/role-models/settings", { data: { weekValue: word } })
    expect(res.status(), await res.text()).toBe(200)
    await page.goto(`${ROUTES.plan}?step=today`)
    await expect(page.getByTestId("week-value-tick")).toContainText(word)
    await page.getByTestId("week-value-lived").click()
    await expect(page.getByTestId("week-value-lived")).toHaveAttribute("aria-pressed", "true")
    await page.reload()
    await expect(page.getByTestId("week-value-lived")).toHaveAttribute("aria-pressed", "true")
  })
})
