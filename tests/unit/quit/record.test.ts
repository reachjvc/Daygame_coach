import { describe, expect, it } from "vitest"
import { createQuitStore } from "@/src/quit/store"
import { addDays, emptyRecord, isIsoDay, loadRecord, parseRecord, saveRecord, setPlan, setQuitDate, setUnit } from "@/src/quit/record"

describe("shared quit record", () => {
  it("starts empty: no date, no goal, no unit", () => {
    expect(emptyRecord()).toEqual({ quitDate: null, goal: null, breakEnd: null, unit: null })
  })

  it("setQuitDate only sets the date and ignores a bad one", () => {
    const base = setUnit(emptyRecord(), { id: "vape", perDay: 1, priceUsd: 14.07, priceBasis: "default" })
    const r = setQuitDate(base, "2026-11-19")
    expect(r).toEqual({ ...base, quitDate: "2026-11-19" })
    expect(setQuitDate(r, "2026-13-40")).toBe(r)
    expect(setQuitDate(r, "nonsense")).toBe(r)
  })

  it("setPlan keeps a break end only for a break", () => {
    const b = setPlan(emptyRecord(), { goal: "break", quitDate: "2026-11-20", breakEnd: "2026-12-04" })
    expect(b).toMatchObject({ goal: "break", quitDate: "2026-11-20", breakEnd: "2026-12-04" })
    const s = setPlan(b, { goal: "stop", quitDate: "2026-11-21", breakEnd: "2026-12-04" })
    expect(s).toMatchObject({ goal: "stop", quitDate: "2026-11-21", breakEnd: null })
    const l = setPlan(s, { goal: "later", quitDate: null, breakEnd: null })
    expect(l).toMatchObject({ goal: "later", quitDate: null, breakEnd: null })
  })

  it("addDays crosses months and isIsoDay checks the calendar", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
    expect(isIsoDay("2026-02-30")).toBe(false)
  })

  it("parseRecord survives garbage and old shapes; a null count is kept", () => {
    expect(parseRecord(null)).toEqual(emptyRecord())
    expect(parseRecord({ runs: "x", slips: 3, unit: { id: 1 }, goal: "nope", breakEnd: "2026-11-01" })).toEqual(emptyRecord())
    const kept = parseRecord({ quitDate: "2026-11-01", goal: "stop", unit: { id: "vape", perDay: null, priceUsd: 7.5, priceBasis: "typed" } })
    expect(kept.unit).toEqual({ id: "vape", perDay: null, priceUsd: 7.5, priceBasis: "typed" })
  })

  it("store round trip works", () => {
    const mem: Record<string, string> = {}
    const store = createQuitStore(() => ({
      getItem: (k) => mem[k] ?? null,
      setItem: (k, v) => void (mem[k] = v),
    }))
    let r = setPlan(emptyRecord(), { goal: "break", quitDate: "2026-11-01", breakEnd: "2026-11-15" })
    r = setUnit(r, { id: "vape", perDay: 1, priceUsd: 14.07, priceBasis: "default" })
    saveRecord(store, "nicotine", r)
    expect(loadRecord(store, "nicotine")).toEqual(r)
  })
})
