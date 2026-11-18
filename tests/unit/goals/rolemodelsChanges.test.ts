import { describe, it, expect } from "vitest"
import { newAccountPlan } from "@/src/goals/planStore"
import { addToLineup, removeFromLineup, setTaken, setWeekValue, setRemind, setMark } from "@/src/goals/planSteps/extras/rolemodelsChanges"
import { lineupIds, lineupTaken } from "@/src/goals/planSteps/planFacts"
import { planStatus } from "@/src/goals/planSteps/planStatus"

describe("role models changes", () => {
  it("keeps at most five people, no repeats, in order", () => {
    let p = newAccountPlan()
    for (const id of ["a", "b", "a", "c", "d", "e", "f"]) p = addToLineup(p, id)
    expect(lineupIds(p)).toEqual(["a", "b", "c", "d", "e"])
  })

  it("takes 1 to 5 values from someone in the lineup; none or a stranger changes nothing", () => {
    let p = addToLineup(newAccountPlan(), "a")
    expect(setTaken(p, "a", [])).toBe(p)
    expect(setTaken(p, "zzz", ["Courage"])).toBe(p)
    p = setTaken(p, "a", ["Courage", "Courage", "Calm", "A", "B", "C", "D"])
    expect(lineupTaken(p, "a")).toEqual(["Courage", "Calm", "A", "B", "C"])
  })

  it("removing a person drops what was taken from them", () => {
    let p = setTaken(addToLineup(newAccountPlan(), "a"), "a", ["Courage"])
    p = removeFromLineup(p, "a")
    expect(lineupIds(p)).toEqual([])
    expect(lineupTaken(p, "a")).toEqual([])
  })

  it("stamps the week's value with this Monday; last week's value is a reason", () => {
    let p = addToLineup(newAccountPlan(), "a")
    p = setWeekValue(p, "Courage", "2026-11-11")
    expect(p.answers["start:new:lineup-week-of"]).toBe("2026-11-09")
    expect(planStatus({ plan: p, today: "2026-11-18", hour: 12 }).extras.rolemodels.reasons.map((r) => r.id)).toEqual(["rolemodels.week-old"])
    p = setWeekValue(p, "Courage", "2026-11-18")
    expect(planStatus({ plan: p, today: "2026-11-18", hour: 12 }).extras.rolemodels.state).toBe("done")
    p = setWeekValue(p, null, "2026-11-18")
    expect(p.answers["start:new:lineup-week-value"]).toBeUndefined()
  })

  it("stores the reminder choice and the day's mark", () => {
    let p = setRemind(newAccountPlan(), true, 8)
    expect(p.answers["start:new:lineup-remind"]).toBe("1")
    expect(p.answers["start:new:lineup-hour"]).toBe("8")
    p = setRemind(p, false, 99)
    expect(p.answers["start:new:lineup-remind"]).toBeUndefined()
    expect(p.answers["start:new:lineup-hour"]).toBe("23")
    p = setMark(p, "2026-11-18", "lived")
    expect(p.answers["start:new:lineup-mark:2026-11-18"]).toBe("lived")
    expect(setMark(p, "2026-11-18", null).answers["start:new:lineup-mark:2026-11-18"]).toBeUndefined()
  })
})
