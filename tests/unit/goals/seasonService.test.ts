import { describe, it, expect } from "vitest"
import { emptyNsPlan, setAnswer, toggleSeasonArea, setSeasonFocus, addGoal, planIsUntouched } from "@/src/goals/northStarService"
import { planHasNothingWritten } from "@/src/goals/lifePlanSync"
import { currentSeasonOneThing, pastSeasonOneThings, removePastSeason, writeSeasonOneThing } from "@/src/goals/seasonService"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import { ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import type { NsPlan } from "@/src/goals/types"

const TODAY = "2026-11-04"
const DEFAULT_DUE = "2027-02-02"
const NOW = "2026-11-04T09:00:00.000Z"

function must(out: ReturnType<typeof writeSeasonOneThing>): NsPlan {
  if (!out.ok) throw new Error(out.reason)
  return out.plan
}

function rows(plan: NsPlan) {
  const minted = new Map<string, string>()
  let n = 0
  return planToRows(plan, {
    planId: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    idFor: (l) => minted.get(l) ?? minted.set(l, `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`).get(l)!,
  })
}

/** A season with a sentence, a why, a focus area and focus, and one goal inside it. */
function aSeason(): NsPlan {
  let plan = must(writeSeasonOneThing(emptyNsPlan(), "amend", "Quit vaping", undefined, "2026-09-01", "2026-11-30"))
  plan = setAnswer(plan, ONE_ANSWERS.why, "My lungs", NOW)
  plan = toggleSeasonArea(plan, "lm_health", NOW)
  plan = setSeasonFocus(plan, "lm_health", NOW)
  plan = addGoal(plan, "lm_health", "Thirty days clean", "achievement", NOW)
  return { ...plan, goals: plan.goals.map((g) => ({ ...g, servesOneThing: true })) }
}

describe("a plan holding only a one thing is a plan", () => {
  it("is saved, and is not taken for an empty account", () => {
    const plan = must(writeSeasonOneThing(emptyNsPlan(), "amend", "Quit vaping", undefined, TODAY, DEFAULT_DUE))
    expect(planIsUntouched(plan)).toBe(false)
    expect(planHasNothingWritten(plan)).toBe(false)
  })
})

describe("the one thing is the season's sentence", () => {
  it("the first sentence opens the first season, from today to the default deadline", () => {
    const plan = must(writeSeasonOneThing(emptyNsPlan(), "amend", "Quit vaping", undefined, TODAY, DEFAULT_DUE))
    expect(plan.season).toEqual({ id: "s1", startedOn: TODAY, endsOn: DEFAULT_DUE, sentence: "Quit vaping" })
    expect(currentSeasonOneThing(plan, TODAY)).toMatchObject({ body: "Quit vaping", startedOn: TODAY, dueOn: DEFAULT_DUE, lapsed: false })
  })

  it("a first sentence on a season made by its focus areas starts it today, with a deadline", () => {
    // Focus areas first: the plan already holds a season, with no sentence and no dates.
    const implied = toggleSeasonArea(emptyNsPlan(), "lm_health", NOW)
    expect(implied.season).toEqual({ id: "s1", startedOn: null, endsOn: null, sentence: "" })
    const next = must(writeSeasonOneThing(implied, "amend", "Quit vaping", undefined, TODAY, DEFAULT_DUE))
    expect(next.season).toEqual({ id: "s1", startedOn: TODAY, endsOn: DEFAULT_DUE, sentence: "Quit vaping" })
    expect(next.seasonAreaIds).toEqual(["lm_health"])
    expect(next.pastSeasons).toEqual([])
  })

  it("rewording keeps the season, its dates and what it holds", () => {
    const plan = aSeason()
    const next = must(writeSeasonOneThing(plan, "amend", "Quit vaping for good", undefined, TODAY, DEFAULT_DUE))
    expect(next.season).toEqual({ ...plan.season, sentence: "Quit vaping for good" })
    expect(next.seasonAreaIds).toEqual(plan.seasonAreaIds)
    expect(next.pastSeasons).toEqual([])
  })

  it("moving the deadline changes only the end", () => {
    const next = must(writeSeasonOneThing(aSeason(), "extend", "Quit vaping", "2027-01-31", TODAY, DEFAULT_DUE))
    expect(next.season).toMatchObject({ startedOn: "2026-09-01", endsOn: "2027-01-31" })
  })

  it("starting anew keeps the old season whole and opens an empty one", () => {
    const plan = aSeason()
    const next = must(writeSeasonOneThing(plan, "start", "Write the book", undefined, TODAY, DEFAULT_DUE))
    expect(next.pastSeasons).toEqual([
      {
        id: "s1",
        startedOn: "2026-09-01",
        endsOn: "2026-11-30",
        endedOn: TODAY,
        sentence: "Quit vaping",
        answers: { [ONE_ANSWERS.why]: "My lungs" },
        areaIds: ["lm_health"],
        goalIds: [plan.goals[0].id],
        focusId: "lm_health",
      },
    ])
    expect(next.season).toEqual({ id: "s2", startedOn: TODAY, endsOn: DEFAULT_DUE, sentence: "Write the book" })
    expect(next.answers[ONE_ANSWERS.why]).toBe("")
    expect(next.seasonAreaIds).toEqual([])
    expect(next.seasonFocusId).toBeNull()
    expect(next.goals.some((g) => g.servesOneThing)).toBe(false)
    expect(pastSeasonOneThings(next, TODAY).map((o) => o.body)).toEqual(["Quit vaping"])
  })

  it("refuses an empty sentence and a deadline already gone, in words", () => {
    expect(writeSeasonOneThing(emptyNsPlan(), "amend", "   ", undefined, TODAY, DEFAULT_DUE)).toMatchObject({ ok: false })
    expect(writeSeasonOneThing(aSeason(), "extend", "Quit vaping", "2026-01-01", TODAY, DEFAULT_DUE)).toEqual({
      ok: false,
      reason: "That day has already been. Pick one that is still ahead of you.",
    })
  })

  it("deletes a past season and nothing else", () => {
    const next = must(writeSeasonOneThing(aSeason(), "start", "Write the book", undefined, TODAY, DEFAULT_DUE))
    const gone = removePastSeason(next, "s1")
    expect(gone.pastSeasons).toEqual([])
    expect(gone.season).toEqual(next.season)
  })

  it("survives the trip to rows and back: one current season row, its areas and goals, and the past one", () => {
    const next = must(writeSeasonOneThing(aSeason(), "start", "Write the book", undefined, TODAY, DEFAULT_DUE))
    const withFocus = setSeasonFocus(toggleSeasonArea(next, "lm_mission", NOW), "lm_mission", NOW)
    const r = rows(withFocus)
    expect(r.seasons.filter((s) => s.ended_on === null)).toHaveLength(1)
    expect(r.season_areas.length).toBe(2)
    expect(r.season_goals.length).toBe(1)
    const back = rowsToPlan(r)!
    expect(back.season).toEqual(withFocus.season)
    expect(back.pastSeasons).toEqual(withFocus.pastSeasons)
    expect(back.seasonAreaIds).toEqual(["lm_mission"])
    expect(back.seasonFocusId).toBe("lm_mission")
  })
})
