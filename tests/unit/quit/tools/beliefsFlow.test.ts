import { describe, expect, it } from "vitest"
import {
  CAN_STOP,
  EMPTY_FULL,
  MAX_RESULTS,
  addResult,
  bandAction,
  changesSince,
  deleteResult,
  dropDraft,
  finish,
  firstUnansweredScreen,
  hasAnswers,
  liesInSentence,
  parseFull,
  questionNumber,
  rate,
  answerFact,
  resultTop,
  screensFor,
  startRetake,
  takenAt,
  type BeliefResult,
} from "@/src/quit/tools/beliefs/flow"
import { heldCount, topBeliefs } from "@/src/quit/tools/beliefs/logic"
import { makeValid } from "../fixtures/valid"

const { beliefs, facts, bands } = makeValid()
const ids = beliefs.map((b) => b.id)
const all = (n: number) => Object.fromEntries(ids.map((id) => [id, n]))
const NOW = "2026-11-19T10:42:00.000Z"

describe("screens with replies", () => {
  it("no 4 or 5: 12 questions, 3 facts, the last question", () => {
    const list = screensFor(all(3), beliefs, 3)
    expect(list).toHaveLength(16)
    expect(list.some((s) => s.kind === "reply")).toBe(false)
    expect(list[15]).toEqual({ kind: "canstop" })
  })

  it("a reply follows exactly the beliefs rated 4 or 5", () => {
    const list = screensFor({ ...all(1), b3: 5, b7: 4, b9: 3 }, beliefs, 3)
    expect(list).toHaveLength(18)
    expect(list.filter((s) => s.kind === "reply")).toEqual([{ kind: "reply", i: 2 }, { kind: "reply", i: 6 }])
    expect(list[2]).toEqual({ kind: "q", i: 2 })
    expect(list[3]).toEqual({ kind: "reply", i: 2 })
    expect(list[4]).toEqual({ kind: "q", i: 3 })
  })

  it("question numbers skip replies and run 1 to 16", () => {
    const list = screensFor({ ...all(1), b3: 5 }, beliefs, 3)
    expect(questionNumber(list, 3)).toBe(3)
    expect(questionNumber(list, 4)).toBe(3)
    expect(questionNumber(list, 5)).toBe(4)
    expect(questionNumber(list, list.length - 3)).toBe(13)
    expect(questionNumber(list, list.length)).toBe(16)
  })

  it("the first unanswered screen counts replies, facts and the last question", () => {
    const d = (ratings: Record<string, number>, f: Record<string, boolean> = {}, canStop: "yes" | null = null) => ({ ratings, facts: f, canStop, startedAt: NOW })
    expect(firstUnansweredScreen(d({}), beliefs, facts)).toBe(1)
    expect(firstUnansweredScreen(d({ b1: 3, b2: 3 }), beliefs, facts)).toBe(3)
    // b3 rated 5: its reply is screen 4, so the next question is screen 5
    expect(firstUnansweredScreen(d({ b1: 3, b2: 3, b3: 5 }), beliefs, facts)).toBe(5)
    expect(firstUnansweredScreen(d(all(3)), beliefs, facts)).toBe(13)
    expect(firstUnansweredScreen(d(all(3), { f1: true, f2: true }), beliefs, facts)).toBe(15)
    expect(firstUnansweredScreen(d(all(3), { f1: true, f2: true, f3: false }), beliefs, facts)).toBe(16)
    expect(firstUnansweredScreen(d(all(3), { f1: true, f2: true, f3: false }, "yes"), beliefs, facts)).toBe(17)
  })
})

