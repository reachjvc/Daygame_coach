/**
 * Dates and times as the PERSON reads them: their zone, the app's locale.
 * Never the browser's clock zone (src/shared/dateUtils.ts says why).
 */

import { DISPLAY_LOCALE } from "@/src/shared/dateUtils"

export function formatDay(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, { day: "numeric", month: "short", timeZone: timezone }).format(new Date(iso))
}

export function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(iso))
}

/** "in 9 min", "in 2 h 5 min", "now". */
export function untilLabel(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((Date.parse(iso) - now.getTime()) / 60_000))
  if (minutes <= 0) return "now"
  if (minutes < 60) return `in ${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `in ${h} h` : `in ${h} h ${m} min`
}

/** "38 times in 4 days" for a thought, from its counts. */
export function frequencyLine(total: number, firstAt: string | null, now: Date): string {
  if (!firstAt || total === 0) return "Not logged yet."
  const days = Math.max(1, Math.ceil((now.getTime() - Date.parse(firstAt)) / 86_400_000))
  const times = total === 1 ? "Once" : `${total} times`
  return `${times} in ${days === 1 ? "1 day" : `${days} days`}.`
}
