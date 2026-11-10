// @vitest-environment jsdom
/**
 * LOG OUT WITH NO SIGNAL STILL LOGS OUT ON THIS PHONE (alpha test p9-offline-01).
 *
 * Log Out wiped the phone's copies first, then asked the server to sign out.
 * With no signal that ask failed: the screen said everything was safe, the
 * session cookie stayed, and when signal came back he was still signed in —
 * on a handed-over phone, the next person was in his account. Now the
 * session's cookies go from this browser whatever the network does, and the
 * copies are wiped only after that.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { LogOutButton, SEND_BEFORE_LOG_OUT_MS } from "@/components/LogOutButton"
import { AUDIT_QUEUE_KEY, emptyAuditQueue, enqueueAnswers, writeAuditQueue } from "@/src/audit/auditQueue"
import type { AuditAnswer } from "@/src/audit/types"

const server = vi.hoisted(() => ({ signOut: vi.fn(), order: [] as string[] }))
vi.mock("@/app/actions/auth", () => ({ signOut: server.signOut }))

const noSignal = () => Promise.reject(new TypeError("Failed to fetch"))

const waiting: AuditAnswer = {
  id: "00000000-0000-4000-8000-0000000000b1",
  runId: "00000000-0000-4000-8000-000000000001",
  slotAt: "2026-11-09T15:30:00.000Z",
  activity: "Walked to the station",
  energy: 5,
  growth: 5,
  avoiding: false,
  why: null,
  source: "later",
  timeEntryId: null,
  answeredAt: "2026-11-09T15:50:00.000Z",
}

const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

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

function signedInHere() {
  document.cookie = "sb-test-auth-token.0=part-one; path=/"
  document.cookie = "sb-test-auth-token.1=part-two; path=/"
  document.cookie = "theme=dark; path=/"
}

const sessionCookies = () =>
  document.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((name) => name.startsWith("sb-"))

/** This browser's push subscription; `forget` is how the server answers the request to remove it. */
function pushSubscription(forget: () => Promise<Response>) {
  const unsubscribe = vi.fn(async () => true)
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => ({
        pushManager: { getSubscription: async () => ({ endpoint: "https://push.example/abc", unsubscribe }) },
        getNotifications: async () => [],
      }),
    },
  })
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => (url === "/api/notifications/devices/forget" ? forget() : noSignal())),
  )
  return unsubscribe
}

beforeEach(() => {
  window.localStorage.clear()
  server.signOut.mockReset()
  vi.useFakeTimers()
  vi.stubGlobal("caches", { keys: async () => [], delete: async () => true })
  vi.stubGlobal("fetch", vi.fn(noSignal))
  signedInHere()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
  for (const name of document.cookie.split(";").map((c) => c.trim().split("=")[0])) {
    if (name) document.cookie = `${name}=; Max-Age=0; path=/`
  }
  Reflect.deleteProperty(navigator, "serviceWorker")
})

describe("Log Out with no signal", () => {
  test("nothing waiting: the session's cookies leave this browser although the server cannot be reached", async () => {
    server.signOut.mockImplementation(noSignal)
    renderLogOut()
    await wait(100)
    expect(server.signOut).toHaveBeenCalledTimes(1)
    expect(sessionCookies(), "still signed in on this phone after Log Out").toEqual([])
    expect(document.cookie, "a cookie that is not the session went too").toContain("theme=dark")
  })

  test("a server that never answers does not hold the phone signed in", async () => {
    server.signOut.mockImplementation(() => new Promise(() => {}))
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS + 100)
    expect(sessionCookies()).toEqual([])
  })

  test("Log out anyway: the waiting answer goes only together with the session", async () => {
    writeAuditQueue(window.localStorage, enqueueAnswers(emptyAuditQueue("user-1"), [waiting]))
    server.signOut.mockImplementation(async () => {
      server.order.push(window.localStorage.getItem(AUDIT_QUEUE_KEY) === null ? "wiped before sign-out" : "kept until sign-out")
      return noSignal()
    })
    server.order = []
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS + 500)
    expect(sessionCookies(), "signed out before he chose").toHaveLength(2)
    fireEvent.click(screen.getByTestId("log-out-anyway"))
    await wait(100)
    expect(server.order).toEqual(["kept until sign-out"])
    expect(sessionCookies()).toEqual([])
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).toBeNull()
  })

  test("the server cannot remove this phone's push address, so the phone stops listening itself", async () => {
    server.signOut.mockImplementation(noSignal)
    const unsubscribe = pushSubscription(noSignal)
    renderLogOut()
    await wait(100)
    expect(unsubscribe, "pings would keep arriving after Log Out").toHaveBeenCalledTimes(1)
  })

  test("with signal the server removes it and the phone keeps its subscription for the next sign-in", async () => {
    server.signOut.mockImplementation(async () => ({ ok: true }))
    const unsubscribe = pushSubscription(async () => new Response("{}", { status: 200 }))
    renderLogOut()
    await wait(100)
    expect(unsubscribe).not.toHaveBeenCalled()
    expect(sessionCookies()).toEqual([])
  })
})
