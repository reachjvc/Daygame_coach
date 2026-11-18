import { describe, it, expect } from "vitest"
import { addGoal, emptyNsPlan } from "@/src/goals/northStarService"
import { planStatus, dueCheckinWeek } from "@/src/goals/planSteps/planStatus"
import {
  addBigGoal, addSeasonGoal, addAction, fileBigGoal, setAreaHidden, setCheckin, setPicture, setPracticeNumbers, setProtected, setSeasonAreas, setSeasonEnd,
  setSeasonFocusSentence, setTargetNumbers, writeWeek, markAreasDescribed, setAnswer, setGoalKind, setGoalStatus, addGrowthGoal, describeArea,
} from "@/src/goals/planSteps/planChanges"
import { newAccountPlan } from "@/src/goals/planStore"
import { tierKey } from "@/src/goals/planSteps/planFacts"
import type { NsPlan } from "@/src/goals/types"

/** 2026-11-18 is a Wednesday. */
const TODAY = "2026-11-18"
const HOUR = 12

/** A copy that still holds the old twelve areas, descriptions as the old version wrote them. */
const oldTwelve = (): NsPlan => ({ ...newAccountPlan(), areas: emptyNsPlan().areas })

const status = (plan: NsPlan, today = TODAY, hour = HOUR) => planStatus({ plan, today, hour })
const ids = (plan: NsPlan, mod: keyof ReturnType<typeof status>["modules"], today = TODAY, hour = HOUR) => status(plan, today, hour).modules[mod].reasons.map((r) => r.id)

/** A plan that has finished every core module, built through the same changes the screens make. */
function builtPlan(): { plan: NsPlan; big: string; goal: string; step: string } {
  let p = markAreasDescribed(newAccountPlan())
  p = setPicture(p, "A life I chose", TODAY)
  p = addBigGoal(p, "Run my own business")
  const big = p.goals[0].id
  p = fileBigGoal(p, big, p.areas[0].id, 2030)
  p = setSeasonFocusSentence(p, "Get in shape", TODAY)
  p = setSeasonEnd(p, "2027-02-18", TODAY)
  p = setSeasonAreas(p, [p.areas[0].id])
  const made = addSeasonGoal(p, p.areas[0].id, "Bench 100")!
  p = setGoalKind(made.plan, made.id, "milestone_ladder")
  p = setTargetNumbers(p, made.id, { unit: "kg", from: 80, to: 100, count: 5, shape: "even", by: "2027-02-18" })
  p = { ...p, goals: p.goals.map((g) => (g.id === made.id ? { ...g, feedsGoalIds: [big] } : g)) }
  p = addAction(p, made.id, "Train", 3)
  const step = p.routines.flatMap((r) => r.steps).find((s) => s.title === "Train")!.id
  p = setProtected(p, step)
  p = setCheckin(p, { day: 7, hour: 19 })
  return { plan: p, big, goal: made.id, step }
}

describe("planStatus: states", () => {
  it("a brand-new account has nothing started, and each module waits for the one before", () => {
    const s = status(newAccountPlan())
    expect(Object.values(s.modules).map((m) => m.state)).toEqual(["done", "not-started", "not-started", "not-started", "not-started", "not-started"])
    expect(s.modules.areas.reasons).toEqual([])
    expect(s.modules.direction.lockedBy).toBeNull()
    expect(s.modules.season.lockedBy).toBe("direction")
  })

  it("a finished plan has every core module Done and nothing next", () => {
    const { plan } = builtPlan()
    const s = status(plan)
    for (const [id, m] of Object.entries(s.modules)) expect(m.state, id).toBe("done")
    expect(s.nextUp).toBeNull()
  })
})

