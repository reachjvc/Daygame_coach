/**
 * THE REST CLOCK, AND WHAT COUNTS AS A MISS.
 *
 * Two things this file holds down, both about what the screen SAYS after a tap:
 *
 * 1. The clock starts the instant the ✓ is tapped, not when the server answers.
 *    Waiting for the reply starts it late on gym wifi and, with no signal at
 *    all, not until the request gives up — so the rest you actually took is not
 *    the rest it counted. But if the server REFUSES the set, there is nothing to
 *    rest from and the clock is cleared again.
 *
 * 2. A lift you added on the day is listed as added, never as "0 of 3". Added
 *    lifts get three empty rows so there is somewhere to put the sets, and the
 *    finish sheet counted those rows as sets the program had asked for — so
 *    "Front Squat 0 of 3" was presented as a miss that would bring a weight
 *    down, for a lift nobody had prescribed.
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
  startedAt: "2026-09-18T07:00:00.000Z",
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
      sets: [
        { setNumber: 1, weight: 100, reps: 5 },
        { setNumber: 2, weight: 100, reps: 5 },
      ],
    },
  ],
} as unknown as SessionPrescription

/** A response that only resolves when the test says so. */
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function renderScreen(over: Partial<LiveWorkout> = {}, presc = prescription) {
  return render(
    <LiveWorkoutScreen
      initial={{ ...workout, ...over }}
      prescription={presc}
      programName="StrongLifts 5×5"
      unit="kg"
      lastTime={{}}
    />
  )
}

beforeEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe("the rest clock", () => {
  it("starts on the tick and is cleared when the server refuses the set", async () => {
    const user = userEvent.setup()
    const reply = deferred<Response>()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/sets") ? await reply.promise : ({ ok: true, status: 200, json: async () => null } as unknown as Response)
      )
    )

    renderScreen()
    await user.click(screen.getAllByTestId("tick-1")[0])

    // The clock is already running, with the write still on the wire.
    expect(screen.getByTestId("rest-bar")).toBeTruthy()

    reply.resolve({
      ok: false,
      status: 400,
      json: async () => ({ error: "Weight has to be between 0 and 999.99." }),
    } as unknown as Response)

    // And it goes away, because there is nothing to rest from.
    await waitFor(() => expect(screen.queryByTestId("rest-bar")).toBeNull())
  })

  it("stays when the set is merely queued", async () => {
    const user = userEvent.setup()
    const reply = deferred<Response>()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/sets")) {
          await reply.promise
          throw new Error("offline")
        }
        return { ok: true, status: 200, json: async () => null } as unknown as Response
      })
    )

    renderScreen()
    await user.click(screen.getAllByTestId("tick-1")[0])
    expect(screen.getByTestId("rest-bar")).toBeTruthy()

    reply.resolve({} as Response)
    // The set was done. It is waiting for signal, not refused, so the rest the
    // person is actually taking keeps counting.
    await waitFor(() => expect(screen.getByText(/waiting for signal/i)).toBeTruthy())
    expect(screen.getByTestId("rest-bar")).toBeTruthy()
  })

  /**
   * A LATE REFUSAL MAY ONLY CLEAR ITS OWN CLOCK.
   *
   * Two ticks in a row, and the first one's refusal arrives second. Clearing
   * the clock unconditionally took the rest the person had just started on the
   * set that DID save — so the bar vanished mid-rest for no reason they could
   * see. The clock's start instant is its identity, and a late answer is only
   * allowed to clear the clock it started.
   */
  it("a refusal that arrives late does not wipe the rest a later set started", async () => {
    const user = userEvent.setup()
    const first = deferred<Response>()
    let setPosts = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (!String(url).includes("/sets")) {
          return { ok: true, status: 200, json: async () => null } as unknown as Response
        }
        setPosts += 1
        // The first set's reply is held back; the second saves at once, and it
        // must really SAVE — a thrown reply would queue it instead, and then the
        // clock would stay for the wrong reason and this test would pass by
        // doing nothing.
        if (setPosts === 1) return await first.promise
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ...workout,
            sets: [
              {
                id: "s2",
                exerciseId: "squat",
                exercise: "Squat",
                weight: 100,
                weightKg: 100,
                reps: 5,
                setNumber: 2,
                kind: "working",
                prescribedIndex: null,
                completedAt: "2026-09-18T07:05:00.000Z",
                rpe: null,
                side: null,
              },
            ],
          }),
        } as unknown as Response
      })
    )

    renderScreen()
    await user.click(screen.getAllByTestId("tick-1")[0])
    await user.click(screen.getAllByTestId("tick-2")[0])
    expect(screen.getByTestId("rest-bar")).toBeTruthy()

    first.resolve({
      ok: false,
      status: 400,
      json: async () => ({ error: "Weight has to be between 0 and 999.99." }),
    } as unknown as Response)

    // Set 1 comes off the screen and is named — and set 2's rest keeps running.
    await waitFor(() => expect(screen.getByTestId("live-error")).toBeTruthy())
    expect(screen.getByTestId("rest-bar")).toBeTruthy()
  })
})

describe("what the finish sheet calls a miss", () => {
  it("a lift added on the day is listed as added, never as '0 of 3'", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => null }) as unknown as Response)
    )

    renderScreen({
      adjustments: { added: [{ exerciseId: "added_front_squat", name: "Front Squat" }] },
    })

    await user.click(screen.getByTestId("finish-workout"))

    const sheet = await screen.findByText(/not everything was ticked/i)
    expect(sheet).toBeTruthy()

    // The prescribed lift IS short, and says so with a count.
    expect(screen.getByText(/0 of 2/)).toBeTruthy()
    // The added lift is named, without a count and without miss wording.
    const addedRow = screen.getByText(/added, nothing ticked/i).closest("li")
    expect(addedRow?.textContent).toContain("Front Squat")
    expect(screen.queryByText(/0 of 3/)).toBeNull()
  })
})
