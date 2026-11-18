import { describe, it, expect } from "vitest"
import { addDailyField, countGoal, setDayNumber, setDayNote, setJournalEntry, setGoalReading } from "@/src/goals/northStarService"
import { toggleStepLogged } from "@/src/goals/northStarTrackService"
import { newAccountPlan } from "@/src/goals/planStore"
import { addBigGoal, addSeasonGoal, addAction, setGoalKind, setPracticeNumbers, setSeasonAreas, setSeasonFocusSentence, setSeasonEnd, setTargetNumbers, setProtected, setAnswer } from "@/src/goals/planSteps/planChanges"
import { dueCards, routineGroups, weekItems, readingRows, rungsReachedBy, weekdayIndex, scaleLabels } from "@/src/goals/planSteps/daily/todayModel"
import { weekRows, pastWeeks, ratingStrip, climbs } from "@/src/goals/planSteps/daily/trackModel"
import { journalEntries, answeredQuestions } from "@/src/goals/planSteps/daily/journalModel"
import { seasonTakeKey } from "@/src/goals/planSteps/planFacts"
import type { NsPlan } from "@/src/goals/types"

const TODAY = "2026-11-18" // a Wednesday: index 2

describe("today model", () => {
  it("a new account carries the default daily rating, 1 to 5, Rough to Great", () => {
    const p = newAccountPlan()
    const f = p.fields.find((x) => x.id === "f_feeling")!
    expect(f.kind).toBe("number")
    expect(f.targetId).toBeNull()
    expect(scaleLabels(p, f.id)).toEqual({ low: "Rough", high: "Great" })
    expect(weekdayIndex(TODAY)).toBe(2)
  })

  it("lists weekly items with their count this week, protected first, and Practice goals", () => {
    let p = newAccountPlan()
    p = addBigGoal(p, "Big")
    p = setSeasonAreas(p, [p.areas[0].id])
    const made = addSeasonGoal(p, p.areas[0].id, "Train")!
    p = setGoalKind(made.plan, made.id, "habit_ramp")
    p = setPracticeNumbers(p, made.id, { unit: "times", perWeek: 3, ease: null })
    p = addAction(p, made.id, "Stretch", 2)
    const step = p.routines.flatMap((r) => r.steps).find((s) => s.title === "Stretch")!.id
    p = setProtected(p, step)
    p = countGoal(p, TODAY, made.id, 1)
    p = toggleStepLogged(p, "2026-11-17", step)
    const items = weekItems(p, TODAY)
    expect(items.map((i) => i.title)).toEqual(["Stretch", "Train"])
    expect(items[0]).toMatchObject({ protected: true, count: 1, target: 2 })
    expect(items[1]).toMatchObject({ kind: "goal", count: 1, target: 3 })
  })

  it("groups the routine steps of today by start time", () => {
    let p = newAccountPlan()
    p = addAction(addSeasonGoal(setSeasonAreas(p, [p.areas[0].id]), p.areas[0].id, "G")!.plan, "x", "y", 1)
    expect(routineGroups(p, TODAY)).toEqual([])
  })

  it("reads a Target climb: latest reading, next rung, how far to go, and which rungs a reading reaches", () => {
    let p = newAccountPlan()
    const made = addSeasonGoal(setSeasonAreas(p, [p.areas[0].id]), p.areas[0].id, "Bench")!
    p = setGoalKind(made.plan, made.id, "milestone_ladder")
    p = setTargetNumbers(p, made.id, { unit: "kg", from: 80, to: 100, count: 5, shape: "even", by: "2027-02-18" })
    p = setGoalReading(p, TODAY, made.id, 85)
    const row = readingRows(p, TODAY)[0]
    expect(row.latest).toBe(85)
    expect(row.nextValue).toBeGreaterThan(80)
    expect(row.toGo).toBeGreaterThanOrEqual(0)
    const goal = p.goals.find((g) => g.id === made.id)!
    expect(rungsReachedBy(goal, 100).length).toBeGreaterThanOrEqual(goal.checkpoints.filter((c) => !Number.isNaN(parseFloat(c.title))).length - 1)
    expect(rungsReachedBy(goal, 50)).toEqual([])
  })

  it("shows at most two due cards in the spec's order", () => {
    let p = newAccountPlan()
    p = setSeasonFocusSentence(p, "Focus", TODAY)
    p = setSeasonEnd(p, "2026-11-20", TODAY)
    const cards = dueCards(p, TODAY, [{ id: "review.due", href: "/r" }, { id: "goals.past-date", href: "/g", itemId: "zz" }], "/s", "/c", "/run")
    expect(cards.map((c) => c.id)).toEqual(["review", "season-ending"])
    expect(cards[1].days).toBe(2)
    p = setSeasonEnd(p, "2026-11-01", TODAY)
    expect(dueCards(p, TODAY, [], "/s", "/c", "/run").map((c) => c.id)).toEqual(["season-ended"])
  })
})