describe("planStatus: Core 1, Areas", () => {
  it("areas.few: fewer than 2 active areas", () => {
    let p = markAreasDescribed(newAccountPlan())
    for (const a of p.areas.slice(1)) p = setAreaHidden(p, a.id, true)
    expect(ids(p, "areas")).toEqual(["areas.few"])
    expect(status(p).modules.areas.reasons[0].target).toBe("areas/pick")
  })
  it("areas.blank: an active area with no name", () => {
    const p = markAreasDescribed({ ...newAccountPlan(), areas: newAccountPlan().areas.map((a, i) => (i === 0 ? { ...a, label: " " } : a)) })
    expect(ids(p, "areas")).toEqual(["areas.blank"])
  })
  it("areas.old-desc: a default description kept unchanged, until the describe screen has been seen", () => {
    const base = oldTwelve()
    expect(ids(newAccountPlan(), "areas")).toEqual([])
    expect(ids(base, "areas")).toEqual(["areas.old-desc"])
    expect(status(base).modules.areas.reasons[0].target).toBe("areas/describe")
    expect(ids(markAreasDescribed(base), "areas")).toEqual([])
    expect(ids(describeArea(base, base.areas[0].id, "My own words"), "areas")).toEqual(["areas.old-desc"])
  })
  it("a hidden area is not active", () => {
    let p = markAreasDescribed(newAccountPlan())
    p = setAreaHidden(p, p.areas[0].id, true)
    expect(status(p).modules.areas.state).toBe("done")
    p = setAreaHidden(p, p.areas[0].id, false)
    expect(status(p).modules.areas.state).toBe("done")
  })
})

describe("planStatus: Core 2, Direction", () => {
  const areasDone = () => markAreasDescribed(newAccountPlan())
  it("is not started until a picture or a big goal exists", () => {
    expect(status(areasDone()).modules.direction.state).toBe("not-started")
    expect(status(setPicture(areasDone(), "x", TODAY)).modules.direction.started).toBe(true)
  })
  it("direction.picture and direction.big are missing", () => {
    const p = addBigGoal(areasDone(), "Big")
    expect(ids(p, "direction")).toContain("direction.picture")
    const q = setPicture(areasDone(), "Picture", TODAY)
    expect(ids(q, "direction")).toEqual(["direction.big"])
    expect(status(q).modules.direction.reasons[0].target).toBe("direction/big")
  })
  it("direction.big-area: an unfiled big goal is a check, with its own screen", () => {
    const p = setPicture(addBigGoal(areasDone(), "Big"), "Picture", TODAY)
    const r = status(p).modules.direction.reasons
    expect(r.map((x) => x.id)).toEqual(["direction.big-area"])
    expect(r[0].kind).toBe("check")
    expect(r[0].target).toBe(`direction/big/${p.goals[0].id}/file`)
    expect(ids(fileBigGoal(p, p.goals[0].id, p.areas[0].id, null), "direction")).toEqual([])
  })
  it("direction.unmoved: a big goal in a season area that nothing feeds", () => {
    let p = setPicture(addBigGoal(areasDone(), "Big"), "Picture", TODAY)
    p = fileBigGoal(p, p.goals[0].id, "health", null)
    p = setSeasonAreas(p, ["health"])
    const r = status(p).modules.direction.reasons
    expect(r.map((x) => x.id)).toEqual(["direction.unmoved"])
    expect(r[0].target).toBe(`goals/new/what?feeds=${p.goals[0].id}`)
  })
  it("direction.unmoved clears when a season goal feeds the big goal directly or through a growth goal", () => {
    const { plan, big } = builtPlan()
    expect(ids(plan, "direction")).toEqual([])
    const growth = addGrowthGoal(plan, "Calm", big)
    const g = growth.goals.find((x) => x.title === "Calm")!
    const viaGrowth = { ...growth, goals: growth.goals.map((x) => (x.title === "Bench 100" ? { ...x, feedsGoalIds: [g.id] } : x)) }
    expect(ids(viaGrowth, "direction")).toEqual([])
  })
  it("old goals without a stored level read their level from the time frame", () => {
    let p = addGoal(areasDone(), "health", "Old five year goal")
    p = { ...p, goals: p.goals.map((g) => ({ ...g, timeframe: "5y" as const })) }
    expect(status(p).modules.direction.started).toBe(true)
    expect(tierKey("g1")).toContain("g1")
  })
})

