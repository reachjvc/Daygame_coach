/**
 * THE REVIEW — buildReview in src/audit/auditService.ts (Plans/energy-audit.md, Phase 6).
 * Written before the function.
 */
import { describe, expect, it } from "vitest"
import { buildReview } from "@/src/audit/auditService"
import type { AuditRun, AuditSlot, ScaleValue } from "@/src/audit/types"

const CPH = "Europe/Copenhagen"
const Q = 900_000

// 07:00 UTC on 9 Nov is 08:00 in Copenhagen; quiet 22:00–08:00 (default).
const START = Date.parse("2026-11-09T07:00:00Z")

function run(over: Partial<AuditRun> = {}): AuditRun {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    startedAt: new Date(START).toISOString(),
    endsAt: new Date(START + 14 * 86400_000).toISOString(),
    // ended after one awake day: 08:00–22:00 = 56 quarters
    endedAt: new Date(START + 14 * 3600_000).toISOString(),
    quietStart: 1320,
    quietEnd: 480,
    mutedUntil: null,
    review: { choices: {}, notes: {} },
    endSentAt: null,
    ...over,
  }
}

let n = 0
function slot(quarter: number, activity: string, energy: number, growth: number, over: Partial<AuditSlot> = {}): AuditSlot {
  return {
    id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
    runId: run().id,
    slotAt: new Date(START + quarter * Q).toISOString(),
    activity,
    energy: energy as ScaleValue,
    growth: growth as ScaleValue,
    avoiding: false,
    why: null,
    source: "app",
    timeEntryId: null,
    ...over,
  }
}

describe("buildReview", () => {
  it("says what it is based on: answered of possible quarters, and hours", () => {
    const r = buildReview([slot(0, "Email", 2, 3), slot(1, "Email", 3, 3)], run(), CPH)
    expect(r.possibleQuarters).toBe(56)
    expect(r.answered).toBe(2)
    expect(r.hours).toBe(0.5)
    expect(r.possibleHours).toBe(14)
  })

  it("groups by wording with case, spaces and punctuation folded, and labels with the most used spelling", () => {
    const r = buildReview([slot(0, "Email", 2, 3), slot(1, "email.", 4, 3), slot(2, "  EMAIL ", 3, 5), slot(3, "Email", 3, 3)], run(), CPH)
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0]).toMatchObject({ key: "email", label: "Email", answers: 4, minutes: 60, energy: 3, growth: 3.5 })
  })

  it("puts each activity in its box: above 4 is high, exactly 4 is low", () => {
    const r = buildReview(
      [slot(0, "Daygame", 5, 7), slot(1, "Gym", 3, 6), slot(2, "Scrolling", 2, 1), slot(3, "Series", 6, 2), slot(4, "Admin", 4, 4)],
      run(),
      CPH,
    )
    const box = Object.fromEntries(r.groups.map((g) => [g.label, g.box]))
    expect(box).toEqual({ Daygame: "more", Gym: "costs", Scrolling: "cut", Series: "fun", Admin: "cut" })
  })

  it("gives each box's share of the answered time in whole percent that sum to 100", () => {
    const r = buildReview([slot(0, "A", 5, 5), slot(1, "B", 1, 1), slot(2, "C", 6, 1)], run(), CPH)
    expect(r.shares).toEqual({ more: 34, costs: 0, cut: 33, fun: 33 })
    expect(Object.values(r.shares).reduce((a, b) => a + b, 0)).toBe(100)
  })

  it("lists each activity's whys newest first, with their quarter", () => {
    const r = buildReview([slot(0, "Gym", 3, 6, { why: "tired" }), slot(4, "Gym", 4, 6, { why: "better" }), slot(5, "Gym", 4, 6)], run(), CPH)
    expect(r.groups[0].whys.map((w) => w.text)).toEqual(["better", "tired"])
    expect(r.groups[0].whys[0].slotAt).toBe(new Date(START + 4 * Q).toISOString())
  })

  it("sorts activities by how often they were answered, most first", () => {
    const r = buildReview([slot(0, "Rare", 4, 4), slot(1, "Often", 4, 4), slot(2, "Often", 4, 4)], run(), CPH)
    expect(r.groups.map((g) => g.label)).toEqual(["Often", "Rare"])
  })

  it("averages energy for each local hour, only hours with at least 4 answers", () => {
    const slots = [0, 1, 2, 3].map((q) => slot(q, "Work", q + 2, 4)).concat([slot(4, "Work", 7, 4)])
    const r = buildReview(slots, run(), CPH)
    expect(r.bestHours).toEqual([{ hour: 8, energy: 3.5, answers: 4 }])
  })

  it("does not count answers after the end", () => {
    // quarter 60 is after End now.
    const r = buildReview([slot(60, "After", 4, 4), slot(0, "Email", 4, 4)], run(), CPH)
    expect(r.answered).toBe(1)
    expect(r.groups.map((g) => g.label)).toEqual(["Email"])
  })

  it("keeps an answer whose quarter became quiet when quiet hours were changed later", () => {
    // Answered at 21:45 local, then quiet hours moved to start at 21:00.
    const r = buildReview([slot(55, "Reading", 5, 6), slot(0, "Email", 4, 4)], run({ quietStart: 1260 }), CPH)
    expect(r.answered).toBe(2)
    expect(r.possibleQuarters).toBe(53) // 08:00–21:00 is 52 awake, plus the answered 21:45
    expect(r.groups.map((g) => g.label).sort()).toEqual(["Email", "Reading"])
  })

  it("does not count the quarter still running at End now unless it was answered", () => {
    const ended = run({ endedAt: new Date(START + 2 * Q + 7 * 60_000).toISOString() })
    expect(buildReview([slot(0, "Email", 4, 4), slot(1, "Email", 4, 4)], ended, CPH)).toMatchObject({ answered: 2, possibleQuarters: 2 })
  })

  it("keeps the quarter a run was ended in", () => {
    const r = buildReview([slot(2, "Email", 4, 4)], run({ endedAt: new Date(START + 2 * Q + 7 * 60_000).toISOString() }), CPH)
    expect(r.possibleQuarters).toBe(3)
    expect(r.answered).toBe(1)
  })

  it("is an empty review that says so when nothing was answered", () => {
    const r = buildReview([], run(), CPH)
    expect(r).toMatchObject({ answered: 0, hours: 0, groups: [], bestHours: [], shares: { more: 0, costs: 0, cut: 0, fun: 0 } })
  })

  it("takes 1,400 answers without a cap", () => {
    const long = run({ endedAt: null })
    const slots: AuditSlot[] = []
    for (let d = 0; d < 14; d++) for (let q = 0; q < 100; q++) slots.push(slot(d * 96 + (q % 56), `A${q % 7}`, 4, 5, { slotAt: new Date(START + (d * 96 + (q % 56)) * Q).toISOString() }))
    const unique = [...new Map(slots.map((s) => [s.slotAt, s])).values()]
    const r = buildReview(unique, long, CPH)
    expect(r.answered).toBe(unique.length)
    expect(r.possibleQuarters).toBe(14 * 56)
  })
})
