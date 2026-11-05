// @vitest-environment jsdom
/**
 * STOP STOPS THE ENTRY THAT WAS ON THE SCREEN, OR NOTHING (Phase 8 two-devices
 * audit of Plans/toggl-parity.md).
 *
 * `stop()` stopped whatever ran when the update was applied. A Stop tapped on
 * the PC while it showed Gym, landing as the phone's switch to Shower arrived
 * and before it was drawn, stopped Shower — the entry the PC never showed. Stop
 * now carries the id of the entry on screen; when another one runs by then it
 * stops nothing and says so. The bar's Stop, the header pill, S and the
 * phone's ■ all go through it.
 */

import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { useTimetrack } from "@/src/timetrack/hooks/useTimetrack"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { runningEntry, startTimer, stopSeen, stopTimer } from "@/src/timetrack/timetrackService"

import { baseState } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 10, 5, h, m, 0, 0).toISOString()
const draft = (description: string) => ({ description, projectId: null, taskId: null, tagIds: [], billable: false })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 10, 5, 15, 0))
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

function gymRunning() {
  const state = startTimer(baseState({ entries: [] }), draft("Gym"), at(14)).state
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  return { state, gymId: runningEntry(state)!.id }
}

test("a Stop for Gym, landing as the phone's switch to Shower arrives, leaves Shower running and says so", async () => {
  const { state, gymId } = gymRunning()
  const hook = renderHook(() => useTimetrack())
  await waitFor(() => expect(hook.result.current.state).not.toBeNull())
  // the phone stopped Gym at 14:50 and started Shower
  const answer = startTimer(stopTimer(state, at(14, 50)).state, draft("Shower"), at(14, 50)).state

  act(() => {
    const tracker = hook.result.current
    tracker.actions.replaceState(answer)
    tracker.actions.stop(at(15), gymId)
  })
  await act(async () => {})

  const after = hook.result.current.state!
  expect(runningEntry(after)?.description, "the Stop tapped on Gym stopped Shower").toBe("Shower")
  expect(after.entries.find((e) => e.id === gymId)!.stop, "Gym's end moved").toBe(at(14, 50))
  expect(hook.result.current.toasts.some((t) => /Shower/.test(t.text)), "nothing said why the Stop did nothing").toBe(true)
})

test("a Stop for the entry that is running stops it, as always", async () => {
  const { gymId } = gymRunning()
  const hook = renderHook(() => useTimetrack())
  await waitFor(() => expect(hook.result.current.state).not.toBeNull())
  act(() => hook.result.current.actions.stop(at(15), gymId))
  expect(runningEntry(hook.result.current.state!)).toBeNull()
})

test("stopSeen: stopped elsewhere is gone; a screen that showed nothing stops nothing", () => {
  const { state, gymId } = gymRunning()
  const stopped = stopTimer(state, at(14, 50)).state
  expect(stopSeen(stopped, gymId, at(15)).refused).toBe("gone")
  expect(stopSeen(state, null, at(15))).toMatchObject({ refused: "other", stopped: null })
  expect(stopSeen(stopped, null, at(15)).refused).toBeNull()
  expect(stopSeen(state, gymId, at(15)).stopped?.id).toBe(gymId)
})
