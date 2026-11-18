/**
 * QUIT TOOLS, PHASE 7 FIXES, SIGNED OUT.
 *
 * Adapted from the signed-out and privacy audits of 2026-11-18 (finding ids in
 * the titles: A = signed out, C = privacy and security). Each test failed
 * before its fix. Read-only: nothing is written to a server.
 */

import { test, expect, SIGNED_OUT } from "../fixtures/test"
import type { Page } from "@playwright/test"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const D = nicotineJson as unknown as {
  beliefs: { id: string; scene: string }[]
  facts: { id: string }[]
  endings: { id: string }[]
}
const t = tooltextJson
const A = "/quit/nicotine"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })

async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}

async function rateAll(page: Page, ratings: number[]) {
  for (let i = 0; i < 12; i++) await page.getByTestId(`rate-${ratings[i]}`).click()
  for (let i = 0; i < D.facts.length; i++) {
    await page.getByTestId("fact-true").click()
    await page.getByTestId("fact-next").click()
  }
}

async function toPrice(page: Page) {
  await page.goto(`${A}/cost`)
  await page.getByTestId("chip-cigarettes").click()
  await page.getByTestId("cost-continue").click()
  await page.getByTestId("cost-continue").click()
}

async function slipToLast(page: Page) {
  await page.goto(`${A}/slip`)
  await page.getByTestId("chip-today").click()
  await page.getByTestId("slip-continue").click()
  await page.getByTestId(`chip-${D.endings[0].id}`).click()
  await page.getByTestId("slip-continue").click()
  await page.getByTestId("chip-b1").click()
  await page.getByTestId("slip-finish").click()
}

