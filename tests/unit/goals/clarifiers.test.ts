import { describe, it, expect } from "vitest"
import { OBJECTIVES, PILLARS, getPrimaryTemplateForObjective } from "@/src/goals/data/newGoalFramework"
import { AUTHORED_CLARIFIERS, clarifierPrompt, clarifierOption } from "@/src/goals/components/new-goals/clarifiers"

describe("question-tree clarifiers", () => {
  // The objective-level question applies getPrimaryTemplateForObjective(option). If any objective
  // had no template, clicking that option would silently no-op. Guard the whole taxonomy.
  it("every objective maps to a primary template", () => {
    const orphans = OBJECTIVES.filter((o) => getPrimaryTemplateForObjective(o.id) === null).map((o) => o.id)
    expect(orphans).toEqual([])
  })

  it("uses authored prompt for known areas, generic fallback otherwise", () => {
    expect(clarifierPrompt("relations", "Relations")).toBe(AUTHORED_CLARIFIERS.relations.prompt)
    expect(clarifierPrompt("not_a_pillar", "Mystery")).toMatch(/Mystery/)
  })

  it("authored clarifiers key real pillars + real objectives in that pillar", () => {
    const objById = new Map(OBJECTIVES.map((o) => [o.id, o]))
    const pillarIds = new Set(PILLARS.map((p) => p.id))
    for (const [pid, clar] of Object.entries(AUTHORED_CLARIFIERS)) {
      expect(pillarIds.has(pid), `clarifier pillar ${pid} exists`).toBe(true)
      for (const objId of Object.keys(clar.options ?? {})) {
        const obj = objById.get(objId)
        expect(obj, `objective ${objId} exists`).toBeTruthy()
        expect(obj!.pillarId, `objective ${objId} belongs to ${pid}`).toBe(pid)
      }
    }
  })

  it("clarifierOption returns override copy when authored, undefined otherwise", () => {
    expect(clarifierOption("relations", "obj_girlfriend")?.label).toBeTruthy()
    expect(clarifierOption("relations", "obj_nonexistent")).toBeUndefined()
    expect(clarifierOption("vices", "obj_sober")).toBeUndefined() // vices has prompt but no option overrides
  })
})
