// @vitest-environment jsdom
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
 * The times deliberately do NOT get a debounce. A box reads `""` while it is
 * being retyped, an empty stop means "running" to everything downstream, and a
 * 400ms timer would fire exactly there — turning a finished entry into a
 * running timer mid-edit, which is a defect this slice has already had by
 * another route.
 *
 * The sheet's times were two `datetime-local` boxes when this was written; they
 * are a date, a start, an end and a duration now, and the rule is the same.
 */

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
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
  const box = (label: string) => {
    const input = view.container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
    expect(input, `the sheet has no "${label}" box, so this asserts nothing`).toBeTruthy()
    return input
  }
  return { view, box, pushToast, stored: () => current.entries[0] }
}

const minutesAfter = (iso: string, minutes: number) => new Date(iso).getTime() + minutes * 60_000

describe("leaving the sheet without blurring the field", () => {
  test("a new end time is kept when the sheet is closed with Escape", () => {
    const { view, box, stored } = sheet()
    const before = stored()

    fireEvent.change(box("End time"), { target: { value: "10:30" } })
    view.unmount() // what Escape does: the sheet goes away, no blur

    expect(new Date(stored().stop!).getTime()).toBe(minutesAfter(before.start, 90))
  })

  test("and a start time is kept the same way", () => {
    const { view, box, stored } = sheet()
    const before = stored()

    fireEvent.change(box("Start time"), { target: { value: "08:30" } })
    view.unmount()

    expect(new Date(stored().start).getTime()).toBe(minutesAfter(before.start, -30))
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
  test("a reversed pair cannot be typed in: a start after the end moves the entry instead", () => {
    // An END typed before the start is the next morning now, and a START typed
    // after the end carries the end along (`setEntryStart`), so neither box can
    // produce the pair the database refuses.
    const { box, pushToast, stored } = sheet()
    const before = stored()
    const start = box("Start time")

    fireEvent.change(start, { target: { value: "11:00" } })
    fireEvent.blur(start)

    expect(pushToast).not.toHaveBeenCalled()
    expect(new Date(stored().start).getTime()).toBe(minutesAfter(before.start, 120))
    expect(stored().duration, "the entry kept its length").toBe(before.duration)
  })

  test("clearing the end is refused rather than restarting a finished entry", () => {
    const { box, pushToast, stored } = sheet()
    const before = stored()
    const end = box("End time")

    fireEvent.change(end, { target: { value: "" } })
    fireEvent.blur(end)

    expect(stored().stop).toBe(before.stop)
    expect(pushToast.mock.calls[0]?.[0]).toMatch(/use Continue instead/)
    expect(end.value, "the box kept a value the app had refused").toBe("10:00")
  })

  test("the same is true when the sheet is closed on a refused value", () => {
    const { view, box, stored } = sheet()
    const before = stored()

    fireEvent.change(box("End time"), { target: { value: "" } })
    view.unmount()

    expect(stored().start).toBe(before.start)
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
    const { view, box, stored } = sheet()
    const before = stored()
    const description = view.container.querySelector('input[placeholder="Description"]')!

    fireEvent.change(description, { target: { value: "typed in both" } })
    fireEvent.change(box("End time"), { target: { value: "10:30" } })
    view.unmount()

    expect(stored().description, "the description was dropped by the time commit").toBe("typed in both")
    expect(new Date(stored().stop!).getTime(), "the time was dropped by the description commit").toBe(
      minutesAfter(before.start, 90),
    )
  })
})
