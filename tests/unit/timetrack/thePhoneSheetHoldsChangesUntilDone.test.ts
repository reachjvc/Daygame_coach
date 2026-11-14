/**
 * THE PHONE'S ONE ENTRY SHEET, AS DATA (Plans/toggl-parity.md Phase 2).
 *
 * Nothing is saved until DONE; a drum lands inside the wheel's limits without
 * a word; a typed value that cannot be is refused in Toggl's own words; digits
 * typed into the big duration fill from the right (130 is 1:30); a typed start
 * keeps the end; and DONE lays only what was changed onto the entry as it is
 * then, never a copy from when the sheet opened.
 */

import { describe, expect, test } from "vitest"

import {
  MAX_SHEET_SECONDS,
  SHEET_REFUSALS,
  changesBetween,
  chipDate,
  createFromSheet,
  edgeBounds,
  isDirty,
  lastStopTime,
  manualDraft,
  microwaveSeconds,
  microwaveShown,
  moveEdge,
  nudgeEdge,
  readTypedDuration,
  roundedStop,
  saveEdit,
  saveStops,
  sheetDraftOf,
  shownDraft,
  startingDraft,
  typeDuration,
  typeDurationInto,
  typeStart,
  typeStop,
  withDuration,
  withStart,
  withStop,
} from "@/src/timetrack/phoneSheetService"
import { startTimer, stopTimer, updateEntry } from "@/src/timetrack/timetrackService"
import { emptyDraft } from "@/src/timetrack/timetrackService"

import { baseState, entry } from "./helpers"

const at = (day: string, hm: string) => {
  const [h, m] = hm.split(":").map(Number)
  const [y, mo, d] = day.split("-").map(Number)
  return new Date(y, mo - 1, d, h, m, 0, 0).toISOString()
}
const DAY = "2026-08-10"
const NOW = at(DAY, "12:00")

describe("digits typed into the big duration fill from the right", () => {
  test("130 is 1:30, 45 is 0:45, 90 is an hour and a half, 190 is 2:30", () => {
    expect(microwaveSeconds("130")).toBe(90 * 60)
    expect(microwaveSeconds("45")).toBe(45 * 60)
    expect(microwaveSeconds("90")).toBe(90 * 60)
    expect(microwaveSeconds("190")).toBe(150 * 60)
    expect(microwaveSeconds("0130")).toBe(90 * 60)
    expect(microwaveSeconds("12345")).toBe(123 * 3600 + 45 * 60)
    expect(microwaveSeconds("123456")).toBeNull()
    expect(microwaveSeconds("1.5")).toBeNull()
  })

  test("they show as they fill: 1 is 0:01, 13 is 0:13, 130 is 1:30", () => {
    expect(microwaveShown("1")).toBe("0:01")
    expect(microwaveShown("13")).toBe("0:13")
    expect(microwaveShown("130")).toBe("1:30")
    expect(microwaveShown("1234")).toBe("12:34")
  })

  test("keystroke by keystroke, with a backspace, and a dot switches to the reading every box uses", () => {
    let box = { raw: "", shown: "" }
    for (const key of ["1", "3", "0"]) box = typeDuration(box, box.shown + key)
    expect(box).toEqual({ raw: "130", shown: "1:30" })
    box = typeDuration(box, box.shown.slice(0, -1))
    expect(box).toEqual({ raw: "13", shown: "0:13" })

    let dotted = { raw: "", shown: "" }
    for (const key of ["1", ".", "3", "0"]) dotted = typeDuration(dotted, dotted.shown + key)
    expect(dotted.shown).toBe("1.30")
    expect(readTypedDuration(dotted.raw)).toBe(90 * 60)
  })

  test("1.30, 1:30 and 2h are read as every duration box reads them", () => {
    expect(readTypedDuration("1.30")).toBe(90 * 60)
    expect(readTypedDuration("1:30")).toBe(90 * 60)
    expect(readTypedDuration("2h")).toBe(2 * 3600)
    expect(readTypedDuration("")).toBeNull()
  })

  test("more than 999 hours is refused in Toggl's words", () => {
    const finished = sheetDraftOf(entry(1, DAY, "09:00", "10:00"))
    expect(withDuration(finished, MAX_SHEET_SECONDS + 60, NOW)).toEqual({ refusal: "Duration can't exceed 999 hours!" })
    expect(typeDurationInto(finished, "99999", NOW).refusal).toBe(SHEET_REFUSALS.tooLong)
  })

  test("on a finished entry it keeps the start and moves the end", () => {
    const finished = sheetDraftOf(entry(1, DAY, "09:00", "10:00"))
    expect(typeDurationInto(finished, "130", NOW).draft).toMatchObject({ start: at(DAY, "09:00"), stop: at(DAY, "10:30") })
  })

  test("a new past entry ending now keeps its end and moves its start back (⊕, 1.1)", () => {
    // 21:10 + 1:30 used to end at 22:40, in the future
    const endsNow = { ...sheetDraftOf(entry(1, DAY, "11:50", "12:00")), stop: NOW }
    expect(typeDurationInto(endsNow, "130", NOW, { isNew: true }).draft).toMatchObject({ start: at(DAY, "10:30"), stop: NOW })
    // an end further than a minute from now is a past entry with a chosen end: the start stays
    const earlier = sheetDraftOf(entry(1, DAY, "09:00", "10:00"))
    expect(typeDurationInto(earlier, "130", NOW, { isNew: true }).draft).toMatchObject({ start: at(DAY, "09:00"), stop: at(DAY, "10:30") })
    // an existing entry that happens to end now keeps its start, as before
    expect(typeDurationInto(endsNow, "130", NOW).draft).toMatchObject({ start: at(DAY, "11:50") })
  })

  test("on a running one, longer moves its start back and shorter ends it there", () => {
    const running = { ...sheetDraftOf(entry(1, DAY, "11:00", "12:00")), stop: null }
    expect(typeDurationInto(running, "200", NOW).draft).toMatchObject({ start: at(DAY, "10:00"), stop: null })
    expect(typeDurationInto(running, "30", NOW).draft).toMatchObject({ start: at(DAY, "11:00"), stop: at(DAY, "11:30") })
  })
})

