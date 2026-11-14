// @vitest-environment jsdom
/**
 * A NEW BUILD LOADS WHEN IT IS SAFE (Plans/time-log-phone.md 2.2, C5).
 *
 * The installed app could run yesterday's code for days. On coming back into
 * view the tracker asks which build the server runs: a different one reloads
 * the page when nothing is open and nothing waits to sync, and otherwise
 * offers "Updated · Tap to reload".
 */

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { useNewBuild } from "@/src/timetrack/hooks/useNewBuild"

const reload = vi.fn()

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "a".repeat(40))
  Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload } })
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  reload.mockReset()
  document.body.innerHTML = ""
})

function serverRuns(buildId: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ buildId }), { status: 200 })))
}

async function comeBack() {
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

test("the same build does nothing", async () => {
  serverRuns("a".repeat(40))
  const { result } = renderHook(() => useNewBuild(0))
  await comeBack()
  expect(reload).not.toHaveBeenCalled()
  expect(result.current.ready).toBe(false)
})

test("a new build with nothing open and nothing waiting reloads at once", async () => {
  serverRuns("b".repeat(40))
  renderHook(() => useNewBuild(0))
  await comeBack()
  expect(reload).toHaveBeenCalledTimes(1)
})

test("a new build with a sheet open is offered, not loaded", async () => {
  serverRuns("b".repeat(40))
  document.body.innerHTML = '<div role="dialog"></div>'
  const { result } = renderHook(() => useNewBuild(0))
  await comeBack()
  expect(reload).not.toHaveBeenCalled()
  expect(result.current.ready).toBe(true)
})

test("a new build with changes waiting to sync is offered, not loaded", async () => {
  serverRuns("b".repeat(40))
  const { result } = renderHook(() => useNewBuild(2))
  await comeBack()
  expect(reload).not.toHaveBeenCalled()
  expect(result.current.ready).toBe(true)
})
