// @vitest-environment jsdom
/**
 * ANOTHER PERSON ON THE SAME BROWSER NEVER GETS YOUR TRACKER.
 *
 * Everything the tracker kept in a browser — the workspace, the unsent queue,
 * the timer bar's draft — was tied to nobody and outlived Log Out. Person A
 * tracks "A private therapy session" and logs out; person B signs in on that
 * browser and opens Time. B was shown A's entries, A's name in Settings and
 * A's half-typed description, and in two ways had A's entry uploaded into B's
 * own account: from the queue left behind, and from A's tab still open when B
 * signed in elsewhere. That tab also started showing B's entries (a privacy
 * audit, 2026-11-04).
 *
 * Now the copy belongs to one account (`browserOwner`): Log Out removes all of
 * it, an account opening Time removes any other account's copy before reading
 * it, a tab whose account changed underneath it sends and keeps nothing more
 * and starts again, and the server refuses rows named for another account. A
 * copy kept before any of this existed is the first account's, as it always was.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { claimBrowserCopy, forgetTimeTrackerOnThisDevice } from "@/src/timetrack/browserOwner"
import { TimetrackScreen } from "@/src/timetrack/components/TimetrackScreen"
import { ACCOUNT_KEY, PENDING_KEY, STORAGE_KEY, TIMER_BAR_KEY } from "@/src/timetrack/config"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import type { TimetrackState } from "@/src/timetrack/types"
import { forgetOfflineCopies } from "@/src/shared/offlineCopies"
import TogglTestPage from "@/app/test/toggl/page"

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
const SECRET = "A private therapy session"
const DRAFT = "A unsent: call the clinic about results"

/** What A's browser holds: one entry, A's name, and a description typed into the timer bar */
function aCopy(): TimetrackState {
  const state = baseState({ entries: [entry("therapy", "2026-08-10", "09:00", "10:00", { description: SECRET })] })
  return { ...state, user: { ...state.user, name: "Alice Private" } }
}

function leaveACopy({ owner, queued }: { owner: string | null; queued: boolean }) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(aCopy()))
  window.sessionStorage.setItem(
    TIMER_BAR_KEY,
    JSON.stringify({ mode: "timer", draft: { description: DRAFT, projectId: null, taskId: null, tagIds: [], billable: false } }),
  )
  if (queued) {
    const row = stateToRows(aCopy(), A).timetrack_entries.find((e) => e.id === "therapy")
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ timetrack_entries: [row] }))
  }
  if (owner !== null) window.localStorage.setItem(ACCOUNT_KEY, owner)
}

/** Anywhere on the page: text, or a field's value */
function shown(text: string): boolean {
  if (document.body.textContent?.includes(text)) return true
  return [...document.querySelectorAll("input, textarea")].some((field) => (field as HTMLInputElement).value.includes(text))
}

/** Anything this browser keeps for the tracker */
function kept(text: string): boolean {
  for (const store of [window.localStorage, window.sessionStorage]) {
    for (let i = 0; i < store.length; i++) if (store.getItem(store.key(i)!)?.includes(text)) return true
  }
  return false
}

function sentInto(account: ReturnType<typeof fakeAccount>, entryId: string): boolean {
  return account.posts.some((post) => (post.body.rows?.timetrack_entries ?? []).some((row) => row.id === entryId))
}

function serve(account: ReturnType<typeof fakeAccount> | "signed-out" | "offline") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      if (account === "offline") throw new TypeError("Failed to fetch")
      if (account === "signed-out") return { ok: false, status: 401, json: async () => ({}) }
      return account.fetch(url, init)
    }),
  )
}

const main = () => within(screen.getByRole("main"))

