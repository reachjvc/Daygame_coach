/**
 * A TIME TYPED INTO THE DETAIL SHEET SURVIVES THE WAY PEOPLE LEAVE IT.
 *
 * Reproduced in the product on 2026-09-26: open the sheet on a finished entry,
 * set a new End, press Escape. The sheet closes, the entry keeps its old time,
 * and nothing is said. The description in the same sheet survives the identical
 * gesture, because it commits through `useDebouncedCommit`, which flushes on
 * unmount — the times committed only in `onBlur`, and React does not fire blur
 * on unmount.
 *
 * So one sheet had two rules and the field that mattered had the worse one.
 *
 * The times deliberately do NOT get a debounce. A `datetime-local` reads `""`
 * while a segment is half-typed, an empty stop means "running" to everything
 * downstream, and a 400ms timer would fire exactly there — turning a finished
 * entry into a running timer mid-edit, which is a defect this slice has already
 * had by another route.
 */

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
import { toLocalInputValue } from "@/src/timetrack/timetrackFormatService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

afterEach(cleanup)

function sheet() {
  const state = baseState({ entries: [entry(1, "2026-08-10", "09:00", "10:00", { description: "a real hour" })] })
  let current = state
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  const pushToast = vi.fn()
  const view = render(
    <EntryDetailModalBody entry={state.entries[0]} state={state} setState={setState} pushToast={pushToast} />,
  )
  return { view, pushToast, stored: () => current.entries[0] }
}

/** The value a `datetime-local` holds, `n` minutes after the entry's start. */
function inputValue(startIso: string, minutes: number): string {
  return toLocalInputValue(new Date(new Date(startIso).getTime() + minutes * 60_000).toISOString())
}

describe("leaving the sheet without blurring the field", () => {
  test("a new end time is kept when the sheet is closed with Escape", () => {
    const { view, stored } = sheet()
    const before = stored()
    const end = view.container.querySelectorAll('input[type="datetime-local"]')[1]

    fireEvent.change(end, { target: { value: inputValue(before.start, 90) } })
    view.unmount() // what Escape does: the sheet goes away, no blur

    expect(new Date(stored().stop!).getTime()).toBe(new Date(before.start).getTime() + 90 * 60_000)
  })

  test("and a start time is kept the same way", () => {
    const { view, stored } = sheet()
    const before = stored()
    const start = view.container.querySelectorAll('input[type="datetime-local"]')[0]

    fireEvent.change(start, { target: { value: inputValue(before.start, -30) } })
    view.unmount()

    expect(new Date(stored().start).getTime()).toBe(new Date(before.start).getTime() - 30 * 60_000)
  })

  test("a description typed and abandoned is still kept, as it already was", () => {
    const { view, stored } = sheet()
    const description = view.container.querySelector('input[placeholder="Description"]')!

    fireEvent.change(description, { target: { value: "typed then abandoned" } })
    view.unmount()

    expect(stored().description).toBe("typed then abandoned")
  })
})

describe("a time the app refuses does not linger on screen", () => {
  test("an end before the start is refused, said out loud, and the box goes back", () => {
    const { view, pushToast, stored } = sheet()
    const before = stored()
    const end = view.container.querySelectorAll('input[type="datetime-local"]')[1] as HTMLInputElement

    fireEvent.change(end, { target: { value: inputValue(before.start, -60) } })
    fireEvent.blur(end)

    expect(pushToast).toHaveBeenCalledWith("An entry cannot end before it starts", "error")
    expect(stored().stop).toBe(before.stop)
    expect(end.value, "the box kept a value the app had refused").toBe(toLocalInputValue(before.stop!))
  })

  test("clearing the end is refused rather than restarting a finished entry", () => {
    const { view, pushToast, stored } = sheet()
    const before = stored()
    const end = view.container.querySelectorAll('input[type="datetime-local"]')[1] as HTMLInputElement

    fireEvent.change(end, { target: { value: "" } })
    fireEvent.blur(end)

    expect(stored().stop).toBe(before.stop)
    expect(pushToast.mock.calls[0]?.[0]).toMatch(/use Continue instead/)
  })

  test("the same is true when the sheet is closed on a refused value", () => {
    const { view, stored } = sheet()
    const before = stored()
    const end = view.container.querySelectorAll('input[type="datetime-local"]')[1]

    fireEvent.change(end, { target: { value: inputValue(before.start, -60) } })
    view.unmount()

    expect(stored().stop).toBe(before.stop)
    expect(new Date(stored().stop!).getTime()).toBeGreaterThan(new Date(stored().start).getTime())
  })
})

describe("typing in two fields and leaving", () => {
  test("keeps both, not whichever committed last", () => {
    /**
     * The fix that made times survive Escape moved the loss one field to the
     * left. Both commits compute from `latestState.current`, and on unmount
     * there is no render between the two cleanups — so both read the same
     * snapshot and the second write wins. Cleanup order is declaration order,
     * so the times landed and the description was thrown away: exactly the
     * defect this sheet was repaired for, one field over.
     *
     * No test caught it because none typed BOTH fields before leaving.
     */
    const { view, stored } = sheet()
    const before = stored()
    const description = view.container.querySelector('input[placeholder="Description"]')!
    const end = view.container.querySelectorAll('input[type="datetime-local"]')[1]

    fireEvent.change(description, { target: { value: "typed in both" } })
    fireEvent.change(end, { target: { value: inputValue(before.start, 90) } })
    view.unmount()

    expect(stored().description, "the description was dropped by the time commit").toBe("typed in both")
    expect(new Date(stored().stop!).getTime(), "the time was dropped by the description commit").toBe(
      new Date(before.start).getTime() + 90 * 60_000,
    )
  })
})
