// @vitest-environment jsdom
/**
 * EVERY TAP ON A VISIBLE UNDO EITHER UNDOES OR SAYS "TOO LATE" (alpha
 * p10-deletes-01).
 *
 * iPhone, busy page: the finger touched Undo 20-50 ms after the delete's time,
 * while the bar was still drawn. The bar went at that instant, before the
 * finger lifted, so no click ever came: the bar vanished under the finger, no
 * "Too late to undo", and the answer was deleted. The touch is now recorded on
 * pointerdown and answered on the lift, even when the bar went in between.
 *
 * A scroll that starts on the bar is not a tap (code review): a press that
 * moves 10 px or more, or that the browser takes over (pointercancel), does
 * not undo.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { UndoButton } from "@/src/audit/components/UndoButton"

afterEach(cleanup)

describe("the Undo button on the Deleted bar", () => {
  test("a touch on the bar removed before the finger lifts is still answered on the lift", () => {
    const onUndo = vi.fn()
    const { rerender } = render(<UndoButton onUndo={onUndo} />)
    fireEvent.pointerDown(screen.getByRole("button", { name: "Undo" }), { clientX: 100, clientY: 200 })
    // the bar's time ends now: it is removed before pointerup, so no click follows
    rerender(<></>)
    fireEvent.pointerUp(window, { clientX: 102, clientY: 201 })
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  test("a touch and the click that follows it undo once, not twice", () => {
    const onUndo = vi.fn()
    render(<UndoButton onUndo={onUndo} />)
    const button = screen.getByRole("button", { name: "Undo" })
    fireEvent.pointerDown(button, { clientX: 100, clientY: 200 })
    fireEvent.pointerUp(button, { clientX: 100, clientY: 200 })
    fireEvent.click(button)
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  test("a scroll that starts on the bar does not undo", () => {
    const onUndo = vi.fn()
    render(<UndoButton onUndo={onUndo} />)
    const button = screen.getByRole("button", { name: "Undo" })
    fireEvent.pointerDown(button, { clientX: 100, clientY: 200 })
    fireEvent.pointerMove(window, { clientX: 100, clientY: 230 })
    fireEvent.pointerUp(window, { clientX: 100, clientY: 260 })
    fireEvent.click(button)
    expect(onUndo).not.toHaveBeenCalled()
  })

  test("a press the browser takes over for scrolling (pointercancel) does not undo", () => {
    const onUndo = vi.fn()
    render(<UndoButton onUndo={onUndo} />)
    const button = screen.getByRole("button", { name: "Undo" })
    fireEvent.pointerDown(button, { clientX: 100, clientY: 200 })
    fireEvent.pointerCancel(window, { clientX: 100, clientY: 200 })
    fireEvent.pointerUp(window, { clientX: 100, clientY: 200 })
    expect(onUndo).not.toHaveBeenCalled()
  })

  test("the keyboard (a click with no touch) still undoes", () => {
    const onUndo = vi.fn()
    render(<UndoButton onUndo={onUndo} />)
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })
})