async function open(account: string) {
  render(<TimetrackScreen account={account} />)
  await wait(2_000)
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

describe("A, then B, on one browser", () => {
  test("after A logs out, B opening Time is shown nothing of A's, and sends nothing of A's", async () => {
    leaveACopy({ owner: A, queued: true })
    await forgetOfflineCopies()
    expect(kept(SECRET) || kept(DRAFT), "Log Out left A's tracker in this browser").toBe(false)

    const bs = fakeAccount(stateToRows(baseState(), B), { userId: B })
    serve(bs)
    await open(B)

    expect(shown(SECRET), "B is shown A's entry").toBe(false)
    expect(shown("Alice Private"), "B is shown A's name").toBe(false)
    expect(shown(DRAFT), "B finds A's half-typed description").toBe(false)
    expect(sentInto(bs, "therapy"), "A's entry went into B's account").toBe(false)
  })

  test("when A's session ended without Log Out, B is shown and sent nothing of A's either", async () => {
    leaveACopy({ owner: A, queued: true })

    const bs = fakeAccount(stateToRows(baseState(), B), { userId: B })
    serve(bs)
    await open(B)

    expect(shown(SECRET), "B is shown A's entry").toBe(false)
    expect(shown(DRAFT), "B finds A's half-typed description").toBe(false)
    expect(sentInto(bs, "therapy"), "A's queued entry went into B's account").toBe(false)
    expect(bs.entry("therapy")).toBeUndefined()
    expect(kept(SECRET), "A's tracker is still kept in this browser").toBe(false)
  })

  test("a copy kept before owners were recorded is the first account's, unsent work and all", async () => {
    leaveACopy({ owner: null, queued: true })

    const as = fakeAccount(stateToRows(baseState(), A), { userId: A })
    serve(as)
    await open(A)

    expect(as.entry("therapy")?.description, "the owner's own unsent entry was thrown away").toBe(SECRET)
    expect(window.localStorage.getItem(ACCOUNT_KEY)).toBe(A)
  })
})

describe("A's tab, still open when B signs in elsewhere on the same browser", () => {
  test("sends nothing of A's into B's account, shows nothing of B's, and starts again", async () => {
    const as = fakeAccount(stateToRows(baseState(), A), { userId: A })
    serve(as)
    await open(A)

    // A's session ends while the tracker is open, and A tracks something
    serve("signed-out")
    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), { target: { value: SECRET } })
    fireEvent.click(main().getByRole("button", { name: "Start timer" }))
    await wait(3_000)
    expect(screen.getByRole("button", { name: /^Signed out/ }), "the session never read as ended").toBeInTheDocument()

    // B signs in, in another tab; B has an entry of B's own
    const bs = fakeAccount(
      stateToRows(baseState({ entries: [entry("diary", "2026-08-10", "07:00", "07:30", { description: "B private diary entry" })] }), B),
      { userId: B },
    )
    serve(bs)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })
    await wait(16_000)

    expect(bs.posts.length, "A's tab sent A's work into B's account").toBe(0)
    expect(shown("B private diary entry"), "A's tab shows B's entry").toBe(false)
    expect(restarts.count, "A's tab carried on as A in B's session").toBeGreaterThan(0)
  })

  test("a check answered as B is not applied, and the tab starts again", async () => {
    const as = fakeAccount(stateToRows(baseState(), A), { userId: A })
    serve(as)
    await open(A)

    const bs = fakeAccount(
      stateToRows(baseState({ entries: [entry("diary", "2026-08-10", "07:00", "07:30", { description: "B private diary entry" })] }), B),
      { userId: B },
    )
    serve(bs)
    act(() => {
      window.dispatchEvent(new Event("online"))
    })
    await wait(2_000)

    expect(shown("B private diary entry"), "A's tab shows B's entry").toBe(false)
    expect(restarts.count).toBeGreaterThan(0)
  })

  test("once B's tab claims the browser, A's tab writes nothing more to it", async () => {
    const as = fakeAccount(stateToRows(baseState(), A), { userId: A })
    serve(as)
    await open(A)

    // B opens Time in another tab: the browser's copy is B's from now on
    claimBrowserCopy(B)
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: ACCOUNT_KEY, newValue: B }))
    })
    expect(restarts.count, "A's tab did not start again").toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), { target: { value: SECRET } })
    fireEvent.click(main().getByRole("button", { name: "Start timer" }))
    await wait(2_000)

    expect(kept(SECRET), "A's tab wrote A's work into the copy that is B's now").toBe(false)
    expect(sentInto(as, "therapy")).toBe(false)
  })
})

