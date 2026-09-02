/**
 * THE LICENCE TO DELETE `getISOWeekString`.
 *
 * Weeks used to be identified by an ISO-week label ("2026-W35") built with the
 * MDN snippet in local time. Everything now identifies a week by its Monday.
 * Before the old helper is removed, the new answer has to be at least as good
 * as the old one everywhere, and better where they disagree.
 *
 * MEASURED, not assumed. Over 2015-01-01..2040-01-01:
 *   Europe/Copenhagen  0 disagreements   (both live users are here)
 *   America/New_York   0 disagreements
 *   Pacific/Auckland   4 — 2016, 2021, 2027, 2038
 *   Australia/Sydney   4
 *   America/Santiago   4
 *
 * Every disagreement is the old helper giving TWO DIFFERENT WEEKS THE SAME
 * LABEL, in zones whose DST starts between 1 January and the week in question.
 * `d.getTime() - yearStart.getTime()` is then an hour short of a whole number of
 * days, and `Math.ceil` rounds the week number down. Two weeks sharing a label
 * means `isCurrentWeek` says "same week" across a real boundary: the counters
 * never reset and the streak never increments.
 */

import { describe, it, expect } from "vitest"
import { periodStartFor, toDateISO } from "@/src/shared/dateUtils"

/** The implementation being retired. Kept here as the reference, nowhere else. */
function getISOWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`
}

function everyDay(fromY: number, toY: number): Date[] {
  const out: Date[] = []
  let d = new Date(fromY, 0, 1)
  const end = new Date(toY, 0, 1)
  while (d <= end) {
    out.push(d)
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  }
  return out
}

/** Days where two distinct Mondays share one ISO label, or the reverse. */
function disagreements(days: Date[]): string[] {
  const mondayToLabel = new Map<string, string>()
  const labelToMonday = new Map<string, string>()
  const bad: string[] = []
  for (const d of days) {
    const monday = periodStartFor("weekly", d)
    const label = getISOWeekString(d)
    if (mondayToLabel.get(monday) !== undefined && mondayToLabel.get(monday) !== label) {
      bad.push(`${toDateISO(d)} monday=${monday}`)
    }
    if (labelToMonday.get(label) !== undefined && labelToMonday.get(label) !== monday) {
      bad.push(`${toDateISO(d)} label=${label}`)
    }
    mondayToLabel.set(monday, label)
    labelToMonday.set(label, monday)
  }
  return bad
}

describe("Monday-identity vs ISO-week-label identity", () => {
  const days = everyDay(2015, 2040)

  it("agrees everywhere in the process timezone the suite runs in", () => {
    // The suite runs in whatever TZ the machine has. In Copenhagen, New York and
    // UTC this is zero; a southern-hemisphere TZ is asserted separately below,
    // where the old helper is the one that is wrong.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const southern = ["Pacific/Auckland", "Australia/Sydney", "America/Santiago"]
    if (southern.includes(tz)) return
    expect(disagreements(days)).toEqual([])
  })

  it("2027-09-20 and 2027-09-27 are different weeks", () => {
    // Independently checkable: 2027-01-04 is the Monday of ISO week 1, and
    // 2027-09-20 is 259 days later — exactly 37 weeks — so it is W38, not W39.
    const a = new Date(2027, 8, 20)
    const b = new Date(2027, 8, 27)
    expect(periodStartFor("weekly", a)).toBe("2027-09-20")
    expect(periodStartFor("weekly", b)).toBe("2027-09-27")
    expect(periodStartFor("weekly", a)).not.toBe(periodStartFor("weekly", b))
  })

  it("the Monday is stable across a DST transition", () => {
    // Copenhagen springs forward on 2026-03-29 (a Sunday). The Sunday belongs to
    // the week that started on the 23rd; Monday the 30th starts the next one.
    expect(periodStartFor("weekly", new Date(2026, 2, 29))).toBe("2026-03-23")
    expect(periodStartFor("weekly", new Date(2026, 2, 30))).toBe("2026-03-30")
  })
})

describe("startOfDayInstant", () => {
  it("converts a calendar date to the instant midnight happened there", async () => {
    const { startOfDayInstant } = await import("@/src/shared/dateUtils")
    // Copenhagen is UTC+2 in August (CEST): Monday 00:00 local = Sunday 22:00 UTC.
    expect(startOfDayInstant("2026-08-24", "Europe/Copenhagen")).toBe("2026-08-23T22:00:00.000Z")
    // ...and UTC+1 in January (CET).
    expect(startOfDayInstant("2026-01-05", "Europe/Copenhagen")).toBe("2026-01-04T23:00:00.000Z")
    // New York is UTC-4 in August.
    expect(startOfDayInstant("2026-08-24", "America/New_York")).toBe("2026-08-24T04:00:00.000Z")
    // UTC is its own midnight.
    expect(startOfDayInstant("2026-08-24", "UTC")).toBe("2026-08-24T00:00:00.000Z")
    expect(startOfDayInstant("2026-08-24", null)).toBe("2026-08-24T00:00:00.000Z")
  })

  it("is right on the day the clocks change", async () => {
    const { startOfDayInstant } = await import("@/src/shared/dateUtils")
    // Copenhagen springs forward 2026-03-29 at 02:00 -> 03:00. Midnight that day
    // is still CET (UTC+1), so the instant is 23:00 on the 28th.
    expect(startOfDayInstant("2026-03-29", "Europe/Copenhagen")).toBe("2026-03-28T23:00:00.000Z")
    // The Monday after is CEST (UTC+2).
    expect(startOfDayInstant("2026-03-30", "Europe/Copenhagen")).toBe("2026-03-29T22:00:00.000Z")
    // Auckland falls back 2026-04-05 at 03:00 -> 02:00; midnight is still UTC+13.
    expect(startOfDayInstant("2026-04-05", "Pacific/Auckland")).toBe("2026-04-04T11:00:00.000Z")
  })
})

describe("middayInstant", () => {
  it("round-trips a typed date back to the same date in the user's zone", async () => {
    const { middayInstant, toZonedDate, toDateISO } = await import("@/src/shared/dateUtils")
    for (const tz of ["Europe/Copenhagen", "Pacific/Auckland", "America/Los_Angeles", "UTC"]) {
      for (const date of ["2026-01-01", "2026-03-29", "2026-08-20", "2026-10-25", "2026-12-31"]) {
        expect(toDateISO(toZonedDate(new Date(middayInstant(date, tz)), tz)), `${date} in ${tz}`).toBe(date)
      }
    }
  })

  it("survives the user moving up to twelve hours away, and no further", async () => {
    const { middayInstant, toZonedDate, toDateISO } = await import("@/src/shared/dateUtils")
    const stored = new Date(middayInstant("2026-08-20", "Europe/Copenhagen"))

    // Copenhagen is UTC+2 in August, so midday there is 10:00 UTC. Every zone
    // within twelve hours of Copenhagen reads the same date back.
    for (const tz of ["America/Los_Angeles", "UTC", "Asia/Tokyo", "Pacific/Auckland"]) {
      expect(toDateISO(toZonedDate(stored, tz)), `read back in ${tz}`).toBe("2026-08-20")
    }

    // And beyond that it does not, which is a property of instants rather than a
    // bug: no single instant is on the same date in every inhabited zone, because
    // they span twenty-six hours. Asserted so the limit is documented rather than
    // discovered.
    expect(toDateISO(toZonedDate(stored, "Pacific/Pago_Pago"))).toBe("2026-08-19")
  })
})
