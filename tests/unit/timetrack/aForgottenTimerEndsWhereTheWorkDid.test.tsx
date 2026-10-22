// @vitest-environment jsdom
/**
 * A TIMER FORGOTTEN OVERNIGHT CAN BE ENDED WHERE THE WORK ENDED.
 *
 * Reported by the owner on 2026-10-22: start a timer, forget it, find it the
 * next day at 16 hours, type in the 1:30 actually worked — and it became a
 * 1:30 timer that had started 1:30 ago and was still running. The work moved
 * from yesterday morning to tonight. Nor could it be given the end it really
 * had: a running entry's end was locked on every screen, and the sheet's
 * date-and-time boxes made "yesterday at 10:30" a fiddle with two calendars.
 *
 * The service half pins the rules; the rendered half proves the boxes reach
 * them.
 */

import { useCallback, useState } from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody, EntryList } from "@/src/timetrack/components/EntryList"
import { TimerBar } from "@/src/timetrack/components/TimerBar"
import {
  epochSeconds,
  parseEndTimeInput,
  parseStartTimeInput,
  parseTimeInput,
} from "@/src/timetrack/timetrackFormatService"
import {
  moveEntryToDay,
  resumeWithElapsed,
  setEntryStart,
  runningEntry,
  setRunningElapsed,
  startTimer,
  updateEntry,
} from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

/** Local wall-clock times in October 2026, so the test reads the same in any zone */
const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 9, day, h, m, s, 0).toISOString()

/** yesterday morning, and the moment it was noticed sixteen hours later */
const START = at(21, 9, 0)
const NOW = at(22, 1, 0)
const NOW_SEC = epochSeconds(NOW)

const draft: EntryDraft = { description: "deep work", projectId: null, taskId: null, tagIds: [], billable: false }

