// @vitest-environment jsdom
/**
 * A TAB THAT SAYS "YOU LOGGED OUT IN ANOTHER TAB" COMES BACK WHEN THE SAME PERSON DOES.
 *
 * Found by the account-switching audit (Phase 8 of Plans/toggl-parity.md,
 * `two-tabs-same-person.spec.ts`). Two tabs on Time; A logs out in the second,
 * and the first stops and says so. A signs in again in the second tab and opens
 * Time there. The first tab stayed on "You logged out in another tab" for as
 * long as it was open — it started again only for a DIFFERENT account — and its
 * "Sign in again" opened the login form although A was signed in.
 *
 * Now the same account claiming the browser again starts this tab again too,
 * as A, and "Sign in again" opens Time, which asks for a sign-in only when
 * there is none. Somebody else claiming it starts the tab again as before:
 * the reload asks who is signed in, and nothing of A's is kept to show.
 */

import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { forgetTimeTrackerOnThisDevice } from "@/src/timetrack/browserOwner"
import { TimetrackScreen } from "@/src/timetrack/components/TimetrackScreen"
import { ACCOUNT_KEY, STORAGE_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"

import { wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const restarts = vi.hoisted(() => ({ count: 0 }))
vi.mock("@/src/timetrack/browserOwner", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/src/timetrack/browserOwner")>()
  return { ...original, startAgain: () => (restarts.count += 1) }
})

const A = "user-a"
const B = "user-b"

/** A's tracker, open in this tab */
async function openAsA() {
  const copy = baseState({ entries: [entry("call", "2026-08-10", "09:00", "10:00", { description: "A's call" })] })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(copy))
  window.localStorage.setItem(ACCOUNT_KEY, A)
  const account = fakeAccount(stateToRows(copy, A), { userId: A })
  vi.stubGlobal("fetch", (url: string, init?: { method?: string; body?: string }) => account.fetch(url, init))
  render(<TimetrackScreen account={A} />)
  await wait(2_000)
}

/** What another tab opening Time as `account` leaves in the storage this tab shares */
function claimedInAnotherTab(account: string) {
  window.localStorage.setItem(ACCOUNT_KEY, account)
}

/** what this tab hears when another tab of the browser changes whose copy it is */
function heardFromAnotherTab(owner: string) {
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: ACCOUNT_KEY, newValue: owner }))
  })
}

/** What another tab's Log Out leaves in the storage this tab shares: nothing of the tracker, and the mark */
async function logOutInAnotherTab() {
  window.localStorage.clear()
  window.localStorage.setItem(ACCOUNT_KEY, "")
  heardFromAnotherTab("")
  await wait(500)
  expect(screen.getByText(/You logged out in another tab/)).toBeInTheDocument()
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  restarts.count = 0
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 10, 12, 0, 0))
  vi.stubGlobal("caches", { keys: async () => [], delete: async () => true })
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
  window.history.replaceState(null, "", "/time")
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe("a tab left saying A logged out in another tab", () => {
  test("starts again once A has opened Time again in another tab", async () => {
    await openAsA()
    await logOutInAnotherTab()

    // A signs in again in the other tab and opens Time there, which claims the browser
    claimedInAnotherTab(A)
    heardFromAnotherTab(A)

    expect(restarts.count, "the tab stayed on \"You logged out\" while A was signed in again").toBeGreaterThan(0)
  })

  test("starts again too when it heard nothing meanwhile and is looked at again", async () => {
    await openAsA()
    await logOutInAnotherTab()

    // a phone froze this tab: it heard no storage event, and is brought to the front later
    claimedInAnotherTab(A)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(restarts.count, "the tab only finds out when somebody reloads it").toBeGreaterThan(0)
  })

  test("starts again for somebody else as before, and stays logged out until then", async () => {
    await openAsA()
    await logOutInAnotherTab()
    expect(restarts.count).toBe(0)
    expect(document.body.textContent, "A's tracker is still drawn").not.toContain("A's call")

    claimedInAnotherTab(B)
    heardFromAnotherTab(B)

    expect(restarts.count).toBeGreaterThan(0)
  })

  test("but the tab that logged out itself does not reload, which could cut off its own sign-out", async () => {
    await openAsA()
    forgetTimeTrackerOnThisDevice()
    await wait(500)
    expect(screen.getByText(/You logged out\./)).toBeInTheDocument()

    claimedInAnotherTab(A)
    heardFromAnotherTab(A)

    expect(restarts.count).toBe(0)
  })

  test("its Sign in again opens Time, not the login form, which asks only when nobody is signed in", async () => {
    await openAsA()
    await logOutInAnotherTab()

    expect(screen.getByRole("link", { name: "Sign in again" }).getAttribute("href")).toBe("/time")
  })
})
