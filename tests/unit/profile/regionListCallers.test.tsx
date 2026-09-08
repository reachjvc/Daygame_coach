/**
 * THE TWO SCREENS THAT RENDER THE MAP, RENDERED.
 *
 * The failure this prevents, in full: a 13-button region list was added to
 * `InteractiveWorldMap` so the region step could be completed on a phone. The
 * same component is the map tile inside the dashboard's "Your Preferences"
 * card. Nobody looked at the dashboard, and it grew ~800px of greyed-out
 * buttons. The test that shipped with that change read the component FILE AS
 * TEXT and asserted substrings; it could not see a second caller. The test that
 * shipped with the FIX rendered `InteractiveWorldMap` directly and passed the
 * prop itself — so flipping the dashboard's prop back would have left all six
 * assertions green. Both tests were about the component. The defect was about
 * the callers.
 *
 * So these render the callers, and nothing else. Sibling of
 * `regionList.test.tsx`, which owns the component's own behaviour.
 *
 * Both callers reach a "use server" module for their save actions, which pulls
 * the server Supabase client into a jsdom run; both are mocked. The map fetches
 * its own SVG in an effect, so `fetch` returns an empty drawing — none of these
 * assertions is about the map's shapes.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { DatingPreferencesGate } from "@/src/profile/components/DatingPreferencesGate"
import { UserPreferences } from "@/src/profile/components/UserPreferences"
import { REGIONS } from "@/src/profile/data/regions"

vi.mock("@/src/profile/actions", () => ({
  saveDatingPreferences: vi.fn(),
  updateAgeRange: vi.fn(),
  updatePreferredRegion: vi.fn(),
  updateProfilePreference: vi.fn(),
  updateSecondaryRegionDirect: vi.fn(),
}))

const PROFILE = {
  age_range_start: 22,
  age_range_end: 25,
  archetype: "corporate-powerhouse",
  dating_foreigners: false,
  preferred_region: "western-europe",
  secondary_region: "east-asia",
}

beforeEach(() => {
  // The card's age Slider is a Radix primitive, which measures itself. jsdom has
  // no ResizeObserver, and without this React reports the failure as an opaque
  // AggregateError from deep inside the reconciler.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ text: async () => '<svg xmlns="http://www.w3.org/2000/svg"></svg>' })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const list = () => screen.queryByTestId("region-list")

describe("the dashboard's Your Preferences card", () => {
  test("does not open with a list of regions in it", async () => {
    render(<UserPreferences {...PROFILE} />)
    await waitFor(() => expect(screen.getByText("Preferred region map")).toBeInTheDocument())
    // The card is a small tile in a two-column grid. 13 buttons at 52px is
    // ~450px on a desktop and ~770px on a phone, inside one grid cell.
    expect(list()).toBeNull()
  })

  test("offers the list as soon as a region mode is armed, because the map alone cannot be used", async () => {
    const user = (await import("@testing-library/user-event")).default.setup()
    render(<UserPreferences {...PROFILE} />)
    await user.click(screen.getByRole("button", { name: /Choose new primary region/ }))

    const shown = await screen.findByTestId("region-list")
    const buttons = [...shown.querySelectorAll("button")]
    expect(buttons).toHaveLength(REGIONS.length)
    // Armed means usable: a greyed-out list is what the dashboard had before,
    // and a thumb cannot hit an 8.9px country.
    expect(buttons.filter((b) => b.disabled)).toHaveLength(0)
  })

  test("names every region rather than showing a database id", async () => {
    const user = (await import("@testing-library/user-event")).default.setup()
    render(<UserPreferences {...PROFILE} />)
    await user.click(screen.getByRole("button", { name: /Choose new primary region/ }))
    await screen.findByTestId("region-list")

    // "slavic-europe" was missing from a hand-written label table in this file,
    // so choosing it printed the raw id on the card.
    for (const region of REGIONS) {
      expect(screen.getByTestId(`region-option-${region.id}`)).toHaveTextContent(region.name)
    }
  })
})

describe("the dating-preferences gate", () => {
  // Replaces "onboarding step 2": the five-step wizard is gone and this screen
  // is the one place the region is asked for, so it is now the second caller.
  test("shows the list, usable, without anything having to be armed first", async () => {
    render(
      <DatingPreferencesGate
        heading="Before your first scenario"
        intro="intro"
        submitLabel="Start practising"
      />,
    )

    const shown = await screen.findByTestId("region-list")
    const buttons = [...shown.querySelectorAll("button")]
    expect(buttons).toHaveLength(REGIONS.length)
    expect(buttons.filter((b) => b.disabled)).toHaveLength(0)
  })
})
