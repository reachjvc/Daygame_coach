import { describe, expect, it } from "vitest"
import { emptyRecord, fileReport, living, startAttempt } from "@/src/vice/blackbox/blackboxStore"
import { amendReport, removeRunIfEmpty } from "@/src/quit/blackboxLogic"
import type { BlackBoxRecord } from "@/src/vice/types"

const TODAY = "2026-11-19"

function run(record: BlackBoxRecord, startedOn: string): BlackBoxRecord {
  return startAttempt(record, { viceId: "nicotine", label: "Smoking or vaping", startedOn, startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY })
}
function report(record: BlackBoxRecord, at: string, wentThrough: boolean, extra: Partial<{ thought: string; where: string }> = {}): BlackBoxRecord {
  const attempt = living(record.attempts).find((a) => a.endedOn === null)!
  return fileReport(record, { attemptId: attempt.id, at, wentThrough, thought: extra.thought ?? "", ending: "other", closeness: null, withWhom: "", where: extra.where ?? "", factors: [], didInstead: "" })
}

describe("amendReport", () => {
  const filed = report(run(emptyRecord(), "2026-11-01"), "2026-11-10T12:00:00", true)
  const id = filed.reports[0].id

  it("changes thought and ending, keeps everything else", () => {
    const next = amendReport(filed, id, { thought: "Just one won't hurt", ending: "justone" })
    const r = next.reports[0]
    expect(r).toMatchObject({ thought: "Just one won't hurt", ending: "justone", where: "", wentThrough: true, at: "2026-11-10T12:00:00" })
    expect(r.updatedAt > filed.reports[0].updatedAt).toBe(true)
    // the run stays ended on the slip day
    expect(next.attempts[0]).toMatchObject({ endedOn: "2026-11-10", endedByReportId: id })
  })
  it("still changes strength and place", () => {
    const next = amendReport(filed, id, { closeness: 6, where: "driving" })
    expect(next.reports[0]).toMatchObject({ closeness: 6, where: "driving" })
  })
  it("leaves a field alone when the patch does not name it", () => {
    const a = amendReport(filed, id, { where: "coffee" })
    const b = amendReport(a, id, { thought: "x" })
    expect(b.reports[0]).toMatchObject({ where: "coffee", thought: "x" })
  })
  it("returns the same record for an unknown or removed report", () => {
    expect(amendReport(filed, "nope", { thought: "x" })).toBe(filed)
    const gone = { ...filed, reports: filed.reports.map((r) => ({ ...r, deletedAt: "2026-11-11T00:00:00.000Z" })) }
    expect(amendReport(gone, id, { thought: "x" })).toBe(gone)
  })
})

describe("removeRunIfEmpty", () => {
  it("removes a living run with no reports", () => {
    const rec = run(emptyRecord(), TODAY)
    const id = rec.attempts[0].id
    const next = removeRunIfEmpty(rec, id)
    expect(living(next.attempts)).toHaveLength(0)
  })
  it("refuses a run with a living report against it", () => {
    const rec = report(run(emptyRecord(), "2026-11-01"), "2026-11-05T12:00:00", false)
    expect(removeRunIfEmpty(rec, rec.attempts[0].id)).toBe(rec)
  })
  it("removes a run whose only report was taken out", () => {
    const rec = report(run(emptyRecord(), "2026-11-01"), "2026-11-05T12:00:00", false)
    const buried = { ...rec, reports: rec.reports.map((r) => ({ ...r, deletedAt: "2026-11-06T00:00:00.000Z" })) }
    expect(living(removeRunIfEmpty(buried, buried.attempts[0].id).attempts)).toHaveLength(0)
  })
  it("refuses an ended run, an unknown run and a removed run", () => {
    const ended = report(run(emptyRecord(), "2026-11-01"), "2026-11-05T12:00:00", true)
    expect(removeRunIfEmpty(ended, ended.attempts[0].id)).toBe(ended)
    expect(removeRunIfEmpty(ended, "nope")).toBe(ended)
    const rec = run(emptyRecord(), TODAY)
    const gone = removeRunIfEmpty(rec, rec.attempts[0].id)
    expect(removeRunIfEmpty(gone, rec.attempts[0].id)).toBe(gone)
  })
  it("leaves the run it was not asked about, so a slipped run stays", () => {
    const first = report(run(emptyRecord(), "2026-11-01"), "2026-11-05T12:00:00", true)
    const both = run(first, TODAY)
    const fresh = both.attempts[1].id
    const next = removeRunIfEmpty(both, fresh)
    expect(living(next.attempts).map((a) => a.id)).toEqual([first.attempts[0].id])
  })
})
