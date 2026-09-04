/**
 * Time-tracking slice — external calendars & calendar-view geometry.
 *
 * ICS parsing covers what Google Calendar's "secret address in iCal format"
 * actually emits: folded lines, VEVENT blocks, DTSTART/DTEND with TZID or Z,
 * date-only (all-day) values, RRULE recurrence + EXDATE, and \-escaped text.
 *
 * Toggl's import rules are reproduced: all-day events are dropped, and the
 * window is 60 days back / 30 days forward.
 */

import {
  CALENDAR_WINDOW_DAYS_BACK,
  CALENDAR_WINDOW_DAYS_FORWARD,
  CALENDAR_SNAP_MINUTES,
} from "./config"
import {
  addDays,
  dateKey,
  dateKeyToDate,
  epochSeconds,
  minutesIntoDay,
} from "./timetrackFormatService"
import { entrySeconds, isRunning } from "./timetrackService"
import type {
  CalendarEvent,
  EntryDraft,
  Id,
  IsoDate,
  IsoDateTime,
  TimeEntry,
} from "./types"

// ---------------------------------------------------------------------------
// ICS parsing
// ---------------------------------------------------------------------------

interface RawProperty {
  name: string
  params: Record<string, string>
  value: string
}

/** RFC 5545 line unfolding: continuation lines start with a space or tab */
export function unfoldIcsLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const out: string[] = []
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1)
    } else if (line.trim().length > 0) {
      out.push(line)
    }
  }
  return out
}

function parseProperty(line: string): RawProperty | null {
  const colon = line.indexOf(":")
  if (colon === -1) return null
  const head = line.slice(0, colon)
  const value = line.slice(colon + 1)
  const [name, ...paramParts] = head.split(";")
  const params: Record<string, string> = {}
  for (const part of paramParts) {
    const eq = part.indexOf("=")
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, "")
  }
  return { name: name.toUpperCase(), params, value }
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim()
}

interface IcsDate {
  iso: IsoDateTime
  dateOnly: boolean
}

/**
 * Parse an ICS date value.
 * `20260810T093000Z` → UTC · `20260810T093000` with TZID → treated in that zone
 * when the runtime knows it, otherwise local · `20260810` → all-day.
 */
export function parseIcsDate(value: string, params: Record<string, string> = {}): IcsDate | null {
  const raw = value.trim()
  const dateOnlyMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(raw)
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch
    return { iso: new Date(Number(y), Number(m) - 1, Number(d)).toISOString(), dateOnly: true }
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(raw)
  if (!match) return null
  const [, y, mo, d, h, mi, s, zulu] = match

  if (zulu) {
    return {
      iso: new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))).toISOString(),
      dateOnly: false,
    }
  }

  const tzid = params.TZID
  if (tzid) {
    const utcGuess = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
    const offset = timezoneOffsetMs(tzid, utcGuess)
    if (offset !== null) return { iso: new Date(utcGuess - offset).toISOString(), dateOnly: false }
  }

  // Floating time — interpret in the viewer's local zone, like Google does
  return {
    iso: new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).toISOString(),
    dateOnly: false,
  }
}

/** Offset of `tzid` from UTC at `utcMs`, or null when the zone is unknown */
function timezoneOffsetMs(tzid: string, utcMs: number): number | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    const parts = formatter.formatToParts(new Date(utcMs))
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"))
    return asUtc - utcMs
  } catch {
    return null
  }
}

interface ParsedVEvent {
  uid: string
  title: string
  description: string
  location: string
  start: IsoDateTime
  end: IsoDateTime
  allDay: boolean
  rrule: string | null
  exdates: IsoDateTime[]
  htmlLink: string | null
}

