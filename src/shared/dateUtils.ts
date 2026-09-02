/**
 * Every date in this app is a date in somebody's calendar.
 *
 * A date is not an absolute fact the way an instant is — "what day is it" has no
 * answer without knowing whose day. So every function here takes the timezone as
 * a REQUIRED argument. A caller that cannot supply one cannot compute a date,
 * which is the point: it is how the compiler finds the places that were
 * guessing, and no grep can.
 *
 * `getUserTimezone` returns a string and never null (profiles.timezone is NOT
 * NULL DEFAULT 'UTC'), so a server caller always has one to pass. A caller with
 * no user at all — the vice module is localStorage-only and works signed out —
 * passes `Intl.DateTimeFormat().resolvedOptions().timeZone` explicitly, so the
 * choice is visible in the code rather than implied by a default.
 *
 * Uses Intl.DateTimeFormat; no external dependencies.
 */

/**
 * Get today's date string (YYYY-MM-DD) in the given IANA timezone.
 * Falls back to UTC if timezone is null or invalid.
 */
export function getTodayInTimezone(timezone: string, at: Date = new Date()): string {
  const tz = timezone || "UTC"
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at)
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at)
  }
}

/**
 * Get a Date object whose fields represent wall-clock time in the given timezone,
 * for any instant.
 *
 * The returned Date is a carrier for wall-clock fields — read getFullYear/getDate/
 * getHours off it, never getTime(), which is meaningless after this conversion.
 * Falls back to the instant's own local fields if the timezone is invalid.
 */
export function toZonedDate(instant: Date, timezone: string | null): Date {
  const tz = timezone || "UTC"
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    })
    const parts = formatter.formatToParts(instant)
    const get = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? "0")
    // Intl renders midnight as hour 24 in the en-US hour12:false cycle.
    const hour = get("hour") % 24
    return new Date(
      get("year"),
      get("month") - 1,
      get("day"),
      hour,
      get("minute"),
      get("second")
    )
  } catch {
    return new Date(instant)
  }
}

/**
 * Get a Date object whose fields represent wall-clock time in the given timezone.
 * Useful for day-of-week calculations and ISO week derivation.
 * Falls back to current local Date if timezone is null or invalid.
 */
export function getNowInTimezone(timezone: string, at: Date = new Date()): Date {
  return toZonedDate(at, timezone)
}

/**
 * The cadences a counter can run on — the ones that ROLL.
 *
 * `custom` is deliberately absent. A custom-period goal is a milestone that runs
 * to its `custom_end_date`; it must never be zeroed, and keeping it out of this
 * type makes that unrepresentable rather than merely unlikely. The database
 * enum has six values (`GOAL_PERIODS` in db/goalEnums.ts); these are the five
 * that expire.
 */
export type GoalPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

/**
 * YYYY-MM-DD read off a Date's own wall-clock fields.
 *
 * NOT `toISOString().split("T")[0]`, which converts to UTC first and so shifts
 * the day by the process's offset — a Monday 20:00 in New York comes back as
 * Tuesday, a Monday 00:30 in Berlin as Sunday. Every period boundary in this
 * file is a wall-clock date, so it has to be formatted as one.
 */
export function toDateISO(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, "0")
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * The first day of the period containing `now`, as YYYY-MM-DD.
 *
 * Weeks run Monday 00:00 to Sunday 23:59: Sunday night is still last week's,
 * and the count starts again the moment Monday does. `now` is a wall-clock
 * Date — pass `getNowInTimezone(tz)`, not a UTC instant.
 */
export function periodStartFor(period: GoalPeriod, now: Date): string {
  if (period === "daily") return toDateISO(now)
  if (period === "yearly") return toDateISO(new Date(now.getFullYear(), 0, 1))
  if (period === "quarterly") {
    const firstMonthOfQuarter = Math.floor(now.getMonth() / 3) * 3
    return toDateISO(new Date(now.getFullYear(), firstMonthOfQuarter, 1))
  }
  if (period === "monthly") return toDateISO(new Date(now.getFullYear(), now.getMonth(), 1))
  // Monday-based: JS Sunday is 0, and Sunday belongs to the week that started
  // six days earlier, not to the one starting tomorrow.
  const weekday = (now.getDay() + 6) % 7
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday)
  return toDateISO(monday)
}

/** `periodStartFor` for the user's own timezone rather than the server's. */
export function periodStartInTimezone(period: GoalPeriod, timezone: string): string {
  return periodStartFor(period, getNowInTimezone(timezone))
}

/**
 * The start of the period immediately before the one starting at `currentStart`.
 *
 * Calendar arithmetic, never seconds: subtracting 7 * 86400 across a DST change
 * lands an hour off and can change the date. `new Date(2026, -1, 1)` is December
 * 2025 — JavaScript normalises the month, so there is no year-underflow branch.
 * The result is run back through `periodStartFor` so a malformed input cannot
 * produce a date that is not a period boundary.
 */
export function previousPeriodStart(period: GoalPeriod, currentStart: string): string {
  const [y, m, d] = currentStart.split("-").map(Number)
  const back =
    period === "daily" ? new Date(y, m - 1, d - 1)
    : period === "weekly" ? new Date(y, m - 1, d - 7)
    : period === "monthly" ? new Date(y, m - 2, 1)
    : period === "quarterly" ? new Date(y, m - 4, 1)
    : new Date(y - 1, 0, 1)
  return periodStartFor(period, back)
}

/**
 * IS THIS STREAK STILL ALIVE?
 *
 * A streak is stored as a number plus the period it was last earned in. Nothing
 * on the row makes them disagree visibly, so a streak earned in February reads
 * as a streak in August unless somebody asks this question. Somebody now does,
 * on every read.
 *
 * True for the current period (earned already this week) and for the previous
 * one (this week is not over — nothing has been missed yet). False for anything
 * older: that period ended without the streak being extended.
 */
