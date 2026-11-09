/**
 * QUIET HOURS AND ALLOWED INSTANTS — src/notifications/quietHours.ts.
 *
 * Moved from the Thoughts schedule tests (Plans/energy-audit.md, Phase 1).
 * Copenhagen is UTC+2 until 03:00 on 25 Oct 2026 and UTC+1 after.
 */
import { describe, expect, it } from "vitest"
import { firstAllowedAtOrAfter, inQuietHours } from "@/src/notifications/quietHours"

const CPH = "Europe/Copenhagen"
const at = (iso: string) => new Date(iso)
const on = { quietStart: 22 * 60 as number | null, quietEnd: 8 * 60 as number | null, activeDays: 127 }

describe("zones whose clocks jump at midnight", () => {
  // America/Santiago: 00:00 on Sunday 6 Sep 2026 does not exist (00:00 -04 -> 01:00 -03).
  const SCL = "America/Santiago"

  it("still finds the next allowed instant across the missing midnight (an inactive Saturday)", () => {
    const noSaturday = { ...on, activeDays: 127 & ~(1 << 5) }
    // Saturday 5 Sep 10:00 -04 = 14:00Z -> Sunday 08:00 -03 = 11:00Z
    expect(firstAllowedAtOrAfter(at("2026-09-05T14:00:00Z"), noSaturday, SCL)?.toISOString()).toBe("2026-09-06T11:00:00.000Z")
  })

  it("still finds it when quiet hours end at the missing midnight", () => {
    const evenings = { ...on, quietStart: 20 * 60, quietEnd: 0 }
    const next = firstAllowedAtOrAfter(at("2026-09-06T00:30:00Z"), evenings, SCL)
    expect(next).not.toBeNull()
    expect(next!.getTime()).toBeGreaterThanOrEqual(Date.parse("2026-09-06T00:30:00Z"))
    expect(next!.getTime()).toBeLessThanOrEqual(Date.parse("2026-09-06T04:00:00Z"))
  })
})

describe("firstAllowedAtOrAfter", () => {
  it("returns the instant itself when it is allowed", () => {
    const t = at("2026-10-30T10:00:00Z")
    expect(firstAllowedAtOrAfter(t, on, CPH)?.toISOString()).toBe(t.toISOString())
  })

  it("treats 23:00 on Sunday as Sunday when only Sunday is active", () => {
    const sundays = { ...on, activeDays: 1 << 6, quietStart: null, quietEnd: null }
    // Sun 1 Nov 23:00 CET = 22:00Z is allowed
    expect(firstAllowedAtOrAfter(at("2026-11-01T22:00:00Z"), sundays, CPH)?.toISOString()).toBe("2026-11-01T22:00:00.000Z")
    // Mon 2 Nov 00:30 CET is not; next is Sun 8 Nov 00:00 CET = 7 Nov 23:00Z
    expect(firstAllowedAtOrAfter(at("2026-11-01T23:30:00Z"), sundays, CPH)?.toISOString()).toBe("2026-11-07T23:00:00.000Z")
  })
})

describe("inQuietHours", () => {
  it("spans midnight", () => {
    expect(inQuietHours(23 * 60, 22 * 60, 8 * 60)).toBe(true)
    expect(inQuietHours(7 * 60 + 59, 22 * 60, 8 * 60)).toBe(true)
    expect(inQuietHours(8 * 60, 22 * 60, 8 * 60)).toBe(false)
    expect(inQuietHours(21 * 60 + 59, 22 * 60, 8 * 60)).toBe(false)
  })

  it("is never quiet without quiet hours", () => {
    expect(inQuietHours(0, null, null)).toBe(false)
  })
})
