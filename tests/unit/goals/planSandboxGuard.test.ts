// @vitest-environment jsdom
/**
 * WHAT THE COPY-SPACE PAGE MAY SEND (Plans/plan-in-steps.md, Phase 2.6).
 *
 * `guardSandboxRequests` is the page's own wall: every request it makes either
 * acts on the hidden account or never leaves the browser. The browser suite
 * (tests/e2e/plan-sandbox.spec.ts) proves the same against the real page; this
 * pins the rule per route.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { guardSandboxRequests, isSandboxAccount, planApiUrl } from "@/src/goals/planAccount"
import { PAGE_ACCOUNT_HEADER } from "@/src/shared/pageAccount"

const HIDDEN = "00000000-0000-4000-8000-0000000000c3"
const OWNER = "00000000-0000-4000-8000-0000000000a1"

let sent: { url: URL; method: string; headers: Headers }[]
let undo: () => void
let before: typeof fetch

beforeEach(() => {
  sent = []
  before = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href)
    sent.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers: new Headers(init?.headers) })
    return new Response("{}", { status: 200 })
  }) as unknown as typeof fetch
  globalThis.fetch = before
  undo = guardSandboxRequests(HIDDEN)
})
afterEach(() => undo())

describe("the copy space page's requests", () => {
  it("aims the plan and day routes at the copy space and names the hidden account, whatever the caller wrote", async () => {
    for (const [path, method] of [["/api/life-plan", "GET"], ["/api/life-plan", "PATCH"], ["/api/life-plan", "POST"], ["/api/life-plan/day", "GET"], ["/api/life-plan/day", "PUT"]]) {
      await fetch(path, { method, headers: { [PAGE_ACCOUNT_HEADER]: OWNER } })
    }
    expect(sent).toHaveLength(5)
    for (const s of sent) {
      expect(s.url.searchParams.get("target")).toBe("sandbox")
      expect(s.headers.get(PAGE_ACCOUNT_HEADER)).toBe(HIDDEN)
    }
  })

  it("replaces a different target a caller put on the address", async () => {
    await fetch(`/api/life-plan?target=self`, { method: "PATCH" })
    expect(sent[0].url.searchParams.getAll("target")).toEqual(["sandbox"])
  })

  it("never sends a write to any other route: it fails like a dropped connection, not a refusal", async () => {
    const writes: [string, string][] = [
      ["/api/life-plan/reminders", "PUT"],
      ["/api/notifications/devices", "POST"],
      ["/api/notifications/devices/forget", "POST"],
      ["/api/programs/enrollments/abc/schedule", "PUT"],
      ["/api/programs/enrollments/abc", "DELETE"],
      ["/api/health/workout", "POST"],
      ["/api/role-models/council/extra", "PUT"],
      ["/api/role-models/other", "PUT"],
      ["/api/quit/count", "POST"],
      ["/api/goals", "DELETE"],
      ["/api/goals/batch", "POST"],
      ["/api/workouts", "POST"],
      ["/api/settings/time-preferences", "PUT"],
    ]
    for (const [path, method] of writes) {
      await expect(fetch(path, { method, body: "{}" }), `${method} ${path}`).rejects.toBeInstanceOf(TypeError)
    }
    expect(sent).toEqual([])
  })

  it("aims the council routes at the copy space, writes included, and names the hidden account", async () => {
    const calls: [string, string][] = [
      ["/api/role-models/council", "GET"],
      ["/api/role-models/council", "PUT"],
      ["/api/role-models/council?id=a", "DELETE"],
      ["/api/role-models/week", "GET"],
      ["/api/role-models/week", "PUT"],
      ["/api/role-models/settings", "GET"],
      ["/api/role-models/settings", "PUT"],
      ["/api/role-models/area", "GET"],
    ]
    for (const [path, method] of calls) await fetch(path, { method, body: method === "GET" ? undefined : "{}" })
    expect(sent).toHaveLength(calls.length)
    for (const s of sent) {
      expect(s.url.searchParams.getAll("target")).toEqual(["sandbox"])
      expect(s.headers.get(PAGE_ACCOUNT_HEADER)).toBe(HIDDEN)
    }
  })

  it("lets reads of other routes out, naming the hidden account so the server refuses them as another account's", async () => {
    await fetch("/api/goals")
    expect(sent[0].headers.get(PAGE_ACCOUNT_HEADER)).toBe(HIDDEN)
  })

  it("sends the training log and the running programs as reads naming no account, so the server answers as the signed-in person", async () => {
    for (const path of ["/api/health/workout?days=9", "/api/programs/enrollments", "/api/programs/enrollments?past=1", "/api/programs/enrollments/abc"]) await fetch(path)
    expect(sent).toHaveLength(4)
    for (const s of sent) expect(s.headers.has(PAGE_ACCOUNT_HEADER)).toBe(false)
  })

  it("lets the copy space's own routes through, sign-out and crash reports untouched", async () => {
    await fetch("/api/plan-sandbox/copy", { method: "POST" })
    await fetch("/api/plan-sandbox/reset", { method: "POST" })
    await fetch("/api/auth/sign-out", { method: "POST" })
    await fetch("/api/errors", { method: "POST" })
    expect(sent.map((s) => s.url.pathname)).toEqual(["/api/plan-sandbox/copy", "/api/plan-sandbox/reset", "/api/auth/sign-out", "/api/errors"])
    expect(sent[0].headers.get(PAGE_ACCOUNT_HEADER)).toBe(HIDDEN)
    expect(sent[2].headers.has(PAGE_ACCOUNT_HEADER)).toBe(false)
  })

  it("leaves other sites alone", async () => {
    await fetch("https://example.com/x", { method: "POST" })
    expect(sent).toHaveLength(1)
  })

  it("marks the hidden account, so the plan client aims its calls, and only that account", () => {
    expect(isSandboxAccount(HIDDEN)).toBe(true)
    expect(isSandboxAccount(OWNER)).toBe(false)
    expect(planApiUrl("/api/life-plan", HIDDEN)).toBe("/api/life-plan?target=sandbox")
    expect(planApiUrl("/api/life-plan", OWNER)).toBe("/api/life-plan")
  })

  it("is undone: the browser's own fetch comes back", () => {
    undo()
    expect(globalThis.fetch).toBe(before)
  })
})
