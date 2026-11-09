// @vitest-environment jsdom
/**
 * A STOP HELD FOR THE CHECK IS NEVER CALLED SAVED, AND IS NOT LOST ON THE WAY OUT.
 *
 * D2 holds a Stop tapped while the tracker checks, and replays it when the
 * check lands. Two gaps were seen in the production-build audit
 * (Plans/time-tracker-leftovers.md, "Seen and not fixed"):
 *
 * - Between the check's answer and the replayed Stop being queued, the badge
 *   said "Saved." for a moment, about a Stop that had not been sent.
 * - A tab closed or hidden while the Stop was held lost it: the Stop lived
 *   only in memory until the check answered, and the check never did.
 *
 * The Stop is kept on disk while it waits, and the next opening holds it for
 * its own check. Running it on the way out instead would skip that check: the
 * other device's earlier Stop would lose to this one (a code review, 2026-11-09).
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { claimBrowserCopy } from "@/src/timetrack/browserOwner"
import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)

let releaseReads: (() => void) | null = null
let holdReads = false

const main = () => within(screen.getByRole("main"))

/** signed in, as `/time` is: a change made before the account answers is kept on disk only for a known account */
const USER = "user-1"

function serve(copy: TimetrackState) {
  claimBrowserCopy(USER)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, USER))
  holdReads = true
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    if (!init?.method && holdReads) await new Promise<void>((resolve) => (releaseReads = resolve))
    return account.fetch(url, init)
  })
  return account
}

function aRunningGym() {
  const copy = startTimer(
    baseState(),
    { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 7, 10, 9, 0).toISOString(),
  ).state
  return { copy, gymId: copy.entries.find((e) => e.duration < 0)!.id }
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  holdReads = false
  releaseReads = null
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("a Stop held while the tracker checks", () => {
  test("the badge never says Saved before the Stop has reached the account", async () => {
    const { copy, gymId } = aRunningGym()
    const account = serve(copy)
    render(<TogglLab account={USER} />)
    await wait(50)
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))

    // every label the badge ever had, each with whether the Stop had landed by then
    const said: { label: string; stopLanded: boolean }[] = []
    const landed = () => Boolean(account.entry(gymId)?.stopped_at)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.oldValue) said.push({ label: record.oldValue, stopLanded: landed() })
        const now = (record.target as Element).getAttribute("aria-label")
        if (now) said.push({ label: now, stopLanded: landed() })
      }
    })
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-label"], attributeOldValue: true })

    await wait(1_000)
    holdReads = false
    releaseReads?.()
    for (let i = 0; i < 12 && !landed(); i++) await wait(500)
    observer.disconnect()

    expect(landed(), "the held Stop never reached the account").toBe(true)
    const early = said.filter((s) => s.label.startsWith("Saved.") && !s.stopLanded)
    expect(early.map((s) => s.label), "the badge said Saved while the Stop was still waiting").toEqual([])
  })

  test("hiding or closing the tab while the Stop waits does not lose it", async () => {
    const { copy, gymId } = aRunningGym()
    const account = serve(copy)
    render(<TogglLab account={USER} />)
    await wait(50)
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(500)

    // the tab goes away before the check has answered
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" })
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
      window.dispatchEvent(new Event("pagehide"))
    })
    cleanup()
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" })

    // opened again later, with the account answering at once
    holdReads = false
    releaseReads?.()
    render(<TogglLab account={USER} />)
    for (let i = 0; i < 12 && !account.entry(gymId)?.stopped_at; i++) await wait(500)

    expect(account.entry(gymId)?.stopped_at, "the Stop tapped before the tab closed").toBeTruthy()
  })

  test("a kept Stop still waits for the check: the other device's earlier Stop stands", async () => {
    const { copy, gymId } = aRunningGym()
    const account = serve(copy)
    render(<TogglLab account={USER} />)
    await wait(50)
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(500)
    cleanup()

    // the other device stopped Gym at 10:00, before this phone's tap at noon
    const tenOClock = new Date(2026, 7, 10, 10, 0).toISOString()
    account.stop(gymId, tenOClock)
    holdReads = false
    releaseReads?.()
    render(<TogglLab account={USER} />)
    await wait(6_000)

    expect(Date.parse(String(account.entry(gymId)?.stopped_at)), "the other device's 10:00 Stop").toBe(Date.parse(tenOClock))
  })

  test("a kept Stop does not run on a reopen whose check fails, and runs once one lands", async () => {
    const { copy, gymId } = aRunningGym()
    const account = serve(copy)
    render(<TogglLab account={USER} />)
    await wait(50)
    const tappedAt = Date.now()
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(500)
    cleanup()

    // the other device stops Gym at 10:00 while this phone has no signal
    const tenOClock = new Date(2026, 7, 10, 10, 0).toISOString()
    account.stop(gymId, tenOClock)
    holdReads = false
    releaseReads?.()
    account.online = false
    render(<TogglLab account={USER} />)
    await wait(6_000)
    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(6_000)

    expect(Date.parse(String(account.entry(gymId)?.stopped_at)), "the other device's 10:00 Stop").toBe(Date.parse(tenOClock))
    expect(Date.parse(String(account.entry(gymId)?.stopped_at))).not.toBe(tappedAt)
  })
})
