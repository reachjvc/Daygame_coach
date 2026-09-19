/**
 * THE BAR SAYS WHICH TAB YOU ARE ON, in more than colour.
 *
 * `text-primary` was the only signal. A screen reader was told nothing, and
 * anybody who cannot separate those two greys sees five identical tabs — on
 * the one control whose entire job is saying where you are.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MobileTabBar } from "@/components/MobileTabBar"

let path = "/programs"
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
  it("is named on /programs, the route this bar used not to reach at all", () => {
    path = "/programs"
    render(<MobileTabBar />)
    expect(currentTabs()).toEqual(["Training"])
  })

  it("is exactly one tab, never several", () => {
    // `/dashboard/tracking` starts with `/dashboard`, so a prefix match on
    // both would mark two tabs at once and say nothing useful.
    path = "/dashboard/tracking"
    render(<MobileTabBar />)
    expect(currentTabs()).toHaveLength(1)
  })

  it("marks none when you are somewhere the bar does not name", () => {
    path = "/preferences"
    render(<MobileTabBar />)
    expect(currentTabs()).toEqual([])
  })
})
