// @vitest-environment jsdom
/**
 * A QUESTION THAT NEVER GETS AN ANSWER ENDS IN WORDS, NOT IN A SPINNER.
 *
 * Moved here from `tests/e2e/error-handling.spec.ts`, where it held a browser
 * route open for 35 real seconds to watch the page give up at 30. Everything it
 * asserted happens inside `QAPage`: the button reads "Thinking...", the page's
 * own abort timer fires, and the abort becomes a sentence in the conversation.
 * The clock is faked here and the server is a request that never answers — so
 * the page's real timer is what ends it, in milliseconds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react"
import { QAPage } from "@/src/qa/components/QAPage"
import { TIMEOUT_CONFIG } from "@/src/qa/config"

/**
 * A server that takes the question and never replies — until the page gives up on it.
 *
 * The rejection is what a browser's fetch gives an aborted request: an Error
 * named "AbortError". Not jsdom's `DOMException`, which — unlike every
 * browser's and Node's — is not an `instanceof Error`, so the page would read it
 * as "Unexpected error" for a reason no person's browser can produce.
 */
function serverThatNeverAnswers() {
  return vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" })),
      )
    }),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  // jsdom has no layout, so no scrolling; the page scrolls its log on every message.
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("the coach page when the answer never comes", () => {
  it("shows it is thinking, then says the request timed out", async () => {
    const fetch = serverThatNeverAnswers()
    vi.stubGlobal("fetch", fetch)
    render(<QAPage />)

    fireEvent.change(screen.getByTestId("qa-input"), { target: { value: "Test question" } })
    fireEvent.click(screen.getByTestId("qa-submit"))

    expect(fetch).toHaveBeenCalledWith("/api/qa", expect.objectContaining({ method: "POST" }))
    expect(screen.getByTestId("qa-submit")).toHaveTextContent("Thinking...")
    expect(screen.queryByText(/^Error:/)).toBeNull()

    // A moment before the page's own deadline it is still waiting, not failed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TIMEOUT_CONFIG.qaRequestTimeoutMs - 1)
    })
    expect(screen.getByTestId("qa-submit")).toHaveTextContent("Thinking...")

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(screen.getByText("Error: Request timed out. Please try again.")).toBeInTheDocument()
    expect(screen.getByTestId("qa-submit")).toHaveTextContent("Ask the coach")
  })
})
