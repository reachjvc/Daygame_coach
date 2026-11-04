// @vitest-environment jsdom
/**
 * THE PICKER HAS A PLACE FOR THE DRUMS (Phase 4 item 1, ready for Phase 5).
 *
 * Phase 5 adds the owner's pick, scrolling [day][hour][minute] drums, to this
 * same picker, beside the typed box, the chips and the ± buttons — not in a
 * second picker that would have to agree with this one. So the picker takes
 * them as a slot: they are handed the moment and a way to set it, and every
 * other control follows whatever they set.
 */

import { useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"

import { MomentPicker } from "@/src/timetrack/components/MomentPicker"

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m, 0, 0).toISOString()

afterEach(cleanup)

function Harness() {
  const [value, setValue] = useState(at(14, 30))
  return (
    <MomentPicker
      value={value}
      onChange={setValue}
      earliest={at(9, 0)}
      latest={at(14, 30)}
      chips={[]}
      timeFormat="h24"
      drums={(control) => (
        <button type="button" onClick={() => control.set(at(11, 55))}>
          drums at {control.value === at(14, 30) ? "now" : "something else"}, from {control.earliest === at(9, 0) ? "the start" : "?"}
        </button>
      )}
    />
  )
}

test("drums are handed the moment and its bounds, and what they set is what the box shows", () => {
  render(<Harness />)
  expect(screen.getByRole("button", { name: "drums at now, from the start" })).toBeInTheDocument()

  fireEvent.click(screen.getByRole("button", { name: /^drums at/ }))

  expect((screen.getByLabelText("Time") as HTMLInputElement).value).toBe("11:55")
  expect(screen.getByRole("button", { name: "drums at something else, from the start" })).toBeInTheDocument()
})
