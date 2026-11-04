// @vitest-environment jsdom
/**
 * THE OTHER DEVICE NOTICES WITHIN SECONDS (design rule D4).
 *
 * The owner's overlap is "start on the PC, stop on the phone". A device used to
 * hear about the other one's change only at its next check, once a minute, or
 * when its page became visible again. Now, while the tracker is open, it listens
 * to the account's own change feed (Supabase Realtime, row security applying)
 * and checks a moment after any change to the account's entries. The minute's
 * check stays, for when no ping arrives — the feed may be off.
 *
 * It also checks when the connection comes back and when the window gets the
 * focus, and a first read that failed is tried again the moment the connection
 * returns, instead of when its backoff, grown to a minute, says so.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

/** The account's change feed, as the browser's Supabase client offers it */
const feed = vi.hoisted(() => {
  type Listener = { filter: Record<string, string>; callback: (payload: unknown) => void }
  const channels: { name: string; listeners: Listener[]; removed: boolean }[] = []
  const client = {
    channel(name: string) {
      const channel = { name, listeners: [] as Listener[], removed: false }
      channels.push(channel)
      const api = {
        on(_type: string, filter: Record<string, string>, callback: (payload: unknown) => void) {
          channel.listeners.push({ filter, callback })
          return api
        },
        subscribe() {
          return api
        },
        _channel: channel,
      }
      return api
    },
    removeChannel(api: { _channel: { removed: boolean } }) {
      api._channel.removed = true
      return Promise.resolve("ok")
    },
  }
  return {
    channels,
    client,
    /** a row of the account's entries changed */
    ping() {
      for (const channel of channels) {
        if (channel.removed) continue
        for (const listener of channel.listeners) listener.callback({ eventType: "UPDATE" })
      }
    },
  }
})

vi.mock("@/src/db/supabase-client", () => ({ createBrowserSupabaseClient: () => feed.client }))

const USER = "user-1"

beforeEach(() => {
  window.localStorage.clear()
  feed.channels.length = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }
const withGymRunning = (): TimetrackState => baseState({ entries: [gym] })
const PC_STOP = "2026-08-10T11:00:00.000Z"
const stoppedHere = (state: TimetrackState) => state.entries.find((e) => e.id === "gym")?.stop

async function phoneWithGymRunning() {
  const account = fakeAccount(stateToRows(withGymRunning(), USER))
  vi.stubGlobal("fetch", vi.fn(account.fetch))
  const phone = renderDevice(withGymRunning())
  await wait(100)
  return { account, phone }
}

describe("the phone, while the tracker is open", () => {
  test("listens to the account's entries, as this account", async () => {
    await phoneWithGymRunning()
    const listeners = feed.channels.flatMap((channel) => channel.listeners)
    expect(listeners.length, "nothing listens for the other device's changes").toBe(1)
    expect(listeners[0].filter).toEqual({ event: "*", schema: "public", table: "timetrack_entries", filter: `user_id=eq.${USER}` })
  })

  test("shows a stop made on the PC a moment after the ping, not a minute later", async () => {
    const { account, phone } = await phoneWithGymRunning()
    account.stop("gym", PC_STOP)
    feed.ping()
    await wait(1_000)
    expect(stoppedHere(phone.latest()), "the PC's stop waited for the minute's check").toBe(PC_STOP)
  })

  test("asks once for a burst of pings", async () => {
    const account = fakeAccount(stateToRows(withGymRunning(), USER))
    const fetch = vi.fn(account.fetch)
    vi.stubGlobal("fetch", fetch)
    renderDevice(withGymRunning())
    await wait(100)
    const before = fetch.mock.calls.length
    for (let i = 0; i < 5; i++) feed.ping()
    await wait(1_000)
    expect(fetch.mock.calls.length - before).toBe(1)
  })

  test("still checks once a minute when no ping ever arrives", async () => {
    const { account, phone } = await phoneWithGymRunning()
    account.stop("gym", PC_STOP)
    await wait(61_000)
    expect(stoppedHere(phone.latest())).toBe(PC_STOP)
  })

  test("stops listening when the tracker is left", async () => {
    const { phone } = await phoneWithGymRunning()
    expect(feed.channels.length, "nothing was listening in the first place").toBeGreaterThan(0)
    phone.unmount()
    expect(feed.channels.every((channel) => channel.removed)).toBe(true)
  })

  test("checks when the connection comes back", async () => {
    const { account, phone } = await phoneWithGymRunning()
    account.stop("gym", PC_STOP)
    window.dispatchEvent(new Event("online"))
    await wait(500)
    expect(stoppedHere(phone.latest()), "coming back online sent the queue but did not check").toBe(PC_STOP)
  })

  test("checks when the window gets the focus", async () => {
    const { account, phone } = await phoneWithGymRunning()
    account.stop("gym", PC_STOP)
    window.dispatchEvent(new Event("focus"))
    await wait(500)
    expect(stoppedHere(phone.latest())).toBe(PC_STOP)
  })

  test("a failed check is not silent", async () => {
    const { account, phone } = await phoneWithGymRunning()
    account.online = false
    window.dispatchEvent(new Event("focus"))
    await wait(500)
    expect(phone.sync().check?.failed, "a check that could not reach the account said nothing").toBe(true)
  })
})

describe("a phone whose first read failed", () => {
  test("reads again the moment the connection comes back", async () => {
    const account = fakeAccount(stateToRows(withGymRunning(), USER))
    vi.stubGlobal("fetch", vi.fn(account.fetch))
    account.online = false
    const phone = renderDevice(withGymRunning())
    // long enough for the retries to have backed off to a minute apart
    await wait(70_000)
    account.stop("gym", PC_STOP)
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(500)
    expect(stoppedHere(phone.latest()), "the first read waited out its backoff after the connection was back").toBe(PC_STOP)
  })
})
