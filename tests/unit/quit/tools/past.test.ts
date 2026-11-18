import { describe, expect, it } from "vitest"
import { tooltext } from "@/src/quit/tooltext"
import {
  buildResult,
  dangerWindow,
  EMPTY_PAST,
  firstUnanswered,
  longestDays,
  slipLine,
  toBlackBoxEndings,
  totalScreens,
} from "@/src/quit/tools/past/logic"
import { makeValid } from "../fixtures/valid"

describe("danger window", () => {
  it("is days ceil(N/2) to N for days and weeks up to 8 weeks", () => {
    expect(dangerWindow(10, "days")).toEqual({ from: 5, to: 10 })
    expect(dangerWindow(9, "days")).toEqual({ from: 5, to: 9 })
    expect(dangerWindow(1, "days")).toEqual({ from: 1, to: 1 })
    expect(dangerWindow(2, "weeks")).toEqual({ from: 7, to: 14 })
    expect(dangerWindow(8, "weeks")).toEqual({ from: 28, to: 56 })
  })

  it("is none past 8 weeks, and for months and years", () => {
    expect(dangerWindow(9, "weeks")).toBeNull()
    expect(dangerWindow(57, "days")).toBeNull()
    expect(dangerWindow(2, "months")).toBeNull()
    expect(dangerWindow(1, "years")).toBeNull()
    expect(longestDays(2, "months")).toBeNull()
  })
})

describe("past endings map to the Black Box", () => {
  const endings = [
    { id: "stress", blackBoxEnding: "stress" as const },
    { id: "fight", blackBoxEnding: "stress" as const },
    { id: "just-one", blackBoxEnding: "justone" as const },
    { id: "bored", blackBoxEnding: "faded" as const },
  ]

  it("maps each picked ending once, in order", () => {
    expect(toBlackBoxEndings(["just-one", "stress", "fight"], endings)).toEqual(["justone", "stress"])
  })

  it("skips unknown ids", () => {
    expect(toBlackBoxEndings(["nope", "bored"], endings)).toEqual(["faded"])
  })

  it("maps every ending of the valid fixture to a Black Box id", () => {
    const v = makeValid()
    expect(toBlackBoxEndings(v.endings.map((e) => e.id), v.endings)).toHaveLength(new Set(v.endings.map((e) => e.blackBoxEnding)).size)
  })
})

describe("past flow", () => {
  it("has one screen when he never tried, else four", () => {
    expect(totalScreens("0")).toBe(1)
    expect(totalScreens("1")).toBe(4)
    expect(totalScreens(null)).toBe(4)
  })

  it("goes to the result after screen 1 when tries is 0", () => {
    expect(firstUnanswered({ ...EMPTY_PAST, tries: "0", done: 1 })).toBe(2)
    expect(firstUnanswered({ ...EMPTY_PAST, tries: "2-3", done: 1 })).toBe(2)
    expect(firstUnanswered({ ...EMPTY_PAST, tries: "2-3", done: 4 })).toBe(5)
  })

  it("keeps the top 2 endings and what helped in the result", () => {
    const r = buildResult({ ...EMPTY_PAST, tries: "2-3", stretchN: 10, stretchUnit: "days", endings: ["a", "b", "c"], helped: ["h"] })
    expect(r).toEqual({ longestDays: 10, dangerWindow: { from: 5, to: 10 }, riskyEndings: ["a", "b"], keep: ["h"] })
  })

  it("has no window when he never tried", () => {
    expect(buildResult({ ...EMPTY_PAST, tries: "0", stretchN: 5, stretchUnit: "days" }).dangerWindow).toBeNull()
  })
})

describe("slipLine", () => {
  const step = (text: string) => ({ title: "t", text, do: [] as string[] })
  it("returns the sentence that starts with If you slip", () => {
    const steps = [step("a"), step("b"), step("Set a date. If you slip, go back through steps 1–3.")]
    expect(slipLine(steps)).toBe("If you slip, go back through steps 1–3.")
  })
  it("returns null without it, or on a draft", () => {
    expect(slipLine([step("a"), step("b"), step("Nothing here.")])).toBeNull()
    expect(slipLine("TODO")).toBeNull()
    expect(slipLine(null)).toBeNull()
  })
})

describe("no forecast in the past tool text", () => {
  const FORECAST = /you will|chance of success|likely to succeed|will succeed/i
  it("holds for every string in tooltext.past and tooltext.common", () => {
    const strings: string[] = []
    const walk = (x: unknown) => {
      if (typeof x === "string") strings.push(x)
      else if (x && typeof x === "object") Object.values(x).forEach(walk)
    }
    walk(tooltext.past)
    walk(tooltext.common)
    expect(strings.length).toBeGreaterThan(10)
    for (const s of strings) expect(s).not.toMatch(FORECAST)
  })
})
