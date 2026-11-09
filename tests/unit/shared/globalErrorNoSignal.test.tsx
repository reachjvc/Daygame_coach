// @vitest-environment jsdom

/**
 * THE LAST-RESORT CRASH PAGE, WITH NO SIGNAL (alpha slow-pass-04).
 *
 * Reloading /audit on a phone in airplane mode came up as "This page could not
 * load. The fault has been reported." for what was, as far as the person could
 * tell, plain no signal; and with no signal nothing can have been reported
 * yet (reports wait in the browser). Offline, the page says so instead.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

vi.mock("@/src/shared/errorReportService", () => ({ reportError: vi.fn() }))
import GlobalError from "@/app/global-error"
import { reportError } from "@/src/shared/errorReportService"

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online })
}

afterEach(() => {
  cleanup()
  setOnline(true)
  vi.mocked(reportError).mockClear()
})

describe("global-error", () => {
  it("with signal: the fault is named as reported", () => {
    setOnline(true)
    render(<GlobalError error={new Error("boom")} reset={() => {}} />)
    expect(screen.getByRole("heading").textContent).toBe("This page could not load")
    expect(document.body.textContent).toContain("The fault has been reported.")
  })

  it("with no signal: says No signal, never that a fault was reported, and still keeps the report", () => {
    setOnline(false)
    render(<GlobalError error={new Error("Failed to fetch")} reset={() => {}} />)
    expect(screen.getByRole("heading").textContent).toBe("No signal")
    expect(document.body.textContent).not.toContain("reported")
    expect(document.body.textContent).toContain("Anything you had saved is safe")
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy()
    // Sent on a later visit, when there is signal: the fault is still worth knowing.
    expect(reportError).toHaveBeenCalledTimes(1)
  })
})
