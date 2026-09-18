/**
 * THE ✓ IS THE WHOLE FEATURE, AND IT MUST NOT SAVE A GUESS.
 *
 * In plain terms: ticking a set with the weight box empty used to save it as
 * 0 kg, because `Number("")` is 0. The server accepts 0 — a pull-up with
 * nothing added really is zero — so nothing downstream could ever tell
 * "unweighted" from "forgot to type it", and the zero then hid inside every
 * volume total and every personal best.
 *
 * So the ✓ waits for a weight, EXCEPT on lifts you can honestly do with nothing
 * added. The library decides which those are, from one derived flag.
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SetRow } from "@/src/programs/components/live/SetRow"

const base = {
  setNumber: 1,
  prescribed: { weight: 0, reps: 0 },
  unitLabel: "kg",
  repUnit: "reps" as const,
}

describe("ticking a set", () => {
  it("will not tick a barbell lift with the weight box empty", async () => {
    const user = userEvent.setup()
    const onTick = vi.fn()
    render(<SetRow {...base} onTick={onTick} />)

    await user.type(screen.getByLabelText(/reps for set 1/i), "5")
    const tick = screen.getByTestId("tick-1")
    expect(tick).toBeDisabled()

    // And typing the weight enables it.
    await user.type(screen.getByLabelText(/weight for set 1/i), "100")
    expect(tick).not.toBeDisabled()
    await user.click(tick)
    expect(onTick).toHaveBeenCalledWith(100, 5)
  })

  it("ticks a pull-up with the weight box empty, sending 0", async () => {
    const user = userEvent.setup()
    const onTick = vi.fn()
    render(<SetRow {...base} unweightedOk onTick={onTick} />)

    await user.type(screen.getByLabelText(/reps for set 1/i), "12")
    await user.click(screen.getByTestId("tick-1"))
    // 0 here is a fact — nothing added — not a stand-in for a missing number.
    expect(onTick).toHaveBeenCalledWith(0, 12)
  })

  it("still lets weight be added to a pull-up", async () => {
    const user = userEvent.setup()
    const onTick = vi.fn()
    render(<SetRow {...base} unweightedOk onTick={onTick} />)
    // The box stays, because weighted pull-ups exist, and its placeholder says
    // what the number means.
    const weight = screen.getByLabelText(/weight for set 1/i)
    expect(weight.getAttribute("placeholder")).toBe("+kg")
    await user.type(weight, "20")
    await user.type(screen.getByLabelText(/reps for set 1/i), "5")
    await user.click(screen.getByTestId("tick-1"))
    expect(onTick).toHaveBeenCalledWith(20, 5)
  })

  it("ticks a plank row that has no weight box, sending 0", async () => {
    const user = userEvent.setup()
    const onTick = vi.fn()
    render(<SetRow {...base} bodyweight repUnit="sec" onTick={onTick} />)

    expect(screen.queryByLabelText(/weight for set 1/i)).toBeNull()
    await user.type(screen.getByLabelText(/seconds for set 1/i), "45")
    await user.click(screen.getByTestId("tick-1"))
    expect(onTick).toHaveBeenCalledWith(0, 45)
  })

  it("will not tick with the reps box empty either", async () => {
    const user = userEvent.setup()
    render(<SetRow {...base} onTick={vi.fn()} />)
    await user.type(screen.getByLabelText(/weight for set 1/i), "100")
    expect(screen.getByTestId("tick-1")).toBeDisabled()
  })

  it("refuses a weight past the limit on the row, naming the limit", async () => {
    // The server bounds this too, but its 400 arrives after the tick has gone
    // green and the rest clock has started.
    const user = userEvent.setup()
    const onTick = vi.fn()
    render(<SetRow {...base} onTick={onTick} />)
    await user.type(screen.getByLabelText(/weight for set 1/i), "5000")
    await user.type(screen.getByLabelText(/reps for set 1/i), "5")
    expect(screen.getByTestId("tick-1")).toBeDisabled()
    expect(screen.getByText(/between 0 and 999.99 kg/i)).toBeTruthy()
  })

  it("a set already ticked can still be undone", async () => {
    // The ✓ doubles as undo, and the bounds rule must not trap somebody on a
    // row they have already saved.
    const user = userEvent.setup()
    const onUndo = vi.fn()
    render(
      <SetRow
        {...base}
        done={{
          id: "s1",
          exerciseId: "squat",
          exercise: "Squat",
          weight: 100,
          weightKg: 100,
          reps: 5,
          setNumber: 1,
          kind: "working",
          prescribedIndex: 0,
          completedAt: null,
          rpe: null,
          side: null,
        }}
        onTick={vi.fn()}
        onUndo={onUndo}
      />
    )
    await user.click(screen.getByTestId("tick-1"))
    expect(onUndo).toHaveBeenCalled()
  })
})
