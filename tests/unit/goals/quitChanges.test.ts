import { describe, it, expect } from "vitest"
import { newAccountPlan } from "@/src/goals/planStore"
import { setQuitHabit, setQuitDays, setQuitUrge, quitAreaId, habitOf, cleanDaysThisWeek, longestRun } from "@/src/goals/planSteps/extras/quitChanges"
import { setSeasonFocusSentence } from "@/src/goals/planSteps/planChanges"
import { planStatus } from "@/src/goals/planSteps/planStatus"
import { quitGoals } from "@/src/goals/planSteps/planFacts"

describe("quit changes", () => {
  it("makes an abstinence Practice goal in the vices area, a season goal when a season runs", () => {
    let p = setSeasonFocusSentence(newAccountPlan(), "A season", "2026-11-18")
    const made = setQuitHabit(p, "Vaping")!
    const g = made.plan.goals.find((x) => x.id === made.id)!
    expect(g).toMatchObject({ title: "No Vaping", isAbstinence: true, type: "habit_ramp", areaId: "vices", servesOneThing: true, targetDate: null })
    expect(made.plan.answers[`start:new:tier:${made.id}`]).toBe("season")
    expect(habitOf(g)).toBe("Vaping")
    expect(quitGoals(made.plan)).toHaveLength(1)
    p = made.plan
  })

  it("a second pick renames the goal and its urge line; blank makes nothing", () => {
    const a = setQuitHabit(newAccountPlan(), "Vaping")!
    const withUrge = setQuitUrge(a.plan, a.id, "Cold water")
    const b = setQuitHabit(withUrge, "Smoking")!
    expect(b.id).toBe(a.id)
    const g = b.plan.goals.find((x) => x.id === a.id)!
    expect(g.title).toBe("No Smoking")
    expect(g.obstacles[0]).toMatchObject({ what: "The urge: Smoking", counter: "Cold water" })
    expect(setQuitHabit(newAccountPlan(), "  ")).toBeNull()
  })

  it("falls back to a vice-named area, then the first area", () => {
    const base = newAccountPlan()
    expect(quitAreaId(base)).toBe("vices")
    const named = { ...base, areas: base.areas.map((a) => (a.id === "vices" ? { ...a, id: "x1", label: "Bad vices" } : a)) }
    expect(quitAreaId(named)).toBe("x1")
    const none = { ...base, areas: base.areas.filter((a) => a.id !== "vices") }
    expect(quitAreaId(none)).toBe(none.areas[0].id)
  })

  it("sets clean days and an ease-in that builds to seven; seven needs none", () => {
    const a = setQuitHabit(newAccountPlan(), "Weed")!
    let p = setQuitDays(a.plan, a.id, 5, true)
    let g = p.goals.find((x) => x.id === a.id)!
    expect(g.daysPerWeek).toBe(5)
    expect(g.rampSteps).toEqual([5, 6, 7].map((f) => ({ frequencyPerWeek: f, durationWeeks: 2 })))
    p = setQuitDays(p, a.id, 7, true)
    g = p.goals.find((x) => x.id === a.id)!
    expect(g.rampSteps).toBeNull()
  })

  it("the urge is one obstacle; a goal without one is a status reason, with one it is done", () => {
    const a = setQuitHabit(newAccountPlan(), "Gaming")!
    const today = "2026-11-18"
    expect(planStatus({ plan: a.plan, today, hour: 12 }).extras.quit.reasons.map((r) => r.id)).toEqual(["quit.no-urge-plan"])
    expect(setQuitUrge(a.plan, a.id, "  ")).toBe(a.plan)
    const p = setQuitUrge(setQuitUrge(a.plan, a.id, "Walk"), a.id, "Walk, then water")
    const g = p.goals.find((x) => x.id === a.id)!
    expect(g.obstacles).toHaveLength(1)
    expect(g.obstacles[0].counter).toBe("Walk, then water")
    expect(planStatus({ plan: p, today, hour: 12 }).extras.quit.state).toBe("done")
  })

  it("counts clean days this week and the longest run from the day counts", () => {
    const a = setQuitHabit(newAccountPlan(), "Porn")!
    const numbers = { "2026-11-09": { [a.id]: 1 }, "2026-11-10": { [a.id]: 1 }, "2026-11-11": { [a.id]: 1 }, "2026-11-13": { [a.id]: 1 }, "2026-11-18": { [a.id]: 1 } }
    const p = { ...a.plan, numbers }
    expect(cleanDaysThisWeek(p, a.id, "2026-11-18")).toBe(1)
    expect(cleanDaysThisWeek(p, a.id, "2026-11-12")).toBe(4)
    expect(longestRun(p, a.id)).toBe(3)
    expect(longestRun(a.plan, a.id)).toBe(0)
  })
})
