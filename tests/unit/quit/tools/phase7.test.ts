import { describe, expect, it } from "vitest"
import { createQuitStore, QUIT_STORE_KEY, type StorageLike } from "@/src/quit/store"
import { amountOutOfRange, computeCost, EMPTY_COST, parseCost } from "@/src/quit/tools/cost/logic"
import { EMPTY_BELIEFS, parseBeliefs } from "@/src/quit/tools/beliefs/logic"
import { EMPTY_GIVES, parseGives } from "@/src/quit/tools/gives/logic"
import { buildResult, chooseTries, EMPTY_PAST, parsePast } from "@/src/quit/tools/past/logic"
import { EMPTY_SLIP, parseSlip } from "@/src/quit/tools/slip/logic"
import { EMPTY_SOS, parseSos } from "@/src/quit/tools/sos/logic"
import { isFlag, previewSuffix } from "@/src/quit/menu"
import { POST } from "@/app/api/quit/count/route"

const JUNK: unknown[] = [null, undefined, 5, "x", [], { ratings: null, facts: null }, { done: "3", tried: null, rated: null, picked: "x" }, { result: {} }, { ownWords: 5 }]

describe("bad saved data falls back to empty, never NaN", () => {
  it("beliefs", () => {
    for (const j of JUNK) expect(parseBeliefs(j)).toEqual(EMPTY_BELIEFS)
    expect(parseBeliefs({ ratings: { b1: 5, b2: 9, b3: "4" }, facts: { f1: true, f2: 1 } })).toEqual({ ratings: { b1: 5 }, facts: { f1: true } })
  })
  it("gives", () => {
    for (const j of JUNK) expect(parseGives(j)).toEqual(EMPTY_GIVES)
  })
  it("past", () => {
    for (const j of JUNK) expect(parsePast(j)).toEqual(EMPTY_PAST)
  })
  it("cost", () => {
    for (const j of JUNK) expect(parseCost(j)).toEqual(EMPTY_COST)
    const bad = parseCost({ unit: "cigarettes", done: 3, result: {} })
    expect(bad.result).toBeNull()
    expect(parseCost({ result: { yearUsd: 1, tenYearUsd: 10, hoursYear: null } }).result).toEqual({ yearUsd: 1, tenYearUsd: 10, hoursYear: null })
  })
  it("slip and sos", () => {
    for (const j of JUNK) {
      expect(parseSlip(j)).toEqual(EMPTY_SLIP)
      expect(parseSos(j)).toEqual(EMPTY_SOS)
    }
    expect(parseSos({ waitStartedAt: "abc" }).waitStartedAt).toBeNull()
    expect(parseSos({ waitStartedAt: -5 }).waitStartedAt).toBeNull()
  })
})

describe("cost fixes", () => {
  it("ten years is ten times the rounded year shown", () => {
    const r = computeCost({ perDay: 10, daysPerWeek: 7, priceUsd: 0.52, minutesPerUnit: null })
    expect(r.yearUsd).toBe(1892.8)
    expect(r.tenYearUsd).toBe(18930)
  })
  it("flags only a typed value that is out of range", () => {
    expect(amountOutOfRange("500", 0, 100)).toBe(true)
    expect(amountOutOfRange("-5", 0, 100)).toBe(true)
    expect(amountOutOfRange("1e2", 0, 100)).toBe(false)
    expect(amountOutOfRange("", 0, 100)).toBe(false)
  })
})

describe("past: never tried", () => {
  it("clears every later answer and the result ignores stale ones", () => {
    const full = { ...EMPTY_PAST, done: 4, tries: "2-3" as const, stretchUnit: "days" as const, endings: ["a"], helped: ["h"], afterSlip: "gaveUp" as const }
    const zero = chooseTries(full, "0")
    expect(zero).toEqual({ ...EMPTY_PAST, done: 4, tries: "0" })
    const stale = buildResult({ ...full, tries: "0" })
    expect(stale.riskyEndings).toEqual([])
    expect(stale.keep).toEqual([])
    expect(stale.longestDays).toBeNull()
  })
})

describe("two tabs", () => {
  function shared(): StorageLike {
    const data: Record<string, string> = {}
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) }
  }
  it("a write from a second store keeps the other tool's keys and survives a bad top level", () => {
    const st = shared()
    const a = createQuitStore(() => st)
    const b = createQuitStore(() => st)
    a.set("nicotine", "beliefs", { ratings: { b1: 3 } })
    b.set("nicotine", "cost", { done: 1 })
    expect(a.get("nicotine", "beliefs")).toEqual({ ratings: { b1: 3 } })
    st.setItem(QUIT_STORE_KEY, JSON.stringify({ nicotine: "oops" }))
    b.set("nicotine", "cost", { done: 2 })
    expect(b.get("nicotine", "cost")).toEqual({ done: 2 })
  })
})

describe("preview and present flags", () => {
  it("a repeated flag counts and both are carried", () => {
    expect(isFlag(["1", "1"])).toBe(true)
    expect(isFlag("1")).toBe(true)
    expect(isFlag("0")).toBe(false)
    expect(isFlag(undefined)).toBe(false)
    expect(previewSuffix(true, true)).toBe("?preview=1&present=1")
    expect(previewSuffix(false, true)).toBe("?present=1")
    expect(previewSuffix(false)).toBe("")
  })
})

describe("count route", () => {
  const body = JSON.stringify({ addiction: "nicotine", tool: "beliefs", step: "view" })
  const post = (headers: Record<string, string>) =>
    POST(new Request("http://localhost:3000/api/quit/count", { method: "POST", headers, body }))
  it("accepts JSON from this site or with no Origin", async () => {
    expect((await post({ "content-type": "application/json" })).status).toBe(204)
    expect((await post({ "content-type": "application/json; charset=utf-8", origin: "http://localhost:3000" })).status).toBe(204)
  })
  it("refuses other content types and other origins", async () => {
    expect((await post({ "content-type": "text/plain" })).status).toBe(415)
    expect((await post({ "content-type": "application/x-www-form-urlencoded" })).status).toBe(415)
    expect((await post({})).status).toBe(415)
    expect((await post({ "content-type": "application/json", origin: "https://evil.example" })).status).toBe(403)
  })
})
