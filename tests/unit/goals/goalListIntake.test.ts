/**
 * Acceptance tests for the goal-intake milestones (docs/plans/goal-intake.md).
 * One describe per milestone, each asserting the capability the milestone
 * claims — not the implementation that happens to deliver it.
 */

import { describe, it, expect } from "vitest"
import {
  parseGoalList, mergeEscalations, headingToArea, classifyGoalInput, readCadence,
  createAreaGoal, addGoalEdge, goalFeeders, goalNeedsAction, addGoalAction,
  goalNeedsWhy, goalsNeedingWhy, pendingActions, REASON_PROMPTS, readGoalVehicle,
  goalGaps, goalIsPlanned, planConformance,
  shrunkTarget, buildSmartSentence, rampFromEscalation, balancePlan,
} from "@/src/goals/visionPlanService"

const TODAY = "2026-07-30"

describe("M1 — paste a list", () => {
  const LIST = `Health
  Walk 8,000 steps every day
  Lose 10 kg

Money:
  Pay off $18,000 of debt
  Track every expense weekly`

  it("reads every line, and headings set the room", () => {
    const { rows, unresolvedHeadings } = parseGoalList(LIST, TODAY)
    expect(rows).toHaveLength(4)
    expect(unresolvedHeadings).toEqual([])
    expect(rows.map((r) => r.areaId)).toEqual(["lm_health", "lm_health", "lm_money", "lm_money"])
    expect(rows.map((r) => r.heading)).toEqual(["Health", "Health", "Money", "Money"])
  })

  it("strips list markers people actually paste", () => {
    const { rows } = parseGoalList("Health\n1. Lose 10 kg\n- Sleep 8 hours every night\n* Stretch every day\n• Walk daily", TODAY)
    expect(rows.map((r) => r.raw)).toEqual(["Lose 10 kg", "Sleep 8 hours every night", "Stretch every day", "Walk daily"])
  })

  it("a heading it cannot map leaves its rows unresolved rather than guessing a room", () => {
    const { rows, unresolvedHeadings } = parseGoalList("Zwiegespräche:\n  Do the thing", TODAY)
    expect(unresolvedHeadings).toEqual(["Zwiegespräche"])
    expect(rows[0].areaId).toBeNull()
  })

  it("blank lines are skipped and never become goals", () => {
    const { rows } = parseGoalList("Health\n\n  Lose 10 kg\n\n\n  Walk daily\n", TODAY)
    expect(rows).toHaveLength(2)
  })

  it("is pure — parsing twice gives identical results", () => {
    expect(parseGoalList(LIST, TODAY)).toEqual(parseGoalList(LIST, TODAY))
  })

  it("maps the everyday synonyms, exactly and loosely", () => {
    expect(headingToArea("Training")).toBe("lm_fitness")
    expect(headingToArea("Money")).toBe("lm_money")
    expect(headingToArea("Health & Fitness")).toBe("lm_health")
    expect(headingToArea("Relationship:")).toBe("lm_relationship")
    expect(headingToArea("Kwyjibo")).toBeNull()
  })

  it("does not mistake a goal for a heading just because it names an area word", () => {
    // "Become debt free" is three words and contains "debt". Read as a heading
    // it would vanish from the list AND re-file everything after it.
    const { rows } = parseGoalList("Money\n  Become debt free\n  Track every expense weekly", TODAY)
    expect(rows.map((r) => r.raw)).toEqual(["Become debt free", "Track every expense weekly"])
    expect(rows.every((r) => r.areaId === "lm_money")).toBe(true)
  })
})

