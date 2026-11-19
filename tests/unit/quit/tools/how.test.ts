import { describe, expect, it } from "vitest"
import { getAddiction } from "@/src/quit/data"
import { buildSections, FACT_SECTION, headlineAfterBig, outsideHelp } from "@/src/quit/tools/how/logic"
import type { QuitBesides, QuitFact, QuitNumber } from "@/src/quit/types"

const raw = getAddiction("nicotine")!
const data = raw as unknown as { numbers: QuitNumber[]; hope: QuitNumber; facts: QuitFact[]; besides: QuitBesides[] }

describe("how: headline after the big figure", () => {
  it("drops a leading repeat of the figure", () => {
    expect(headlineAfterBig("About 19 in 100 Americans were free.", "About 19 in 100")).toBe("Americans were free.")
    expect(headlineAfterBig("Anxiety fell from the first week off.", "Anxiety fell")).toBe("from the first week off.")
  })
  it("keeps a headline that only contains the figure later, or is only the figure", () => {
    expect(headlineAfterBig("Of tries, 3–5 in 100 lasted.", "3–5 in 100")).toBe("Of tries, 3–5 in 100 lasted.")
    expect(headlineAfterBig("84 in 100", "84 in 100")).toBe("84 in 100")
  })
  it("ignores case", () => {
    expect(headlineAfterBig("at least 25 in 100 men improved", "At least 25 in 100")).toBe("men improved")
  })
})

describe("how: sections", () => {
  const sections = buildSections(data.numbers as QuitNumber[], data.hope as QuitNumber, data.facts)
  const kinds = (s: string) => sections.find((x) => x.section === s)!.items.map((i) => (i.type === "number" ? i.n.kind : i.f.id))

  it("shows every number once besides the hero, and every fact once", () => {
    const all = sections.flatMap((s) => s.items)
    expect(all.filter((i) => i.type === "number")).toHaveLength(data.numbers.length - 1)
    expect(all.filter((i) => i.type === "fact").map((i) => (i.type === "fact" ? i.f.id : "")).sort()).toEqual(["f1", "f2", "f3"])
  })
  it("puts the second hope number under who gets free, and facts where they belong", () => {
    expect(sections.map((s) => s.section)).toEqual(["who", "how", "helps", "after"])
    expect(kinds("who")).toEqual(["hope-lifetime", "who-years"])
    expect(kinds("how")).toContain("f3")
    expect(kinds("helps")).toContain("f1")
    expect(kinds("after")).toContain("f2")
    expect(FACT_SECTION.f1).toBe("helps")
  })
  it("no big figure is a time stamp (RULEBOOK 12c)", () => {
    for (const n of data.numbers) if (!n.timeIsResult) expect(n.big).not.toMatch(/^(week|day|year|month)s?\b|\b(hours|days|weeks|years)$/i)
  })
})

describe("how: outside help", () => {
  it("keeps the four services and leaves out tips and the unsourced forum", () => {
    expect(outsideHelp(data.besides).map((b) => b.id)).toEqual(["quitline-us", "quitline-uk", "smokefree-gov", "nhs-services"])
  })
})