describe("planStatus: Core 3, Season", () => {
  const upToDirection = () => builtPlan().plan
  it("season.none, then season.focus / season.end / season.areas", () => {
    const base = (() => {
      let p = markAreasDescribed(newAccountPlan())
      p = setPicture(p, "x", TODAY)
      p = (() => { const q = addBigGoal(p, "Big"); return fileBigGoal(q, q.goals[0].id, q.areas[0].id, null) })()
      return p
    })()
    expect(ids(base, "season")).toEqual(["season.none"])
    const shell = { ...base, season: { id: "s1", startedOn: TODAY, endsOn: null, sentence: "" } }
    expect(ids(shell, "season")).toEqual(["season.focus", "season.end", "season.areas"])
  })
  it("season.ended is a check, and wins Next up over a later module's check", () => {
    const p = setSeasonEnd(upToDirection(), "2026-11-10", TODAY)
    expect(ids(p, "season")).toEqual(["season.ended"])
    const s = status(p)
    expect(s.nextUp?.rule).toBe("season-ended")
    expect(s.nextUp?.target).toBe("season/close/brought")
  })
  it("season.area-hidden: a season area that is hidden", () => {
    const p = builtPlan().plan
    const hidden = setAreaHidden(p, p.seasonAreaIds[0], true)
    expect(ids(hidden, "season")).toEqual(["season.area-hidden"])
  })
})

describe("planStatus: Core 4, Goals", () => {
  it("goals.none: no season goal with numbers; goals.numbers: a goal missing them", () => {
    const { plan } = builtPlan()
    const without = { ...plan, goals: plan.goals.filter((g) => g.title !== "Bench 100") }
    expect(ids(without, "goals")).toEqual(["goals.none", "goals.area-empty"])
    const empty = { ...plan, goals: plan.goals.map((g) => (g.title === "Bench 100" ? { ...g, unit: "" } : g)) }
    expect(ids(empty, "goals")).toContain("goals.numbers")
    expect(status(empty).modules.goals.reasons.find((r) => r.id === "goals.numbers")?.target).toMatch(/^goals\/.+\/numbers$/)
  })
  it("goals.numbers for a Practice goal needs a weekly count, for a Finish line a task or a date", () => {
    const { plan } = builtPlan()
    const made = addSeasonGoal(plan, plan.areas[0].id, "Run")!
    const finish = made.plan
    expect(ids(finish, "goals")).toEqual(["goals.numbers"])
    const dated = { ...finish, goals: finish.goals.map((g) => (g.id === made.id ? { ...g, targetDate: "2027-01-01" } : g)) }
    expect(ids(dated, "goals")).not.toContain("goals.numbers")
    const practice = setPracticeNumbers(setGoalKind(finish, made.id, "habit_ramp"), made.id, { unit: "times", perWeek: 3, ease: null })
    expect(ids(practice, "goals")).not.toContain("goals.numbers")
  })
  it("goals.past-date: an active goal whose date has passed; resolving it clears it", () => {
    const { plan, goal } = builtPlan()
    const late = { ...plan, goals: plan.goals.map((g) => (g.id === goal ? { ...g, targetDate: "2026-11-01" } : g)) }
    const r = status(late).modules.goals.reasons.find((x) => x.id === "goals.past-date")
    expect(r?.target).toBe(`goals/${goal}/status`)
    expect(ids(setGoalStatus(late, goal, "achieved", TODAY), "goals")).not.toContain("goals.past-date")
  })
  it("goals.area-empty: a season area with no season goal", () => {
    const { plan } = builtPlan()
    const two = setSeasonAreas(plan, [plan.areas[0].id, plan.areas[1].id])
    const r = status(two).modules.goals.reasons.find((x) => x.id === "goals.area-empty")
    expect(r?.target).toBe(`goals/new/what?area=${plan.areas[1].id}`)
  })
})

