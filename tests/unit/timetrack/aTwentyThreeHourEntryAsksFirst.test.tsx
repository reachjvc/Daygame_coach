// @vitest-environment jsdom
/**
 * A TYPED TIME THAT MAKES AN ENTRY LONGER THAN 12 HOURS ASKS BEFORE IT IS WRITTEN.
 *
 * With a 10:00 start, an end typed as "09:00" is 09:00 tomorrow — an exact clock
 * time, read the only way it can be — and that is a 23-hour entry. It was
 * written without a word, and the week total was how you found out. Now
 * nothing is written until you answer: "That makes it 23 hours. Did you mean
 * 21:00?", with one button for each reading. A real 13-hour day costs one tap.
 *
 * Every place a time or a length is typed: the detail sheet, the entry list's
 * own row, and the timer bar.
 */

import { useCallback, useState } from "react"
import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody, EntryList } from "@/src/timetrack/components/EntryList"
import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).toISOString()
const NOW = at(3, 23, 30)
const NOW_SEC = epochSeconds(NOW)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** a finished 10:00–11:00 entry today */
function morning(): TimetrackState {
  return baseState({ entries: [entry(1, "2026-11-03", "10:00", "11:00")] })
}

function store(initial: TimetrackState) {
  let current = initial
  const setState = vi.fn((updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  })
  return { setState, stored: () => current.entries[0], latest: () => current }
}

type Choice = { label: string; run: () => void }

/** the question asked, and its two answers */
function question(pushToast: ReturnType<typeof vi.fn>) {
  const call = pushToast.mock.calls.find(([text]) => typeof text === "string" && text.startsWith("That makes it"))
  expect(call, "nothing was asked").toBeTruthy()
  const [text, , first, firstLabel, second] = call as [string, string, () => void, string, Choice | undefined]
  return { text, first, firstLabel, second }
}

describe("the detail sheet", () => {
  function sheet(initial: TimetrackState) {
    const { setState, stored } = store(initial)
    const pushToast = vi.fn()
    const view = render(
      <EntryDetailModalBody entry={initial.entries[0]} state={initial} setState={setState} pushToast={pushToast} nowSec={NOW_SEC} />,
    )
    const box = (label: string) => view.container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement
    return { box, stored, pushToast }
  }

  test("an end of 09:00 after a 10:00 start is not written, and the question offers 21:00", () => {
    const { box, stored, pushToast } = sheet(morning())
    const end = box("End time")

    fireEvent.focus(end)
    fireEvent.change(end, { target: { value: "09:00" } })
    fireEvent.blur(end)

    expect(stored().stop, "a 23-hour entry was written without asking").toBe(at(3, 11))
    const asked = question(pushToast)
    expect(asked.text).toBe("That makes it 23 hours. Did you mean 21:00?")
    expect(asked.firstLabel).toBe("Use 21:00")
    expect(asked.second?.label).toBe("Keep 23 hours")
  })

  test("'Use 21:00' writes 21:00", () => {
    const { box, stored, pushToast } = sheet(morning())
    const end = box("End time")
    fireEvent.focus(end)
    fireEvent.change(end, { target: { value: "09:00" } })
    fireEvent.blur(end)

    act(() => question(pushToast).first())

    expect(stored().stop).toBe(at(3, 21))
  })

  test("'Keep 23 hours' writes what was typed", () => {
    const { box, stored, pushToast } = sheet(morning())
    const end = box("End time")
    fireEvent.focus(end)
    fireEvent.change(end, { target: { value: "09:00" } })
    fireEvent.blur(end)

    act(() => question(pushToast).second!.run())

    expect(stored().stop).toBe(at(4, 9))
  })

  test("a duration of 13h asks too, with only the one answer", () => {
    const { box, stored, pushToast } = sheet(morning())
    const duration = box("Duration")
    fireEvent.focus(duration)
    fireEvent.change(duration, { target: { value: "13h" } })
    fireEvent.blur(duration)

    expect(stored().duration).toBe(3600)
    const asked = question(pushToast)
    expect(asked.text).toBe("That makes it 13 hours.")
    expect(asked.firstLabel).toBe("Keep 13 hours")
    act(() => asked.first())
    expect(stored().duration).toBe(13 * 3600)
  })

  test("a start that makes it long asks, and offers the other half of the day", () => {
    const { box, stored, pushToast } = sheet(baseState({ entries: [entry(1, "2026-11-03", "22:00", "23:00")] }))
    const start = box("Start time")
    fireEvent.focus(start)
    fireEvent.change(start, { target: { value: "09:00" } })
    fireEvent.blur(start)

    expect(stored().start).toBe(at(3, 22))
    const asked = question(pushToast)
    expect(asked.text).toBe("That makes it 14 hours. Did you mean 21:00?")
    act(() => asked.first())
    expect(stored().start).toBe(at(3, 21))
  })

  test("an ordinary end is written at once, with nothing asked", () => {
    const { box, stored, pushToast } = sheet(morning())
    const end = box("End time")
    fireEvent.focus(end)
    fireEvent.change(end, { target: { value: "9" } })
    fireEvent.blur(end)

    expect(stored().stop).toBe(at(3, 21))
    expect(pushToast).not.toHaveBeenCalled()
  })
})