export function parseIcs(text: string): ParsedVEvent[] {
  const lines = unfoldIcsLines(text)
  const events: ParsedVEvent[] = []
  let current: Partial<ParsedVEvent> & { exdates: IsoDateTime[] } | null = null

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = { exdates: [] }
      continue
    }
    if (line.startsWith("END:VEVENT")) {
      if (current?.start && current.end && current.uid) {
        events.push({
          uid: current.uid,
          title: current.title || "(no title)",
          description: current.description ?? "",
          location: current.location ?? "",
          start: current.start,
          end: current.end,
          allDay: current.allDay ?? false,
          rrule: current.rrule ?? null,
          exdates: current.exdates,
          htmlLink: current.htmlLink ?? null,
        })
      }
      current = null
      continue
    }
    if (!current) continue

    const prop = parseProperty(line)
    if (!prop) continue

    switch (prop.name) {
      case "UID":
        current.uid = prop.value.trim()
        break
      case "SUMMARY":
        current.title = unescapeText(prop.value)
        break
      case "DESCRIPTION":
        current.description = unescapeText(prop.value)
        break
      case "LOCATION":
        current.location = unescapeText(prop.value)
        break
      case "URL":
        current.htmlLink = prop.value.trim()
        break
      case "DTSTART": {
        const parsed = parseIcsDate(prop.value, prop.params)
        if (parsed) {
          current.start = parsed.iso
          current.allDay = parsed.dateOnly || prop.params.VALUE === "DATE"
        }
        break
      }
      case "DTEND": {
        const parsed = parseIcsDate(prop.value, prop.params)
        if (parsed) current.end = parsed.iso
        break
      }
      case "DURATION": {
        if (current.start) {
          const seconds = parseIcsDuration(prop.value)
          if (seconds !== null) current.end = new Date(new Date(current.start).getTime() + seconds * 1000).toISOString()
        }
        break
      }
      case "RRULE":
        current.rrule = prop.value.trim()
        break
      case "EXDATE": {
        for (const piece of prop.value.split(",")) {
          const parsed = parseIcsDate(piece, prop.params)
          if (parsed) current.exdates.push(parsed.iso)
        }
        break
      }
      default:
        break
    }
  }

  return events
}

/** ISO 8601 duration used by ICS DURATION, e.g. PT1H30M / P1D */
export function parseIcsDuration(value: string): number | null {
  const match = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value.trim())
  if (!match) return null
  const [, sign, w, d, h, m, s] = match
  const total =
    (Number(w ?? 0) * 604800) + (Number(d ?? 0) * 86400) + (Number(h ?? 0) * 3600) + (Number(m ?? 0) * 60) + Number(s ?? 0)
  return sign === "-" ? -total : total
}

// ---------------------------------------------------------------------------
// Recurrence expansion (FREQ DAILY/WEEKLY/MONTHLY/YEARLY + INTERVAL/COUNT/UNTIL/BYDAY)
// ---------------------------------------------------------------------------

const ICS_WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

export function expandRecurrence(
  event: ParsedVEvent,
  windowStart: Date,
  windowEnd: Date,
  maxInstances = 400,
): { start: IsoDateTime; end: IsoDateTime }[] {
  const startDate = new Date(event.start)
  const durationMs = new Date(event.end).getTime() - startDate.getTime()
  const base = [{ start: event.start, end: event.end }]
  if (!event.rrule) return base

  const rules: Record<string, string> = {}
  for (const part of event.rrule.split(";")) {
    const [k, v] = part.split("=")
    if (k && v) rules[k.toUpperCase()] = v
  }

  const freq = rules.FREQ
  if (!freq) return base
  const interval = Math.max(1, Number(rules.INTERVAL ?? 1))
  const count = rules.COUNT ? Number(rules.COUNT) : null
  const until = rules.UNTIL ? parseIcsDate(rules.UNTIL)?.iso ?? null : null
  const untilMs = until ? new Date(until).getTime() : null
  const byDay = rules.BYDAY ? rules.BYDAY.split(",").map((d) => d.slice(-2).toUpperCase()) : null
  const excluded = new Set(event.exdates.map((iso) => new Date(iso).getTime()))

  const out: { start: IsoDateTime; end: IsoDateTime }[] = []
  const cursor = new Date(startDate)
  let emitted = 0
  let guard = 0

  const push = (instanceStart: Date) => {
    const ms = instanceStart.getTime()
    if (excluded.has(ms)) return
    if (untilMs !== null && ms > untilMs) return
    if (instanceStart > windowEnd) return
    const instanceEnd = new Date(ms + durationMs)
    if (instanceEnd < windowStart) return
    out.push({ start: instanceStart.toISOString(), end: instanceEnd.toISOString() })
  }

  while (guard < maxInstances * 4 && out.length < maxInstances) {
    guard++
    if (count !== null && emitted >= count) break
    if (untilMs !== null && cursor.getTime() > untilMs) break
    if (cursor > windowEnd) break

    if (freq === "WEEKLY" && byDay) {
      // Emit each requested weekday inside the current week
      const weekAnchor = new Date(cursor)
      weekAnchor.setDate(weekAnchor.getDate() - weekAnchor.getDay())
      for (const day of byDay) {
        const offset = ICS_WEEKDAYS.indexOf(day)
        if (offset === -1) continue
        const instance = new Date(weekAnchor)
        instance.setDate(weekAnchor.getDate() + offset)
        instance.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), 0)
        if (instance < startDate) continue
        push(instance)
        emitted++
        if (count !== null && emitted >= count) break
      }
      cursor.setDate(cursor.getDate() + 7 * interval)
      continue
    }

    push(new Date(cursor))
    emitted++

    switch (freq) {
      case "DAILY":
        cursor.setDate(cursor.getDate() + interval)
        break
      case "WEEKLY":
        cursor.setDate(cursor.getDate() + 7 * interval)
        break
      case "MONTHLY":
        cursor.setMonth(cursor.getMonth() + interval)
        break
      case "YEARLY":
        cursor.setFullYear(cursor.getFullYear() + interval)
        break
      default:
        return out.length ? out : base
    }
  }

  return out
}