function forgotten(): TimetrackState {
  return startTimer(baseState({ entries: [] }), draft, START).state
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

describe("typing a duration into a running timer", () => {
  test("shorter keeps the start and ends it that long after", () => {
    const result = setRunningElapsed(forgotten(), 90 * 60, NOW)

    expect(result.violations).toEqual([])
    expect(runningEntry(result.state), "it is still running").toBeNull()
    const ended = result.state.entries[0]
    expect(ended.start).toBe(START)
    expect(ended.stop).toBe(at(21, 10, 30))
    expect(ended.duration).toBe(90 * 60)
    expect(result.stopped?.id).toBe(ended.id)
  })

  test("longer moves the start back and keeps it running, as it always did", () => {
    const started = startTimer(baseState({ entries: [] }), draft, NOW).state
    const result = setRunningElapsed(started, 2 * 3600, NOW)

    expect(result.stopped).toBeNull()
    const running = runningEntry(result.state)!
    expect(running.start).toBe(new Date(epochSeconds(NOW) * 1000 - 2 * 3600_000).toISOString())
  })

  test("under a minute shorter is the seconds the box does not show, not a forgotten timer", () => {
    const started = startTimer(baseState({ entries: [] }), draft, at(22, 0, 14, 30)).state // 0:46:30 ago
    const result = setRunningElapsed(started, 46 * 60, NOW)

    expect(result.stopped).toBeNull()
    expect(runningEntry(result.state), "retyping what the box showed stopped the timer").not.toBeNull()
  })

  test("the other reading — I started late — puts it back running, started that long ago", () => {
    const ended = setRunningElapsed(forgotten(), 90 * 60, NOW)
    const resumed = resumeWithElapsed(ended.state, ended.stopped!.id, 90 * 60, NOW)

    expect(resumed.violations).toEqual([])
    const running = runningEntry(resumed.state)!
    expect(running.id).toBe(ended.stopped!.id)
    expect(running.start).toBe(new Date(epochSeconds(NOW) * 1000 - 90 * 60_000).toISOString())
  })

  test("the minute of grace is measured from what the box showed, not from the clock while you typed", () => {
    // focused at 1:00:50, ten seconds spent typing "1:00": 60s short of the
    // clock, 50s short of the box — a trim, not a forgotten timer
    const started = startTimer(baseState({ entries: [] }), draft, at(21, 23, 59, 0)).state // 1:01:00 ago
    const result = setRunningElapsed(started, 3600, NOW, { shownSeconds: 3600 + 50 })

    expect(result.stopped).toBeNull()
    expect(runningEntry(result.state)).not.toBeNull()
  })

  test("it acts on the entry whose box was typed into, not whichever running entry comes first", () => {
    const first = startTimer(baseState({ entries: [] }), draft, START).state
    const second = { ...first, entries: [...first.entries, { ...first.entries[0], id: "other", start: at(21, 20, 0), duration: -epochSeconds(at(21, 20, 0)) }] }
    const result = setRunningElapsed(second, 30 * 60, NOW, { entryId: "other" })

    expect(result.stopped?.id).toBe("other")
    expect(result.state.entries.find((e) => e.id === first.entries[0].id)!.stop, "the other timer was touched").toBeNull()
  })

  test("but not on top of another timer started since", () => {
    const ended = setRunningElapsed(forgotten(), 90 * 60, NOW)
    const other = startTimer(ended.state, { ...draft, description: "something else" }, NOW).state
    const resumed = resumeWithElapsed(other, ended.stopped!.id, 90 * 60, NOW)

    expect(resumed.violations[0]?.message).toMatch(/Another timer is running/)
    expect(resumed.state.entries.filter((e) => e.stop === null)).toHaveLength(1)
  })
})

describe("a running entry's end", () => {
  test("can be a time that has passed, which stops it there", () => {
    const state = forgotten()
    const result = updateEntry(state, state.entries[0].id, { stop: at(21, 10, 30) }, NOW)

    expect(result.violations).toEqual([])
    expect(runningEntry(result.state)).toBeNull()
    expect(result.state.entries[0].duration).toBe(90 * 60)
  })

  test("but not one that has not happened yet", () => {
    const state = forgotten()
    const result = updateEntry(state, state.entries[0].id, { stop: at(22, 3, 0) }, NOW)

    expect(result.violations[0]?.message).toMatch(/has not happened yet/)
    expect(runningEntry(result.state)).not.toBeNull()
  })
})

describe("an end typed as a time of day", () => {
  test("is on the start's day when that is after the start", () => {
    expect(parseEndTimeInput("10:30", START)).toBe(at(21, 10, 30))
  })

  test("is the next morning when it would be before the start", () => {
    expect(parseEndTimeInput("01:00", at(21, 22, 0))).toBe(at(22, 1, 0))
  })

  test("with no digits in it is not a time — \"now\" used to read as midnight and stop the timer there", () => {
    expect(parseTimeInput("now", "2026-10-21")).toBeNull()
    expect(parseEndTimeInput("now", START)).toBeNull()
  })

  test("in the start's own minute is the start, not a day later", () => {
    const startedWithSeconds = at(21, 9, 0, 40)
    expect(parseEndTimeInput("09:00", startedWithSeconds)).toBe(startedWithSeconds)
  })
})

describe("a start typed after the end", () => {
  test("moves the entry and keeps its length, so a night's work can be typed from the top", () => {
    const state = baseState({ entries: [entry(1, "2026-10-21", "15:47", "17:00")] })
    const result = setEntryStart(state, "1", at(21, 22, 0), NOW)

    expect(result.violations).toEqual([])
    expect(result.state.entries[0].start).toBe(at(21, 22, 0))
    expect(result.state.entries[0].stop).toBe(at(21, 23, 13))
  })

  test("while a start before the end keeps the end, as before", () => {
    const state = baseState({ entries: [entry(1, "2026-10-21", "15:47", "17:00")] })
    const result = setEntryStart(state, "1", at(21, 16, 30), NOW)

    expect(result.state.entries[0].stop).toBe(at(21, 17, 0))
    expect(result.state.entries[0].duration).toBe(30 * 60)
  })
})

describe("a start typed as a time of day", () => {
  test("on an entry past midnight, an early hour is the morning after, not the night before", () => {
    // 22:00–02:00: "00:30" read on the start's day made a 25-hour entry
    expect(parseStartTimeInput("00:30", at(20, 22, 0), at(21, 2, 0))).toBe(at(21, 0, 30))
  })

  test("and an evening hour stays on the start's day", () => {
    expect(parseStartTimeInput("21:00", at(20, 22, 0), at(21, 2, 0))).toBe(at(20, 21, 0))
  })
})

describe("moving an entry to another day", () => {
  test("is refused out of a locked week, not only into one", () => {
    const state = baseState({ entries: [entry(1, "2026-10-19", "09:00", "10:00")] })
    state.workspace.lockEntriesBefore = "2026-10-19"
    const moved = moveEntryToDay(state, "1", "2026-10-20", NOW)

    expect(moved.violations[0]?.message).toMatch(/locked/)
    expect(moved.state).toBe(state)
  })

  test("keeps the real length across the night the clocks go back", () => {
    // 23:00 → 04:00 over the end of summer time in Copenhagen is six hours, not five
    const state = baseState({ entries: [entry(1, "2026-10-24", "23:00", "23:00")] })
    state.entries[0] = { ...state.entries[0], stop: at(25, 4, 0), duration: epochSeconds(at(25, 4, 0)) - epochSeconds(at(24, 23, 0)) }
    expect(state.entries[0].duration).toBe(6 * 3600)

    const moved = moveEntryToDay(state, "1", "2026-10-23", NOW).state.entries[0]
    expect(moved.start).toBe(at(23, 23, 0))
    expect(moved.duration).toBe(6 * 3600)
  })

  test("keeps a finished entry's times and length", () => {
    const state = baseState({ entries: [entry(1, "2026-10-21", "09:00", "10:30")] })
    const moved = moveEntryToDay(state, "1", "2026-10-20", NOW).state.entries[0]

    expect(moved.start).toBe(at(20, 9, 0))
    expect(moved.stop).toBe(at(20, 10, 30))
    expect(moved.duration).toBe(90 * 60)
  })

  test("moves a running entry's start and leaves it running", () => {
    const state = forgotten()
    const moved = moveEntryToDay(state, state.entries[0].id, "2026-10-20", NOW)

    expect(moved.violations).toEqual([])
    expect(runningEntry(moved.state)!.start).toBe(at(20, 9, 0))
  })

  test("refuses to start a running timer in the future", () => {
    const state = startTimer(baseState({ entries: [] }), draft, at(22, 0, 30)).state
    const moved = moveEntryToDay(state, state.entries[0].id, "2026-10-23", NOW)

    expect(moved.violations[0]?.message).toMatch(/cannot start in the future/)
    expect(moved.state).toBe(state)
  })
})

// ---------------------------------------------------------------------------
// The boxes
// ---------------------------------------------------------------------------

type Latest = { current: TimetrackState; update?: (updater: (current: TimetrackState) => TimetrackState) => void }

function TimerBarHarness({ latest, pushToast }: { latest: Latest; pushToast: () => void }) {
  const [state, setState] = useState(latest.current)
  latest.current = state
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => {
    setState((current) => updater(current))
  }, [])
  latest.update = update
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

describe("the timer bar on a timer forgotten overnight", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(NOW))
  })

  test("says when it started, in words", () => {
    render(<TimerBarHarness latest={{ current: forgotten() }} pushToast={vi.fn()} />)
    expect(screen.getByText(/Started yesterday at 09:00/)).toBeTruthy()
    expect(screen.getByText(/forgot to stop it\?/)).toBeTruthy()
  })

  test("1:30 typed into it ends it yesterday at 10:30, and says so with the other choice", () => {
    const latest = { current: forgotten() }
    const pushToast = vi.fn()
    render(<TimerBarHarness latest={latest} pushToast={pushToast} />)
    const box = screen.getByLabelText("Duration") as HTMLInputElement

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1:30" } })
    fireEvent.blur(box)

    const saved = latest.current.entries[0]
    expect(saved.start).toBe(START)
    expect(saved.stop).toBe(at(21, 10, 30))
    expect(pushToast).toHaveBeenCalledWith(
      expect.stringMatching(/^Ended “deep work” yesterday at 10:30, 1 hour 30 minutes after it started/),
      "info",
      expect.any(Function),
      "Keep running",
    )
  })

  test("'Keep running' says so when it cannot, instead of doing nothing", () => {
    const latest: Latest = { current: forgotten() }
    const pushToast = vi.fn()
    render(<TimerBarHarness latest={latest} pushToast={pushToast} />)
    const box = screen.getByLabelText("Duration") as HTMLInputElement
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1:30" } })
    fireEvent.blur(box)
    const keepRunning = pushToast.mock.calls[0][2] as () => void

    // another timer started before the button was pressed
    act(() => latest.update!((current) => startTimer(current, { ...draft, description: "next thing" }, NOW).state))
    act(() => keepRunning())

    expect(pushToast).toHaveBeenLastCalledWith(expect.stringMatching(/Another timer is running/), "error")
  })

  test("clicking into the box and out again is not an edit", () => {
    const latest = { current: forgotten() }
    render(<TimerBarHarness latest={latest} pushToast={vi.fn()} />)
    const box = screen.getByLabelText("Duration")

    fireEvent.focus(box)
    fireEvent.blur(box)

    expect(runningEntry(latest.current)?.start).toBe(START)
  })
})

