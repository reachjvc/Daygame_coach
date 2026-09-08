/**
 * THE LEVEL CARD MUST NOT SHOW A NUMBER AGAIN.
 *
 * The card used to render "Level 7" next to "0 / 100 XP" and a bar that could
 * never fill. Measured against the live database on 2026-09-07: nothing in the
 * app has ever written `xp` or `scenarios_completed`, and `level` came from a
 * signup question using a formula the bar itself disagreed with, so three of
 * the four real accounts were shown a level their own XP contradicted.
 *
 * The card was then stripped to a plain "coming soon" box, and on 2026-09-08 the
 * crown, the gauge and the meter were put back at the user's request -- the
 * chrome was never the problem, the numbers were. That is exactly the moment a
 * "0" creeps back in as a placeholder, so these tests assert on the meaning:
 * no digit anywhere in the card, and no element that draws a fill.
 *
 * A count that cannot be computed is a third state, never 0. The gauge shows an
 * em dash, and `--` is not a number.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { LevelProgressBar } from "@/src/profile/components/LevelProgressBar"

afterEach(cleanup)

describe("LevelProgressBar", () => {
  it("shows no number of any kind -- no level, no XP, no count, no percentage", () => {
    const { container } = render(<LevelProgressBar />)

    const text = container.textContent ?? ""
    expect(text).not.toMatch(/\d/)
  })

  it("never says the words that only make sense with a number behind them", () => {
    render(<LevelProgressBar />)

    // "Levels & progress" is fine; "Level 7" and "0 / 100 XP" are not. Anything
    // matching these read as a measurement the app cannot make.
    expect(screen.queryByText(/level\s+\d/i)).toBeNull()
    expect(screen.queryByText(/\bxp\b/i)).toBeNull()
    expect(screen.queryByText(/\d+\s*%/)).toBeNull()
  })

  it("draws an empty track with no fill element", () => {
    const { container } = render(<LevelProgressBar />)

    // A fill is the one thing that would turn the outline back into a reading.
    // In the old card it was a div with an inline `width: N%`.
    expect(container.querySelector('[style*="width"]')).toBeNull()
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it("keeps the crown and the gauge, so the card still reads as progression", () => {
    const { container } = render(<LevelProgressBar />)

    expect(container.querySelectorAll("svg").length).toBe(2)
  })

  it("says plainly that the feature is not built rather than implying zero", () => {
    render(<LevelProgressBar />)

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    expect(screen.getByText(/nothing tracks this yet/i)).toBeInTheDocument()
  })
})
