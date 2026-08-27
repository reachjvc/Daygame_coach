/**
 * THE RETURN ADDRESS, AND WHAT IT MUST REFUSE.
 *
 * This value arrives in a URL, so anybody can write it. Rendered unchecked into
 * an `href`, it is an open redirect: a link to your own domain carrying
 * `?from=https://evil.example` renders a back control that walks the user off
 * your site onto somebody else's login form, with your page as the referrer.
 * The rejection cases below are the security boundary, not politeness.
 */

import { describe, it, expect } from "vitest"
import { readReturn, withReturn, RETURN_PARAM } from "@/src/shared/returnTo"

describe("readReturn", () => {
  it("accepts an ordinary internal path", () => {
    expect(readReturn("/dashboard/tracking")).toBe("/dashboard/tracking")
    expect(readReturn("/dashboard/goals/plan?step=today")).toBe("/dashboard/goals/plan?step=today")
  })

  it("refuses an absolute URL to another site", () => {
    expect(readReturn("https://evil.example")).toBeNull()
    expect(readReturn("http://evil.example/dashboard")).toBeNull()
  })

  it("refuses a protocol-relative URL, which browsers read as another host", () => {
    expect(readReturn("//evil.example")).toBeNull()
    expect(readReturn("/\\evil.example")).toBeNull()
  })

  it("refuses a javascript: payload", () => {
    expect(readReturn("javascript:alert(1)")).toBeNull()
    expect(readReturn(" javascript:alert(1)")).toBeNull()
  })

  it("refuses whitespace and control characters used to smuggle past a naive check", () => {
    expect(readReturn("/dashboard\nhttps://evil.example")).toBeNull()
    expect(readReturn("/dash board")).toBeNull()
  })

  it("refuses something far too long to be a route", () => {
    expect(readReturn("/" + "a".repeat(600))).toBeNull()
  })

  it("treats missing and empty as no return address", () => {
    expect(readReturn(null)).toBeNull()
    expect(readReturn(undefined)).toBeNull()
    expect(readReturn("")).toBeNull()
    expect(readReturn("   ")).toBeNull()
  })
})

describe("withReturn", () => {
  it("adds the address to a plain link", () => {
    expect(withReturn("/dashboard/goals/plan", "/dashboard/tracking")).toBe(
      `/dashboard/goals/plan?${RETURN_PARAM}=%2Fdashboard%2Ftracking`
    )
  })

  it("adds it to a link that already has a query", () => {
    expect(withReturn("/dashboard/goals/plan?step=today", "/dashboard/tracking")).toBe(
      `/dashboard/goals/plan?step=today&${RETURN_PARAM}=%2Fdashboard%2Ftracking`
    )
  })

  it("leaves the link alone rather than attaching something unusable", () => {
    expect(withReturn("/dashboard/goals/plan", "https://evil.example")).toBe("/dashboard/goals/plan")
  })

  it("round-trips through readReturn", () => {
    const link = withReturn("/dashboard/goals/plan", "/dashboard/tracking")
    const from = new URLSearchParams(link.split("?")[1]).get(RETURN_PARAM)
    expect(readReturn(from)).toBe("/dashboard/tracking")
  })
})