function sheet(initial: TimetrackState) {
  let current = initial
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  const pushToast = vi.fn()
  const view = render(
    <EntryDetailModalBody entry={initial.entries[0]} state={initial} setState={setState} pushToast={pushToast} nowSec={NOW_SEC} />,
  )
  const box = (label: string) => {
    const input = view.container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
    expect(input, `the sheet has no "${label}" box, so this asserts nothing`).toBeTruthy()
    return input
  }
  return { view, box, pushToast, stored: () => current.entries[0] }
}

describe("the detail sheet", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(NOW))
  })

  test("an end typed on a running entry stops it there — yesterday, not now", () => {
    const { box, stored } = sheet(forgotten())
    const end = box("End time")

    fireEvent.change(end, { target: { value: "10:30" } })
    fireEvent.blur(end)

    expect(stored().start).toBe(START)
    expect(stored().stop).toBe(at(21, 10, 30))
  })

  test("a shorter duration on a running entry ends it the same way as the timer bar", () => {
    const { box, stored } = sheet(forgotten())
    const duration = box("Duration")

    fireEvent.change(duration, { target: { value: "1:30" } })
    fireEvent.blur(duration)

    expect(stored().stop).toBe(at(21, 10, 30))
  })

  test("the day arrows move a finished entry by a whole day and keep its times", () => {
    const { stored } = sheet(baseState({ entries: [entry(1, "2026-10-21", "09:00", "10:30")] }))

    fireEvent.click(screen.getByRole("button", { name: "One day earlier" }))

    expect(stored().start).toBe(at(20, 9, 0))
    expect(stored().stop).toBe(at(20, 10, 30))
  })

  test("a typed date waits for the box to be left, because every digit of a year is a date", () => {
    const { box, stored } = sheet(baseState({ entries: [entry(1, "2026-10-21", "09:00", "10:30")] }))
    const date = box("Date")

    fireEvent.change(date, { target: { value: "0002-10-21" } })
    expect(stored().start, "moved to year 2 on the first digit").toBe(at(21, 9, 0))

    fireEvent.change(date, { target: { value: "2026-10-19" } })
    fireEvent.blur(date)
    expect(stored().start).toBe(at(19, 9, 0))
    expect(stored().stop).toBe(at(19, 10, 30))
  })

  test("an end before the start of a finished entry is the next morning, and says so", () => {
    const { box, stored, view, pushToast } = sheet(baseState({ entries: [entry(1, "2026-10-20", "22:00", "23:00")] }))
    const end = box("End time")

    fireEvent.change(end, { target: { value: "01:00" } })
    fireEvent.blur(end)

    expect(stored().stop).toBe(at(21, 1, 0))
    expect(pushToast).toHaveBeenCalledWith("Ends the next day, at 01:00", "info")
    view.rerender(
      <EntryDetailModalBody entry={stored()} state={baseState({ entries: [stored()] })} setState={vi.fn()} pushToast={vi.fn()} nowSec={NOW_SEC} />,
    )
    expect(screen.getByText("next day")).toBeTruthy()
  })
})

