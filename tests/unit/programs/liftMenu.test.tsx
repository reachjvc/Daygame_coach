/**
 * EVERYTHING YOU CAN DO TO ONE LIFT, MID-WORKOUT.
 *
 * There was one 26px chip reading "Skip this one" and a read-only line saying
 * how long to rest. The two things that actually happen in a gym — the rack
 * is taken so you do something else, and this lift needs longer today — had
 * no answer at all, and the one control that existed was smaller than a
 * fingertip.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LiftMenu } from "@/src/programs/components/live/LiftMenu"
import type { PrescribedExercise, WorkoutAdjustments } from "@/src/programs/types"

const squat: PrescribedExercise = {
  exerciseId: "squat",
  name: "Squat",
  sets: [{ setNumber: 1, weight: 100, reps: 5 }],
  restSec: 180,
} as PrescribedExercise

function menu(
  over: {
    adjustments?: WorkoutAdjustments
    wasAdded?: boolean
    skipped?: boolean
    position?: { index: number; count: number }
  } = {}
) {
  const onAdjust = vi.fn()
  const onClose = vi.fn()
  const onAddWarmup = vi.fn()
  const onMove = vi.fn()
  const onHistory = vi.fn()
  render(
    <LiftMenu
      open
      onClose={onClose}
      exercise={squat}
      adjustments={over.adjustments ?? {}}
      alreadyHere={["Squat", "Bench Press"]}
      wasAdded={over.wasAdded ?? false}
      skipped={over.skipped ?? false}
      position={over.position ?? { index: 1, count: 3 }}
      onAdjust={onAdjust}
      onAddWarmup={onAddWarmup}
      onMove={onMove}
      onHistory={onHistory}
    />
  )
  return { onAdjust, onClose, onAddWarmup, onMove, onHistory }
}

afterEach(() => vi.restoreAllMocks())

describe("the rest row", () => {
  it("shows the program's own rest, and says whose it is", () => {
    menu()
    expect(screen.getByTestId("rest-target").textContent).toBe("3:00")
    expect(screen.getByText("the program's")).toBeTruthy()
  })

  it("two quick taps read 3:30, not 3:15", async () => {
    /**
     * The draft is the truth until the write lands. Reading the saved value
     * between taps means the second tap starts from the number the first one
     * has not finished saving.
     */
    const user = userEvent.setup()
    menu()
    await user.click(screen.getByTestId("rest-more"))
    await user.click(screen.getByTestId("rest-more"))
    expect(screen.getByTestId("rest-target").textContent).toBe("3:30")
  })

  it("writes once, when the sheet closes", async () => {
    const user = userEvent.setup()
    const { onAdjust } = menu()

    await user.click(screen.getByTestId("rest-more"))
    await user.click(screen.getByTestId("rest-more"))
    // Nothing written yet: a PATCH per tap is three writes for one decision.
    expect(onAdjust).not.toHaveBeenCalled()

    await user.keyboard("{Escape}")
    expect(onAdjust).toHaveBeenCalledOnce()
    expect(onAdjust.mock.calls[0][0]).toEqual({ rest: { squat: 210 } })
  })

  it("writes nothing when the number was not changed", async () => {
    const user = userEvent.setup()
    const { onAdjust } = menu()
    await user.keyboard("{Escape}")
    expect(onAdjust).not.toHaveBeenCalled()
  })

  it("keeps another lift's rest when it writes", async () => {
    const user = userEvent.setup()
    const { onAdjust } = menu({ adjustments: { rest: { bench: 90 } } })
    await user.click(screen.getByTestId("rest-less"))
    await user.keyboard("{Escape}")
    expect(onAdjust.mock.calls[0][0].rest).toEqual({ bench: 90, squat: 165 })
  })

  it("says the rest is yours once you have set one", () => {
    menu({ adjustments: { rest: { squat: 150 } } })
    expect(screen.getByTestId("rest-target").textContent).toBe("2:30")
    expect(screen.getByText("your own")).toBeTruthy()
  })
})

describe("skipping and removing", () => {
  it("skips a prescribed lift, and offers no way to remove it", async () => {
    const user = userEvent.setup()
    const { onAdjust } = menu()
    // A prescribed lift is SKIPPED, which the program records. Removing it
    // would lose the fact that it was asked for.
    expect(screen.queryByTestId("lift-remove")).toBeNull()

    await user.click(screen.getByTestId("lift-skip"))
    expect(onAdjust).toHaveBeenCalledWith({ skipped: ["squat"] })
  })

  it("un-skips one that is already skipped", async () => {
    const user = userEvent.setup()
    const { onAdjust } = menu({ skipped: true, adjustments: { skipped: ["squat", "bench"] } })
    await user.click(screen.getByTestId("lift-skip"))
    expect(onAdjust).toHaveBeenCalledWith({ skipped: ["bench"] })
  })

  it("removes a lift you added yourself", async () => {
    const user = userEvent.setup()
    const { onAdjust } = menu({
      wasAdded: true,
      adjustments: { added: [{ exerciseId: "squat", name: "Squat" }, { exerciseId: "curl", name: "Curl" }] },
    })
    await user.click(screen.getByTestId("lift-remove"))
    expect(onAdjust).toHaveBeenCalledWith({ added: [{ exerciseId: "curl", name: "Curl" }] })
  })
})

describe("swapping a lift", () => {
  it("opens the same search that adding a lift uses", async () => {
    const user = userEvent.setup()
    menu()
    await user.click(screen.getByTestId("lift-swap"))
    // One list of what this app knows a lift is, not a second that drifts.
    expect(screen.getByTestId("add-lift")).toBeTruthy()
  })
})

/**
 * THE THREE ROWS THAT WERE IN THE DESIGN AND NOT IN THE SHEET.
 *
 * "Swap this lift" answers a busy rack by doing something else. The other
 * answer is coming back to it later, and there was no row for that at all —
 * `adjustments.order` was written by nothing and read by nothing, so a session
 * done in a different order was recorded in the program's order.
 */
describe("moving, warming up, and looking back", () => {
  it("moves one place, and the caller is handed the whole order", async () => {
    const user = userEvent.setup()
    const { onMove, onClose } = menu()
    await user.click(screen.getByTestId("lift-move-up"))
    expect(onMove).toHaveBeenCalledWith(-1)
    // And the sheet closes, so the result is visible behind it.
    expect(onClose).toHaveBeenCalled()
  })

  it("is off at the ends rather than being a button that does nothing", () => {
    const first = menu({ position: { index: 0, count: 3 } })
    expect(screen.getByTestId("lift-move-up")).toBeDisabled()
    expect(screen.getByTestId("lift-move-down")).not.toBeDisabled()
    expect(first.onMove).not.toHaveBeenCalled()
  })

  it("is off at the bottom too", () => {
    menu({ position: { index: 2, count: 3 } })
    expect(screen.getByTestId("lift-move-down")).toBeDisabled()
  })

  it("adds a warm-up row", async () => {
    const user = userEvent.setup()
    const { onAddWarmup } = menu()
    await user.click(screen.getByTestId("lift-add-warmup"))
    expect(onAddWarmup).toHaveBeenCalled()
  })

  it("opens the lift's last times, named after the lift", async () => {
    const user = userEvent.setup()
    const { onHistory } = menu()
    const row = screen.getByTestId("lift-history")
    expect(row.textContent).toBe("Last times for Squat")
    await user.click(row)
    expect(onHistory).toHaveBeenCalled()
  })
})
