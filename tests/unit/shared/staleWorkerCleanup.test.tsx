/**
 * A LEFTOVER SERVICE WORKER IS REMOVED ON EVERY PAGE, NOT JUST THE TRACKER'S.
 *
 * The failure this prevents: `npm start` serves a production build on port 3000,
 * the same address as `npm run dev`, so a single production run installs a
 * service worker against the dev server. That worker cached every file it
 * fetched, forever, and served them whenever a request failed to connect — which
 * a dev-server restart is. The app then drew itself from a build that no longer
 * existed, the webfont never arrived, and the whole site rendered ~28% too large
 * because `globals.css` named the MONO metric fallback (`size-adjust: 134.59%`)
 * in the SANS stack instead of the sans one (`104.76%`).
 *
 * The cleanup existed, in `OfflineShell` — which only the time tracker mounts.
 * So it ran on two pages and nowhere else. Reproduced in a browser on
 * 2026-09-07: register a worker, reload /dashboard, still controlled.
 */

import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { StaleWorkerCleanup } from "@/src/shared/components/StaleWorkerCleanup"

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function stub({ registrations = 1, controlled = true }: { registrations?: number; controlled?: boolean } = {}) {
  const unregister = vi.fn().mockResolvedValue(true)
  const getRegistrations = vi.fn().mockResolvedValue(Array.from({ length: registrations }, () => ({ unregister })))
  const cacheDelete = vi.fn().mockResolvedValue(true)
  const reload = vi.fn()
  vi.stubGlobal("navigator", { serviceWorker: { getRegistrations, controller: controlled ? {} : null } })
  vi.stubGlobal("caches", { keys: vi.fn().mockResolvedValue(["timetrack-shell-v1", "other"]), delete: cacheDelete })
  vi.stubGlobal("location", { reload })
  sessionStorage.clear()
  return { unregister, getRegistrations, cacheDelete, reload }
}

describe("stale worker cleanup", () => {
  test("removes every leftover worker in development", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { unregister } = stub({ registrations: 2 })
    render(<StaleWorkerCleanup />)
    await waitFor(() => expect(unregister).toHaveBeenCalledTimes(2))
  })

  test("empties what the worker stored — unregistering does not", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { cacheDelete } = stub()
    render(<StaleWorkerCleanup />)
    // A stale stylesheet in Cache Storage outlives the worker that put it there.
    await waitFor(() => expect(cacheDelete).toHaveBeenCalledWith("timetrack-shell-v1"))
    expect(cacheDelete).toHaveBeenCalledWith("other")
  })

  test("says out loud that the page on screen may not be what the dev server sent", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    stub()
    render(<StaleWorkerCleanup />)
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("leftover service worker")))
    warn.mockRestore()
  })

  test("touches nothing in a production build — that is where the worker belongs", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { getRegistrations } = stub()
    render(<StaleWorkerCleanup />)
    await new Promise((r) => setTimeout(r, 20))
    expect(getRegistrations).not.toHaveBeenCalled()
  })

  test("says nothing when there was nothing to clear", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { cacheDelete } = stub({ registrations: 0 })
    render(<StaleWorkerCleanup />)
    await new Promise((r) => setTimeout(r, 20))
    expect(warn).not.toHaveBeenCalled()
    expect(cacheDelete).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test("reloads once, so the page stops showing what the dead worker served", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { reload } = stub({ controlled: true })
    render(<StaleWorkerCleanup />)
    // Unregistering does not un-serve the document already on screen — which may
    // itself be the stale copy with the wrong fonts.
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
  })

  test("never reloads twice, so a worker that will not die cannot loop", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { reload } = stub({ controlled: true })
    sessionStorage.setItem("stale-worker-cleanup:reloaded", "1")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    render(<StaleWorkerCleanup />)
    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("not reloading again")))
    expect(reload).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test("does not reload when the page was not served by the worker", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { reload, unregister } = stub({ controlled: false })
    render(<StaleWorkerCleanup />)
    await waitFor(() => expect(unregister).toHaveBeenCalled())
    expect(reload).not.toHaveBeenCalled()
  })

  test("a browser without service workers is left alone, not crashed", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubGlobal("navigator", {})
    expect(() => render(<StaleWorkerCleanup />)).not.toThrow()
  })
})
