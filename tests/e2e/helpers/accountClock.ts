/**
 * DATES ON THE ACCOUNT'S CLOCK, NOT THE RUNNER'S.
 *
 * The worker account lives in Europe/Copenhagen (fixtures/test.ts) and the CI
 * runner in UTC, on purpose: a test that takes "today" from the runner is
 * wrong for an hour every night. On 2026-11-18 a main push that ran from 23:00
 * to 23:50 UTC (00:00 to 00:50 in Copenhagen) failed about forty such tests:
 * a step "3 days late" was 4, the live workout opened on the wrong weekday,
 * and the audit's Day list had no quarters before 00:00 to answer.
 *
 * `dayIn` and `weekdayIn` read the account's calendar. `daytimeZone` is for a
 * test that needs hours of the same day behind it (or ahead of it): it picks a
 * zone where it is now between 10:00 and 18:00, so the day holds for the whole
 * run whatever the wall clock says.
 */

import { expect, type Page } from "@playwright/test"

const DAY_MS = 86_400_000

const parts = (zone: string, ms: number) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "weekday", string>

/** "2026-11-19": the date on `zone`'s calendar at `ms` (now by default). */
export function dayIn(zone: string, ms = Date.now()): string {
  const p = parts(zone, ms)
  return `${p.year}-${p.month}-${p.day}`
}

/** `iso` moved by `n` calendar days ("2026-11-19", -3 → "2026-11-16"). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10)
}

/** ISO weekday on `zone`'s calendar: Monday 1 … Sunday 7. */
export function weekdayIn(zone: string, ms = Date.now()): number {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts(zone, ms).weekday) + 1
}

/** Hour of the day (0–23) on `zone`'s clock. */
export function hourIn(zone: string, ms = Date.now()): number {
  return Number(parts(zone, ms).hour)
}

/** "09:45" on `zone`'s clock. */
export function clockIn(zone: string, ms: number): string {
  const p = parts(zone, ms)
  return `${p.hour}:${p.minute}`
}

/**
 * Copenhagen first, so a daytime run is the account's usual zone; then zones
 * spread round the world so one of them is always between 10:00 and 18:00.
 */
const DAYTIME_CANDIDATES = ["Europe/Copenhagen", "America/New_York", "America/Los_Angeles", "Pacific/Honolulu", "Asia/Tokyo", "Asia/Kolkata", "Pacific/Auckland"]

/** A zone where it is now 10:00–18:00, so hours before and after now are the same day. */
export function daytimeZone(ms = Date.now()): string {
  const zone = DAYTIME_CANDIDATES.find((z) => {
    const h = hourIn(z, ms)
    return h >= 10 && h < 18
  })
  if (!zone) throw new Error(`no daytime zone at ${new Date(ms).toISOString()}: add one to DAYTIME_CANDIDATES`)
  return zone
}

/**
 * Pins the signed-in account's zone (the same request the fixtures use). A spec that moves the
 * worker's shared account to `daytimeZone()` puts it back with the fixture's `accountTimezone`.
 */
export async function setAccountZone(page: Page, zone: string): Promise<void> {
  const res = await page.request.put("/api/settings/time-preferences", { data: { timezone: zone, source: "chosen" } })
  expect(res.status(), `could not set the account's zone to ${zone}: ${await res.text()}`).toBe(200)
}
