/**
 * A RUN IS A WORKOUT TOO.
 *
 * An endurance session prescribes blocks, not sets, so the live screen had
 * nothing to tick and said so: "Nothing to tick off here." Two consequences,
 * both silent. A run cut short after three of five intervals was recorded
 * exactly like one that was finished. And the finish sheet, which counts what
 * happened for every other kind of session, had nothing to count.
 *
 * NO MISS WORDING ON A RUN. There is no weight to hold or drop, and an
 * endurance program progresses by its weekly plan rather than by this
 * session's judgement, so the sheet says what happened and stops there.
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
  dayId: "w1d3",
  cycle: 1,
  week: 1,
  adjustments: {},
  notes: null,
  rpe: null,
  unit: "kg",
  sets: [],
}

/** Couch to 5K, week 1: a walk, five run/walk repeats, a walk. */
const run = {
  programId: "couch-to-5k",
  dayId: "w1d3",
  dayLabel: "Run 3",
  cycle: 1,
  week: 1,
  sessionCount: 0,
  periodised: false,
  exercises: [],
  summary: "5 × (60 s jog / 90 s walk)",
  enduranceSets: [
    { repeat: 1, blocks: [{ label: "5 min brisk walk", minutes: 5 }] },
    { repeat: 5, blocks: [{ label: "60 s jog", minutes: 1 }, { label: "90 s walk", minutes: 1.5 }] },
    { repeat: 1, blocks: [{ label: "5 min walk", minutes: 5 }] },
  ],
} as unknown as SessionPrescription

function renderRun(over: Partial<LiveWorkout> = {}) {
  return render(
    <LiveWorkoutScreen
      initial={{ ...workout, ...over }}
      prescription={run}
      programName="Couch to 5K"
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

describe("the plan card of a run", () => {
  it("has one tick per row of the prescription, not one per inner block", () => {
    vi.stubGlobal("fetch", vi.fn())
    renderRun()
    // "5 × (60 s jog / 90 s walk)" is one thing you do, not ten.
    expect(screen.getByTestId("block-0")).toBeTruthy()
    expect(screen.getByTestId("block-1")).toBeTruthy()
    expect(screen.getByTestId("block-2")).toBeTruthy()
    expect(screen.queryByTestId("block-3")).toBeNull()
    expect(screen.queryByText(/nothing to tick off/i)).toBeNull()
  })

  it("writes the whole list of ticked blocks, so one tick cannot wipe another", async () => {
    const user = userEvent.setup()
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.body) bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>)
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...workout, adjustments: { blocksDone: [1] } }),
        } as unknown as Response
      })
    )

    renderRun({ adjustments: { blocksDone: [0] } })
    await user.click(screen.getByTestId("block-1"))
    await waitFor(() => expect(bodies.length).toBe(1))
    expect(bodies[0]).toEqual({ blocksDone: [0, 1] })
  })

  it("un-ticks a block by sending the list without it", async () => {
    const user = userEvent.setup()
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.body) bodies.push(JSON.parse(String(init.body)) as Record<string, unknown>)
        return { ok: true, status: 200, json: async () => ({ ...workout }) } as unknown as Response
      })
    )

    renderRun({ adjustments: { blocksDone: [0, 1] } })
    expect(screen.getByTestId("block-0")).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByTestId("block-0"))
    await waitFor(() => expect(bodies.length).toBe(1))
    expect(bodies[0]).toEqual({ blocksDone: [1] })
  })
})

describe("finishing a run", () => {
  it("says how many blocks were done, and never calls the rest a miss", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => null }) as unknown as Response))
    renderRun({ adjustments: { blocksDone: [0, 1] } })
    await user.click(screen.getByTestId("finish-workout"))

    expect(screen.getByTestId("finish-blocks").textContent).toBe("2 of 3 blocks")
    expect(screen.queryByText(/counts as a miss/i)).toBeNull()
    expect(screen.queryByText(/not everything was ticked/i)).toBeNull()
  })

  it("asks how far, in the unit the account reads distance in", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => null }) as unknown as Response))
    renderRun()
    await user.click(screen.getByTestId("finish-workout"))
    expect(screen.getByLabelText(/how far, in km/i)).toBeTruthy()
  })

  it("counts no blocks rather than hiding the line, so a run with none says 0 of 3", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => null }) as unknown as Response))
    renderRun()
    await user.click(screen.getByTestId("finish-workout"))
    expect(screen.getByTestId("finish-blocks").textContent).toBe("0 of 3 blocks")
  })
})
