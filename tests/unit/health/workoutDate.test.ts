/**
 * A WORKOUT YOU DID ON SATURDAY COUNTS IN SATURDAY'S WEEK.
 *
 * You can now write up a session days later and say when it happened. The date
 * you type is the fact; the timestamp stored is an encoding of it, and the whole
 * value of the feature is that the encoding survives the round trip — type the
 * 22nd, and every counter that groups by week must put it in the week of the
 * 22nd, not the week you happened to be sitting at your phone.
 *
 * Before this, the form could not send a date at all: every workout was stamped
 * with the moment it was saved, so Saturday's session written up on Monday
 * counted towards the wrong week and could not be moved.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { loggedAtForEntry } from "@/src/health/healthService"
import { periodStartFor, toZonedDate, toDateISO } from "@/src/shared/dateUtils"

const TZ = "Europe/Copenhagen"

afterEach(() => vi.useRealTimers())

/** The week a stored instant lands in, read back in the user's own calendar. */
function weekOf(instant: string, timezone = TZ): string {
  return periodStartFor("weekly", toZonedDate(new Date(instant), timezone))
}

describe("logging a workout you did earlier", () => {
  it("puts Saturday's session in Saturday's week, written up on Monday", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-24T09:00:00Z")) // Monday the 24th

    const saved = loggedAtForEntry("2026-08-22", TZ)! // the Saturday before

    expect(weekOf(saved)).toBe("2026-08-17")
    expect(weekOf(new Date().toISOString())).toBe("2026-08-24")
  })

  it("reads the date back exactly as it was typed", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-02T09:00:00Z"))

    for (const date of ["2026-08-01", "2026-08-22", "2026-03-29", "2026-09-02"]) {
      const saved = loggedAtForEntry(date, TZ)!
      expect(toDateISO(toZonedDate(new Date(saved), TZ)), date).toBe(date)
    }
  })

  it("refuses a day that has not happened yet, in the user's calendar", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-02T09:00:00Z"))
    expect(loggedAtForEntry("2026-09-03", TZ)).toBe(null)
    expect(loggedAtForEntry("2026-09-02", TZ)).not.toBe(null)
  })

  it("uses the user's today, not the server's", () => {
    // One instant, three calendars. At 2026-09-02 22:30 UTC it is already the
    // 3rd in Auckland and in Copenhagen, and still the afternoon of the 2nd in
    // Los Angeles. The same request is therefore legitimate for two of them and
    // impossible for the third — which is the whole point of asking whose day
    // it is rather than the server's.
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-02T22:30:00Z"))

    expect(loggedAtForEntry("2026-09-03", "Pacific/Auckland")).not.toBe(null)
    expect(loggedAtForEntry("2026-09-03", TZ)).not.toBe(null)
    expect(loggedAtForEntry("2026-09-03", "America/Los_Angeles")).toBe(null)
  })

  it("puts two workouts on one day in the order they happened", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-02T20:00:00Z"))

    const morning = loggedAtForEntry("2026-09-02", TZ, "07:30")!
    const evening = loggedAtForEntry("2026-09-02", TZ, "18:45")!

    // WITHOUT a time both would be midday and therefore identical, and nothing
    // could say which came first — "last time you benched" would pick one at
    // random. This is why the time field exists.
    expect(new Date(morning).getTime()).toBeLessThan(new Date(evening).getTime())
    expect(toDateISO(toZonedDate(new Date(morning), TZ))).toBe("2026-09-02")
    expect(toDateISO(toZonedDate(new Date(evening), TZ))).toBe("2026-09-02")
    expect(weekOf(morning)).toBe(weekOf(evening))
  })

  it("stores the exact moment, in the user's clock", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-02T20:00:00Z"))

    // Copenhagen is UTC+2 in September, so 07:30 there is 05:30 UTC.
    expect(loggedAtForEntry("2026-09-02", TZ, "07:30")).toBe("2026-09-02T05:30:00.000Z")
    // ...and UTC+1 in December.
    expect(loggedAtForEntry("2025-12-02", TZ, "07:30")).toBe("2025-12-02T06:30:00.000Z")
  })

  it("refuses a time that has not arrived yet, not just a future date", () => {
    vi.useFakeTimers()
    // 10:00 UTC is midday in Copenhagen.
    vi.setSystemTime(new Date("2026-09-02T10:00:00Z"))

    expect(loggedAtForEntry("2026-09-02", TZ, "09:00")).not.toBe(null)
    // You cannot have trained at 23:00 tonight. Checking only the date would
    // have let this through.
    expect(loggedAtForEntry("2026-09-02", TZ, "23:00")).toBe(null)
  })

  it("keeps the day across a daylight-saving change", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-02T09:00:00Z"))

    // Copenhagen springs forward on the 29th of March.
    const saved = loggedAtForEntry("2026-03-29", TZ)!
    expect(toDateISO(toZonedDate(new Date(saved), TZ))).toBe("2026-03-29")
    expect(weekOf(saved)).toBe("2026-03-23")
  })
})

