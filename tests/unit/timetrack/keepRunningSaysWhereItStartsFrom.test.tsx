// @vitest-environment jsdom
/**
 * "KEEP RUNNING" SAYS THE START IT WILL GIVE THE TIMER, AND GIVES IT THAT ONE.
 *
 * A three-hour timer given "2:00" ends two hours after it started, and the
 * toast offers the other reading: "I started late". That reading moves the
 * start to two hours before now, which is what Toggl means by editing a
 * running timer's length, and it stays. But the button said only "Keep
 * running", which reads as "put it back as it was", and the real start an hour
 * earlier was gone. Found by the edits audit on 2026-11-04.
 *
 * So the button names the start ("Keep running from 12:15"), and pressing it a
 * minute later still starts it there, not a minute later than it said.
 */

import { act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { announceEndedEarly } from "@/src/timetrack/components/TimerBar"
import { runningEntry, setRunningElapsed, startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m, 0, 0).toISOString()
const NOW = at(14, 15)
const draft: EntryDraft = { description: "Three", projectId: null, taskId: null, tagIds: [], billable: false }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
})

function endedAfterTwoHours() {
  const threeHours = startTimer(baseState({ entries: [] }), draft, at(11, 15)).state
  const ended = setRunningElapsed(threeHours, 2 * 3600, NOW)
  let current: TimetrackState = ended.state
  const setState = (updater: (s: TimetrackState) => TimetrackState) => {
    current = updater(current)
  }
  const pushToast = vi.fn()
  announceEndedEarly(ended.stopped!, 2 * 3600, () => current, setState, pushToast)
  const [text, , keep, label] = pushToast.mock.calls[0] as [string, string, () => void, string]
  return { text, keep, label, latest: () => current, pushToast }
}

describe("after a shorter length ended a running timer", () => {
  test("the toast says where it ended, and the button names the start it would give it", () => {
    const { text, label } = endedAfterTwoHours()
    expect(text).toMatch(/^Ended “Three” at 13:15, 2 hours after it started/)
    expect(label).toBe("Keep running from 12:15")
  })

  test("pressing it later still starts it where the button said", () => {
    const { keep, latest } = endedAfterTwoHours()
    vi.setSystemTime(new Date(at(14, 17)))
    act(() => keep())

    const running = runningEntry(latest())
    expect(running, "it is not running").not.toBeNull()
    expect(running!.start).toBe(at(12, 15))
  })
})
