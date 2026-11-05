/**
 * ONE RULE FOR A TYPED START, WHEREVER IT IS TYPED (D-PC-LIST in
 * Plans/toggl-parity.md, Phase 5 item 4).
 *
 * A typed start keeps the end and changes the length; a running timer goes on
 * from it; a start typed after the end moves the entry and keeps its length.
 * The row, the sheet's boxes, the sheet's boxes while the drums hold an unsaved
 * pair, and the PC's running-time box must all land the same start the same
 * way, so the rule lives in the services and every screen calls it.
 */

import { describe, expect, test } from "vitest"

import { typedIntoPair } from "@/src/timetrack/drumService"
import { typeStart } from "@/src/timetrack/timeFixService"
import { parseStartTimeInput } from "@/src/timetrack/timetrackFormatService"
import { setEntryStart, startTimer } from "@/src/timetrack/timetrackService"
import { startTypedInto } from "@/src/timetrack/typedStartService"

import { baseState, entry } from "./helpers"

const at = (day: string, hm: string) => {
  const [h, m] = hm.split(":").map(Number)
  const [y, mo, d] = day.split("-").map(Number)
  return new Date(y, mo - 1, d, h, m, 0, 0).toISOString()
}
const NOW = at("2026-11-05", "18:00")

describe("a typed start", () => {
  test("keeps the end and changes the length", () => {
    const landed = startTypedInto({ start: at("2026-11-05", "17:00"), stop: at("2026-11-05", "18:10") }, at("2026-11-05", "16:30"))
    expect(landed).toEqual({ start: at("2026-11-05", "16:30"), stop: at("2026-11-05", "18:10") })
  })

  test("on a running timer keeps it running from the new start", () => {
    expect(startTypedInto({ start: at("2026-11-05", "17:00"), stop: null }, at("2026-11-05", "15:30"))).toEqual({
      start: at("2026-11-05", "15:30"),
      stop: null,
    })
  })

  test("after the end moves the entry and keeps its length, so the order you type in does not matter", () => {
    const landed = startTypedInto({ start: at("2026-11-05", "08:20"), stop: at("2026-11-05", "08:50") }, at("2026-11-05", "08:57"))
    expect(landed).toEqual({ start: at("2026-11-05", "08:57"), stop: at("2026-11-05", "09:27") })
  })

  test("lands the same in a row (setEntryStart) and in the sheet while the drums hold a pair (typedIntoPair)", () => {
    const cases: [string, string, string][] = [
      ["17:00", "18:10", "16:30"], // before the end
      ["08:20", "08:50", "08:57"], // after the end: the plan's "a row moves the entry"
      ["15:47", "17:00", "22:00"], // the edits audit's case
      ["09:00", "09:00", "09:30"], // a zero-length entry
    ]
    for (const [from, to, typed] of cases) {
      const saved = entry(1, "2026-11-05", from, to)
      const state = baseState({ entries: [saved] })
      const iso = parseStartTimeInput(typed, saved.start, saved.stop!)!
      const row = setEntryStart(state, "1", iso, NOW).state.entries[0]
      const drums = typedIntoPair({ start: saved.start, stop: saved.stop }, "start", typed, NOW)!
      expect({ start: drums.start, stop: drums.stop }, `${from}–${to}, typed ${typed}`).toEqual({ start: row.start, stop: row.stop })
    }
  })

  test("through typeStart, which every screen calls, a touching neighbour's end follows", () => {
    const before = entry(1, "2026-11-05", "08:00", "09:00", { description: "email" })
    const edited = entry(2, "2026-11-05", "09:00", "10:00", { description: "deep work" })
    const result = typeStart(baseState({ entries: [before, edited] }), "2", at("2026-11-05", "08:45"), NOW)
    expect(result.violations).toEqual([])
    const byId = Object.fromEntries(result.state.entries.map((e) => [e.id, e]))
    expect(byId["2"]).toMatchObject({ start: at("2026-11-05", "08:45"), stop: at("2026-11-05", "10:00") })
    expect(byId["1"].stop).toBe(at("2026-11-05", "08:45"))
    expect(result.moved.map((m) => m.entryId)).toEqual(["1"])
  })

  test("through typeStart on a running timer: it keeps running, started then", () => {
    const running = startTimer(baseState(), { description: "call", projectId: null, taskId: null, tagIds: [], billable: false }, at("2026-11-05", "17:30")).state
    const id = running.entries[0].id
    const result = typeStart(running, id, at("2026-11-05", "16:30"), NOW)
    expect(result.violations).toEqual([])
    expect(result.state.entries[0]).toMatchObject({ start: at("2026-11-05", "16:30"), stop: null })
  })

  test("through typeStart, a running timer cannot start after now", () => {
    const running = startTimer(baseState(), { description: "call", projectId: null, taskId: null, tagIds: [], billable: false }, at("2026-11-05", "17:30")).state
    const result = typeStart(running, running.entries[0].id, at("2026-11-05", "19:00"), NOW)
    expect(result.violations.length).toBeGreaterThan(0)
  })
})
