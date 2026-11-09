// @vitest-environment jsdom
/**
 * LOG OUT DOES NOT SILENTLY LOSE AUDIT ANSWERS WAITING ON THIS PHONE
 * (alpha test fast-audit-01).
 *
 * An answer given with no signal waits in `audit-queue-v1`. Log Out wiped it
 * with no word, because it counted only Time's unsent changes. Now it sends
 * what waits first, asks about what still could not go, and only "Log out
 * anyway" throws it away — the same as for Time.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { LogOutButton, SEND_BEFORE_LOG_OUT_MS } from "@/components/LogOutButton"
import { AUDIT_QUEUE_KEY, emptyAuditQueue, enqueueAnswers, unsentAuditChanges, writeAuditQueue } from "@/src/audit/auditQueue"
import type { AuditAnswer } from "@/src/audit/types"

const signedOut = vi.hoisted(() => ({ count: 0 }))
vi.mock("@/app/actions/auth", () => ({ signOut: async () => void (signedOut.count += 1) }))

const OWNER = "user-1"
const waiting: AuditAnswer = {
  id: "00000000-0000-4000-8000-0000000000a1",
  runId: "00000000-0000-4000-8000-000000000001",
  slotAt: "2026-11-09T15:30:00.000Z",
  activity: "Approached in the metro",
  energy: 6,
  growth: 7,
  avoiding: false,
  why: null,
  source: "later",
  timeEntryId: null,
  answeredAt: "2026-11-09T15:50:00.000Z",
}

function answerWaitingOnThePhone() {
  writeAuditQueue(window.localStorage, enqueueAnswers(emptyAuditQueue(OWNER), [waiting]))
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

/** The account: stores what is sent with its name, answers 409 for anyone else's. */
function account(signedIn = OWNER) {
  const stored: AuditAnswer[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const who = (init?.headers as Record<string, string> | undefined)?.["x-page-account"] ?? null
      if (url.startsWith("/api/audit/slots") && init?.method === "PUT") {
        if (who !== null && who !== signedIn) return new Response(JSON.stringify({ error: "Opened for another account" }), { status: 409 })
        const body = JSON.parse(String(init.body)) as { slots: AuditAnswer[] }
        stored.push(...body.slots)
        return new Response(JSON.stringify({ stored: body.slots.length, refused: [] }), { status: 200 })
      }
      return new Response("{}", { status: 200 })
    }),
  )
  return stored
}

beforeEach(() => {
  window.localStorage.clear()
  signedOut.count = 0
  vi.useFakeTimers()
  vi.stubGlobal("caches", { keys: async () => [], delete: async () => true })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.localStorage.clear()
})

describe("Log Out with an audit answer still waiting on the phone", () => {
  test("sends it first, and logs out without asking once it is on the account", async () => {
    answerWaitingOnThePhone()
    const stored = account()
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS)
    expect(stored.map((a) => a.activity), "the waiting answer was not sent first").toEqual(["Approached in the metro"])
    expect(screen.queryByTestId("log-out-unsent")).toBeNull()
    expect(signedOut.count).toBe(1)
  })

  test("asks when it cannot be sent, and Stay signed in keeps it", async () => {
    answerWaitingOnThePhone()
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS + 500)
    expect(signedOut.count, "logged out and lost the answer without asking").toBe(0)
    expect(screen.getByTestId("log-out-unsent").textContent).toContain("1 change hasn't reached your account yet")
    fireEvent.click(screen.getByTestId("log-out-stay"))
    await wait(100)
    expect(signedOut.count).toBe(0)
    expect(unsentAuditChanges(window.localStorage)).toBe(1)
  })

  test("throws it away only on Log out anyway", async () => {
    answerWaitingOnThePhone()
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS + 500)
    fireEvent.click(screen.getByTestId("log-out-anyway"))
    await wait(100)
    expect(signedOut.count).toBe(1)
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).toBeNull()
  })

  test("an answer the account refuses for good is named, kept on Stay signed in, and dropped only on Log out anyway", async () => {
    answerWaitingOnThePhone()
    const tries = { n: 0 }
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.startsWith("/api/audit/slots") && init?.method === "PUT") {
          tries.n += 1
          const body = JSON.parse(String(init.body)) as { slots: AuditAnswer[] }
          return new Response(JSON.stringify({ stored: 0, refused: body.slots.map((s) => ({ id: s.id, error: "Changed on another device since", retry: false })) }), { status: 200 })
        }
        return new Response("{}", { status: 200 })
      }),
    )
    renderLogOut()
    await wait(1000)
    // asked at once: waiting longer could not change the answer
    expect(signedOut.count).toBe(0)
    expect(screen.getByTestId("log-out-not-kept").textContent).toContain("Approached in the metro: Changed on another device since")
    expect(screen.getByTestId("log-out-unsent").textContent).toContain("1 audit answer can't be saved")
    expect(screen.getByTestId("log-out-unsent").textContent).not.toContain("hasn't reached")
    expect(tries.n, "it kept resending what can never be stored").toBe(1)
    fireEvent.click(screen.getByTestId("log-out-stay"))
    await wait(100)
    expect(unsentAuditChanges(window.localStorage), "Stay signed in threw it away").toBe(1)

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }))
    await wait(1000)
    fireEvent.click(screen.getByTestId("log-out-anyway"))
    await wait(100)
    expect(signedOut.count).toBe(1)
    expect(window.localStorage.getItem(AUDIT_QUEUE_KEY)).toBeNull()
  })

  test("a send the server rejects outright (400) is named too, not dropped in silence", async () => {
    answerWaitingOnThePhone()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "The audit could not save that" }), { status: 400 })))
    renderLogOut()
    await wait(1000)
    expect(signedOut.count).toBe(0)
    expect(screen.getByTestId("log-out-not-kept").textContent).toContain("Approached in the metro")
    expect(unsentAuditChanges(window.localStorage)).toBe(1)
  })

  test("another account's waiting answers are not sent and do not hold the person back", async () => {
    answerWaitingOnThePhone()
    const stored = account("user-2")
    renderLogOut()
    await wait(SEND_BEFORE_LOG_OUT_MS)
    expect(stored).toHaveLength(0)
    expect(screen.queryByTestId("log-out-unsent")).toBeNull()
    expect(signedOut.count).toBe(1)
  })
  test("an answer another device beat is shown next to that device's answer (review of a5d7a5f0)", async () => {
    answerWaitingOnThePhone()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.startsWith("/api/audit/slots") && init?.method === "PUT") {
          const body = JSON.parse(String(init.body)) as { slots: AuditAnswer[] }
          const stored = { id: "pc-1", activity: "Email", energy: 2, growth: 3, why: null }
          return new Response(JSON.stringify({ stored: 0, refused: body.slots.map((s) => ({ id: s.id, error: "Changed on another device since", retry: false, stored })) }), { status: 200 })
        }
        return new Response("{}", { status: 200 })
      }),
    )
    renderLogOut()
    await wait(1000)
    const item = screen.getByTestId("log-out-not-kept-item").textContent ?? ""
    expect(item).toContain("Approached in the metro: Changed on another device since")
    expect(item).toContain("Yours: E 6")
    expect(item).toContain("On the other device: Email · E 2 · G 3")
    expect(signedOut.count).toBe(0)
  })
})
