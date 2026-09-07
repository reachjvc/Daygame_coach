/**
 * What must never reach the crash table.
 *
 * Each of these is something that genuinely turns up in an error message: a
 * reset link whose token is the password, the address of the person it belongs
 * to, and the words they typed into the app.
 */

import { describe, expect, test } from "vitest"

import { fingerprint, scrubRoute, scrubText } from "@/src/shared/errorScrubService"

describe("what gets stripped", () => {
  test("a query string, because that is where tokens live", () => {
    const out = scrubText("Failed to load /auth/reset?token=abc123secret&next=/dashboard")!
    expect(out).not.toContain("abc123secret")
    expect(out).toContain("/auth/reset")
  })

  test("a hash fragment, for the same reason", () => {
    expect(scrubText("at /auth#access_token=xyzsecret")!).not.toContain("xyzsecret")
  })

  test("an email address", () => {
    expect(scrubText("No user found for jo.smith+test@example.com")!).toBe("No user found for [email]")
  })

  test("a long opaque token", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijkl"
    expect(scrubText(`Bad session ${jwt}`)!).not.toContain("eyJzdWIi")
  })

  test("anything the person typed, which the app quotes back", () => {
    const out = scrubText(`Could not save "Lunch with Sarah about the divorce"`)!
    expect(out).not.toContain("Sarah")
    expect(out).toContain("Could not save")
  })

  test("an over-long stack is cut, not dropped — a truncated trace still names the file", () => {
    const out = scrubText("at Component (app.tsx)\n".repeat(2000), 500)!
    expect(out.length).toBeLessThanOrEqual(520)
    expect(out).toContain("app.tsx")
    expect(out).toContain("truncated")
  })

  test("nothing in, nothing out", () => {
    expect(scrubText(null)).toBeNull()
    expect(scrubText(undefined)).toBeNull()
  })
})

describe("the route", () => {
  test("keeps the path and throws the rest away", () => {
    expect(scrubRoute("/dashboard/time?token=secret#x")).toBe("/dashboard/time")
  })

  test("collapses ids so the same fault groups together", () => {
    expect(scrubRoute("/dashboard/goals/3f2504e0-4f89-11d3-9a0c-0305e82c3301/edit")).toBe(
      "/dashboard/goals/:id/edit",
    )
  })

  test("an empty route is still a route", () => {
    expect(scrubRoute("")).toBe("/")
  })
})

describe("grouping the same fault together", () => {
  const stack = "Error: boom\n    at TimerBar (/src/timetrack/TimerBar.tsx:42:10)\n    at div"

  test("the same fault twice gets the same identity", () => {
    expect(fingerprint("boom", stack)).toBe(fingerprint("boom", stack))
  })

  test("a different message is a different fault", () => {
    expect(fingerprint("boom", stack)).not.toBe(fingerprint("bang", stack))
  })

  test("the same fault at a moved line number still groups together", () => {
    const moved = "Error: boom\n    at TimerBar (/src/timetrack/TimerBar.tsx:98:3)\n    at div"
    // otherwise every deploy invents a brand-new fault and nothing can be counted
    expect(fingerprint("boom", moved)).toBe(fingerprint("boom", stack))
  })

  test("a fault thrown somewhere else is separate", () => {
    const elsewhere = "Error: boom\n    at Reports (/src/timetrack/Reports.tsx:42:10)"
    expect(fingerprint("boom", elsewhere)).not.toBe(fingerprint("boom", stack))
  })

  test("no stack at all still produces a usable identity", () => {
    expect(fingerprint("boom", null)).toBe(fingerprint("boom", undefined))
    expect(fingerprint("boom", null)).toMatch(/^[a-z0-9]+$/)
  })
})
