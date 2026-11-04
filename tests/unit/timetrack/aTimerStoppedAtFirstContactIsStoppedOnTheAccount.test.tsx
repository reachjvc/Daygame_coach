// @vitest-environment jsdom
/**
 * A TIMER THIS DEVICE STOPS WHEN IT FIRST HEARS FROM THE ACCOUNT IS STOPPED ON THE ACCOUNT TOO.
 *
 * The PC starts Gym. The phone opens with no signal, holding a copy from before,
 * and starts Walk. When the signal returns, the phone finds two timers running,
 * stops the older one where the newer began, and says so: "Another device had a
 * timer running too…". It showed Gym stopped, but never sent the stop. First
 * contact handed the result over as the account's own copy, so the change-watcher
 * found nothing to send, and the account kept both timers running — Gym for hours
 * once the PC was shut. The check after waking had already stopped doing that for
 * the same reason.
 */

import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer, stopTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"
const NOON = new Date("2026-08-10T12:00:00.000Z")

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
})

/** what the PC started at eight: the account's copy */
const shape = entry("gym", "2026-08-10", "08:00", "09:00", { description: "Gym" })
const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }

const startWalk = (current: TimetrackState) =>
  startTimer(current, { description: "Walk", projectId: null, taskId: null, tagIds: [], billable: false }, new Date().toISOString())
    .state

describe("a phone that started a timer with no signal while the PC's ran", () => {
  test("stops the PC's timer on the account, where its own began", async () => {
    const account = fakeAccount(stateToRows(baseState({ entries: [gym] }), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    // the phone's copy is from before the PC started Gym; it opens with no signal
    account.online = false
    const phone = renderDevice(baseState())
    await wait(4_000)
    phone.apply(startWalk)
    const walk = phone.latest().entries.find((e) => e.description === "Walk")!
    await wait(1_000)

    // the signal comes back
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(4_000)

    expect(phone.toasts().some((text) => /Another device had a timer running too/.test(text))).toBe(true)
    expect(phone.latest().entries.find((e) => e.id === "gym")?.stop, "the phone did not stop Gym").toBe(walk.start)
    expect(account.entry(walk.id)?.stopped_at, "Walk should be running on the account").toBeNull()
    expect(account.entry("gym")?.stopped_at, "the phone showed Gym stopped, and the account still has it running").toBe(walk.start)
  })

  test("leaves nothing running on the account once its own timer is stopped", async () => {
    const account = fakeAccount(stateToRows(baseState({ entries: [gym] }), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    account.online = false
    const phone = renderDevice(baseState())
    await wait(4_000)
    phone.apply(startWalk)
    await wait(1_000)
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(4_000)

    // later, Walk is done
    vi.setSystemTime(new Date(Date.now() + 30 * 60_000))
    phone.apply((current) => stopTimer(current, new Date().toISOString()).state)
    await wait(2_000)

    const running = [...new Set(["gym", ...phone.latest().entries.map((e) => e.id)])]
      .map((id) => account.entry(id))
      .filter((row) => row && row.stopped_at === null && row.deleted_at == null)
      .map((row) => row!.description)
    expect(running, "a timer the phone had shown stopped still runs on the account").toEqual([])
  })
})
