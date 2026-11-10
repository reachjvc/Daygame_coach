import { test, expect } from "./fixtures/test"
import { HIDDEN_ROUTE_PREFIXES, PHONE_BAR_HIDDEN_PREFIXES, ROUTE_LABELS, TAB_ROUTES, TABS, TOOLS } from "@/components/navTabs"
import { isUnder } from "@/src/shared/routes"

/**
 * EVERY TAB DESTINATION HAS THE APP'S NAVIGATION, AND NONE POSES AS A CHILD OF ANOTHER PAGE.
 *
 * A friend opened the site on 2026-10-13 and said Settings looked like "a subset of something".
 * It did: Settings drew "‹ Back", Scenarios "Back to Dashboard", Training "← Dashboard", and on a
 * laptop Tracking had no navigation at all. Plans/site-structure.md.
 *
 * Runs on a fresh account, which is unpaid: Scenarios shows the preferences form first, which is
 * still inside the frame, which is what is checked. Ask Coach is left out: since 2026-11-10 it
 * sends an unpaid account to the plans on the front page, which is outside the app on purpose.
 *
 * Since 2026-11-10 (Plans/site-navigation-build.md, Phase 2) the destinations are the four tabs,
 * All tools, and every tool a Home tile opens (`TAB_ROUTES`); the header and the bar name the
 * four tabs on both widths.
 */
const PAID_ONLY = new Set(TOOLS.filter((t) => t.access === "paid").map((t) => t.href))
const ITEMS = TAB_ROUTES.filter((href) => !PAID_ONLY.has(href)).map((href) => ({ href, label: ROUTE_LABELS[href] ?? href }))
const FRAMED = ITEMS.filter((item) => !HIDDEN_ROUTE_PREFIXES.some((p) => isUnder(item.href, p)))
const WIDTHS = [
  { name: "laptop", viewport: { width: 1280, height: 800 }, labels: TABS.map((t) => t.label) },
  { name: "phone", viewport: { width: 390, height: 844 }, labels: TABS.map((t) => t.label) },
]

/** Time keeps the laptop header and draws its own phone bar and back control (D9, Plans/time-tracker-like-toggl.md) */
const OWN_PHONE_BAR = (href: string) => PHONE_BAR_HIDDEN_PREFIXES.some((p) => isUnder(href, p))

for (const item of FRAMED) {
  for (const width of WIDTHS) {
    if (width.name === "phone" && OWN_PHONE_BAR(item.href)) continue
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
            .filter((t) => /^(←\s*)?back\b|^←|^‹/i.test(t) || t === "Dashboard" || t === "Home"),
        }
      })
      for (const label of width.labels) expect(seen.navLinks).toContain(label)
      expect(seen.backControls).toEqual([])
      // One segment: a tab destination is not part of another page.
      expect(item.href.split("/").filter(Boolean)).toHaveLength(1)
    })
  }
}
