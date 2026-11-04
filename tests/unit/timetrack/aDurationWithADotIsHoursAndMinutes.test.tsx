// @vitest-environment jsdom
/**
 * "1.30" AND "1,30" ARE AN HOUR AND A HALF, NOT 1:18.
 *
 * The phone opens the decimal pad for a duration (plan D11), which has no ":"
 * key, and a Dane writes half past one as 1.30. Both were read as 1.3 hours —
 * 1:18 — with nothing said. Found by the edits audit on 2026-11-04.
 *
 * THE RULE: a "." or "," followed by exactly two digits whose value is under 60
 * is hours and minutes (1.30 = 1:30, 0,45 = 0:45). Anything else after the
 * separator is a decimal hour, as before (1.5 = 1:30, 1.75 = 1:45).
 *
 * Also here, because they are the same boxes misreading what was typed: an end
 * typed as "-5" became 17:00 and "12345" became 12:34, both silently, and a
 * length of 0 with no timer running was "Could not read that duration".
 */

import { useCallback, useState } from "react"
import { cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds, parseDurationInput, parseEndTimeInput, parseTimeInput } from "@/src/timetrack/timetrackFormatService"
import { liveEntries, runningEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m, 0, 0).toISOString()
const NOW = at(12, 0)
const NOW_SEC = epochSeconds(NOW)

describe("reading a duration with a dot or a comma", () => {
  test("two digits under 60 are minutes", () => {
    expect(parseDurationInput("1.30")).toBe(5400)
    expect(parseDurationInput("1,30")).toBe(5400)
    expect(parseDurationInput("0,45")).toBe(2700)
    expect(parseDurationInput("2.05")).toBe(2 * 3600 + 5 * 60)
    expect(parseDurationInput("1.00")).toBe(3600)
  })

  test("one digit is a decimal hour", () => {
    expect(parseDurationInput("1.5")).toBe(5400)
    expect(parseDurationInput("0,5")).toBe(1800)
  })

  test("two digits of 60 or more, or three digits, are a decimal hour", () => {
    expect(parseDurationInput("1.75")).toBe(6300)
    expect(parseDurationInput("0.125")).toBe(450)
  })
})

describe("a typed time it cannot read is refused, not guessed", () => {
  test("a minus sign is not a time", () => {
    expect(parseEndTimeInput("-5", at(10, 0))).toBeNull()
    expect(parseTimeInput("-5", "2026-11-04")).toBeNull()
  })

  test("five digits are not a time", () => {
    expect(parseEndTimeInput("12345", at(10, 0))).toBeNull()
  })

  test("the forms that are times still are", () => {
    expect(parseEndTimeInput("1155", at(10, 0))).toBe(at(11, 55))
    expect(parseEndTimeInput("9.30", at(8, 0))).toBe(at(9, 30))
    expect(parseEndTimeInput("4:30 pm", at(10, 0))).toBe(at(16, 30))
  })
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("the detail sheet", () => {
  function sheet() {
    const initial = baseState({ entries: [entry(1, "2026-11-04", "08:00", "09:00")] })
    let current = initial
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const view = render(
      <EntryDetailModalBody entry={initial.entries[0]} state={initial} setState={setState} pushToast={vi.fn()} nowSec={NOW_SEC} />,
    )
    const box = view.container.querySelector('input[aria-label="Duration"]') as HTMLInputElement
    return { view, box, stored: () => current.entries[0] }
  }

  test("1,30 is written as an hour and a half", () => {
    const { box, stored } = sheet()
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1,30" } })
    fireEvent.blur(box)

    expect(stored().duration).toBe(5400)
  })

  test("the hint under the boxes teaches the rule", () => {
    const { view } = sheet()
    expect(view.container.textContent).toContain("1.30 = 1 h 30")
  })

  test("while typing, the hint says what the box will read it as", () => {
    const { view, box } = sheet()
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1.30" } })

    expect(view.container.textContent).toContain("1.30 = 1 hour 30 minutes")
  })
})

describe("the timer bar with no timer running", () => {
  const draft: EntryDraft = { description: "", projectId: null, taskId: null, tagIds: [], billable: false }

  function Bar({ latest, pushToast }: { latest: { current: TimetrackState }; pushToast: () => void }) {
    const [state, setState] = useState(latest.current)
    latest.current = state
    const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState((c) => updater(c)), [])
    const running = runningEntry(state)
    return (
      <TimerBar
        state={state}
        setState={update}
        draft={draft}
        setDraft={() => {}}
        mode="timer"
        setMode={() => {}}
        running={running}
        runningSeconds={0}
        nowSec={NOW_SEC}
        onStart={() => {}}
        onStop={() => {}}
        onEditEntry={() => {}}
        pushToast={pushToast}
      />
    )
  }

  test("a length of 0 says plainly why nothing was added", () => {
    const latest = { current: baseState({ entries: [] }) }
    const pushToast = vi.fn()
    const view = render(<Bar latest={latest} pushToast={pushToast} />)
    const box = view.container.querySelector('input[aria-label="Duration"]') as HTMLInputElement

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "0" } })
    fireEvent.keyDown(box, { key: "Enter" })

    expect(liveEntries(latest.current)).toHaveLength(0)
    const [text] = pushToast.mock.calls[0] as [string]
    expect(text).not.toMatch(/Could not read/)
    expect(text).toMatch(/0 minutes/)
  })
})
