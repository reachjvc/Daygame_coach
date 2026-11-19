import { describe, expect, it } from "vitest"
import {
  ifText,
  applyDraft,
  dayLabel,
  draftFromLines,
  EMPTY_IFTHEN,
  firstUnanswered,
  hasNegation,
  isDue,
  moveLine,
  ownKey,
  parseIfthen,
  preTicks,
  reachedTo,
  restore,
  reviewCounts,
  withStop,
  type Draft,
  type Line,
} from "../../../../src/quit/tools/ifthen/logic"

const moments = ["after-food", "coffee", "stress", "driving", "bored"].map((id) => ({ id }))
const line = (id: string, momentId: string | null, then: string, ownMoment = ""): Line => ({ id, momentId, ownMoment, then, from: "own" })
let n = 0
const mk = () => `new${++n}`

describe("parseIfthen", () => {
  it("gives the empty state for anything that is not an object", () => {
    for (const bad of [null, undefined, 5, "x", [], true]) expect(parseIfthen(bad)).toEqual(EMPTY_IFTHEN)
  })
  it("drops bad lines, keeps good ones, trusts no field", () => {
    const s = parseIfthen({
      lines: [
        line("a", "coffee", "Have gum."),
        { id: "b", momentId: "coffee", then: "dup moment" },
        { id: 7, momentId: "x", then: "no id" },
        { id: "c", momentId: null, ownMoment: "", then: "no moment" },
        { id: "d", momentId: "stress", then: "   " },
        { id: "e", momentId: null, ownMoment: "Payday", then: "go to the gym", from: "weird" },
        "junk",
      ],
      checkin: "nope",
      reviews: { a: "kept", e: "maybe", z: "change" },
    })
    expect(s.lines.map((l) => l.id)).toEqual(["a", "e"])
    expect(s.lines[1].from).toBe("own")
    expect(s.checkin).toBe("")
    expect(s.reviews).toEqual({ a: "kept", z: "change" })
    expect(s.draft?.ticked).toEqual(["coffee", ownKey("Payday")])
  })
  it("caps text lengths and reads a good check-back day", () => {
    const s = parseIfthen({ lines: [line("a", null, "x".repeat(300), "y".repeat(200))], checkin: "2026-12-03" })
    expect(s.lines[0].then).toHaveLength(160)
    expect(s.lines[0].ownMoment).toHaveLength(80)
    expect(s.checkin).toBe("2026-12-03")
  })
})

describe("preTicks", () => {
  it("counts per moment, most often first, ties in list order, at most three", () => {
    const reports = [
      ...Array(3).fill({ where: "driving" }),
      { where: "after-food" },
      { where: "coffee" },
      { where: "stress" },
      { where: "stress" },
      { where: "" },
      { where: "not-a-moment" },
    ]
    expect(preTicks(reports, moments)).toEqual([
      { id: "driving", count: 3 },
      { id: "stress", count: 2 },
      { id: "after-food", count: 1 },
    ])
  })
  it("gives nothing when nothing is saved", () => {
    expect(preTicks([], moments)).toEqual([])
  })
})

describe("negation nudge", () => {
  it("catches what he will not do", () => {
    for (const s of ["I won't smoke", "I will not smoke", "do not smoke", "don’t buy them", "not at the bar", "never again"]) expect(hasNegation(s), s).toBe(true)
  })
  it("leaves plans that say what he will do", () => {
    for (const s of ["stop at the shop", "stop at the gym", "go to the gym", "nothing but gum", "knotted rope"]) expect(hasNegation(s), s).toBe(false)
  })
})

