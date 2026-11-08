// @vitest-environment jsdom
/**
 * A LENGTH TYPED INTO THE PC'S RUNNING TIME, WHILE THE OTHER DEVICE STOPS THAT
 * TIMER, ADDS NOTHING (Phase 8 two-devices audit of Plans/toggl-parity.md).
 *
 * "90" typed into the running time means "it started 90 minutes ago". The
 * phone stopped the timer before Enter; the box, with nothing running now,
 * read the 90 as a length to log, its button turned into "Add this time"
 * without a word, and Enter added a new, unnamed 90-minute entry beside the
 * one the phone stopped. Now the length is kept in the box, nothing is
 * written, and a toast says the timer was stopped on the other device.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { draftOf, entrySeconds, runningEntry, startTimer, stopTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const NOW = new Date(2026, 10, 5, 15, 0, 0, 0)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function bar() {
  const initial = startTimer(baseState({ entries: [] }), { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 10, 5, 14, 30).toISOString()).state
  const ctl = { state: initial, other: (() => {}) as (change: (s: TimetrackState) => TimetrackState) => void, toasts: [] as string[] }
  function Harness() {
    const [state, setState] = useState(initial)
    const running = runningEntry(state)
    const [draft, setDraft] = useState<EntryDraft>(() => draftOf(running!))
    ctl.state = state
    ctl.other = (change) => act(() => setState((current) => change(current)))
    const nowSec = epochSeconds(NOW.toISOString())
    return (
      <TimerBar
        state={state}
        setState={(updater) => setState((current) => updater(current))}
        draft={draft}
        setDraft={setDraft}
        mode="timer"
        setMode={() => {}}
        running={running}
        runningSeconds={running ? entrySeconds(running, nowSec) : 0}
        nowSec={nowSec}
        onStart={() => {}}
        onStop={() => {}}
        onEditEntry={() => {}}
        pushToast={(text: string) => {
          ctl.toasts.push(text)
        }}
      />
    )
  }
  render(<Harness />)
  return ctl
}

test("Enter after the phone stopped the timer writes nothing, keeps the 90, and says why", () => {
  const ctl = bar()
  const duration = screen.getAllByLabelText("Duration")[0] as HTMLInputElement
  fireEvent.focus(duration)
  fireEvent.change(duration, { target: { value: "90" } })
  ctl.other((s) => stopTimer(s, new Date(2026, 10, 5, 14, 55).toISOString()).state)

  expect(screen.queryByRole("button", { name: "Add this time" }), "the button turned into Add this time without a word").toBeNull()
  fireEvent.keyDown(duration, { key: "Enter" })

  expect(ctl.state.entries.length, "the 90 became a new entry").toBe(1)
  expect(ctl.state.entries[0].stop, "the phone's stop was changed").toBe(new Date(2026, 10, 5, 14, 55).toISOString())
  expect(duration.value).toBe("90")
  expect(ctl.toasts.some((t) => /stopped on your other device/.test(t)), `no word: ${JSON.stringify(ctl.toasts)}`).toBe(true)
})
