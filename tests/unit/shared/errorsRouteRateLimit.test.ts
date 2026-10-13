/**
 * THE CRASH-REPORT ENDPOINT IS NOT A FIREHOSE.
 *
 * `/api/errors` is open to signed-out callers on purpose — a crash before login
 * is the one we most want — so it is also the one write anybody on the internet
 * can make. Moved here from `tests/e2e/error-reporting.spec.ts`, which fired 25
 * requests at a running server to see a 429; the limit lives in the route
 * handler, so the real handler is called here with the repo behind it counting
 * what would have been written.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { recordErrorReports, optionalUserId } = vi.hoisted(() => ({
  recordErrorReports: vi.fn(async (reports: unknown[]) => reports.length),
  optionalUserId: vi.fn(async (): Promise<string | null> => "user-1"),
}))

vi.mock("@/src/db/auth", () => ({ optionalUserId }))
vi.mock("@/src/db/errorReportRepo", () => ({ recordErrorReports }))

import { POST } from "@/app/api/errors/route"
import { resetRateLimits } from "@/src/timetrack/rateLimitService"

function report(headers: Record<string, string> = {}) {
  return POST(
    new Request("http://x/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        reports: [{ message: "flood", route: "/", severity: "error", at: new Date().toISOString() }],
      }),
    }),
  )
}

beforeEach(() => {
  resetRateLimits()
  recordErrorReports.mockClear()
  optionalUserId.mockResolvedValue("user-1")
})

describe("the reports endpoint", () => {
  it("refuses to be used as a firehose", async () => {
    const statuses: number[] = []
    for (let i = 0; i < 25; i++) statuses.push((await report()).status)

    // Twenty in a minute are stored; the rest are refused, and refused before
    // anything reaches the database.
    expect(statuses.slice(0, 20)).toEqual(Array(20).fill(200))
    expect(statuses.slice(20)).toEqual(Array(5).fill(429))
    expect(recordErrorReports, "an unlimited crash endpoint is an open door").toHaveBeenCalledTimes(20)
  })

  it("counts a signed-out caller by address, so one flood does not silence everyone else", async () => {
    optionalUserId.mockResolvedValue(null)
    for (let i = 0; i < 20; i++) await report({ "x-forwarded-for": "203.0.113.7" })

    expect((await report({ "x-forwarded-for": "203.0.113.7" })).status).toBe(429)
    expect((await report({ "x-forwarded-for": "198.51.100.2" })).status).toBe(200)
  })
})