describe("M9 — projects with sub-goals", () => {
  const NESTED = `Business
  Build the company
    Get the company registered
    Write the terms of service
    Open the bank account
  Ship the MVP`

  it("indentation becomes parentage", () => {
    const { rows } = parseGoalList(NESTED, TODAY)
    const [parent, a, b, c, sibling] = rows
    expect(parent.parentRowId).toBeNull()
    expect([a, b, c].map((r) => r.parentRowId)).toEqual([parent.id, parent.id, parent.id])
    expect(sibling.parentRowId).toBeNull()
  })

  it("a bare letter bullet nests without whitespace — '12a.' under '12.'", () => {
    const { rows } = parseGoalList("Business\n12. Build the company\na. Finish the goals module\nb. Write the terms", TODAY)
    expect(rows[0].parentRowId).toBeNull()
    expect(rows[1].parentRowId).toBe(rows[0].id)
    expect(rows[2].parentRowId).toBe(rows[0].id)
  })

  it("children feed the parent through the existing edge set — no new field", () => {
    const { rows } = parseGoalList(NESTED, TODAY)
    let goals: ReturnType<typeof createAreaGoal>[] = []
    const byRow = new Map<string, string>()
    for (const r of rows) {
      const g = createAreaGoal({ areaId: r.areaId!, ...r.reading }, goals.map((x) => x.id))
      goals = [...goals, g]
      byRow.set(r.id, g.id)
    }
    for (const r of rows) {
      if (r.parentRowId) goals = addGoalEdge(goals, byRow.get(r.id)!, byRow.get(r.parentRowId)!)
    }
    const parentId = byRow.get(rows[0].id)!
    expect(goalFeeders(goals, parentId).map((g) => g.title).sort())
      .toEqual(["Get the company registered", "Open the bank account", "Write the terms of service"])
  })

  it("the edge set still refuses a cycle", () => {
    const a = createAreaGoal({ areaId: "lm_money", title: "A", type: "habit_ramp", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [])
    const b = createAreaGoal({ areaId: "lm_money", title: "B", type: "habit_ramp", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [a.id])
    const linked = addGoalEdge([a, b], a.id, b.id)
    expect(() => addGoalEdge(linked, b.id, a.id)).toThrow()
  })
})

describe("M1 — escalating lines collapse into one goal", () => {
  it("three thresholds of the same thing become one ladder", () => {
    const { rows } = parseGoalList("Business\n  Get 1 download\n  Get 10 downloads\n  Get 100 downloads", TODAY)
    const { rows: merged, merges } = mergeEscalations(rows)
    expect(merges).toHaveLength(1)
    expect(merges[0].kind).toBe("ladder")
    expect(merged).toHaveLength(1)
    expect(merged[0].reading.measure).toMatchObject({ start: 0, target: 100 })
    expect(merges[0].absorbedRowIds).toHaveLength(2)
  })

  it("an escalating rhythm becomes one practice at the steady-state frequency", () => {
    const { rows } = parseGoalList("Business\n  Publish 1 video per week\n  Publish 2 videos per week\n  Publish 3 videos per week", TODAY)
    const { rows: merged, merges } = mergeEscalations(rows)
    expect(merges[0].kind).toBe("ramp")
    expect(merged).toHaveLength(1)
    expect(merged[0].reading.daysPerWeek).toBe(3)
    expect(rampFromEscalation([1, 2, 3])).toEqual([
      { frequencyPerWeek: 1, durationWeeks: 4 },
      { frequencyPerWeek: 2, durationWeeks: 4 },
      { frequencyPerWeek: 3, durationWeeks: 4 },
    ])
  })

  it("never merges unrelated goals, or a lone line", () => {
    const { rows } = parseGoalList("Business\n  Get 10 downloads\n  Get 100 subscribers\n  Ship the MVP", TODAY)
    const { rows: merged, merges } = mergeEscalations(rows)
    expect(merges).toEqual([])
    expect(merged).toHaveLength(3)
  })

  it("never merges across rooms", () => {
    const { rows } = parseGoalList("Money\n  Save 10 hours\nFun\n  Save 100 hours", TODAY)
    expect(mergeEscalations(rows).merges).toEqual([])
  })

  it("leaves sub-goals alone — they belong to their parent, not to a ladder", () => {
    const { rows } = parseGoalList("Business\n  Build it\n    Get 10 users\n    Get 100 users", TODAY)
    expect(mergeEscalations(rows).merges).toEqual([])
  })
})

describe("M2 — baselines", () => {
  it("survives every phrasing", () => {
    expect(classifyGoalInput("10 pull-ups, from 6", TODAY).measure).toMatchObject({ start: 6, target: 10 })
    expect(classifyGoalInput("go from 7 to 10 pullups", TODAY).measure).toMatchObject({ start: 7, target: 10 })
    expect(classifyGoalInput("bench 28 kg, currently 22", TODAY).measure).toMatchObject({ start: 22, target: 28, unit: "kg" })
    expect(classifyGoalInput("MRR from $2,000 to $10,000", TODAY).measure).toMatchObject({ start: 2000, target: 10000, unit: "$" })
  })

  it("the baseline leaves the title once it is a field of its own", () => {
    // Otherwise the title still says "from 6" after the user moves start to 8.
    expect(classifyGoalInput("10 pull-ups, from 6", TODAY).title).toBe("10 pull-ups")
    expect(classifyGoalInput("bench 28 kg, currently 22", TODAY).title).toBe("Bench 28 kg")
  })

  it("a range of one is a checkbox — unless the user chose both ends", () => {
    expect(classifyGoalInput("read one book", TODAY).type).toBe("achievement")
    expect(classifyGoalInput("go from 7 to 8 pullups", TODAY)).toMatchObject({
      type: "milestone_ladder", measure: { start: 7, target: 8 },
    })
  })
})

describe("M3 — rhythm", () => {
  it("reads the phrasings that used to be invisible", () => {
    expect(readCadence("Publish 3 videos per week")).toMatchObject({ days: 3, monthly: false })
    expect(readCadence("Publish 3 videos a week")).toMatchObject({ days: 3 })
    expect(readCadence("Swim once a week")).toMatchObject({ days: 1 })
    expect(readCadence("Review the budget every Sunday")).toMatchObject({ days: 1 })
    expect(readCadence("See the physio every month")).toMatchObject({ monthly: true })
    expect(readCadence("Track every expense weekly")).toMatchObject({ days: 1 })
  })

  it("refuses to read a rhythm where there is none", () => {
    for (const s of [
      "Text her back within a day",
      "Reply to messages the same day",
      "Ask for the number every time it goes well",
      "Walk after every meal",
      "Reach $10,000 monthly recurring revenue",
      "Reach 1,000 monthly listeners",
      "Save 20% of every paycheque",
    ]) {
      expect(readCadence(s), s).toBeNull()
    }
  })

  it("a weekly volume above seven floors at daily and keeps its count in the title", () => {
    const r = classifyGoalInput("Send 20 cold emails a week", TODAY)
    expect(r.daysPerWeek).toBe(7)
    expect(r.title).toContain("20")
  })
})

describe("M5 — descending goals", () => {
  it("shrinking a target halves the RANGE, not the number", () => {
    expect(shrunkTarget({ start: 0, target: 100 })).toBe(50)
    // Halving 14 would suggest 7% body fat — a much harder goal, offered as an
    // easier one. The range is what shrinks.
    expect(shrunkTarget({ start: 22, target: 14 })).toBe(18)
  })

  it("the affirmation sentence points the right way", () => {
    const base = { title: "Body fat", type: "milestone_ladder" as const, targetDate: null, habits: [] }
    expect(buildSmartSentence({ ...base, measure: { unit: "%", start: 22, target: 14, steps: 5 } }))
      .toContain("get down to 14 % or below")
    expect(buildSmartSentence({ ...base, measure: { unit: "kg", start: 0, target: 80, steps: 5 } }))
      .toContain("reach at least 80 kg")
  })

  it("stays binary when there is no baseline — we never invent a start", () => {
    expect(classifyGoalInput("run a marathon under 4 hours", TODAY).type).toBe("achievement")
    expect(classifyGoalInput("blood sugar under 8 before bed", TODAY).type).toBe("achievement")
  })
})

describe("M6 — lift goals", () => {
  it("keeps weight, unit and protocol apart", () => {
    expect(classifyGoalInput("Bench 80 kg, 3x6-8", TODAY).measure)
      .toMatchObject({ unit: "kg", target: 80, protocol: "3×6-8" })
    expect(classifyGoalInput("Squat 120 kg, 5x5", TODAY).measure)
      .toMatchObject({ unit: "kg", target: 120, protocol: "5×5" })
  })

  it("does not mistake a weight-and-reps line for a protocol", () => {
    // "18 kg x 10" is a weight and a rep count with a unit between them.
    expect(classifyGoalInput("Curl 18 kg x 10 strict form", TODAY).measure?.protocol).toBeUndefined()
    expect(classifyGoalInput("Curl 18 kg x 10 strict form", TODAY).measure?.target).toBe(18)
  })

  it("keeps the k-multiplier working, and keeps distance in kilometres", () => {
    expect(classifyGoalInput("earn 100k", TODAY).measure).toMatchObject({ unit: "$", target: 100000 })
    expect(classifyGoalInput("run 10k", TODAY).measure).toMatchObject({ unit: "km", target: 10 })
  })
})

describe("M8 — a goal with nothing to do", () => {
  const state = (title: string) =>
    createAreaGoal({ areaId: "lm_health", title, type: "achievement", why: "", daysPerWeek: 3, measure: null, targetDate: "2027-01-01" }, [])

  it("is detected even though every goal is created with a habit", () => {
    const g = state("No pain in my left knee")
    expect(g.habits).toHaveLength(1)
    expect(g.habits[0].placeholder).toBe(true)
    expect(goalNeedsAction(g)).toBe(true)
  })

  it("a practice is never flagged — its habit IS the goal", () => {
    const g = createAreaGoal({ areaId: "lm_health", title: "Stretch", type: "habit_ramp", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [])
    expect(g.habits[0].placeholder).toBeUndefined()
    expect(goalNeedsAction(g)).toBe(false)
  })

  it("a target is never flagged — the number is the progress", () => {
    const g = createAreaGoal({ areaId: "lm_fitness", title: "Bench", type: "milestone_ladder", why: "", daysPerWeek: 3, measure: { unit: "kg", start: 60, target: 80, steps: 5 }, targetDate: "2027-01-01" }, [])
    expect(goalNeedsAction(g)).toBe(false)
  })

  it("adding a real action retires the placeholder and schedules", () => {
    const g = state("No pain in my left knee")
    const [after] = addGoalAction([g], g.id, { title: "Physio exercises", daysPerWeek: 3 })
    expect(after.habits.map((h) => h.title)).toEqual(["Physio exercises"])
    expect(goalNeedsAction(after)).toBe(false)
    const plan = balancePlan([after], { dailyBudget: 4 })
    expect(plan.habits.some((h) => h.title === "Physio exercises")).toBe(true)
  })

  it("a goal is never left with no habit at all — the schema requires one", () => {
    const g = state("No pain in my left knee")
    const [after] = addGoalAction([g], g.id, { title: "Physio", daysPerWeek: 2 })
    expect(after.habits.length).toBeGreaterThanOrEqual(1)
    expect(() => addGoalAction([g], g.id, { title: "   ", daysPerWeek: 2 })).toThrow()
  })

  it("a second action adds rather than replaces", () => {
    const g = state("No pain in my left knee")
    let goals = addGoalAction([g], g.id, { title: "Physio", daysPerWeek: 3 })
    goals = addGoalAction(goals, g.id, { title: "Walk 30 minutes", daysPerWeek: 5 })
    expect(goals[0].habits.map((h) => h.title)).toEqual(["Physio", "Walk 30 minutes"])
    expect(new Set(goals[0].habits.map((h) => h.id)).size).toBe(2)
  })
})

describe("the why — the field the framework turns on", () => {
  // Ids must accumulate — passing [] every time mints the same id three times.
  const taken: string[] = []
  const mk = (title: string, why = "") => {
    const g = createAreaGoal({ areaId: "lm_fitness", title, type: "habit_ramp", why, daysPerWeek: 3, measure: null, targetDate: null }, taken)
    taken.push(g.id)
    return g
  }

  it("a created goal has NO why — we never write the user's reason for them", () => {
    // It used to default to "Because fitness is part of the life I said I
    // want." That sentence is not a reason, and because it was never empty,
    // nothing in the product could ever ask for the real one.
    expect(mk("Bench 100 kg").why).toBe("")
    expect(goalNeedsWhy(mk("Bench 100 kg"))).toBe(true)
    expect(goalNeedsWhy(mk("Bench 100 kg", "because I am tired of being weak"))).toBe(false)
  })

  it("whitespace is not a reason", () => {
    expect(goalNeedsWhy(mk("X", "   "))).toBe(true)
  })

  it("the reasons queue leads with what the user ranked highest — 80/20, not a wall", () => {
    const a = mk("A"), b = mk("B"), c = mk("C", "already answered")
    const q = goalsNeedingWhy([a, b, c], [b.id, a.id])
    expect(q.map((g) => g.title)).toEqual(["B", "A"])
  })

  it("the pending-actions badge asks for the missing reasons", () => {
    const g = mk("Get a girlfriend")
    const actions = pendingActions({
      committedAt: "2026-07-01", values: ["Freedom"], drivingForce: { purpose: "p", reasons: [], identity: [] },
      yourTens: {}, ritual: null, goals: [g], priorityIds: [g.id], progress: null, confirmed: false, today: TODAY,
    })
    expect(actions.some((a) => a.id === "goal-why")).toBe(true)
    expect(actions.find((a) => a.id === "goal-why")?.label).toContain("Get a girlfriend")
  })

  it("the question set is a menu of angles, not one question", () => {
    // Nobody answers "why?". They answer "what does another three years
    // exactly like this one take from you?"
    expect(REASON_PROMPTS.length).toBeGreaterThanOrEqual(6)
    // Each is a question; several add a nudge after it ("Name the small things").
    expect(REASON_PROMPTS.every((p) => p.question.includes("?"))).toBe(true)
    expect(new Set(REASON_PROMPTS.map((p) => p.question)).size).toBe(REASON_PROMPTS.length)
  })

  it("the drill names what a vehicle goal is actually for", () => {
    expect(readGoalVehicle("Get a girlfriend")?.ends).toContain("Intimacy")
  })
})

describe("dates — stated, never invented", () => {
  it("reads a date the user actually wrote, in the forms people write", () => {
    const at = (s: string) => classifyGoalInput(s, "2026-07-31").targetDate
    expect(at("Ship the MVP by 2027-03-01")).toBe("2027-03-01")
    expect(at("Run a marathon by October 2027")).toBe("2027-10-31")
    expect(at("Publish the book by end of year")).toBe("2026-12-31")
    expect(at("Get a girlfriend in 6 months")).toBe("2027-01-27")
  })

  it("a bare month means the NEXT one, never a date already past", () => {
    // Asked in July, "by June" is next June — not five weeks ago.
    expect(classifyGoalInput("Bench 100 kg by June", "2026-07-31").targetDate).toBe("2027-06-30")
    expect(classifyGoalInput("Bench 100 kg by December", "2026-07-31").targetDate).toBe("2026-12-31")
  })

  it("the date leaves the title once it is a field", () => {
    expect(classifyGoalInput("Bench 100 kg by June", "2026-07-31").title).toBe("Bench 100 kg")
  })

  it("a date phrase is never mistaken for a measure", () => {
    const r = classifyGoalInput("Ship the MVP by 2027-03-01", "2026-07-31")
    expect(r.type).toBe("achievement")
    expect(r.measure).toBeNull()
  })

  it("refuses to guess — an unparseable deadline stays missing, not invented", () => {
    const r = classifyGoalInput("Bench 100 kg by soon", "2026-07-31")
    expect(r.targetDate).toBeNull()
    expect(r.title).toContain("by soon")
    expect(goalGaps({ ...r, painWhy: null, beliefLevel: null, desireLevel: null })).toContain("a date")
  })
})
