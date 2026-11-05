// @vitest-environment jsdom
/**
 * A STOP CLEARS THE TIMER BAR, AS TOGGL'S DOES.
 *
 * Found 2026-11-05 while capturing the screens for the Toggl comparison
 * (Plans/toggl-parity.md, Phase 0): after Stop the bar kept the stopped
 * entry's name, project and tags, so the next Start quietly repeated them
 * ("Call", Gym, admin) unless you cleared each one by hand. Toggl empties the
 * bar on Stop; carrying on with the same thing is ▶ on its row.
 *
 * What somebody is typing into the bar at the moment the timer stops (say the
 * other device stopped it) is theirs, and stays.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)

function callSinceNine(): TimetrackState {
  return startTimer(
    baseState(),
    { description: "Call", projectId: "30", taskId: null, tagIds: ["50"], billable: false },
    new Date(2026, 7, 10, 9, 0).toISOString(),
  ).state
}

const main = () => within(screen.getByRole("main"))
const bar = () => main().getByPlaceholderText("What are you working on?") as HTMLInputElement
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState

async function open(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  for (let i = 0; i < 10 && !screen.queryByRole("button", { name: /^Saved\./ }); i++) await wait(500)
  return account
}

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value, configurable: true })
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("Stop", () => {
  test("empties the bar", async () => {
    await open(callSinceNine())
    expect(bar().value).toBe("Call")

    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(100)

    expect(bar().value).toBe("")
  })

  test("so the next Start begins with no name, project or tag", async () => {
    await open(callSinceNine())
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(100)
    fireEvent.click(main().getByRole("button", { name: "Start timer" }))
    await wait(100)

    const runningNow = stored().entries.find((e) => e.stop === null)!
    expect(runningNow).toMatchObject({ description: "", projectId: null, tagIds: [] })
  })

  test("from the other device empties the bar too", async () => {
    const copy = callSinceNine()
    const account = await open(copy)
    account.stop(copy.entries.find((e) => e.duration < 0)!.id, new Date(2026, 7, 10, 11, 0).toISOString())
    setVisibility("hidden")
    setVisibility("visible")
    await wait(2_000)

    expect(stored().entries.some((e) => e.stop === null), "the stop did not arrive").toBe(false)
    expect(bar().value).toBe("")
  })

  test("keeps what is being typed when the other device stops the timer", async () => {
    const copy = callSinceNine()
    const account = await open(copy)
    fireEvent.change(bar(), { target: { value: "Call with Ana" } })
    const id = copy.entries.find((e) => e.duration < 0)!.id
    account.stop(id, new Date(2026, 7, 10, 11, 0).toISOString())
    setVisibility("hidden")
    setVisibility("visible")
    await wait(2_000)

    expect(stored().entries.some((e) => e.stop === null), "the stop did not arrive").toBe(false)
    expect(bar().value).toBe("Call with Ana")
  })
})
