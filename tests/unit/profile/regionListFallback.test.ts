import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { REGIONS } from "@/src/profile/data/regions"

/**
 * Onboarding step 2 must be answerable without the map.
 *
 * Measured on a 390px viewport (iPhone 14) on 2026-09-04: the map renders 361px
 * wide and 233 of its 236 country shapes are below Apple's 44px minimum touch
 * target; 184 are under 10px. Poland -- the largest shape in Eastern Europe --
 * is 8.9 x 8.4px, and missing it by 5px silently selects Belarus (Slavic
 * Europe) or Germany (Western Europe). There are no zoom controls, and the Next
 * button stays disabled until a region is chosen, so a phone user could not
 * finish onboarding at all.
 *
 * These assert the list exists, covers every region, and is a real control --
 * not that it is tappable, which was measured in the browser.
 */
const ROOT = join(__dirname, "../../..")
const map = readFileSync(join(ROOT, "src/profile/components/InteractiveWorldMap.tsx"), "utf8")

describe("region choice does not depend on hitting a shape on a map", () => {
  it("renders a list control alongside the map", () => {
    expect(map).toContain('data-testid="region-list"')
    expect(map).toContain('aria-label="Choose a region"')
  })

  it("drives the list from the same REGIONS data as the map", () => {
    // A second hardcoded list is how the two would drift apart.
    expect(map).toContain("REGIONS.map((region)")
    expect(map).toContain("onRegionSelect(region.id)")
  })

  it("gives every region an option, so none is map-only", () => {
    expect(REGIONS.length).toBeGreaterThan(0)
    expect(map).toContain("`region-option-${region.id}`")
  })

  it("uses real buttons with a touch-sized target and pressed state", () => {
    expect(map).toContain('type="button"')
    expect(map).toContain("aria-pressed={isSelected}")
    // 52px clears Apple's 44px minimum with room for a border.
    expect(map).toContain("min-h-[52px]")
  })

  it("does not tell a phone user to click", () => {
    const flow = readFileSync(join(ROOT, "src/profile/components/OnboardingFlow.tsx"), "utf8")
    expect(flow).not.toContain("Click a region")
    expect(flow).toContain("Tap a region")
  })
})
