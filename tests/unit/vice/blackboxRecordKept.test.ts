/**
 * WHAT THE BLACK BOX KEEPS OF SOMEBODY'S RECORD, asserted on the record a
 * person ends with: a file that must bounce off (never brick the page), old
 * rows read back whole, a run that cannot overlap or end before it began, and a
 * removal that takes only what belongs to it.
 */
import { describe, expect, it } from "vitest"
import {
  BLACKBOX_KEY,
  emptyRecord,
  fileReport,
  holdsNothingWritten,
  importRecord,
  isCalendarDay,
  latestReportDay,
  loadRecord,
  parseRecord,
  recordPastRun,
  removeAttempt,
  removeReport,
  revivalClashes,
  saveRecord,
  startAttempt,
} from "@/src/vice/blackbox/blackboxStore"

const TODAY = "2026-11-19"
const attempt = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  viceId: "smoking",
  label: "Cigarettes",
  startedOn: "2026-08-01",
  startedBy: "x",
  structure: ["Told my brother"],
  endedOn: null,
  endedByReportId: null,
  updatedAt: "2026-08-01T12:00:00.000Z",
  deletedAt: null,
  ...extra,
})
const report = (id: string, attemptId: string, extra: Record<string, unknown> = {}) => ({
  id,
  attemptId,
  at: "2026-09-01T12:00:00",
  wentThrough: false,
  thought: "t",
  ending: "fine",
  closeness: null,
  withWhom: "",
  where: "",
  factors: [],
  didInstead: "",
  updatedAt: "2026-09-01T12:00:00.000Z",
  deletedAt: null,
  ...extra,
})
const file = (attempts: unknown[], reports: unknown[]) => JSON.stringify({ version: 1, attempts, reports })
const past = (record: ReturnType<typeof emptyRecord>, startedOn: string, endedOn: string, viceId = "smoking") =>
  recordPastRun(record, { viceId, label: "Cigarettes", startedOn, endedOn, startedBy: "x", structure: [], ending: "fine", thought: "" })

describe("a record file", () => {
  it("is taken whole when every row is sound, and bounces off when any row is not", () => {
    const good = file([attempt("a1", { endedOn: "2026-09-01", endedByReportId: "r1" })], [report("r1", "a1", { wentThrough: true })])
    expect(importRecord(good, TODAY)).toMatchObject({ version: 1, attempts: [{ id: "a1" }], reports: [{ id: "r1" }] })

    const bad: [string, string][] = [
      ["not json", "{{{"],
      ["not an object", "null"],
      ["no reports list", JSON.stringify({ attempts: [] })],
      ["no runs list", JSON.stringify({ reports: [] })],
      ["a run with no id", file([attempt("")], [])],
      ["a run with a non-text id", file([attempt(5 as never)], [])],
      ["a run that is not an object", file(["x"], [])],
      ["a run started on a day that does not exist", file([attempt("a1", { startedOn: "2026-02-31" })], [])],
      ["a run started on a half-typed day", file([attempt("a1", { startedOn: "2026-8-1" })], [])],
      ["a run that ended on no day", file([attempt("a1", { endedOn: "soon" })], [])],
      ["a run that ended before it began", file([attempt("a1", { endedOn: "2026-07-31" })], [])],
      ["a run with a structure that is not a list of text", file([attempt("a1", { structure: [1] })], [])],
      ["a run with no structure", file([attempt("a1", { structure: "x" })], [])],
      ["a run with no label", file([attempt("a1", { label: 1 })], [])],
      ["a run with no vice", file([attempt("a1", { viceId: undefined })], [])],
      ["a run in the future", file([attempt("a1", { startedOn: "2026-11-20" })], [])],
      ["a run that ends in the future", file([attempt("a1", { endedOn: "2026-11-20" })], [])],
      ["a report that is not an object", file([attempt("a1")], ["x"])],
      ["a report with no id", file([attempt("a1")], [report("", "a1")])],
      ["a report with no run", file([attempt("a1")], [report("r1", 5 as never)])],
      ["a report of a run the file does not carry", file([attempt("a1")], [report("r1", "gone")])],
      ["a report with a day that does not exist", file([attempt("a1")], [report("r1", "a1", { at: "2026-13-01T10:00:00" })])],
      ["a report with no time", file([attempt("a1")], [report("r1", "a1", { at: 5 })])],
      ["a report that is not yes or no", file([attempt("a1")], [report("r1", "a1", { wentThrough: "yes" })])],
      ["a report with factors that are not text", file([attempt("a1")], [report("r1", "a1", { factors: [1] })])],
      ["a report with no factors", file([attempt("a1")], [report("r1", "a1", { factors: "x" })])],
      ["a report with an ending the app does not know", file([attempt("a1")], [report("r1", "a1", { ending: "made-up" })])],
      ["a report with no ending", file([attempt("a1")], [report("r1", "a1", { ending: 3 })])],
      ["a report with no thought", file([attempt("a1")], [report("r1", "a1", { thought: 3 })])],
      ["a run ended by a report the file does not carry", file([attempt("a1", { endedOn: "2026-09-01", endedByReportId: "ghost" })], [])],
    ]
    for (const [why, raw] of bad) expect(importRecord(raw, TODAY), why).toBeNull()

    expect(importRecord(file([attempt("a1", { startedOn: TODAY, endedOn: TODAY })], []), TODAY)).not.toBeNull()
  })
})

