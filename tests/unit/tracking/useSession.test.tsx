/**
 * Unit tests for useSession hook
 *
 * Tests navigation-related functionality:
 * - endedSession loading from sessionStorage
 * - endedSession clearing when starting new session
 * - pageshow event re-reading sessionStorage
 *
 * Uses mocked fetch and sessionStorage.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { useSession } from "@/src/tracking/hooks/useSession"

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    _getStore: () => store,
  }
})()

// Mock navigator.vibrate
const mockVibrate = vi.fn()

describe("useSession - endedSession storage", () => {
  const STORAGE_KEY = "daygame_ended_session"
  const mockUserId = "test-user-123"

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockSessionStorage.clear()

    // Setup sessionStorage mock
    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    })

    // Setup navigator.vibrate mock
    Object.defineProperty(navigator, "vibrate", {
      value: mockVibrate,
      writable: true,
    })

    // Mock fetch to return no active session by default
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: null, approaches: [] }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("loads endedSession from sessionStorage on mount", async () => {
    // Arrange: Store ended session info that's within the hour
    const endedInfo = {
      id: "session-123",
      approachCount: 5,
      duration: "01:30:00",
      endedAt: new Date().toISOString(),
    }
    mockSessionStorage.setItem(STORAGE_KEY, JSON.stringify(endedInfo))

    // Act: Render hook
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    // Assert: endedSession should be loaded
    await waitFor(() => {
      expect(result.current.endedSession).toEqual(endedInfo)
    })
  })

  test("does not load endedSession if older than 1 hour", async () => {
    // Arrange: Store ended session info that's older than 1 hour
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const endedInfo = {
      id: "session-123",
      approachCount: 5,
      duration: "01:30:00",
      endedAt: twoHoursAgo.toISOString(),
    }
    mockSessionStorage.setItem(STORAGE_KEY, JSON.stringify(endedInfo))

    // Act: Render hook
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    // Assert: endedSession should be null (expired)
    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false)
    })
    expect(result.current.endedSession).toBeNull()
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  test("clears endedSession when starting a new session", async () => {
    // Arrange: Store ended session info
    const endedInfo = {
      id: "session-123",
      approachCount: 5,
      duration: "01:30:00",
      endedAt: new Date().toISOString(),
    }
    mockSessionStorage.setItem(STORAGE_KEY, JSON.stringify(endedInfo))

    // Mock successful session creation
    const newSession = {
      id: "new-session-456",
      user_id: mockUserId,
      started_at: new Date().toISOString(),
      goal: null,
    }
    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/tracking/session/active") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ session: null, approaches: [] }),
        })
      }
      if (url === "/api/tracking/session" && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(newSession),
        })
      }
      return Promise.reject(new Error("Unexpected fetch"))
    })

    // Act: Render hook and start new session
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    await waitFor(() => {
      expect(result.current.endedSession).toEqual(endedInfo)
    })

    await act(async () => {
      await result.current.startSession({ goal: 5 })
    })

    // Assert: endedSession should be cleared
    expect(result.current.endedSession).toBeNull()
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  test("stores endedSession in sessionStorage when ending session", async () => {
    // Arrange: Set up an active session
    const activeSession = {
      id: "session-789",
      user_id: mockUserId,
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      goal: 5,
    }
    const approaches = [
      { id: "approach-1", session_id: "session-789", timestamp: new Date().toISOString() },
      { id: "approach-2", session_id: "session-789", timestamp: new Date().toISOString() },
    ]

    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/tracking/session/active") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ session: activeSession, approaches }),
        })
      }
      if (url.includes("/end") && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ...activeSession, ended_at: new Date().toISOString() }),
        })
      }
      return Promise.reject(new Error("Unexpected fetch"))
    })

    // Act: Render hook and end session
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    await waitFor(() => {
      expect(result.current.state.isActive).toBe(true)
    })

    await act(async () => {
      await result.current.endSession()
    })

    // Assert: endedSession should be stored in sessionStorage
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining("session-789")
    )
    expect(result.current.endedSession).not.toBeNull()
    expect(result.current.endedSession?.id).toBe("session-789")
    expect(result.current.endedSession?.approachCount).toBe(2)
  })

  test("clearEndedSession removes from sessionStorage and state", async () => {
    // Arrange: Store ended session info
    const endedInfo = {
      id: "session-123",
      approachCount: 5,
      duration: "01:30:00",
      endedAt: new Date().toISOString(),
    }
    mockSessionStorage.setItem(STORAGE_KEY, JSON.stringify(endedInfo))

    // Act: Render hook and clear ended session
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    await waitFor(() => {
      expect(result.current.endedSession).toEqual(endedInfo)
    })

    act(() => {
      result.current.clearEndedSession()
    })

    // Assert: endedSession should be cleared
    expect(result.current.endedSession).toBeNull()
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
  })

  test("handles corrupted sessionStorage data gracefully", async () => {
    // Arrange: Store corrupted JSON
    mockSessionStorage.setItem(STORAGE_KEY, "not valid json {{{")

    // Act: Render hook
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    // Assert: Should handle error and clear storage
    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false)
    })
    expect(result.current.endedSession).toBeNull()
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
  })
})

describe("useSession - pageshow event handling", () => {
  const STORAGE_KEY = "daygame_ended_session"
  const mockUserId = "test-user-123"

  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStorage.clear()

    Object.defineProperty(window, "sessionStorage", {
      value: mockSessionStorage,
      writable: true,
    })

    Object.defineProperty(navigator, "vibrate", {
      value: mockVibrate,
      writable: true,
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session: null, approaches: [] }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("re-reads sessionStorage when pageshow event fires with persisted=true", async () => {
    // Arrange: Render hook with no ended session initially
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false)
    })
    expect(result.current.endedSession).toBeNull()

    // Now simulate sessionStorage being updated (as if set on another page before navigation)
    const endedInfo = {
      id: "session-from-other-page",
      approachCount: 3,
      duration: "00:45:00",
      endedAt: new Date().toISOString(),
    }
    mockSessionStorage.setItem(STORAGE_KEY, JSON.stringify(endedInfo))

    // Act: Simulate pageshow event (bfcache restore)
    await act(async () => {
      const event = new PageTransitionEvent("pageshow", { persisted: true })
      window.dispatchEvent(event)
      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Assert: endedSession should be updated from sessionStorage
    await waitFor(() => {
      expect(result.current.endedSession).toEqual(endedInfo)
    })
  })

  test("does not re-read sessionStorage when pageshow event fires with persisted=false", async () => {
    // Arrange: Render hook
    const { result } = renderHook(() => useSession({ userId: mockUserId }))

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false)
    })

    // Clear the getItem call count after initial load
    mockSessionStorage.getItem.mockClear()

    // Add ended session to storage
    const endedInfo = {
      id: "session-123",
      approachCount: 3,
      duration: "00:45:00",
      endedAt: new Date().toISOString(),
    }
    mockSessionStorage.setItem(STORAGE_KEY, JSON.stringify(endedInfo))

    // Act: Simulate pageshow event with persisted=false (normal load, not bfcache)
    await act(async () => {
      const event = new PageTransitionEvent("pageshow", { persisted: false })
      window.dispatchEvent(event)
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    // Assert: getItem should NOT have been called again
    // (since persisted=false means it's a fresh load, not bfcache restore)
    expect(mockSessionStorage.getItem).not.toHaveBeenCalled()
    expect(result.current.endedSession).toBeNull()
  })
})
