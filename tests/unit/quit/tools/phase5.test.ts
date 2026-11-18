import { describe, expect, it } from "vitest"
import nicotine from "@/src/quit/data/nicotine.json"
import { tooltext } from "@/src/quit/tooltext"
import { endingForBelief, endingForEnding, laterDay, reportAt, shiftDay, slipDay, slipThought } from "@/src/quit/blackboxLogic"
import { currentSwap, firstUnanswered as sosFirst, formatClock, minutesGone, needForBelief, remainingMs, WAIT_MS, EMPTY_SOS } from "@/src/quit/tools/sos/logic"
import { firstUnanswered as slipFirst, keepLine, EMPTY_SLIP } from "@/src/quit/tools/slip/logic"
import { helpFor, listable, symptomLabel } from "@/src/quit/tools/symptoms/logic"
import { NO_RESET } from "@/src/quit/validate"
import type { QuitAddictionFull } from "@/src/quit/types"

const data = nicotine as unknown as QuitAddictionFull

const strings = (x: unknown, out: string[] = []): string[] => {
  if (typeof x === "string") out.push(x)
  else if (x && typeof x === "object") Object.values(x).forEach((v) => strings(v, out))
  return out
}

describe("sos countdown maths", () => {
  const t0 = 1_000_000
  it("starts at ten minutes and ends at zero", () => {
    expect(remainingMs(t0, t0)).toBe(WAIT_MS)
    expect(remainingMs(t0, t0 + WAIT_MS)).toBe(0)
    expect(remainingMs(t0, t0 + WAIT_MS + 5000)).toBe(0)
  })
  it("a reload 4 minutes in shows 6:00 left", () => {
    expect(remainingMs(t0, t0 + 4 * 60000)).toBe(6 * 60000)
    expect(formatClock(remainingMs(t0, t0 + 4 * 60000))).toBe("06:00")
    expect(minutesGone(t0, t0 + 4 * 60000)).toBe(4)
  })
  it("a clock that moved back never shows more than ten minutes", () => {
    expect(remainingMs(t0, t0 - 30000)).toBe(WAIT_MS)
  })
  it("formats mm:ss rounding up", () => {
    expect(formatClock(WAIT_MS)).toBe("10:00")
    expect(formatClock(59_001)).toBe("01:00")
    expect(formatClock(1)).toBe("00:01")
    expect(formatClock(0)).toBe("00:00")
  })
  it("counts whole minutes gone", () => {
    expect(minutesGone(t0, t0 + 59_999)).toBe(0)
    expect(minutesGone(t0, t0 + 60_000)).toBe(1)
    expect(minutesGone(t0, t0 + WAIT_MS)).toBe(10)
  })
})

describe("sos choices", () => {
  it("preselects the need of the belief; none for something else", () => {
    expect(needForBelief("b1", data.beliefs)).toBe("confidence")
    expect(needForBelief("other", data.beliefs)).toBeNull()
    expect(needForBelief("nope", data.beliefs)).toBeNull()
    expect(needForBelief(null, data.beliefs)).toBeNull()
  })
  it("cycles the three swaps of the need, rated ones first", () => {
    const need = data.needs[0]
    const ids = [0, 1, 2, 3].map((i) => currentSwap(need, {}, i)?.id)
    expect(ids[0]).toBe(need.swaps[0].id)
    expect(ids[3]).toBe(ids[0])
    expect(new Set(ids).size).toBe(need.swaps.length)
    expect(currentSwap(need, { [need.swaps[2].id]: 90 }, 0)?.id).toBe(need.swaps[2].id)
    expect(currentSwap(undefined, {}, 0)).toBeNull()
  })
  it("resumes at the first unanswered screen", () => {
    expect(sosFirst(EMPTY_SOS)).toBe(1)
    expect(sosFirst({ ...EMPTY_SOS, done: 2 })).toBe(3)
    expect(sosFirst({ ...EMPTY_SOS, done: 9 })).toBe(5)
  })
})

describe("sos text promises no craving length", () => {
  const BAN = /lasts?|will pass|passes in|\d+ minutes to pass|go(es)? away in/i
  it("holds for every string in tooltext.sos and tooltext.blackbox", () => {
    const all = [...strings(tooltext.sos), ...strings(tooltext.blackbox)]
    expect(all.length).toBeGreaterThan(10)
    for (const s of all) expect(s).not.toMatch(BAN)
  })
})

