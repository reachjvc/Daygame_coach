/**
 * THE LIVE SCREEN, WHEN THE SESSION ALREADY HAPPENED.
 *
 * Writing up Tuesday's workout on Thursday used the same screen as standing in
 * the gym, and it showed:
 *
 *   - "2,880 min" in the header, climbing, because the counter measures from
 *     the start instant to now
 *   - a 90-second rest bar starting every time you ticked a set you did two
 *     days ago
 *
 * Both come from one question the screen never asked: is this happening now?
 * It uses the same six-hour rule the Tracking card uses for "still open" — a
 * workout left open since Monday and one deliberately backdated are the same
 * situation and want the same screen.
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

function workout(startedAt: string): LiveWorkout {
  return {
    id: "w1",
    startedAt,
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
}

/** Yesterday — comfortably past the six-hour line. */
const YESTERDAY = new Date(Date.now() - 26 * 3_600_000).toISOString()
/** Ten minutes ago — a workout happening now. */
const JUST_NOW = new Date(Date.now() - 10 * 60_000).toISOString()

function screenFor(startedAt: string, timezone = "Europe/Copenhagen") {
  render(
    <LiveWorkoutScreen
      initial={workout(startedAt)}
      prescription={prescription}
      programName="StrongLifts 5×5"
      unit="kg"
      lastTime={{}}
      timezone={timezone}
    />
  )
}

beforeEach(() => {
  window.localStorage.clear()
  /**
   * THE SET'S WRITE IS HELD OPEN, IN EVERY TEST HERE.
   *
   * The first version of this file answered it instantly with `null`, and a
   * reply that is not a saved set CLEARS the rest bar — correctly. So the
   * "yesterday" test passed with past mode switched OFF: the bar appeared and
   * the stub wiped it, and the assertion could not tell that apart from the
   * screen never starting one. Proved by setting `past = false` and watching
   * it stay green.
   *
   * Held open, the only thing that can suppress the bar is the code under
   * test.
   */
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/sets")
        ? await new Promise<Response>(() => {})
        : ({ ok: true, status: 200, json: async () => null } as unknown as Response)
    )
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("a session being written up", () => {
  it("says when it started rather than counting minutes since", () => {
    screenFor(YESTERDAY)

    // "2,880 min" and climbing was the old header.
    expect(screen.getByText(/^since /i)).toBeTruthy()
    expect(screen.queryByText(/^\d+:\d{2}$/)).toBeNull()
  })

  it("reads that time in the account's zone, not the browser's", () => {
    // 2026-09-14T22:30Z is 00:30 on the 15th in Copenhagen and 22:30 on the
    // 14th in UTC — a different DAY, not just a different hour.
    const at = "2026-09-14T22:30:00.000Z"
    // Far enough in the past to be "past" whenever this test runs.
    render(
      <LiveWorkoutScreen
        initial={workout(at)}
        prescription={prescription}
        programName="StrongLifts 5×5"
        unit="kg"
        lastTime={{}}
        timezone="Europe/Copenhagen"
      />
    )
    const said = screen.getByText(/^since /i).textContent ?? ""
    expect(said).toMatch(/15/)
    expect(said).not.toMatch(/14/)
  })

  it("does not start the rest clock when a set is ticked", async () => {
    const user = userEvent.setup()
    screenFor(YESTERDAY)

    await user.click(screen.getAllByTestId("tick-1")[0])

    // A 90-second timer on a set you did yesterday is nonsense.
    await waitFor(() => expect(screen.queryByTestId("rest-bar")).toBeNull())
  })
})

describe("a workout happening now", () => {
  it("counts up in mm:ss, not whole minutes", () => {
    // It read "0 min" for the first sixty seconds and then jumped to "1 min":
    // a clock ticking every second that only ever showed one of them.
    screenFor(JUST_NOW)
    expect(screen.getByText(/^\d+:\d{2}$/)).toBeTruthy()
    expect(screen.queryByText(/^since /i)).toBeNull()
  })

  it("still starts the rest clock", async () => {
    const user = userEvent.setup()
    screenFor(JUST_NOW)

    await user.click(screen.getAllByTestId("tick-1")[0])
    expect(screen.getByTestId("rest-bar")).toBeTruthy()
  })
})

/**
 * A 5/3/1 top set is an AMRAP and a accessory row is often a range. Both carry
 * a number in `reps` that is a FLOOR, not the prescription.
 */
const mixed = {
  ...prescription,
  exercises: [
    {
      exerciseId: "bench",
      name: "Bench Press",
      sets: [
        { setNumber: 1, weight: 60, reps: 5 },
        { setNumber: 2, weight: 70, reps: 3 },
        { setNumber: 3, weight: 80, reps: 1 },
        { setNumber: 4, weight: 80, reps: 1, amrap: true },
      ],
    },
    {
      exerciseId: "row",
      name: "Row",
      sets: [{ setNumber: 1, weight: 40, reps: 8, repRangeMax: 12 }],
    },
  ],
} as unknown as SessionPrescription

describe("'Did the fixed sets as shown'", () => {
  it("ticks every fixed row, in order, at the numbers on the row", async () => {
    const user = userEvent.setup()
    const sent: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("/sets")) {
          sent.push(JSON.parse(String(init?.body)))
          return await new Promise<Response>(() => {})
        }
        return { ok: true, status: 200, json: async () => null } as unknown as Response
      })
    )
    screenFor(YESTERDAY)

    await user.click(screen.getByTestId("tick-all-squat"))

    expect(sent.map((s) => s.setNumber)).toEqual([1, 2])
    expect(sent.map((s) => s.weight)).toEqual([100, 100])
    expect(sent.map((s) => s.reps)).toEqual([5, 5])
  })

  it("counts and ticks only the fixed rows — the AMRAP is left for the person", async () => {
    const user = userEvent.setup()
    const sent: Array<Record<string, unknown>> = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes("/sets")) {
          sent.push(JSON.parse(String(init?.body)))
          return await new Promise<Response>(() => {})
        }
        return { ok: true, status: 200, json: async () => null } as unknown as Response
      })
    )
    render(
      <LiveWorkoutScreen
        initial={workout(YESTERDAY)}
        prescription={mixed}
        programName="5/3/1"
        unit="kg"
        lastTime={{}}
        timezone="Europe/Copenhagen"
      />
    )

    // Three of bench's four rows are fixed; the fourth is the AMRAP.
    expect(screen.getByTestId("tick-all-bench").textContent).toBe("Did the 3 fixed sets as shown")
    await user.click(screen.getByTestId("tick-all-bench"))
    expect(sent.map((s) => s.setNumber)).toEqual([1, 2, 3])

    // A rep range's `reps` is the bottom of the range, so "as shown" would
    // record the worst set that counted. Row has nothing to offer.
    expect(screen.queryByTestId("tick-all-row")).toBeNull()
  })

  it("is not there at all when the session is happening now", () => {
    screenFor(JUST_NOW)
    expect(screen.queryByTestId("tick-all-squat")).toBeNull()
  })
})

