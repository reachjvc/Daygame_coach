import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { type ReactNode, createElement, useState } from "react"
import {
  HistoryBarrierProvider,
  useHistoryBarrier,
} from "@/src/shared/HistoryBarrierContext"

// Wrapper for all tests
function wrapper({ children }: { children: ReactNode }) {
  return createElement(HistoryBarrierProvider, null, children)
}

describe("useHistoryBarrier", () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>
  let backSpy: ReturnType<typeof vi.spyOn>
  let addEventSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, "pushState").mockImplementation(() => {})
    backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {})
    addEventSpy = vi.spyOn(window, "addEventListener")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("throws if used outside provider", () => {
    expect(() => {
      renderHook(() => useHistoryBarrier(true, vi.fn()))
    }).toThrow("useHistoryBarrier must be used within a HistoryBarrierProvider")
  })

  it("pushes history entry when active becomes true", () => {
    renderHook(() => useHistoryBarrier(true, vi.fn()), { wrapper })

    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ __barrier: expect.any(Number) }),
      ""
    )
  })

  it("does not push history entry when active is false", () => {
    renderHook(() => useHistoryBarrier(false, vi.fn()), { wrapper })

    expect(pushStateSpy).not.toHaveBeenCalled()
  })

  it("calls onBack when popstate fires with active barrier", () => {
    const onBack = vi.fn()
    renderHook(() => useHistoryBarrier(true, onBack), { wrapper })

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("does not call onBack when popstate fires with no active barrier", () => {
    const onBack = vi.fn()
    renderHook(() => useHistoryBarrier(false, onBack), { wrapper })

    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    expect(onBack).not.toHaveBeenCalled()
  })

  it("LIFO: only the top barrier fires on popstate", () => {
    const onBack1 = vi.fn()
    const onBack2 = vi.fn()

    renderHook(
      () => {
        useHistoryBarrier(true, onBack1)
        useHistoryBarrier(true, onBack2)
      },
      { wrapper }
    )

    // First popstate should fire barrier 2 (top of stack)
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    expect(onBack2).toHaveBeenCalledTimes(1)
    expect(onBack1).not.toHaveBeenCalled()

    // Second popstate should fire barrier 1
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    expect(onBack1).toHaveBeenCalledTimes(1)
  })

  it("cleans up history entry on programmatic close (active→false)", () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useHistoryBarrier(active, vi.fn()),
      { wrapper, initialProps: { active: true } }
    )

    // Transition active from true to false (programmatic close)
    rerender({ active: false })

    // Should call history.back() to consume the pushed entry
    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it("does not double-back when popstate triggers onBack which sets active=false", () => {
    // This tests the critical race condition:
    // popstate fires → onBack sets active=false → effect cleanup runs → remove(id) → not found → no-op
    function TestComponent() {
      const [active, setActive] = useState(true)
      useHistoryBarrier(active, () => setActive(false))
      return null
    }

    renderHook(() => {}, {
      wrapper: ({ children }) =>
        createElement(
          HistoryBarrierProvider,
          null,
          createElement(TestComponent),
          children
        ),
    })

    // Simulate browser back - popstate fires, onBack sets active=false
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    // history.back() should NOT be called because the barrier was already
    // consumed by the popstate handler. The remove() call from the effect
    // cleanup should find the barrier already gone and no-op.
    expect(backSpy).not.toHaveBeenCalled()
  })

  it("suppresses popstate from programmatic close", () => {
    const onBack = vi.fn()

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useHistoryBarrier(active, onBack),
      { wrapper, initialProps: { active: true } }
    )

    // Programmatic close triggers history.back() which will fire popstate
    rerender({ active: false })

    // Now simulate the popstate that would result from history.back()
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    // onBack should NOT be called - it was suppressed
    expect(onBack).not.toHaveBeenCalled()
  })

  it("cleans up barrier on unmount while active", () => {
    const { unmount } = renderHook(
      () => useHistoryBarrier(true, vi.fn()),
      { wrapper }
    )

    unmount()

    // Should clean up the history entry
    expect(backSpy).toHaveBeenCalledTimes(1)
  })

  it("uses latest onBack callback via ref", () => {
    const onBack1 = vi.fn()
    const onBack2 = vi.fn()

    const { rerender } = renderHook(
      ({ onBack }: { onBack: () => void }) => useHistoryBarrier(true, onBack),
      { wrapper, initialProps: { onBack: onBack1 } }
    )

    // Update callback without changing active
    rerender({ onBack: onBack2 })

    // Trigger popstate - should call the LATEST callback
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    expect(onBack1).not.toHaveBeenCalled()
    expect(onBack2).toHaveBeenCalledTimes(1)
  })
})