describe("what is kept in this browser", () => {
  it("storage keeps rows whole and days real", () => {
    { // old rows are read back whole: a stamp from their own moment, never a claim that everything changed now; unreadable storage reads as empty
      const old = JSON.stringify({
        version: 1,
        attempts: [{ ...attempt("a1"), updatedAt: undefined, deletedAt: undefined }, { ...attempt("a2", { updatedAt: "" }), startedOn: "bad" }],
        reports: [{ ...report("r1", "a1"), updatedAt: undefined, deletedAt: undefined }, report("r2", "a1", { deletedAt: undefined })],
      })
      const read = parseRecord(old)
      expect(read.attempts[0]).toMatchObject({ updatedAt: "2026-08-01T12:00:00.000Z", deletedAt: null })
      expect(read.attempts[1].updatedAt).toBe(new Date(0).toISOString())
      expect(read.reports[0]).toMatchObject({ updatedAt: "2026-09-01T12:00:00.000Z", deletedAt: null })
      expect(read.reports[1]).toMatchObject({ updatedAt: "2026-09-01T12:00:00.000Z", deletedAt: null })
      expect(parseRecord(JSON.stringify({ version: 1, attempts: "x", reports: null }))).toEqual(emptyRecord())

      const kept = parseRecord(JSON.stringify({ version: 1, attempts: [attempt("a1", { deletedAt: "2026-10-01T00:00:00.000Z" })], reports: [] }))
      expect(kept.attempts[0].deletedAt).toBe("2026-10-01T00:00:00.000Z")
      expect(kept.attempts[0].updatedAt).toBe("2026-08-01T12:00:00.000Z")
    }
    { // saves and loads through storage, does nothing without it, and a full or blocked storage never breaks the screen
      const m = new Map<string, string>()
      const storage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage
      const record = startAttempt(emptyRecord(), { viceId: "smoking", label: "C", startedOn: "2026-08-01", startedBy: "x", structure: [], acknowledgedRisk: false, today: TODAY })
      saveRecord(storage, record)
      expect(m.has(BLACKBOX_KEY)).toBe(true)
      expect(loadRecord(storage)).toEqual(record)
      expect(loadRecord(null)).toEqual(emptyRecord())
      expect(() => saveRecord(null, record)).not.toThrow()
      const blocked = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("full") } } as unknown as Storage
      expect(() => saveRecord(blocked, record)).not.toThrow()
      expect(loadRecord(blocked)).toEqual(emptyRecord())
    }
    { // a day must exist on the calendar
      expect(isCalendarDay("2026-02-28")).toBe(true)
      expect(isCalendarDay("2028-02-29")).toBe(true)
      for (const bad of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-01-00", "2026-1-01", "2026-01-011", "x2026-01-01", ""]) {
        expect(isCalendarDay(bad), bad).toBe(false)
      }
    }
  })


})

