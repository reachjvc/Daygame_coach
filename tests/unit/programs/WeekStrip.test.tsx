/**
 * THE STRIP SHOWS THE ACCOUNT'S DAY, NOT THE PHONE'S.
 *
 * `isoWeekday(new Date())` is the browser's clock. The session card beside
 * this strip is decided on the server, from the account's timezone. A lifter
 * whose phone is in Bangkok and whose account says Copenhagen saw the strip
 * outline one day and the card prescribe another day's session, on one screen,
 * with nothing explaining it.
 *
 * The strip is presentational now: every fact is a prop. So the test fixes the
 * browser's clock to a day that is deliberately NOT the day the props name — a
 * strip that went back to reading `new Date()` cannot pass this by accident.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { WeekStrip } from "@/src/programs/components/WeekStrip"
import type { WeekSoFar } from "@/src/programs/types"

function week(over: Partial<WeekSoFar> = {}): WeekSoFar {
  return {
    timezone: "Europe/Copenhagen",
    weekStartedOn: "2026-09-14",
    todayWeekday: 3,
    trainedWeekdays: [],
    trainedToday: false,
    ...over,
  }
}

afterEach(() => vi.useRealTimers())

/** The cell marked today, by weekday number. */
const todayCell = () =>
  screen.getAllByTestId(/^week-day-/).filter((c) => c.getAttribute("data-today") === "1")

const trainedCells = () =>
  screen
    .getAllByTestId(/^week-day-/)
    .filter((c) => c.getAttribute("data-trained") === "1")
    .map((c) => c.getAttribute("data-testid"))

describe("the week strip", () => {
  it("marks the weekday the server names even when the browser's clock says another", () => {
    // A Sunday, so a strip reading its own clock would mark day 7.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-20T09:00:00.000Z"))

    render(<WeekStrip week={week({ todayWeekday: 3 })} />)

    expect(todayCell()).toHaveLength(1)
    expect(todayCell()[0].getAttribute("data-testid")).toBe("week-day-3")
  })

  it("marks the days the server says were trained, and no others", () => {
    render(<WeekStrip week={week({ trainedWeekdays: [1, 4] })} />)
    expect(trainedCells()).toEqual(["week-day-1", "week-day-4"])
  })

  it("shows nothing trained when the server sends an empty week", () => {
    // A strip that cannot go back to empty is not reporting anything: a Monday
    // trained once in July used to show green every Monday afterwards.
    render(<WeekStrip week={week()} />)
    expect(trainedCells()).toEqual([])
  })

  it("is seven cells, always", () => {
    render(<WeekStrip week={week()} />)
    expect(screen.getAllByTestId(/^week-day-/)).toHaveLength(7)
  })

  it("says what each day holds, for somebody who cannot see the dots", () => {
    render(
      <WeekStrip week={week({ trainedWeekdays: [1] })} labels={{ 1: "Workout A", 4: "Workout B" }} />
    )
    // Trained beats planned: what you DID is the more useful fact.
    expect(screen.getByLabelText("Mon: trained")).toBeTruthy()
    expect(screen.getByLabelText("Thu: Workout B")).toBeTruthy()
    expect(screen.getByLabelText("Tue: nothing planned")).toBeTruthy()
  })

  it("is read-only until somebody passes a way to change it", () => {
    const { rerender } = render(<WeekStrip week={week()} />)
    expect(screen.queryAllByRole("button")).toHaveLength(0)

    const onPickDay = vi.fn()
    rerender(<WeekStrip week={week()} onPickDay={onPickDay} />)
    expect(screen.getAllByRole("button")).toHaveLength(7)
  })
})