describe("the entry list's own row", () => {
  test("an end of 09:00 after 10:00 asks instead of writing", () => {
    const initial = morning()
    const { setState, stored } = store(initial)
    const pushToast = vi.fn()
    const view = render(<EntryList state={initial} setState={setState} nowSec={NOW_SEC} pushToast={pushToast} onEditEntry={vi.fn()} />)
    const end = view.container.querySelector('input[aria-label="End time"]') as HTMLInputElement
    expect(end, "the inline end box was not rendered, so this asserts nothing").toBeTruthy()

    fireEvent.change(end, { target: { value: "09:00" } })
    fireEvent.blur(end)

    expect(stored().stop, "a 23-hour entry was written without asking").toBe(at(3, 11))
    const asked = question(pushToast)
    expect(asked.text).toBe("That makes it 23 hours. Did you mean 21:00?")
    act(() => asked.first())
    expect(stored().stop).toBe(at(3, 21))
  })

  test("and a duration of 14h asks too", () => {
    const initial = morning()
    const { setState, stored } = store(initial)
    const pushToast = vi.fn()
    const view = render(<EntryList state={initial} setState={setState} nowSec={NOW_SEC} pushToast={pushToast} onEditEntry={vi.fn()} />)
    const duration = view.container.querySelector('input[aria-label="Duration"]') as HTMLInputElement

    fireEvent.change(duration, { target: { value: "14h" } })
    fireEvent.blur(duration)

    expect(stored().duration).toBe(3600)
    act(() => question(pushToast).first())
    expect(stored().duration).toBe(14 * 3600)
  })
})

describe("the timer bar", () => {
  const draft: EntryDraft = { description: "deep work", projectId: null, taskId: null, tagIds: [], billable: false }

  function Bar({ initial, pushToast, latest }: { initial: TimetrackState; pushToast: () => void; latest: { current: TimetrackState } }) {
    const [state, setState] = useState(initial)
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

  test("14h typed into a running timer asks before moving its start back fourteen hours", () => {
    const initial = startTimer(baseState({ entries: [] }), draft, at(3, 23)).state
    const latest = { current: initial }
    const pushToast = vi.fn()
    const view = render(<Bar initial={initial} pushToast={pushToast} latest={latest} />)
    const box = view.getByLabelText("Duration") as HTMLInputElement

    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "14h" } })
    fireEvent.blur(box)

    expect(runningEntry(latest.current)?.start, "the start moved without asking").toBe(at(3, 23))
    const asked = question(pushToast)
    expect(asked.text).toBe("That makes it 14 hours.")
    act(() => asked.first())
    expect(runningEntry(latest.current)?.start).toBe(at(3, 9, 30))
  })
})
