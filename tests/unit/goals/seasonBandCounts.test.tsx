// @vitest-environment jsdom

/**
 * THE NUMBER ON THE PAGE YOU OPEN EVERY DAY.
 *
 * The season band sits at the top of `/dashboard/tracking` and says how much of
 * today's list is done. From the day Phase 1 landed until 2026-09-24 it said
 * **zero, always, for everyone** — and it was not a rendering bug. The page fed
 * it `rowsToPlan(...)`, which returns `logged` EMPTY by construction, because
 * the day tables are deliberately not part of the whole-plan read. So the band
 * asked an empty map how much had been done and was told nothing, an hour after
 * somebody had ticked all five.
 *
 * That is the shape this project keeps paying for: a value indistinguishable
 * from a real answer. "0 of 5" is exactly what a person who had done nothing
 * would see, so nobody could tell it was broken by looking at it.
 *
 * The second test is the other half, and it is a different fault in the same
 * line: the band asked the BROWSER what day it was, while every tick is written
 * against the ACCOUNT's day. A phone an hour ahead counted a different day's
 * progress than the one its owner had just ticked, and the two screens
 * disagreed with nothing on either saying which was right.
 */

import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { NO_TRAINING_TICKS } from "@/src/goals/dayTicks"
import { SeasonBand } from "@/src/goals/components/north-star/SeasonBand"
import { addCustomStep, emptyNsPlan, setNorthStar } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

const TODAY = "2026-09-24"

/** A plan with one thing on today's list, ticked or not. */
function planWithOneStep(ticked: boolean, on = TODAY): { plan: NsPlan; stepId: string } {
  const base = setNorthStar(emptyNsPlan(), "I run my own company and I am free.")
  const withStep = addCustomStep(base, base.routines[0].id, "Cold shower", 5, 7)
  const stepId = withStep.routines[0].steps[0].id
  return {
    plan: { ...withStep, logged: ticked ? { [on]: [stepId] } : {} },
    stepId,
  }
}

const band = () => document.body.textContent?.replace(/\s+/g, " ") ?? ""

afterEach(cleanup)

describe("the band counts what is actually on the account", () => {
  it("counts a tick that IS there", () => {
    const { plan } = planWithOneStep(true)
    render(<SeasonBand plan={plan} oneThing={null} ready ticks={NO_TRAINING_TICKS} today={TODAY} />)
    expect(band(), "a ticked step must be counted").toMatch(/1 of 1/)
  })

  it("counts zero when nothing is ticked, which is a different fact", () => {
    const { plan } = planWithOneStep(false)
    render(<SeasonBand plan={plan} oneThing={null} ready ticks={NO_TRAINING_TICKS} today={TODAY} />)
    expect(band()).toMatch(/0 of 1/)
  })

  /**
   * The regression itself, stated as the page used to state it: a plan whose
   * day half was dropped on the way out of the database.
   */
  it("said 0 of 1 for a plan that HAD the tick, when the day half was dropped", () => {
    const { plan } = planWithOneStep(true)
    const asTheReadUsedToHandItOver = { ...plan, logged: {} }
    render(<SeasonBand plan={asTheReadUsedToHandItOver} oneThing={null} ready ticks={NO_TRAINING_TICKS} today={TODAY} />)
    expect(
      band(),
      "this is what the dashboard showed every day: the tick exists and the band cannot see it",
    ).toMatch(/0 of 1/)
  })
})

describe("whose day the band is counting", () => {
  it("uses the day it is given, not the one this machine happens to be on", () => {
    // Ticked on the account's day. A browser an hour ahead would ask about
    // tomorrow and find nothing.
    const { plan } = planWithOneStep(true, TODAY)
    render(<SeasonBand plan={plan} oneThing={null} ready ticks={NO_TRAINING_TICKS} today={TODAY} />)
    expect(band()).toMatch(/1 of 1/)

    cleanup()
    render(<SeasonBand plan={plan} oneThing={null} ready ticks={NO_TRAINING_TICKS} today="2026-09-25" />)
    expect(band(), "a different day is a different count, and that is correct").toMatch(/0 of 1/)
  })
})
