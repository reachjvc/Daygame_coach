// @vitest-environment node
/**
 * THE PUSH ROUTE WRITES ROWS ONLY INTO THE ACCOUNT THEY WERE QUEUED FOR.
 *
 * The session belongs to the browser, not to the page. A tracker tab opened by
 * one person keeps running after their session ends; when somebody else signs
 * in on that browser, its next upload arrived here as the new person, and their
 * account took the previous person's entries (a privacy audit, 2026-11-04).
 * The app now names the account its queue is for, and the route refuses any
 * other with a 409 the page reads as "start again". A caller naming none is an
 * older app or a script and is treated as before.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const SIGNED_IN = "user-b"

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/auth")
  vi.doUnmock("@/src/db/timetrackRepo")
})
beforeEach(() => vi.resetModules())

async function push(account: string | undefined, bases?: Record<string, unknown>) {
  const wrote: string[] = []
  vi.doMock("@/src/db/auth", () => ({ requireAuth: async () => ({ success: true, userId: SIGNED_IN }) }))
  vi.doMock("@/src/db/timetrackRepo", () => ({
    TimetrackWriteRefused: class extends Error {},
    pullTimetrackRows: async () => ({ rows: {}, cursor: "" }),
    timetrackIsEmpty: async () => false,
    pushTimetrackRows: async (userId: string) => {
      wrote.push(userId)
      return { applied: 1 }
    },
  }))
  const route = await import("@/app/api/timetrack/sync/route")
  const rows = { timetrack_entries: [{ id: "therapy", description: "A private therapy session" }] }
  const response = await route.POST(
    new Request("http://localhost/api/timetrack/sync", { method: "POST", body: JSON.stringify({ rows, account, bases }) }),
  )
  return { status: response.status, body: (await response.json()) as Record<string, unknown>, wrote }
}

describe("a push", () => {
  test("named for another account writes nothing, and says the account changed", async () => {
    const answer = await push("user-a")
    expect(answer.wrote, "the previous person's rows were written into the signed-in account").toEqual([])
    expect(answer.status).toBe(409)
    expect(answer.body.accountChanged).toBe(true)
  })

  test("named for the signed-in account is written", async () => {
    const answer = await push(SIGNED_IN)
    expect(answer.status).toBe(200)
    expect(answer.wrote).toEqual([SIGNED_IN])
  })

  test("naming no account is written as before, for a script or an app from before versions", async () => {
    const answer = await push(undefined)
    expect(answer.status).toBe(200)
    expect(answer.wrote).toEqual([SIGNED_IN])
  })

  test("versioned, from a page that cannot say whose its queue is, writes nothing and asks for a reload", async () => {
    const answer = await push(undefined, { timetrack_entries: { therapy: null } })
    expect(answer.wrote, "a page loaded before accounts were named wrote its queue into whoever is signed in").toEqual([])
    expect(answer.status).toBe(409)
    expect(String(answer.body.error)).toMatch(/Reload/)
    expect(answer.body.accountChanged).toBeUndefined()
  })
})