// ---------------------------------------------------------------------------
// ICS → CalendarEvent[]
// ---------------------------------------------------------------------------

export interface IcsImportResult {
  events: CalendarEvent[]
  skippedAllDay: number
  skippedOutOfWindow: number
}

/**
 * Convert ICS text into events for one calendar, applying Toggl's rules:
 * all-day events are skipped, window is 60 days back / 30 days forward.
 */
export function icsToEvents(text: string, calendarId: Id, todayKey: IsoDate): IcsImportResult {
  const windowStart = dateKeyToDate(addDays(todayKey, -CALENDAR_WINDOW_DAYS_BACK))
  const windowEndDay = dateKeyToDate(addDays(todayKey, CALENDAR_WINDOW_DAYS_FORWARD))
  windowEndDay.setHours(23, 59, 59, 999)

  const events: CalendarEvent[] = []
  let skippedAllDay = 0
  let skippedOutOfWindow = 0

  for (const parsed of parseIcs(text)) {
    if (parsed.allDay) {
      skippedAllDay++
      continue
    }
    const instances = expandRecurrence(parsed, windowStart, windowEndDay)
    let kept = 0
    for (const instance of instances) {
      const start = new Date(instance.start)
      const end = new Date(instance.end)
      if (end < windowStart || start > windowEndDay) continue
      if (end.getTime() <= start.getTime()) continue
      kept++
      events.push({
        id: `${calendarId}:${parsed.uid}:${instance.start}`,
        calendarId,
        uid: parsed.uid,
        title: parsed.title,
        description: parsed.description,
        location: parsed.location,
        start: instance.start,
        end: instance.end,
        allDay: false,
        htmlLink: parsed.htmlLink,
      })
    }
    if (kept === 0) skippedOutOfWindow++
  }

  return { events, skippedAllDay, skippedOutOfWindow }
}

/** Google's Calendar API shape (events.list items) → CalendarEvent[] */
export function googleEventsToEvents(
  items: unknown[],
  calendarId: Id,
): { events: CalendarEvent[]; skippedAllDay: number } {
  const events: CalendarEvent[] = []
  let skippedAllDay = 0

  for (const raw of items) {
    const item = raw as {
      id?: string
      summary?: string
      description?: string
      location?: string
      htmlLink?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
    }
    if (!item.start?.dateTime || !item.end?.dateTime) {
      skippedAllDay++
      continue
    }
    events.push({
      id: `${calendarId}:${item.id ?? item.start.dateTime}`,
      calendarId,
      uid: item.id ?? item.start.dateTime,
      title: item.summary ?? "(no title)",
      description: item.description ?? "",
      location: item.location ?? "",
      start: new Date(item.start.dateTime).toISOString(),
      end: new Date(item.end.dateTime).toISOString(),
      allDay: false,
      htmlLink: item.htmlLink ?? null,
    })
  }

  return { events, skippedAllDay }
}

