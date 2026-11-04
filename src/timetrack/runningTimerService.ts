/**
 * THE RUNNING TIMER IN THE PHONE'S NOTIFICATION SHADE — the server's side
 * (Plans/time-tracker-like-toggl.md, Phase 7; the design is DECISIONS Q4,
 * twelve scenarios).
 *
 *   - While anything runs, every device with "Show the running timer on this
 *     device" on shows "● Gym · since 17:05", silently, with a Stop button.
 *   - When it stops, anywhere, that is replaced by a silent "Stopped · Gym 1:12":
 *     a browser must show something for every push, so it cannot just vanish.
 *   - A switch (one ends, the next starts) replaces it with the next one.
 *     An edit of only the description pushes nothing.
 *   - Once a timer passes 6 h it rings, once, with sound; between 23:00 and
 *     07:00 in the person's own zone that waits until 07:00.
 *
 * NEVER FROM THE CLIENT. Every device's writes arrive at the sync route, so the
 * route reads the running entries before its write and after it, and the
 * difference is the push (`watchTimer`, `announceTimerChange`). The Stop button
 * comes back through `/api/timetrack/stop` (`stopRunningTimer`), which writes the
 * stop through the same versioned write as every sync (D1).
 *
 * NOTHING HERE MAY BREAK SAVING. The before-read and the push are best-effort:
 * a failure is logged and swallowed, and the push runs after the response.
 */

import { getUserTimezone } from "@/src/db/settingsRepo"
import { readTimerEntry, readTimerState, writeTimerStop, type TimerRow } from "@/src/db/timetrackRepo"
import { alertedEntryIds, runningTimersPastAsServer, timezoneAsServer } from "@/src/db/notificationsRepo"
import { sendToPerson, type PushPayload } from "@/src/notifications/pushService"
import { getTodayInTimezone, toZonedDate } from "@/src/shared/dateUtils"
import { ROUTES } from "@/src/shared/routes"

export type { TimerRow }

export const TIMER_TAG = "timer-running"
export const TIMER_URL = `${ROUTES.time}?view=timer`
const NAME_MAX = 60

// ---------------------------------------------------------------------------
// What changed
// ---------------------------------------------------------------------------

export type TimerChange =
  | { kind: "running"; entry: TimerRow }
  | { kind: "stopped"; entry: TimerRow }
  | { kind: "deleted"; entry: TimerRow }

const isRunning = (r: TimerRow) => r.stoppedAt === null && r.deletedAt === null

/** The one a person sees as "the" timer: the latest started of those running. */
function current(rows: TimerRow[]): TimerRow | null {
  const running = rows.filter(isRunning)
  running.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || a.id.localeCompare(b.id))
  return running[0] ?? null
}

/**
 * What one write did to the running timer, from the entries as they stood
 * before it and after it. `after` holds the running entries now plus, by id,
 * the ones that were running before. Null: nothing the notification shows
 * changed (a description or project edit, or no timer either side).
 */
export function timerChange(before: TimerRow[], after: TimerRow[]): TimerChange | null {
  const was = current(before)
  const now = current(after)
  if (now) {
    const same = was !== null && was.id === now.id && Date.parse(was.startedAt) === Date.parse(now.startedAt)
    return same ? null : { kind: "running", entry: now }
  }
  if (!was) return null
  const ended = after.find((r) => r.id === was.id)
  if (!ended || ended.deletedAt !== null) return { kind: "deleted", entry: ended ?? was }
  return { kind: "stopped", entry: ended }
}

// ---------------------------------------------------------------------------
// What the notification says
// ---------------------------------------------------------------------------

/** The timer's name: its description, else its project, else a plain word. */
export function timerName(entry: Pick<TimerRow, "description" | "projectName">): string {
  const name = entry.description.trim() || entry.projectName?.trim() || "Timer running"
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name
}

