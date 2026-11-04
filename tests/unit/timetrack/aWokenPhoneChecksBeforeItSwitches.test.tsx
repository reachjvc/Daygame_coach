// @vitest-environment jsdom
/**
 * SWITCHED AT… AND STOPPED AT… WAIT FOR THE CHECK, LIKE START AND STOP (D2).
 *
 * Both end the running timer, so they carry the same danger Stop did: after
 * opening or waking, this phone's copy may be hours old, and the PC may have
 * stopped the timer the phone still shows running. A switch confirmed on that
 * copy would have ended the PC's entry a second time and started the next one
 * on top. The confirm is held until the first check lands and then runs on the
 * account's copy — or is dropped, with a word, when the timer it was about is
 * no longer the one running.
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
const SWITCHED = new Date(2026, 7, 10, 11, 30, 0).toISOString()

/** The phone's own copy: Gym, started at nine and still running */
function phoneCopy(): TimetrackState {
  const finished = baseState({ entries: [entry("mail", "2026-08-10", "08:00", "08:30", { description: "Email" })] })
  return startTimer(
    finished,
    { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 7, 10, 9, 0).toISOString(),
  ).state
}

function stoppedByThePc(copy: TimetrackState): TimetrackState {
  return {
    ...copy,
    entries: copy.entries.map((e) =>
      e.duration < 0 ? { ...e, stop: PC_STOP, duration: Math.round((Date.parse(PC_STOP) - Date.parse(e.start)) / 1000) } : e,
    ),
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

const main = () => within(screen.getByRole("main"))
const gymIn = (copy: TimetrackState) => copy.entries.find((e) => e.duration < 0)!.id

/** every entry row this phone has sent */
function sentEntries(account: ReturnType<typeof fakeAccount>) {
  return account.posts.flatMap((post) => (post.body.rows?.timetrack_entries ?? []) as { id: string; description: string; started_at: string }[])
}

/** Type the next thing, open Switched at…, pick 11:30, confirm */
function switchToLunchAtHalfPastEleven() {
  fireEvent.change(main().getByLabelText("Next entry"), { target: { value: "Lunch" } })
  fireEvent.click(main().getByRole("button", { name: "Switched at…" }))
  const picker = within(screen.getByRole("dialog", { name: "Switched at…" }))
  const box = picker.getByLabelText("Time")
  fireEvent.focus(box)
  fireEvent.change(box, { target: { value: "1130" } })
  fireEvent.blur(box)
  fireEvent.click(picker.getByRole("button", { name: "Switch at 11:30" }))
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  holdReads = false
  releaseReads = null
  window.history.replaceState(null, "", "/test/toggl")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("a switch confirmed while the phone is still checking", () => {
  test("waits, and is dropped with a word when the PC had already stopped the timer", async () => {
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(stoppedByThePc(copy), "user-1"))
    holdReads = true
    serve(account)

    render(<TogglLab />)
    await wait(50)
    expect(screen.getByRole("button", { name: /^Checking…/ })).toBeInTheDocument()

    switchToLunchAtHalfPastEleven()
    await wait(50)
    holdReads = false
    releaseReads?.()
    await wait(2_000)

    expect(account.entry(gymIn(copy))?.stopped_at, "the switch on the old copy replaced the PC's stop at ten").toBe(PC_STOP)
    expect(sentEntries(account).some((row) => row.description === "Lunch"), "Lunch was started on top of the PC's stop").toBe(false)
    expect(screen.getByText(/Your other device stopped the timer while this one was checking/)).toBeInTheDocument()
  })

  test("runs on the account's copy once the check finds the same timer running", async () => {
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(copy, "user-1"))
    holdReads = true
    serve(account)

    render(<TogglLab />)
    await wait(50)
    switchToLunchAtHalfPastEleven()
    await wait(50)
    expect(sentEntries(account).some((row) => row.description === "Lunch"), "the switch did not wait for the check").toBe(false)

    holdReads = false
    releaseReads?.()
    for (let i = 0; i < 8 && !sentEntries(account).some((row) => row.description === "Lunch"); i++) await wait(500)

    expect(Date.parse(String(account.entry(gymIn(copy))?.stopped_at))).toBe(Date.parse(SWITCHED))
    const lunch = sentEntries(account).find((row) => row.description === "Lunch")
    expect(lunch && Date.parse(lunch.started_at)).toBe(Date.parse(SWITCHED))
  })
})

describe("a Stop at… confirmed while the phone is still checking", () => {
  test("waits, and does not end the PC's entry a second time", async () => {
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(stoppedByThePc(copy), "user-1"))
    holdReads = true
    serve(account)

    render(<TogglLab />)
    await wait(50)
    fireEvent.click(main().getByRole("button", { name: "Stop at…" }))
    const picker = within(screen.getByRole("dialog", { name: "Stopped at…" }))
    const box = picker.getByLabelText("Time")
    fireEvent.focus(box)
    fireEvent.change(box, { target: { value: "1130" } })
    fireEvent.blur(box)
    fireEvent.click(picker.getByRole("button", { name: "Stop at 11:30" }))
    await wait(50)
    act(() => {
      holdReads = false
      releaseReads?.()
    })
    await wait(2_000)

    expect(account.entry(gymIn(copy))?.stopped_at, "Stop at… on the old copy replaced the PC's stop at ten").toBe(PC_STOP)
  })
})
