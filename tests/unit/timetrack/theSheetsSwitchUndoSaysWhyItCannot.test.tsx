// @vitest-environment jsdom
/**
 * THE SHEET'S SWITCH UNDO SAYS WHY IT CANNOT (code review of ddffc410).
 *
 * CREATE on the phone while Gym ran on the PC stops Gym: "Stopped ‘Gym’ and
 * started ‘Stretching’ · Undo". When a third timer started before Undo was
 * pressed, the Undo asked the copy from before the create, found nothing in
 * the way, and then did nothing on the newest one, in silence. It asks the
 * workspace as it is when Undo is pressed, and says why.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useRef, useState } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { EntrySheet } from "@/src/timetrack/components/phone/EntrySheet"
import { BlockPanel } from "@/src/timetrack/components/phone/PhoneCalendar"
import { runningEntry, startTimer, stopTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 7, 10, h, m, 0, 0).toISOString()
const draft = (description: string): EntryDraft => ({ description, projectId: null, taskId: null, tagIds: [], billable: false })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 7, 10, 11, 50))
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test("Undo after a third timer started says so, and changes nothing", () => {
  const gym = startTimer(baseState(), draft("Gym"), at(11, 45)).state
  const pushToast = vi.fn()
  let current = gym
  let write: (updater: (s: TimetrackState) => TimetrackState) => void = () => {}
  function Shell() {
    const [state, set] = useState(gym)
    const latest = useRef(state)
    latest.current = state
    const [open, setOpen] = useState(true)
    write = (updater) => {
      current = updater(current)
      set(current)
    }
    if (!open) return null
    return (
      <EntrySheet
        target={{ mode: "start", openedAt: at(11, 40), draft: draft("Stretching") }}
        state={state}
        setState={write}
        latestState={() => latest.current}
        nowSec={Math.floor(Date.now() / 1000)}
        pushToast={pushToast}
        afterCheck={(run) => run(latest.current, new Date().toISOString())}
        dirtyRef={{ current: false }}
        backedOut={false}
        onClose={() => setOpen(false)}
        onKeepEditing={() => {}}
        onMoment={() => {}}
      />
    )
  }
  render(<Shell />)
  fireEvent.click(screen.getByRole("button", { name: "Create" }))
  const switched = pushToast.mock.calls.find(([text]) => String(text).startsWith("Stopped “Gym”"))
  expect(switched, "no switch toast").toBeDefined()
  // a third timer, from the other device, before Undo is pressed
  act(() => write((s) => startTimer(s, draft("Call"), at(11, 52)).state))
  const before = current
  act(() => switched![2]())
  expect(pushToast).toHaveBeenLastCalledWith("Nothing was undone: Another timer is running now — stop it first", "error")
  expect(current).toBe(before)
  expect(runningEntry(current)?.description).toBe("Call")
})

test("the calendar panel's Continue: Undo after a third timer started says so, and changes nothing", () => {
  const read = stopTimer(startTimer(baseState(), draft("Read"), at(9)).state, at(10)).state
  const gym = startTimer(read, draft("Gym"), at(11, 45)).state
  const readEntry = gym.entries.find((e) => e.description === "Read")!
  const pushToast = vi.fn()
  let current = gym
  let write: (updater: (s: TimetrackState) => TimetrackState) => void = () => {}
  function Shell() {
    const [state, set] = useState(gym)
    const latest = useRef(state)
    latest.current = state
    write = (updater) => {
      current = updater(current)
      set(current)
    }
    return (
      <BlockPanel
        entry={readEntry}
        state={state}
        latestState={() => latest.current}
        setState={write}
        pushToast={pushToast}
        afterCheck={(run) => run(latest.current, new Date().toISOString())}
        onEdit={() => {}}
        onStop={() => {}}
        onClose={() => {}}
      />
    )
  }
  render(<Shell />)
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  const switched = pushToast.mock.calls.find(([text]) => String(text).startsWith("Stopped “Gym”"))
  expect(switched, "no switch toast").toBeDefined()
  act(() => write((s) => startTimer(s, draft("Call"), at(11, 52)).state))
  const before = current
  act(() => switched![2]())
  expect(pushToast).toHaveBeenLastCalledWith("Nothing was undone: Another timer is running now — stop it first", "error")
  expect(current).toBe(before)
  expect(runningEntry(current)?.description).toBe("Call")
})
