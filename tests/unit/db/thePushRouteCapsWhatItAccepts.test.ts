// @vitest-environment node
/**
 * THE BATCH SIZE THE CLIENT PROMISES IS ENFORCED WHERE IT MATTERS.
 *
 * `MAX_ROWS_PER_REQUEST = 400` is a constant in `useTimetrackSync`, and the server
 * enforced nothing — so one authenticated request could ask for an unbounded upsert
 * across nineteen tables. Theoretical against Supabase at one user; a
 * write-amplification vector against our own Postgres after the platform move. The
 * calendar route beside this one has been rate-limited since it was written.
 *
 * The cap is four times what the client sends, deliberately, so it can only refuse a
 * caller that is not this app — and the test below asserts that relationship rather
 * than the number, so raising the client's batch size cannot silently cross it.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const USER = "user-1"

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/src/db/auth")
  vi.doUnmock("@/src/db/timetrackRepo")
})
beforeEach(() => vi.resetModules())

/** POST the route with `count` rows spread across two tables. */
async function push(count: number) {
  const pushed: number[] = []
  vi.doMock("@/src/db/auth", () => ({ requireAuth: async () => ({ success: true, userId: USER }) }))
  vi.doMock("@/src/db/timetrackRepo", () => ({
    TimetrackWriteRefused: class extends Error {},
    pullTimetrackRows: async () => ({ rows: {}, cursor: "" }),
    timetrackIsEmpty: async () => false,
    pushTimetrackRows: async (_u: string, rows: Record<string, unknown[]>) => {
      pushed.push(Object.values(rows).reduce((sum, r) => sum + r.length, 0))
      return { applied: 1 }
    },
  }))
  const route = await import("@/app/api/timetrack/sync/route")
  const half = Math.floor(count / 2)
  const rows = {
    timetrack_entries: Array.from({ length: half }, (_, i) => ({ id: `e${i}` })),
    timetrack_tags: Array.from({ length: count - half }, (_, i) => ({ id: `t${i}` })),
  }
  const response = await route.POST(
    new Request("http://localhost/api/timetrack/sync", { method: "POST", body: JSON.stringify({ rows }) }),
  )
  return { status: response.status, body: await response.json(), reachedTheDatabase: pushed }
}

describe("what the push route accepts", () => {
  test("takes a full client batch", async () => {
    const result = await push(400)
    expect(result.status, JSON.stringify(result.body)).toBe(200)
    expect(result.reachedTheDatabase).toEqual([400])
  })

  test("refuses an unbounded one, and says the number", async () => {
    const result = await push(50_000)
    expect(result.status).toBe(413)
    expect(result.body.error).toContain("50000")
    expect(result.reachedTheDatabase, "the database was asked to write it anyway").toEqual([])
  })

  test("and the cap stays above what this app sends", async () => {
    /**
     * Asserted as a relationship, not a number: the day somebody raises the client's
     * batch size past the server's cap, the app would start refusing its own uploads.
     * This fails that day instead.
     */
    const hook = await import("node:fs").then((fs) =>
      fs.readFileSync("src/timetrack/hooks/useTimetrackSync.ts", "utf8"),
    )
    const clientBatch = Number(/MAX_ROWS_PER_REQUEST\s*=\s*([0-9_]+)/.exec(hook)?.[1]?.replace(/_/g, ""))
    const routeSource = await import("node:fs").then((fs) =>
      fs.readFileSync("app/api/timetrack/sync/route.ts", "utf8"),
    )
    const serverCap = Number(/MAX_ROWS_PER_PUSH\s*=\s*([0-9_]+)/.exec(routeSource)?.[1]?.replace(/_/g, ""))

    expect(clientBatch, "the client's batch size was not found").toBeGreaterThan(0)
    expect(serverCap, "the server's cap was not found").toBeGreaterThan(0)
    expect(serverCap, `the server caps at ${serverCap} while the client sends ${clientBatch}`).toBeGreaterThanOrEqual(
      clientBatch,
    )
  })
})
