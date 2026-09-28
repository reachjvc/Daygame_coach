import { describe, expect, test } from "vitest"

import {
  dayColumnSeconds,
  entriesForDay,
  entryInterval,
  eventInterval,
  eventToDraft,
  expandRecurrence,
  googleEventsToEvents,
  icsToEvents,
  layoutBlocks,
  parseIcs,
  parseIcsDate,
  parseIcsDuration,
  snapMinutes,
  unfoldIcsLines,
} from "@/src/timetrack/calendarService"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"

import { NOW_ISO, entry } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-1@google.com
DTSTART:20260810T090000Z
DTEND:20260810T100000Z
SUMMARY:Standup with the team
DESCRIPTION:Daily sync\\nBring notes\\, please
LOCATION:Meet link
END:VEVENT
BEGIN:VEVENT
UID:evt-2@google.com
DTSTART;VALUE=DATE:20260811
DTEND;VALUE=DATE:20260812
SUMMARY:All day offsite
END:VEVENT
BEGIN:VEVENT
UID:evt-3@google.com
DTSTART:20260810T140000Z
DURATION:PT1H30M
SUMMARY:Long folded summary that continues
 on the next line
END:VEVENT
END:VCALENDAR`

describe("ICS line handling", () => {
  test("unfolds continuation lines", () => {
    const lines = unfoldIcsLines("SUMMARY:part one\n part two\nUID:x")
    expect(lines[0]).toBe("SUMMARY:part onepart two")
    expect(lines).toHaveLength(2)
  })

  test("handles CRLF input", () => {
    expect(unfoldIcsLines("A:1\r\nB:2\r\n")).toEqual(["A:1", "B:2"])
  })
})

describe("ICS date parsing", () => {
  test("UTC values", () => {
    expect(parseIcsDate("20260810T093000Z")).toEqual({ iso: "2026-08-10T09:30:00.000Z", dateOnly: false })
  })

  test("date-only values are flagged as all-day", () => {
    expect(parseIcsDate("20260810")?.dateOnly).toBe(true)
  })

  test("TZID values are converted to UTC", () => {
    // 09:00 in Berlin during DST = 07:00 UTC
    expect(parseIcsDate("20260810T090000", { TZID: "Europe/Berlin" })?.iso).toBe("2026-08-10T07:00:00.000Z")
  })

  test("unknown zones fall back to local time", () => {
    const parsed = parseIcsDate("20260810T090000", { TZID: "Not/AZone" })!
    expect(new Date(parsed.iso).getHours()).toBe(9)
  })

  test("rejects malformed values", () => {
    expect(parseIcsDate("not-a-date")).toBeNull()
  })

  test("ICS durations", () => {
    expect(parseIcsDuration("PT1H30M")).toBe(5400)
    expect(parseIcsDuration("P1D")).toBe(86400)
    expect(parseIcsDuration("P1W")).toBe(604800)
    expect(parseIcsDuration("nope")).toBeNull()
  })
})

describe("parseIcs", () => {
  const events = parseIcs(ICS)

  test("reads every VEVENT", () => {
    expect(events).toHaveLength(3)
  })

  test("unescapes text properties", () => {
    const standup = events[0]
    expect(standup.title).toBe("Standup with the team")
    expect(standup.description).toBe("Daily sync\nBring notes, please")
    expect(standup.location).toBe("Meet link")
  })

  test("marks date-only events all-day", () => {
    expect(events[1].allDay).toBe(true)
  })

  test("derives the end from DURATION when DTEND is absent", () => {
    expect(events[2].end).toBe("2026-08-10T15:30:00.000Z")
  })

  test("folded summaries are joined", () => {
    expect(events[2].title).toBe("Long folded summary that continueson the next line")
  })
})

describe("recurrence expansion", () => {
  const weekly = {
    uid: "r1",
    title: "Weekly sync",
    description: "",
    location: "",
    start: "2026-08-03T09:00:00.000Z",
    end: "2026-08-03T10:00:00.000Z",
    allDay: false,
    rrule: "FREQ=WEEKLY;COUNT=4",
    exdates: [],
    htmlLink: null,
  }

  test("COUNT limits the number of instances", () => {
    const instances = expandRecurrence(weekly, new Date("2026-07-01"), new Date("2026-12-01"))
    expect(instances).toHaveLength(4)
    expect(instances[1].start).toBe("2026-08-10T09:00:00.000Z")
  })

  test("the window clips instances", () => {
    const instances = expandRecurrence(weekly, new Date("2026-08-09"), new Date("2026-08-16"))
    expect(instances).toHaveLength(1)
    expect(instances[0].start).toBe("2026-08-10T09:00:00.000Z")
  })

  test("UNTIL stops the series at that instant", () => {
    // Aug 17 09:00 falls after UNTIL (Aug 17 00:00), so only Aug 3 and Aug 10 remain
    const instances = expandRecurrence(
      { ...weekly, rrule: "FREQ=WEEKLY;UNTIL=20260817T000000Z" },
      new Date("2026-07-01"),
      new Date("2026-12-01"),
    )
    expect(instances.map((i) => i.start.slice(0, 10))).toEqual(["2026-08-03", "2026-08-10"])
  })

  test("EXDATE removes a single occurrence", () => {
    const instances = expandRecurrence(
      { ...weekly, exdates: ["2026-08-10T09:00:00.000Z"] },
      new Date("2026-07-01"),
      new Date("2026-12-01"),
    )
    expect(instances.map((i) => i.start)).not.toContain("2026-08-10T09:00:00.000Z")
    expect(instances).toHaveLength(3)
  })

  test("daily with INTERVAL", () => {
    const instances = expandRecurrence(
      { ...weekly, rrule: "FREQ=DAILY;INTERVAL=2;COUNT=3" },
      new Date("2026-07-01"),
      new Date("2026-12-01"),
    )
    expect(instances.map((i) => i.start.slice(0, 10))).toEqual(["2026-08-03", "2026-08-05", "2026-08-07"])
  })

  test("weekly BYDAY emits each requested weekday", () => {
    const instances = expandRecurrence(
      { ...weekly, rrule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4" },
      new Date("2026-08-01"),
      new Date("2026-09-01"),
    )
    expect(instances).toHaveLength(4)
    const days = instances.map((i) => new Date(i.start).getDay())
    expect(new Set(days)).toEqual(new Set([1, 3]))
  })

  test("monthly recurrence steps by month", () => {
    const instances = expandRecurrence(
      { ...weekly, rrule: "FREQ=MONTHLY;COUNT=3" },
      new Date("2026-07-01"),
      new Date("2026-12-01"),
    )
    expect(instances.map((i) => i.start.slice(0, 7))).toEqual(["2026-08", "2026-09", "2026-10"])
  })

  test("no RRULE returns the single instance", () => {
    const instances = expandRecurrence({ ...weekly, rrule: null }, new Date("2026-07-01"), new Date("2026-12-01"))
    expect(instances).toHaveLength(1)
  })
})

describe("icsToEvents applies Toggl's import rules", () => {
  test("skips all-day events and keeps timed ones", () => {
    const result = icsToEvents(ICS, "7", "2026-08-10")
    expect(result.skippedAllDay).toBe(1)
    expect(result.events).toHaveLength(2)
    expect(result.events.every((e) => e.calendarId === "7")).toBe(true)
  })

  test("drops events outside the 60-back / 30-forward window", () => {
    const far = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:old@x
DTSTART:20250101T090000Z
DTEND:20250101T100000Z
SUMMARY:Ancient meeting
END:VEVENT
END:VCALENDAR`
    const result = icsToEvents(far, "1", "2026-08-10")
    expect(result.events).toHaveLength(0)
    expect(result.skippedOutOfWindow).toBe(1)
  })

  test("event ids are stable per instance", () => {
    const first = icsToEvents(ICS, "7", "2026-08-10").events.map((e) => e.id)
    const second = icsToEvents(ICS, "7", "2026-08-10").events.map((e) => e.id)
    expect(first).toEqual(second)
    expect(new Set(first).size).toBe(first.length)
  })
})

