import { describe, it, expect } from "vitest"
import { newAccountPlan } from "@/src/goals/planStore"
import { addGoal, addRoutine, addDailyField, setAreaReview } from "@/src/goals/northStarService"
import { setStanding, standingOrder, areaFacts, standingNotes } from "@/src/goals/planSteps/extras/standingChanges"
import { findValues, mentions } from "@/src/goals/planSteps/extras/valuesFound"
import { addValues, setMostImportant, setValueServes, valuesNotes } from "@/src/goals/planSteps/extras/valuesChanges"
import { setIdentity, setLines, linesOf, setLinesWhere, linesWhere, showsStar, identityNotes } from "@/src/goals/planSteps/extras/identityChanges"
import { addThing, tickThing, chaseThing } from "@/src/goals/planSteps/extras/experiencesChanges"
import { addProblems, defaultGoalId, moveProblem, setFallback, findObstacle, obstaclesNotes } from "@/src/goals/planSteps/extras/obstaclesChanges"
import { setSeasonAreas, addAction } from "@/src/goals/planSteps/planChanges"
import { planStatus } from "@/src/goals/planSteps/planStatus"
import type { NsPlan } from "@/src/goals/types"

const TODAY = "2026-11-18"
const withGoal = (): { plan: NsPlan; goal: string } => {
  const p = addGoal(newAccountPlan(), "dating", "Talk to ten women", "achievement")
  return { plan: p, goal: p.goals[0].id }
}
const st = (plan: NsPlan) => planStatus({ plan, today: TODAY, hour: 12 })