describe("planStatus: Core 5, Actions", () => {
  it("actions.none, actions.goal-bare, actions.protect", () => {
    const { plan, goal, step } = builtPlan()
    const bare = { ...plan, routines: plan.routines.map((r) => ({ ...r, steps: r.steps.filter((s) => s.id !== step) })) }
    expect(ids(bare, "actions")).toEqual(["actions.none", "actions.goal-bare", "actions.protect"])
    expect(status(bare).modules.actions.reasons[0].target).toBe(`actions/goal/${goal}`)
    const unlinked = { ...plan, routines: plan.routines.map((r) => ({ ...r, steps: r.steps.map((s) => (s.id === step ? { ...s, servesGoalIds: [] } : s)) })) }
    expect(ids(unlinked, "actions")).toContain("actions.none")
    // Another goal that is a number and has no weekly action.
    const other = addSeasonGoal(plan, plan.areas[0].id, "Run 5k")!
    const withNumbers = setTargetNumbers(setGoalKind(other.plan, other.id, "milestone_ladder"), other.id, { unit: "km", from: 0, to: 5, count: 4, shape: "even", by: null })
    const r = status(withNumbers).modules.actions.reasons
    expect(r.map((x) => x.id)).toEqual(["actions.goal-bare"])
    expect(r[0].target).toBe(`actions/goal/${other.id}`)
    expect(ids(setProtected(plan, null), "actions")).toEqual(["actions.protect"])
    expect(ids(setProtected(plan, "nope"), "actions")).toEqual(["actions.protect"])
  })
  it("a Practice goal with a weekly count is itself a weekly item", () => {
    let { plan } = builtPlan()
    const made = addSeasonGoal(plan, plan.areas[0].id, "Cold approach")!
    plan = setPracticeNumbers(setGoalKind(made.plan, made.id, "habit_ramp"), made.id, { unit: "times", perWeek: 4, ease: null })
    expect(ids(plan, "actions")).toEqual([])
    expect(status(plan).modules.actions.started).toBe(true)
  })
})

describe("planStatus: Core 6, Review", () => {
  it("review.setup until a day is set; then the module is started", () => {
    const { plan } = builtPlan()
    const without = { ...plan, answers: Object.fromEntries(Object.entries(plan.answers).filter(([k]) => !k.includes("checkin"))) }
    expect(ids(without, "review")).toEqual(["review.setup"])
    expect(status(without).modules.review.started).toBe(false)
    expect(status(plan).modules.review.state).toBe("done")
  })
  it("a brand-new plan is not nagged before its first week of use, then it is due until written", () => {
    const { plan, step } = builtPlan()
    // Sunday 19:00 review. Today is Wednesday: the moment this week has not come; last Sunday's covered week had no activity.
    expect(ids(plan, "review")).toEqual([])
    const sunday = "2026-11-22"
    const active = { ...plan, logged: { "2026-11-17": [step] } }
    expect(ids(active, "review", sunday, 19)).toEqual(["review.due"])
    expect(ids(active, "review", sunday, 18)).toEqual([])
    const monday = dueCheckinWeek(sunday, 19, 7, 19)
    expect(monday).toBe("2026-11-16")
    expect(ids(writeWeek(active, monday, sunday, {}), "review", sunday, 19)).toEqual([])
  })
  it("after a first check-in it is due every week, also after a week with nothing done", () => {
    const { plan } = builtPlan()
    const written = writeWeek(plan, "2026-11-09", "2026-11-15", {})
    // Sunday 22 Nov 20:00 covers the week of 16 Nov, which has no ticks, but an earlier check-in exists.
    expect(ids(written, "review", "2026-11-22", 20)).toEqual(["review.due"])
    // And the older week can no longer be the due one.
    expect(dueCheckinWeek("2026-11-22", 20, 7, 19)).toBe("2026-11-16")
  })
  it("a Monday to Thursday day looks back at the week before", () => {
    expect(dueCheckinWeek("2026-11-18", 20, 3, 19)).toBe("2026-11-09")
    expect(dueCheckinWeek("2026-11-18", 12, 3, 19)).toBe("2026-11-02")
    expect(dueCheckinWeek("2026-11-18", 12, 6, 19)).toBe("2026-11-09")
  })
  it("a copy that holds a reminders row uses it", () => {
    const { plan } = builtPlan()
    const withoutAnswers = { ...plan, answers: {} }
    const s = planStatus({ plan: withoutAnswers, today: TODAY, hour: HOUR, reminders: { review_day: 7, review_hour: 19, push_on: false } })
    expect(s.modules.review.reasons).toEqual([])
    expect(setAnswer(plan, "x", "y").answers.x).toBe("y")
  })
})