describe("slip text", () => {
  it("has no reset words and no blame words", () => {
    const all = strings(tooltext.slip)
    for (const s of all) {
      expect(s).not.toMatch(NO_RESET)
      expect(s).not.toMatch(/start (again|over) from|lost (it all|your)|blew it|failed/i)
    }
  })
  it("finds the keep sentence of step 3 as written", () => {
    expect(keepLine(data.planSteps)).toBe("Every day you keep that promise to yourself is a complete success.")
    expect(keepLine("TODO")).toBeNull()
    expect(keepLine([{ text: "a" }, { text: "b" }, { text: "Nothing." }])).toBeNull()
  })
  it("resumes at the first unanswered screen", () => {
    expect(slipFirst(EMPTY_SLIP)).toBe(1)
    expect(slipFirst({ ...EMPTY_SLIP, done: 3 })).toBe(4)
    expect(slipFirst({ ...EMPTY_SLIP, done: 8 })).toBe(4)
  })
})

describe("endings map to the Black Box", () => {
  const endings = [
    { id: "stress", blackBoxEnding: "stress" as const },
    { id: "drinks", blackBoxEnding: "drink" as const },
  ]
  it("maps a picked ending", () => {
    expect(endingForEnding("drinks", endings)).toBe("drink")
    expect(endingForEnding("zzz", endings)).toBe("other")
    expect(endingForEnding(null, endings)).toBe("other")
  })
  it("maps a belief only when an ending has the same id, else other", () => {
    expect(endingForBelief("stress", endings)).toBe("stress")
    expect(endingForBelief("b1", endings)).toBe("other")
    expect(endingForBelief(null, endings)).toBe("other")
  })
  it("every nicotine ending has a Black Box ending", () => {
    for (const e of data.endings) expect(endingForEnding(e.id, data.endings)).toBe(e.blackBoxEnding)
  })
})

describe("slip dates", () => {
  it("moves days across month and year ends", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28")
    expect(shiftDay("2026-01-01", -1)).toBe("2025-12-31")
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01")
  })
  it("dates a slip", () => {
    expect(slipDay("today", "2026-11-18")).toBe("2026-11-18")
    expect(slipDay("yesterday", "2026-11-18")).toBe("2026-11-17")
    expect(slipDay("week", "2026-11-18")).toBe("2026-11-16")
    expect(laterDay("2026-11-16", "2026-11-17")).toBe("2026-11-17")
    expect(reportAt("2026-11-17", "2026-11-18", "now")).toBe("2026-11-17T12:00:00")
    expect(reportAt("2026-11-18", "2026-11-18", "2026-11-18T10:00:00")).toBe("2026-11-18T10:00:00")
  })
  it("keeps a thought to 80 characters", () => {
    expect(slipThought("Just one", "ignored")).toBe("Just one")
    expect(slipThought(null, "  mine  ")).toBe("mine")
    expect(slipThought(null, "x".repeat(200))).toHaveLength(80)
  })
})

describe("symptom guide", () => {
  it("every course row has a source and none is tiredness", () => {
    expect(data.symptomCourse.length).toBeGreaterThan(0)
    for (const row of data.symptomCourse) {
      expect(row.refs.length).toBeGreaterThanOrEqual(1)
      expect(row.symptom).not.toBe("tired")
    }
    expect(listable(data.symptomCourse)).toHaveLength(data.symptomCourse.length)
    expect(listable([{ ...data.symptomCourse[0], symptom: "tired" }])).toHaveLength(0)
    expect(listable([{ ...data.symptomCourse[0], refs: [] }])).toHaveLength(0)
  })
  it("labels with the plain words, a fallback, then the key", () => {
    expect(symptomLabel("sleep", data.symptomWords, {})).toBe("Bad sleep")
    expect(symptomLabel("cue-craving", data.symptomWords, { "cue-craving": "Cues" })).toBe("Cues")
    expect(symptomLabel("zzz", {}, {})).toBe("zzz")
    for (const row of data.symptomCourse) {
      expect(symptomLabel(row.symptom, data.symptomWords, { "cue-craving": tooltext.symptoms.cueCraving })).not.toBe(row.symptom)
    }
  })
  it("finds help rows per symptom", () => {
    expect(helpFor("sleep", data.symptomHelp).length).toBeGreaterThan(0)
    expect(helpFor("nothing", data.symptomHelp)).toEqual([])
  })
  it("shows no forum share, post count or in-100-posts line", () => {
    const BAN = /in 100 posts|posts mention|of posts/i
    const shown = [
      ...strings(tooltext.symptoms),
      ...strings(data.symptomCourse),
      ...strings(data.symptomHelp),
      data.symptomCourseNote,
      ...Object.values(data.symptomWords),
    ]
    for (const s of shown) expect(s).not.toMatch(BAN)
  })
  it("has the four sleep rules", () => {
    expect(tooltext.symptoms.sleepRules).toHaveLength(4)
  })
})
