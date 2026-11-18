import { describe, it, expect } from "vitest"
import { planStatus } from "@/src/goals/planSteps/planStatus"
import { newAccountPlan } from "@/src/goals/planStore"
import { addGoal, addObstacle, setDailyFieldKind, setDailyFieldSource, addDailyField } from "@/src/goals/northStarService"
import { setAnswer } from "@/src/goals/planSteps/planChanges"
import { setStanding } from "@/src/goals/planSteps/extras/standingChanges"
import { addRoutines, setRoutineSteps, setRoutineWhen } from "@/src/goals/planSteps/extras/routinesChanges"
import { setQuitHabit } from "@/src/goals/planSteps/extras/quitChanges"
import { setWeekValue, addToLineup } from "@/src/goals/planSteps/extras/rolemodelsChanges"
import { setLines } from "@/src/goals/planSteps/extras/identityChanges"
import { addValues, setMostImportant, setValueServes } from "@/src/goals/planSteps/extras/valuesChanges"
import { EXTRA_IDS, type ExtraId } from "@/src/goals/planSteps/planRoutes"
import { builtCore } from "@/tests/support/builtCore"
import { writeWeek } from "@/src/goals/planSteps/planChanges"
import type { NsPlan } from "@/src/goals/types"

/** 2026-11-18 is a Wednesday. */
const TODAY = "2026-11-18"
const status = (plan: NsPlan, hidden: ExtraId[] = []) => planStatus({ plan, today: TODAY, hour: 12, hidden })
const reasons = (plan: NsPlan, id: ExtraId) => status(plan).extras[id].reasons.map((r) => r.id)
const fresh = () => newAccountPlan()
const withGoal = (plan: NsPlan, title = "Bench 100"): { plan: NsPlan; id: string } => {
  const p = addGoal(plan, plan.areas[0].id, title)
  return { plan: p, id: p.goals[p.goals.length - 1].id }
}

describe("extra modules: states", () => {
  it("a brand-new account has every extra Not started except Daily ratings, which starts with the Feeling about life question", () => {
    const s = status(fresh())
    for (const id of EXTRA_IDS) expect(s.extras[id].state, id).toBe(id === "selfratings" ? "done" : "not-started")
    expect(s.extras.selfratings.reasons).toEqual([])
  })

  it("a module nobody started carries no reasons, so it is never nagged", () => {
    const { plan } = withGoal(fresh())
    const p = setAnswer(plan, "start:new:lineup-week-value", "Courage")
    expect(status(p).extras.rolemodels.reasons).toEqual([])
  })
})

