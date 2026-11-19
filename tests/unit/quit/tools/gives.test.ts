import { describe, expect, it } from "vitest"
import {
  addOwn,
  addTried,
  cleanNeeds,
  EMPTY_GIVES,
  firstScreen,
  orderSwaps,
  parseGives,
  preselectNeeds,
  quotesFor,
  rate,
  ratingGoogleUrl,
  ratingIcs,
  ratingIndex,
  removeOwn,
  removeTried,
} from "@/src/quit/tools/gives/logic"
import { getAddiction } from "@/src/quit/data"
import { validateAddiction } from "@/src/quit/validate"
import { topBeliefs } from "@/src/quit/tools/beliefs/logic"
import { makeValid } from "../fixtures/valid"

const swap = (id: string) => ({ id, text: id, evidence: "none" as const, refs: [] })
const swaps = [swap("a"), swap("b"), swap("c")]
const order = (rated: Record<string, number>) => orderSwaps(swaps, rated).map((s) => s.id)

describe("gives preselection", () => {
  it("takes the needs of the top beliefs, at most 3", () => {
    expect(preselectNeeds(null, ["relief", "reward", "sleep", "focus"])).toEqual(["relief", "reward", "sleep"])
  })

  it("preselects from a belief rated high in the lies test", () => {
    const { beliefs } = makeValid()
    const ratings = { b3: 5 }
    const needs = topBeliefs(ratings, beliefs).map((b) => b.need)
    expect(preselectNeeds(null, needs)).toEqual([beliefs[2].need])
  })

  it("?need= wins over the beliefs", () => {
    expect(preselectNeeds("sleep", ["relief", "reward"])).toEqual(["sleep"])
  })

  it("ignores unknown need ids and repeats", () => {
    expect(preselectNeeds("nope,sleep,sleep", ["relief"])).toEqual(["sleep"])
    expect(preselectNeeds("nope", ["relief"])).toEqual(["relief"])
    expect(cleanNeeds(["x", "relief", "relief"])).toEqual(["relief"])
  })

  it("returns nothing when there is nothing to preselect", () => {
    expect(preselectNeeds(null, [])).toEqual([])
  })
})

describe("orderSwaps", () => {
  it("keeps data order with no ratings", () => {
    expect(order({})).toEqual(["a", "b", "c"])
  })

  it("puts 60 or more first, highest first", () => {
    expect(order({ c: 90, b: 60 })).toEqual(["c", "b", "a"])
  })

  it("puts unrated before 30 to 59, and under 30 last", () => {
    expect(order({ a: 40, b: 10 })).toEqual(["c", "a", "b"])
    expect(order({ a: 59, b: 29, c: 30 })).toEqual(["a", "c", "b"])
  })

  it("reorders when the slider is saved", () => {
    expect(order({})).toEqual(["a", "b", "c"])
    expect(order({ b: 100 })).toEqual(["b", "a", "c"])
  })

  it("does not change the list it was given", () => {
    orderSwaps(swaps, { c: 100 })
    expect(swaps.map((s) => s.id)).toEqual(["a", "b", "c"])
  })
})

describe("parseGives", () => {
  it("opens a wave-1 save as before, with the new fields empty", () => {
    const old = { done: 1, picked: ["relief"], tried: { "relief-1": { swapId: "relief-1", triedOn: "2026-11-18" } }, rated: { "relief-1": 70 } }
    expect(parseGives(old)).toEqual({ done: 1, picked: ["relief"], ownNeed: null, own: {}, tried: old.tried, rated: old.rated })
  })

  it("reads the new fields and drops bad ones", () => {
    const s = parseGives({
      done: 2,
      picked: ["relief", "own"],
      ownNeed: "  a reason to step outside ",
      own: { relief: [{ id: "o1", text: "Call my brother", addedOn: "2026-11-19" }, { id: "o2", text: 5, addedOn: "2026-11-19" }, { id: "o3", text: "x", addedOn: "bad" }] },
      tried: { a: { swapId: "a", triedOn: "2026-11-19" }, b: { swapId: "b" } },
      rated: { a: 80, b: 500 },
    })
    expect(s.ownNeed).toBe("a reason to step outside")
    expect(s.own.relief).toEqual([{ id: "o1", text: "Call my brother", addedOn: "2026-11-19" }])
    expect(Object.keys(s.tried)).toEqual(["a"])
    expect(s.rated).toEqual({ a: 80 })
  })

  it("keeps the tried shape that Tool 4 (slip) reads", () => {
    const s = addTried(EMPTY_GIVES, "relief-1", "2026-11-19")
    expect(parseGives(JSON.parse(JSON.stringify(s))).tried).toEqual({ "relief-1": { swapId: "relief-1", triedOn: "2026-11-19" } })
  })

  it("gives the empty state for junk", () => {
    expect(parseGives("x")).toEqual(EMPTY_GIVES)
  })
})

