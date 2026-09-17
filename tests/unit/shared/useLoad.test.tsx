/**
 * A FAILED LOAD NEVER ARRIVES AS EMPTY DATA.
 *
 * Every assertion here is a shape a hand-written loader in this app actually
 * shipped. The one that matters most is the first: `r.ok ? r.json() : []` was
 * live in `LiftHistory`, so a 500 from the server rendered as "no lifts" to
 * somebody with three years of them. A test that only covered the thrown-error
 * case would have passed against that code.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { useLoad } from "@/src/shared/useLoad"

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * A fetch that answers with whatever is described.
 *
 * `Promise.resolve` around the result matters: real `fetch` always returns a
 * promise, and a stub that returns a bare object passes `.then is not a
 * function` into the hook rather than exercising it.
 */
function stubFetch(impl: () => Promise<Response> | Response) {
  const spy = vi.fn(() => Promise.resolve(impl()))
  vi.stubGlobal("fetch", spy)
  return spy
}

const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response

describe("useLoad", () => {
  it("a non-ok response is failed, NOT ready with empty data", async () => {
    stubFetch(() => ({ ok: false, status: 500, json: async () => [] }) as unknown as Response)

    const { result } = renderHook(() => useLoad("/api/thing", (b) => b as unknown[]))

    await waitFor(() => expect(result.current.state).not.toBe("loading"))
    expect(
      result.current.state,
      "a 500 became data — this is the bug the module exists to prevent",
    ).toBe("failed")
  })

  it("a thrown request is failed", async () => {
    stubFetch(() => Promise.reject(new Error("offline")))

    const { result } = renderHook(() => useLoad("/api/thing", (b) => b as unknown[]))

    await waitFor(() => expect(result.current.state).toBe("failed"))
  })

  it("a body the caller cannot read is failed, not ready", async () => {
    stubFetch(() => ok({ unexpected: true }))

    const { result } = renderHook(() =>
      useLoad("/api/thing", (b) => {
        if (!Array.isArray(b)) throw new Error("expected a list")
        return b
      }),
    )

    await waitFor(() => expect(result.current.state).toBe("failed"))
  })

  it("a good response is ready, and carries the parsed value", async () => {
    stubFetch(() => ok([{ id: 1 }]))

    const { result } = renderHook(() => useLoad("/api/thing", (b) => b as { id: number }[]))

    await waitFor(() => expect(result.current.state).toBe("ready"))
    expect(result.current).toEqual({ state: "ready", data: [{ id: 1 }] })
  })

  /**
   * An empty list is a real answer and must stay distinguishable from a failure.
   * This is the assertion that stops someone "fixing" the first test by treating
   * emptiness as failure.
   */
  it("an empty list is ready, not failed", async () => {
    stubFetch(() => ok([]))

    const { result } = renderHook(() => useLoad("/api/thing", (b) => b as unknown[]))

    await waitFor(() => expect(result.current.state).toBe("ready"))
    expect(result.current).toEqual({ state: "ready", data: [] })
  })

  it("retry asks again and can succeed", async () => {
    let call = 0
    const spy = stubFetch(() => {
      call += 1
      return call === 1
        ? ({ ok: false, status: 500, json: async () => null }) as unknown as Response
        : ok([{ id: 7 }])
    })

    const { result } = renderHook(() => useLoad("/api/thing", (b) => b as { id: number }[]))

    await waitFor(() => expect(result.current.state).toBe("failed"))
    const failed = result.current as { state: "failed"; retry: () => void }

    act(() => failed.retry())

    await waitFor(() => expect(result.current.state).toBe("ready"))
    expect(result.current).toEqual({ state: "ready", data: [{ id: 7 }] })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  /**
   * `parse` is almost always an inline arrow, so it is a new function every
   * render. If identity were a dependency this would fetch forever — which is
   * a performance bug that looks like nothing locally and like a hammered API
   * in production.
   */
  it("does not refetch when only the parse function's identity changes", async () => {
    const spy = stubFetch(() => ok([1, 2, 3]))

    const { result, rerender } = renderHook(() =>
      // A fresh arrow on every render, deliberately.
      useLoad("/api/thing", (b) => b as number[]),
    )

    await waitFor(() => expect(result.current.state).toBe("ready"))
    rerender()
    rerender()

    expect(spy).toHaveBeenCalledTimes(1)
  })
})
