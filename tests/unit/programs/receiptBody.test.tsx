/**
 * ONE RECEIPT, WHEREVER IT IS SHOWN.
 *
 * The finish sheet drew its own figures, bests and "next time", and the
 * receipt page drew another set. Two renderings of one workout, and they had
 * already drifted: the sheet knew about a lost reply and the page did not,
 * the page named the day and the sheet did not.
 *
 * What these pin is the half that is easy to get wrong twice: a number that
 * could not be read is NOT a zero, and a first is not a record.
 */

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ReceiptBody } from "@/src/programs/components/WorkoutReceipt"
import type { WorkoutSummary } from "@/src/programs/types"

function summary(over: Partial<WorkoutSummary> = {}): WorkoutSummary {
  return {
    workoutId: "w1",
    durationMin: 52,
    sets: 15,
    volumeKg: 4200,
    volume: 4200,
    unit: "kg",
    personalRecords: [],
    firstTimeLifts: [],
    changes: [],
    ...over,
  } as WorkoutSummary
}

describe("the receipt's figures", () => {
  it("prints what it has", () => {
    render(<ReceiptBody summary={summary()} />)
    expect(screen.getByText("52")).toBeTruthy()
    expect(screen.getByText("15")).toBeTruthy()
  })

  it("withholds every number when the totals could not be read", () => {
    /**
     * "0 sets, 0 kg lifted" after an hour of training is a claim about the
     * person that is not true. The workout IS saved — only the totals are
     * unknown — so the figures show "—" and say why.
     */
    render(<ReceiptBody summary={summary({ unavailable: true })} />)
    expect(screen.getByTestId("summary-unavailable")).toBeTruthy()
    expect(screen.queryByText("52")).toBeNull()
    expect(screen.queryByText("0")).toBeNull()
    expect(screen.getAllByText("—").length).toBe(3)
  })
})

describe("what was beaten, and what was not checked", () => {
  it("says the history was not read, rather than that nothing was beaten", () => {
    render(<ReceiptBody summary={summary({ recordsUnavailable: true })} />)
    expect(screen.getByTestId("records-unavailable")).toBeTruthy()
    // The two are different things to be told, and the old sheet showed the
    // same blank for both.
    expect(screen.queryByText(/personal bests/i)).toBeNull()
  })

  it("names a first as a first, not as a best", () => {
    // With no history every set used to be announced as a personal best, so
    // the very first set an account ever logged came back as "New best".
    render(<ReceiptBody summary={summary({ firstTimeLifts: ["Front Squat"] })} />)
    expect(screen.getByText(/first time logged: front squat/i)).toBeTruthy()
    expect(screen.queryByText(/personal bests/i)).toBeNull()
  })

  it("lists a best in the unit the receipt was taken in", () => {
    render(
      <ReceiptBody
        summary={summary({
          unit: "lb",
          personalRecords: [
            { exercise: "Bench", weight_kg: 100, weight: 220, reps: 5, date: "2026-09-20", isNew: true },
          ],
        })}
      />
    )
    expect(screen.getByText(/220 lb × 5/)).toBeTruthy()
  })
})

describe("what the program does next", () => {
  it("says it was not kept, rather than that nothing changed", () => {
    render(<ReceiptBody summary={summary({ changesUnavailable: true })} />)
    expect(screen.getByTestId("changes-unavailable")).toBeTruthy()
    expect(screen.queryByText(/next time/i)).toBeNull()
  })

  it("lists what moved", () => {
    render(
      <ReceiptBody
        summary={summary({
          changes: [{ exerciseId: "squat", name: "Squat", reason: "+2.5 kg" } as never],
        })}
      />
    )
    expect(screen.getByText("Squat")).toBeTruthy()
    expect(screen.getByText("+2.5 kg")).toBeTruthy()
  })

  it("says nothing at all when there is nothing to say", () => {
    render(<ReceiptBody summary={summary()} />)
    expect(screen.queryByText(/next time/i)).toBeNull()
    expect(screen.queryByText(/personal bests/i)).toBeNull()
  })
})
