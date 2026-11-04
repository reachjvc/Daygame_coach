// @vitest-environment jsdom
/**
 * THE RUNNING BAR SAYS "STARTED 09:00 · STOP AT…" (Phase 4, items 2 and 7).
 *
 * A running timer's end box lived in the detail sheet, behind "Change times",
 * so ending a forgotten timer where the work ended was a trip to another
 * screen and a typed time in a box the phone showed the letter keyboard for.
 * Stop at… sits beside the start now and opens the same picker Switched at…
 * uses, with no next entry.
 */

import { useCallback, useState } from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { draftOf, emptyDraft, liveEntries, runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 14, 30)

type Latest = { current: TimetrackState }

function Bar({ initial, latest, pushToast }: { initial: TimetrackState; latest: Latest; pushToast: () => void }) {
  const [state, setState] = useState(initial)
  latest.current = state
  const running = runningEntry(state)
  const [draft, setDraft] = useState(running ? draftOf(running) : emptyDraft)
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState((current) => updater(current)), [])
  const nowSec = epochSeconds(NOW)
  return (
    <TimerBar
      state={state}
      setState={update}
      draft={draft}
      setDraft={setDraft}
      mode="timer"
      setMode={() => {}}
      running={running}
      runningSeconds={running ? nowSec - epochSeconds(running.start) : 0}
      nowSec={nowSec}
      onStart={() => {}}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={pushToast}
    />
  )
}

function open() {
  const initial = startTimer(baseState(), { ...emptyDraft, description: "Deep work" }, at(4, 9, 0)).state
  const latest: Latest = { current: initial }
  const pushToast = vi.fn()
  render(<Bar initial={initial} latest={latest} pushToast={pushToast} />)
  return { latest, pushToast }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("the running timer bar", () => {
  test("says when it started, with Stop at… beside it", () => {
    open()
    expect(screen.getByText(/Started at 09:00/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Stop at…" })).toBeInTheDocument()
  })

  test("Stop at… 11:55 ends the timer at 11:55:00 and starts nothing, with an Undo", () => {
    const { latest, pushToast } = open()

    fireEvent.click(screen.getByRole("button", { name: "Stop at…" }))
    const picker = within(screen.getByRole("dialog", { name: "Stopped at…" }))
    expect(picker.queryByLabelText("Switched to"), "Stopped at… asked for a next entry").toBeNull()
    const box = picker.getByLabelText("Time")
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1155" } })
    fireEvent.blur(box)
    fireEvent.click(picker.getByRole("button", { name: "Stop at 11:55" }))

    expect(runningEntry(latest.current)).toBeNull()
    expect(liveEntries(latest.current)).toHaveLength(1)
    expect(latest.current.entries[0].stop).toBe(at(4, 11, 55))
    expect(pushToast).toHaveBeenCalledWith("Stopped “Deep work” at 11:55", "info", expect.any(Function))

    const undo = pushToast.mock.calls.at(-1)![2] as () => void
    act(() => undo())
    expect(runningEntry(latest.current)?.start).toBe(at(4, 9, 0))
  })

  test("Stop at… has the drums (Phase 5): two hours back on the hour drum is 12:30, and after now is refused in words", () => {
    const { latest } = open()
    fireEvent.click(screen.getByRole("button", { name: "Stop at…" }))
    const picker = within(screen.getByRole("dialog", { name: "Stopped at…" }))
    const hour = picker.getByRole("listbox", { name: "Hour" })

    fireEvent.keyDown(hour, { key: "ArrowDown" })
    expect(picker.getByRole("status")).toHaveTextContent("That has not happened yet")

    fireEvent.keyDown(hour, { key: "ArrowUp" })
    fireEvent.keyDown(hour, { key: "ArrowUp" })
    expect(picker.queryByRole("status")).toBeNull()
    fireEvent.click(picker.getByRole("button", { name: "Stop at 12:30" }))

    expect(latest.current.entries[0].stop).toBe(at(4, 12, 30))
  })

  test("Stopped at… is in the ⋮ menu as well", () => {
    open()
    fireEvent.click(screen.getByRole("button", { name: "More timer actions" }))
    fireEvent.click(screen.getByRole("button", { name: "Stopped at…" }))

    expect(screen.getByRole("dialog", { name: "Stopped at…" })).toBeInTheDocument()
  })
})
