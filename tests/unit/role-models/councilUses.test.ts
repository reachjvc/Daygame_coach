import { describe, expect, it } from "vitest"

import { peopleForArea } from "@/src/role-models/catalog"
import { councilValueSuggestions, memberForDay, quoteForDay, type CouncilMember } from "@/src/role-models/councilTypes"
import type { RoleModelPerson } from "@/src/role-models/types"
import good from "@/tests/fixtures/role-models/good.json"

const m = (id: string, position: number, takenValues: string[]): CouncilMember => ({ roleModelId: id, position, takenValues, addedAt: "" })

describe("today's council member", () => {
  it("rotates by day through the council, in order, and the next day brings the next", () => {
    const two = ["a", "b"]
    const day1 = memberForDay(two, "2026-11-10")
    const day2 = memberForDay(two, "2026-11-11")
    expect(day1).not.toBe(day2)
    expect(memberForDay(two, "2026-11-12")).toBe(day1)
    expect(new Set(["2026-11-10", "2026-11-11", "2026-11-12"].map((d) => memberForDay(["a", "b", "c"], d)))).toEqual(new Set(["a", "b", "c"]))
  })

  it("is nobody for an empty council", () => {
    expect(memberForDay([], "2026-11-10")).toBeNull()
  })

  it("keeps a quote for a week, then moves on", () => {
    const qs = ["q1", "q2"]
    // 2026-11-12 is day 20404, a multiple of 7: a new week starts there.
    expect(quoteForDay(qs, "2026-11-12")).toBe(quoteForDay(qs, "2026-11-18"))
    expect(quoteForDay(qs, "2026-11-12")).not.toBe(quoteForDay(qs, "2026-11-19"))
    expect(quoteForDay([], "2026-11-12")).toBeNull()
  })
})

describe("From your council, in the values step", () => {
  it("offers only values not yet in the plan, once each, tagged with who", () => {
    const council = [m("b", 1, ["Courage", "Wisdom"]), m("a", 0, ["Discipline", "courage"])]
    expect(councilValueSuggestions(council, { a: "Marcus", b: "Seneca" }, ["wisdom"])).toEqual([
      { value: "Discipline", from: "Marcus" },
      { value: "courage", from: "Marcus" },
    ])
  })
})

describe("people per area", () => {
  const make = (id: string, status: RoleModelPerson["review"]["status"], areaIds: string[], category = "teachers") => {
    const p = structuredClone(good) as unknown as RoleModelPerson
    return { ...p, id, name: id.toUpperCase(), areaIds, category, review: { ...p.review, status } }
  }
  const all = [
    make("val-a", "validated", ["lm_money"], "builders"),
    make("val-b", "validated", ["lm_money"], "money"),
    make("val-c", "validated", ["lm_money"], "teachers"),
    make("val-d", "validated", ["lm_money"], "athletes"),
    make("val-e", "validated", ["lm_fun"]),
    make("flag", "flagged", ["lm_money"], "money"),
    make("excl", "excluded", ["lm_money"], "money"),
    make("draft", "draft", ["lm_money"], "money"),
    make("gone", "proposed-remove", ["lm_money"], "money"),
  ]

  it("never offers a flagged, excluded, draft or proposed-remove person", () => {
    const ids = peopleForArea("lm_money", ["flag", "excl"], 10, all).map((p) => p.id)
    expect(ids).toEqual(expect.not.arrayContaining(["flag", "excl", "draft", "gone"]))
    expect(ids.sort()).toEqual(["val-a", "val-b", "val-c", "val-d"])
  })

  it("puts your council first, then categories that serve the area, at most three", () => {
    const people = peopleForArea("lm_money", ["val-d"], 3, all)
    expect(people.map((p) => p.id)).toEqual(["val-d", "val-a", "val-b"])
    expect(people[0].inCouncil).toBe(true)
    expect(people[0].startedFrom).toBeTruthy()
  })

  it("offers nobody for an area nobody lived", () => {
    expect(peopleForArea("lm_spirituality", [], 3, all)).toEqual([])
  })
})