describe("a running entry's duration box in the sheet", () => {
  test("holds still while you type, and retyping what it showed is not an edit", () => {
    const initial = forgotten()
    let current = initial
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const view = render(
      <EntryDetailModalBody entry={initial.entries[0]} state={initial} setState={setState} pushToast={vi.fn()} nowSec={NOW_SEC} />,
    )
    const box = view.container.querySelector('input[aria-label="Duration"]') as HTMLInputElement
    fireEvent.focus(box)
    const held = box.value

    view.rerender(
      <EntryDetailModalBody entry={initial.entries[0]} state={initial} setState={setState} pushToast={vi.fn()} nowSec={NOW_SEC + 5} />,
    )
    expect(box.value, "the clock rewrote the box while it had focus").toBe(held)

    fireEvent.change(box, { target: { value: "x" } })
    fireEvent.change(box, { target: { value: held } })
    fireEvent.blur(box)
    expect(setState, "text retyped as it was filed an edit").not.toHaveBeenCalled()
  })
})

describe("the entry list's own row", () => {
  test("a running entry's end box is open, and a time typed there stops it", () => {
    const initial = forgotten()
    let current = initial
    const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
      current = updater(current)
    })
    const view = render(
      <EntryList state={initial} setState={setState} nowSec={NOW_SEC} pushToast={vi.fn()} onEditEntry={vi.fn()} />,
    )
    const end = view.container.querySelector('input[aria-label="End time"]') as HTMLInputElement
    expect(end, "the inline end box was not rendered, so this asserts nothing").toBeTruthy()
    expect(end.disabled, "a running entry's end is still locked").toBe(false)

    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(NOW))
    fireEvent.change(end, { target: { value: "10:30" } })
    fireEvent.blur(end)

    expect(current.entries[0].stop).toBe(at(21, 10, 30))
  })
})
