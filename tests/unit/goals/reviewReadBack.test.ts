import { describe, it, expect } from "vitest"
import { addCustomStep, addGoal, emptyNsPlan, removeGoal, serializeNsPlan, normalizeNsPlan, updateGoal } from "@/src/goals/northStarService"
import { destination, toggleStepLogged } from "@/src/goals/northStarTrackService"
import { periodOf, reviewFor, writeReview } from "@/src/goals/reviewService"
import { goalsReadBack, previousOutcomes, routinesReadBack } from "@/src/goals/reviewReadBack"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import type { NsPlan } from "@/src/goals/types"

/**
 * THE REVIEW READS THE PERIOD BACK (Plans/life-plan-review-reads-back.md):
 * each counted goal against its number, the season's goals and the rest, the
 * routines, last period's Next outcomes, and an answer per goal saved with
 * the review.
 */

const NOW = "2026-11-05T09:00:00.000Z"
// A Thursday; its week runs 2 – 8 Nov.
const TODAY = "2026-11-05"

const count = (plan: NsPlan, date: string, goalId: string, n: number): NsPlan =>
  ({ ...plan, numbers: { ...plan.numbers, [date]: { ...(plan.numbers[date] ?? {}), [goalId]: n } } })

function planWithGoals(): NsPlan {
  let p = addGoal(emptyNsPlan(), "lm_relationship", "Approaches", "habit_ramp", NOW)
  p = updateGoal(p, p.goals[0].id, { perWeek: 21, unit: "approaches", daysPerWeek: 7 }, NOW)
  p = addGoal(p, "lm_health", "Quit weed for 100 days", "achievement", NOW)
  p = updateGoal(p, p.goals[1].id, { servesOneThing: true }, NOW)
  p = addGoal(p, "lm_fun", "Northern lights", "achievement", NOW)
  return p
}

describe("the goals, read back over a period", () => {
  it("gives a counted goal the week's count against its number, then the season's goals, then the rest", () => {
    let p = planWithGoals()
    const [approaches, quit, lights] = p.goals
    p = count(p, "2026-11-02", approaches.id, 6)
    p = count(p, "2026-11-04", approaches.id, 12)
    p = count(p, "2026-10-30", approaches.id, 40) // the week before: not this one
    const back = goalsReadBack(p, periodOf("week", TODAY), TODAY)
    expect(back.counted).toEqual([expect.objectContaining({ goal: expect.objectContaining({ id: approaches.id }), count: 18, target: 21 })])
    expect(back.season.map((g) => g.id)).toEqual([quit.id])
    expect(back.rest.map((g) => g.id)).toEqual([lights.id])
  })

  it("says weeks on target for a month, counting a week still running only once it is met", () => {
    let p = addGoal(emptyNsPlan(), "lm_fitness", "Gym", "habit_ramp", NOW)
    const gym = p.goals[0].id
    p = updateGoal(p, gym, { perWeek: null, daysPerWeek: 2 }, NOW)
    for (const d of ["2026-10-05", "2026-10-07", "2026-10-12", "2026-10-26", "2026-10-28"]) p = count(p, d, gym, 1)
    const october = goalsReadBack(p, periodOf("month", "2026-10-15"), TODAY).counted[0]
    // Weeks starting in October: 5, 12, 19, 26. On target: 5 and 26.
    expect(october).toMatchObject({ count: 5, target: null, weeksMet: 2, weeks: 4 })
    // November so far: the week of 2 Nov has begun and is not met, so it does not count yet.
    expect(goalsReadBack(p, periodOf("month", TODAY), TODAY).counted[0]).toMatchObject({ weeksMet: 0, weeks: 0 })
  })

  it("judges a goal only from the week it was first counted, and leaves out a rest week asking for none", () => {
    let p = addGoal(emptyNsPlan(), "lm_fitness", "Gym", "habit_ramp", NOW)
    const gym = p.goals[0].id
    p = updateGoal(p, gym, { perWeek: null, daysPerWeek: 2, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 1 }, { frequencyPerWeek: 0, durationWeeks: 1 }, { frequencyPerWeek: 2, durationWeeks: 1 }] }, NOW)
    // First counted in the week of 12 Oct; 19 Oct is the rest week; 26 Oct met.
    for (const d of ["2026-10-12", "2026-10-14", "2026-10-26", "2026-10-28"]) p = count(p, d, gym, 1)
    expect(goalsReadBack(p, periodOf("month", "2026-10-15"), TODAY).counted[0]).toMatchObject({ weeksMet: 2, weeks: 2 })
    // A week review of the rest week shows a count, not "0 of 0".
    expect(goalsReadBack(p, periodOf("week", "2026-10-20"), TODAY).counted[0]).toMatchObject({ target: null })
  })
})