describe("planStatus: Next up order", () => {
  it("1. the first core module that is not started or missing something", () => {
    const s = status(newAccountPlan())
    expect(s.nextUp?.module).toBe("direction")
    expect(s.nextUp?.target).toBe("direction/picture")
    expect(s.nextUp?.rule).toBe("build")
    expect(s.nextUp?.job).toBeTruthy()
  })
  it("1. a missing reason's target, not the first screen, when the module is started", () => {
    let p = markAreasDescribed(newAccountPlan())
    p = setPicture(p, "x", TODAY)
    expect(status(p).nextUp?.target).toBe("direction/big")
  })
  it("2. the check-in due comes before an ended season", () => {
    const { plan, step } = builtPlan()
    const both = { ...setSeasonEnd(plan, "2026-11-10", TODAY), logged: { "2026-11-17": [step] } }
    const s = planStatus({ plan: both, today: "2026-11-22", hour: 19 })
    expect(s.nextUp?.rule).toBe("review-due")
    expect(s.nextUp?.target).toBe("review/run/week")
  })
  it("3. the season close before any other check", () => {
    const { plan } = builtPlan()
    const ended = setProtected(setSeasonEnd(plan, "2026-11-10", TODAY), null)
    expect(status(ended).nextUp?.rule).toBe("season-ended")
  })
  it("4. otherwise the first check reason, in module order", () => {
    const { plan } = builtPlan()
    const checks = setProtected(setAreaHidden(plan, plan.areas[5].id, false), null)
    const s = status(checks)
    expect(s.nextUp?.rule).toBe("check")
    expect(s.nextUp?.target).toBe("actions/protect")
    const areaCheck = { ...checks, areas: emptyNsPlan().areas, answers: Object.fromEntries(Object.entries(checks.answers).filter(([k]) => k !== "start:new:areas-described")) }
    expect(status(areaCheck).nextUp?.target).toBe("areas/describe")
  })
  it("locks: a core module waits for every earlier one", () => {
    let p = markAreasDescribed(newAccountPlan())
    p = setPicture(p, "x", TODAY)
    const s = status(p)
    expect(s.modules.season.lockedBy).toBe("direction")
    expect(s.modules.goals.lockedBy).toBe("direction")
    expect(s.modules.direction.lockedBy).toBeNull()
  })
  it("every reason carries its words and a route under the new version's address", () => {
    const s = status(newAccountPlan())
    for (const m of Object.values(s.modules)) for (const r of m.reasons) {
      expect(r.text.length).toBeGreaterThan(5)
      expect(r.href.startsWith("/plan/new/")).toBe(true)
    }
  })
})

describe("what the new version keeps survives the plan's own save and load", () => {
  it("the filing the new screens add, an unfiled big goal, hidden areas, a check-in row and the check-in day", async () => {
    const { planToRows, rowsToPlan } = await import("@/src/goals/lifePlanMapper")
    const { randomUUID } = await import("node:crypto")
    const { goalsOfTier, hiddenAreaIds, isUnfiled, checkinSettings } = await import("@/src/goals/planSteps/planFacts")
    const { plan, step } = builtPlan()
    const withUnfiled = addBigGoal(setAreaHidden(writeWeek(plan, "2026-11-09", TODAY, { nextOutcomes: "Train: 3 of 3" }), plan.areas[3].id, true), "Another big one")
    const minted = new Map<string, string>()
    const rows = planToRows(withUnfiled, { planId: randomUUID(), userId: randomUUID(), idFor: (id) => minted.get(id) ?? (minted.set(id, randomUUID()), minted.get(id)!) })
    const back = rowsToPlan(rows)!
    expect(goalsOfTier(back, "life").map((g) => g.title)).toEqual(["Run my own business", "Another big one"])
    expect(isUnfiled(back, goalsOfTier(back, "life")[1].id)).toBe(true)
    expect([...hiddenAreaIds(back)]).toEqual([plan.areas[3].id])
    expect(back.reviews.map((r) => r.periodStart)).toEqual(["2026-11-09"])
    expect(checkinSettings(back, null)).toMatchObject({ reviewDay: 7, reviewHour: 19 })
    // A protected weekly step is not a goal id, which the plan's own load would drop; it survives as an answer.
    const { protectedId } = await import("@/src/goals/planSteps/planFacts")
    expect(protectedId(back)).toBe(step)
    expect(status(back).modules.direction.reasons.map((r) => r.id)).toEqual(["direction.big-area"])
  })
})
