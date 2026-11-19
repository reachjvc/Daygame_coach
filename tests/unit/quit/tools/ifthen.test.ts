import { describe, expect, it } from "vitest"
import {
  ideasFor,
  outOfStep,
  addRemoved,
  applyDraft,
  capFirst,
  cleanState,
  firstOpenMoment,
  matchMoment,
  shownTotal,
  showThen,
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

describe("round 2", () => {
  it("quick ideas skip what goes against or repeats a moment's cards", () => {
    const all = ["move5", "water", "gum", "breathe", "leave", "text", "puzzle", "teeth"].map((id) => ({ id }))
    expect(ideasFor("others-smoking", all).map((x) => x.id)).not.toContain("leave")
    expect(ideasFor("drinks", all).map((x) => x.id)).not.toContain("leave")
    expect(ideasFor("driving", all)).toEqual([])
    expect(ideasFor(null, all)).toHaveLength(8)
  })
  it("outOfStep sees a line removed or put back on the plan", () => {
    const l1 = { id: "a", momentId: "coffee", ownMoment: "", then: "x", from: "card" as const }
    const l2 = { id: "b", momentId: "stress", ownMoment: "", then: "y", from: "card" as const }
    const d = draftFromLines([l1, l2])
    expect(outOfStep(d, [l1, l2])).toBe(false)
    expect(outOfStep(d, [l2])).toBe(true)
    expect(outOfStep(draftFromLines([l2]), [l1, l2])).toBe(true)
  })
  it("a draft with no ticks does not hide saved lines; a bad check-back day is dropped", () => {
    const s = parseIfthen({ lines: [{ id: "a", momentId: "coffee", ownMoment: "", then: "x", from: "card" }], draft: { ticked: "bad" }, checkin: "2026-13-45" })
    expect(s.draft?.ticked).toEqual(["coffee"])
    expect(s.checkin).toBe("")
  })
})

describe("ideasFor", () => {
  const ideas = ["move5", "water", "leave", "text", "puzzle", "teeth", "breathe"].map((id) => ({ id }))
  it("leaves out ideas that cannot be done at a moment", () => {
    expect(ideasFor("driving", ideas)).toEqual([])
    expect(ideasFor("drinks", ideas).map((x) => x.id)).toEqual(["water", "text", "breathe"])
    expect(ideasFor("waking", ideas).map((x) => x.id)).not.toContain("leave")
  })
  it("offers all of them at his own moment", () => {
    expect(ideasFor("work-break", ideas).map((x) => x.id)).not.toContain("text")
    expect(ideasFor(null, ideas)).toHaveLength(7)
  })
})

describe("round 1 helpers", () => {
  it("addRemoved keeps original indexes so Undo puts both back in place", () => {
    const lines = [line("a", "coffee", "x"), line("b", "stress", "y"), line("c", "bored", "z"), line("d", "driving", "w")]
    // remove b (index 1), then c (now index 1)
    let rem = addRemoved([], lines[1], 1)
    rem = addRemoved(rem, lines[2], 1)
    expect(rem.map((r) => r.index)).toEqual([1, 2])
    const left = [lines[0], lines[3]]
    expect(restore(left, rem).map((l) => l.id)).toEqual(["a", "b", "c", "d"])
    // reverse order: remove c (index 2), then b (index 1)
    let rem2 = addRemoved([], lines[2], 2)
    rem2 = addRemoved(rem2, lines[1], 1)
    expect(restore(left, rem2).map((l) => l.id)).toEqual(["a", "b", "c", "d"])
  })
  it("shownTotal counts the plan as a step, at least 2", () => {
    expect(shownTotal(null)).toBe(2)
    expect(shownTotal({ ticked: [], choices: {}, pre: false, reached: 1 })).toBe(2)
    expect(shownTotal({ ticked: ["a", "b", "c"], choices: {}, pre: false, reached: 1 })).toBe(5)
  })
  it("firstOpenMoment finds the first ticked moment without an answer", () => {
    const d: Draft = { ticked: ["a", "b", "c"], choices: { a: { then: "x", from: "own" }, c: { then: "z", from: "own" } }, pre: false, reached: 1 }
    expect(firstOpenMoment(d)).toBe(1)
    d.choices.b = { then: "y", from: "own" }
    expect(firstOpenMoment(d)).toBe(-1)
  })
  it("shows a then with a capital and one full stop", () => {
    expect(capFirst("go to the gym")).toBe("Go to the gym")
    expect(showThen("go to the gym")).toBe("Go to the gym.")
    expect(showThen("Go to the gym.")).toBe("Go to the gym.")
  })
  it("matchMoment finds a typed list label, case and apostrophes ignored", () => {
    const ms = [{ id: "stress", label: "When I’m stressed" }, { id: "driving", label: "In the car" }]
    expect(matchMoment("when i'm STRESSED ", ms)?.id).toBe("stress")
    expect(matchMoment("in the  car", ms)?.id).toBe("driving")
    expect(matchMoment("Payday", ms)).toBeNull()
    expect(matchMoment("  ", ms)).toBeNull()
  })
  it("cleanState never drops a line: a lost moment's line moves to its stored label or Other moment", () => {
    const ms = [{ id: "coffee", label: "With a coffee" }]
    const gone = { ...line("b", "gone", "y"), ownMoment: "In the bath" }
    const s = parseIfthen({ lines: [line("a", "coffee", "x"), gone, line("d", "gone2", "w"), line("c", null, "z", "Payday")] })
    const c = cleanState(s, ms)
    expect(c.lines.map((l) => [l.id, l.momentId, l.ownMoment, l.then])).toEqual([
      ["a", "coffee", "With a coffee", "x"],
      ["b", null, "In the bath", "y"],
      ["d", null, "Other moment", "w"],
      ["c", null, "Payday", "z"],
    ])
    expect(c.draft?.ticked).toEqual(["coffee", ownKey("In the bath"), ownKey("Other moment"), ownKey("Payday")])
    expect(cleanState(c, ms)).toBe(c)
  })
  it("cleanState numbers a second Other moment and drops only a bare tick of a lost moment", () => {
    const s = parseIfthen({ lines: [line("a", "gone1", "x"), line("b", "gone2", "y")], draft: { ticked: ["gone1", "gone2", "gone3"], choices: {}, reached: 1 } })
    const c = cleanState(s, [])
    expect(c.lines.map((l) => l.ownMoment)).toEqual(["Other moment", "Other moment 2"])
    expect(c.draft?.ticked).toEqual([ownKey("Other moment"), ownKey("Other moment 2")])
  })
})