describe("runs on the record", () => {
  it("runs never overlap, reports are filed on real days, removals take only what belongs", () => {
    { // runs: remembered runs never overlap, reports are filed on real days, and what is the last day
      { // a remembered run may end the day it began, never before; days of one vice are never counted twice, touching days included
        const base = past(emptyRecord(), "2026-03-10", "2026-03-20")
        expect(base.attempts).toHaveLength(1)
        expect(past(emptyRecord(), "2026-03-10", "2026-03-10").attempts).toHaveLength(1)
        expect(past(emptyRecord(), "2026-03-10", "2026-03-09").attempts).toHaveLength(0)
        expect(past(emptyRecord(), "2026-03-10", "2026-02-31").attempts).toHaveLength(0)

        expect(past(base, "2026-03-20", "2026-03-25")).toBe(base)
        expect(past(base, "2026-03-05", "2026-03-10")).toBe(base)
        expect(past(base, "2026-03-12", "2026-03-14")).toBe(base)
        expect(past(base, "2026-03-21", "2026-03-25").attempts).toHaveLength(2)
        expect(past(base, "2026-03-01", "2026-03-09").attempts).toHaveLength(2)
        expect(past(base, "2026-03-12", "2026-03-14", "porn").attempts).toHaveLength(2)

        const live = startAttempt(emptyRecord(), { viceId: "smoking", label: "C", startedOn: "2026-05-01", startedBy: "x", structure: [], acknowledgedRisk: false, today: TODAY })
        expect(past(live, "2026-06-01", "2026-06-10")).toBe(live)
        expect(past(live, "2026-04-01", "2026-05-01")).toBe(live)
        expect(past(live, "2026-04-01", "2026-04-30").attempts).toHaveLength(2)
      }
      { // the last day on a run is its latest report, or its start when it has none
        const r1 = { ...emptyRecord(), attempts: [attempt("a1"), attempt("a2", { startedOn: "2026-10-01" })], reports: [report("r1", "a1", { at: "2026-09-10T08:00:00" }), report("r2", "a1", { at: "2026-09-05T08:00:00" }), report("r3", "a2", { at: "2026-11-01T08:00:00" })] }
        expect(latestReportDay(r1 as never, "a1")).toBe("2026-09-10")
        expect(latestReportDay(r1 as never, "a2")).toBe("2026-11-01")
        expect(latestReportDay({ ...r1, reports: [] } as never, "a2")).toBe("2026-10-01")
        expect(latestReportDay(r1 as never, "nope")).toBe("")
      }
      { // an ending is filed on a day no earlier than the run's start or its last report, same day allowed
        const input = (at: string, wentThrough: boolean) => ({ attemptId: "a1", at, wentThrough, thought: "", ending: "fine" as const, closeness: null, withWhom: "", where: "", factors: [], didInstead: "" })
        const rec = { ...emptyRecord(), attempts: [attempt("a1")], reports: [report("r1", "a1", { at: "2026-09-10T08:00:00" })] } as never
        expect(fileReport(rec, input("2026-09-09T08:00:00", true))).toBe(rec)
        expect(fileReport(rec, input("2026-07-31T08:00:00", false))).toBe(rec)
        expect(fileReport(rec, input("2026-09-10T20:00:00", true)).attempts[0].endedOn).toBe("2026-09-10")
        expect(fileReport(rec, input("2026-09-09T08:00:00", false)).reports).toHaveLength(2)
        expect(fileReport(rec, { ...input("2026-09-12T08:00:00", true), attemptId: "ghost" })).toBe(rec)
        expect(fileReport(rec, input("2026-9-12T08:00:00", true))).toBe(rec)
      }
    }
    { // removals take only what belongs, and an emptied record holds nothing
      { // removing the report that ended a run brings the run back, unless another run of that vice covers its days; removing a run takes its reports and nobody else's
        const ended = attempt("a1", { endedOn: "2026-09-01", endedByReportId: "r1" })
        const rec = { ...emptyRecord(), attempts: [ended], reports: [report("r1", "a1", { wentThrough: true }), report("r2", "a1")] } as never
        const revived = removeReport(rec, "r1")
        expect(revived.attempts[0]).toMatchObject({ endedOn: null, endedByReportId: null })
        expect(revived.reports.map((r) => r.deletedAt !== null)).toEqual([true, false])
        expect(removeReport(rec, "ghost")).toBe(rec)
        expect(removeReport(revived, "r1")).toBe(revived)

        const sameDay = { ...rec, attempts: [ended, attempt("a2", { startedOn: "2026-08-01", endedOn: "2026-08-01", viceId: "smoking" })] } as never
        expect(revivalClashes(sameDay, "r1")).toBe(true)
        const before = { ...rec, attempts: [ended, attempt("a2", { startedOn: "2026-01-01", endedOn: "2026-07-31" })] } as never
        expect(revivalClashes(before, "r1")).toBe(false)
        const otherVice = { ...rec, attempts: [ended, attempt("a2", { viceId: "porn" })] } as never
        expect(revivalClashes(otherVice, "r1")).toBe(false)
        const alive = { ...rec, attempts: [ended, attempt("a2", { startedOn: "2026-09-02" })] } as never
        expect(revivalClashes(alive, "r1")).toBe(true)
        expect(removeReport(alive, "r1")).toBe(alive)
        expect(revivalClashes(rec, "r2")).toBe(false)

        const two = { ...emptyRecord(), attempts: [attempt("a1"), attempt("a2", { viceId: "porn" })], reports: [report("r1", "a1"), report("r2", "a2"), report("r3", "a1", { deletedAt: "2026-09-02T00:00:00.000Z" })] } as never
        const gone = removeAttempt(two, "a1")
        expect(gone.attempts.map((a) => a.deletedAt !== null)).toEqual([true, false])
        expect(gone.reports.map((r) => r.deletedAt !== null)).toEqual([true, false, true])
        expect(gone.reports[2].deletedAt).toBe("2026-09-02T00:00:00.000Z")
        expect(removeAttempt(two, "ghost")).toBe(two)
        expect(removeAttempt(gone, "a1")).toBe(gone)
      }
      { // holds nothing written when everything is deleted
        const rec = { ...emptyRecord(), attempts: [attempt("a1")], reports: [] } as never
        expect(holdsNothingWritten(emptyRecord())).toBe(true)
        expect(holdsNothingWritten(rec)).toBe(false)
        expect(holdsNothingWritten(removeAttempt(rec, "a1"))).toBe(true)
        expect(holdsNothingWritten({ ...emptyRecord(), reports: [report("r1", "a1")] } as never)).toBe(false)
      }
    }
  })




})
