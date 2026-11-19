import { describe, expect, it } from "vitest"
import { createQuitStore } from "@/src/quit/store"
import {
  addDays,
  addSlip,
  cleanDays,
  currentRun,
  emptyRecord,
  loadRecord,
  parseRecord,
  saveRecord,
  setQuitDate,
  undoSlip,
} from "@/src/quit/record"

const T = "2026-11-19"

describe("shared quit record", () => {
  it("opens a run on the quit date and counts whole clean days", () => {
    const r = setQuitDate(emptyRecord(), "2026-11-09", T)
    expect(r.quitDate).toBe("2026-11-09")
    expect(r.runs).toEqual([{ start: "2026-11-09", end: null, endedBy: null }])
    expect(cleanDays(r, T)).toBe(10)
    expect(cleanDays(r, "2026-11-09")).toBe(0)
    expect(cleanDays(r, "2026-11-01")).toBe(0)
  })

  it("a slip ends the run and starts a new one the next day; clean runs add up", () => {
    let r = setQuitDate(emptyRecord(), "2026-11-01", T)
    r = addSlip(r, "2026-11-11", T)
    expect(r.runs).toEqual([
      { start: "2026-11-01", end: "2026-11-11", endedBy: "slip" },
      { start: "2026-11-12", end: null, endedBy: null },
    ])
    expect(cleanDays(r, T)).toBe(10 + 7)
    expect(currentRun(r)?.start).toBe("2026-11-12")
  })

  it("a slip today leaves a run starting tomorrow that counts 0", () => {
    let r = setQuitDate(emptyRecord(), "2026-11-10", T)
    r = addSlip(r, T, T)
    expect(cleanDays(r, T)).toBe(9)
    expect(currentRun(r)?.start).toBe("2026-11-20")
  })

  it("a back-dated slip splits a closed run and keeps how it ended", () => {
    let r = setQuitDate(emptyRecord(), "2026-11-01", T)
    r = addSlip(r, "2026-11-15", T)
    r = addSlip(r, "2026-11-05", T)
    expect(r.runs.map((x) => [x.start, x.end, x.endedBy])).toEqual([
      ["2026-11-01", "2026-11-05", "slip"],
      ["2026-11-06", "2026-11-15", "slip"],
      ["2026-11-16", null, null],
    ])
  })

  it("ignores same-day duplicates, future days and bad dates", () => {
    let r = setQuitDate(emptyRecord(), "2026-11-01", T)
    r = addSlip(r, "2026-11-05", T)
    expect(addSlip(r, "2026-11-05", T)).toBe(r)
    expect(addSlip(r, "2026-11-25", T)).toBe(r)
    expect(addSlip(r, "nonsense", T)).toBe(r)
  })

  it("consecutive slips do not open a run on a slip day", () => {
    let r = setQuitDate(emptyRecord(), "2026-11-01", T)
    r = addSlip(r, "2026-11-06", T)
    r = addSlip(r, "2026-11-05", T)
    const open = currentRun(r)
    expect(open?.start).toBe("2026-11-07")
    expect(r.runs.some((x) => x.start === "2026-11-06")).toBe(false)
  })

  it("undo by id joins the runs again", () => {
    const base = setQuitDate(emptyRecord(), "2026-11-01", T)
    let r = addSlip(base, "2026-11-11", T)
    r = undoSlip(r, r.slips[0].id)
    expect(r.slips).toEqual([])
    expect(r.runs).toEqual(base.runs)
    expect(cleanDays(r, T)).toBe(18)
    expect(undoSlip(r, "nope")).toBe(r)
  })

  it("undo of a back-dated slip restores how the later run ended", () => {
    let r = setQuitDate(emptyRecord(), "2026-11-01", T)
    r = addSlip(r, "2026-11-15", T)
    const after = r
    r = addSlip(r, "2026-11-05", T)
    const id = r.slips.find((s) => s.day === "2026-11-05")!.id
    expect(undoSlip(r, id).runs).toEqual(after.runs)
  })

  it("changing the date never removes a past run", () => {
    let r = setQuitDate(emptyRecord(), "2026-11-01", T)
    r = addSlip(r, "2026-11-11", T)
    const before = r.runs.length
    const moved = setQuitDate(r, "2026-11-15", T)
    expect(moved.runs.length).toBeGreaterThanOrEqual(before)
    expect(moved.runs[0]).toEqual(r.runs[0])
    expect(moved.quitDate).toBe("2026-11-15")
    expect(moved.runs.find((x) => x.endedBy === "reset")).toBeTruthy()
    const earlier = setQuitDate(r, "2026-10-01", T)
    expect(earlier.runs[0]).toEqual(r.runs[0])
    expect(earlier.runs.length).toBe(before)
  })

  it("moves an untouched run that has not started counting", () => {
    const r = setQuitDate(setQuitDate(emptyRecord(), T, T), "2026-11-25", T)
    expect(r.runs).toEqual([{ start: "2026-11-25", end: null, endedBy: null }])
  })

  it("addDays crosses months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("parseRecord survives garbage; store round trip works", () => {
    expect(parseRecord(null)).toEqual(emptyRecord())
    expect(parseRecord({ runs: "x", slips: 3, unit: { id: 1 } })).toEqual(emptyRecord())
    const mem: Record<string, string> = {}
    const store = createQuitStore(() => ({
      getItem: (k) => mem[k] ?? null,
      setItem: (k, v) => void (mem[k] = v),
    }))
    let r = setQuitDate(emptyRecord(), "2026-11-01", T)
    r = { ...r, unit: { id: "vape", perDay: 1, priceUsd: 14.07, priceBasis: "default" } }
    saveRecord(store, "nicotine", r)
    expect(loadRecord(store, "nicotine")).toEqual(r)
  })
})