describe("a typed start keeps the end and changes the length", () => {
  const finished = sheetDraftOf(entry(1, DAY, "09:00", "10:00"))

  test("930 is 09:30, and the end stays at 10:00", () => {
    expect(typeStart(finished, "930", NOW).draft).toMatchObject({ start: at(DAY, "09:30"), stop: at(DAY, "10:00") })
  })

  test("a start after the end is refused, not turned into a moved entry", () => {
    expect(typeStart(finished, "1030", NOW)).toEqual({ refusal: "Start time must be before Stop time!" })
  })

  test("a running entry's start after now is refused", () => {
    const running = { ...finished, start: at(DAY, "11:00"), stop: null }
    expect(withStart(running, at(DAY, "12:30"), NOW)).toEqual({ refusal: "Start time must be before current time!" })
  })

  test("an end before the start is refused, typed too: in the sheet the end's day is the day drum's, not a guess", () => {
    expect(withStop(finished, at(DAY, "08:00"))).toEqual({ refusal: "Stop time must be after Start time!" })
    // findability 2026-11-05: 18:20 → 18:50, "0850" typed for the end became tomorrow 08:50, a 14-hour entry
    const evening = { ...finished, start: at(DAY, "18:20"), stop: at(DAY, "18:50") }
    expect(typeStop(evening, "0850")).toEqual({ refusal: "Stop time must be after Start time!" })
    expect(typeStop(finished, "0100")).toEqual({ refusal: "Stop time must be after Start time!" })
    // on the end's own day: an end already moved to tomorrow by its day drum stays there
    expect(typeStop({ ...evening, stop: at("2026-08-11", "07:00") }, "0850").draft?.stop).toBe(at("2026-08-11", "08:50"))
    expect(typeStop(finished, "1030").draft?.stop).toBe(at(DAY, "10:30"))
  })

  test("something unreadable says so", () => {
    expect(typeStart(finished, "xyz", NOW).refusal).toBeTruthy()
  })
})

