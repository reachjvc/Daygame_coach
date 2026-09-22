/**
 * THE REST CLOCK SURVIVES THE PHONE LOCKING.
 *
 * It was three `useState`s on the screen, so anything that remounted the page
 * took the countdown with it — and the thing most likely to do that is a
 * phone locking itself between sets, which is exactly when the clock is the
 * only reason you are looking at the screen. You came back to no timer and no
 * way to tell how long you had been standing there.
 *
 * A remount is what a reload is, from the component's point of view, so that
 * is what these test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LiveWorkoutScreen } from "@/src/programs/components/live/LiveWorkoutScreen"
import type { LiveWorkout, SessionPrescription } from "@/src/programs/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/programs/live",
  useSearchParams: () => new URLSearchParams(),
}))

const prescription = {
  programId: "stronglifts-5x5",
  dayId: "A",
  dayLabel: "Workout A",
  cycle: 1,
  week: 1,
  sessionCount: 0,
  periodised: false,
  exercises: [
    {
      exerciseId: "squat",
      name: "Squat",
      sets: [
        { setNumber: 1, weight: 100, reps: 5 },
        { setNumber: 2, weight: 100, reps: 5 },
      ],
    },
  ],
} as unknown as SessionPrescription

function workout(id = "w1"): LiveWorkout {
  return {
    id,
    startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    enrollmentId: "e1",
    dayId: "A",
    cycle: 1,
    week: 1,
    adjustments: {},
    notes: null,
    rpe: null,
    unit: "kg",
    sets: [],
  } as LiveWorkout
}

function screenFor(id = "w1") {
  render(
    <LiveWorkoutScreen
      initial={workout(id)}
      prescription={prescription}
      programName="StrongLifts 5×5"
      unit="kg"
      lastTime={{}}
      timezone="Europe/Copenhagen"
    />
  )
}

/** A set write that never answers, so the optimistic clock stays observable. */
function heldWrites() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/sets")
        ? await new Promise<Response>(() => {})
        : ({ ok: true, status: 200, json: async () => null } as unknown as Response)
    )
  )
}

beforeEach(() => {
  window.localStorage.clear()
  heldWrites()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("a rest clock across a reload", () => {
  it("is still counting when the screen comes back", async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <LiveWorkoutScreen
        initial={workout()}
        prescription={prescription}
        programName="StrongLifts 5×5"
        unit="kg"
        lastTime={{}}
        timezone="Europe/Copenhagen"
      />
    )

    await user.click(screen.getAllByTestId("tick-1")[0])
    await waitFor(() => expect(screen.getByTestId("rest-bar")).toBeTruthy())

    // A reload, from the component's point of view.
    unmount()
    screenFor()

    expect(screen.getByTestId("rest-bar"), "the countdown went with the reload").toBeTruthy()
  })

  it("is not restored for a different workout", async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <LiveWorkoutScreen
        initial={workout("w1")}
        prescription={prescription}
        programName="StrongLifts 5×5"
        unit="kg"
        lastTime={{}}
        timezone="Europe/Copenhagen"
      />
    )
    await user.click(screen.getAllByTestId("tick-1")[0])
    await waitFor(() => expect(screen.getByTestId("rest-bar")).toBeTruthy())
    unmount()

    // Yesterday's clock has no business on today's workout.
    screenFor("w2")
    expect(screen.queryByTestId("rest-bar")).toBeNull()
  })

  it("is not restored once it has run out", async () => {
    // Coming back an hour later to a bar counting a rest you took before
    // lunch is worse than no bar at all.
    window.localStorage.setItem(
      "live-workout-rest-v1",
      JSON.stringify({
        workoutId: "w1",
        exerciseId: "squat",
        from: Date.now() - 10 * 60_000,
        seconds: 90,
        ours: true,
      })
    )
    screenFor("w1")
    expect(screen.queryByTestId("rest-bar")).toBeNull()
  })

  it("survives storage being unreadable, rather than taking the screen with it", () => {
    window.localStorage.setItem("live-workout-rest-v1", "{not json")
    screenFor("w1")
    // The screen renders; only the clock is lost.
    expect(screen.getByTestId("live-column")).toBeTruthy()
    expect(screen.queryByTestId("rest-bar")).toBeNull()
  })
})
