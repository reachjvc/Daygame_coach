// @vitest-environment jsdom
/**
 * WITH NO TIMER RUNNING, A LENGTH TYPED INTO THE TIMER BAR LOGS IT, AS IN TOGGL.
 *
 * Type "2h" and press Enter (or the button, which reads "Add" while a length is
 * typed): a finished two-hour entry ending now, with the description and the
 * project in the bar. The box was locked whenever nothing was running, so the
 * quickest way to record time you have just spent was a trip to manual mode
 * and two clock times worked out by hand.
 */

import { useCallback, useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { liveEntries, runningEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const NOW = at(3, 15, 0)
const NOW_SEC = epochSeconds(NOW)

const typed: EntryDraft = { description: "reading", projectId: "30", taskId: null, tagIds: [], billable: true }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Bar({ latest, pushToast, onStart }: { latest: { current: TimetrackState }; pushToast: () => void; onStart: () => void }) {
  const [state, setState] = useState(latest.current)
  const [draft, setDraft] = useState(typed)
  latest.current = state
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState((c) => updater(c)), [])
  const running = runningEntry(state)
  return (
    <TimerBar
      state={state}
      setState={update}
      draft={draft}
      setDraft={setDraft}
      mode="timer"
      setMode={() => {}}
      running={running}
      runningSeconds={running ? NOW_SEC - epochSeconds(running.start) : 0}
      nowSec={NOW_SEC}
      onStart={onStart}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={pushToast}
    />
  )
}

function mount() {
  const latest = { current: baseState({ entries: [] }) }
  const pushToast = vi.fn()
  const onStart = vi.fn()
  render(<Bar latest={latest} pushToast={pushToast} onStart={onStart} />)
  const box = screen.getByLabelText("Duration") as HTMLInputElement
  return { latest, pushToast, onStart, box }
}

describe("a length typed with no timer running", () => {
  test("the box is open", () => {
    const { box } = mount()
    expect(box.disabled, "the duration box is locked while nothing runs").toBe(false)
  })

  test("2h and Enter logs a finished two-hour entry that ends now, with what the bar holds", () => {
    const { box, latest, onStart } = mount()

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "2h" } })
    fireEvent.keyDown(box, { key: "Enter" })

    const logged = liveEntries(latest.current)
    expect(logged).toHaveLength(1)
    expect(logged[0].stop).toBe(NOW)
    expect(logged[0].start).toBe(at(3, 13, 0))
    expect(logged[0].description).toBe("reading")
    expect(logged[0].projectId).toBe("30")
    expect(runningEntry(latest.current)).toBeNull()
    expect(onStart, "a timer was started as well").not.toHaveBeenCalled()
  })

  test("the button says Add while a length is typed, and pressing it logs the same way", () => {
    const { box, latest, onStart } = mount()

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "45" } })
    fireEvent.blur(box)
    fireEvent.click(screen.getByRole("button", { name: "Add this time" }))

    const logged = liveEntries(latest.current)
    expect(logged).toHaveLength(1)
    expect(logged[0].start).toBe(at(3, 14, 15))
    expect(onStart).not.toHaveBeenCalled()
  })

  test("leaving the box does not log anything by itself", () => {
    const { box, latest } = mount()

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "2h" } })
    fireEvent.blur(box)

    expect(liveEntries(latest.current)).toHaveLength(0)
    expect(box.value, "what you typed was thrown away").toBe("2h")
  })

  test("a length it cannot read says so and logs nothing", () => {
    const { box, latest, pushToast } = mount()

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "lots" } })
    fireEvent.keyDown(box, { key: "Enter" })

    expect(liveEntries(latest.current)).toHaveLength(0)
    expect(pushToast).toHaveBeenCalledWith(expect.stringMatching(/Could not read that duration/), "error")
  })

  test("with nothing typed, the button is Start, as it always was", () => {
    const { onStart } = mount()
    fireEvent.click(screen.getByRole("button", { name: "Start timer" }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