describe("track model", () => {
  it("shows a week strip, past weeks with something done, a rating strip, and climbs", () => {
    let p = newAccountPlan()
    const made = addSeasonGoal(setSeasonAreas(p, [p.areas[0].id]), p.areas[0].id, "Run")!
    p = setGoalKind(made.plan, made.id, "habit_ramp")
    p = setPracticeNumbers(p, made.id, { unit: "times", perWeek: 3, ease: [{ frequencyPerWeek: 1, durationWeeks: 2 }, { frequencyPerWeek: 3, durationWeeks: 4 }] })
    p = countGoal(p, TODAY, made.id, 1)
    p = countGoal(p, "2026-11-10", made.id, 1)
    const rows = weekRows(p, TODAY)
    expect(rows[0]).toMatchObject({ done: 1, planned: 3 })
    expect(rows[0].days).toEqual([0, 0, 1, 0, 0, 0, 0])
    expect(pastWeeks(p, TODAY).map((w) => w.monday)).toEqual(["2026-11-09"])
    p = setDayNumber(p, TODAY, "f_feeling", 4)
    const strip = ratingStrip(p, "f_feeling", TODAY, 30)
    expect(strip).toHaveLength(30)
    expect(strip.at(-1)).toEqual({ date: TODAY, value: 4 })
    expect(climbs(p, TODAY).some((c) => c.kind === "practice")).toBe(true)
  })
})

describe("journal model", () => {
  it("lists every answer, note, check-in text and season take-away, newest first, also for questions that are gone", () => {
    let p: NsPlan = addDailyField(newAccountPlan(), null, "What did I learn?", "write")
    const fid = p.fields.at(-1)!.id
    p = setJournalEntry(p, "2026-11-10", fid, "Slow is fast")
    p = { ...p, journal: { ...p.journal, "2026-11-01": { gone1: "From a question since removed" } } }
    p = setDayNote(p, "2026-11-12", "Strong evening")
    p = { ...p, reviews: [{ id: "w", cadence: "week", periodStart: "2026-11-02", periodEnd: "2026-11-08", writtenOn: "2026-11-09", scores: {}, magicMoments: "", lessons: "Late shifts", nextOutcomes: "" }] }
    p = { ...p, pastSeasons: [{ id: "s1", startedOn: "2026-08-01", endsOn: null, endedOn: "2026-10-30", sentence: "", answers: {}, areaIds: [], goalIds: [], focusId: null }] }
    p = setAnswer(p, seasonTakeKey("s1"), "Keep it small")
    const entries = journalEntries(p)
    expect(entries.map((e) => e.type)).toEqual(["day-note", "answer", "checkin", "answer", "season"])
    expect(entries.find((e) => e.questionId === "gone1")).toMatchObject({ question: null, text: "From a question since removed" })
    expect(answeredQuestions(entries).map((q) => q.id).sort()).toEqual([fid, "gone1"].sort())
  })
})


