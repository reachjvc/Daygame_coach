import { describe, it, expect } from "vitest"
import { newAccountPlan } from "@/src/goals/planStore"
import { addRating, addRatings, setRatingScale, scaleOf, ratingStrip } from "@/src/goals/planSteps/extras/selfratingsChanges"
import { fieldScale } from "@/src/goals/planSteps/planFacts"

describe("daily ratings changes", () => {
  it("a new account already has the feeling rating on a 1 to 5 scale", () => {
    const p = newAccountPlan()
    expect(p.fields.find((f) => f.id === "f_feeling")).toMatchObject({ kind: "number" })
    expect(scaleOf(p, "f_feeling")).toBe("five")
  })

  it("adds a rating once and sets its scale and unit", () => {
    const a = addRating(newAccountPlan(), "How well did I sleep?")
    expect(a.id).toBeTruthy()
    expect(addRating(a.plan, "how well did i sleep?").id).toBeNull()
    expect(addRatings(a.plan, ["A", "B", "A"]).ids).toHaveLength(2)
    let p = setRatingScale(a.plan, a.id!, "ten", "")
    expect(fieldScale(p, a.id!)).toBe(10)
    p = setRatingScale(p, a.id!, "number", " hours ")
    expect(scaleOf(p, a.id!)).toBe("number")
    expect(p.answers[`start:new:rating-unit:${a.id}`]).toBe("hours")
    p = setRatingScale(p, a.id!, "five", "hours")
    expect(p.answers[`start:new:rating-unit:${a.id}`]).toBeUndefined()
  })

  it("refuses a scale for a field that is not a number question", () => {
    const p = newAccountPlan()
    expect(setRatingScale(p, "ghost", "ten", "")).toBe(p)
  })

  it("builds a 14-day strip ending today, oldest first", () => {
    const p = { ...newAccountPlan(), numbers: { "2026-11-18": { f_feeling: 4 }, "2026-11-05": { f_feeling: 2 } } }
    const strip = ratingStrip(p, "f_feeling", "2026-11-18")
    expect(strip).toHaveLength(14)
    expect(strip[0]).toEqual({ date: "2026-11-05", value: 2 })
    expect(strip[13]).toEqual({ date: "2026-11-18", value: 4 })
    expect(strip[5].value).toBeNull()
  })
})
