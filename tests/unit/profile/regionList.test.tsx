/**
 * THE REGION LIST RENDERS WHERE IT WAS ASKED FOR, AND NOWHERE ELSE.
 *
 * The failure this prevents: a 13-button region list was added to
 * `InteractiveWorldMap` so onboarding step 2 could be completed on a phone. The
 * same component is the map tile inside the dashboard's "Your Preferences" card,
 * which nobody looked at — so the card grew ~800px of greyed-out buttons on a
 * phone. The test written with the change read the component FILE AS TEXT and
 * checked that certain strings were in it; it could not see a second caller.
 *
 * This one renders. The map's SVG is fetched in an effect, so `fetch` is stubbed
 * to return an empty drawing; nothing here depends on the map itself.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { InteractiveWorldMap } from "@/src/profile/components/InteractiveWorldMap"
import { REGIONS } from "@/src/profile/data/regions"

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ text: async () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>' })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("InteractiveWorldMap regionList", () => {
  test('"list" renders one enabled button per region', () => {
    render(<InteractiveWorldMap selectedRegion={null} onRegionSelect={() => {}} regionList="list" />)
    const list = screen.getByTestId("region-list")
    const buttons = list.querySelectorAll("button")
    expect(buttons).toHaveLength(REGIONS.length)
    expect([...buttons].filter((b) => b.disabled)).toHaveLength(0)
  })

  test('"map-only" renders no list at all — not a hidden one, not a disabled one', () => {
    render(<InteractiveWorldMap selectedRegion={null} onRegionSelect={() => {}} regionList="map-only" />)
    expect(screen.queryByTestId("region-list")).toBeNull()
    expect(screen.queryByText("Or choose from the list")).toBeNull()
  })

  test("every region in the data has a button, named as the data names it", () => {
    render(<InteractiveWorldMap selectedRegion={null} onRegionSelect={() => {}} regionList="list" />)
    for (const region of REGIONS) {
      const button = screen.getByTestId(`region-option-${region.id}`)
      expect(button).toHaveTextContent(region.name)
    }
  })

  test("a tap on a button reports that region's id", () => {
    const onRegionSelect = vi.fn()
    render(<InteractiveWorldMap selectedRegion={null} onRegionSelect={onRegionSelect} regionList="list" />)
    screen.getByTestId("region-option-slavic-europe").click()
    expect(onRegionSelect).toHaveBeenCalledWith("slavic-europe")
  })

  test("when choosing a secondary region, the secondary is what shows as chosen — not the primary", () => {
    // The dashboard hardcoded selectionMode="primary" while tracking the real
    // mode in its own state, so the list highlighted the primary region while
    // the person was picking a secondary one.
    render(
      <InteractiveWorldMap
        selectedRegion="western-europe"
        secondaryRegion="east-asia"
        selectionMode="secondary"
        onRegionSelect={() => {}}
        regionList="list"
      />,
    )
    expect(screen.getByTestId("region-option-east-asia")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("region-option-western-europe")).toHaveAttribute("aria-pressed", "false")
  })

  test("a list that is not interactive is disabled, never silently clickable", () => {
    const onRegionSelect = vi.fn()
    render(
      <InteractiveWorldMap selectedRegion={null} onRegionSelect={onRegionSelect} regionList="list" isInteractive={false} />,
    )
    const button = screen.getByTestId("region-option-africa")
    expect(button).toBeDisabled()
    button.click()
    expect(onRegionSelect).not.toHaveBeenCalled()
  })
})
