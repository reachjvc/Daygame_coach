// @vitest-environment jsdom
/**
 * A PHONE THAT WAS ASLEEP CANNOT RESTART A TIMER THE PC STOPPED.
 *
 * The owner's own overlap: "i start a timer on pc, then close it on phone once i
 * am done with gym". Run the other way round, with the phone in a pocket in
 * between, it went wrong like this (sync defect #1 in
 * Plans/time-tracker-like-toggl.md):
 *
 *   1. the phone holds "Gym", running, and an edit to it waits in its queue —
 *      it was offline, or asleep before the upload went;
 *   2. the PC stops Gym;
 *   3. the phone wakes and sends its queued row. The server replaced the whole
 *      row, so `stopped_at: null` from the phone's old copy started the timer
 *      again, on every device.
 *
 * "My unsent change beats the server" was right for two tabs of one browser,
 * where the queue is the newest thing there is. On a second device the queue is
 * the OLDEST thing there is. Each queued row now carries the server version it
 * was based on, the server refuses a row whose version has moved on, and the
 * phone lays only the fields it changed itself onto the server's copy.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { PENDING_KEY } from "@/src/timetrack/config"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
})

const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }
const withGymRunning = (): TimetrackState => baseState({ entries: [gym] })
/** where the PC stopped it: an hour after it started */
const PC_STOP = new Date(Date.parse(gym.start) + 3600_000).toISOString()

const rename = (description: string) => (current: TimetrackState): TimetrackState => ({
  ...current,
  entries: current.entries.map((e) => (e.id === "gym" ? { ...e, description, at: new Date().toISOString() } : e)),
})

describe("a phone that wakes with an edit still queued", () => {
  test("does not start the timer again that the PC stopped, and keeps its own edit", async () => {
    const account = fakeAccount(stateToRows(withGymRunning(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const phone = renderDevice(withGymRunning())
    await wait(100)

    // the phone loses signal, and an edit to the running entry waits in its queue
    account.online = false
    phone.apply(rename("Gym, legs day"))
    await wait(1500)
    expect(window.localStorage.getItem(PENDING_KEY) ?? "", "the edit was never queued, so this proves nothing").toContain(
      "Gym, legs day",
    )

    // the PC stops Gym while the phone is away
    account.stop("gym", PC_STOP)

    // the phone comes back
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(6000)

    const onAccount = account.entry("gym")!
    expect(onAccount.stopped_at, "the phone's old copy started the timer again that the PC had stopped").toBe(PC_STOP)
    expect(onAccount.description, "the phone's own edit was thrown away").toBe("Gym, legs day")
    const shown = phone.latest().entries.find((e) => e.id === "gym")
    expect(shown?.stop, "the phone still shows the timer running").toBe(PC_STOP)
    expect(shown?.description).toBe("Gym, legs day")
  })

  test("does not, either, when the app was closed with the edit queued and opened again later", async () => {
    const account = fakeAccount(stateToRows(withGymRunning(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    const before = renderDevice(withGymRunning())
    await wait(100)
    account.online = false
    before.apply(rename("Gym, legs day"))
    await wait(1500)
    // the app is closed: its copy and its queue stay in this browser
    const heldOnThePhone = before.latest()
    before.unmount()

    account.stop("gym", PC_STOP)
    account.online = true

    // and opened again, hours later
    const phone = renderDevice(heldOnThePhone)
    await wait(6000)

    const onAccount = account.entry("gym")!
    expect(onAccount.stopped_at, "opening the app sent its old copy and started the timer again").toBe(PC_STOP)
    expect(onAccount.description, "the edit that waited in the queue was thrown away").toBe("Gym, legs day")
    expect(phone.latest().entries.find((e) => e.id === "gym")?.stop, "the phone shows the timer running").toBe(PC_STOP)
  })
})
