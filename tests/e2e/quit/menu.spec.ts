/**
 * THE QUIT MENU, OPENED COLD ON A PHONE.
 *
 * Signed out, 390x844: `/quit` and `/quit/nicotine` (a preview in development
 * and test), every row opens a tool or its coming-soon state, nothing scrolls
 * sideways, and the "Craving now?" bar never covers the last row. Read-only.
 */

import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl, NICOTINE_HIDDEN_WITHOUT_PREVIEW } from "../helpers/quit"
import type { Page } from "@playwright/test"
import { QUIT_TOOL_IDS } from "../../../src/quit/types"
import { findMenuTool, isLiveTool, liveToolIds } from "../../../src/quit/menu"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })

async function noSidewaysScroll(page: Page) {
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(390)
}

for (const colorScheme of ["dark", "light"] as const) {
  test.describe(`colour scheme ${colorScheme}`, () => {
    test.use({ colorScheme })

    test("/quit lists the addictions", async ({ page }) => {
      const res = await page.goto(quitUrl("/quit"))
      expect(res?.status()).toBe(200)
      await expect(page.getByRole("link", { name: "Quit nicotine" })).toBeVisible()
      await noSidewaysScroll(page)
    })

    test("the nicotine menu shows 5 groups and every row, no sideways scroll", async ({ page }) => {
      const res = await page.goto(quitUrl("/quit/nicotine"))
      expect(res?.status()).toBe(200)
      await expect(page.getByRole("heading", { level: 1, name: "Quit nicotine" })).toBeVisible()
      await expect(page.getByRole("combobox", { name: "Quit what?" })).toBeVisible()
      // the hint points at the 12 lies test: it shows only once that tool is in liveTools.json
      await expect(page.getByRole("link", { name: /New here\?/ })).toHaveCount(isLiveTool("beliefs") ? 1 : 0)
      await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5)
      await expect(page.locator('[data-testid^="row-"]')).toHaveCount(QUIT_TOOL_IDS.length)
      // built rows are links, every other row is greyed "Soon" and not a link
      for (const id of QUIT_TOOL_IDS) {
        const row = page.getByTestId(`row-${id}`)
        if (isLiveTool(id)) await expect(row).toHaveAttribute("href", /^\/quit\/nicotine\//)
        else await expect(row).toHaveAttribute("data-soon", "true")
      }
      // the account pill shows only on live rows that need a free account
      await expect(page.getByText("Free account")).toHaveCount(liveToolIds().filter((id) => findMenuTool(id)?.account === "free").length)
      const body = (await page.locator("body").innerText()).toLowerCase()
      expect(body).not.toContain("no account")
      expect(body).not.toContain("start here")
      expect(body).not.toMatch(/\bmen?\b/)
      await noSidewaysScroll(page)
    })

    test("every row opens a tool or its coming-soon state", async ({ page }) => {
      await page.goto(quitUrl("/quit/nicotine"))
      const hrefs = await page
        .locator('[data-testid^="row-"]')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? ""))
      expect(hrefs).toHaveLength(QUIT_TOOL_IDS.length)
      for (const href of hrefs) {
        if (!href.startsWith("/quit/nicotine/")) continue
        const res = await page.goto(href)
        expect(res?.status(), href).toBe(200)
        await expect(page.locator("h1"), href).toBeVisible()
        await expect(page.locator("body"), href).not.toContainText(/could not load|Application error/)
        await noSidewaysScroll(page)
      }
    })

    test("the craving bar does not cover the last row", async ({ page }) => {
      await page.goto(quitUrl("/quit/nicotine"))
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      const bar = page.getByTestId("sos-bar")
      if (!isLiveTool("sos")) {
        // not built: the bar and the footer link to it are not drawn at all
        await expect(bar).toHaveCount(0)
        return
      }
      await expect(bar).toBeVisible()
      const last = await page.locator('[data-testid^="row-"]').last().boundingBox()
      const barBox = await bar.boundingBox()
      expect(last && barBox).toBeTruthy()
      expect(last!.y + last!.height).toBeLessThanOrEqual(barBox!.y)
    })
  })
}

test("without ?preview=1 nicotine and its built tools open; coaching, the lab and unbuilt tools do not", async ({ page }) => {
  const res = await page.goto("/quit")
  expect(res?.status()).toBe(200)
  await expect(page.getByRole("link", { name: "Quit nicotine" })).toHaveCount(NICOTINE_HIDDEN_WITHOUT_PREVIEW ? 0 : 1)
  expect((await page.goto("/quit/nicotine"))?.status()).toBe(NICOTINE_HIDDEN_WITHOUT_PREVIEW ? 404 : 200)
  expect((await page.goto("/quit/nicotine?preview=1"))?.status()).toBe(200)
  if (!NICOTINE_HIDDEN_WITHOUT_PREVIEW) {
    for (const id of liveToolIds()) expect((await page.goto(`/quit/nicotine/${id}`))?.status(), id).toBe(200)
  }
})

test("a production build links nothing that needs ?preview=1 and shows no coaching link", async ({ page }) => {
  // only a production build hides the coaching page and unbuilt tools; next dev shows them as previews
  const prod = !!process.env.CI || process.env.E2E_PRODUCTION_BUILD === "1"
  for (const path of ["/quit", "/quit/nicotine", ...liveToolIds().map((id) => `/quit/nicotine/${id}`)]) {
    await page.goto(path)
    const hrefs = await page.locator("a[href^='/quit']").evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""))
    for (const href of hrefs) {
      if (href.startsWith("/quit/lab")) throw new Error(`${path} links the lab: ${href}`)
      if (prod) expect(href, path).not.toMatch(/coaching/)
      const res = await page.request.get(href)
      expect(res.status(), `${path} -> ${href}`).toBe(200)
    }
  }
  if (!prod) return
  expect((await page.request.get("/quit/coaching")).status()).toBe(404)
  expect((await page.request.get("/quit/nicotine/gives")).status()).toBe(404)
})

test("an unknown addiction or tool is 404", async ({ page }) => {
  expect((await page.goto(quitUrl("/quit/nope")))?.status()).toBe(404)
  expect((await page.goto(quitUrl("/quit/nicotine/nope")))?.status()).toBe(404)
})

test("?present=1 hides the footer", async ({ page }) => {
  await page.goto(quitUrl("/quit/nicotine/past?present=1"))
  await expect(page.locator('[data-present="true"]')).toBeVisible()
  await expect(page.getByText("Privacy")).toHaveCount(0)
})

test("the count route answers 204 for a valid event and 400 for a bad one", async ({ request }) => {
  const ok = await request.post("/api/quit/count", { data: { addiction: "nicotine", tool: "menu", step: "view" } })
  expect(ok.status()).toBe(204)
  const bad = await request.post("/api/quit/count", { data: { addiction: "nicotine", tool: "x", step: "view" } })
  expect(bad.status()).toBe(400)
})
