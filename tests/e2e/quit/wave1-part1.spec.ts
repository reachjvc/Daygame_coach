/**
 * QUIT TOOLS, WAVE 1 PART 1, OPENED COLD ON A PHONE.
 *
 * Signed out, 390x844: the lies test (beliefs), what it gives you (gives), your
 * past attempts (past), what it costs you (cost) and how people quit (how).
 * Every text the test expects is read from the data files at run time, so it
 * holds for any valid content. Read-only: nothing is written to a server.
 * With QUIT_SHOTS_DIR set it also saves a screenshot of each screen type.
 */

import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import type { Page } from "@playwright/test"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import frameJson from "../../../src/quit/data/frame.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const data = nicotineJson as unknown as {
  name: string
  units: { id: string; many: string; defaultPriceUsd: number | null; defaultMinutesPerUnit: number | null }[]
  beliefs: { id: string; scene: string; short: string; need: string; limiting: string }[]
  facts: { id: string; statement: string; explain: string }[]
  needs: { id: string; name: string; swaps: { id: string; text: string }[] }[]
  endings: { id: string; label: string }[]
  helped: { id: string; label: string }[]
  bands: { id: string; min: number; max: number; label: string }[]
  numbers: { kind: string; big: string; headline: string }[]
  hope: { kind: string; big: string; headline: string } | null
  planSteps: { text: string }[]
}
const t = tooltextJson

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })
test.describe("quit wave 1 part 1 @phone", () => {
  const A = "/quit/nicotine"

  async function noSideways(page: Page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  }

  async function shot(page: Page, name: string) {
    const dir = process.env.QUIT_SHOTS_DIR
    if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
  }

  /** Rates belief 1..12 and answers the facts; stops when `stopAfter` screens are done. */
  async function runBeliefs(page: Page, ratings: number[], opts: { stopAfter?: number } = {}) {
    const stop = opts.stopAfter ?? 12 + data.facts.length
    for (let i = 0; i < Math.min(stop, 12); i++) {
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[i].scene)
      await noSideways(page)
      if (i === 0) await shot(page, "beliefs-rating")
      await page.getByTestId(`rate-${ratings[i]}`).click()
    }
    for (let i = 0; i < data.facts.length && 12 + i < stop; i++) {
      await expect(page.getByTestId("fact-statement")).toHaveText(data.facts[i].statement)
      if (i === 0) await shot(page, "beliefs-fact-question")
      await page.getByTestId("fact-true").click()
      await expect(page.getByTestId("fact-answer")).toContainText(data.facts[i].explain)
      await noSideways(page)
      if (i === 0) await shot(page, "beliefs-fact-answer")
      await page.getByTestId("fact-next").click()
    }
  }

  // belief 1 = 5, beliefs 2 and 3 = 4, belief 4 = 3, belief 5 = 2, the rest 1
  const RATINGS = [5, 4, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1]

  test("a full lies test reaches the result with top 3, band and a card image", async ({ page, request }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS)
    await expect(page.getByTestId("result")).toBeVisible()
    await noSideways(page)
    await shot(page, "beliefs-result")

    const top = page.getByTestId("top-belief")
    await expect(top).toHaveCount(3)
    await expect(top.nth(0)).toContainText(data.beliefs[0].limiting)
    await expect(top.nth(1)).toContainText(data.beliefs[1].limiting)
    await expect(top.nth(2)).toContainText(data.beliefs[2].limiting)
    await expect(page.getByTestId("see-through")).toContainText(data.beliefs[4].short)

    const held = RATINGS.filter((r) => r >= 4).length
    const band = data.bands.find((b) => held >= b.min && held <= b.max)!
    await expect(page.getByTestId("band")).toContainText(band.label)

    const href = await page.getByTestId("save-image").getAttribute("href")
    expect(href).toBe(`${A}/card?preview=1&held=${held}`)
    const img = await request.get(href!)
    expect(img.status()).toBe(200)
    expect(img.headers()["content-type"]).toContain("image/png")
    expect((await request.get(quitUrl(`${A}/card?held=13`))).status()).toBe(400)
    expect((await request.get(quitUrl(`${A}/card`))).status()).toBe(400)
    expect((await request.get(quitUrl("/quit/nope/card?held=3"))).status()).toBe(404)
  })

  test("reload on screen 7 resumes at 7 and out-of-range s goes to the first unanswered", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS, { stopAfter: 6 })
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[6].scene)
    await page.reload()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[6].scene)
    await page.goto(quitUrl(`${A}/beliefs?s=99`))
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[6].scene)
    await page.goto(quitUrl(`${A}/beliefs?s=abc`))
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[6].scene)
  })

  test("the browser Back button from screen 5 shows screen 4", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS, { stopAfter: 4 })
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[4].scene)
    await page.goBack()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[3].scene)
    await expect(page.getByTestId("rate-3")).toHaveAttribute("aria-checked", "true")
  })

  test("in-page Back acts like the browser Back and adds no history entry", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS, { stopAfter: 4 })
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[4].scene)
    await page.getByTestId("screen-back").click()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[3].scene)
    await page.goBack()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
  })

  test("in-page Back after a reload rewrites the entry instead of adding one", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS, { stopAfter: 4 })
    await page.reload()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[4].scene)
    const before = await page.evaluate(() => history.length)
    await page.getByTestId("screen-back").click()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[3].scene)
    expect(await page.evaluate(() => history.length)).toBe(before)
  })

  test("the lies test still reaches the result when localStorage throws", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("blocked")
        },
      })
    })
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS)
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("top-belief")).toHaveCount(3)
  })

  test("clearing answers on the result starts the test again", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS)
    await page.getByTestId("clear-answers").click()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[0].scene)
  })

  test("gives is preselected from the lies test, and ?need= wins", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, RATINGS)
    await page.getByTestId("next-gives").click()
    await expect(page.getByTestId(`chip-${data.beliefs[0].need}`)).toHaveAttribute("aria-checked", "true")
    await noSideways(page)
    await shot(page, "gives-pick")
    await page.getByTestId("gives-continue").click()
    const first = data.needs.find((n) => n.id === data.beliefs[0].need)!
    await expect(page.getByTestId("swap")).toHaveCount(first.swaps.length)
    await expect(page.getByTestId("swap").first()).toContainText(first.swaps[0].text)
    await noSideways(page)
    await shot(page, "gives-need")
    await page.getByTestId("try-swap").first().click()
    await expect(page.getByText(t.gives.tried)).toBeVisible()

    const other = data.needs.find((n) => n.id !== data.beliefs[0].need)!
    await page.goto(quitUrl(`${A}/gives?need=${other.id}`))
    await expect(page.getByTestId(`chip-${other.id}`)).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId(`chip-${data.beliefs[0].need}`)).toHaveAttribute("aria-checked", "false")
    await page.evaluate(() => localStorage.clear())
    await page.goto(quitUrl(`${A}/gives?need=nonsense`))
    await expect(page.getByTestId("gives-continue")).toBeDisabled()
  })

  test("a swap tried on an earlier day shows the slider and saving reorders the swaps", async ({ page }) => {
    const need = data.needs[0]
    await page.goto(quitUrl(`${A}/gives`))
    await page.evaluate(
      ({ need, swap }) => {
        localStorage.setItem(
          "quit-v1",
          JSON.stringify({ nicotine: { gives: { done: 1, picked: [need], tried: { [swap]: { swapId: swap, triedOn: "2000-01-01" } }, rated: {} } } }),
        )
      },
      { need: need.id, swap: need.swaps[1].id },
    )
    await page.goto(quitUrl(`${A}/gives?s=2`))
    await expect(page.getByText(t.gives.rateQuestion)).toBeVisible()
    await expect(page.getByTestId("swap").nth(0)).toHaveAttribute("data-swap", need.swaps[0].id)
    await page.getByTestId("rate-slider").fill("100")
    await page.getByTestId("rate-save").click()
    await expect(page.getByTestId("swap").nth(0)).toHaveAttribute("data-swap", need.swaps[1].id)
    await shot(page, "gives-slider")
  })

  test("past with tries 0 goes straight to the result", async ({ page }) => {
    await page.goto(quitUrl(`${A}/past`))
    await page.getByTestId("chip-0").click()
    await page.getByTestId("past-continue").click()
    await expect(page.getByTestId("result")).toContainText(t.past.noTries)
    await noSideways(page)
    await shot(page, "past-result-zero")
  })

  test("past with all screens shows the window, two risky moments, what helped and the slip line", async ({ page }) => {
    await page.goto(quitUrl(`${A}/past`))
    await page.getByTestId("chip-2-3").click()
    await page.getByTestId("chip-weeks").click()
    await page.getByTestId("chip-year").click()
    await shot(page, "past-screen1")
    await page.getByTestId("past-continue").click()
    for (const e of data.endings.slice(0, 3)) await page.getByTestId(`chip-${e.id}`).click()
    await shot(page, "past-endings")
    await page.getByTestId("past-continue").click()
    await page.getByTestId(`chip-${data.helped[0].id}`).click()
    await page.getByTestId("past-continue").click()
    await page.getByTestId("chip-gaveUp").click()
    await page.getByTestId("past-continue").click()
    const result = page.getByTestId("result")
    await expect(result).toBeVisible()
    await expect(page.getByTestId("longest")).toContainText(t.past.longestEnded.replace("{n}", "7"))
    await expect(page.getByTestId("longest")).toContainText(t.past.window.replace("{from}", "4").replace("{to}", "7"))
    const risky = page.getByTestId("risky").locator("li")
    await expect(risky).toHaveCount(2)
    await expect(risky.nth(0)).toHaveText(data.endings[0].label)
    await expect(page.getByTestId("keep")).toContainText(data.helped[0].label)
    const line = data.planSteps[2]?.text.match(/If you slip[^.!?]*[.!?]?/)?.[0]
    if (line) await expect(page.getByTestId("slip-line")).toHaveText(line)
    else await expect(page.getByTestId("slip-line")).toHaveCount(0)
    await noSideways(page)
    await shot(page, "past-result")
    // months or years: no window
    await page.getByTestId("clear-answers").click()
    await page.getByTestId("chip-4-9").click()
    await page.getByTestId("chip-months").click()
    await page.getByTestId("chip-longer").click()
    await page.getByTestId("past-continue").click()
    await page.getByTestId("past-continue").click()
    await page.getByTestId("past-continue").click()
    await page.getByTestId("chip-restarted").click()
    await page.getByTestId("past-continue").click()
    await expect(page.getByTestId("longest")).toHaveCount(0)
    await expect(page.getByTestId("slip-line")).toHaveCount(0)
  })

  test("cost with the defaults shows a dollar figure", async ({ page }) => {
    const unit = data.units[0]
    await page.goto(quitUrl(`${A}/cost`))
    await page.getByTestId(`chip-${unit.id}`).click()
    await shot(page, "cost-unit")
    await page.getByTestId("cost-continue").click()
    await noSideways(page)
    await shot(page, "cost-amount")
    await page.getByTestId("cost-continue").click()
    if (unit.defaultPriceUsd === null) await page.getByTestId("cost-price").fill("1")
    if (unit.defaultMinutesPerUnit === null && (await page.getByTestId("cost-minutes").count()) > 0) await page.getByTestId("cost-minutes").fill("5")
    await shot(page, "cost-price")
    await page.getByTestId("cost-continue").click()
    await expect(page.getByTestId("year-cost")).toHaveText(/^\$[\d,]+$/)
    await expect(page.getByTestId("ten-year-cost")).toHaveText(/^\$[\d,]+$/)
    await noSideways(page)
    await shot(page, "cost-result")
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine.cost.result)
    expect(stored.yearUsd).toBeGreaterThan(0)
    // ten years = ten times the whole-dollar year figure the reader sees
    expect(stored.tenYearUsd).toBe(Math.round(stored.yearUsd) * 10)
  })

  test("how shows every number card, hope first", async ({ page }) => {
    await page.goto(quitUrl(`${A}/how`))
    const cards = page.locator('[data-testid^="number-"]')
    const expectedCards = data.numbers.filter((n) => !(data.hope && n.kind === data.hope.kind && n.big === data.hope.big && n.headline === data.hope.headline)).length + (data.hope ? 1 : 0)
    await expect(cards).toHaveCount(expectedCards)
    if (data.hope) await expect(cards.first()).toHaveAttribute("data-testid", `number-${data.hope.kind}`)
    await expect(page.getByTestId("tag-checked")).toHaveCount(await cards.count())
    await noSideways(page)
    await shot(page, "how")
    await page.locator("details summary", { hasText: t.common.basedOn }).first().click()
    await shot(page, "how-based-on")
    await page.getByRole("button", { name: t.common.source, exact: true }).first().click()
    await expect(page.getByRole("link", { name: t.common.openSource }).first()).toHaveAttribute("target", "_blank")
  })

  test("the sources fold and its footer link show only when the screen has sources", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await expect(page.getByTestId("scene")).toBeVisible()
    await expect(page.locator("details#sources")).toHaveCount(0)
    await expect(page.getByRole("link", { name: frameJson.sources, exact: true })).toBeHidden()
  })

  test("the sources link in the footer opens the sources fold", async ({ page }) => {
    await page.goto(quitUrl(`${A}/how`))
    await page.getByRole("link", { name: frameJson.sources, exact: true }).click()
    await expect(page.locator("details#sources")).toHaveAttribute("open", "")
  })
})
