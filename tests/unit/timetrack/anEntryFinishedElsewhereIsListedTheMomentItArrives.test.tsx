// @vitest-environment jsdom
/**
 * AN ENTRY THE OTHER DEVICE FINISHED IS IN THE PHONE LIST THE MOMENT IT ARRIVES.
 *
 * Found by the reopen rig (`tests/e2e/timelog-guard/reopen.spec.ts`, cells
 * "timer on pc, PC stop, phone back"): the PC starts a timer and stops it a few
 * seconds later; the phone comes back and its list leaves that entry out, the
 * word "planned" in its place and the badge on "Saved", for up to ten seconds.
 *
 * With no timer running the phone reads "now" once every ten seconds, and not
 * at all while its timers are paused (a page in the background, a frozen tab).
 * An entry that starts after that old "now" is "planned" (`isPlanned`), and the
 * list and the day total leave a planned entry out. The PC's entry was only
 * seconds old, so it started after the phone's "now".
 *
 * Fixed in two places: the phone reads "now" again when rows from another
 * device arrive, and when the page comes back (visible, shown, focused).
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)
const at = (ms: number) => new Date(NOON.getTime() + ms)

/** an entry the other device started `startSec` after noon and stopped `stopSec` after noon */
function finishedElsewhere(startSec: number, stopSec: number) {
  const start = at(startSec * 1000).toISOString()
  const stop = at(stopSec * 1000).toISOString()
  return {
    ...entry("pc", "2026-08-10", "12:00", "12:00", { description: "Call from the PC", projectId: null }),
    start,
    stop,
    duration: stopSec - startSec,
  }
}

const main = () => within(screen.getByRole("main"))

/** a phone: its rows say "planned" beside the name */
function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

async function openPhone(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  for (let i = 0; i < 10 && !screen.queryByRole("button", { name: /^Saved\./ }); i++) await wait(500)
  return account
}

/** the clock moves on while the page's own timers do not run: a background page, a frozen tab */
function theClockMovesOnWithTheTimersAsleep(seconds: number) {
  vi.setSystemTime(at(seconds * 1000))
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  window.history.replaceState(null, "", "/test/toggl")
  asPhone()
})

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the phone, idle, whose clock last ticked a few seconds ago", () => {
  test("lists an entry the PC started and stopped seconds ago, as soon as it arrives", async () => {
    const account = await openPhone(baseState({ entries: [] }))
    // the PC works 3 s to 6 s past noon; the phone's own clock has not ticked since it opened
    account.add("timetrack_entries", stateToRows(baseState({ entries: [finishedElsewhere(3, 6)] }), "user-1").timetrack_entries[0] as never)
    theClockMovesOnWithTheTimersAsleep(8)

    // the phone hears of it: coming back online asks the account, and nothing else moves the phone's clock
    window.dispatchEvent(new Event("online"))
    await wait(100)

    expect(main().queryAllByText(/planned/i), "the finished entry is drawn as planned").toEqual([])
    expect(main().getByText("Call from the PC"), "the finished entry is not in the list").toBeInTheDocument()
  })

  test("lists an entry it already holds once the page comes back from hours asleep", async () => {
    // the PC's entry was fetched while it still started after the phone's "now"
    await openPhone(baseState({ entries: [finishedElsewhere(20, 30)] }))
    expect(main().getAllByText(/planned/i).length, "the set-up should start with the entry planned").toBeGreaterThan(0)

    // two hours pass with the page's timers paused, then the page is shown again
    theClockMovesOnWithTheTimersAsleep(2 * 3600)
    window.dispatchEvent(new Event("pageshow"))
    await wait(100)

    expect(main().queryAllByText(/planned/i), "the entry is still drawn as planned").toEqual([])
    expect(main().getByText("Call from the PC")).toBeInTheDocument()
  })
})