describe("the gaps a security review found (2026-11-04)", () => {
  test("a tab that held A's draft does not show it to B, though B claimed the browser in another tab", async () => {
    // B opened Time in another tab, so the browser is B's already; this tab still holds A's draft
    window.localStorage.setItem(ACCOUNT_KEY, B)
    window.sessionStorage.setItem("toggl-clone:tab-account", A)
    window.sessionStorage.setItem(
      TIMER_BAR_KEY,
      JSON.stringify({ mode: "timer", draft: { description: DRAFT, projectId: null, taskId: null, tagIds: [], billable: false } }),
    )
    serve(fakeAccount(stateToRows(baseState(), B), { userId: B }))
    await open(B)
    expect(shown(DRAFT), "B's timer bar shows A's half-typed description").toBe(false)
  })

  test("a copy kept before owners were recorded, whose own rows name A, is not adopted by B", async () => {
    leaveACopy({ owner: null, queued: true })
    const bs = fakeAccount(stateToRows(baseState(), B), { userId: B })
    serve(bs)
    await open(B)
    expect(shown(SECRET), "B is shown A's entry").toBe(false)
    expect(sentInto(bs, "therapy"), "A's queued entry went into B's account").toBe(false)
    expect(kept(SECRET)).toBe(false)
  })

  test("Log Out in a tab still retrying a send is not undone by the tracker starting again", async () => {
    const as = fakeAccount(stateToRows(baseState(), A), { userId: A })
    serve(as)
    await open(A)
    // a weak signal: the send fails and waits to be retried
    serve("offline")
    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), { target: { value: "Gym" } })
    fireEvent.click(main().getByRole("button", { name: "Start timer" }))
    await wait(1_500)

    // "Log out anyway": the copy goes, and the session ends a few seconds later
    forgetTimeTrackerOnThisDevice()
    const sentBefore = as.posts.length
    serve(as)
    await wait(10_000)
    expect(restarts.count, "the page reloaded before the sign-out, still signed in").toBe(0)
    expect(as.posts.length, "the tracker kept sending after Log Out began").toBe(sentBefore)
  })
})

describe("a second tracker tab while Log Out runs in another (a code review, 2026-11-04)", () => {
  test("stops and says it is logged out, instead of reloading and claiming the browser again", async () => {
    const as = fakeAccount(stateToRows(aCopy(), A), { userId: A })
    leaveACopy({ owner: A, queued: false })
    serve(as)
    await open(A)

    // Log Out in the other tab: the copy goes, the mark is left, the session ends seconds later
    forgetTimeTrackerOnThisDevice()
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: ACCOUNT_KEY, newValue: "" }))
    })
    await wait(500)

    expect(restarts.count, "the tab reloaded while the session still held, and claimed the browser again").toBe(0)
    expect(screen.getByText(/You logged out/)).toBeInTheDocument()
    expect(shown(SECRET), "the tracker is still drawn after Log Out").toBe(false)
    expect(window.localStorage.getItem(ACCOUNT_KEY)).toBe("")
    expect(kept(SECRET), "this tab wrote the copy back after Log Out removed it").toBe(false)
  })

  test("in the tab that logs out, the tracker says so rather than going on without saving", async () => {
    const as = fakeAccount(stateToRows(aCopy(), A), { userId: A })
    leaveACopy({ owner: A, queued: false })
    serve(as)
    await open(A)

    // Log Out here, and the sign-out itself does not get through (no signal)
    forgetTimeTrackerOnThisDevice()
    await wait(500)
    expect(screen.getByText(/You logged out/)).toBeInTheDocument()
    expect(shown(SECRET)).toBe(false)
  })
})

describe("A's page, brought back from the back-forward cache after B signed in on that tab", () => {
  test("starts again before anyone reads it", async () => {
    const as = fakeAccount(stateToRows(aCopy(), A), { userId: A })
    leaveACopy({ owner: A, queued: false })
    serve(as)
    await open(A)

    // frozen meanwhile, so it heard nothing: Log Out, then B claimed the browser
    forgetTimeTrackerOnThisDevice()
    claimBrowserCopy(B)
    const restored = Object.assign(new Event("pageshow"), { persisted: true })
    act(() => {
      window.dispatchEvent(restored)
    })
    expect(restarts.count, "A's page came back from the cache showing A's tracker").toBeGreaterThan(0)
  })
})

describe("the lab page, signed out", () => {
  test("does not show the tracker an account left in this browser", async () => {
    leaveACopy({ owner: A, queued: false })
    serve("signed-out")
    render(<TogglTestPage />)
    await wait(1_000)
    expect(shown(SECRET), "the lab shows A's entry to whoever opens it").toBe(false)
  })

  test("works as before once Log Out has taken the copy away", async () => {
    leaveACopy({ owner: A, queued: false })
    forgetTimeTrackerOnThisDevice()
    serve("signed-out")
    render(<TogglTestPage />)
    await wait(1_000)
    expect(main().getByRole("button", { name: "Start timer" })).toBeInTheDocument()
    expect(shown(SECRET)).toBe(false)
  })
})
