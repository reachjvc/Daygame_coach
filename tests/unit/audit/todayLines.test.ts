/**
 * THE TODAY SCREEN'S LINES — alpha F22 (fast-audit-10), F23 (picky-eye-12),
 * F26 (picky-eye-20): the day count, the next ping, and what an answer lacks.
 */
import { describe, expect, it } from "vitest"
import { missingAnswerLine } from "@/src/audit/auditService"
import { clockLabel, nextPingAt, runDayOf } from "@/src/audit/quarterService"
import type { AuditRun } from "@/src/audit/types"

const CPH = "Europe/Copenhagen"
const at = (iso: string) => Date.parse(iso)

function run(over: Partial<AuditRun> = {}): AuditRun {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    // 21:00 Copenhagen on Mon 9 Nov; ends 21:00 on Mon 23 Nov
    startedAt: "2026-11-09T20:00:00.000Z",
    endsAt: "2026-11-23T20:00:00.000Z",
    endedAt: null,
    quietStart: 1320,
    quietEnd: 480,
    mutedUntil: null,
    review: { choices: {}, notes: {}, week: [] },
    endSentAt: null,
    ...over,
  }
}

describe("runDayOf: calendar days, the start day is Day 1 (F22)", () => {
  it("started at 21:00, the next morning is Day 2", () => {
    expect(runDayOf(run(), at("2026-11-10T08:00:00Z"), CPH).day).toBe(2)
  })
  it("the evening it starts is Day 1", () => {
    expect(runDayOf(run(), at("2026-11-09T20:30:00Z"), CPH).day).toBe(1)
  })
  it("is out of the run's 14 days even when it touches 15 calendar days; the last morning stays Day 14", () => {
    const r = run()
    expect(runDayOf(r, at("2026-11-10T08:00:00Z"), CPH).of).toBe(14)
    expect(runDayOf(r, at("2026-11-23T19:00:00Z"), CPH)).toEqual({ day: 14, of: 14 })
  })
  it("started at local midnight, it is 14 days and ends as Day 14 closes", () => {
    const r = run({ startedAt: "2026-11-08T23:00:00.000Z", endsAt: "2026-11-22T23:00:00.000Z" })
    expect(runDayOf(r, at("2026-11-08T23:30:00Z"), CPH)).toEqual({ day: 1, of: 14 })
    expect(runDayOf(r, at("2026-11-22T22:59:00Z"), CPH)).toEqual({ day: 14, of: 14 })
  })
})

describe("nextPingAt: when the next ping goes out (F23)", () => {
  it("the end of the quarter running now", () => {
    const r = run({ startedAt: "2026-11-10T10:05:00.000Z" })
    expect(clockLabel(nextPingAt(r, at("2026-11-10T10:07:00Z"), CPH)!, CPH)).toBe("11:15")
  })
  it("skips quiet hours: started at 21:00 with quiet from 22:00, the first is 21:15 then 08:15", () => {
    const r = run()
    expect(clockLabel(nextPingAt(r, at("2026-11-09T20:00:00Z"), CPH)!, CPH)).toBe("21:15")
    expect(clockLabel(nextPingAt(r, at("2026-11-09T21:01:00Z"), CPH)!, CPH)).toBe("08:15")
  })
  it("waits for a mute to end", () => {
    const r = run({ startedAt: "2026-11-10T08:00:00.000Z", mutedUntil: "2026-11-10T14:30:00.000Z" })
    expect(clockLabel(nextPingAt(r, at("2026-11-10T13:20:00Z"), CPH)!, CPH)).toBe("15:30")
    expect(clockLabel(nextPingAt(r, at("2026-11-10T13:20:00Z"), CPH, { ignoreMute: true })!, CPH)).toBe("14:30")
  })
  it("none after the run stops", () => {
    expect(nextPingAt(run(), at("2026-11-23T19:50:00Z"), CPH)).toBeNull()
  })
})

describe("missingAnswerLine: names what is missing (F26)", () => {
  it("both scores", () => {
    expect(missingAnswerLine({ activity: "Email", energy: null, growth: null })).toBe("Pick Energy and Growth.")
  })
  it("one score", () => {
    expect(missingAnswerLine({ activity: "Email", energy: 3, growth: null })).toBe("Pick Growth.")
  })
  it("only what you did", () => {
    expect(missingAnswerLine({ activity: "  ", energy: 3, growth: 4 })).toBe("Write what you did.")
  })
  it("what you did and a score", () => {
    expect(missingAnswerLine({ activity: "", energy: null, growth: 4 })).toBe("Write what you did and pick Energy.")
  })
  it("nothing missing", () => {
    expect(missingAnswerLine({ activity: "Email", energy: 3, growth: 4 })).toBeNull()
  })
})
