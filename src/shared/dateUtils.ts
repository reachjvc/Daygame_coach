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
