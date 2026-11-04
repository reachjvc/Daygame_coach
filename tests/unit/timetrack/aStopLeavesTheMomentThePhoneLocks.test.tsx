// @vitest-environment jsdom
/**
 * A STOP LEAVES THE MOMENT THE PHONE LOCKS (design rule D3).
 *
 * Changes waited 800 ms before they were sent, and nothing was sent when the
 * app was hidden, closed or left: leaving the tracker cancelled the wait, and
 * an upload already in the air was cut off. Stop, then lock the phone at once,
 * and the PC could show the timer running for hours (sync defect #5 and
 * getting-around #1 in Plans/time-tracker-like-toggl.md).
 *
 * Now the queue goes the moment the page is hidden, closed or left, with
 * `keepalive`, so the browser finishes the request even if the page does not
 * live to see the answer. A keepalive request may carry 64 KB at most: what
 * fits goes, and the rest stays queued for the next send.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { cleanup } from "@testing-library/react"

import { PENDING_KEY } from "@/src/timetrack/config"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { stateToRows } from "@/src/timetrack/timetrackMapperService"
import { stopTimer } from "@/src/timetrack/timetrackService"
import type { TimetrackState } from "@/src/timetrack/types"

import { renderDevice, wait } from "./deviceHarness"
import { fakeAccount } from "./fakeAccount"
import { baseState, entry } from "./helpers"

const USER = "user-1"

beforeEach(() => {
  window.localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"))
})

afterEach(() => {
  setVisibility("visible")
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value, configurable: true })
  document.dispatchEvent(new Event("visibilitychange"))
}

const shape = entry("gym", "2026-08-10", "09:00", "10:00", { description: "Gym" })
const gym = { ...shape, stop: null, duration: -epochSeconds(shape.start) }
const withGymRunning = (): TimetrackState => baseState({ entries: [gym] })
const stop = (current: TimetrackState) => stopTimer(current, new Date().toISOString()).state

async function phoneWithGymRunning() {
  const account = fakeAccount(stateToRows(withGymRunning(), USER))
  const fetch = vi.fn(account.fetch)
  vi.stubGlobal("fetch", fetch)
  const phone = renderDevice(withGymRunning())
  await wait(100)
  expect(account.entry("gym")?.stopped_at, "the account should start with Gym running").toBeNull()
  const posts = () => fetch.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")
  return { account, phone, posts }
}

describe("a stop made just before the phone is locked, closed or left", () => {
  test("goes when the page is hidden, without waiting out the 800 ms", async () => {
    const { account, phone, posts } = await phoneWithGymRunning()
    phone.apply(stop)
    setVisibility("hidden")
    await wait(10)

    expect(account.entry("gym")?.stopped_at, "the stop waited for the debounce; a locked phone never sends it").not.toBeNull()
    expect((posts()[0]?.[1] as RequestInit | undefined)?.keepalive, "sent without keepalive, so the browser may drop it").toBe(true)
  })

  test("goes when the page is closed", async () => {
    const { account, phone } = await phoneWithGymRunning()
    phone.apply(stop)
    window.dispatchEvent(new Event("pagehide"))
    await wait(10)

    expect(account.entry("gym")?.stopped_at, "closing the app within 800 ms of Stop lost the stop").not.toBeNull()
  })

  test("goes when the tracker is left, and the send is not cut off", async () => {
    const { account, phone } = await phoneWithGymRunning()
    phone.apply(stop)
    phone.unmount()
    await wait(10)

    expect(account.entry("gym")?.stopped_at, "leaving the tracker cancelled the send").not.toBeNull()
    expect(window.localStorage.getItem(PENDING_KEY) ?? "{}", "the sent stop stayed queued and would go again").not.toContain(
      '"gym"',
    )
  })

  test("an upload already in the air when the tracker is left still lands", async () => {
    const account = fakeAccount(stateToRows(withGymRunning(), USER))
    // a server that has not read the request yet: aborting it now means it never arrives
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => (release = resolve))
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const aborted = new Promise<never>((_, reject) =>
          init.signal?.addEventListener("abort", () => reject(new DOMException("The user aborted a request.", "AbortError"))),
        )
        await Promise.race([held, aborted])
      }
      return account.fetch(url, init as { method?: string; body?: string })
    })
    const phone = renderDevice(withGymRunning())
    await wait(100)
    phone.apply(stop)
    await wait(900) // the debounced upload is in the air now
    phone.unmount()
    release()
    await wait(10)

    expect(account.entry("gym")?.stopped_at, "leaving aborted the upload that was in the air").not.toBeNull()
  })

  test("a queue bigger than one keepalive request sends what fits, then the rest, each within the limit", async () => {
    const many = baseState({
      entries: Array.from({ length: 300 }, (_, i) =>
        entry(`e${i}`, "2026-08-10", "08:00", "08:30", { description: `entry ${i}` }),
      ),
    })
    const account = fakeAccount(stateToRows(many, USER))
    const fetch = vi.fn(account.fetch)
    vi.stubGlobal("fetch", fetch)
    const phone = renderDevice(many)
    await wait(100)

    // three hundred long descriptions: well over 64 KB as one request
    phone.apply((current) => ({
      ...current,
      entries: current.entries.map((e) => ({ ...e, description: `${e.description} ${"x".repeat(400)}`, at: new Date().toISOString() })),
    }))
    const release = account.holdPosts()
    setVisibility("hidden")
    await wait(10)

    const posts = () =>
      fetch.mock.calls.map(([, init]) => init as RequestInit | undefined).filter((init) => init?.method === "POST")
    const rowsIn = (init: RequestInit | undefined) =>
      ((JSON.parse(String(init?.body)) as { rows: { timetrack_entries?: unknown[] } }).rows.timetrack_entries ?? []).length
    expect(posts().length, "nothing was sent on the way out").toBe(1)
    expect(rowsIn(posts()[0]), "all of it went in one keepalive request, which a browser refuses").toBeLessThan(300)
    expect(window.localStorage.getItem(PENDING_KEY) ?? "", "the rest must stay queued").toContain("entry 299")

    // while the page is still there, the rest follows, part by part
    release()
    await wait(100)
    for (const init of posts()) {
      expect(init?.keepalive).toBe(true)
      expect(new TextEncoder().encode(String(init?.body)).length, "a keepalive body over 64 KB is refused by the browser").toBeLessThanOrEqual(
        64 * 1024,
      )
    }
    const sent = Array.from({ length: 300 }, (_, i) => String(account.entry(`e${i}`)?.description ?? "")).filter((d) => d.endsWith("x"))
    expect(sent.length).toBe(300)
  })
})
