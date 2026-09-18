/**
 * THE ONE-TIME CLOCK SYNC.
 *
 * `profiles.timezone` defaults to 'UTC', which is not a zone anybody chose —
 * it is the app never having asked. Every screen that files something by date
 * read it as a real answer, so a session logged at half eleven at night in
 * Copenhagen was filed as tomorrow's.
 *
 * New accounts are fixed at signup. This component is for everyone who signed
 * up before that. The three things it must never do are the three things
 * tested here: overwrite a zone somebody chose, write more than once per
 * browser session, and do anything at all when signed out.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { ClockSync } from "@/components/ClockSync"

/** The browser claims Copenhagen for every test in this file. */
const BROWSER = "Europe/Copenhagen"

function prefs(body: Record<string, unknown>) {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    if (init?.method === "PUT") return { ok: true, status: 200, json: async () => body } as unknown as Response
    return { ok: true, status: 200, json: async () => body } as unknown as Response
  })
  vi.stubGlobal("fetch", fetchMock)
  return calls
}

function puts(calls: { url: string; init?: RequestInit }[]) {
  return calls.filter((c) => c.init?.method === "PUT")
}

beforeEach(() => {
  window.sessionStorage.clear()
  // The component asks the browser for its zone and then checks that the zone
  // actually formats — both go through Intl.DateTimeFormat, so both are stubbed.
  // A plain `function`, not an arrow: the component validates the zone with
  // `new Intl.DateTimeFormat(...)` and an arrow cannot be constructed, so an
  // arrow here would make every test pass by the component quietly giving up.
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    function () {
      return {
        resolvedOptions: () => ({ timeZone: BROWSER }),
        format: () => "2026-09-18",
      }
    } as unknown as typeof Intl.DateTimeFormat
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("the clock sync", () => {
  it("writes the browser's zone once when the account still holds the signup default", async () => {
    const calls = prefs({ timezone: "UTC", timezone_source: "signup_default" })

    render(<ClockSync />)

    await waitFor(() => expect(puts(calls)).toHaveLength(1))
    const sent = JSON.parse(String(puts(calls)[0].init?.body)) as Record<string, string>
    expect(sent).toEqual({ timezone: BROWSER, source: "detected" })
  })

  it("never overwrites a zone the person chose", async () => {
    const calls = prefs({ timezone: "America/New_York", timezone_source: "chosen" })

    render(<ClockSync />)

    // Give the effect every chance to do the wrong thing.
    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    await Promise.resolve()
    expect(puts(calls)).toHaveLength(0)
  })

  it("never overwrites a zone already detected, so two devices do not fight", async () => {
    const calls = prefs({ timezone: "Asia/Bangkok", timezone_source: "detected" })

    render(<ClockSync />)

    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    expect(puts(calls)).toHaveLength(0)
  })

  it("does nothing when signed out", async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init })
        return { ok: false, status: 401, json: async () => ({ error: "Unauthorized" }) } as unknown as Response
      })
    )

    render(<ClockSync />)

    await waitFor(() => expect(calls).toHaveLength(1))
    expect(puts(calls)).toHaveLength(0)
  })

  it("asks once per browser session, not once per page", async () => {
    const calls = prefs({ timezone: "UTC", timezone_source: "signup_default" })

    const first = render(<ClockSync />)
    await waitFor(() => expect(puts(calls)).toHaveLength(1))
    first.unmount()

    // A second page load in the same tab.
    render(<ClockSync />)
    await Promise.resolve()
    expect(puts(calls)).toHaveLength(1)
  })

  it("does not write when the zone it would write is the one already stored", async () => {
    // Somebody in London whose account says UTC and nobody set it: the zones
    // differ in name but a pointless write is still a write, and this guards
    // the identical case.
    const calls = prefs({ timezone: BROWSER, timezone_source: "signup_default" })

    render(<ClockSync />)

    await waitFor(() => expect(calls.length).toBeGreaterThan(0))
    expect(puts(calls)).toHaveLength(0)
  })

  it("survives storage being blocked, and survives the request failing", async () => {
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("The operation is insecure.")
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch")
      })
    )

    // Neither throws out of the effect, which would take the whole page down.
    expect(() => render(<ClockSync />)).not.toThrow()
    await Promise.resolve()
    blocked.mockRestore()
  })
})