test.describe("quit phase 7 fixes, signed out @phone", () => {
  test("A24 A26 A27 a price over the cap, negative or junk is refused with the range and Done stays off", async ({ page }) => {
    await toPrice(page)
    const range = t.cost.range.replace("{min}", "0").replace("{max}", "100")
    for (const bad of ["500", "-5", "100.01"]) {
      await page.getByTestId("cost-price").fill(bad)
      await expect(page.getByTestId("cost-price-error")).toHaveText(range)
      await expect(page.getByTestId("cost-continue")).toBeDisabled()
    }
    await noSideways(page)
  })

  test("A26 1e2 is a valid 100 and the result is worked out from what is shown", async ({ page }) => {
    await toPrice(page)
    await page.getByTestId("cost-price").fill("1e2")
    await expect(page.getByTestId("cost-price-error")).toHaveCount(0)
    await page.getByTestId("cost-continue").click()
    // 10 a day x 7 x 52 x $100
    await expect(page.getByTestId("year-cost")).toHaveText("$364,000")
  })

  test("A15 Enter in the price field finishes cost", async ({ page }) => {
    await toPrice(page)
    await page.getByTestId("cost-price").fill("0.6")
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("result")).toBeVisible()
  })

  test("A15 Enter with a bad price does nothing", async ({ page }) => {
    await toPrice(page)
    await page.getByTestId("cost-price").fill("500")
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("result")).toHaveCount(0)
  })

  test("A21 the ten-year figure is ten times the year figure shown", async ({ page }) => {
    await toPrice(page)
    await page.getByTestId("cost-price").fill("0.52")
    await page.getByTestId("cost-continue").click()
    await expect(page.getByTestId("year-cost")).toHaveText("$1,893")
    await expect(page.getByTestId("ten-year-cost")).toHaveText("$18,930")
  })

  test("A44 never tried after earlier answers shows no leftover endings, window or gave-up line", async ({ page }) => {
    await page.goto(`${A}/past`)
    await page.getByTestId("chip-2-3").click()
    await page.getByTestId("chip-days").click()
    await page.getByTestId("chip-month").click()
    await page.getByTestId("past-continue").click()
    await page.getByTestId(`chip-${D.endings[0].id}`).click()
    await page.getByTestId("past-continue").click()
    await page.getByTestId("chip-supply").click()
    await page.getByTestId("past-continue").click()
    await page.getByTestId("chip-gaveUp").click()
    await page.getByTestId("past-continue").click()
    await expect(page.getByTestId("risky")).toBeVisible()
    await page.goto(`${A}/past?s=1`)
    await page.getByTestId("chip-0").click()
    await page.getByTestId("past-continue").click()
    await expect(page.getByTestId("result")).toBeVisible()
    for (const id of ["risky", "keep", "longest", "slip-line"]) await expect(page.getByTestId(id)).toHaveCount(0)
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine.past)
    expect(stored.endings).toEqual([])
    expect(stored.afterSlip).toBeNull()
  })

  test("A62 slip tomorrow keeps the date chosen after midnight passes", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-10-24T20:00:00Z") })
    await slipToLast(page)
    await page.getByTestId("chip-tomorrow").click()
    const before = await page.getByTestId("slip-day1").textContent()
    await page.clock.setSystemTime(new Date("2026-10-26T12:00:00Z"))
    await page.reload()
    await expect(page.getByTestId("slip-day1")).toHaveText(before!)
  })

  test("A76 the mostly-free band links to a page a signed-out reader can open", async ({ page }) => {
    await page.goto(`${A}/beliefs?preview=1`)
    await rateAll(page, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
    const link = page.getByTestId("band-free-link")
    await expect(link).toHaveText(t.beliefs.bandFreeLink)
    await expect(link).toHaveAttribute("href", "/auth/sign-up?next=/plan")
  })

  test("A12 two tabs on beliefs do not wipe each other's answers", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const a = await ctx.newPage()
    const b = await ctx.newPage()
    await a.goto(`${A}/beliefs`)
    await b.goto(`${A}/beliefs`)
    await expect(b.getByTestId("scene")).toBeVisible()
    for (let i = 0; i < 4; i++) await a.getByTestId("rate-3").click()
    // tab B heard the change and now shows the next unanswered question
    await expect(b.getByTestId("scene")).toHaveText(D.beliefs[4].scene)
    await b.getByTestId("rate-5").click()
    const ratings = await b.evaluate(() => JSON.parse(localStorage.getItem("quit-v1")!).nicotine.beliefs.ratings)
    expect(ratings).toEqual({ b1: 3, b2: 3, b3: 3, b4: 3, b5: 5 })
    await ctx.close()
  })

  test("A11 wrong-shaped saved state does not crash any tool", async ({ page }) => {
    const errors: string[] = []
    // WebKit reports a fetch cut short by a page change as an "access control" error; that is not a page fault
    page.on("pageerror", (e) => !/access control/.test(e.message) && errors.push(e.message))
    await page.goto(`${A}/symptoms`)
    await page.evaluate(() =>
      localStorage.setItem(
        "quit-v1",
        JSON.stringify({
          nicotine: {
            beliefs: { ratings: null, facts: null },
            gives: { tried: null, rated: null, picked: "x" },
            past: { endings: null, helped: null },
            slip: { ownWords: 5 },
            cost: { unit: "cigarettes", done: 3, result: {} },
            sos: { done: 1 },
          },
        }),
      ),
    )
    for (const tool of ["beliefs", "gives", "past", "slip", "cost", "sos"]) {
      await page.goto(`${A}/${tool}`)
      await expect(page.locator("h1")).toBeVisible()
      await expect(page.locator("body")).not.toContainText(/could not load|Application error|NaN/)
    }
    expect(errors).toEqual([])
  })

  test("A02 in-page Back after a reload never shows the same screen twice", async ({ page }) => {
    await page.goto(`${A}/beliefs`)
    await page.getByTestId("rate-3").click()
    await page.getByTestId("rate-3").click()
    await page.reload()
    await expect(page.getByTestId("scene")).toHaveText(D.beliefs[2].scene)
    await page.getByTestId("screen-back").click()
    await expect(page.getByTestId("scene")).toHaveText(D.beliefs[1].scene)
    await page.getByTestId("screen-back").click()
    await expect(page.getByTestId("scene")).toHaveText(D.beliefs[0].scene)
    await expect(page.getByTestId("screen-back")).toHaveCount(0)
  })

  test("A14 focus moves to the new screen after an answer and after Next on a fact", async ({ page }) => {
    await page.goto(`${A}/beliefs`)
    await page.getByTestId("rate-3").focus()
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("scene")).toHaveText(D.beliefs[1].scene)
    await expect(page.getByTestId("question")).toBeFocused()
    for (let i = 1; i < 12; i++) await page.getByTestId("rate-3").click()
    await page.getByTestId("fact-true").click()
    await page.getByTestId("fact-next").focus()
    await page.keyboard.press("Enter")
    await expect(page.getByTestId("question")).toBeFocused()
  })

  test("A67 a slow sign-in answer does not hold back Yes", async ({ page }) => {
    await page.route("**/api/whoami", async (route) => {
      await new Promise((r) => setTimeout(r, 6000))
      await route.abort()
    })
    await page.goto(`${A}/sos`)
    await page.getByTestId("chip-b1").click()
    await page.getByTestId("sos-continue").click()
    await page.getByTestId("sos-continue").click()
    await page.getByTestId("sos-to-question").click()
    await expect(page.getByTestId("sos-yes")).toBeEnabled()
    await page.getByTestId("sos-yes").click()
    await expect(page.getByTestId("result")).toBeVisible()
    await expect(page.getByTestId("sos-saved")).toHaveCount(0)
  })

  test("A70 A72 A77 present and preview are carried; a repeated preview counts", async ({ page, request }) => {
    await page.goto(`${A}/cost?preview=1&present=1`)
    expect(await page.locator("header a").evaluateAll((as) => as.map((a) => a.getAttribute("href")).join(" "))).toContain("present=1")
    await page.goto(`${A}/beliefs?preview=1`)
    await rateAll(page, [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5])
    const hrefs = await page.locator("main a[href^='/quit']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))
    expect(hrefs.filter((h) => !h.includes("preview=1") && !h.startsWith("/quit/coaching"))).toEqual([])
    expect((await request.get(`${A}/beliefs?preview=1&preview=1`)).status()).toBe(200)
  })

  test("C1 the need link keeps the need after the # so it never reaches the server", async ({ page }) => {
    const sent: string[] = []
    page.on("request", (r) => sent.push(r.url()))
    await page.goto(`${A}/beliefs?preview=1`)
    await rateAll(page, [5, 4, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1])
    await page.locator('a[href*="#need="]').first().click()
    await page.waitForURL(/\/gives/)
    const url = page.url()
    expect(new URL(url).search).not.toMatch(/need=/)
    expect(new URL(url).hash).toMatch(/^#need=[a-z]+$/)
    expect(sent.filter((u) => /need=/.test(u.split("#")[0]))).toEqual([])
    const need = new URL(url).hash.slice(6)
    await expect(page.getByTestId(`chip-${need}`)).toHaveAttribute("aria-checked", "true")
  })

  test("C1 an old ?need= link still works and its address becomes the # form", async ({ page }) => {
    await page.goto(`${A}/gives?preview=1&need=sleep`)
    await expect(page.getByTestId("chip-sleep")).toHaveAttribute("aria-checked", "true")
    await expect.poll(() => new URL(page.url()).search).not.toMatch(/need=/)
    expect(new URL(page.url()).hash).toBe("#need=sleep")
  })

  test("C2 the privacy page tells that the held count is in the saved image's address", async ({ page }) => {
    await page.goto("/privacy")
    await expect(page.getByText(/number of beliefs you rated high/)).toBeVisible()
  })

  test("C4 the count route takes only JSON from its own site", async ({ request }) => {
    const data = JSON.stringify({ addiction: "nicotine", tool: "beliefs", step: "view" })
    expect((await request.post("/api/quit/count", { headers: { "content-type": "text/plain" }, data })).status()).toBe(415)
    expect((await request.post("/api/quit/count", { headers: { "content-type": "application/x-www-form-urlencoded" }, data })).status()).toBe(415)
    expect((await request.post("/api/quit/count", { headers: { "content-type": "application/json", origin: "https://evil.example" }, data })).status()).toBe(403)
    expect((await request.post("/api/quit/count", { headers: { "content-type": "application/json" }, data })).status()).toBe(204)
  })

  test("C4 the page itself still counts a view in the browser", async ({ page }) => {
    const done = page.waitForResponse((r) => r.url().includes("/api/quit/count"))
    await page.goto(`${A}/how`)
    expect((await done).status()).toBe(204)
  })

  test("C6 the share card can be cached for a day", async ({ request }) => {
    const res = await request.get(`${A}/card?held=5&preview=1`)
    expect(res.status()).toBe(200)
    expect(res.headers()["cache-control"]).toBe("public, max-age=86400")
  })

  test("sleep symptom shows the four rules and no separate help row", async ({ page }) => {
    await page.goto(`${A}/symptoms?symptom=sleep`)
    await expect(page.getByTestId("sleep-rules")).toBeVisible()
    await expect(page.getByTestId("symptom-help")).toHaveCount(0)
  })
})
