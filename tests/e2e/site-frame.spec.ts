import { test, expect } from "./fixtures/test"
import { HIDDEN_ROUTE_PREFIXES, MORE_ITEMS, TABS } from "@/components/navTabs"
import { isUnder } from "@/src/shared/routes"

/**
 * EVERY TAB DESTINATION HAS THE APP'S NAVIGATION, AND NONE POSES AS A CHILD OF ANOTHER PAGE.
 *
 * A friend opened the site on 2026-10-13 and said Settings looked like "a subset of something".
 * It did: Settings drew "‹ Back", Scenarios "Back to Dashboard", Training "← Dashboard", and on a
 * laptop Tracking had no navigation at all. Plans/site-structure.md.
 *
 * Runs on a fresh account, which is unpaid: Ask Coach sends it to the Dashboard and Scenarios
 * shows the preferences form first. Both are still inside the frame, which is what is checked.
 */
const ITEMS = [...TABS, ...MORE_ITEMS]
const FRAMED = ITEMS.filter((item) => !HIDDEN_ROUTE_PREFIXES.some((p) => isUnder(item.href, p)))
const WIDTHS = [
  { name: "laptop", viewport: { width: 1280, height: 800 }, labels: ITEMS.map((i) => i.label) },
  { name: "phone", viewport: { width: 390, height: 844 }, labels: TABS.map((t) => t.label) },
]

for (const item of FRAMED) {
  for (const width of WIDTHS) {
    test(`${item.label} on a ${width.name}: the app's navigation, no back control`, async ({ page }) => {
      await page.setViewportSize(width.viewport)
      await page.goto(item.href)
      await page.waitForLoadState("networkidle")
      const seen = await page.evaluate(() => {
        const visible = (el: Element) => {
          const s = getComputedStyle(el)
          const b = el.getBoundingClientRect()
          return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0
        }
        const text = (el: Element) => (el as HTMLElement).innerText.trim()
        return {
          navLinks: [...document.querySelectorAll("nav")]
            .filter(visible)
            .flatMap((nav) => [...nav.querySelectorAll("a")].filter(visible).map(text)),
          backControls: [...document.querySelectorAll("a, button")]
            .filter((el) => visible(el) && !el.closest("nav"))
            .map(text)
            .filter((t) => /^(←\s*)?back\b|^←|^‹/i.test(t) || t === "Dashboard"),
        }
      })
      for (const label of width.labels) expect(seen.navLinks).toContain(label)
      expect(seen.backControls).toEqual([])
      // One segment: a tab destination is not part of another page.
      expect(item.href.split("/").filter(Boolean)).toHaveLength(1)
    })
  }
}
