import { describe, it, expect } from "vitest"
import { newAccountPlan } from "@/src/goals/planStore"
import { addField, addFields, setFieldWhere, setFieldKind, isPlanLink } from "@/src/goals/planSteps/extras/questionsChanges"
import { planStatus } from "@/src/goals/planSteps/planStatus"

describe("questions changes", () => {
  it("adds a question once; blanks and repeats add nothing", () => {
    const a = addField(newAccountPlan(), "What did you learn today?", "write")
    expect(a.id).toBeTruthy()
    expect(addField(a.plan, " what did you learn today? ", "write").id).toBeNull()
    expect(addField(a.plan, "  ", "write").id).toBeNull()
    const set = addFields(a.plan, ["One", "Two", "One"], "write")
    expect(set.ids).toHaveLength(2)
  })

  it("starts the module once a write question exists", () => {
    const plan = addField(newAccountPlan(), "Q", "write").plan
    expect(planStatus({ plan, today: "2026-11-18", hour: 12 }).extras.questions.state).toBe("done")
  })

  it("sets where it shows, and refuses an id it does not have", () => {
    const a = addField(newAccountPlan(), "Q", "write")
    expect(setFieldWhere(a.plan, a.id!, "s9").fields.find((f) => f.id === a.id)!.targetId).toBe("s9")
    expect(setFieldWhere(a.plan, "nope", "s9")).toBe(a.plan)
  })

  it("a go question needs a link inside the new version", () => {
    const a = addField(newAccountPlan(), "Q", "write")
    expect(setFieldKind(a.plan, a.id!, "go", "https://example.com")).toBe(a.plan)
    expect(setFieldKind(a.plan, a.id!, "go", "/plan/sandbox")).toBe(a.plan)
    const ok = setFieldKind(a.plan, a.id!, "go", "/plan/new/track")
    expect(ok.fields.find((f) => f.id === a.id)).toMatchObject({ kind: "go", readSourceId: "/plan/new/track" })
    expect(isPlanLink("/plan/new")).toBe(true)
  })

  it("a read question stores its source; flipping back to write clears it and a dead source is a reason", () => {
    const a = addField(newAccountPlan(), "Q", "write")
    const read = setFieldKind(a.plan, a.id!, "read", "star")
    expect(read.fields.find((f) => f.id === a.id)).toMatchObject({ kind: "read", readSourceId: "star" })
    const s = planStatus({ plan: { ...read, fields: read.fields.concat({ id: "fx", label: "x", targetId: null, kind: "write", readSourceId: null }) }, today: "2026-11-18", hour: 12 })
    expect(s.extras.questions.reasons.map((r) => r.id)).toEqual(["questions.dead-read"])
    expect(setFieldKind(read, a.id!, "write", null).fields.find((f) => f.id === a.id)!.readSourceId).toBeNull()
  })
})