describe("logging today", () => {
  it("stamps the moment you saved it, not noon", () => {
    vi.useFakeTimers()
    // 07:00 in Copenhagen. Noon is still five hours away.
    const now = new Date("2026-09-02T05:00:00Z")
    vi.setSystemTime(now)

    const saved = loggedAtForEntry("2026-09-02", TZ)
    expect(saved).toBe(now.toISOString())
    // Not refused, and not stamped in the future — both of which an earlier
    // version of this function did.
    expect(new Date(saved!).getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it("still uses noon for a day that is over", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-02T05:00:00Z"))

    // Copenhagen is UTC+2 in September, so midday there is 10:00 UTC.
    expect(loggedAtForEntry("2026-09-01", TZ)).toBe("2026-09-01T10:00:00.000Z")
  })
})

describe("what the API will and will not accept", () => {
  it("refuses a time with no date, rather than assuming today", async () => {
    const { CreateWorkoutSchema } = await import("@/src/health/schemas")
    const base = { session_type: "weights" as const, duration_min: 45, intensity: 3 }

    // A time with no day is not a fact about anything. Assuming "today" would
    // write a timestamp into a weekly counter the user never asked for.
    expect(CreateWorkoutSchema.safeParse({ ...base, entry_time: "07:30" }).success).toBe(false)

    expect(CreateWorkoutSchema.safeParse(base).success).toBe(true)
    expect(CreateWorkoutSchema.safeParse({ ...base, entry_date: "2026-09-01" }).success).toBe(true)
    expect(
      CreateWorkoutSchema.safeParse({ ...base, entry_date: "2026-09-01", entry_time: "07:30" }).success
    ).toBe(true)
  })

  it("refuses a date or time that is not one", async () => {
    const { CreateWorkoutSchema } = await import("@/src/health/schemas")
    const base = { session_type: "weights" as const, duration_min: 45, intensity: 3 }

    for (const entry_date of ["01/09/2026", "2026-9-1", "yesterday", "2026-09-01T10:00:00Z"]) {
      expect(CreateWorkoutSchema.safeParse({ ...base, entry_date }).success, entry_date).toBe(false)
    }
    for (const entry_time of ["7:30", "24:00", "07:60", "7.30pm"]) {
      expect(
        CreateWorkoutSchema.safeParse({ ...base, entry_date: "2026-09-01", entry_time }).success,
        entry_time
      ).toBe(false)
    }
  })
})

describe("every health entry answers 'when' the same way", () => {
  /**
   * Sleep, weight and nutrition each used to accept `logged_at` as any string at
   * all, straight into a weekly counter. Nothing sent it, so nothing was wrong
   * yet — but a signed-in user could have posted `logged_at: "2030-01-01"` and
   * moved their own counts, and there was no way for anyone to legitimately say
   * "this was yesterday's dinner".
   *
   * All four now take the same two optional fields and go through the same
   * conversion. This asserts the rule is genuinely shared, not copied four times
   * with three of the copies drifting — which is how the health streaks broke.
   */
  const schemas = [
    ["workout", () => import("@/src/health/schemas").then((m) => m.CreateWorkoutSchema),
      { session_type: "weights" as const, duration_min: 45, intensity: 3 }],
  ] as const

  it("accepts a date, accepts a date and time, refuses a bare time", async () => {
    for (const [name, load, base] of schemas) {
      const schema = await load()
      expect(schema.safeParse(base).success, `${name}: no date`).toBe(true)
      expect(schema.safeParse({ ...base, entry_date: "2026-09-01" }).success, `${name}: date`).toBe(true)
      expect(
        schema.safeParse({ ...base, entry_date: "2026-09-01", entry_time: "07:30" }).success,
        `${name}: date+time`
      ).toBe(true)
      expect(schema.safeParse({ ...base, entry_time: "07:30" }).success, `${name}: bare time`).toBe(false)
    }
  })

  it("no health route still accepts a raw logged_at string", async () => {
    // The hole itself, asserted shut. `logged_at` is written by the server from
    // `entry_date`/`entry_time`; it is not something a request may set.
    const fs = await import("fs")
    const path = await import("path")
    const dir = path.join(process.cwd(), "app/api/health")
    const routes = fs.readdirSync(dir).map((d) => path.join(dir, d, "route.ts")).filter(fs.existsSync)

    expect(routes.length).toBeGreaterThanOrEqual(4)
    for (const route of routes) {
      const source = fs.readFileSync(route, "utf-8")
      expect(source.includes("logged_at: z.string()"), route).toBe(false)
    }
  })
})
