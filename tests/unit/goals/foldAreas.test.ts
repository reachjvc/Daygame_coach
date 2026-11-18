import { describe, it, expect } from "vitest"
import { emptyNsPlan, addGoal, addArea } from "@/src/goals/northStarService"
import { foldAreas, foldedNotes, matchOldAreas } from "@/src/goals/planSteps/foldAreas"
import { activeAreas, hiddenAreaIds } from "@/src/goals/planSteps/planFacts"
import { PLAN_AREAS } from "@/src/goals/planSteps/copy/planAreas"
import { addAction, setSeasonAreas } from "@/src/goals/planSteps/planChanges"
import { newAccountPlan } from "@/src/goals/planStore"
import type { NsPlan } from "@/src/goals/types"

function oldCopy(): NsPlan {
  let p = emptyNsPlan()
  p = addGoal(p, "lm_fitness", "Bench 100")
  p = addGoal(p, "lm_money", "Save 5k")
  p = addGoal(p, "lm_relationship", "Date more")
  p = addAction(p, p.goals[0].id, "Train", 3)
  p = setSeasonAreas(p, ["lm_fitness", "lm_money", "lm_relationship"])
  p = { ...p, experiences: [{ id: "x1", title: "Surf", areaId: "lm_fun", done: false } as unknown as NsPlan["experiences"][number]], review: { ...p.review, lm_emotions: { ten: "", purpose: "calm matters", snapshot: "grey weeks", goalsAim: null, blockers: "", values: [], identity: "" } }, daily: { "2026-01-01": { lm_emotions: 6 } } }
  return p
}

const count = (p: NsPlan) => ({ goals: p.goals.length, routines: p.routines.length, steps: p.routines.flatMap((r) => r.steps).length, experiences: p.experiences.length, areas: p.areas.length })

describe("the new default areas", () => {
  it("a brand-new plan holds the eight, in his order, with one daily rating on Feeling about life", () => {
    const p = newAccountPlan()
    expect(p.areas.map((a) => a.label)).toEqual(["Dating & Daygame", "Health & Appearance", "Career & Finances", "Social Life", "Personal Growth", "Feeling about life", "Lifestyle", "Vices & Elimination"])
    expect(p.areas[0].sublabel).toBe(PLAN_AREAS[0].covers)
    expect(p.fields).toHaveLength(1)
    expect(p.fields[0]).toMatchObject({ kind: "number", label: "How great did life feel today?" })
    expect(p.answers["start:new:rating-area:f_feeling"]).toBe("feeling")
    expect(p.answers["start:new:rating-scale:f_feeling"]).toBe("5")
  })
})

describe("foldAreas", () => {
  it("moves goals, actions, experiences and season areas; deletes nothing; hides the old twelve", () => {
    const before = oldCopy()
    const { mapping, unmatched } = matchOldAreas(before)
    expect(unmatched).toEqual([])
    expect(Object.keys(mapping)).toHaveLength(12)
    const after = foldAreas(before, mapping)
    const c = count(after)
    expect(c.goals).toBe(count(before).goals)
    expect(c.routines).toBe(count(before).routines)
    expect(c.steps).toBe(count(before).steps)
    expect(c.experiences).toBe(count(before).experiences)
    expect(c.areas).toBe(12 + 8)
    expect(after.goals.map((g) => g.areaId)).toEqual(["health", "career", "dating"])
    expect(after.experiences[0].areaId).toBe("lifestyle")
    expect(after.seasonAreaIds).toEqual(["health", "career", "dating"])
    expect(after.routines.find((r) => r.steps.some((s) => s.title === "Train"))?.areaId).toBe("health")
    expect(activeAreas(after).map((a) => a.id)).toEqual(PLAN_AREAS.map((a) => a.id))
    expect(hiddenAreaIds(after).size).toBe(12)
    expect(after.daily).toEqual(before.daily)
    expect(after.review.lm_emotions).toEqual(before.review.lm_emotions)
  })
  it("shows the old per-area text on the new area", () => {
    const after = foldAreas(oldCopy(), matchOldAreas(oldCopy()).mapping)
    expect(foldedNotes(after, "feeling").map((n) => n.text)).toEqual(["grey weeks", "calm matters"])
    expect(foldedNotes(after, "dating")).toEqual([])
  })
  it("matches by name when the ids are not the old ones, and lists what it cannot match instead of guessing", () => {
    let p = newAccountPlan()
    p = { ...p, areas: [] }
    p = addArea(p, "FITNESS")
    p = addArea(p, "money")
    p = addArea(p, "Music")
    const { mapping, unmatched } = matchOldAreas(p)
    expect(Object.values(mapping).sort()).toEqual(["career", "health"])
    expect(unmatched.map((a) => a.label)).toEqual(["Music"])
    const after = foldAreas(p, mapping)
    expect(activeAreas(after).map((a) => a.label)).toContain("Music")
    expect(activeAreas(after).map((a) => a.label)).toContain("Health & Appearance")
    expect(after.areas).toHaveLength(3 + 8)
  })
  it("does nothing when there is nothing to fold, and the new eight match nothing", () => {
    const p = newAccountPlan()
    expect(matchOldAreas(p).mapping).toEqual({})
    expect(foldAreas(p, {})).toBe(p)
  })
})
