/**
 * THE STRIP SHOWS THE ACCOUNT'S DAY, NOT THE PHONE'S.
 *
 * `isoWeekday(new Date())` is the browser's clock. The session card beside
 * this strip is decided on the server, from the account's timezone. A lifter
 * whose phone is in Bangkok and whose account says Copenhagen saw the strip
 * outline one day and the card prescribe another day's session, on one screen,
 * with nothing explaining it.
 *
 * The test fixes the browser's clock to a day that is deliberately NOT the day
 * the server names, so a strip that went back to reading `new Date()` cannot
 * pass this by coincidence.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { WeekStrip } from "@/src/programs/components/WeekStrip"
import { seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramEnrollment, ProgramSchedule } from "@/src/programs/types"

const PROGRAM = "stronglifts-5x5"

/** The two StrongLifts days, pinned to Monday and Thursday. */
function pinned(): ProgramSchedule {
  const base = requireProgram(PROGRAM).schedule
  if (base.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")
  return { ...base, days: base.days.map((d, i) => ({ ...d, weekday: i === 0 ? 1 : 4 })) }
}

function enrollment(): ProgramEnrollment {
  const { exerciseState, cursor } = seedEnrollment(requireProgram(PROGRAM), "beginner", "kg")
  return {
    id: "e1",
    user_id: "u1",
    program_id: PROGRAM,
    level: "beginner",
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-01-01T00:00:00.000Z",
    customSchedule: pinned(),
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe("the week strip", () => {
  it("highlights the weekday the server names even when the browser's clock says another", () => {
    // The browser is on Saturday. The account, a day behind, is on Friday.
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-09-19T01:00:00.000Z") })

    render(<WeekStrip enrollment={enrollment()} today={5} trainedWeekdays={[]} onSaved={vi.fn()} />)

    // Friday is the day marked as today — 5, what the server handed down.
    expect(screen.getByTestId("week-day-5").getAttribute("data-today")).toBe("1")

    // And Saturday, which is what `new Date()` would have said, is not.
    expect(screen.getByTestId("week-day-6").getAttribute("data-today")).toBeNull()
  })

  it("marks the days the server says were trained, and no others", () => {
    render(<WeekStrip enrollment={enrollment()} today={5} trainedWeekdays={[1]} onSaved={vi.fn()} />)

    expect(screen.getAllByText("done")).toHaveLength(1)
    // Monday is the pinned day that was trained; Thursday is pinned and was not.
    expect(screen.getByTestId("week-day-1").textContent).toContain("done")
    expect(screen.getByTestId("week-day-4").textContent).not.toContain("done")
  })

  it("shows nothing done when the server sends an empty week", () => {
    render(<WeekStrip enrollment={enrollment()} today={5} trainedWeekdays={[]} onSaved={vi.fn()} />)
    expect(screen.queryByText("done")).toBeNull()
  })
})
