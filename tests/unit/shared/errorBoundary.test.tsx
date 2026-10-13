// @vitest-environment jsdom
/**
 * ONE BROKEN PART OF A SCREEN DOES NOT TAKE THE PAGE WITH IT — AND IS REPORTED.
 *
 * This was the browser test "a broken panel does not take the page with it,
 * and is reported", on `/test/crash`, a lab page that is a 404 in the
 * production build CI serves. The only boundary on a product route wraps the
 * time tracker's screens, and nothing a test can do from outside makes one of
 * them throw while rendering (`tests/e2e/error-reporting.spec.ts` says so). So
 * the boundary is rendered here around a child that throws, beside a sibling
 * that does not — the same arrangement the lab page had.
 *
 * What stays in the browser: that an error raised in a real page reaches the
 * database through `ErrorReporting`, which `error-reporting.spec.ts` still owns.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { useState } from "react"

const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }))
vi.mock("@/src/shared/errorReportService", () => ({ reportError }))

import { ErrorBoundary } from "@/src/shared/components/ErrorBoundary"

let breaks = true

function Panel() {
  if (breaks) throw new Error("the panel fell over")
  return <p>The panel works</p>
}

function Page() {
  const [clicks, setClicks] = useState(0)
  return (
    <div>
      <ErrorBoundary label="the test panel">
        <Panel />
      </ErrorBoundary>
      <button type="button" onClick={() => setClicks((n) => n + 1)}>
        Pressed {clicks} times
      </button>
    </div>
  )
}

beforeEach(() => {
  breaks = true
  reportError.mockClear()
  // React logs every caught render error to the console; that is noise here,
  // the report below is what is asserted.
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("a panel that throws while rendering", () => {
  it("gets a way forward in words, and the rest of the page still works", () => {
    render(<Page />)

    expect(screen.getByText("Something went wrong with the test panel.")).toBeInTheDocument()
    expect(screen.getByText(/It has been reported/)).toBeInTheDocument()

    const sibling = screen.getByRole("button", { name: "Pressed 0 times" })
    fireEvent.click(sibling)
    expect(screen.getByRole("button", { name: "Pressed 1 times" })).toBeInTheDocument()
  })

  it("is reported with the error and where in the tree it happened", () => {
    render(<Page />)

    expect(reportError).toHaveBeenCalledTimes(1)
    const [error, context] = reportError.mock.calls[0]!
    expect((error as Error).message).toBe("the panel fell over")
    expect((context as { componentStack?: string }).componentStack).toMatch(/Panel/)
  })

  it("tries again on request, and shows the panel once it renders", () => {
    render(<Page />)
    breaks = false

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))

    expect(screen.getByText("The panel works")).toBeInTheDocument()
    expect(screen.queryByText(/Something went wrong/)).toBeNull()
  })
})
