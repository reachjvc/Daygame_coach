// @vitest-environment jsdom
/**
 * THE BADGE SAYS WHEN IT LAST HEARD FROM THE ACCOUNT (design rule D6).
 *
 * "Saved" used to describe sending only. An offline phone with nothing to send
 * said "Saved" over a timer the PC had stopped hours before (sync defect #4 in
 * Plans/time-tracker-like-toggl.md). Now it also says when this device last
 * checked the account, turns amber after five minutes without a check or when
 * the last one failed, and checks again when tapped.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { SyncBadge } from "@/src/timetrack/components/SyncBadge"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

const NOW = Date.parse("2026-08-10T12:00:00.000Z")
const MIN = 60_000

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

function badge(check: { checking: boolean; lastCheckedAt: number | null; failed: boolean }, onCheck = () => {}) {
  render(<SyncBadge status="synced" pending={0} check={check} nowMs={NOW} onCheck={onCheck} />)
  return screen.getByRole("button")
}

describe("the badge", () => {
  test("says Checking… until the first check lands", () => {
    const button = badge({ checking: true, lastCheckedAt: null, failed: false })
    expect(button).toHaveTextContent("Checking…")
  })

  test("says when it last checked", () => {
    expect(badge({ checking: false, lastCheckedAt: NOW - 20_000, failed: false })).toHaveTextContent("Saved · checked just now")
    cleanup()
    expect(badge({ checking: false, lastCheckedAt: NOW - 3 * MIN, failed: false })).toHaveTextContent("Saved · checked 3 min ago")
  })

  test("is quiet while the check is fresh, and amber after five minutes without one", () => {
    expect(badge({ checking: false, lastCheckedAt: NOW - 4 * MIN, failed: false }).dataset.tone).toBe("quiet")
    cleanup()
    const stale = badge({ checking: false, lastCheckedAt: NOW - 6 * MIN, failed: false })
    expect(stale.dataset.tone).toBe("amber")
    expect(stale).toHaveTextContent("not checked for 6 min")
  })

  test("is amber, and says so, when the last check failed", () => {
    const failed = badge({ checking: false, lastCheckedAt: NOW - 20_000, failed: true })
    expect(failed.dataset.tone).toBe("amber")
    expect(failed).toHaveTextContent("Couldn't reach the server")
    expect(failed.getAttribute("aria-label")).toContain("Couldn't reach the server — this might be out of date")
  })

  test("still reads as saved to a screen reader, whatever the check says", () => {
    // what the browser suite waits on: `savedToAccount` in tests/e2e/helpers/timetrack.ts
    expect(badge({ checking: false, lastCheckedAt: NOW - 20_000, failed: false }).getAttribute("aria-label")).toMatch(/^Saved\./)
    cleanup()
    expect(badge({ checking: false, lastCheckedAt: NOW - 9 * MIN, failed: false }).getAttribute("aria-label")).toMatch(/^Saved\./)
  })

  test("checks again when tapped", () => {
    const onCheck = vi.fn()
    fireEvent.click(badge({ checking: false, lastCheckedAt: NOW - 3 * MIN, failed: false }, onCheck))
    expect(onCheck).toHaveBeenCalledTimes(1)
  })
})

describe("what the badge is told", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  test("a check that lands is the time it last heard, and tapping asks again", async () => {
    const state = baseState()
    const account = fakeAccount(stateToRows(state, "user-1"))
    const fetch = vi.fn(account.fetch)
    vi.stubGlobal("fetch", fetch)
    const device = renderDevice(state)
    expect(device.sync().check.checking, "it should say Checking… from the moment it opens").toBe(true)
    await wait(100)
    expect(device.sync().check).toMatchObject({ checking: false, failed: false })
    expect(device.sync().check.lastCheckedAt).toBeGreaterThanOrEqual(NOW)

    await wait(3 * MIN)
    const before = fetch.mock.calls.length
    device.sync().checkNow()
    await wait(100)
    expect(fetch.mock.calls.length, "tapping the badge did not ask the account").toBeGreaterThan(before)
    expect(device.sync().check.lastCheckedAt).toBeGreaterThanOrEqual(NOW + 3 * MIN)
  })
})
