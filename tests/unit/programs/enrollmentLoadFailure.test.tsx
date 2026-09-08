/**
 * A FAILED REQUEST IS NOT AN EMPTY LIST.
 *
 * Both failure paths in this hook wrote `store.data = []`, so a dropped request
 * became "you have no training programs" — and the screen below offers the
 * catalogue to somebody who is three weeks into StrongLifts. The list now keeps
 * what was last known and reports that it could not be refreshed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useActiveEnrollments, refreshEnrollments } from "@/src/programs/hooks/useEnrollment"
import type { ProgramEnrollment } from "@/src/programs/types"

const enrollment = (id: string): ProgramEnrollment =>
  ({
    id,
    program_id: "stronglifts-5x5",
    level: "beginner",
    unitSystem: "kg",
    isActive: true,
    cursor: { cycle: 1, week: 1, dayIndex: 0, sessionCount: 0 },
    exerciseState: {},
  }) as unknown as ProgramEnrollment

/**
 * The store is module-level on purpose — one request however many components
 * ask — so each test seeds it with its OWN programs rather than sharing a name
 * with the test before it.
 */
let n = 0
/** Called ONCE per test — the same array on every render, as a real page gives. */
const freshInitial = () => {
  const seeded = [enrollment(`seed-${++n}`)]
  return seeded
}

describe("the enrollment list when the server cannot be reached", () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  it("keeps the programs it already knew about, and says it is out of date", async () => {
    const initial = freshInitial()
    const { result } = renderHook(() => useActiveEnrollments(initial))
    expect(result.current.enrollments).toHaveLength(1)
    expect(result.current.error).toBeNull()

    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))))
    await act(async () => {
      await refreshEnrollments()
    })

    await waitFor(() => expect(result.current.error).toMatch(/could not be loaded/i))
    expect(
      result.current.enrollments,
      "the program must not disappear because a request failed"
    ).toHaveLength(1)
  })

  it("treats a non-ok response the same as a dropped one", async () => {
    const initial = freshInitial()
    const { result } = renderHook(() => useActiveEnrollments(initial))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => [] }) as unknown as Response)
    )
    await act(async () => {
      await refreshEnrollments()
    })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.enrollments).toHaveLength(1)
  })

  it("clears the warning once a refresh succeeds", async () => {
    const initial = freshInitial()
    const { result } = renderHook(() => useActiveEnrollments(initial))
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))))
    await act(async () => {
      await refreshEnrollments()
    })
    await waitFor(() => expect(result.current.error).toBeTruthy())

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => [enrollment("a"), enrollment("b")] }) as unknown as Response)
    )
    await act(async () => {
      await refreshEnrollments()
    })
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(result.current.enrollments).toHaveLength(2)
  })

  it("refuses an answer that is not a list rather than emptying itself", async () => {
    const initial = freshInitial()
    const { result } = renderHook(() => useActiveEnrollments(initial))
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ oops: true }) }) as unknown as Response)
    )
    await act(async () => {
      await refreshEnrollments()
    })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.enrollments).toHaveLength(1)
  })
})