describe("Google Calendar API mapping", () => {
  test("timed events convert, all-day events are skipped", () => {
    const { events, skippedAllDay } = googleEventsToEvents(
      [
        {
          id: "g1",
          summary: "Client call",
          start: { dateTime: "2026-08-10T09:00:00+02:00" },
          end: { dateTime: "2026-08-10T10:00:00+02:00" },
          htmlLink: "https://calendar.google.com/x",
        },
        { id: "g2", summary: "Holiday", start: { date: "2026-08-11" }, end: { date: "2026-08-12" } },
      ],
      "3",
    )
    expect(skippedAllDay).toBe(1)
    expect(events).toHaveLength(1)
    expect(events[0].start).toBe("2026-08-10T07:00:00.000Z")
    expect(events[0].htmlLink).toBe("https://calendar.google.com/x")
  })
})

describe("event → time entry", () => {
  test("only the title is copied, exactly like Toggl", () => {
    const event = icsToEvents(ICS, "1", "2026-08-10").events[0]
    expect(eventToDraft(event)).toEqual({
      description: "Standup with the team",
      projectId: null,
      taskId: null,
      tagIds: [],
      billable: false,
    })
  })
})

describe("calendar grid geometry", () => {
  test("non-overlapping blocks each get one full column", () => {
    const blocks = layoutBlocks(
      [
        { startMin: 60, endMin: 120 },
        { startMin: 180, endMin: 240 },
      ],
      (i) => i,
    )
    expect(blocks.every((b) => b.columns === 1 && b.column === 0)).toBe(true)
  })

  test("overlapping blocks split into side-by-side columns", () => {
    const blocks = layoutBlocks(
      [
        { startMin: 60, endMin: 180 },
        { startMin: 90, endMin: 150 },
        { startMin: 120, endMin: 200 },
      ],
      (i) => i,
    )
    expect(blocks.every((b) => b.columns === 3)).toBe(true)
    expect(new Set(blocks.map((b) => b.column))).toEqual(new Set([0, 1, 2]))
  })

  test("separate clusters are laid out independently", () => {
    const blocks = layoutBlocks(
      [
        { startMin: 60, endMin: 120 },
        { startMin: 70, endMin: 110 },
        { startMin: 300, endMin: 360 },
      ],
      (i) => i,
    )
    const late = blocks.find((b) => b.topMinutes === 300)!
    expect(late.columns).toBe(1)
  })

  test("intervals are clipped to the day for entries spanning midnight", () => {
    const overnight = entry(1, "2026-08-09", "23:00", "23:59")
    const nextDay = { ...overnight, stop: new Date(2026, 7, 10, 1, 0).toISOString() }
    expect(entryInterval(nextDay, "2026-08-09", NOW_SEC).endMin).toBe(24 * 60)
    expect(entryInterval(nextDay, "2026-08-10", NOW_SEC).startMin).toBe(0)
    expect(entriesForDay([nextDay], "2026-08-10", NOW_SEC)).toHaveLength(1)
  })

  test("event intervals use local minutes", () => {
    const event = {
      id: "x",
      calendarId: "1",
      uid: "x",
      title: "t",
      description: "",
      location: "",
      start: new Date(2026, 7, 10, 9, 30).toISOString(),
      end: new Date(2026, 7, 10, 10, 0).toISOString(),
      allDay: false,
      htmlLink: null,
    }
    expect(eventInterval(event, "2026-08-10")).toEqual({ startMin: 570, endMin: 600 })
  })

  test("snapping rounds to five-minute steps and clamps to the day", () => {
    expect(snapMinutes(63)).toBe(65)
    expect(snapMinutes(-10)).toBe(0)
    expect(snapMinutes(2000)).toBe(1440)
  })

  test("day column total sums the visible portion", () => {
    const entries = [entry(1, "2026-08-10", "09:00", "10:30"), entry(2, "2026-08-10", "11:00", "11:30")]
    expect(dayColumnSeconds(entries, "2026-08-10", NOW_SEC)).toBe(2 * 3600)
  })
})

