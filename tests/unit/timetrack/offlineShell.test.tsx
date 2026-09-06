/**
 * The service worker is what lets the tracker open with no connection.
 *
 * It is registered only in a production build. In development the dev server
 * streams updates and a worker in front of that serves a version of the app
 * that no longer exists — so development actively removes any worker left over
 * from a production build on the same machine, which is a real trap otherwise.
 */

import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { OfflineShell } from "@/src/timetrack/components/OfflineShell"

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function stubServiceWorker() {
  const register = vi.fn().mockResolvedValue({})
  const unregister = vi.fn().mockResolvedValue(true)
  const getRegistrations = vi.fn().mockResolvedValue([{ unregister }])
  vi.stubGlobal("navigator", { serviceWorker: { register, getRegistrations } })
  return { register, unregister, getRegistrations }
}

describe("offline support", () => {
  test("a production build registers the worker", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { register } = stubServiceWorker()
    render(<OfflineShell />)
    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js"))
  })

  test("development registers nothing, and clears any worker already there", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { register, unregister } = stubServiceWorker()
    render(<OfflineShell />)
    await waitFor(() => expect(unregister).toHaveBeenCalled())
    expect(register).not.toHaveBeenCalled()
  })

  test("a browser without service workers is left alone, not crashed", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubGlobal("navigator", {})
    expect(() => render(<OfflineShell />)).not.toThrow()
  })

  test("a failed registration is reported, never swallowed", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubGlobal("navigator", {
      serviceWorker: { register: vi.fn().mockRejectedValue(new Error("blocked")), getRegistrations: vi.fn() },
    })
    render(<OfflineShell />)
    await waitFor(() => expect(error).toHaveBeenCalled())
    error.mockRestore()
  })
})
