// @vitest-environment jsdom
/**
 * THE OLD COPY'S TIMER WAITS FOR THE ACCOUNT BEFORE IT IS DRAWN AS RUNNING.
 *
 * The owner, 2026-11-28: "it just looks buggy when i reopen it, because it
 * continues for a split second the previous running thing, even if it was
 * closed on another browser/device". A phone opens, or wakes after being
 * asleep, with a copy whose timer the PC has since stopped. Until the account
 * answers, the bar says "Checking…" instead of that timer's name and clock.
 *
 * A page that stayed awake while hidden (a PC tab behind another window)
 * kept hearing the account, so its timer is not hidden on every return.
 * The browser suite proves the same on real pages, frame by frame
 * (tests/e2e/timelog-guard/reopen-first-glance.spec.ts).
 */

import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

import { TogglLab } from "@/src/timetrack/components/TogglLab"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { ASLEEP_AFTER_MS } from "@/src/timetrack/hooks/useTimetrackSync"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { startTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState } from "./helpers"

const NOON = new Date(2026, 7, 10, 12, 0, 0)
const PC_STOP = new Date(2026, 7, 10, 10, 0, 0).toISOString()

/** The phone's copy: Gym, started at nine and running */
function phoneCopy(): TimetrackState {
  return startTimer(baseState(), { description: "Gym", projectId: null, taskId: null, tagIds: [], billable: false }, new Date(2026, 7, 10, 9, 0).toISOString())
    .state
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

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value, configurable: true })
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"))
  })
}

const bar = () => within(screen.getByTestId("run-bar"))
const gymIn = (copy: TimetrackState) => copy.entries.find((e) => e.duration < 0)!.id

/** Open with the account answering at once, until it has been heard */
async function openHeard(account: ReturnType<typeof fakeAccount>) {
  serve(account)
  render(<TogglLab />)
  for (let i = 0; i < 10 && !screen.queryByRole("button", { name: /^Saved\./ }); i++) await wait(500)
  expect(bar().getByText("Gym"), "the timer never showed once the account had answered").toBeInTheDocument()
}

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOON)
  holdReads = false
  releaseReads = null
  Element.prototype.scrollIntoView = vi.fn()
  window.history.replaceState(null, "", "/test/toggl")
  asPhone()
})

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

test("opening: the bar says Checking… and not the old timer until the account answers, then shows the account's", async () => {
  const copy = phoneCopy()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  account.stop(gymIn(copy), PC_STOP)
  holdReads = true
  serve(account)

  render(<TogglLab />)
  await wait(100)
  expect(bar().getByText("Checking…")).toBeInTheDocument()
  expect(bar().queryByText("Gym"), "the old copy's timer was drawn before the account answered").toBeNull()
  expect(document.title).not.toMatch(/Gym/)

  holdReads = false
  releaseReads?.()
  await wait(1_000)
  expect(bar().getByRole("button", { name: "Start timer" }), "the PC's stop did not reach the bar").toBeInTheDocument()
  expect(bar().queryByText("Checking…")).toBeNull()
})

test("waking after being asleep: the bar says Checking… until the account answers", async () => {
  const copy = phoneCopy()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  await openHeard(account)

  // in a pocket: hidden, and its timers stand still while the clock moves on
  setVisibility("hidden")
  vi.setSystemTime(NOON.getTime() + ASLEEP_AFTER_MS + 60_000)
  account.stop(gymIn(copy), PC_STOP)
  holdReads = true
  setVisibility("visible")

  expect(bar().getByText("Checking…")).toBeInTheDocument()
  expect(bar().queryByText("Gym"), "the woken phone drew the old copy's timer").toBeNull()

  holdReads = false
  releaseReads?.()
  await wait(1_000)
  expect(bar().getByRole("button", { name: "Start timer" })).toBeInTheDocument()
})

test("coming back to a page that stayed awake while hidden: its timer is not hidden", async () => {
  const copy = phoneCopy()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  const account = fakeAccount(stateToRows(copy, "user-1"))
  await openHeard(account)

  // behind another window for half a minute, its heartbeat still beating
  setVisibility("hidden")
  await wait(30_000)
  holdReads = true
  setVisibility("visible")

  expect(bar().getByText("Gym"), "an awake page hid its timer on coming back").toBeInTheDocument()
  expect(bar().queryByText("Checking…")).toBeNull()
  holdReads = false
  releaseReads?.()
})