describe("throwing a workout away", () => {
  it("asks in the app's own dialog, and says how many sets go", async () => {
    const user = userEvent.setup()
    const withSets = {
      ...workout(JUST_NOW),
      sets: [
        { id: "s1", exerciseId: "squat", exercise: "Squat", weight: 100, weightKg: 100, reps: 5,
          setNumber: 1, kind: "working", side: null, prescribedIndex: 0, rpe: null,
          completedAt: new Date().toISOString() },
        { id: "s2", exerciseId: "squat", exercise: "Squat", weight: 100, weightKg: 100, reps: 5,
          setNumber: 2, kind: "working", side: null, prescribedIndex: 1, rpe: null,
          completedAt: new Date().toISOString() },
      ],
    } as unknown as LiveWorkout

    render(
      <LiveWorkoutScreen
        initial={withSets}
        prescription={prescription}
        programName="StrongLifts 5×5"
        unit="kg"
        lastTime={{}}
        timezone="Europe/Copenhagen"
      />
    )

    await user.click(screen.getByTestId("discard-workout"))

    // "Nothing will be recorded" was true and useless. The question is how
    // much of the session this is about to take.
    expect(screen.getByText(/2 sets will be thrown away/i)).toBeTruthy()
    expect(screen.getByText(/cannot be undone/i)).toBeTruthy()
  })

  it("says there is nothing to lose when nothing is ticked", async () => {
    const user = userEvent.setup()
    screenFor(JUST_NOW)

    await user.click(screen.getByTestId("discard-workout"))
    expect(screen.getByText(/nothing to lose/i)).toBeTruthy()
  })

  it("throws nothing away until the dialog is confirmed", async () => {
    const user = userEvent.setup()
    const calls: string[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "DELETE") calls.push(String(url))
        return { ok: true, status: 200, json: async () => null } as unknown as Response
      })
    )
    screenFor(JUST_NOW)

    await user.click(screen.getByTestId("discard-workout"))
    expect(calls, "opening the dialog must not discard anything").toEqual([])

    await user.click(screen.getByTestId("confirm-discard"))
    expect(calls.length, "confirming does").toBeGreaterThan(0)
  })
})
