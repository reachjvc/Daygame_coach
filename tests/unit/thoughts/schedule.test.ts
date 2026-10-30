/**
 * WHEN THE NEXT REMINDER IS DUE — src/thoughts/schedule.ts.
 *
 * Instants are written in UTC with the local time beside them, so each
 * expectation can be checked by eye. Copenhagen is UTC+2 until 03:00 on
 * 25 Oct 2026 and UTC+1 after; New York is UTC-4 until 02:00 on 1 Nov 2026
 * and UTC-5 after.
 */
import { describe, expect, it } from "vitest"
import { firstAllowedAtOrAfter, inQuietHours, latest, nextPromptAt } from "@/src/thoughts/schedule"
import { DEFAULT_SETTINGS, type ThoughtSettings } from "@/src/thoughts/types"

const CPH = "Europe/Copenhagen"
const NYC = "America/New_York"
const on: ThoughtSettings = { ...DEFAULT_SETTINGS, remindersOn: true }
const at = (iso: string) => new Date(iso)

describe("nextPromptAt", () => {
  it("is null when reminders are off", () => {
    expect(nextPromptAt(DEFAULT_SETTINGS, CPH, at("2026-10-30T09:00:00Z"), at("2026-10-30T09:00:00Z"))).toBeNull()
  })

  it("is one interval after the anchor in the daytime", () => {
    // 10:00 CET anchor -> 10:15 CET
    expect(nextPromptAt(on, CPH, at("2026-10-30T09:00:00Z"), at("2026-10-30T09:00:00Z"))?.toISOString()).toBe(
      "2026-10-30T09:15:00.000Z",
    )
  })

  it("respects the chosen interval", () => {
    const hourly = { ...on, intervalMinutes: 60 as const }
    expect(nextPromptAt(hourly, CPH, at("2026-10-30T09:00:00Z"), at("2026-10-30T09:00:00Z"))?.toISOString()).toBe(
      "2026-10-30T10:00:00.000Z",
    )
  })

  it("never catches up: a due time in the past becomes now, once", () => {
    // Anchor three hours ago; the clock was down. Next is now, not a burst.
    const now = at("2026-10-30T12:00:00Z")
    expect(nextPromptAt(on, CPH, at("2026-10-30T09:00:00Z"), now)?.toISOString()).toBe(now.toISOString())
  })

  it("moves a time inside evening quiet hours to the next morning", () => {
    // 21:50 CET + 15 = 22:05, quiet -> 08:00 CET next day = 07:00Z
    expect(nextPromptAt(on, CPH, at("2026-10-30T20:50:00Z"), at("2026-10-30T20:50:00Z"))?.toISOString()).toBe(
      "2026-10-31T07:00:00.000Z",
    )
  })

  it("moves a time inside morning quiet hours to 08:00 the same day", () => {
    // 05:00 CET -> 08:00 CET = 07:00Z
    expect(nextPromptAt(on, CPH, at("2026-10-30T03:45:00Z"), at("2026-10-30T03:45:00Z"))?.toISOString()).toBe(
      "2026-10-30T07:00:00.000Z",
    )
  })

  it("lands on 08:00 local across the European clock change (25 Oct 2026)", () => {
    // Sat 24 Oct 21:50 CEST (19:50Z) -> quiet -> Sun 25 Oct 08:00 CET = 07:00Z, not 06:00Z
    expect(nextPromptAt(on, CPH, at("2026-10-24T19:50:00Z"), at("2026-10-24T19:50:00Z"))?.toISOString()).toBe(
      "2026-10-25T07:00:00.000Z",
    )
  })

  it("lands on 08:00 local across the US clock change (1 Nov 2026)", () => {
    // Sat 31 Oct 21:50 EDT (01:50Z on 1 Nov) -> Sun 1 Nov 08:00 EST = 13:00Z, not 12:00Z
    expect(nextPromptAt(on, NYC, at("2026-11-01T01:50:00Z"), at("2026-11-01T01:50:00Z"))?.toISOString()).toBe(
      "2026-11-01T13:00:00.000Z",
    )
  })

  it("keeps quiet hours in the person's zone, not the server's", () => {
    // 23:00 in New York is 04:00Z: daytime in UTC, quiet for the person.
    const next = nextPromptAt(on, NYC, at("2026-10-30T02:45:00Z"), at("2026-10-30T02:45:00Z"))
    expect(next?.toISOString()).toBe("2026-10-30T12:00:00.000Z") // 08:00 EDT
  })

  it("handles quiet hours that do not span midnight", () => {
    const lunch = { ...on, quietStart: 13 * 60, quietEnd: 14 * 60 }
    // 12:50 CET + 15 = 13:05 quiet -> 14:00 CET = 13:00Z
    expect(nextPromptAt(lunch, CPH, at("2026-10-30T11:50:00Z"), at("2026-10-30T11:50:00Z"))?.toISOString()).toBe(
      "2026-10-30T13:00:00.000Z",
    )
  })

  it("reminds around the clock when there are no quiet hours", () => {
    const always = { ...on, quietStart: null, quietEnd: null }
    // 23:45 CET + 15 = 00:00 CET = 23:00Z
    expect(nextPromptAt(always, CPH, at("2026-10-30T22:45:00Z"), at("2026-10-30T22:45:00Z"))?.toISOString()).toBe(
      "2026-10-30T23:00:00.000Z",
    )
  })

  it("skips inactive days to the first allowed minute of the next active one", () => {
    // Mondays only (bit 0). Friday 30 Oct 10:00 CET -> Monday 2 Nov 08:00 CET = 07:00Z
    const mondays = { ...on, activeDays: 1 }
    expect(nextPromptAt(mondays, CPH, at("2026-10-30T09:00:00Z"), at("2026-10-30T09:00:00Z"))?.toISOString()).toBe(
      "2026-11-02T07:00:00.000Z",
    )
  })

  it("waits out a pause", () => {
    const paused = { ...on, pausedUntil: "2026-10-30T11:00:00.000Z" }
    expect(nextPromptAt(paused, CPH, at("2026-10-30T09:00:00Z"), at("2026-10-30T09:00:00Z"))?.toISOString()).toBe(
      "2026-10-30T11:00:00.000Z",
    )
  })

  it("a pause that ends inside quiet hours resumes when they end", () => {
    // Pause "for the rest of the day" until 23:59 CET -> 08:00 CET next morning
    const paused = { ...on, pausedUntil: "2026-10-30T22:59:00.000Z" }
    expect(nextPromptAt(paused, CPH, at("2026-10-30T09:00:00Z"), at("2026-10-30T09:00:00Z"))?.toISOString()).toBe(
      "2026-10-31T07:00:00.000Z",
    )
  })

  it("restarts from a later log (Q17)", () => {
    const lastSent = "2026-10-30T09:00:00.000Z"
    const lastLog = "2026-10-30T09:10:00.000Z"
    const anchor = latest(lastSent, lastLog)!
    expect(nextPromptAt(on, CPH, anchor, at("2026-10-30T09:10:00Z"))?.toISOString()).toBe("2026-10-30T09:25:00.000Z")
  })
})