describe("applyDraft", () => {
  const lines = [line("a", "after-food", "Walk."), line("b", "driving", "Gum."), line("c", null, "Gym", "Payday")]
  const draft = (ticked: string[], choices: Draft["choices"] = {}): Draft => ({ ticked, choices, pre: false, reached: 1 })

  it("keeps lines of still-ticked moments and their then, adds new ones, removes unticked", () => {
    const d = draft(["after-food", ownKey("Payday"), "coffee"], { coffee: { then: "Drink water", from: "idea" } })
    const res = applyDraft(lines, d, mk)
    expect(res.lines.map((l) => [l.momentId, l.ownMoment, l.then])).toEqual([
      ["after-food", "", "Walk."],
      [null, "Payday", "Gym"],
      ["coffee", "", "Drink water"],
    ])
    expect(res.removed).toEqual([{ line: lines[1], index: 1 }])
  })
  it("takes a changed then from the draft's choice", () => {
    const d = draft(["after-food"], { "after-food": { then: " Brush teeth ", from: "card" } })
    const res = applyDraft(lines, d, mk)
    expect(res.lines).toHaveLength(1)
    expect(res.lines[0]).toMatchObject({ id: "a", then: "Brush teeth", from: "card" })
  })
  it("skips a new moment with no then", () => {
    expect(applyDraft([], draft(["coffee"], { coffee: { then: "  ", from: "own" } }), mk).lines).toEqual([])
  })
  it("round trips: a draft made from the lines changes nothing", () => {
    const res = applyDraft(lines, draftFromLines(lines), mk)
    expect(res.lines).toEqual(lines)
    expect(res.removed).toEqual([])
  })
  it("restore puts a removed line back where it stood", () => {
    const res = applyDraft(lines, draft(["after-food", ownKey("Payday")]), mk)
    expect(restore(res.lines, res.removed).map((l) => l.id)).toEqual(["a", "b", "c"])
  })
})

describe("moveLine", () => {
  const lines = [line("a", "coffee", "x"), line("b", "stress", "y"), line("c", "bored", "z")]
  it("moves one step and stops at the ends", () => {
    expect(moveLine(lines, "b", -1).map((l) => l.id)).toEqual(["b", "a", "c"])
    expect(moveLine(lines, "b", 1).map((l) => l.id)).toEqual(["a", "c", "b"])
    expect(moveLine(lines, "a", -1)).toBe(lines)
    expect(moveLine(lines, "c", 1)).toBe(lines)
    expect(moveLine(lines, "zz", 1)).toBe(lines)
  })
})

describe("withStop", () => {
  it("adds one full stop, never two", () => {
    expect(withStop("go to the gym")).toBe("go to the gym.")
    expect(withStop("go to the gym.")).toBe("go to the gym.")
    expect(withStop("  Walk around the block  ")).toBe("Walk around the block.")
    expect(withStop("Really?")).toBe("Really?")
    expect(withStop("   ")).toBe("")
  })
})

describe("check back", () => {
  it("is due on and after the day, never without one", () => {
    expect(isDue("2026-12-03", "2026-12-02")).toBe(false)
    expect(isDue("2026-12-03", "2026-12-03")).toBe(true)
    expect(isDue("2026-12-03", "2026-12-20")).toBe(true)
    expect(isDue("", "2026-12-20")).toBe(false)
  })
  it("counts answers", () => {
    const lines = [line("a", "coffee", "x"), line("b", "stress", "y"), line("c", "bored", "z")]
    expect(reviewCounts(lines, { a: "kept", b: "change" })).toEqual({ kept: 1, change: 1, open: 1 })
  })
})

describe("firstUnanswered", () => {
  it("walks the answered moments in a row", () => {
    expect(firstUnanswered(null)).toBe(1)
    const d: Draft = { ticked: ["coffee", "stress"], choices: {}, pre: false, reached: 1 }
    expect(firstUnanswered(d)).toBe(1)
    d.reached = 9
    expect(firstUnanswered(d)).toBe(2)
    d.choices.coffee = { then: "gum", from: "own" }
    expect(firstUnanswered(d)).toBe(3)
    d.choices.stress = { then: "walk", from: "own" }
    expect(firstUnanswered(d)).toBe(4)
    d.reached = 3
    expect(firstUnanswered(d)).toBe(3)
    expect(reachedTo(d, 4).reached).toBe(4)
    expect(reachedTo(d, 2)).toBe(d)
  })
})

describe("dayLabel", () => {
  it("writes the weekday, day and month", () => {
    expect(dayLabel("2026-12-03")).toBe("Thu 3 Dec")
    expect(dayLabel("2026-11-26")).toBe("Thu 26 Nov")
  })
})

describe("ifText", () => {
  it("drops a leading When from a list label", () => {
    expect(ifText("When I’m stressed")).toBe("I’m stressed")
    expect(ifText("After a meal")).toBe("After a meal")
    expect(ifText("when payday comes")).toBe("Payday comes")
    expect(ifText("When")).toBe("When")
  })
})