describe("own swaps", () => {
  it("adds at most 5 per need, 60 characters each, no repeats", () => {
    let s = EMPTY_GIVES
    for (let i = 0; i < 7; i++) s = addOwn(s, "relief", `swap ${i}`, "2026-11-19", i)
    expect(s.own.relief).toHaveLength(5)
    s = addOwn(s, "own", "x".repeat(80), "2026-11-19", 1)
    expect(s.own.own[0].text).toHaveLength(60)
    expect(addOwn(s, "own", "X".repeat(60), "2026-11-19", 2)).toBe(s)
    expect(addOwn(s, "reward", "   ", "2026-11-19", 3)).toBe(s)
  })

  it("remove takes the swap and its rating", () => {
    let s = addOwn(EMPTY_GIVES, "relief", "Call my brother", "2026-11-19", 1)
    const id = s.own.relief[0].id
    s = { ...s, rated: { [id]: 80 } }
    s = removeOwn(s, "relief", id)
    expect(s.own.relief).toEqual([])
    expect(s.rated).toEqual({})
  })

  it("removing a data swap takes its entry and rating", () => {
    let s = addTried(EMPTY_GIVES, "a", "2026-11-19")
    s = { ...s, rated: { a: 50 } }
    s = removeTried(s, "a")
    expect(s.tried).toEqual({})
    expect(s.rated).toEqual({})
  })
})

describe("rating", () => {
  it("maps the five buttons to 0, 25, 50, 80, 100 and a wave-1 value to the nearest", () => {
    expect([0, 25, 50, 80, 100].map(ratingIndex)).toEqual([0, 1, 2, 3, 4])
    expect(ratingIndex(70)).toBe(3)
    expect(ratingIndex(undefined)).toBeNull()
  })

  it("tapping the chosen button again clears it", () => {
    const a = rate({}, "x", 80)
    expect(a).toEqual({ x: 80 })
    expect(rate(a, "x", 80)).toEqual({})
    expect(rate(a, "x", 25)).toEqual({ x: 25 })
  })

  it("a Most of it rating puts the swap first", () => {
    expect(orderSwaps(swaps, rate({}, "c", 80)).map((s) => s.id)).toEqual(["c", "a", "b"])
  })
})

describe("quotesFor", () => {
  const bs = [
    { id: "b3", need: "relief", limiting: "A cigarette is the only thing" },
    { id: "b12", need: "relief", limiting: "Other line" },
    { id: "b4", need: "sleep", limiting: "Sleep line" },
  ]
  it("keeps only beliefs rated 3 or more once the test is taken", () => {
    expect(quotesFor(bs, "relief", { b3: 5, b12: 1 })).toEqual({ lines: ["A cigarette is the only thing"], people: false })
    expect(quotesFor(bs, "relief", { b3: 2, b12: 1 })).toEqual({ lines: [], people: false })
  })
  it("shows all lines under 'people' when the test was not taken", () => {
    expect(quotesFor(bs, "relief", {})).toEqual({ lines: ["A cigarette is the only thing", "Other line"], people: true })
  })
})

