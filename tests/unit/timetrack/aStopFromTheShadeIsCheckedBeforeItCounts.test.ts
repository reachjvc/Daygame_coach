// @vitest-environment node
/**
 * THE SHADE'S STOP BUTTON IS A SERVER ROUTE THAT CHANGES DATA, SO WHAT IT TAKES
 * IS CHECKED FIRST (Plans/time-tracker-like-toggl.md, Phase 7, item 2).
 *
 * `POST /api/timetrack/stop` with `{entryId, at, sentAt}`:
 *   - `at` is when Stop was tapped, by the phone's clock; `sentAt` is when the
 *     worker sent it, by the same clock. Their difference from the server's own
 *     clock corrects a phone that runs fast or slow (D5) — which matters most for
 *     a stop that waited offline, sent hours after the tap.
 *   - A stop time in the future, beyond a small allowance, is refused. So is a
 *     time that is not a full ISO time with its zone, and an id that is not one.
 *   - Only a same-origin JSON request is taken: a form on another site cannot
 *     send `application/json`, and a browser says where a request came from.
 *
 * The only-if-still-running rule and the ownership rule are tested against the
 * real database in
 * tests/integration/repos/theShadesStopOnlyStopsARunningTimer.integration.test.ts.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { MAX_STOP_SKEW_MS, readStopRequest } from "@/src/timetrack/runningTimerService"

const now = new Date("2026-11-04T17:20:00.000Z")

describe("what a stop request must carry", () => {
  test("an entry id and a tap time with its zone", () => {
    expect(readStopRequest({ entryId: "gym-1", at: "2026-11-04T17:17:00.000Z" }, now)).toEqual({
      entryId: "gym-1",
      at: "2026-11-04T17:17:00.000Z",
    })
  })

  test.each([
    ["nothing", null],
    ["no id", { at: "2026-11-04T17:17:00Z" }],
    ["an id with spaces", { entryId: "a b", at: "2026-11-04T17:17:00Z" }],
    ["an id that is too long", { entryId: "x".repeat(201), at: "2026-11-04T17:17:00Z" }],
    ["no time", { entryId: "gym" }],
    ["a time with no zone", { entryId: "gym", at: "2026-11-04T17:17:00" }],
    ["not a time", { entryId: "gym", at: "yesterday" }],
    ["an impossible date", { entryId: "gym", at: "2026-13-45T17:17:00Z" }],
  ])("refuses %s", (_why, body) => {
    expect(readStopRequest(body, now)).toHaveProperty("error")
  })

  test("refuses a stop in the future beyond the allowance, and takes one within it", () => {
    const within = new Date(now.getTime() + MAX_STOP_SKEW_MS - 1000).toISOString()
    const beyond = new Date(now.getTime() + MAX_STOP_SKEW_MS + 1000).toISOString()
    expect(readStopRequest({ entryId: "gym", at: within }, now)).toEqual({ entryId: "gym", at: within })
    expect(readStopRequest({ entryId: "gym", at: beyond }, now)).toEqual({ error: expect.stringMatching(/future/) })
  })

  test("a phone running 4 minutes fast stops at the real moment of the tap, not refused as the future", () => {
    // tapped and sent at 17:20 real time, which the phone called 17:24
    const answer = readStopRequest({ entryId: "gym", at: "2026-11-04T17:24:00.000Z", sentAt: "2026-11-04T17:24:00.000Z" }, now)
    expect(answer).toEqual({ entryId: "gym", at: "2026-11-04T17:20:00.000Z" })
  })

  test("a stop that waited offline keeps the tap time, corrected by the phone's clock at sending", () => {
    // tapped at 15:00 on a phone 1 minute slow, sent 2 h later when the signal came back
    const answer = readStopRequest({ entryId: "gym", at: "2026-11-04T14:59:00.000Z", sentAt: "2026-11-04T17:19:00.000Z" }, now)
    expect(answer).toEqual({ entryId: "gym", at: "2026-11-04T15:00:00.000Z" })
  })

  test("a sending time that is not one is ignored, not trusted", () => {
    expect(readStopRequest({ entryId: "gym", at: "2026-11-04T17:17:00.000Z", sentAt: "soon" }, now)).toEqual({
      entryId: "gym",
      at: "2026-11-04T17:17:00.000Z",
    })
  })
})

// ---------------------------------------------------------------------------
// The route's doors
// ---------------------------------------------------------------------------

const stops: unknown[][] = []

beforeEach(() => {
  vi.resetModules()
  stops.length = 0
})
afterEach(() => {
  vi.doUnmock("@/src/db/auth")
  vi.doUnmock("@/src/timetrack/runningTimerService")
  vi.doUnmock("@/src/shared/afterResponse")
})

async function post(init: { body?: string; headers?: Record<string, string>; signedIn?: boolean }) {
  vi.doMock("@/src/db/auth", async () => {
    const { NextResponse } = await import("next/server")
    return {
      requireAuth: async () =>
        init.signedIn === false
          ? { success: false, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }
          : { success: true, userId: "u1" },
    }
  })
  vi.doMock("@/src/shared/afterResponse", () => ({ afterResponse: () => undefined }))
  vi.doMock("@/src/timetrack/runningTimerService", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/src/timetrack/runningTimerService")>()),
    stopRunningTimer: async (...args: unknown[]) => {
      stops.push(args)
      return { outcome: "not-found" }
    },
  }))
  const route = await import("@/app/api/timetrack/stop/route")
  const response = await route.POST(
    new Request("http://localhost/api/timetrack/stop", {
      method: "POST",
      body: init.body ?? JSON.stringify({ entryId: "gym", at: new Date().toISOString() }),
      headers: init.headers ?? { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
    }),
  )
  return { status: response.status, body: await response.json() }
}

describe("who the route listens to", () => {
  test("a signed-out caller is refused before anything is read", async () => {
    expect((await post({ signedIn: false })).status).toBe(401)
    expect(stops).toEqual([])
  })

  test("a request from another site is refused", async () => {
    const answer = await post({ headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "cross-site" } })
    expect(answer.status).toBe(403)
    expect(stops).toEqual([])
  })

  test("a form post (not JSON) is refused", async () => {
    const answer = await post({ headers: { "Content-Type": "text/plain" } })
    expect(answer.status).toBe(415)
    expect(stops).toEqual([])
  })

  test("a bad body is a 400 that says why", async () => {
    const answer = await post({ body: JSON.stringify({ entryId: "gym", at: "2099-01-01T00:00:00Z" }) })
    expect(answer.status).toBe(400)
    expect(answer.body.error).toMatch(/future/)
    expect(stops).toEqual([])
  })

  test("a good one reaches the stop, for the signed-in person only", async () => {
    const answer = await post({})
    expect(answer.status).toBe(404)
    expect(stops).toHaveLength(1)
    expect(stops[0][0]).toBe("u1")
    expect(stops[0][1]).toBe("gym")
  })
})