describe("the drums and −15 −5 +5 +15 stay inside the wheel's limits, silently", () => {
  test("a running start cannot pass now", () => {
    const running = { ...sheetDraftOf(entry(1, DAY, "11:50", "12:00")), stop: null }
    expect(nudgeEdge(running, "start", 15, NOW).start).toBe(NOW)
    expect(edgeBounds(running, "start", NOW).latest).toBe(NOW)
  })

  test("a start cannot pass its end, an end cannot come before its start", () => {
    const finished = sheetDraftOf(entry(1, DAY, "09:00", "09:10"))
    expect(nudgeEdge(finished, "start", 15, NOW).start).toBe(at(DAY, "09:10"))
    expect(nudgeEdge(finished, "stop", -15, NOW).stop).toBe(at(DAY, "09:00"))
    expect(nudgeEdge(finished, "stop", 5, NOW).stop).toBe(at(DAY, "09:15"))
  })

  test("no drum makes an entry longer than 999 hours", () => {
    const finished = sheetDraftOf(entry(1, DAY, "09:00", "10:00"))
    const far = new Date(Date.parse(finished.start) + (MAX_SHEET_SECONDS + 3600) * 1000).toISOString()
    expect(Date.parse(moveEdge(finished, "stop", far, NOW).stop!) - Date.parse(finished.start)).toBe(MAX_SHEET_SECONDS * 1000)
  })

  test("a running entry's end has no drum to turn", () => {
    const running = { ...sheetDraftOf(entry(1, DAY, "11:00", "12:00")), stop: null }
    expect(nudgeEdge(running, "stop", 5, NOW)).toBe(running)
  })
})

describe("Set to last stop time and Round stop time", () => {
  test("Set to last stop time is where the entry before ended, to the second", () => {
    const before = { ...entry(1, DAY, "08:00", "09:00"), stop: new Date(Date.parse(at(DAY, "09:00")) + 40_000).toISOString() }
    const state = baseState({ entries: [before, entry(2, DAY, "09:05", "10:00")] })
    const draft = sheetDraftOf(state.entries[1])
    expect(lastStopTime(state, draft, "2", NOW)).toBe(before.stop)
  })

  test("for a new entry it is the last end so far; nothing when the start is already there", () => {
    const state = baseState({ entries: [entry(1, DAY, "08:00", "09:00"), entry(2, DAY, "10:00", "11:00")] })
    const fresh = startingDraft(emptyDraft, NOW)
    expect(lastStopTime(state, fresh, null, NOW)).toBe(at(DAY, "11:00"))
    expect(lastStopTime(state, { ...fresh, start: at(DAY, "11:00") }, null, NOW)).toBeNull()
  })

  test("Round stop time rounds to the nearest 5 minutes, or the workspace's rounding", () => {
    const draft = { ...sheetDraftOf(entry(1, DAY, "09:00", "10:00")), stop: at(DAY, "10:07") }
    expect(roundedStop(draft, { enabled: false, mode: "nearest", minutes: 15 })).toBe(at(DAY, "10:05"))
    expect(roundedStop(draft, { enabled: true, mode: "up", minutes: 15 })).toBe(at(DAY, "10:15"))
    expect(roundedStop({ ...draft, stop: at(DAY, "10:05") }, { enabled: false, mode: "nearest", minutes: 5 })).toBeNull()
    expect(roundedStop({ ...draft, stop: null }, { enabled: false, mode: "nearest", minutes: 5 })).toBeNull()
  })
})

describe("a new entry", () => {
  test("from the bar counts from the tap; from ⊕ it is 30 minutes ending now", () => {
    expect(startingDraft(emptyDraft, NOW)).toMatchObject({ start: NOW, stop: null })
    expect(manualDraft(emptyDraft, NOW)).toMatchObject({ start: at(DAY, "11:30"), stop: NOW })
  })

  test("CREATE with no end starts a timer at the sheet's start; with an end it is a finished entry", () => {
    const running = createFromSheet(baseState(), { ...startingDraft(emptyDraft, at(DAY, "11:40")), description: "Design" }, NOW)
    expect(running.violations).toEqual([])
    expect(running.created).toMatchObject({ description: "Design", start: at(DAY, "11:40"), stop: null })

    const past = createFromSheet(baseState(), { ...manualDraft(emptyDraft, NOW), description: "Call" }, NOW)
    expect(past.created).toMatchObject({ description: "Call", start: at(DAY, "11:30"), stop: NOW })
  })
})