describe("firstScreen", () => {
  const picked = ["relief", "sleep"]
  it("nothing -> pick; picks no list -> the next screen; a list or a finished walk -> result", () => {
    expect(firstScreen(EMPTY_GIVES, picked)).toBe(1)
    expect(firstScreen({ ...EMPTY_GIVES, done: 1 }, picked)).toBe(2)
    expect(firstScreen({ ...EMPTY_GIVES, done: 2 }, picked)).toBe(3)
    expect(firstScreen({ ...EMPTY_GIVES, done: 3 }, picked)).toBe(4)
    expect(firstScreen(addTried({ ...EMPTY_GIVES, done: 2 }, "a", "2026-11-19"), picked)).toBe(4)
    expect(firstScreen(addOwn({ ...EMPTY_GIVES, done: 2 }, "sleep", "walk", "2026-11-19", 1), picked)).toBe(4)
  })
})

describe("reminder file", () => {
  const url = "https://example.org/quit/nicotine/gives"
  const now = new Date("2026-11-19T10:00:00Z")
  const text = ratingIcs("2026-11-19", now, url)
  it("has one event and one alarm at its start, 7 days ahead at 19:00 for 30 minutes", () => {
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(text.match(/BEGIN:VALARM/g)).toHaveLength(1)
    expect(text).toContain("DTSTART:20261126T190000")
    expect(text).toContain("DTEND:20261126T193000")
    expect(text).toContain("DTSTAMP:20261119T100000Z")
    expect(text).toContain("SUMMARY:Rate your swaps")
    expect(text).toContain("TRIGGER:PT0S")
    expect(text).toContain(url.replace(/,/g, "\\,"))
    expect(text).not.toContain("preview=1")
    expect(text.split("\r\n").every((l) => !l.includes("\n"))).toBe(true)
  })
  it("the Google link holds the same date and title", () => {
    const g = ratingGoogleUrl("2026-11-19", url)
    expect(g).toContain("dates=20261126T190000/20261126T193000")
    expect(g).toContain("text=Rate%20your%20swaps")
    expect(g).toContain(encodeURIComponent(url))
  })
})

describe("data and validator", () => {
  it("nicotine passes as a live file", () => {
    expect(validateAddiction(getAddiction("nicotine"), { live: true })).toEqual([])
  })
  const mutate = (fn: (d: ReturnType<typeof makeValid>) => void) => {
    const d = makeValid()
    fn(d)
    return validateAddiction(d, { live: true }).map((i) => i.path)
  }
  it("fails a need with no line, or a line over 8 words", () => {
    expect(mutate((d) => void delete d.needs[0].line)).toContain("needs[0].line")
    expect(mutate((d) => void (d.needs[0].line = "one two three four five six seven eight nine"))).toContain("needs[0].line")
  })
  it("fails a sourced swap with no counted or n", () => {
    expect(mutate((d) => void delete d.needs[0].swaps[0].counted)).toContain("needs[0].swaps[0].counted")
    expect(mutate((d) => void delete d.needs[0].swaps[0].n)).toContain("needs[0].swaps[0].n")
  })
  it("fails an n whose digits are in none of the quotes, and passes one that is (commas removed)", () => {
    expect(mutate((d) => void (d.needs[0].swaps[0].n = "9,999 people"))).toContain("needs[0].swaps[0].n")
    const ok = mutate((d) => {
      d.needs[0].swaps[0].refs[0] = { ...d.needs[0].swaps[0].refs[0], quote: "In 12,067 people the effect held." }
      d.needs[0].swaps[0].n = "12,067 people"
    })
    expect(ok).toEqual([])
  })
  it("does not ask a not-tested swap for counted or n", () => {
    expect(mutate((d) => void (d.needs[0].swaps[0] = { id: "x", text: "Breathe slowly", evidence: "none", refs: [] }))).toEqual([])
  })
  it("a draft file is not asked for a line", () => {
    const d = makeValid()
    delete d.needs[0].line
    expect(validateAddiction(d, { live: false })).toEqual([])
  })
})
