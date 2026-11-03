// @vitest-environment jsdom
/**
 * THE OLD IDLE DEFAULT IS MOVED OFF ONCE, AND THEN NEVER AGAIN.
 *
 * An older build switched idle detection on at 5 minutes for everybody. A later
 * one moved that default off on load and said so in a toast. But the move was
 * made only in this browser, before the sync had taken its first look, so it
 * was never sent — and on first contact the account's copy wins every row it
 * knows. The account still said "on, 5 minutes", so that came back, was saved
 * here, and the next load moved it off again: the same toast on every visit,
 * and idle detection quietly on for the rest of each one (getting-around #8 in
 * Plans/time-tracker-like-toggl.md).
 *
 * Now the move is recorded in the idle settings themselves, so it travels with
 * them to the account and back, and the account's old copy is moved too when
 * the sync hands it over — which makes it a change, which is sent.
 */

import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { STORAGE_KEY } from "@/src/timetrack/config"
import { useTimetrack } from "@/src/timetrack/hooks/useTimetrack"
import { rowsToState, stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState } from "./helpers"

const TOAST = /Idle detection is now off by default/

/** a workspace as the older build left it: idle on, 5 minutes, nothing recorded */
function legacy(): TimetrackState {
  return baseState({ idle: { enabled: true, minutes: 5 } })
}

function saved(): TimetrackState {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
}

async function open() {
  const hook = renderHook(() => useTimetrack())
  await waitFor(() => expect(hook.result.current.state).not.toBeNull())
  return hook
}

const toastsSaying = (hook: Awaited<ReturnType<typeof open>>, pattern: RegExp) =>
  hook.result.current.toasts.filter((t) => pattern.test(t.text)).length

beforeEach(() => window.localStorage.clear())

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("the visit after the account's old copy came back", () => {
  test("does not move it again and does not say so again", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy()))

    // first visit: moved, and said once
    const first = await open()
    expect(first.result.current.state?.idle.enabled).toBe(false)
    expect(toastsSaying(first, TOAST)).toBe(1)

    // the sync adopts the account's copy, which still says on at 5 minutes
    act(() => first.result.current.actions.replaceState(legacy()))
    expect(first.result.current.state?.idle.enabled, "the account's old copy switched idle detection back on").toBe(false)
    expect(toastsSaying(first, TOAST), "said twice in one visit").toBe(1)
    first.unmount()

    // second visit
    const second = await open()
    expect(toastsSaying(second, TOAST), "the same toast on the next visit").toBe(0)
    expect(second.result.current.state?.idle.enabled).toBe(false)
  })
})

describe("a person who turns it back on at 5 minutes", () => {
  test("keeps it on, on every visit after", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy()))
    const first = await open()
    act(() =>
      first.result.current.setState((current) => ({ ...current, idle: { ...current.idle, enabled: true, minutes: 5 } })),
    )
    first.unmount()

    const second = await open()
    expect(second.result.current.state?.idle, "switched off again behind their back").toMatchObject({ enabled: true, minutes: 5 })
    expect(toastsSaying(second, TOAST)).toBe(0)
  })
})

describe("the record that it was moved", () => {
  test("survives the trip to the account and back", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy()))
    const first = await open()
    const moved = first.result.current.state!

    const back = rowsToState(stateToRows(moved, "user-1"), new Date().toISOString())

    expect(back.idle).toEqual(moved.idle)
    // and a workspace carrying it, handed over by the sync, is left exactly as it is
    act(() => first.result.current.actions.replaceState(back))
    expect(first.result.current.state).toBe(back)
  })

  test("is in the saved workspace, so the sync sends it", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy()))
    await open()
    expect(saved().idle).toMatchObject({ enabled: false, legacyDefaultMoved: true })
  })
})
