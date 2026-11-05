// @vitest-environment jsdom
/**
 * THE TIMER BAR FOLLOWS A RENAME MADE ON THE OTHER DEVICE (bug audit A4).
 *
 * Gym runs on both devices. The PC renames it "Gym, legs day"; the phone
 * checks and stores the new name — and its bar went on saying "Gym", because
 * the bar copied the running entry only when a DIFFERENT entry started. So a
 * Stop and a Start on the phone, to carry on after a break, started a new
 * "Gym" under the old name.
 *
 * The bar follows the running entry now, whatever changed it, except for a
 * field the person is typing into at that moment: what they type is never
 * overwritten.
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

function gymSinceNine(): TimetrackState {
  return startTimer(
    baseState(),
    { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 7, 10, 9, 0).toISOString(),
  ).state
}

const main = () => within(screen.getByRole("main"))
const bar = () => main().getByPlaceholderText("What are you working on?") as HTMLInputElement

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value, configurable: true })
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

/** what the phone looks at after the PC changed something: put away and taken out again */
async function lookAgain() {
  setVisibility("hidden")
  setVisibility("visible")
  await wait(2_000)
}

async function openPhone(copy: TimetrackState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TogglLab />)
  for (let i = 0; i < 10 && !screen.queryByRole("button", { name: /^Saved\./ }); i++) await wait(500)
  return account
}

const gymIn = (copy: TimetrackState) => copy.entries.find((e) => e.duration < 0)!.id

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

describe("the running entry renamed on the PC", () => {
  test("shows on the phone's bar once the phone has checked", async () => {
    const copy = gymSinceNine()
    const account = await openPhone(copy)
    expect(bar().value).toBe("Gym")

    account.edit("timetrack_entries", gymIn(copy), { description: "Gym, legs day" })
    await lookAgain()

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
    expect(stored.entries.find((e) => e.stop === null)?.description, "the phone never heard of the rename").toBe("Gym, legs day")
    expect(bar().value, "the phone stores the new name and its bar still shows the old one").toBe("Gym, legs day")
  })

  // Carrying on after a break: Stop, then ▶ on the row. (Until 2026-11-05 it was
  // Stop and Start, because a stop left the name in the bar; a stop now
  // empties it, as Toggl's does, so carrying on is the row's Continue.)
  test("so a Stop and a Continue carry on under the new name", async () => {
    const copy = gymSinceNine()
    const account = await openPhone(copy)
    account.edit("timetrack_entries", gymIn(copy), { description: "Gym, legs day" })
    await lookAgain()

    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(100)
    fireEvent.click(main().getAllByRole("button", { name: "Continue this entry" })[0])
    await wait(100)

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
    expect(stored.entries.find((e) => e.stop === null)?.description).toBe("Gym, legs day")
  })

  test("but never over what is being typed into the bar at that moment", async () => {
    const copy = gymSinceNine()
    const account = await openPhone(copy)

    fireEvent.change(bar(), { target: { value: "Gym, upper body" } })
    account.edit("timetrack_entries", gymIn(copy), { description: "Gym, legs day" })
    await lookAgain()

    expect(bar().value).toBe("Gym, upper body")
  })
})
