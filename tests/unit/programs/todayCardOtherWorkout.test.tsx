// @vitest-environment jsdom

/**
 * THE ONE BUTTON, WHEN THE WORKOUT THAT IS OPEN IS NOT THIS PROGRAM'S.
 *
 * Two open workouts is not a state the database allows, so the Today card
 * cannot offer Start — it has to send you to the one you already have. It said
 * "Finish the workout you have open first" whatever the age of that workout,
 * and that is the wrong instruction for most of them.
 *
 * FINISHING A STALE WORKOUT WRITES A SESSION THAT NEVER HAPPENED. `summaryFor`
 * clamps the duration at 599 minutes, so a workout left open twelve days ago
 * with nothing ticked in it lands in History as a TEN-HOUR workout. The Tracking
 * card has said "Finish or discard it" for these all along; this card was the
 * one telling somebody to finish it.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TodayCard } from "@/src/programs/components/TodayCard"
import type { SessionPrescription, TrainingCardState } from "@/src/programs/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/programs",
  useSearchParams: () => new URLSearchParams(),
}))

const PRESCRIPTION = {
  programId: "stronglifts-5x5",
  dayId: "A",
  dayLabel: "Workout A",
  cycle: 1,
  week: 1,
  sessionCount: 0,
  periodised: false,
  exercises: [],
} as unknown as SessionPrescription

/** An open workout belonging to something other than the card's enrollment. */
function elsewhere(over: Partial<TrainingCardState> = {}): TrainingCardState {
  return {
    kind: "live",
    workoutId: "w1",
    enrollmentId: null,
    dayLabel: null,
    startedAt: "2026-09-11T19:14:00.000Z",
    setsTicked: 0,
    setsAsked: null,
    also: [],
    ...over,
  } as TrainingCardState
}

function card(state: TrainingCardState) {
  render(
    <TodayCard
      enrollmentId="enr-1"
      programName="StrongLifts 5×5"
      prescription={PRESCRIPTION}
      unit="kg"
      state={state}
    />
  )
}

afterEach(cleanup)

describe("another workout is open", () => {
  it("offers to discard a stale one, and names the day it belongs to", () => {
    card(elsewhere({ kind: "stale", startedOnWeekday: "Friday" } as Partial<TrainingCardState>))

    const button = screen.getByTestId("other-workout-open")
    expect(button.textContent).toBe("Finish or discard Friday's workout")
    /**
     * The word that matters is "discard". Finishing a fortnight-old empty
     * workout writes a ten-hour session into somebody's history, and the card
     * was recommending exactly that.
     */
    expect(button.textContent).toContain("discard")
  })

  it("says finish for one that is genuinely still running", () => {
    // Twenty minutes in, on another program: finishing it IS the right advice.
    card(elsewhere())

    expect(screen.getByTestId("other-workout-open").textContent).toBe(
      "Finish the workout you have open first"
    )
  })

  it("never offers Start while another workout is open", () => {
    // Two at once is not a state the database allows, and a Start that fails on
    // the way in is worse than no Start.
    card(elsewhere({ kind: "stale", startedOnWeekday: "Friday" } as Partial<TrainingCardState>))
    expect(screen.queryByTestId("start-workout")).toBeNull()
  })
})
