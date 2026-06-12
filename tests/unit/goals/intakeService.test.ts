import { describe, test, expect } from "vitest"
import { buildTaxonomyItems, taxonomyVersion, cosine, matchTaxonomy, pickSuggestions, effectivePillarScores, resolveIntake } from "@/src/goals/intakeService"
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

describe("resolveIntake (clarifying questions)", () => {
  const it: TaxonomyItem[] = [
    { id: "health", kind: "pillar", pillarId: "health", label: "Health", text: "" },
    { id: "obj_a", kind: "objective", pillarId: "health", label: "A", text: "" },
    { id: "obj_b", kind: "objective", pillarId: "health", label: "B", text: "" },
  ]
  test("clear-winner objective auto-selects with no question", () => {
    const v = [[1, 0, 0], [1, 0, 0], [0, 1, 0]] // obj_a == query, obj_b orthogonal
    const r = resolveIntake(matchTaxonomy([1, 0, 0], it, v))
    expect(r.objectiveIds).toContain("obj_a")
    expect(r.clarifications).toHaveLength(0)
  })
  test("tied objectives → a clarifying question, nothing auto-selected", () => {
    const v = [[1, 0, 0], [0.95, 0.31, 0], [0.95, 0, 0.31]] // obj_a ≈ obj_b ≈ query
    const r = resolveIntake(matchTaxonomy([1, 0, 0], it, v))
    expect(r.objectiveIds).not.toContain("obj_a")
    expect(r.clarifications).toHaveLength(1)
    expect(r.clarifications[0].pillarId).toBe("health")
    expect(r.clarifications[0].prompt).toMatch(/Which Health goal/)
    expect(r.clarifications[0].options.map((o) => o.id).sort()).toEqual(["obj_a", "obj_b"])
  })
  test("seeds pillar + objective order by descending match score (best = rank #1)", () => {
    const it2: TaxonomyItem[] = [
      { id: "health", kind: "pillar", pillarId: "health", label: "Health", text: "" },
      { id: "obj_a", kind: "objective", pillarId: "health", label: "A", text: "" },
      { id: "wealth", kind: "pillar", pillarId: "wealth", label: "Wealth", text: "" },
      { id: "obj_w", kind: "objective", pillarId: "wealth", label: "W", text: "" },
    ]
    // query [1,0,0]: obj_w is an exact match (score 1), obj_a partial (0.707) → wealth ranks first.
    const v2 = [[0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 0]]
    const r = resolveIntake(matchTaxonomy([1, 0, 0], it2, v2))
    expect(r.pillarIds).toEqual(["wealth", "health"])
    expect(r.objectiveIds).toEqual(["obj_w", "obj_a"])
  })
  test("flags close-pillar pairs when two kept areas score near-equal", () => {
    const it3: TaxonomyItem[] = [
      { id: "vices", kind: "pillar", pillarId: "vices", label: "Vices", text: "" },
      { id: "obj_v", kind: "objective", pillarId: "vices", label: "V", text: "" },
      { id: "relations", kind: "pillar", pillarId: "relations", label: "Relations", text: "" },
      { id: "obj_r", kind: "objective", pillarId: "relations", label: "R", text: "" },
    ]
    // Both objectives match the query almost equally → areas are close.
    const v3 = [[0, 1, 0], [1, 0.02, 0], [0, 0, 1], [1, 0, 0.02]]
    const r = resolveIntake(matchTaxonomy([1, 0, 0], it3, v3))
    expect(r.closePillars.length).toBe(1)
    expect([r.closePillars[0].a, r.closePillars[0].b].sort()).toEqual(["relations", "vices"])
    expect(r.closePillars[0].prompt).toMatch(/Is this more about/)
  })
  test("does NOT flag close pillars when scores are far apart", () => {
    const it4: TaxonomyItem[] = [
      { id: "wealth", kind: "pillar", pillarId: "wealth", label: "Wealth", text: "" },
      { id: "obj_w", kind: "objective", pillarId: "wealth", label: "W", text: "" },
      { id: "health", kind: "pillar", pillarId: "health", label: "Health", text: "" },
      { id: "obj_a", kind: "objective", pillarId: "health", label: "A", text: "" },
    ]
    const v4 = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0.3, 0.95, 0]] // obj_w=1.0, obj_a≈0.3
    const r = resolveIntake(matchTaxonomy([1, 0, 0], it4, v4))
    expect(r.closePillars).toEqual([])
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