describe("the routines, read back", () => {
  it("counts each routine's ticks in the period against what its steps plan", () => {
    const base = emptyNsPlan()
    let p = addCustomStep(base, base.routines[0].id, "Cold shower", 5, 7, NOW)
    p = addCustomStep(p, p.routines[0].id, "Stretch", 10, 3, NOW)
    const [shower, stretch] = p.routines[0].steps.slice(-2)
    for (const d of ["2026-11-02", "2026-11-03", "2026-11-04"]) p = toggleStepLogged(p, d, shower.id)
    p = toggleStepLogged(p, "2026-11-03", stretch.id)
    const back = routinesReadBack(p, periodOf("week", TODAY), TODAY)
    // Monday to Thursday so far: the daily step plans 4, the three-a-week one 3 × 4/7.
    expect(back.find((r) => r.routine.id === p.routines[0].id)).toMatchObject({ done: 4, planned: 6 })
    // The whole week, looked at after it ended: 7 + 3.
    expect(routinesReadBack(p, periodOf("week", TODAY), "2026-11-12").find((r) => r.routine.id === p.routines[0].id)).toMatchObject({ planned: 10 })
    // A finished workout counts as the tick.
    const withWorkout = routinesReadBack(p, periodOf("week", TODAY), TODAY, { "2026-11-05": [stretch.id] })
    expect(withWorkout.find((r) => r.routine.id === p.routines[0].id)).toMatchObject({ done: 5 })
  })
})

describe("what the period before set out to bring", () => {
  it("reads last week's Next outcomes back, and nothing when there were none", () => {
    let p = emptyNsPlan()
    expect(previousOutcomes(p, periodOf("week", TODAY))).toBeNull()
    p = writeReview(p, periodOf("week", "2026-10-28"), { nextOutcomes: "Three sessions. One evening out." }, "2026-11-01", NOW)
    expect(previousOutcomes(p, periodOf("week", TODAY))).toEqual({
      text: "Three sessions. One evening out.",
      period: periodOf("week", "2026-10-28"),
    })
  })
})

describe("an answer per goal, saved with the review", () => {
  it("is written, taken back, kept through a save and the browser copy, and goes with its goal", () => {
    const week = periodOf("week", TODAY)
    const p0 = planWithGoals()
    const [approaches, quit] = p0.goals
    let p = writeReview(p0, week, { verdict: { goalId: approaches.id, value: "behind" } }, TODAY, NOW)
    p = writeReview(p, week, { verdict: { goalId: quit.id, value: "on_track" } }, TODAY, NOW)
    expect(reviewFor(p, week)!.verdicts).toEqual({ [approaches.id]: "behind", [quit.id]: "on_track" })

    // Not a goal of this plan, or not an answer: refused.
    expect(writeReview(p, week, { verdict: { goalId: "nope", value: "behind" } }, TODAY, NOW)).toBe(p)

    const minted = new Map<string, string>()
    let n = 0
    const rows = planToRows(p, {
      planId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      idFor: (l) => minted.get(l) ?? minted.set(l, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`).get(l)!,
    })
    expect(rows.review_goals.map((r) => r.verdict).sort()).toEqual(["behind", "on_track"])
    expect(rowsToPlan(rows)!.reviews).toEqual(p.reviews)
    expect(normalizeNsPlan(JSON.parse(serializeNsPlan(p)))!.reviews).toEqual(p.reviews)

    // Taking the only things out leaves no review; removing a goal takes its answer.
    const gone = removeGoal(p, approaches.id, NOW)
    expect(reviewFor(gone, week)!.verdicts).toEqual({ [quit.id]: "on_track" })
    const cleared = writeReview(writeReview(p, week, { verdict: { goalId: approaches.id, value: null } }, TODAY, NOW), week, { verdict: { goalId: quit.id, value: null } }, TODAY, NOW)
    expect(reviewFor(cleared, week)).toBeNull()
  })
})

describe("the weekly-review routine step", () => {
  it("opens the Review step, the old Journal link included", () => {
    const p = emptyNsPlan()
    expect(destination(p, "review")?.home).toEqual({ tab: "review" })
    expect(destination(p, "journal:weekly-review")?.home).toEqual({ tab: "review" })
    expect(destination(p, "journal:field-report")?.home.tab).toBe("journal")
  })
})
