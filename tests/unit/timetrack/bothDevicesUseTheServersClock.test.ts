// @vitest-environment jsdom
/**
 * BOTH DEVICES USE THE SERVER'S CLOCK (design rule D5).
 *
 * Starts and stops were stamped with each device's own clock, so a phone four
 * minutes fast made every PC stop four minutes short (sync defect #6 in
 * Plans/time-tracker-like-toggl.md). Each answer from the server carries its
 * own time in the `Date` header, to the second. From when a request went and
 * when its answer came back, the device learns how far its clock is from the
 * server's, and stamps starts, stops and the running clock with the corrected
 * time. An answer that took long says little and is ignored.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { act, cleanup, renderHook } from "@testing-library/react"

import { STORAGE_KEY } from "@/src/timetrack/config"
import { forgetServerClock, noteServerDate, serverNow } from "@/src/timetrack/serverClock"
import { clockOffset, learnClock } from "@/src/timetrack/serverClockService"
import { useTimetrack } from "@/src/timetrack/hooks/useTimetrack"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { runningEntry } from "@/src/timetrack/timetrackService"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const FOUR_MINUTES = 4 * 60_000
/** the server's clock, and a phone that runs four minutes ahead of it */
const SERVER_NOW = Date.parse("2026-08-10T12:00:00.400Z")
const PHONE_NOW = SERVER_NOW + FOUR_MINUTES

/** What the server puts in `Date`: its own time, to the whole second */
const dateHeader = (serverMs: number) => new Date(Math.floor(serverMs / 1000) * 1000).toUTCString()

/** One answer: sent `rtt` ms before it came back, stamped by the server halfway */
function answer(deviceAt: number, offset: number, rtt = 100) {
  return { sentAt: deviceAt - rtt / 2, receivedAt: deviceAt + rtt / 2, serverDate: dateHeader(deviceAt + offset) }
}

describe("what one answer says about this device's clock", () => {
  test("a phone four minutes fast learns it is four minutes fast, to within a second", () => {
    const offset = clockOffset(learnClock(null, answer(PHONE_NOW, -FOUR_MINUTES)))
    expect(Math.abs(offset + FOUR_MINUTES)).toBeLessThanOrEqual(1_000)
  })

  test("a clock that agrees with the server is left exactly as it is", () => {
    expect(clockOffset(learnClock(null, answer(SERVER_NOW, 0)))).toBe(0)
  })

  test("an answer that took five seconds is ignored", () => {
    expect(learnClock(null, answer(PHONE_NOW, -FOUR_MINUTES, 5_000))).toBeNull()
  })

  test("an answer with no readable date is ignored", () => {
    expect(learnClock(null, { sentAt: 0, receivedAt: 50, serverDate: null })).toBeNull()
    expect(learnClock(null, { sentAt: 0, receivedAt: 50, serverDate: "soon" })).toBeNull()
  })

  test("more answers narrow it down, and it stays on the true offset", () => {
    let window = null as ReturnType<typeof learnClock>
    // answers landing at different points within the server's second
    for (let i = 0; i < 10; i++) window = learnClock(window, answer(PHONE_NOW + i * 1_370, -FOUR_MINUTES))
    expect(window).not.toBeNull()
    expect(window!.high - window!.low, "ten answers should pin it closer than one second").toBeLessThan(1_000)
    expect(Math.abs(clockOffset(window) + FOUR_MINUTES)).toBeLessThanOrEqual(300)
  })

  test("a device clock that is changed by hand starts the estimate over", () => {
    let window = learnClock(null, answer(PHONE_NOW, -FOUR_MINUTES))
    // the phone is set right: from now on it agrees with the server
    window = learnClock(window, answer(SERVER_NOW + 10_000, 0))
    expect(clockOffset(window)).toBe(0)
  })
})

describe("on the device", () => {
  beforeEach(() => {
    window.localStorage.clear()
    forgetServerClock()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
    forgetServerClock()
    window.localStorage.clear()
  })

  test("the sync learns the offset from the server's answers", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(PHONE_NOW)
    const state = baseState()
    const account = fakeAccount(stateToRows(state, "user-1"))
    vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
      const response = await account.fetch(url, init)
      return { ...response, headers: new Headers({ date: dateHeader(Date.now() - FOUR_MINUTES) }) }
    })
    renderDevice(state)
    await wait(100)
    expect(Math.abs(serverNow() - (Date.now() - FOUR_MINUTES)), "the device did not learn its clock is fast").toBeLessThanOrEqual(1_000)
  })

  test("Stop on a phone four minutes fast is stamped with the server's time, and so is the running clock", () => {
    vi.useFakeTimers()
    vi.setSystemTime(PHONE_NOW)
    const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
    const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseState({ entries: [gym] })))
    noteServerDate(Date.now() - 50, Date.now() + 50, dateHeader(Date.now() - FOUR_MINUTES))

    const { result } = renderHook(() => useTimetrack())
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(runningEntry(result.current.state!)?.id).toBe("gym")
    expect(result.current.nowSec, "the running clock counts on the phone's own time").toBe(Math.floor(serverNow() / 1000))

    act(() => result.current.actions.stop())
    const stopped = result.current.state!.entries.find((e) => e.id === "gym")!
    expect(Math.abs(Date.parse(stopped.stop!) - (Date.now() - FOUR_MINUTES)), "the stop is four minutes late").toBeLessThanOrEqual(1_000)
  })

  test("learning the offset does not make the idle clock, Pomodoro or reminders jump", () => {
    vi.useFakeTimers()
    vi.setSystemTime(SERVER_NOW - 12 * 60_000) // a phone twelve minutes slow
    vi.spyOn(document, "hasFocus").mockReturnValue(true)
    const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
    const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }
    const state = baseState({ entries: [gym] })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, idle: { enabled: true, minutes: 10, legacyDefaultMoved: true } }))

    const { result } = renderHook(() => useTimetrack())
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current.state?.idle.enabled, "idle detection is on, or this proves nothing").toBe(true)
    // the first answer arrives: the phone is twelve minutes slow
    noteServerDate(Date.now() - 50, Date.now() + 50, dateHeader(Date.now() + 12 * 60_000))
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current.idlePrompt, "three seconds of use read as twelve minutes idle").toBeNull()
  })
})