export function isStreakCurrent(
  period: GoalPeriod,
  lastEarnedStart: string | null,
  currentStart: string
): boolean {
  if (!lastEarnedStart) return false
  return lastEarnedStart >= previousPeriodStart(period, currentStart)
}

/**
 * A COUNT BELONGS TO ONE PERIOD AND NO OTHER.
 *
 * `current_value` is the count for the period named by `period_start_date`, and
 * until this is asked, a weekly row read on Tuesday still holds last week's
 * number — which is what Today was showing, and what `+1` was adding to.
 *
 * `currentStart` is `periodStartFor(period, now)` — Monday for a week, so a
 * count stops at Sunday 23:59 and starts again at Monday 00:00.
 *
 * Daily is `!==` rather than `<` so a row somehow dated in the future still gets
 * pulled back onto today, which is what the daily reset has always done.
 *
 * `period` is a plain string because the database enum has a sixth value,
 * `custom`, which never expires — a milestone runs to its end date.
 */
export function isPeriodStale(
  period: string,
  periodStartDate: string | null,
  currentStart: string
): boolean {
  if (period === "custom") return false
  if (!periodStartDate) return true
  if (period === "daily") return periodStartDate !== currentStart
  return periodStartDate < currentStart
}

/**
 * The wall-clock offset of `instant` in `timezone`, in milliseconds.
 *
 * Positive east of Greenwich. Derived by formatting the instant in the zone and
 * reading the fields back, because there is no API that answers it directly.
 */
function offsetMsInTimezone(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  }).formatToParts(instant)
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0")
  // `get("hour")` is 24 at midnight under hour12:false in some ICU versions.
  const asUTC = Date.UTC(
    get("year"), get("month") - 1, get("day"),
    get("hour") % 24, get("minute"), get("second")
  )
  return asUTC - instant.getTime()
}

/**
 * MIDNIGHT ON A CALENDAR DATE, AS AN ABSOLUTE INSTANT.
 *
 * A week starts on Monday 00:00 in the user's city, which is 22:00 the previous
 * Sunday in UTC for Copenhagen in summer. Every query that counts "this week's
 * rows" compares against a `timestamptz`, so the boundary has to be converted —
 * `new Date("2026-08-24").toISOString()` is midnight UTC and counts two extra
 * hours of the previous week.
 *
 * The offset is resolved twice: the first guess uses the offset at UTC
 * midnight, which is the wrong offset on the two days a year the zone changes
 * it, and the second uses the offset at the corrected instant.
 */
export function startOfDayInstant(dateISO: string, timezone: string): string {
  const tz = timezone || "UTC"
  const [y, m, d] = dateISO.split("-").map(Number)
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0)
  try {
    const firstGuess = utcMidnight - offsetMsInTimezone(new Date(utcMidnight), tz)
    const settled = utcMidnight - offsetMsInTimezone(new Date(firstGuess), tz)
    return new Date(settled).toISOString()
  } catch {
    return new Date(utcMidnight).toISOString()
  }
}

/**
 * A CALENDAR DATE SOMEBODY TYPED, STORED AS AN INSTANT.
 *
 * "I trained on the 20th" is a fact about a date, not about a moment. The
 * database column is a `timestamptz`, so the date has to be encoded as one, and
 * the encoding has to survive the round trip: whatever instant is stored,
 * reading it back in the user's zone must give the 20th again.
 *
 * MIDDAY, not midnight. Midnight in Copenhagen is 22:00 UTC the day before, so a
 * date stored that way lands on the previous day for anyone who later reads it
 * from a zone even slightly further west.
 *
 * What midday buys, exactly: the date reads back correctly in the zone it was
 * entered in, and in any zone within TWELVE HOURS of that one. Copenhagen to
 * Auckland (+10) is fine; Copenhagen to Pago Pago (-13) is not, and that user's
 * date shifts by one.
 *
 * No single instant can satisfy every zone — the inhabited range spans 26 hours,
 * so some pair of zones always disagrees about which day an instant falls on.
 * The alternative is a real `date` column beside the instant, which would be two
 * facts about one event with nothing forcing them to agree. This codebase has
 * fixed that class of bug three times this week; it is not adding a fresh one to
 * cover a user who logs a workout in Denmark and reads it back in Samoa.
 */
export function middayInstant(dateISO: string, timezone: string): string {
  const midnight = new Date(startOfDayInstant(dateISO, timezone))
  return new Date(midnight.getTime() + 12 * 60 * 60 * 1000).toISOString()
}

/**
 * A wall-clock date and time in somebody's city, as the instant it happened.
 *
 * "07:30 on the 20th of August, in Copenhagen" is one moment; this is it. Unlike
 * `middayInstant` there is no guessing involved, so nothing has to survive being
 * decoded again — the instant is the fact the user stated.
 *
 * The offset is resolved twice for the same reason as `startOfDayInstant`: on
 * the two days a year a zone changes its offset, the offset at the first guess
 * is the wrong one to have used.
 */
export function localTimeInstant(dateISO: string, timeHHMM: string, timezone: string): string {
  const [y, m, d] = dateISO.split("-").map(Number)
  const [hh, mm] = timeHHMM.split(":").map(Number)
  const asUTC = Date.UTC(y, m - 1, d, hh, mm, 0)
  try {
    const firstGuess = asUTC - offsetMsInTimezone(new Date(asUTC), timezone)
    const settled = asUTC - offsetMsInTimezone(new Date(firstGuess), timezone)
    return new Date(settled).toISOString()
  } catch {
    return new Date(asUTC).toISOString()
  }
}