describe("zones whose clocks jump at midnight", () => {
  // America/Santiago: 00:00 on Sunday 6 Sep 2026 does not exist (00:00 -04 -> 01:00 -03).
  const SCL = "America/Santiago"

  it("still finds the next reminder across the missing midnight (an inactive Saturday)", () => {
    const noSaturday = { ...on, activeDays: 127 & ~(1 << 5) }
    // Saturday 5 Sep 10:00 -04 = 14:00Z -> Sunday 08:00 -03 = 11:00Z
    expect(nextPromptAt(noSaturday, SCL, at("2026-09-05T14:00:00Z"), at("2026-09-05T14:00:00Z"))?.toISOString()).toBe(
      "2026-09-06T11:00:00.000Z",
    )
  })

  it("still finds it when quiet hours end at the missing midnight", () => {
    const evenings = { ...on, quietStart: 20 * 60, quietEnd: 0 }
    const next = nextPromptAt(evenings, SCL, at("2026-09-06T00:30:00Z"), at("2026-09-06T00:30:00Z"))
    expect(next).not.toBeNull()
    expect(next!.getTime()).toBeGreaterThan(Date.parse("2026-09-06T00:30:00Z"))
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

describe("latest", () => {
  it("ignores nulls and picks the later instant", () => {
    expect(latest(null, "2026-10-30T09:00:00Z", undefined, at("2026-10-30T10:00:00Z"))?.toISOString()).toBe(
      "2026-10-30T10:00:00.000Z",
    )
    expect(latest(null, undefined)).toBeNull()
  })
})