/**
 * Toggl copies only the event description into the new entry — project, tags and
 * billable status stay unset and must be assigned manually.
 */
export function eventToDraft(event: CalendarEvent): EntryDraft {
  return { description: event.title, projectId: null, taskId: null, tagIds: [], billable: false }
}

export function eventsForDay(events: CalendarEvent[], day: IsoDate): CalendarEvent[] {
  return events
    .filter((e) => dateKey(e.start) === day)
    .sort((a, b) => epochSeconds(a.start) - epochSeconds(b.start))
}


// ---------------------------------------------------------------------------
// Calendar-view geometry
// ---------------------------------------------------------------------------

export interface CalendarBlock<T> {
  item: T
  /** Minutes from midnight */
  topMinutes: number
  heightMinutes: number
  /** 0-based column index within an overlap cluster */
  column: number
  columns: number
}

interface Interval {
  startMin: number
  endMin: number
}

/**
 * Lay blocks out in side-by-side columns when they overlap, the way a calendar
 * grid does. Clusters of mutually overlapping items share a column count.
 */
export function layoutBlocks<T>(items: T[], toInterval: (item: T) => Interval): CalendarBlock<T>[] {
  const sorted = items
    .map((item) => ({ item, ...toInterval(item) }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const result: CalendarBlock<T>[] = []
  let cluster: typeof sorted = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length === 0) return
    const columnEnds: number[] = []
    const assignments = cluster.map((entry) => {
      let column = columnEnds.findIndex((end) => end <= entry.startMin)
      if (column === -1) {
        columnEnds.push(entry.endMin)
        column = columnEnds.length - 1
      } else {
        columnEnds[column] = entry.endMin
      }
      return { entry, column }
    })
    for (const { entry, column } of assignments) {
      result.push({
        item: entry.item,
        topMinutes: entry.startMin,
        heightMinutes: Math.max(1, entry.endMin - entry.startMin),
        column,
        columns: columnEnds.length,
      })
    }
    cluster = []
    clusterEnd = -1
  }

  for (const entry of sorted) {
    if (cluster.length > 0 && entry.startMin >= clusterEnd) flush()
    cluster.push(entry)
    clusterEnd = Math.max(clusterEnd, entry.endMin)
  }
  flush()

  return result
}

export function entryInterval(entry: TimeEntry, day: IsoDate, nowSec: number): Interval {
  const startMin = dateKey(entry.start) === day ? minutesIntoDay(entry.start) : 0
  const endIso = entry.stop ?? new Date(nowSec * 1000).toISOString()
  const endMin = dateKey(endIso) === day ? minutesIntoDay(endIso) : 24 * 60
  return { startMin, endMin: Math.max(startMin + 1, endMin) }
}

export function eventInterval(event: CalendarEvent, day: IsoDate): Interval {
  const startMin = dateKey(event.start) === day ? minutesIntoDay(event.start) : 0
  const endMin = dateKey(event.end) === day ? minutesIntoDay(event.end) : 24 * 60
  return { startMin, endMin: Math.max(startMin + 1, endMin) }
}

/** Entries that touch `day`, including a running one */
export function entriesForDay(entries: TimeEntry[], day: IsoDate, nowSec: number): TimeEntry[] {
  return entries
    .filter((entry) => {
      const startDay = dateKey(entry.start)
      if (startDay === day) return true
      const endIso = entry.stop ?? new Date(nowSec * 1000).toISOString()
      return startDay < day && dateKey(endIso) >= day
    })
    .sort((a, b) => epochSeconds(a.start) - epochSeconds(b.start))
}

export function snapMinutes(minutes: number, snap = CALENDAR_SNAP_MINUTES): number {
  return Math.max(0, Math.min(24 * 60, Math.round(minutes / snap) * snap))
}

/** Total tracked seconds shown in a calendar day column */
export function dayColumnSeconds(entries: TimeEntry[], day: IsoDate, nowSec: number): number {
  return entriesForDay(entries, day, nowSec).reduce((sum, entry) => {
    const { startMin, endMin } = entryInterval(entry, day, nowSec)
    const clamped = (endMin - startMin) * 60
    return sum + (isRunning(entry) ? Math.min(clamped, entrySeconds(entry, nowSec)) : clamped)
  }, 0)
}
