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
  const postMessage = vi.fn()
  const ready = Promise.resolve({ active: { postMessage } })
  vi.stubGlobal("navigator", { serviceWorker: { register, getRegistrations, ready } })
  return { register, unregister, getRegistrations, postMessage }
}

describe("offline support", () => {
  test("a production build registers the worker, named for the build", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "abc1234")
    const { register } = stubServiceWorker()
    render(<OfflineShell />)
    // The build id in the URL is what gives each build its own cache — see
    // public/sw.js rule 4 and tests/unit/timetrack/serviceWorker.test.ts.
    await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js?v=abc1234"))
  })

  test("the tracker tells the worker it is on screen, so the stored shell is the current user's", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "abc1234")
    const { postMessage } = stubServiceWorker()
    render(<OfflineShell />)
    // Signing in and out are client-side transitions, so the worker's own /auth/
    // rule almost never fires; this message is what actually re-stores the shell
    // for whoever is signed in now.
    await waitFor(() => expect(postMessage).toHaveBeenCalledWith({ type: "warm-shell" }))
  })

  test.each([["", "no id at all"], ["unknown", "git could not be asked"]])(
    "a build whose id is %j (%s) registers nothing and says why",
    async (buildId) => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("NEXT_PUBLIC_BUILD_ID", buildId)
      const error = vi.spyOn(console, "error").mockImplementation(() => {})
      const { register } = stubServiceWorker()
      render(<OfflineShell />)
      // Registering anyway would mean two builds sharing one cache name under a
      // URL the browser sees as unchanged — the fault rule 5 exists to prevent.
      await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining("no build id")))
      expect(register).not.toHaveBeenCalled()
      error.mockRestore()
    },
  )

  test("development registers nothing — and clearing a leftover worker is not this component's job", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { register, unregister } = stubServiceWorker()
    render(<OfflineShell />)
    await waitFor(() => expect(register).not.toHaveBeenCalled())
    // The cleanup used to live here, and because this component is mounted only
    // by the tracker, a worker left over from a production build kept
    // controlling every other page of the dev server. It now belongs to
    // StaleWorkerCleanup, in the root layout — see its own test.
    expect(unregister).not.toHaveBeenCalled()
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
