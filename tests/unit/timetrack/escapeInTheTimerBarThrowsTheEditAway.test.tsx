// @vitest-environment jsdom
/**
 * ESCAPE IN THE TIMER BAR'S DURATION BOX THROWS THE EDIT AWAY, WHETHER OR NOT A TIMER RUNS.
 *
 * It did only while nothing ran. With a timer running, Escape left "1:00" in
 * the box, and the next click anywhere on the page committed it: a two-hour
 * timer ended at one hour. The entry row's own boxes have always treated Escape
 * as "never mind" (`enterCommitsEscapeDiscards.test.tsx`). Found by the edits
 * audit on 2026-11-04, on the PC and on the phone.
 */

import { useCallback, useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds, formatClock } from "@/src/timetrack/timetrackFormatService"
import { runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m, 0, 0).toISOString()
const NOW = at(14, 0)
const NOW_SEC = epochSeconds(NOW)
const START = at(12, 0)

const draft: EntryDraft = { description: "running", projectId: null, taskId: null, tagIds: [], billable: false }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

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
      runningSeconds={running ? NOW_SEC - epochSeconds(running.start) : 0}
      nowSec={NOW_SEC}
      onStart={() => {}}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={pushToast}
    />
  )
}

describe("Escape in the duration box with a timer running", () => {
  test("then a click elsewhere leaves the timer running from where it started", () => {
    const latest = { current: startTimer(baseState({ entries: [] }), draft, START).state }
    const pushToast = vi.fn()
    render(<Bar latest={latest} pushToast={pushToast} />)
    const box = screen.getByLabelText("Duration") as HTMLInputElement

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1:00" } })
    fireEvent.keyDown(box, { key: "Escape" })
    // the click somewhere neutral that used to commit it
    fireEvent.blur(box)

    const now = runningEntry(latest.current)
    expect(now, "Escape then a click ended the timer").not.toBeNull()
    expect(now!.start).toBe(START)
    expect(pushToast).not.toHaveBeenCalled()
  })

  test("puts the running clock back in the box", () => {
    const latest = { current: startTimer(baseState({ entries: [] }), draft, START).state }
    render(<Bar latest={latest} pushToast={vi.fn()} />)
    const box = screen.getByLabelText("Duration") as HTMLInputElement

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1:00" } })
    fireEvent.keyDown(box, { key: "Escape" })

    expect(box.value).toBe(formatClock(2 * 3600))
  })

  test("Enter still writes what was typed", () => {
    const latest = { current: startTimer(baseState({ entries: [] }), draft, START).state }
    render(<Bar latest={latest} pushToast={vi.fn()} />)
    const box = screen.getByLabelText("Duration") as HTMLInputElement

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "3:00" } })
    // Enter commits through the blur, as the bar does
    fireEvent.keyDown(box, { key: "Enter" })
    fireEvent.blur(box)

    expect(runningEntry(latest.current)!.start).toBe(at(11, 0))
  })
})