describe("extra modules: Where you stand", () => {
  it("is started by one line, and says which area has none (standing.missing, one tap to its screen)", () => {
    const p = setStanding(fresh(), "dating", "Few dates")
    const r = status(p).extras.standing
    expect(r.state).toBe("needs-a-look")
    expect(r.reasons).toHaveLength(1)
    expect(r.reasons[0]).toMatchObject({ id: "standing.missing", kind: "missing" })
    expect(r.reasons[0].target).toMatch(/^standing\//)
  })

  it("is Done once every active area has a line", () => {
    let p = fresh()
    for (const a of p.areas) p = setStanding(p, a.id, "Honest line")
    expect(status(p).extras.standing.state).toBe("done")
  })
})

describe("extra modules: Values", () => {
  it("values.unserved: a value that matters most with no goal serving it, until a goal serves it", () => {
    const { plan, id } = withGoal(fresh())
    let p = setMostImportant(addValues(plan, ["Loyalty", "Freedom"]), ["Loyalty"])
    expect(reasons(p, "values")).toEqual(["values.unserved", "values.unserved"])
    p = setValueServes(p, "Loyalty", [id])
    p = setValueServes(p, "Freedom", [id])
    expect(status(p).extras.values.state).toBe("done")
  })

  it("points at the value's own screen", () => {
    const p = addValues(fresh(), ["Loyalty"])
    expect(status(p).extras.values.reasons[0].target).toBe("values/Loyalty/where")
  })
})

describe("extra modules: Who you are", () => {
  it("identity.unseen: lines written but shown nowhere; a read question on Today clears it", () => {
    let p = setLines(fresh(), ["I go first."])
    expect(reasons(p, "identity")).toEqual(["identity.unseen"])
    p = addDailyField(p, null, "My lines", "read")
    const id = p.fields[p.fields.length - 1].id
    p = setDailyFieldSource(setDailyFieldKind(p, id, "read"), id, "answer:affirmations")
    expect(status(p).extras.identity.state).toBe("done")
  })
})

describe("extra modules: Things to have done", () => {
  it("never asks for anything: started by one line, Done with no reasons", async () => {
    const { addThing } = await import("@/src/goals/planSteps/extras/experiencesChanges")
    const p = addThing(fresh(), "Learn to surf", null)
    expect(status(p).extras.experiences).toMatchObject({ state: "done", reasons: [] })
  })
})

describe("extra modules: What could stop you", () => {
  it("obstacles.no-then: a problem with no fallback, fixed by writing one", () => {
    const { plan, id } = withGoal(fresh())
    let p = addObstacle(plan, id, "I forget")
    expect(reasons(p, "obstacles")).toEqual(["obstacles.no-then"])
    const o = p.goals.find((g) => g.id === id)!.obstacles[0]
    expect(status(p).extras.obstacles.reasons[0].target).toBe(`obstacles/${o.id}/then`)
    p = { ...p, goals: p.goals.map((g) => (g.id === id ? { ...g, obstacles: g.obstacles.map((x) => ({ ...x, counter: "Train at home" })) } : g)) }
    expect(status(p).extras.obstacles.state).toBe("done")
  })
})

describe("extra modules: Routines", () => {
  const made = (): { plan: NsPlan; id: string } => {
    const r = addRoutines(fresh(), [{ pick: "morning", label: "Morning" }], [])
    return { plan: r.plan, id: r.ids[0] }
  }

  it("routines.empty: a routine with no steps", () => {
    const { plan, id } = made()
    expect(status(plan).extras.routines.reasons[0]).toMatchObject({ id: "routines.empty", target: `routines/${id}/steps` })
  })

  it("routines.no-days: an ordered routine with no days, then Done once days are set", () => {
    const { plan, id } = made()
    let p = setRoutineSteps(plan, id, [{ title: "Glass of water", minutes: 1, goesTo: null, asks: null }])
    expect(status(p).extras.routines.reasons[0]).toMatchObject({ id: "routines.no-days", target: `routines/${id}/when` })
    p = setRoutineWhen(p, id, [0, 1, 2, 3, 4, 5, 6], 420)
    expect(status(p).extras.routines.state).toBe("done")
  })

  it("routines.dead-link: a step that opens something empty or gone", () => {
    const { plan, id } = made()
    let p = setRoutineSteps(plan, id, [{ title: "Read your lines", minutes: 1, goesTo: "answer:affirmations", asks: null }])
    p = setRoutineWhen(p, id, [0, 1, 2], null)
    expect(reasons(p, "routines")).toEqual(["routines.dead-link"])
    p = setLines(p, ["I go first."])
    expect(status(p).extras.routines.state).toBe("done")
  })
})

describe("extra modules: Journal questions", () => {
  it("questions.dead-read: a read question whose source is empty or gone; a write question starts the module", () => {
    let p = addDailyField(fresh(), null, "What did I learn?", "write")
    expect(status(p).extras.questions.state).toBe("done")
    p = addDailyField(p, null, "My star", "read")
    const id = p.fields[p.fields.length - 1].id
    p = setDailyFieldSource(setDailyFieldKind(p, id, "read"), id, "star")
    expect(reasons(p, "questions")).toEqual(["questions.dead-read"])
    p = { ...p, northStar: "A life I chose" }
    expect(status(p).extras.questions.state).toBe("done")
  })
})

describe("extra modules: Role models", () => {
  it("rolemodels.week-old: a week's value from before this Monday", () => {
    let p = addToLineup(fresh(), "marcus-aurelius")
    p = setWeekValue(p, "Courage", "2026-11-09")
    expect(reasons(p, "rolemodels")).toEqual(["rolemodels.week-old"])
    p = setWeekValue(p, "Courage", TODAY)
    expect(status(p).extras.rolemodels.state).toBe("done")
  })
})

describe("extra modules: Quit something", () => {
  it("quit.no-urge-plan: a quit goal with no obstacle until the urge has a fallback", () => {
    const made = setQuitHabit(fresh(), "Sugar")!
    expect(reasons(made.plan, "quit")).toEqual(["quit.no-urge-plan"])
    const p = addObstacle(made.plan, made.id, "The urge: Sugar")
    expect(status(p).extras.quit.state).toBe("done")
  })
})

describe("Next up: rules 5 and 6", () => {
  /** A plan with every core module done, and no extra module started, apart from the default rating. */
  const coreDone = async () => builtCore()

  it("rule 5: after the core, the first extra (in module order) with a reason wins over a suggestion", async () => {
    let p = await coreDone()
    p = addValues(p, ["Loyalty"])
    const q = setQuitHabit(p, "Sugar")!
    p = q.plan
    const s = status(p)
    expect(s.nextUp).toMatchObject({ rule: "extra-look", module: "values", reasonId: "values.unserved" })
  })

  it("rule 5 never outranks a core module that is unfinished (rules 1 to 4 first)", () => {
    const p = addValues(fresh(), ["Loyalty"])
    expect(status(p).nextUp?.rule).toBe("build")
  })

  it("rule 6: with the core done and nothing to look at, it suggests the first extra not started: routines", async () => {
    const p = await coreDone()
    expect(status(p).nextUp).toMatchObject({ rule: "suggest", module: "routines", target: "routines/pick" })
  })

  it("rule 6 walks the order and skips what is hidden or started", async () => {
    const p = await coreDone()
    expect(status(p, ["routines"]).nextUp).toMatchObject({ module: "obstacles" })
    expect(status(p, ["routines", "obstacles", "experiences"]).nextUp).toMatchObject({ module: "values" })
    const all = status(p, ["routines", "obstacles", "experiences", "values", "identity", "standing", "questions", "rolemodels", "quit"])
    expect(all.nextUp).toBeNull()
  })

  it("rule 6 puts What could stop you first when the latest week check-in says something slipped", async () => {
    let p = await coreDone()
    p = writeWeek(p, "2026-11-09", "2026-11-16", { lessons: "I skipped it twice" })
    expect(status(p).nextUp).toMatchObject({ rule: "suggest", module: "obstacles" })
  })

  it("rule 6 skips a started module: Standing started and Done leaves it out", async () => {
    let p = await coreDone()
    for (const a of p.areas) p = setStanding(p, a.id, "A line")
    const order: string[] = []
    let hidden: ExtraId[] = []
    for (let i = 0; i < 12; i++) {
      const n = status(p, hidden).nextUp
      if (!n) break
      order.push(n.module)
      hidden = [...hidden, n.module as ExtraId]
    }
    expect(order).toEqual(["routines", "obstacles", "experiences", "values", "identity", "questions", "rolemodels", "quit"])
  })
})