describe("a VEVENT that gives a start and no end", () => {
  /**
   * `parseIcs` required both, so such a row was dropped — and counted by NEITHER skip
   * counter, so the import said "Imported 1 event" for a file holding two. RFC 5545
   * §3.6.1 permits `DTSTART` alone, and it means zero length for a DATE-TIME.
   *
   * A zero-length event still cannot become a time entry, so it is not imported. What
   * changed is that the person is told which of the two things happened: it used to
   * fall into the "outside the date window" count, which is untrue and sends them to
   * widen a window that is already wide enough — the same wrong sentence the
   * recurrence cliff produced, from a different cause.
   */
  const ics = (body: string[]) => ["BEGIN:VCALENDAR", ...body, "END:VCALENDAR"].join("\r\n")
  const withEnd = ["BEGIN:VEVENT", "UID:a", "SUMMARY:has an end", "DTSTART:20260920T090000Z", "DTEND:20260920T093000Z", "END:VEVENT"]
  const startOnly = ["BEGIN:VEVENT", "UID:b", "SUMMARY:no end", "DTSTART:20260920T110000Z", "END:VEVENT"]

  test("is parsed rather than silently dropped", () => {
    expect(parseIcs(ics([...withEnd, ...startOnly])).map((e) => e.uid)).toEqual(["a", "b"])
  })

  test("and is counted as having no length, not as outside the window", () => {
    const result = icsToEvents(ics([...withEnd, ...startOnly]), "cal", "2026-09-20")
    expect(result.events).toHaveLength(1)
    expect(result.skippedZeroLength, "it was not counted at all, so the numbers did not add up").toBe(1)
    expect(result.skippedOutOfWindow, "it was blamed on the date window, which is false").toBe(0)
  })

  test("and a genuinely out-of-window event is still called that", () => {
    const longAgo = ["BEGIN:VEVENT", "UID:c", "SUMMARY:last year", "DTSTART:20250101T090000Z", "DTEND:20250101T093000Z", "END:VEVENT"]
    const result = icsToEvents(ics([...withEnd, ...longAgo]), "cal", "2026-09-20")
    expect(result.skippedOutOfWindow).toBe(1)
    expect(result.skippedZeroLength).toBe(0)
  })
})

