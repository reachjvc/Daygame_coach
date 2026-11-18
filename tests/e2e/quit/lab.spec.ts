/**
 * THE QUIT LAB FRAME, OPENED ON A PHONE.
 *
 * Signed out, 390x844: the index lists every tool and variant, each variant
 * opens with no console errors, and without `?preview=1` the lab is a 404.
 * Read-only.
 */

import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { LAB, LAB_TOOL_IDS } from "../../../src/quit/lab/registry"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })

test("index lists every tool and variant", async ({ page }) => {
  const res = await page.goto("/quit/lab?preview=1")
  expect(res?.status()).toBe(200)
  for (const id of LAB_TOOL_IDS) {
    const card = page.getByTestId(`lab-tool-${id}`)
    await expect(card).toContainText(LAB[id].name)
    const variants = Object.keys(LAB[id].variants)
    if (variants.length === 0) await expect(card).toContainText("not built yet")
    for (const vid of variants) {
      await expect(page.getByTestId(`lab-link-${id}-${vid}`)).toHaveAttribute("href", `/quit/lab/${id}/${vid}?preview=1`)
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

for (const id of LAB_TOOL_IDS) {
  for (const vid of Object.keys(LAB[id].variants)) {
    test(`variant ${id}/${vid} opens without console errors`, async ({ page }) => {
      const errors: string[] = []
      // Signed out, the app asks two account endpoints and they answer 401 by design (the same on
      // /quit/nicotine/how); the browser logs each as a console error. Any other failed request counts.
      const SIGNED_OUT_PROBES = new Set(["/api/whoami", "/api/settings/time-preferences"])
      let probes401 = 0
      page.on("response", (r) => {
        if (r.status() === 401 && SIGNED_OUT_PROBES.has(new URL(r.url()).pathname)) probes401++
      })
      const logged: string[] = []
      page.on("console", (m) => {
        if (m.type() === "error") logged.push(m.text())
      })
      page.on("pageerror", (e) => errors.push(e.message))
      const res = await page.goto(`/quit/lab/${id}/${vid}?preview=1`)
      expect(res?.status()).toBe(200)
      await expect(page.getByTestId("lab-tool-name")).toHaveText(LAB[id].name)
      await expect(page.getByTestId("lab-variant-label")).toHaveText(LAB[id].variants[vid].label)
      await page.waitForLoadState("networkidle")
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
      const is401 = (t: string) => /status of 401/.test(t)
      const unexplained = [...logged.filter((t) => !is401(t)), ...logged.filter(is401).slice(probes401)]
      expect([...errors, ...unexplained]).toEqual([])
    })
  }
}

test("without preview the lab answers 404", async ({ page }) => {
  expect((await page.goto("/quit/lab"))?.status()).toBe(404)
  expect((await page.goto("/quit/lab/sos/a"))?.status()).toBe(404)
})

test("unknown tool or variant answers 404", async ({ page }) => {
  expect((await page.goto("/quit/lab/nope/x?preview=1"))?.status()).toBe(404)
  expect((await page.goto("/quit/lab/sos/nope?preview=1"))?.status()).toBe(404)
})
