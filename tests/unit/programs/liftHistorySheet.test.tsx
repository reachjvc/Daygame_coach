/**
 * FOUR STATES, FOUR DIFFERENT SENTENCES.
 *
 * "Could not load your past sets" and "nothing logged for this lift" used to
 * be the same blank list — the failure this app has now fixed in dozens of
 * places: a read that broke, shown to somebody as a fact about their training.
 * A lifter who sees an empty history for a lift they squatted last Friday
 * concludes the app lost it.
 *
 * The other thing pinned here is the DATE. A session's date is a calendar
 * fact, so it is read in the account's zone — a workout logged Tuesday 00:30
 * in Copenhagen must not read "Mon" because the phone is still set to London.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { LiftHistorySheet } from "@/src/programs/components/live/LiftHistorySheet"

const sheet = (over: Partial<React.ComponentProps<typeof LiftHistorySheet>> = {}) =>
  render(
    <LiftHistorySheet
      open
      onClose={vi.fn()}
      name="Squat"
      unit="kg"
      unitLabel="kg"
      timezone="Europe/Copenhagen"
      {...over}
    />
  )

/** A response that never resolves, so the loading state stays on screen. */
const pending = () => new Promise<Response>(() => {})

beforeEach(() => vi.restoreAllMocks())

describe("the lift history sheet", () => {
  it("shows placeholders while it is loading, not an empty list", () => {
    vi.stubGlobal("fetch", vi.fn(pending))
    sheet()
    expect(screen.getByTestId("lift-history-loading")).toBeTruthy()
    expect(screen.queryByTestId("lift-history-sheet-empty")).toBeNull()
  })

  it("says the read failed, and offers to try again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: "boom" }) }) as unknown as Response)
    )
    sheet()
    await waitFor(() => expect(screen.getByTestId("lift-history-sheet-failed")).toBeTruthy())
    expect(screen.getByText("Try again")).toBeTruthy()
    // And it never claims the lift has not been done.
    expect(screen.queryByTestId("lift-history-sheet-empty")).toBeNull()
  })

  it("treats a body it cannot read as a failure, not as nothing logged", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ unexpected: true }) }) as unknown as Response)
    )
    sheet()
    await waitFor(() => expect(screen.getByTestId("lift-history-sheet-failed")).toBeTruthy())
  })

  it("says how far back it looked when there is nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ unit: "kg", sessions: [] }) }) as unknown as Response)
    )
    sheet()
    // "Nothing, ever" would be a claim the read cannot make: it looks at a
    // hundred finished workouts.
    await waitFor(() =>
      expect(screen.getByTestId("lift-history-sheet-empty").textContent).toContain("last 100 workouts")
    )
  })

  it("collapses identical sets and names the day in the account's zone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            unit: "kg",
            sessions: [
              {
                // 00:30 Tuesday in Copenhagen is still Monday in London.
                at: "2026-09-21T22:30:00Z",
                sets: [
                  { weight: 60, reps: 5, setNumber: 1, kind: "warmup" },
                  { weight: 100, reps: 5, setNumber: 1, kind: "working" },
                  { weight: 100, reps: 5, setNumber: 2, kind: "working" },
                  { weight: 100, reps: 3, setNumber: 3, kind: "working" },
                ],
              },
            ],
          }),
        }) as unknown as Response
      )
    )
    sheet()
    await waitFor(() => expect(screen.getByTestId("lift-history-sheet-rows")).toBeTruthy())
    const row = screen.getByTestId("lift-history-sheet-rows").textContent ?? ""
    expect(row).toContain("Tue")
    // Five rows of "100 kg × 5" is a spreadsheet; the set that DIFFERED is the
    // only part worth reading.
    expect(row).toContain("2 × 100 kg × 5")
    expect(row).toContain("100 kg × 3")
    // A warm-up is marked, because a screen that hides the difference makes
    // the volume look wrong to whoever did it.
    expect(row).toContain("60 kg × 5 (W)")
  })

  it("takes the best from the working sets, never from a warm-up", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            unit: "kg",
            sessions: [
              {
                at: "2026-09-18T10:00:00Z",
                sets: [
                  // A heavy "warm-up" — mis-tagged, or a heavy single done as
                  // one. Either way it is not this lift's best working set.
                  { weight: 140, reps: 1, setNumber: 1, kind: "warmup" },
                  { weight: 105, reps: 5, setNumber: 1, kind: "working" },
                ],
              },
              {
                at: "2026-09-15T10:00:00Z",
                sets: [{ weight: 100, reps: 5, setNumber: 1, kind: "working" }],
              },
            ],
          }),
        }) as unknown as Response
      )
    )
    sheet()
    await waitFor(() =>
      expect(screen.getByTestId("lift-history-best").textContent).toBe("Best: 105 kg × 5")
    )
  })

  it("asks for the lift by name and library id, in the reader's unit", async () => {
    const urls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(String(url))
        return { ok: true, status: 200, json: async () => ({ unit: "lb", sessions: [] }) } as unknown as Response
      })
    )
    sheet({ name: "Bench Press", libraryId: "lib_bench_press", unit: "lb", unitLabel: "lb" })
    await waitFor(() => expect(urls.length).toBe(1))
    expect(urls[0]).toBe(
      "/api/workouts/lifts?exercise=Bench%20Press&libraryId=lib_bench_press&unit=lb"
    )
  })
})