describe("a VEVENT whose DURATION comes before its DTSTART", () => {
  /**
   * RFC 5545 puts no constraint on the order of a component's properties. `DURATION`
   * was resolved inline and required `DTSTART` to be set already, so a file writing
   * them the other way round lost the length — and once a start with no end became
   * zero-length, the import began saying "1 with no length" about a one-hour meeting.
   * A confidently wrong sentence, which is the same sin as the "outside the date
   * window" message that behaviour was added to fix.
   */
  const ics = (body: string[]) => ["BEGIN:VCALENDAR", ...body, "END:VCALENDAR"].join("\r\n")

  test("still has its length", () => {
    const before = parseIcs(ics([
      "BEGIN:VEVENT", "UID:a", "SUMMARY:duration first", "DURATION:PT1H", "DTSTART:20260920T090000Z", "END:VEVENT",
    ]))
    expect(before).toHaveLength(1)
    const minutes = (new Date(before[0].end).getTime() - new Date(before[0].start).getTime()) / 60_000
    expect(minutes, "the DURATION line was dropped, so the event became zero-length").toBe(60)
  })

  test("and the usual order still works", () => {
    const after = parseIcs(ics([
      "BEGIN:VEVENT", "UID:b", "SUMMARY:dtstart first", "DTSTART:20260920T090000Z", "DURATION:PT90M", "END:VEVENT",
    ]))
    const minutes = (new Date(after[0].end).getTime() - new Date(after[0].start).getTime()) / 60_000
    expect(minutes).toBe(90)
  })

  test("and DTEND still wins over a DURATION, whichever order they arrive in", () => {
    /**
     * RFC 5545 §3.6.1 forbids both in one VEVENT, so either reading is defensible —
     * what matters is that the explicit end is not silently replaced by a computed one.
     */
    const both = parseIcs(ics([
      "BEGIN:VEVENT", "UID:c", "DURATION:PT5H", "DTSTART:20260920T090000Z", "DTEND:20260920T100000Z", "END:VEVENT",
    ]))
    expect((new Date(both[0].end).getTime() - new Date(both[0].start).getTime()) / 60_000).toBe(60)
  })

  test("and an event that genuinely has no length is still reported as such", () => {
    const result = icsToEvents(
      ics(["BEGIN:VEVENT", "UID:d", "DTSTART:20260920T110000Z", "END:VEVENT"]),
      "cal",
      "2026-09-20",
    )
    expect(result.skippedZeroLength).toBe(1)
  })
})
