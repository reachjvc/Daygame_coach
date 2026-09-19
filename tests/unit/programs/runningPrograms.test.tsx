/**
 * THE BAND THAT SAYS WHAT IS RUNNING.
 *
 * Two faults, opposite in shape.
 *
 * IT INVENTED A DISAGREEMENT. It compared the Life Mastery plan's COPY of the
 * day names against the CATALOGUE's days, ignoring the enrollment's own
 * schedule entirely. So renaming a day, building your own week, or starting
 * any endurance plan produced an amber warning — "Your written week (Push /
 * Pull / Legs) is not the week any of these prescribe" — about the program you
 * were actually running.
 *
 * IT HID A REAL ONE. `error` from the enrollment list was never read, so a
 * failed request rendered exactly like "you have no programs": nothing at all,
 * and a Start button below it. Press it and you silently pause the program you
 * were on, because the app decided on no evidence that there was nothing there.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { RunningPrograms } from "@/src/programs/components/RunningPrograms"
import { refreshEnrollments } from "@/src/programs/hooks/useEnrollment"
import type { ProgramEnrollment } from "@/src/programs/types"

const enrollment = (over: Partial<ProgramEnrollment> = {}): ProgramEnrollment =>
  ({
    id: "e1",
    program_id: "stronglifts-5x5",
    level: "beginner",
    unitSystem: "kg",
    is_active: true,
    started_at: "2026-09-01T10:00:00.000Z",
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
    exerciseState: {},
    customSchedule: null,
    ...over,
  }) as unknown as ProgramEnrollment

/** Answers the list endpoint with `rows`, or fails the request. */
function serving(rows: ProgramEnrollment[] | "fail") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (rows === "fail") throw new TypeError("Failed to fetch")
      return { ok: true, status: 200, json: async () => rows } as unknown as Response
    })
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const DISAGREEMENT = /is not the week any of these prescribe/i

describe("nothing invents a disagreement", () => {
  it("a renamed-day enrollment renders no disagreement line", async () => {
    // The exact case that fired it: the person renamed Workout A, so the
    // catalogue's labels no longer matched the plan's copy of them.
    serving([
      enrollment({
        customSchedule: {
          kind: "linear_rotation",
          days: [
            { id: "d1", label: "Chest day", exercises: [] },
            { id: "d2", label: "Leg day", exercises: [] },
          ],
        },
      } as Partial<ProgramEnrollment>),
    ])

    render(<RunningPrograms />)

    await waitFor(() => expect(screen.getByTestId("running-programs")).toBeTruthy())
    expect(screen.queryByText(DISAGREEMENT)).toBeNull()
  })

  it("a self-built week renders no disagreement line", async () => {
    // Every self-built week is `program_id: "custom"`, whose catalogue entry is
    // a single placeholder day — so this fired every single time.
    serving([enrollment({ program_id: "custom", label: "Winter block" } as Partial<ProgramEnrollment>)])

    render(<RunningPrograms />)

    await waitFor(() => expect(screen.getByTestId("running-programs")).toBeTruthy())
    expect(screen.queryByText(DISAGREEMENT)).toBeNull()
  })
})

describe("a list that could not be read", () => {
  it("says so rather than rendering as an empty account", async () => {
    serving("fail")

    render(<RunningPrograms />)

    await waitFor(() => expect(screen.getByTestId("running-programs-unavailable")).toBeTruthy())
    const said = screen.getByTestId("running-programs-unavailable")
    expect(said.textContent).toMatch(/could not be loaded/i)
    // An alert, because it changes what the buttons below it mean.
    expect(said.getAttribute("role")).toBe("alert")
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy()
  })

  it("says so too when a stale list is still on screen", async () => {
    // THE DANGEROUS CASE: a list IS showing, so the page looks trustworthy.
    // First load succeeds, then a refresh fails — the shared store keeps the
    // rows it knew and records the error beside them.
    let attempt = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        attempt += 1
        if (attempt === 1) {
          return { ok: true, status: 200, json: async () => [enrollment()] } as unknown as Response
        }
        throw new TypeError("Failed to fetch")
      })
    )

    render(<RunningPrograms />)
    await waitFor(() => expect(screen.getByTestId("running-programs")).toBeTruthy())

    await refreshEnrollments()

    // Both at once: the programs it knew about, and the fact that they may be
    // out of date.
    await waitFor(() => expect(screen.getByTestId("running-programs-unavailable")).toBeTruthy())
    expect(screen.getByTestId("running-programs")).toBeTruthy()
  })
})
