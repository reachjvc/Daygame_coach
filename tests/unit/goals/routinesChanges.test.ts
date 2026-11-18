import { describe, it, expect } from "vitest"
import { newAccountPlan } from "@/src/goals/planStore"
import { addRoutines, makeRoutine, setRoutineSteps, setRoutineWhen, setStepTimes, setSplit, setServes, parseClock, clockText, totalMinutes, libraryKeyOf } from "@/src/goals/planSteps/extras/routinesChanges"
import { planStatus } from "@/src/goals/planSteps/planStatus"

const step = (title: string, minutes = 0) => ({ title, minutes, goesTo: null, asks: null })
const withRoutine = () => {
  const made = makeRoutine(newAccountPlan(), "morning", "Morning")!
  return { plan: made.plan, id: made.id }
}

describe("routines changes", () => {
  it("makes an empty routine with no days, serving every area", () => {
    const { plan, id } = withRoutine()
    const r = plan.routines.find((x) => x.id === id)!
    expect(r).toMatchObject({ blueprintId: "morning", kind: "sequence", steps: [], daysPerWeek: 0 })
    expect(r.serves.length).toBe(plan.areas.length)
    expect(makeRoutine(plan, "own", "  ")).toBeNull()
  })

  it("skips picks it has and gives ids in order; training is weekly, own has no blueprint", () => {
    const a = addRoutines(newAccountPlan(), [{ pick: "morning", label: "Morning" }, { pick: "training", label: "Training" }], ["Sunday reset"])
    expect(a.ids).toHaveLength(3)
    expect(a.plan.routines.map((r) => [r.blueprintId, r.kind])).toEqual([["morning", "sequence"], ["workout", "weekly"], ["", "sequence"]])
    const b = addRoutines(a.plan, [{ pick: "morning", label: "Morning" }], ["sunday reset"])
    expect(b.ids).toEqual([])
    expect(libraryKeyOf(a.plan.routines[1])).toBe("training")
    expect(libraryKeyOf(a.plan.routines[2])).toBeNull()
  })

  it("sets steps in order, keeps a kept step's id and days, drops the rest", () => {
    let { plan, id } = withRoutine()
    plan = setRoutineSteps(plan, id, [step("Glass of water", 1), step("Bed made", 2)])
    plan = setRoutineWhen(plan, id, [0, 2], 450)
    const keptId = plan.routines[0].steps[0].id
    plan = setRoutineSteps(plan, id, [step("Read 10 pages", 10), step("Glass of water", 3), step("  ")])
    const steps = plan.routines[0].steps
    expect(steps.map((s) => s.title)).toEqual(["Read 10 pages", "Glass of water"])
    expect(steps[1].id).toBe(keptId)
    expect(steps[1]).toMatchObject({ minutes: 3, days: [0, 2], startMin: 450 })
    expect(totalMinutes(plan.routines[0])).toBe(13)
  })

  it("stores where a step opens and the question it asks", () => {
    let { plan, id } = withRoutine()
    plan = setRoutineSteps(plan, id, [{ title: "Read your lines", minutes: 1, goesTo: "answer:affirmations", asks: " What is the main job? " }])
    expect(plan.routines[0].steps[0]).toMatchObject({ goesTo: "answer:affirmations", asks: "What is the main job?", libraryStepId: null })
  })

  it("an ordered routine gets its days on every step and on the routine; no days before it is set", () => {
    let { plan, id } = withRoutine()
    plan = setRoutineSteps(plan, id, [step("Bed made")])
    const today = "2026-11-18"
    expect(plan.routines[0]).toMatchObject({ daysPerWeek: 0 })
    expect(plan.routines[0].steps[0].days).toEqual([])
    plan = setRoutineWhen(plan, id, [4, 1, 1, 9], null)
    expect(plan.routines[0].daysPerWeek).toBe(2)
    expect(plan.routines[0].steps[0].days).toEqual([1, 4])
    expect(planStatus({ plan, today, hour: 12 }).extras.routines.state).toBe("done")
  })

  it("a weekly routine takes times a week per step; a split names days; serves sets areas and a step's goal", () => {
    let plan = addRoutines(newAccountPlan(), [{ pick: "training", label: "Training" }], []).plan
    const id = plan.routines[0].id
    plan = setRoutineSteps(plan, id, [step("Main lifts")])
    plan = setStepTimes(plan, id, plan.routines[0].steps[0].id, 3)
    expect(plan.routines[0].steps[0].daysPerWeek).toBe(3)
    plan = setSplit(plan, id, ["Push", " ", "Pull"])
    expect(plan.routines[0].splitDays.map((d) => d.name)).toEqual(["Push", "Pull"])
    plan = setServes(plan, id, ["health", "nope"], { [plan.routines[0].steps[0].id]: "ghost" })
    expect(plan.routines[0].serves).toEqual(["health"])
    expect(plan.routines[0].steps[0].servesGoalIds).toEqual([])
  })

  it("reads and writes clock text", () => {
    expect(parseClock("07:30")).toBe(450)
    expect(parseClock("25:00")).toBeNull()
    expect(parseClock("x")).toBeNull()
    expect(clockText(450)).toBe("07:30")
    expect(clockText(null)).toBe("")
  })
})
