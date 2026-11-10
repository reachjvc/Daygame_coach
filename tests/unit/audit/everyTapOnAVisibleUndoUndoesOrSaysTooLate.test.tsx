// @vitest-environment jsdom
/**
 * EVERY TAP ON A VISIBLE UNDO EITHER UNDOES OR SAYS "TOO LATE" (alpha
 * p10-deletes-01).
 *
 * iPhone, busy page: the finger touched Undo 20-50 ms after the delete's time,
 * while the bar was still drawn. The bar went at that instant, before the
 * finger lifted, so no click ever came: the bar vanished under the finger, no
 * "Too late to undo", and the answer was deleted. The touch itself (pointerdown)
 * now acts, while the bar is there to receive it.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { UndoButton } from "@/src/audit/components/UndoButton"

afterEach(cleanup)

describe("the Undo button on the Deleted bar", () => {
  test("the touch acts at once: a bar removed before the finger lifts has still been answered", () => {
    const onUndo = vi.fn()
    const { rerender } = render(<UndoButton onUndo={onUndo} />)
    fireEvent.pointerDown(screen.getByRole("button", { name: "Undo" }))
    // the bar's time ends now: it is removed before pointerup, so no click follows
    rerender(<></>)
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  test("a touch and the click that follows it undo once, not twice", () => {
    const onUndo = vi.fn()
    render(<UndoButton onUndo={onUndo} />)
    const button = screen.getByRole("button", { name: "Undo" })
    fireEvent.pointerDown(button)
    fireEvent.click(button)
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  test("the keyboard (a click with no touch) still undoes", () => {
    const onUndo = vi.fn()
    render(<UndoButton onUndo={onUndo} />)
    fireEvent.click(screen.getByRole("button", { name: "Undo" }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })
})
