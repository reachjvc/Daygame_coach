// @vitest-environment jsdom
/**
 * MANUAL MODE OPENS AT THE GAP YOU ARE MOST LIKELY FILLING.
 *
 * It always opened at 09:00–10:00, whatever the time was, so every hand-added
 * entry began with two clock times retyped. Now it opens at "where the last
 * entry ended → now" when that was earlier today, and at "half an hour ago →
 * now" otherwise. Your data shows why the first one matters: you track whole
 * days back to back, so the time you forgot is almost always the gap after the
 * last thing you tracked.
 */

import { useCallback, useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TimerBar, type TimerMode } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { runningEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const NOW = at(3, 14, 20)
const NOW_SEC = epochSeconds(NOW)

const draft: EntryDraft = { description: "", projectId: null, taskId: null, tagIds: [], billable: false }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Bar({ initial, startMode }: { initial: TimetrackState; startMode: TimerMode }) {
  const [state, setState] = useState(initial)
  const [mode, setMode] = useState<TimerMode>(startMode)
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState((c) => updater(c)), [])
  const running = runningEntry(state)
  return (
    <TimerBar
      state={state}
      setState={update}
      draft={draft}
      setDraft={() => {}}
      mode={mode}
      setMode={setMode}
      running={running}
      runningSeconds={running ? NOW_SEC - epochSeconds(running.start) : 0}
      nowSec={NOW_SEC}
      onStart={() => {}}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={vi.fn()}
    />
  )
}

const boxes = () => ({
  start: (screen.getByLabelText("Start time") as HTMLInputElement).value,
  end: (screen.getByLabelText("End time") as HTMLInputElement).value,
})

describe("switching to manual mode", () => {
  test("opens at the end of today's last entry, up to now", () => {
    render(<Bar initial={baseState({ entries: [entry(1, "2026-11-03", "09:00", "13:05")] })} startMode="timer" />)

    fireEvent.click(screen.getByRole("button", { name: "Toggle timer or manual mode" }))

    expect(boxes()).toEqual({ start: "13:05", end: "14:20" })
  })

  test("with nothing tracked today, opens at half an hour ago", () => {
    render(<Bar initial={baseState({ entries: [entry(1, "2026-11-02", "09:00", "17:00")] })} startMode="timer" />)

    fireEvent.click(screen.getByRole("button", { name: "Toggle timer or manual mode" }))

    expect(boxes()).toEqual({ start: "13:50", end: "14:20" })
  })

  test("a planned entry later today is not where you left off", () => {
    const entries = [entry(1, "2026-11-03", "09:00", "12:40"), entry(2, "2026-11-03", "16:00", "17:00")]
    render(<Bar initial={baseState({ entries })} startMode="timer" />)

    fireEvent.click(screen.getByRole("button", { name: "Toggle timer or manual mode" }))

    expect(boxes()).toEqual({ start: "12:40", end: "14:20" })
  })

  test("and the same when the bar is first shown in manual mode", () => {
    render(<Bar initial={baseState({ entries: [entry(1, "2026-11-03", "09:00", "13:05")] })} startMode="manual" />)

    expect(boxes()).toEqual({ start: "13:05", end: "14:20" })
  })
})
