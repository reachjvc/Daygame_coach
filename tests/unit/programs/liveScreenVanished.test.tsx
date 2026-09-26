/**
 * "THIS WORKOUT IS FINISHED" IS THE ONE THING THIS SCREEN MUST NOT GET WRONG.
 *
 * There are two ways to end up with no workout on the live screen, and they owe
 * the person different news:
 *
 *   you finished it          "This workout is finished."
 *   it was thrown away on    the server's sentence — it was NOT saved
 *   another device
 *
 * Saying the first about the second tells somebody their session was recorded
 * when it was deleted. The hook learned the difference on 2026-09-26 and the
 * screen learned to print it — and a review pointed out that nothing tested the
 * printing. `workoutVanished.test.tsx` covers the flag; this covers the words,
 * which are the part a person actually meets.
 *
 * The mutation it exists to catch: replace the conditional in
 * `LiveWorkoutScreen.tsx` with the bare "This workout is finished." and every
 * other test in the repository stays green.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LiveWorkoutScreen } from "@/src/programs/components/live/LiveWorkoutScreen"
import type { LiveWorkout, SessionPrescription } from "@/src/programs/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/programs/live",
  useSearchParams: () => new URLSearchParams(),
}))

const workout: LiveWorkout = {
  id: "w1",
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
}

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
      sets: [{ setNumber: 1, weight: 100, reps: 5 }],
    },
  ],
} as unknown as SessionPrescription

const GONE = "This workout was thrown away somewhere else, so that change was not saved."

function renderScreen() {
  return render(
    <LiveWorkoutScreen
      initial={workout}
      prescription={prescription}
      programName="StrongLifts 5×5"
      unit="kg"
      lastTime={{}}
      timezone="UTC"
    />
  )
}

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe("the live screen when the workout went away", () => {
  it("says it was thrown away, and does NOT say it was finished", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({ error: GONE, code: "workout_gone" }),
          }) as unknown as Promise<Response>
      )
    )
    renderScreen()

    await userEvent.click(await screen.findByTestId("tick-1"))

    await waitFor(() => expect(screen.getByText(GONE)).toBeTruthy())
    expect(
      screen.queryByText("This workout is finished."),
      "it was deleted, not saved — this is the sentence that must never appear here"
    ).toBeNull()
  })

  it("still offers the way back to training", async () => {
    // A terminal screen with no exit is its own defect: the workout is gone and
    // every control on this page acts on it.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          Promise.resolve({
            ok: false,
            status: 409,
            json: async () => ({ error: GONE, code: "workout_gone" }),
          }) as unknown as Promise<Response>
      )
    )
    renderScreen()

    await userEvent.click(await screen.findByTestId("tick-1"))

    await waitFor(() => expect(screen.getByText(GONE)).toBeTruthy())
    const back = screen.getByRole("link", { name: /back to training/i })
    expect(back.getAttribute("href")).toBe("/programs")
  })

  it("a set the server merely refused leaves the workout on screen", async () => {
    // The other direction. Without this the screen could clear itself on any
    // refusal at all, which would throw away a workout over one bad set.
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ error: "Squat already has a warm-up set 1 — delete one of them first." }),
          }) as unknown as Promise<Response>
      )
    )
    renderScreen()

    await userEvent.click(await screen.findByTestId("tick-1"))

    await waitFor(() =>
      expect(screen.getByText(/already has a warm-up set 1/)).toBeTruthy()
    )
    expect(screen.queryByText(GONE)).toBeNull()
    // The lift is still there, so the workout is still there.
    expect(screen.getAllByTestId("tick-1").length).toBeGreaterThan(0)
  })
})
