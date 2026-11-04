// @vitest-environment jsdom
/**
 * A CHANGE MADE WITH NO SIGNAL SURVIVES THE APP BEING OPENED AGAIN (scenario S4).
 *
 * The owner starts "Gym" on the PC and stops it on the phone, sometimes in a
 * basement with no signal. The phone opened the tracker there, so its first
 * read of the account never landed, and the Stop was kept on the screen only:
 * nothing is queued until the account is known. Android then closed the app in
 * the background (or he left the tracker and came back), and the next opening
 * took what the screen held as its starting point. The Stop was in neither the
 * queue nor "what changed since opening", so when the signal came back the
 * account's copy won: Gym ran again on the phone, and the account never heard
 * of the Stop. A new entry made the same way stayed on that phone only.
 *
 * Now what this device held when it was last in step with the account is kept
 * beside the workspace until the account has heard of what changed since, so a
 * later opening still knows what was changed here. It belongs to the account
 * the page was opened for, and is never sent into another one (that promise is
 * anotherPersonNeverGetsYourTracker's).
 *
 * The same on a slow line rather than none: the first read takes ten seconds,
 * Stop works after three (D2), and the person leaves at once.
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

const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }
const withGymRunning = (): TimetrackState => baseState({ entries: [gym] })

const stopNow = (current: TimetrackState) => stopTimer(current, new Date().toISOString()).state
const track = (description: string) => (current: TimetrackState) => {
  const started = startTimer(
    current,
    { description, projectId: null, taskId: null, tagIds: [], billable: false },
    new Date().toISOString(),
  ).state
  return stopTimer(started, new Date(Date.now() + 60_000).toISOString()).state
}

/** The phone opened the tracker with signal once, so it holds the account's copy and knows the account */
async function phoneSawTheAccount(state: TimetrackState): Promise<TimetrackState> {
  const earlier = renderDevice(state, { account: USER })
  await wait(1_000)
  const held = earlier.latest()
  earlier.unmount()
  return held
}

describe("a phone that opened with no signal", () => {
  test("keeps its Stop when the app is opened again before the signal returns", async () => {
    const account = fakeAccount(stateToRows(withGymRunning(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))
    const held = await phoneSawTheAccount(withGymRunning())

    // in the basement: open, Stop
    account.online = false
    const basement = renderDevice(held, { account: USER })
    await wait(4_000)
    const pressedAt = new Date().toISOString()
    basement.apply(stopNow)
    await wait(1_500)
    const afterStop = basement.latest()
    basement.unmount()

    // Android closed the app; it is opened again, still with no signal
    const phone = renderDevice(afterStop, { account: USER })
    await wait(4_000)
    expect(phone.latest().entries.find((e) => e.id === "gym")?.stop).toBe(pressedAt)

    // the signal comes back
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(4_000)

    expect(account.entry("gym")?.stopped_at, "the account never heard of the Stop made with no signal").toBe(pressedAt)
    expect(phone.latest().entries.find((e) => e.id === "gym")?.stop, "the phone shows Gym running again").toBe(pressedAt)
  })

  test("sends an entry it tracked then, after the app is opened again", async () => {
    const account = fakeAccount(stateToRows(baseState(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))
    const held = await phoneSawTheAccount(baseState())

    account.online = false
    const basement = renderDevice(held, { account: USER })
    await wait(4_000)
    basement.apply(track("Coffee with Anna"))
    await wait(1_000)
    const afterTracking = basement.latest()
    const coffee = afterTracking.entries.find((e) => e.description === "Coffee with Anna")!
    basement.unmount()

    const phone = renderDevice(afterTracking, { account: USER })
    await wait(2_000)
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(4_000)

    expect(account.entry(coffee.id)?.description, "the entry exists on this phone only").toBe("Coffee with Anna")
    expect(phone.latest().entries.some((e) => e.id === coffee.id)).toBe(true)
  })
})

describe("a phone on a slow line", () => {
  test("keeps a Stop made before the account answered, though the tracker was left at once", async () => {
    const account = fakeAccount(stateToRows(withGymRunning(), USER))
    let slow = false
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string; body?: string; signal?: AbortSignal }) => {
        if (slow && !init?.method) {
          // the first read is not answered before the tracker is left
          await new Promise<void>((_, reject) =>
            init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))),
          )
        }
        return account.fetch(url, init)
      }),
    )
    const held = await phoneSawTheAccount(withGymRunning())

    slow = true
    const opening = renderDevice(held, { account: USER })
    await wait(3_500)
    const pressedAt = new Date().toISOString()
    opening.apply(stopNow)
    await wait(100)
    const afterStop = opening.latest()
    opening.unmount()

    // back on a good line
    slow = false
    const back = renderDevice(afterStop, { account: USER })
    await wait(4_000)

    expect(account.entry("gym")?.stopped_at, "the Stop made while the account was slow to answer never reached it").toBe(pressedAt)
    expect(back.latest().entries.find((e) => e.id === "gym")?.stop, "the timer runs again on the next visit").toBe(pressedAt)
  })
})
