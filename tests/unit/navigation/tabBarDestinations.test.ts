/**
 * THE BAR MUST EXIST WHERE THE BAR SENDS YOU.
 *
 * The bar used to be mounted page by page. So "Training", one of the tabs, sent
 * people to `/programs`, the one destination in the app that rendered no bar at
 * all: the way back out disappeared the moment you used it, and the only route
 * left was the browser's Back button.
 *
 * Since `Plans/site-structure.md` Phase 3 the frame (header and bar) is drawn
 * once by `app/(app)/layout.tsx`, so the question is now whether each tab lands
 * on a page inside that folder. That the layout really draws the frame is
 * `appFrame.test.tsx`'s job.
 *
 * A route may opt out, but only by SAYING SO in `HIDDEN_ROUTE_PREFIXES`, which
 * is why that list lives in navTabs.ts, where tests can read it.
 */

import { describe, it, expect } from "vitest"
import { TABS, HIDDEN_ROUTE_PREFIXES } from "@/components/navTabs"
import { ROUTES } from "@/src/shared/routes"
import { hasAppFrame, productRoutes } from "@/tests/support/appRoutes"

function pageFor(route: string): string | null {
  return productRoutes().find((r) => r.route === route)?.file ?? null
}

const framed = (route: string) => {
  const page = pageFor(route)
  return page !== null && hasAppFrame(route, page, HIDDEN_ROUTE_PREFIXES)
}

describe("every tab destination shows the bar", () => {
  it("each tab lands somewhere the frame is drawn", () => {
    const missing: string[] = []
    for (const tab of TABS) {
      if (HIDDEN_ROUTE_PREFIXES.some((p) => tab.href === p || tab.href.startsWith(`${p}/`))) continue
      expect(pageFor(tab.href), `${tab.href} has no page.tsx`).not.toBeNull()
      if (!framed(tab.href)) missing.push(tab.href)
    }
    expect(
      missing,
      "the bar sends people here and then is not there: the way back out vanishes",
    ).toEqual([])
  })

  it("premise: this test can tell a framed page from one that opts out", () => {
    // Without this, a broken rule would report every page as fine and the
    // guard above would pass for ever while protecting nothing.
    expect(framed(ROUTES.dashboard), "the Dashboard is inside the frame").toBe(true)
    expect(framed(ROUTES.liveWorkout), "the live workout opts out, so it must NOT get the frame").toBe(false)
  })
})
