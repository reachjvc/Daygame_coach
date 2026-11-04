// @vitest-environment jsdom
/**
 * A CHANGE MADE IN A TAB STILL RUNNING THE PREVIOUS BUILD IS NOT LOST.
 *
 * For a while after a deploy, an old /time tab and a new one can be open side
 * by side. The new tab took nothing the old one told it — tab messages are
 * filtered by owner, and the old build names none — and the server refuses the
 * old tab's own writes ("reload to resync"). Then any change in the new tab
 * rewrote the shared queue from its own memory, without the old tab's Stop, and
 * reloading the old tab showed the timer running again (a code review,
 * 2026-11-04).
 *
 * Now a message that names no owner is taken when this browser's copy is this
 * page's account (a claim has already removed anybody else's), and the shared
 * queue keeps rows another page wrote there that this one never held.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TimetrackScreen } from "@/src/timetrack/components/TimetrackScreen"
import { PENDING_KEY, STORAGE_KEY } from "@/src/timetrack/config"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { stopTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"
const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
const mail = entry("mail", "2026-08-10", "08:00", "08:30", { description: "Email" })
const gymRunning = (): TimetrackState =>
  baseState({ entries: [mail, { ...shape, stop: null, duration: -epochSeconds(shape.start) }] })
const GYM_STOP = "2026-08-10T10:30:00.000Z"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("a new tab beside one of the previous build", () => {
  test("takes the Stop the older tab tells it, and sends it", async () => {
    const account = fakeAccount(stateToRows(gymRunning(), USER), { userId: USER })
    vi.stubGlobal("fetch", vi.fn(account.fetch))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gymRunning()))
    window.history.replaceState(null, "", "/time")
    render(<TimetrackScreen account={USER} />)
    await screen.findByRole("button", { name: /^Saved/ }, { timeout: 5_000 })

    // the older tab stops Gym and tells the others the way the previous build did: no owner
    const stopped = stopTimer(gymRunning(), GYM_STOP).state
    const older = new BroadcastChannel(STORAGE_KEY)
    older.postMessage({ kind: "state", serialised: JSON.stringify(stopped), id: "older-tab", base: null })
    older.close()

    await waitFor(() => expect(within(screen.getByRole("main")).getByRole("button", { name: "Start timer" })).toBeInTheDocument(), {
      timeout: 5_000,
    })
    await waitFor(() => expect(account.entry("gym")?.stopped_at, "the older tab's Stop never reached the account").toBe(GYM_STOP), {
      timeout: 5_000,
    })
  })

  test("leaves a queued row it never held in the shared queue", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-10T11:00:00.000Z"))
    const account = fakeAccount(stateToRows(gymRunning(), USER), { userId: USER })
    vi.stubGlobal("fetch", vi.fn(account.fetch))
    const tab = renderDevice(gymRunning(), { account: USER })
    await wait(1_000)

    // the older tab queues its Stop on disk; this tab never heard of it
    const row = stateToRows(stopTimer(gymRunning(), GYM_STOP).state, USER).timetrack_entries.find((e) => e.id === "gym")
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ timetrack_entries: [row] }))

    // something happens in this tab: another entry renamed, queued and sent
    tab.apply((current) => ({
      ...current,
      entries: current.entries.map((e) => (e.id === "mail" ? { ...e, description: "Email, answered", at: new Date().toISOString() } : e)),
    }))
    await wait(3_000)
    expect(window.localStorage.getItem(PENDING_KEY) ?? "", "this tab rewrote the queue without the older tab's Stop").toContain(GYM_STOP)

    // and the next opening sends it
    const latest = tab.latest()
    tab.unmount()
    renderDevice(latest, { account: USER })
    await wait(3_000)
    expect(account.entry("gym")?.stopped_at).toBe(GYM_STOP)
  })
})
