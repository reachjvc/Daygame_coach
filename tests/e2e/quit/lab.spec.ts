/**
 * THE QUIT LAB FRAME, OPENED ON A PHONE.
 *
 * Signed out, 390x844: the index lists every tool and variant, each variant
 * opens with no console errors, and without `?preview=1` the lab is a 404.
 * The dummy variant proves the lab store over a reload. Read-only.
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
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text())
      })
      page.on("pageerror", (e) => errors.push(e.message))
      const res = await page.goto(`/quit/lab/${id}/${vid}?preview=1`)
      expect(res?.status()).toBe(200)
      await expect(page.getByTestId("lab-tool-name")).toHaveText(LAB[id].name)
      await expect(page.getByTestId("lab-variant-label")).toHaveText(LAB[id].variants[vid].label)
      await page.waitForLoadState("networkidle")
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
      expect(errors).toEqual([])
    })
  }
}

test("dummy variant writes and reads the lab store", async ({ page }) => {
  await page.goto("/quit/lab/sos/dummy?preview=1")
  await expect(page.getByText("Lab works")).toBeVisible()
  await expect(page.getByTestId("lab-dummy-value")).toContainText("none yet")
  await page.getByRole("button", { name: "Write a value" }).click()
  await expect(page.getByTestId("lab-dummy-value")).toContainText("hello from the lab store")
  await page.reload()
  await expect(page.getByTestId("lab-dummy-value")).toContainText("hello from the lab store")
})

test("without preview the lab answers 404", async ({ page }) => {
  expect((await page.goto("/quit/lab"))?.status()).toBe(404)
  expect((await page.goto("/quit/lab/sos/dummy"))?.status()).toBe(404)
})

test("unknown tool or variant answers 404", async ({ page }) => {
  expect((await page.goto("/quit/lab/nope/x?preview=1"))?.status()).toBe(404)
  expect((await page.goto("/quit/lab/sos/nope?preview=1"))?.status()).toBe(404)
})
