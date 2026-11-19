/**
 * QUIT TOOLS, WAVE 1 PART 1, OPENED COLD ON A PHONE.
 *
 * Signed out, 390x844: the lies test (beliefs),
 * what it costs you (cost) and how people quit (how).
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

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })
test.describe("quit wave 1 part 1 @phone", () => {
  // the lies test ignores a tap within 250 ms of a move; the tests move the page clock on between taps
  test.beforeEach(({ page }) => page.clock.install())
  const A = "/quit/nicotine"

  async function noSideways(page: Page) {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  }

  async function shot(page: Page, name: string) {
    const dir = process.env.QUIT_SHOTS_DIR
    if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
  }

  /** A tap within 250 ms of a move is ignored by the tool, so each tap waits a little first. */
  async function tap(page: Page, id: string) {
    await page.clock.runFor(300)
    await page.getByTestId(id).click()
  }

  /** Rates belief 1..12 (a 4 or 5 shows its reply, which is left), answers the facts, then "can you stop?"; stops when `stopAfter` screens are done. */
  async function runBeliefs(page: Page, ratings: number[], opts: { stopAfter?: number } = {}) {
    const stop = opts.stopAfter ?? 12 + data.facts.length
    for (let i = 0; i < Math.min(stop, 12); i++) {
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[i].scene)
      await noSideways(page)
      if (i === 0) await shot(page, "beliefs-rating")
      await tap(page, `rate-${ratings[i]}`)
      if (ratings[i] >= 4) await tap(page, "reply-next")
    }
    for (let i = 0; i < data.facts.length && 12 + i < stop; i++) {
      await expect(page.getByTestId("fact-statement")).toHaveText(data.facts[i].statement)
      if (i === 0) await shot(page, "beliefs-fact-question")
      await tap(page, "fact-true")
      await expect(page.getByTestId("fact-answer")).toContainText(data.facts[i].explain)
      await noSideways(page)
      if (i === 0) await shot(page, "beliefs-fact-answer")
      await tap(page, "fact-next")
    }
    if (stop >= 12 + data.facts.length) await tap(page, "canstop-unsure")
  }

  // belief 1 = 5, beliefs 2 and 3 = 4, belief 4 = 3, belief 5 = 2, the rest 1
  const RATINGS = [5, 4, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1]
  // no 4 or 5: no reply screens, so Back walks plain question to question
  const FLAT = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]

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

    await expect(page.getByTestId("save-image")).toBeVisible()
    const img = await request.get(quitUrl(`${A}/card?held=${held}`))
    expect(img.status()).toBe(200)
    expect(img.headers()["content-type"]).toContain("image/png")
    expect((await request.get(quitUrl(`${A}/card?held=13`))).status()).toBe(400)
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
    await runBeliefs(page, FLAT, { stopAfter: 4 })
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[4].scene)
    await page.goBack()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[3].scene)
    await expect(page.getByTestId("rate-3")).toHaveAttribute("aria-checked", "true")
  })

  test("in-page Back acts like the browser Back and adds no history entry", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, FLAT, { stopAfter: 4 })
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[4].scene)
    await page.getByTestId("screen-back").click()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[3].scene)
    await page.goBack()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
  })

  test("in-page Back after a reload rewrites the entry instead of adding one", async ({ page }) => {
    await page.goto(quitUrl(`${A}/beliefs`))
    await runBeliefs(page, FLAT, { stopAfter: 4 })
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
    await page.getByTestId("clear-yes").click()
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[0].scene)
  })

  test("cost opens on a form and shows a dollar figure once a count is typed", async ({ page }) => {
    await page.goto(quitUrl(`${A}/cost`))
    await page.getByTestId("chip-cigarettes").click()
    await shot(page, "cost-form")
    await page.getByTestId("cost-count").fill("10")
    await expect(page.getByTestId("cost-year")).toHaveText("$1,898.00")
    await noSideways(page)
    await shot(page, "cost-result")
    const unit = await page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine.record.unit)
    expect(unit).toEqual({ id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" })
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
