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

  it("rejects a path with a character the browser deletes before it navigates", () => {
    /**
     * The one that got through. Browsers strip tab, newline and carriage return
     * from a URL and then read what is left, so "/\t/evil.com" is approved here
     * as a path beginning with a single slash and loaded there as
     * "//evil.com" -- another site, reached from our own login page.
     */
    expect(safeNextPath("/\t/evil.com")).toBe("/redirect")
    expect(safeNextPath("/\n/evil.com")).toBe("/redirect")
    expect(safeNextPath("/\r/evil.com")).toBe("/redirect")
    expect(safeNextPath("/\t\t//evil.com")).toBe("/redirect")
    // Percent-encoded on the wire, a real tab by the time it is read here.
    expect(safeNextPath(decodeURIComponent("/%09/evil.com"))).toBe("/redirect")
    // And a NUL, which truncates the string in some consumers.
    expect(safeNextPath("/dashboard\u0000/../../evil.com")).toBe("/redirect")
  })

  it("still keeps ordinary paths that merely contain spaces or unicode", () => {
    // The fix must not reject legitimate destinations: a space is not a control
    // character, and neither is any of this.
    expect(safeNextPath("/dashboard/my goals")).toBe("/dashboard/my goals")
    expect(safeNextPath("/dashboard?q=caf\u00e9")).toBe("/dashboard?q=caf\u00e9")
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
