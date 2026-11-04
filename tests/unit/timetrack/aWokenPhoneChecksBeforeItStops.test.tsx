// @vitest-environment jsdom
/**
 * A WOKEN PHONE CHECKS BEFORE IT STOPS (design rule D2).
 *
 * The owner starts "Gym" on the PC and stops it on the phone. For the seconds
 * after the phone opened or woke, it showed its old copy with no sign that it
 * was checking, and a tap in that window acted on the old copy: a timer the PC
 * had stopped at 10:00 was stopped again at noon, and the noon stop won (sync
 * defect #2 and getting-around #2 in Plans/time-tracker-like-toggl.md).
 *
 * Now the badge says "Checking…" from opening, and from waking, until the
 * first check lands, and Start, Stop and Continue wait for it — three seconds
 * at most. Then they work, and the badge says the server could not be reached.
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

/** The phone's own copy: Gym, started at nine and still running */
function phoneCopy(): TimetrackState {
  const finished = baseState({ entries: [entry("mail", "2026-08-10", "08:00", "08:30", { description: "Email" })] })
  const started = startTimer(
    finished,
    { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false },
    new Date(2026, 7, 10, 9, 0).toISOString(),
  ).state
  return started
}

/** The account: the same Gym, which the PC stopped at ten */
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

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value, configurable: true })
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

const main = () => within(screen.getByRole("main"))
/** the running entry's id in the phone's copy */
const gymIn = (copy: TimetrackState) => copy.entries.find((e) => e.duration < 0)!.id

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  holdReads = false
  releaseReads = null
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

describe("a phone that opens with an old copy", () => {
  test("says Checking… and does not stop the timer the PC already stopped", async () => {
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(stoppedByThePc(copy), "user-1"))
    holdReads = true
    serve(account)

    render(<TogglLab />)
    await wait(50)
    expect(screen.getByRole("button", { name: /^Checking…/ }), "no sign that it was checking").toBeInTheDocument()

    // the old copy still says Gym is running, and the owner taps Stop on it
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(50)
    holdReads = false
    releaseReads?.()
    await wait(2_000)

    expect(account.entry(gymIn(copy))?.stopped_at, "the noon stop on the old copy replaced the PC's stop at ten").toBe(PC_STOP)
    expect(main().getByRole("button", { name: "Start timer" })).toBeInTheDocument()
  })

  test("acts on its own copy after three seconds without an answer, and says it could not check", async () => {
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(copy, "user-1"))
    holdReads = true
    serve(account)

    render(<TogglLab />)
    await wait(50)
    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(2_500)
    expect(main().getByRole("button", { name: "Stop timer" }), "Stop did not wait for the check").toBeInTheDocument()

    await wait(1_000)
    expect(main().getByRole("button", { name: "Start timer" }), "Stop never happened").toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Couldn't reach the server — this might be out of date/ })).toBeInTheDocument()
  })
})

describe("a phone that wakes with an old copy", () => {
  test("holds a tap made in the same moment it wakes", async () => {
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(copy, "user-1"))
    serve(account)

    render(<TogglLab />)
    await wait(1_000)
    setVisibility("hidden")
    const gymId = gymIn(copy)
    account.stop(gymId, PC_STOP)
    holdReads = true
    // the tap lands before the page has redrawn for waking
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
      fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    })
    await wait(50)
    holdReads = false
    releaseReads?.()
    await wait(2_000)

    expect(account.entry(gymId)?.stopped_at, "the tap acted on the old copy before the page knew it was checking").toBe(PC_STOP)
  })

  test("checks before it stops", async () => {
    const copy = phoneCopy()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
    const account = fakeAccount(stateToRows(copy, "user-1"))
    serve(account)

    render(<TogglLab />)
    await wait(1_000)
    expect(screen.getByRole("button", { name: /^Saved\./ })).toBeInTheDocument()

    // in a pocket while the PC stops Gym
    setVisibility("hidden")
    const gymId = gymIn(copy)
    account.stop(gymId, PC_STOP)
    holdReads = true
    setVisibility("visible")
    await wait(50)
    expect(screen.getByRole("button", { name: /^Checking…/ }), "no sign that it was checking").toBeInTheDocument()

    fireEvent.click(main().getByRole("button", { name: "Stop timer" }))
    await wait(50)
    holdReads = false
    releaseReads?.()
    await wait(2_000)

    expect(account.entry(gymId)?.stopped_at, "the stop on the old copy replaced the PC's stop at ten").toBe(PC_STOP)
    expect(main().getByRole("button", { name: "Start timer" })).toBeInTheDocument()
  })
})
