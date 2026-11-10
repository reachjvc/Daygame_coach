import { describe, expect, it } from "vitest"

import { cardOf, filterCards, initialsOf, possessiveOf, shownPeople, shownPerson, yearsLabel } from "@/src/role-models/catalog"
import type { RoleModelPerson } from "@/src/role-models/types"
import good from "@/tests/fixtures/role-models/good.json"

const person = (id: string, name: string, status: RoleModelPerson["review"]["status"], words: string[] = ["Discipline", "courage", "Learning"]) => {
  const p = structuredClone(good) as unknown as RoleModelPerson
  p.id = id
  p.name = name
  p.review.status = status
  p.values = words.map((w, i) => ({ ...structuredClone(p.values[i % p.values.length]), word: w }))
  return p
}

const all = [
  person("b", "Bea Validated", "validated"),
  person("a", "Al Validated", "validated", ["Honesty", "Patience", "Wisdom", "Humility"]),
  person("f", "Flo Flagged", "flagged"),
  person("d", "Dan Draft", "draft"),
  person("x", "Xi Excluded", "excluded"),
  person("r", "Ra Proposed", "proposed-remove"),
]

describe("what the library shows", () => {
  it("shows only validated people, by name", () => {
    expect(shownPeople(all).map((p) => p.id)).toEqual(["a", "b"])
  })

  it("gives no page to a flagged, draft, excluded or proposed-remove person", () => {
    for (const id of ["f", "d", "x", "r"]) expect(shownPerson(id, all)).toBeNull()
    expect(shownPerson("a", all)?.name).toBe("Al Validated")
  })
})

describe("cards", () => {
  const cards = shownPeople(all).map(cardOf)

  it("carry the top three values in the list's own spelling", () => {
    expect(cards.find((c) => c.id === "b")?.values).toEqual(["Discipline", "Courage", "Learning"])
    expect(cards.find((c) => c.id === "a")?.values).toEqual(["Honesty", "Patience", "Wisdom"])
  })

  it("search by any value word, also the fourth, and by name", () => {
    expect(filterCards(cards, "humility", null).map((c) => c.id)).toEqual(["a"])
    expect(filterCards(cards, "  COURAGE ", null).map((c) => c.id)).toEqual(["b"])
    expect(filterCards(cards, "bea", null).map((c) => c.id)).toEqual(["b"])
    expect(filterCards(cards, "", null)).toHaveLength(2)
    expect(filterCards(cards, "", "teachers")).toHaveLength(2)
    expect(filterCards(cards, "", "sages")).toHaveLength(0)
  })
})

describe("labels", () => {
  it("years for the dead, the living and BC", () => {
    expect(yearsLabel({ born: 121, died: 180 })).toBe("121–180")
    expect(yearsLabel({ born: 1989, died: null })).toBe("born 1989")
    expect(yearsLabel({ born: -356, died: -323 })).toBe("356 BC–323 BC")
    expect(yearsLabel({ born: "c. 4 BC", died: 65 })).toBe("c. 4 BC–65")
    expect(yearsLabel({ born: null, died: null })).toBe("living")
  })

  it("initials", () => {
    expect(initialsOf("Marcus Aurelius")).toBe("MA")
    expect(initialsOf("Jay-Z")).toBe("J")
    expect(initialsOf("Martin Luther King Jr.")).toBe("MK")
    expect(initialsOf("Søren Kierkegaard")).toBe("SK")
  })

  it("her for a woman, his otherwise", () => {
    expect(possessiveOf({ pronoun: "she" }).title).toBe("Her")
    expect(possessiveOf({}).title).toBe("His")
  })
})
