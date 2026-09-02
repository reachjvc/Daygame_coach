import { describe, expect, it } from "vitest"

import { safeNextPath } from "@/src/shared/safeRedirect"

/**
 * These assert the SECURITY MEANING, not the shape: the question is always
 * "could this send a user to a site we don't control", never "does it return a
 * string". Every rejected case below is a working open redirect if the guard is
 * ever loosened back to a plain startsWith("/") check.
 */
describe("safeNextPath", () => {
  it("keeps a normal same-origin path", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard")
    expect(safeNextPath("/dashboard/tracking/session")).toBe("/dashboard/tracking/session")
    expect(safeNextPath("/dashboard?tab=goals")).toBe("/dashboard?tab=goals")
  })

  it("rejects a protocol-relative URL, which a browser reads as another site", () => {
    // The trap: this starts with "/" but the browser loads https://evil.com.
    expect(safeNextPath("//evil.com")).toBe("/redirect")
    expect(safeNextPath("//evil.com/steal")).toBe("/redirect")
  })

  it("rejects a backslash variant, which some browsers normalise to //", () => {
    expect(safeNextPath("/\\evil.com")).toBe("/redirect")
  })

  it("rejects an absolute URL to another origin", () => {
    expect(safeNextPath("https://evil.com")).toBe("/redirect")
    expect(safeNextPath("http://evil.com")).toBe("/redirect")
    expect(safeNextPath("javascript:alert(1)")).toBe("/redirect")
  })

  it("falls back when there is nothing to redirect to", () => {
    expect(safeNextPath(null)).toBe("/redirect")
    expect(safeNextPath(undefined)).toBe("/redirect")
    expect(safeNextPath("")).toBe("/redirect")
  })

  it("honours a caller-supplied fallback", () => {
    expect(safeNextPath(null, "/dashboard")).toBe("/dashboard")
    expect(safeNextPath("//evil.com", "/dashboard")).toBe("/dashboard")
  })
})
