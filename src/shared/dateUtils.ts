/**
 * Timezone-aware date utilities.
 *
 * Uses Intl.DateTimeFormat (no external dependencies).
 * All functions accept a nullable timezone string and fall back to UTC.
 */

/**
 * Get today's date string (YYYY-MM-DD) in the given IANA timezone.
 * Falls back to UTC if timezone is null or invalid.
 */
export function getTodayInTimezone(timezone: string | null): string {
  const tz = timezone || "UTC"
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  }
}

/**
 * Get a Date object whose fields represent wall-clock time in the given timezone.
 * Useful for day-of-week calculations and ISO week derivation.
 * Falls back to current local Date if timezone is null or invalid.
 */
export function getNowInTimezone(timezone: string | null): Date {
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
    const parts = formatter.formatToParts(new Date())
    const get = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? "0")
    return new Date(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second")
    )
  } catch {
    return new Date()
  }
}

/** The cadences a goal's counter can run on. Mirrors `user_goals.period`. */
export type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly"

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
  if (period === "monthly") return toDateISO(new Date(now.getFullYear(), now.getMonth(), 1))
  // Monday-based: JS Sunday is 0, and Sunday belongs to the week that started
  // six days earlier, not to the one starting tomorrow.
  const weekday = (now.getDay() + 6) % 7
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday)
  return toDateISO(monday)
}

/** `periodStartFor` for the user's own timezone rather than the server's. */
export function periodStartInTimezone(period: GoalPeriod, timezone: string | null): string {
  return periodStartFor(period, getNowInTimezone(timezone))
}
