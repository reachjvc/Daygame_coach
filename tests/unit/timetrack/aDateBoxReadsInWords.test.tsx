// @vitest-environment jsdom
/**
 * A DATE BOX READS IN WORDS, NOT IN THE BROWSER'S NUMBERS.
 *
 * Two first-time users (findability checks, 2026-11-05, Plans/toggl-parity.md
 * Phases 5 and 6) read the date box as "11/04/2026" beside "Yesterday" and 24-hour
 * times: the browser's own date control writes the date its own way, month
 * first on an American browser, whatever the list says. Toggl's box shows the day
 * in words ("Wed, Nov 4"). Ours now shows it the way our day headers do
 * ("Wed, 4 Nov"), and the browser's control still sits on it to pick a day.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import { DayPicker } from "@/src/timetrack/components/primitives"

afterEach(cleanup)

test("the box says the day in words, beside Today or Yesterday", () => {
  render(<DayPicker value="2026-11-04" onChange={() => {}} onStep={() => {}} todayKey="2026-11-05" />)
  expect(screen.getByText("Wed, 4 Nov")).toBeTruthy()
  expect(screen.getByText("Yesterday")).toBeTruthy()
  // the browser's own control is there, but it is not what anybody reads
  expect(screen.getByLabelText("Date").className).toMatch(/opacity-0/)
})

test("a day from another year says the year", () => {
  render(<DayPicker value="2025-12-31" onChange={() => {}} onStep={() => {}} todayKey="2026-11-06" />)
  expect(screen.getByText("Wed, 31 Dec 2025")).toBeTruthy()
})

test("the date control is still there to pick or type a day", () => {
  const onChange = vi.fn()
  render(<DayPicker value="2026-11-04" onChange={onChange} onStep={() => {}} todayKey="2026-11-06" />)
  fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-11-02" } })
  expect(onChange).toHaveBeenCalledWith("2026-11-02")
})