const pad = (n: number) => String(n).padStart(2, "0")
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** "17:05" where the person is. 24-hour, the app's display locale (en-GB). */
export function clockIn(iso: string, timezone: string): string {
  const local = toZonedDate(new Date(iso), timezone)
  return `${pad(local.getHours())}:${pad(local.getMinutes())}`
}

/** "17:05", or "Wed 17:05" when that was not today where the person is. */
function sinceLabel(iso: string, timezone: string, now: Date): string {
  const at = new Date(iso)
  const clock = clockIn(iso, timezone)
  if (getTodayInTimezone(timezone, at) === getTodayInTimezone(timezone, now)) return clock
  return `${WEEKDAYS[toZonedDate(at, timezone).getDay()]} ${clock}`
}

/** "1:12", hours and minutes, the way the shade has room for. */
export function lengthLabel(startIso: string, stopIso: string): string {
  const minutes = Math.max(0, Math.floor((Date.parse(stopIso) - Date.parse(startIso)) / 60_000))
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`
}

/**
 * "● Gym · since 17:05", silent, not renotifying, one action: Stop.
 * `alert`: the same notification at 6 h, with sound, renotifying once.
 */
export function runningPayload(entry: TimerRow, timezone: string, now: Date, options: { alert?: boolean } = {}): PushPayload {
  const name = timerName(entry)
  return {
    title: `● ${name} · since ${sinceLabel(entry.startedAt, timezone, now)}`,
    body: options.alert ? "Running for over 6 h. Still going?" : entry.description.trim() && entry.projectName ? entry.projectName : "Time tracker",
    url: TIMER_URL,
    tag: TIMER_TAG,
    kind: "timetrack-running",
    entryId: entry.id,
    name,
    silent: !options.alert,
    renotify: options.alert === true,
    actions: [{ id: "stop", title: "Stop" }],
  }
}

/** "Stopped · Gym 1:12", silent, nothing to press. */
export function stoppedPayload(entry: TimerRow, timezone: string): PushPayload {
  const stop = entry.stoppedAt ?? entry.startedAt
  return {
    title: `Stopped · ${timerName(entry)} ${lengthLabel(entry.startedAt, stop)}`,
    body: `${clockIn(entry.startedAt, timezone)}–${clockIn(stop, timezone)}`,
    url: TIMER_URL,
    tag: TIMER_TAG,
    kind: "timetrack-running",
    silent: true,
    renotify: false,
    actions: [],
  }
}

/** A running timer was deleted: say so, quietly, so the shade does not keep offering Stop. */
export function deletedPayload(entry: TimerRow): PushPayload {
  return {
    title: `Deleted · ${timerName(entry)}`,
    body: "No timer is running",
    url: TIMER_URL,
    tag: TIMER_TAG,
    kind: "timetrack-running",
    silent: true,
    renotify: false,
    actions: [],
  }
}

// ---------------------------------------------------------------------------
// Sending it
// ---------------------------------------------------------------------------

/** Send what a change means to this person's timer devices. Never throws. */
export async function announce(userId: string, change: TimerChange, now: Date = new Date()): Promise<void> {
  try {
    const timezone = await getUserTimezone(userId)
    const payload =
      change.kind === "running"
        ? runningPayload(change.entry, timezone, now)
        : change.kind === "stopped"
          ? stoppedPayload(change.entry, timezone)
          : deletedPayload(change.entry)
    await sendToPerson(userId, "timetrack-running", () => payload, now, { entryId: change.entry.id })
  } catch (error) {
    console.error("[timer push] not sent", error instanceof Error ? error.message : "unknown")
  }
}

/**
 * The running entries before a write that may change them, or null when they
 * could not be read — then no push follows, and saving is not held up by it.
 */
export async function watchTimer(userId: string): Promise<TimerRow[] | null> {
  try {
    return await readTimerState(userId, [])
  } catch (error) {
    console.error("[timer push] could not read the timer", error instanceof Error ? error.message : "unknown")
    return null
  }
}

/**
 * After the write: read again, and push if a timer started, stopped or switched. Never throws.
 *
 * WHAT IS TRUE NOW WINS. Two syncs close together (a stop, then the next
 * start) each push after their own answer, in no fixed order, so a "Stopped"
 * could land on top of the newer "● Email". So just before sending, the timer
 * is read once more: a stop is not sent if a timer runs again by then (that
 * start's own push says so), and a start is sent as whatever runs now, or not
 * at all if it has been stopped since (that stop's push says so).
 */
export async function announceTimerChange(userId: string, before: TimerRow[], now: Date = new Date()): Promise<void> {
  try {
    const after = await readTimerState(userId, before.filter(isRunning).map((r) => r.id))
    const change = timerChange(before, after)
    if (!change) return
    const latest = current(await readTimerState(userId, []))
    if (change.kind === "running") {
      if (latest) await announce(userId, { kind: "running", entry: latest }, now)
    } else if (!latest) {
      await announce(userId, change, now)
    }
  } catch (error) {
    console.error("[timer push] not sent", error instanceof Error ? error.message : "unknown")
  }
}

/** Whatever runs now, pushed as it is: for a device that has just switched the timer on. Never throws. */
export async function announceCurrentTimer(userId: string, now: Date = new Date()): Promise<void> {
  try {
    const running = current(await readTimerState(userId, []))
    if (running) await announce(userId, { kind: "running", entry: running }, now)
  } catch (error) {
    console.error("[timer push] not sent", error instanceof Error ? error.message : "unknown")
  }
}

// ---------------------------------------------------------------------------
// The Stop button
// ---------------------------------------------------------------------------

/**
 * How far into the future a stop time may be and still be taken: a phone's
 * clock a little ahead, after the correction below. Anything later is refused.
 */
export const MAX_STOP_SKEW_MS = 2 * 60_000
/** A sending time further off than this is not a clock difference, and is not used. */
const MAX_CLOCK_CORRECTION_MS = 24 * 3_600_000

const ENTRY_ID = /^[A-Za-z0-9._:-]{1,200}$/
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:\d{2})$/

/** A full ISO time with its zone, on a date that exists, as milliseconds; else null. */
function readInstant(value: unknown): number | null {
  if (typeof value !== "string") return null
  const m = INSTANT.exec(value)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  // Date.parse would roll 2026-02-31 over into March; a real date reads back as itself
  const day = new Date(Date.UTC(y, mo - 1, d))
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== mo - 1 || day.getUTCDate() !== d) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

/**
 * The body of a stop, checked: `{entryId, at, sentAt?}`.
 *
 * `at` is the tap, by the phone's clock. `sentAt`, by the same clock, is when
 * the worker sent it; `now - sentAt` is how far that clock is off (D5), and it
 * is added to `at`. So a stop that waited offline for two hours keeps its tap
 * time, measured by the server's clock, and a phone running fast is not
 * refused as "in the future".
 */
export function readStopRequest(body: unknown, now: Date): { entryId: string; at: string } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Send the timer and the time you tapped Stop" }
  const b = body as { entryId?: unknown; at?: unknown; sentAt?: unknown }
  if (typeof b.entryId !== "string" || !ENTRY_ID.test(b.entryId)) return { error: "That is not a timer this app made" }
  let at = readInstant(b.at)
  if (at === null) return { error: "The stop time must be a full time with its zone" }
  const sentAt = readInstant(b.sentAt)
  if (sentAt !== null && Math.abs(now.getTime() - sentAt) <= MAX_CLOCK_CORRECTION_MS) at += now.getTime() - sentAt
  if (at > now.getTime() + MAX_STOP_SKEW_MS) return { error: "That stop time is in the future" }
  return { entryId: b.entryId, at: new Date(at).toISOString() }
}

export type StopAnswer =
  | { outcome: "stopped"; entry: TimerRow }
  | { outcome: "already-stopped"; entry: TimerRow }
  | { outcome: "deleted"; entry: TimerRow }
  | { outcome: "before-start"; entry: TimerRow }
  | { outcome: "not-found" }

/**
 * Stop this person's entry at `at`, only if it is still running.
 *
 * Read with the person's own client (row security: someone else's entry is
 * "not found", the same answer as one that does not exist), then written with
 * the version it was read at as the base. If a device's sync lands in between,
 * the write is refused, and it is read again: still running, try again; stopped
 * meanwhile, say when.
 */
export async function stopRunningTimer(userId: string, entryId: string, at: string): Promise<StopAnswer> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const entry = await readTimerEntry(userId, entryId)
    if (!entry) return { outcome: "not-found" }
    if (entry.deletedAt !== null) return { outcome: "deleted", entry }
    if (entry.stoppedAt !== null) return { outcome: "already-stopped", entry }
    if (Date.parse(at) < Date.parse(entry.startedAt)) return { outcome: "before-start", entry }
    if ((await writeTimerStop(entry, at)) === "written") return { outcome: "stopped", entry: { ...entry, stoppedAt: at } }
  }
  throw new Error("The timer kept changing while it was being stopped")
}

// ---------------------------------------------------------------------------
// The 6 h alert
// ---------------------------------------------------------------------------

export const ALERT_AFTER_MS = 6 * 3_600_000
/** The night the alert waits through, in the person's zone: 23:00 to 07:00. */
const NIGHT_START = 23 * 60
const NIGHT_END = 7 * 60
/** Timers older than this are not asked about any more (see `runningTimersPastAsServer`). */
const ALERT_LOOKBACK_MS = 7 * 24 * 3_600_000

/**
 * May the alert ring for a timer started at `startedAt`, at `now`?
 * Read in the person's zone, so 07:00 is 07:00 on both sides of a clock change.
 */
export function alertDecision(startedAt: string, now: Date, timezone: string): "not-yet" | "hold" | "send" {
  if (now.getTime() - Date.parse(startedAt) < ALERT_AFTER_MS) return "not-yet"
  const local = toZonedDate(now, timezone)
  const minute = local.getHours() * 60 + local.getMinutes()
  return minute >= NIGHT_START || minute < NIGHT_END ? "hold" : "send"
}

export interface AlertClockResult {
  candidates: number
  sent: number
  held: number
  failed: number
}

/**
 * ONE TICK OF THE ALERT CLOCK, from `/api/notifications/tick`: every running
 * timer past 6 h not yet alerted rings once, unless it is night where its
 * person is. The send log records the alert before it goes, one per entry, so
 * a second tick — or two racing — never rings it again.
 */
export async function runTimerAlertClock(now: Date = new Date()): Promise<AlertClockResult> {
  const candidates = await runningTimersPastAsServer(new Date(now.getTime() - ALERT_AFTER_MS), new Date(now.getTime() - ALERT_LOOKBACK_MS))
  const alerted = candidates.length > 0 ? await alertedEntryIds(candidates.map((c) => c.id)) : new Set<string>()
  const result: AlertClockResult = { candidates: candidates.length, sent: 0, held: 0, failed: 0 }

  await Promise.all(
    candidates
      .filter((c) => !alerted.has(c.id))
      .map(async (c) => {
        try {
          const timezone = await timezoneAsServer(c.userId)
          const decision = alertDecision(c.startedAt, now, timezone)
          if (decision === "hold") result.held++
          if (decision !== "send") return
          const entry: TimerRow = { ...c, stoppedAt: null, deletedAt: null, updatedAt: c.startedAt }
          const sent = await sendToPerson(c.userId, "timetrack-alert", () => runningPayload(entry, timezone, now, { alert: true }), now, {
            entryId: c.id,
          })
          if (sent.sendId) result.sent++
        } catch (error) {
          result.failed++
          console.error("[timer alert] not sent", error instanceof Error ? error.message : "unknown")
        }
      }),
  )
  return result
}
