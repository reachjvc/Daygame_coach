// @vitest-environment jsdom
/**
 * A BROWSER THAT HOLDS NO COPY STILL OPENS THE WAY THE ACCOUNT SAYS.
 *
 * Found by the account-switching audit (Phase 8 of Plans/toggl-parity.md). Log
 * Out removes this browser's copy, and a new phone never had one: the tracker
 * then opens on the empty workspace a browser starts with, and the account's
 * settings arrive a moment later. Two things were decided once, on that empty
 * workspace, and never again:
 *
 *  - a new report's rounding, so "Default report rounding → Round by default"
 *    did nothing on the first open after signing in: Reports added up raw
 *    minutes (`report-rounding.spec.ts`);
 *  - the phone's first tab, so Settings › First tab opened Timer anyway, and
 *    only the NEXT open showed Calendar (`first-tab.spec.ts`).
 *
 * The week start already had a catch-up (`followWeekStart`). Rounding now has
 * one too, `followRounding`, and the first tab follows the account's choice
 * when it arrives — but only until the person goes somewhere themselves.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { defaultReportConfig, followRounding } from "@/src/timetrack/reportsService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { RoundingConfig, TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)
const UP_15: RoundingConfig = { enabled: true, mode: "up", minutes: 15 }
const OFF: RoundingConfig = { enabled: false, mode: "nearest", minutes: 15 }

function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** The account as another browser left it; this browser holds nothing */
function openWithNoCopy(onAccount: TimetrackState, address = "/test/toggl", { offline = false } = {}) {
  window.history.replaceState(null, "", address)
  const account = fakeAccount(stateToRows(onAccount, "user-1"))
  account.online = !offline
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  return account
}

const tabShown = () => document.querySelector('nav[aria-label="Sections"] button[aria-current="page"]')?.textContent ?? ""

beforeAll(() => {
  // jsdom has no layout; the sections' tab strip scrolls its tab into view
  Element.prototype.scrollIntoView = () => {}
})

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("Reports, opened first on a browser with no copy", () => {
  test("start with the account's default rounding", async () => {
    const copy = baseState({ entries: [entry(1, "2026-08-10", "09:00", "09:07", { description: "billable minutes" })] })
    openWithNoCopy({ ...copy, workspace: { ...copy.workspace, rounding: UP_15 } }, "/test/toggl?view=reports")
    await wait(3_000)

    expect(
      screen.getByText(/^Rounding: /).textContent,
      "the report kept the rounding of the empty workspace it opened with",
    ).toBe("Rounding: up 15m")
  })
})

describe("followRounding", () => {
  test("moves a report still on the old default to the new one", () => {
    const report = defaultReportConfig("2026-08-10", 1, OFF)
    expect(followRounding(report, OFF, UP_15).rounding).toEqual(UP_15)
  })

  test("leaves a rounding chosen in the report alone", () => {
    const report = { ...defaultReportConfig("2026-08-10", 1, OFF), rounding: { enabled: true, mode: "down" as const, minutes: 6 } }
    expect(followRounding(report, OFF, UP_15)).toBe(report)
  })
})

describe("a phone with no copy", () => {
  test("opens on the account's First tab", async () => {
    asPhone()
    const copy = baseState()
    openWithNoCopy({ ...copy, user: { ...copy.user, firstTab: "calendar" } })
    await wait(3_000)

    expect(tabShown(), "the phone opened on Timer although the account says Calendar").toMatch(/Calendar/)
    expect(new URLSearchParams(window.location.search).get("view"), "the address does not say where the phone is").toBe(
      "calendar",
    )
  })

  test("does not take the person off a tab they went to before the account answered", async () => {
    asPhone()
    const copy = baseState()
    // no signal yet: the account answers only after the person has gone somewhere
    const account = openWithNoCopy({ ...copy, user: { ...copy.user, firstTab: "calendar" } }, "/test/toggl", { offline: true })
    await wait(100)
    expect(tabShown()).toMatch(/Timer/)

    const sections = within(document.querySelector('nav[aria-label="Sections"]') as HTMLElement)
    fireEvent.click(sections.getByRole("button", { name: /Reports/ }))
    await wait(100)
    expect(tabShown()).toMatch(/Reports/)

    account.online = true
    window.dispatchEvent(new Event("online"))
    await wait(5_000)

    const held = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<TimetrackState>
    expect(held.user?.firstTab, "the account's settings never arrived, so this proves nothing").toBe("calendar")
    expect(tabShown(), "the account's First tab took the person off the tab they chose").toMatch(/Reports/)
  })
})
