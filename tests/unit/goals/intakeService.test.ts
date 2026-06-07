import { describe, test, expect } from "vitest"
import { buildTaxonomyItems, taxonomyVersion, cosine, matchTaxonomy, pickSuggestions, effectivePillarScores } from "@/src/goals/intakeService"
import type { TaxonomyItem } from "@/src/goals/intakeService"

describe("cosine", () => {
  test("identical → 1, orthogonal → 0", () => {
    expect(cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
    expect(cosine([1, 0, 0], [0, 1, 0])).toBeCloseTo(0)
    expect(cosine([1, 1, 0], [2, 2, 0])).toBeCloseTo(1) // direction, not magnitude
  })
  test("zero vector → 0 (no NaN)", () => {
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })
})

const items: TaxonomyItem[] = [
  { id: "health", kind: "pillar", pillarId: "health", label: "Health", text: "" },
  { id: "wealth", kind: "pillar", pillarId: "wealth", label: "Wealth", text: "" },
  { id: "obj_strong", kind: "objective", pillarId: "health", label: "Get Strong", text: "" },
  { id: "obj_income", kind: "objective", pillarId: "wealth", label: "Build Income", text: "" },
]
const vecs = [
  [1, 0, 0, 0],     // health
  [0, 1, 0, 0],     // wealth
  [0.9, 0, 0.2, 0], // obj_strong ~ health
  [0, 0.9, 0, 0.2], // obj_income ~ wealth
]

describe("matchTaxonomy", () => {
  test("ranks the pillar + objective nearest the query first", () => {
    const m = matchTaxonomy([1, 0, 0, 0], items, vecs) // query ≈ health
    expect(m.pillars[0].id).toBe("health")
    expect(m.objectives[0].id).toBe("obj_strong")
  })
})

describe("effectivePillarScores", () => {
  test("an abstract pillar inherits its best concrete objective's score", () => {
    // 'vices' pillar text matches the query weakly, but its objective matches strongly.
    const it: TaxonomyItem[] = [
      { id: "vices", kind: "pillar", pillarId: "vices", label: "Vices", text: "" },
      { id: "health", kind: "pillar", pillarId: "health", label: "Health", text: "" },
      { id: "obj_nofap", kind: "objective", pillarId: "vices", label: "Quit Porn", text: "" },
    ]
    const v = [[0.2, 0, 0], [0, 1, 0], [1, 0, 0]]
    const eff = effectivePillarScores(matchTaxonomy([1, 0, 0], it, v))
    expect(eff[0].id).toBe("vices")       // boosted above health via its objective
    expect(eff[0].score).toBeGreaterThan(0.9)
  })
})

describe("pickSuggestions", () => {
  test("suggests the matched pillar + only its in-pillar objectives", () => {
    const m = matchTaxonomy([1, 0, 0, 0], items, vecs)
    const s = pickSuggestions(m, { objectiveThreshold: 0.5 })
    expect(s.pillarIds).toContain("health")
    expect(s.pillarIds).not.toContain("wealth")
    expect(s.objectiveIds).toContain("obj_strong")
    expect(s.objectiveIds).not.toContain("obj_income") // excluded — wealth wasn't suggested
  })
  test("relative bar keeps a runner-up pillar that's close to the top", () => {
    // health top, wealth ~88% of top → kept; meaning near-zero → dropped.
    const it: TaxonomyItem[] = [
      { id: "health", kind: "pillar", pillarId: "health", label: "Health", text: "" },
      { id: "wealth", kind: "pillar", pillarId: "wealth", label: "Wealth", text: "" },
      { id: "meaning", kind: "pillar", pillarId: "meaning", label: "Meaning", text: "" },
    ]
    const v = [[1, 0, 0], [0.88, 0, 0.47], [0, 0, 1]]
    const s = pickSuggestions(matchTaxonomy([1, 0, 0], it, v), { topRatio: 0.6 })
    expect(s.pillarIds.sort()).toEqual(["health", "wealth"])
  })
  test("never strands the user — returns ≥ minPillars even when nothing matches", () => {
    const m = matchTaxonomy([0, 0, 0, 1], items, vecs)
    expect(pickSuggestions(m, { minPillars: 1 }).pillarIds.length).toBeGreaterThanOrEqual(1)
  })
})

describe("buildTaxonomyItems / taxonomyVersion", () => {
  test("covers all 5 pillars + objectives, all with embeddable text", () => {
    const built = buildTaxonomyItems()
    expect(built.filter((i) => i.kind === "pillar").map((p) => p.id).sort()).toEqual(["health", "meaning", "relations", "vices", "wealth"])
    expect(built.some((i) => i.id === "obj_nofap")).toBe(true)
    expect(built.every((i) => i.text.trim().length > 0)).toBe(true)
  })
  test("version changes when item text changes (cache invalidation)", () => {
    const a = buildTaxonomyItems()
    const v1 = taxonomyVersion(a)
    const b = a.map((i, idx) => (idx === 0 ? { ...i, text: i.text + " X" } : i))
    expect(taxonomyVersion(b)).not.toBe(v1)
  })
})