describe("saved state and wave-1 saves", () => {
  it("junk gives the empty state", () => {
    for (const j of [null, undefined, 5, "x", [], { results: "no" }]) expect(parseFull(j, ids)).toEqual(EMPTY_FULL)
  })

  it("a wave-1 save with all ratings is one result without a date", () => {
    const s = parseFull({ ratings: all(4), facts: { f1: true, f2: false, f3: true } }, ids)
    expect(s.results).toEqual([{ at: null, ratings: all(4), facts: { f1: true, f2: false, f3: true }, canStop: null }])
    expect(s.draft).toBeNull()
    expect(s.ratings).toEqual(all(4))
  })

  it("a partial wave-1 save becomes the draft", () => {
    const s = parseFull({ ratings: { b1: 3, b2: 5 }, facts: {} }, ids)
    expect(s.results).toEqual([])
    expect(s.draft).toEqual({ ratings: { b1: 3, b2: 5 }, facts: {}, canStop: null, startedAt: null })
    expect(s.ratings).toEqual({})
  })

  it("a new save keeps its draft and results, drops bad entries, caps at 20", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ at: NOW, ratings: { b1: (i % 5) + 1 }, facts: {}, canStop: "yes" }))
    const s = parseFull({ results: [...many, "junk", { at: "not a date", ratings: { b1: 9 }, canStop: "maybe" }], draft: { ratings: { b2: 2 } } }, ids)
    expect(s.results).toHaveLength(MAX_RESULTS)
    expect(s.results[MAX_RESULTS - 1]).toEqual({ at: null, ratings: {}, facts: {}, canStop: null })
    expect(s.draft?.ratings).toEqual({ b2: 2 })
  })

  it("the old reader still sees the latest finished test", () => {
    const s = parseFull({ results: [{ at: NOW, ratings: { b1: 5, b2: 2 }, facts: { f1: true }, canStop: "no" }] }, ids)
    expect(s.ratings).toEqual({ b1: 5, b2: 2 })
    expect(s.facts).toEqual({ f1: true })
  })
})

describe("answering and finishing", () => {
  it("the first answer starts a draft; finishing makes a result and clears the draft", () => {
    let s = rate(EMPTY_FULL, "b1", 4, NOW)
    expect(s.draft).toEqual({ ratings: { b1: 4 }, facts: {}, canStop: null, startedAt: NOW })
    s = answerFact(s, "f1", true, NOW)
    s = finish(s, "unsure", "2026-11-19T11:00:00.000Z")
    expect(s.draft).toBeNull()
    expect(s.results).toEqual([{ at: "2026-11-19T11:00:00.000Z", ratings: { b1: 4 }, facts: { f1: true }, canStop: "unsure" }])
    expect(s.ratings).toEqual({ b1: 4 })
  })

  it("a retake is an empty draft; dropping it keeps the results", () => {
    const done = finish(rate(EMPTY_FULL, "b1", 4, NOW), "yes", NOW)
    const retake = startRetake(done, NOW)
    expect(hasAnswers(retake.draft)).toBe(false)
    expect(hasAnswers(rate(retake, "b1", 2, NOW).draft)).toBe(true)
    expect(dropDraft(rate(retake, "b1", 2, NOW))).toEqual(done)
  })

  it("keeps at most 20 results, oldest dropped", () => {
    let results: BeliefResult[] = []
    for (let i = 0; i < 23; i++) results = addResult(results, { at: NOW, ratings: { b1: 1 }, facts: {}, canStop: CAN_STOP[i % 3] })
    expect(results).toHaveLength(20)
  })

  it("deleting a result keeps the saved ratings in step with the newest one left", () => {
    const a: BeliefResult = { at: NOW, ratings: { b1: 1 }, facts: {}, canStop: "no" }
    const b: BeliefResult = { at: NOW, ratings: { b1: 5 }, facts: {}, canStop: "yes" }
    const s = { ratings: b.ratings, facts: b.facts, draft: null, results: [a, b] }
    expect(deleteResult(s, 0).results).toEqual([b])
    expect(deleteResult(s, 1).ratings).toEqual({ b1: 1 })
  })
})

