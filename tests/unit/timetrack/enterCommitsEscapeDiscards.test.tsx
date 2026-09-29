/**
 * ENTER COMMITS AND ESCAPE THROWS AWAY, ON ALL FOUR INLINE FIELDS OF A ROW.
 *
 * The three time fields committed on blur and on nothing else, so typing a new end time
 * and pressing Enter left the row looking edited while nothing had been written, and
 * Escape KEPT the change instead of cancelling it. The detail sheet's fields next door
 * already commit on the way out; these are the ones a person actually types into.
 *
 * Round 13's code reviewer then pointed out the obvious gap: the fix was verified in a
 * browser and by nothing else, so a regression would be silent. And the description
 * field beside the three was left on the old rule, which meant one row had two
 * behaviours for Escape — invisible until it costs you something.
 *
 * The keys work by BLURRING and letting the single blur handler write. Committing in
 * the key handler and then blurring writes twice: React has not re-rendered by the time
 * blur fires, so the blur closure still holds the old draft. That is why Escape parks a
 * flag the blur handler reads, and why the last test here drives Escape and then a real
 * edit — a flag left set would silently eat the next legitimate commit.
 */

import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

afterEach(cleanup)

function list() {
  const initial = baseState({
    entries: [entry(1, "2026-08-10", "09:00", "11:00", { description: "morning work" })],
  })
  let current = initial
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  const nowSec = Math.floor(new Date(2026, 7, 10, 18, 0, 0).getTime() / 1000)
  const view = render(
    <EntryList state={initial} setState={setState} nowSec={nowSec} pushToast={vi.fn()} onEditEntry={vi.fn()} />,
  )
  const field = (label: string) => {
    const input = view.container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
    expect(input, `the inline "${label}" field was not rendered, so this asserts nothing`).toBeTruthy()
    return input
  }
  return { view, field, stored: () => current.entries[0] }
}

describe("the inline start time", () => {
  test("Enter commits the edit, WITHOUT the test blurring for it", () => {
    /**
     * No `fireEvent.blur` here on purpose. The first version of this test fired one
     * after the Enter, which made it pass with no Enter handling at all — the blur was
     * doing the work and the test was named for the key. It focuses the field so that
     * Enter's own `.blur()` produces a real blur event, and asserts nothing else.
     */
    const { field, stored } = list()
    const start = field("Start time")
    start.focus()
    fireEvent.change(start, { target: { value: "10:30" } })
    fireEvent.keyDown(start, { key: "Enter" })
    expect(new Date(stored().start).getHours()).toBe(10)
    expect(new Date(stored().start).getMinutes()).toBe(30)
  })

  test("Escape throws it away", () => {
    const { field, stored } = list()
    const before = stored().start
    const start = field("Start time")
    fireEvent.change(start, { target: { value: "03:15" } })
    fireEvent.keyDown(start, { key: "Escape" })
    fireEvent.blur(start)
    expect(stored().start).toBe(before)
  })

  test("and Enter does not write the same edit twice", () => {
    /**
     * Enter blurs and lets the blur handler write. If it ALSO wrote in the key handler,
     * the blur closure — which React has not re-rendered yet — would write the stale
     * draft a second time. Counted rather than reasoned about.
     */
    const initial = baseState({ entries: [entry(1, "2026-08-10", "09:00", "11:00")] })
    let current = initial
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const view = render(
      <EntryList
        state={initial}
        setState={setState}
        nowSec={Math.floor(new Date(2026, 7, 10, 18, 0, 0).getTime() / 1000)}
        pushToast={vi.fn()}
        onEditEntry={vi.fn()}
      />,
    )
    const start = view.container.querySelector('input[aria-label="Start time"]') as HTMLInputElement
    start.focus()
    fireEvent.change(start, { target: { value: "10:30" } })
    setState.mockClear()
    fireEvent.keyDown(start, { key: "Enter" })
    expect(setState.mock.calls.length, "the edit was written more than once").toBe(1)
  })
})

describe("every inline field of the row agrees about Escape", () => {
  /**
   * One row, one rule. The description was left committing on blur only while the three
   * time fields discarded on Escape, so the same gesture did opposite things depending
   * on which box the cursor happened to be in.
   */
  for (const [label, typed] of [
    ["Start time", "03:15"],
    ["End time", "23:45"],
    ["Duration", "7:00"],
  ] as const) {
    test(`${label} discards on Escape`, () => {
      const { field, stored } = list()
      const before = JSON.stringify({ start: stored().start, stop: stored().stop, duration: stored().duration })
      const input = field(label)
      fireEvent.change(input, { target: { value: typed } })
      fireEvent.keyDown(input, { key: "Escape" })
      fireEvent.blur(input)
      expect(JSON.stringify({ start: stored().start, stop: stored().stop, duration: stored().duration })).toBe(before)
    })
  }

  test("and so does the description, which used to keep it", () => {
    const { view, stored } = list()
    const description = view.container.querySelector('input[value="morning work"]') as HTMLInputElement
    expect(description, "the inline description was not rendered, so this asserts nothing").toBeTruthy()
    fireEvent.change(description, { target: { value: "something else entirely" } })
    fireEvent.keyDown(description, { key: "Escape" })
    fireEvent.blur(description)
    expect(stored().description).toBe("morning work")
  })
})

describe("the discard flag", () => {
  test("does not eat the next legitimate commit", () => {
    /**
     * One `discarding` ref is shared by the fields on the premise that only one holds
     * focus. If Escape ever left it set, the NEXT edit would be silently thrown away —
     * which is the shape of half-fix this review has caught twice.
     */
    const { field, stored } = list()
    const start = field("Start time")
    fireEvent.change(start, { target: { value: "03:15" } })
    fireEvent.keyDown(start, { key: "Escape" })
    fireEvent.blur(start)

    fireEvent.change(start, { target: { value: "10:30" } })
    fireEvent.blur(start)
    expect(new Date(stored().start).getHours(), "the edit after an Escape was swallowed").toBe(10)
  })
})
