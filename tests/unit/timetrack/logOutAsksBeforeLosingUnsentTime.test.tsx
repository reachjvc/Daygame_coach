// @vitest-environment jsdom
/**
 * LOG OUT DOES NOT SILENTLY LOSE WHAT HAS NOT REACHED THE ACCOUNT.
 *
 * Log Out removes everything the time tracker kept in this browser, which is
 * right for a browser somebody else may use next — and was a silent loss in a
 * gym basement: a Stop made with no signal, not yet on the account, was gone
 * the moment the owner logged out. Now Log Out first sends what waits, the way
 * the tracker would, for a few seconds at most; whatever still could not go is
 * named, and only "Log out anyway" throws it away.
 *
 * A sign-out the person did not choose (a password reset) keeps a copy that
 * still holds unsent changes, as a session that ends does: only that account
 * is ever shown or sent it.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { LogOutButton, SEND_BEFORE_LOG_OUT_MS } from "@/components/LogOutButton"
import { ACCOUNT_KEY, OFFLINE_BASE_KEY, PENDING_KEY, STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { stopTimer } from "@/src/timetrack/timetrackService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { TimetrackState } from "@/src/timetrack/types"
import { forgetOfflineCopies } from "@/src/shared/offlineCopies"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const signedOut = vi.hoisted(() => ({ count: 0 }))
vi.mock("@/app/actions/auth", () => ({ signOut: async () => void (signedOut.count += 1) }))

const OWNER = "user-1"
const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
const gymRunning = (): TimetrackState => baseState({ entries: [{ ...shape, stop: null, duration: -epochSeconds(shape.start) }] })

/** The owner's phone: Gym stopped in the basement, and that Stop still waiting in the queue */
function stopWaitingInTheQueue() {
  const stopped = stopTimer(gymRunning(), "2026-08-10T10:30:00.000Z").state
  window.localStorage.setItem(ACCOUNT_KEY, OWNER)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stopped))
  const row = stateToRows(stopped, OWNER).timetrack_entries.find((e) => e.id === "gym")
  window.localStorage.setItem(PENDING_KEY, JSON.stringify({ timetrack_entries: [row] }))
}

function offline() {
  vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
}

function renderLogOut() {
  render(
    <LogOutButton>
      {({ onClick, busy }) => (
        <button type="button" onClick={onClick} disabled={busy}>
          Log Out
        </button>
      )}
    </LogOutButton>,
  )
  fireEvent.click(screen.getByRole("button", { name: "Log Out" }))
}

const queued = () => window.localStorage.getItem(PENDING_KEY) ?? ""

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  signedOut.count = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-08-10T11:00:00.000Z"))
  vi.stubGlobal("caches", { keys: async () => [], delete: async () => true })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("Log Out with changes not saved to the account yet", () => {
  test("logs out at once when nothing is waiting", async () => {
    window.localStorage.setItem(ACCOUNT_KEY, OWNER)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gymRunning()))
    renderLogOut()
    await wait(100)
    expect(signedOut.count).toBe(1)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test("sends them first, and logs out without asking once they are on the account", async () => {
    stopWaitingInTheQueue()
    const account = fakeAccount(stateToRows(gymRunning(), OWNER), { userId: OWNER })
    vi.stubGlobal("fetch", vi.fn(account.fetch))

    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS)

    expect(account.entry("gym")?.stopped_at, "the Stop waiting in the queue was not sent first").toBe("2026-08-10T10:30:00.000Z")
    expect(screen.queryByTestId("log-out-unsent"), "it asked about a change it had already sent").toBeNull()
    expect(signedOut.count).toBe(1)
  })

  test("asks when they cannot be sent, and Stay signed in keeps them", async () => {
    stopWaitingInTheQueue()
    offline()
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS + 500)

    expect(signedOut.count, "logged out and lost the Stop without asking").toBe(0)
    expect(screen.getByTestId("log-out-unsent").textContent).toContain("1 change hasn't reached your account yet")
    fireEvent.click(screen.getByTestId("log-out-stay"))
    await wait(100)

    expect(signedOut.count).toBe(0)
    expect(queued(), "Stay signed in threw the Stop away").toContain("gym")
  })

  test("throws them away only on Log out anyway", async () => {
    stopWaitingInTheQueue()
    offline()
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS + 500)
    fireEvent.click(screen.getByTestId("log-out-anyway"))
    await wait(100)

    expect(signedOut.count).toBe(1)
    expect(queued()).toBe("")
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test("counts a change made before the account answered, which is in no queue yet", async () => {
    window.localStorage.setItem(ACCOUNT_KEY, OWNER)
    window.localStorage.setItem(OFFLINE_BASE_KEY, JSON.stringify({ owner: OWNER, state: gymRunning() }))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stopTimer(gymRunning(), "2026-08-10T10:30:00.000Z").state))
    offline()
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS + 500)

    expect(signedOut.count).toBe(0)
    expect(screen.getByTestId("log-out-unsent").textContent).toContain("1 change hasn't")
  })
})

describe("a sign-out the person did not choose (a password reset)", () => {
  test("keeps a copy that still holds unsent changes, for the same account", async () => {
    stopWaitingInTheQueue()
    await act(async () => forgetOfflineCopies({ keepUnsentTime: true }))
    expect(queued()).toContain("gym")
    expect(window.localStorage.getItem(ACCOUNT_KEY)).toBe(OWNER)
  })

  test("removes a copy with nothing unsent, as Log Out does", async () => {
    window.localStorage.setItem(ACCOUNT_KEY, OWNER)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(gymRunning()))
    await act(async () => forgetOfflineCopies({ keepUnsentTime: true }))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
