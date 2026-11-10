// @vitest-environment jsdom
/**
 * THE BAR SAYS WHICH TAB YOU ARE ON, in more than colour.
 *
 * `text-primary` was the only signal. A screen reader was told nothing, and
 * anybody who cannot separate those two greys sees five identical tabs — on
 * the one control whose entire job is saying where you are.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { ROUTES } from "@/src/shared/routes"
import { render, screen } from "@testing-library/react"
import { MobileTabBar } from "@/components/MobileTabBar"

let path: string = ROUTES.training
vi.mock("next/navigation", () => ({ usePathname: () => path }))

afterEach(() => vi.restoreAllMocks())

/** Exactly the tabs marked current, by their visible label. */
function currentTabs(): string[] {
  return screen
    .getAllByRole("link")
    .filter((a) => a.getAttribute("aria-current") === "page")
    .map((a) => (a.textContent ?? "").trim())
}

describe("the current tab", () => {
  it("is named on You, which holds Settings", () => {
    path = ROUTES.settings
    render(<MobileTabBar />)
    expect(currentTabs()).toEqual(["You"])
  })

  it("is named on Activity, which is Tracking under its new name", () => {
    path = ROUTES.trackingHistory
    render(<MobileTabBar />)
    expect(currentTabs()).toEqual(["Activity"])
  })

  it("is exactly one tab, never several", () => {
    // `/dashboard/tracking` starts with `/dashboard`, so a prefix match on
    // both would mark two tabs at once and say nothing useful.
    path = ROUTES.tracking
    render(<MobileTabBar />)
    expect(currentTabs()).toHaveLength(1)
  })

  it("marks none when you are somewhere the bar does not name", () => {
    path = "/admin/ai-usage"
    render(<MobileTabBar />)
    expect(currentTabs()).toEqual([])
  })

  it("marks none on a tool opened from Home, which the bar does not name", () => {
    // Since 2026-11-10 the tools (Training, Scenarios, Time...) are tiles on
    // Home, copied from Grab, whose bar does not light up for a service either
    // (Plans/site-navigation-build.md, Phase 2). Marking Home there would
    // say you are on a page you are not on.
    for (const route of [ROUTES.training, ROUTES.scenarioPreferences]) {
      path = route
      const { unmount } = render(<MobileTabBar />)
      expect(currentTabs()).toEqual([])
      unmount()
    }
  })
})