describe("top and held use one rule", () => {
  it("never lists 'held' with 0 held; all 3s give the soft list of 3", () => {
    const r = resultTop(all(3), beliefs)
    expect(heldCount(all(3), beliefs)).toBe(0)
    expect(r.kind).toBe("soft")
    expect(r.list.map((b) => b.id)).toEqual(["b1", "b2", "b3"])
  })

  it("all 1s and 2s: none", () => {
    expect(resultTop(all(2), beliefs)).toEqual({ kind: "none", list: [] })
    expect(resultTop({}, beliefs)).toEqual({ kind: "none", list: [] })
  })

  it("held list is the 4s and 5s only, highest first, ties in data order, three at most", () => {
    const r = resultTop({ ...all(3), b2: 4, b5: 5, b7: 4, b9: 4, b11: 5 }, beliefs)
    expect(r.kind).toBe("held")
    expect(r.list.map((b) => b.id)).toEqual(["b5", "b11", "b2"])
  })

  it("held kind exactly when held is more than 0, and it never lists a 3", () => {
    for (let n = 0; n <= 12; n++) {
      const ratings = Object.fromEntries(ids.map((id, i) => [id, i < n ? 4 : 3]))
      const r = resultTop(ratings, beliefs)
      expect(r.kind === "held").toBe(heldCount(ratings, beliefs) > 0)
      expect(r.list.length).toBe(Math.min(3, n === 0 ? 12 : n))
      if (r.kind === "held") for (const b of r.list) expect(ratings[b.id]).toBeGreaterThanOrEqual(4)
    }
  })

  it("the older topBeliefs (slip and gives) is unchanged: it still mixes in the 3s", () => {
    expect(topBeliefs({ ...all(1), b2: 3, b5: 5 }, beliefs).map((b) => b.id)).toEqual(["b5", "b2"])
  })
})

describe("since last time", () => {
  it("lists the changed beliefs in data order with their direction", () => {
    const prev = { ...all(3), b2: 4, b6: 1 }
    const cur = { ...all(3), b2: 2, b6: 5, b9: 3 }
    expect(changesSince(prev, cur, beliefs)).toEqual([
      { id: "b2", from: 4, to: 2, dir: "less" },
      { id: "b6", from: 1, to: 5, dir: "more" },
    ])
  })

  it("no change gives an empty list; a belief missing in one of them is skipped", () => {
    expect(changesSince(all(3), all(3), beliefs)).toEqual([])
    expect(changesSince({ b1: 3 }, { b2: 4 }, beliefs)).toEqual([])
  })
})

describe("the band link helper", () => {
  const free = { id: "free", link: "/quit/nicotine/date" }
  const some = { id: "some", link: "/quit/nicotine/date" }

  it("shows nothing while the date tool is not finished", () => {
    expect(bandAction(free, [], null)).toBeNull()
    expect(bandAction(some, ["gives", "sos"], null)).toBeNull()
  })

  it("links to the date tool once it is finished, with wording per band and record", () => {
    expect(bandAction(free, ["date"], null)).toEqual({ href: "/quit/nicotine/date", kind: "free" })
    expect(bandAction(some, ["date"], null)).toEqual({ href: "/quit/nicotine/date", kind: "set" })
    expect(bandAction(some, ["date"], "2026-12-01")).toEqual({ href: "/quit/nicotine/date", kind: "see" })
    expect(bandAction(free, ["date"], "2026-12-01")?.kind).toBe("see")
  })

  it("a link to gives shows only while gives is finished; no link, no action", () => {
    const g = { id: "some", link: "/quit/nicotine/gives" }
    expect(bandAction(g, ["date"], null)).toBeNull()
    expect(bandAction(g, ["gives"], null)).toEqual({ href: "/quit/nicotine/gives", kind: "go" })
    expect(bandAction({ id: "some" }, ["date"], null)).toBeNull()
    expect(bandAction({ id: "some", link: "https://example.org" }, ["date"], null)).toBeNull()
  })

  it("the real bands link to the date tool and no other tool", () => {
    for (const b of bands) expect(b.link === undefined || b.link === "/quit/nicotine/date").toBe(true)
  })
})

describe("share wording and dates", () => {
  it("lower-cases the leading The of the lies name", () => {
    expect(liesInSentence("The 12 lies nicotine tells you")).toBe("the 12 lies nicotine tells you")
    expect(liesInSentence("12 lies")).toBe("12 lies")
  })

  it("shows date and time, and nothing for a wave-1 result", () => {
    expect(takenAt(null)).toBeNull()
    expect(takenAt("2026-11-19T10:42:00")).toBe("Nov 19, 2026, 10:42")
  })
})
