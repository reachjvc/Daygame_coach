// @vitest-environment jsdom
/**
 * A TIMER STOPPED A MOMENT AFTER IT STARTED IS NOT "PLANNED".
 *
 * Found 2026-11-05 while capturing the screens for the Toggl comparison
 * (Plans/toggl-parity.md, Phase 0): Start and then Stop within a second left a
 * 0:00 entry striped and labelled "planned", and the day read "0:00 planned",
 * until up to ten seconds later. With nothing running the tracker's clock
 * ticks every ten seconds, and a start or stop did not move it, so the new
 * entry's start was later than the clock's "now", which is what "planned"
 * means. Toggl Track keeps a short entry as it is, so the entry stays; only
 * the label was wrong.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)
const main = () => within(screen.getByRole("main"))
/** on a phone, Start and Stop are the round buttons of the bar at the bottom (Plans/toggl-parity.md Phase 1) */
const bar = () => within(screen.getByTestId("run-bar"))

async function open(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  for (let i = 0; i < 10 && !screen.queryByRole("button", { name: /^Saved\./ }); i++) await wait(500)
}

/** a phone: its rows say "planned" beside the name */
function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("Start, then Stop at once", () => {
  test("keeps the entry and does not call it planned", async () => {
    asPhone()
    await open(baseState({ entries: [] }))
    // the idle clock last ticked a few seconds ago
    await wait(8_000)

    fireEvent.click(bar().getByRole("button", { name: "Start timer" }))
    await wait(100)
    fireEvent.click(bar().getByRole("button", { name: "Stop timer" }))

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
    expect(stored.entries).toHaveLength(1)
    expect(main().queryAllByText(/planned/i)).toEqual([])
  })
})