describe("standing", () => {
  it("saves a line, never for an unknown area, and orders season areas first", () => {
    let p = setStanding(newAccountPlan(), "health", "Training again")
    expect(p.review.health.snapshot).toBe("Training again")
    expect(setStanding(p, "nope", "x")).toBe(p)
    p = setSeasonAreas(p, ["career"])
    expect(standingOrder(p)[0]).toBe("career")
    expect(standingOrder(p)).toHaveLength(8)
  })
  it("status: not started without a line; one line then the rest are missing", () => {
    expect(st(newAccountPlan()).extras.standing.state).toBe("not-started")
    const p = setStanding(newAccountPlan(), "health", "Training again")
    const s = st(p).extras.standing
    expect(s.state).toBe("needs-a-look")
    expect(s.reasons[0].id).toBe("standing.missing")
    expect(s.reasons[0].target).toMatch(/^standing\//)
  })
  it("counts goals and the week's planned against done for an area", () => {
    const { plan, goal } = withGoal()
    expect(areaFacts(plan, "dating", TODAY)).toEqual({ goals: 1, done: 0, planned: 0 })
    const acted = addAction(plan, goal, "Approach", 3)
    const step = acted.routines.flatMap((r) => r.steps).find((s) => s.title === "Approach")!.id
    const ticked = { ...acted, logged: { "2026-11-17": [step], "2026-11-16": [step] } }
    expect(areaFacts(ticked, "dating", TODAY)).toEqual({ goals: 1, done: 2, planned: 3 })
  })
  it("lists old per-area text as earlier notes", () => {
    const p = setAreaReview(newAccountPlan(), "health", { blockers: "Time", ten: "A strong body" })
    expect(standingNotes(p, "health").map((n) => n.topic)).toEqual(["review_blockers", "review_ten"])
  })
})

describe("values", () => {
  it("finds whole words only, skips chosen ones, and adds old and lineup values", () => {
    expect(mentions("I want freedom", "freedom")).toBe(true)
    expect(mentions("glove", "love")).toBe(false)
    let p = { ...newAccountPlan(), northStar: "A life of Freedom and love", currentValues: ["Status"] }
    p = { ...p, answers: { ...p.answers, "start:new:lineup": "x1", "start:new:lineup-take:x1": "Courage" } }
    const names = findValues(p, (id) => (id === "x1" ? "Someone" : null))
    const byValue = Object.fromEntries(names.map((f) => [f.value, f.sources.map((s) => s.kind)]))
    expect(byValue.Freedom).toContain("north_star")
    expect(byValue.Courage).toEqual(["person"])
    expect(byValue.Status).toEqual(["old"])
    expect(findValues({ ...p, values: ["freedom"] }).some((f) => f.value === "Freedom")).toBe(false)
  })
  it("appends without duplicates and puts the picks first in tap order, max three", () => {
    let p = addValues(newAccountPlan(), ["Love", "Freedom", "love", "Loyalty", "Honesty"])
    expect(p.values).toEqual(["Love", "Freedom", "Loyalty", "Honesty"])
    p = setMostImportant(p, ["Honesty", "Love", "Freedom", "Loyalty"])
    expect(p.values).toEqual(["Honesty", "Love", "Freedom", "Loyalty"])
  })
  it("marks which goals serve a value, and the status flags an unserved top value", () => {
    const { plan, goal } = withGoal()
    let p = addValues(plan, ["Courage"])
    expect(st(p).extras.values.reasons.map((r) => r.id)).toEqual(["values.unserved"])
    expect(st(p).extras.values.reasons[0].target).toBe("values/Courage/where")
    p = setValueServes(p, "Courage", [goal])
    expect(p.goals[0].values).toEqual(["Courage"])
    expect(st(p).extras.values.state).toBe("done")
    expect(setValueServes(p, "Courage", []).goals[0].values).toEqual([])
  })
  it("old season notes and area values are earlier notes", () => {
    expect(valuesNotes(setAreaReview(newAccountPlan(), "health", { values: ["Health"] }))).toHaveLength(1)
  })
})

describe("identity", () => {
  it("saves identity and lines, one per line", () => {
    let p = setIdentity(newAccountPlan(), "I show up")
    expect(p.answers.identity_total).toBe("I show up")
    p = setLines(p, [" I go first. ", "", "I keep my word"])
    expect(linesOf(p)).toEqual(["I go first.", "I keep my word"])
  })
  it("shows the lines on Today as a read field, replaced not stacked, and the status follows", () => {
    let p = setLines(newAccountPlan(), ["I go first."])
    expect(st(p).extras.identity.reasons.map((r) => r.id)).toEqual(["identity.unseen"])
    p = setLinesWhere(p, "today", true)
    expect(linesWhere(p)).toBe("today")
    expect(showsStar(p)).toBe(true)
    expect(p.fields.filter((f) => f.kind === "read")).toHaveLength(2)
    p = setLinesWhere(p, "today", false)
    expect(p.fields.filter((f) => f.kind === "read")).toHaveLength(1)
    expect(st(p).extras.identity.state).toBe("done")
    p = setLinesWhere(p, "none", false)
    expect(linesWhere(p)).toBe("none")
    expect(st(p).extras.identity.reasons).toHaveLength(1)
  })
  it("puts a step in the morning routine only when there is one, and removes it again", () => {
    let p = setLines(newAccountPlan(), ["I go first."])
    expect(setLinesWhere(p, "morning", false)).toBe(p)
    p = addRoutine(p, "morning")
    const before = p.routines[0].steps.length
    p = setLinesWhere(p, "morning", true)
    expect(linesWhere(p)).toBe("morning")
    expect(p.routines[0].steps.length).toBe(before + 2)
    p = setLinesWhere(p, "none", false)
    expect(p.routines[0].steps.length).toBe(before)
  })
  it("keeps untouched read fields of other sources", () => {
    const p = addDailyField(newAccountPlan(), null, "Own", "write")
    expect(setLinesWhere(p, "none", false).fields).toHaveLength(p.fields.length)
  })
  it("earlier notes carry the per-area identity under the area", () => {
    const p = setAreaReview(newAccountPlan(), "health", { identity: "Strong" })
    expect(identityNotes(p)).toEqual([{ topic: "review_identity:health", text: "Strong" }])
  })
})

describe("experiences", () => {
  it("adds, ticks with today's date, and is started but never has reasons", () => {
    let p = addThing(newAccountPlan(), "Learn to surf", "lifestyle")
    expect(p.experiences[0]).toMatchObject({ title: "Learn to surf", areaId: "lifestyle", done: false })
    p = tickThing(p, p.experiences[0].id, TODAY)
    expect(p.experiences[0]).toMatchObject({ done: true, doneOn: TODAY })
    expect(st(p).extras.experiences).toMatchObject({ state: "done", reasons: [] })
  })
  it("chasing makes a season Finish line goal and links it; a second chase does nothing", () => {
    let p = addThing(newAccountPlan(), "Run a marathon", "health")
    const made = chaseThing(p, p.experiences[0].id)!
    p = made.plan
    const goal = p.goals.find((g) => g.id === made.goalId)!
    expect(goal).toMatchObject({ type: "achievement", areaId: "health", servesOneThing: true })
    expect(p.experiences[0].goalId).toBe(goal.id)
    expect(chaseThing(p, p.experiences[0].id)).toBeNull()
  })
})

describe("obstacles", () => {
  it("adds only new problems on the default goal, moves them, and sets a fallback", () => {
    const { plan, goal } = withGoal()
    expect(defaultGoalId(plan)).toBe(goal)
    const first = addProblems(plan, ["I forget", "i forget", "Money"], goal)
    expect(first.ids).toHaveLength(2)
    expect(addProblems(first.plan, ["Money"], goal).ids).toEqual([])
    const g2 = addGoal(first.plan, "health", "Train", "habit_ramp")
    const other = g2.goals[1].id
    const moved = moveProblem(g2, first.ids[0], other)
    expect(findObstacle(moved, first.ids[0])!.goalId).toBe(other)
    expect(setFallback(moved, first.ids[0], "Phone alarm").goals[1].obstacles[0].counter).toBe("Phone alarm")
  })
  it("status: a problem with no fallback is a reason pointing at its then screen; a fallback clears it", () => {
    const { plan, goal } = withGoal()
    const { plan: p, ids } = addProblems(plan, ["Money"], goal)
    const r = st(p).extras.obstacles.reasons
    expect(r.map((x) => x.id)).toEqual(["obstacles.no-then"])
    expect(r[0].target).toBe(`obstacles/${ids[0]}/then`)
    expect(st(setFallback(p, ids[0], "Work less")).extras.obstacles.state).toBe("done")
  })
  it("old notes and beliefs come back as earlier notes", () => {
    const p = setAreaReview({ ...newAccountPlan(), answers: { stoppers: "Time" } }, "health", { blockers: "Sleep" })
    expect(obstaclesNotes(p).map((n) => n.topic)).toEqual(["stoppers", "review_blockers:health"])
  })
})