describe("CREATE while the other device's timer runs (two-devices audit, Phase 8)", () => {
  // the phone's sheet opened at 11:40; the PC started Gym at 11:45 and the phone heard it
  const gymFromPc = () => startTimer(baseState(), { ...emptyDraft, description: "Gym" }, at(DAY, "11:45")).state

  test("starting the new one stops the other, as starting a timer does: here, now, since the sheet's start is before Gym's", () => {
    const made = createFromSheet(gymFromPc(), { ...startingDraft(emptyDraft, at(DAY, "11:40")), description: "Stretching" }, NOW, at(DAY, "11:40"))
    expect(made.violations).toEqual([])
    expect(made.created).toMatchObject({ description: "Stretching", start: NOW, stop: null })
    expect(made.stopped).toMatchObject({ description: "Gym", stop: NOW })
  })

  test("a start after Gym's is kept: Gym ends exactly there", () => {
    const made = createFromSheet(gymFromPc(), { ...startingDraft(emptyDraft, at(DAY, "11:50")), description: "Stretching" }, NOW)
    expect(made.created).toMatchObject({ start: at(DAY, "11:50") })
    expect(made.stopped).toMatchObject({ description: "Gym", stop: at(DAY, "11:50") })
  })

  test("a start the person typed before Gym's is refused, not moved to now (code review of ddffc410)", () => {
    const opened = startingDraft(emptyDraft, at(DAY, "11:46"))
    const typed = { ...opened, start: at(DAY, "11:30"), description: "Stretching" }
    const made = createFromSheet(gymFromPc(), typed, NOW, opened.start)
    expect(made.created).toBeNull()
    expect(made.violations[0]?.message).toMatch(/before “Gym” started/)
  })

  test("the sheet's own counting start, beaten by the other device's, still becomes now", () => {
    const opened = { ...startingDraft(emptyDraft, at(DAY, "11:40")), description: "Stretching" }
    const made = createFromSheet(gymFromPc(), opened, NOW, opened.start)
    expect(made.created).toMatchObject({ start: NOW })
  })
})

describe("DONE", () => {
  test("nothing is a change until it differs, and setting it back is no change", () => {
    const draft = sheetDraftOf(entry(1, DAY, "09:00", "10:00", { description: "Email" }))
    expect(isDirty(draft, {})).toBe(false)
    expect(isDirty(draft, { description: "Email" })).toBe(false)
    expect(isDirty(draft, { description: "Emails" })).toBe(true)
    expect(changesBetween(draft, shownDraft(draft, { tagIds: [] }))).toEqual({})
  })

  test("writes only what was changed, onto the entry as it is then", () => {
    const state = baseState({ entries: [entry(1, DAY, "09:00", "10:00", { description: "Email", billable: false })] })
    // the other device renamed it while the sheet was open; this sheet only ticked billable
    const meanwhile = updateEntry(state, "1", { description: "Emails to Ana" }, NOW).state
    const saved = saveEdit(meanwhile, "1", { billable: true }, NOW)
    expect(saved.violations).toEqual([])
    expect(saved.state.entries[0]).toMatchObject({ description: "Emails to Ana", billable: true })
  })

  test("a start moved on a timer the other device stopped keeps it stopped", () => {
    const started = startTimer(baseState(), { ...emptyDraft, description: "Gym" }, at(DAY, "11:00"))
    const id = started.entry.id
    const stoppedElsewhere = stopTimer(started.state, at(DAY, "11:45")).state
    const saved = saveEdit(stoppedElsewhere, id, { start: at(DAY, "10:50") }, NOW)
    expect(saved.state.entries.find((e) => e.id === id)).toMatchObject({ start: at(DAY, "10:50"), stop: at(DAY, "11:45") })
  })

  test("an end given to a running timer is a stop, which waits for the check", () => {
    const started = startTimer(baseState(), emptyDraft, at(DAY, "11:00"))
    expect(saveStops(started.state, started.entry.id, { stop: NOW })).toBe(true)
    expect(saveStops(started.state, started.entry.id, { start: at(DAY, "10:00") })).toBe(false)
  })

  test("one moved edge takes a touching neighbour along, and says which", () => {
    const state = baseState({
      entries: [entry(1, DAY, "09:00", "10:00", { description: "Email" }), entry(2, DAY, "10:00", "11:00", { description: "Call" })],
    })
    const saved = saveEdit(state, "1", { stop: at(DAY, "10:15") }, NOW)
    expect(saved.moved.map((m) => m.description)).toEqual(["Call"])
    expect(saved.state.entries.find((e) => e.id === "2")?.start).toBe(at(DAY, "10:15"))
  })

  test("an entry deleted meanwhile is said, not written", () => {
    const saved = saveEdit(baseState(), "gone", { description: "x" }, NOW)
    expect(saved.violations[0].message).toMatch(/deleted/)
  })
})

test("the chip's date follows the date format, without the year", () => {
  expect(chipDate("2026-11-05", "YYYY-MM-DD")).toBe("11-05")
  expect(chipDate("2026-11-05", "DD.MM.YYYY")).toBe("05.11")
  expect(chipDate("2026-11-05", "MM/DD/YYYY")).toBe("11/05")
})
