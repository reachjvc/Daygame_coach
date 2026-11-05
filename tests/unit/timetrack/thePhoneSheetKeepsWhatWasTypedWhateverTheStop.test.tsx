// @vitest-environment jsdom
/**
 * THE RUNNING SHEET KEEPS WHAT WAS TYPED, WHATEVER HAPPENS TO ITS STOP
 * (offline audit, Phase 8 of Plans/toggl-parity.md).
 *
 * (a) Renamed in the running sheet, then ■ Stop while the phone was still
 * checking the account — and the PC had already stopped that timer. The Stop
 * was dropped ("Tap again if you still want to") and the sheet closed with the
 * name gone. The name is the person's work: it goes onto the entry, which stays
 * stopped where the PC stopped it.
 *
 * (b) Deleting the running entry from its sheet offered no Undo: the bar's
 * Undo is cleared when the running timer changes, and the delete itself is
 * such a change.
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
import { baseState, entry } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)
const PC_STOP = new Date(2026, 7, 10, 10, 0, 0).toISOString()

function phoneCopy(): TimetrackState {
  const finished = baseState({ entries: [entry("mail", "2026-08-10", "08:00", "08:30", { description: "Email" })] })
  return startTimer(finished, { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 7, 10, 9, 0).toISOString()).state
}

function stoppedByThePc(copy: TimetrackState): TimetrackState {
  return {
    ...copy,
    entries: copy.entries.map((e) => (e.duration < 0 ? { ...e, stop: PC_STOP, duration: Math.round((Date.parse(PC_STOP) - Date.parse(e.start)) / 1000) } : e)),
  }
}

let releaseReads: (() => void) | null = null
let holdReads = false

function serve(account: ReturnType<typeof fakeAccount>) {
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    if (!init?.method && holdReads) await new Promise<void>((resolve) => (releaseReads = resolve))
    return account.fetch(url, init)
  })
}

function asPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("max-width"), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
}

const bar = () => within(screen.getByTestId("run-bar"))
const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as TimetrackState
const gymIn = (copy: TimetrackState) => copy.entries.find((e) => e.duration < 0)!.id

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  holdReads = false
  releaseReads = null
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("the running sheet", () => {
  test("a name typed, then Stop while checking a timer the PC had stopped: the name is kept, the PC's stop stands", async () => {
    asPhone()
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(stoppedByThePc(copy), "user-1"))
    holdReads = true
    serve(account)

    render(<TogglLab />)
    await wait(50)
    expect(screen.getByRole("button", { name: /^Checking…/ })).toBeInTheDocument()

    fireEvent.click(bar().getByRole("button", { name: "Edit the running time entry" }))
    const sheet = within(screen.getByRole("dialog", { name: "Time entry" }))
    fireEvent.change(sheet.getByPlaceholderText("I’m working on…"), { target: { value: "Gym, legs day" } })
    fireEvent.click(sheet.getByRole("button", { name: "Stop" }))
    await wait(50)
    holdReads = false
    releaseReads?.()
    await wait(3_000)

    const gym = stored().entries.find((e) => e.id === gymIn(copy))!
    expect(gym.description, "the name typed in the sheet was lost").toBe("Gym, legs day")
    expect(gym.stop, "the PC's stop at ten was replaced").toBe(PC_STOP)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000)
    })
    expect(account.entry(gymIn(copy))?.description).toBe("Gym, legs day")
    expect(account.entry(gymIn(copy))?.stopped_at).toBe(PC_STOP)
  })

  test("Delete time entry on the running entry offers Undo, and Undo brings it back running", async () => {
    asPhone()
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    serve(fakeAccount(stateToRows(copy, "user-1")))
    render(<TogglLab />)
    await wait(1_000)

    fireEvent.click(bar().getByRole("button", { name: "Edit the running time entry" }))
    fireEvent.click(within(screen.getByRole("dialog", { name: "Time entry" })).getByRole("button", { name: "Delete time entry" }))
    await wait(100)
    const undo = screen.getByTestId("undo-bar")
    fireEvent.click(within(undo).getByRole("button", { name: /Undo/ }))
    await wait(500)
    expect(stored().entries.find((e) => e.id === gymIn(copy) && !e.serverDeletedAt)?.stop).toBeNull()
  })
})
