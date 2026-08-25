/**
 * The track step — the join between a plan in localStorage and rows the app counts.
 *
 * The mapping is where a plan can quietly lie about itself, so the tests are
 * about the numbers surviving the crossing rather than about the shape of the
 * payload. Two of them exist because the goals hub computes progress as
 * `current / target` and completion as `current >= target`, and a plan can hold
 * goals that make both of those the wrong question.
 */

import { describe, it, expect } from "vitest"
import { addArea, addDailyField, addExperiences, addGoal, addCustomStep, addPractice, addSubStep, inferStepDestination, updateStep, dailyFieldsFor, dailyRating, dayNote, emptyNsPlan, journalEntry, journalHistory, linkGoal, loadNsPlan, moveDailyField, moveSubStep, placeStep, removeDailyField, removeSubStep, renameDailyField, renameSubStep, serializeNsPlan, setAnswer, setAreaReview, setDailyFieldKind, setDailyFieldSource, setDailyRating, setDayNote, setJournalEntry, setNorthStar, setValues, subStepProgress, subStepsFor, toggleExperienceDone, updateGoal, updateRoutine } from "@/src/goals/northStarService"
import { REVIEW_PROMPTS, STAR_ANCHOR, STAR_PROMPTS, TAB_ORDER } from "@/src/goals/data/northStar"
import {
  activityPerWeek,
  areaSlug,
  cadenceLabel,
  DRIVERS_GROUP_ID,
  fieldTargets,
  readSource,
  readSources,
  groupLogged,
  groupSummary,
  standingItems,
  trackGroups,
  buildTrackInserts,
  goalToInsert,
  pushedRealIds,
  trackGoalId,
  trackActivities,
  trackDays,
  trackRows,
  trackTemplateId,
  trackWeeks,
  todayItems,
  todayProgress,
  stepLogged,
  toggleStepLogged,
  unscheduledActivities,
  weekStartISO,
} from "@/src/goals/northStarTrackService"
import type { NsGoal, NsPlan } from "@/src/goals/types"
import { getOrphanedGoalIds, pruneTreeByTemplatePrefix } from "@/src/goals/goalsService"
import type { GoalWithProgress } from "@/src/goals/types"

const RUN = "run1234"

/** Add a goal and hand back the plan plus the goal that was just added. */
function withGoal(plan: NsPlan, areaId: string, title: string, type: NsGoal["type"]) {
  const next = addGoal(plan, areaId, title, type)
  const goal = next.goals[next.goals.length - 1]
  return { plan: next, goal }
}

describe("what one plan goal becomes", () => {
  it("sends a driver as a weekly counter, counting things when it counts things", () => {
    // Twenty approaches a week and four gym days a week are the same field on
    // a lesser plan. The driver keeps them apart, and so must the push.
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_relationship", "Approaches", "habit_ramp")
    const withRate = updateGoal(plan, goal.id, { daysPerWeek: 4, perWeek: 20, unit: "approaches" })

    const insert = goalToInsert(withRate, RUN, withRate.goals[0])
    expect(insert.tracking_type).toBe("counter")
    expect(insert.period).toBe("weekly")
    expect(insert.target_value).toBe(20)
    expect(insert.goal_type).toBe("habit_ramp")
    // A driver is something you do, not something you get.
    expect(insert.goal_nature).toBe("input")
  })

  it("falls back to days a week when the driver only counts occasions", () => {
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
    const insert = goalToInsert(updateGoal(plan, goal.id, { daysPerWeek: 4, perWeek: null }), RUN, {
      ...goal,
      daysPerWeek: 4,
      perWeek: null,
    })
    expect(insert.target_value).toBe(4)
  })

  it("sends a climbing target as a counter with the ladder attached", () => {
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_fitness", "Bench press", "milestone_ladder")
    const ladder = { start: 60, target: 100, steps: 5, curveTension: 0, controlPoints: [], pins: [] }
    const next = updateGoal(plan, goal.id, { ladder, unit: "kg", targetDate: "2027-06-01" })

    const insert = goalToInsert(next, RUN, next.goals[0])
    expect(insert.tracking_type).toBe("counter")
    expect(insert.current_value).toBe(60)
    expect(insert.target_value).toBe(100)
    expect(insert.milestone_config).toEqual(ladder)
    // A dated climb ends on its date rather than at the end of the year.
    expect(insert.period).toBe("custom")
    expect(insert.custom_end_date).toBe("2027-06-01")
  })

  it("rounds a fractional ladder rather than sending a float to an integer column", () => {
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_fitness", "Body fat", "milestone_ladder")
    const next = updateGoal(plan, goal.id, {
      ladder: { start: 12.4, target: 85.6, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
    })
    const insert = goalToInsert(next, RUN, next.goals[0])
    expect(insert.current_value).toBe(12)
    expect(insert.target_value).toBe(86)
  })

  it("sends a DESCENDING ladder as a finish line, because a counter would read 100% on day one", () => {
    // computeGoalProgress is current/target and complete is current >= target.
    // 95 kg now, 85 kg by June, sent as a counter, is a goal that completes
    // itself the moment it is created. It goes over as done-or-not-done, and
    // the numbers go in the description so nothing is lost.
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_health", "Bodyweight", "milestone_ladder")
    const next = updateGoal(plan, goal.id, {
      ladder: { start: 95, target: 85, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
      unit: "kg",
    })

    const insert = goalToInsert(next, RUN, next.goals[0])
    expect(insert.tracking_type).toBe("boolean")
    expect(insert.target_value).toBe(1)
    expect(insert.current_value).toBeUndefined()
    expect(insert.milestone_config).toBeUndefined()
    expect(insert.description).toContain("From 95 kg down to 85 kg")
  })

  it("sends a finish line as a boolean", () => {
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_fun", "Ride a motorbike across Vietnam", "achievement")
    const insert = goalToInsert(plan, RUN, goal)
    expect(insert.tracking_type).toBe("boolean")
    expect(insert.target_value).toBe(1)
    expect(insert.goal_nature).toBe("outcome")
  })

  it("carries the why and the values across, inside the column limits", () => {
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_money", "Save 20k", "achievement")
    const next = updateGoal(plan, goal.id, {
      why: "x".repeat(900),
      values: ["freedom", "security", "discipline", "a", "b", "c", "d", "e"],
      title: "y".repeat(400),
    })

    const insert = goalToInsert(next, RUN, next.goals[0])
    expect(insert.motivation_note).toHaveLength(500)
    expect(insert.aligned_values).toHaveLength(7)
    expect(insert.title).toHaveLength(200)
  })
})

describe("which life area a goal lands in", () => {
  it("keeps all twelve wheel areas apart instead of folding them into the hub's five", () => {
    const plan = emptyNsPlan()
    const slugs = plan.areas.map((a) => areaSlug(a))
    expect(new Set(slugs).size).toBe(plan.areas.length)
    expect(slugs).toContain("fitness")
    expect(slugs).toContain("health")
    expect(slugs).toContain("money")
  })

  it("names an area the user added after its label, not its counter id", () => {
    const plan = addArea(emptyNsPlan(), "Brazilian Jiu-Jitsu")
    const added = plan.areas[plan.areas.length - 1]
    expect(added.custom).toBe(true)
    expect(areaSlug(added)).toBe("brazilian_jiu_jitsu")
  })
})

describe("the tag that makes a second push safe", () => {
  it("round-trips the plan goal id", () => {
    expect(trackGoalId(RUN, trackTemplateId(RUN, "g7"))).toBe("g7")
  })

  it("does not claim a goal made by hand", () => {
    expect(trackGoalId(RUN, null)).toBeNull()
    expect(trackGoalId(RUN, "fw:pillar/obj/tgt:x")).toBeNull()
  })

  it("does not match a goal from the plan that was thrown away", () => {
    // After "start over" the counter hands out g1 again. Without the run in
    // the tag the new g1 would be deduped onto the old g1's row: a goal that
    // never appears, under a title from a plan that no longer exists.
    expect(trackGoalId("run2", trackTemplateId("run1", "g1"))).toBeNull()
  })

  it("reads the hub's rows back into plan ids, ignoring everything else", () => {
    const map = pushedRealIds(RUN, [
      { id: "uuid-a", template_id: trackTemplateId(RUN, "g1") },
      { id: "uuid-b", template_id: trackTemplateId("otherrun", "g1") },
      { id: "uuid-c", template_id: null },
      { id: "uuid-d" },
    ])
    expect([...map.entries()]).toEqual([["g1", "uuid-a"]])
  })
})

describe("the order the push has to go in", () => {
  it("emits a parent before the child that feeds it, and links them by temp id", () => {
    const seed = emptyNsPlan()
    const a = withGoal(seed, "lm_money", "Ten grand a month", "achievement")
    const b = withGoal(a.plan, "lm_money", "Land three clients", "achievement")
    // The child feeds the parent, and it was written second, so priority order
    // alone would send it first and the link would be dropped.
    const linked = linkGoal(b.plan, b.goal.id, a.goal.id)

    const inserts = buildTrackInserts(linked, RUN)
    const ids = inserts.map((i) => i._tempId)
    expect(ids.indexOf(a.goal.id)).toBeLessThan(ids.indexOf(b.goal.id))
    expect(inserts.find((i) => i._tempId === b.goal.id)?._tempParentId).toBe(a.goal.id)
  })

  it("hangs a new goal off a parent that is ALREADY over there, by real uuid", () => {
    // Pushing five goals now and five next week has to build the same tree as
    // pushing ten at once. A temp id cannot reach a row from last week.
    const seed = emptyNsPlan()
    const a = withGoal(seed, "lm_money", "Ten grand a month", "achievement")
    const b = withGoal(a.plan, "lm_money", "Land three clients", "achievement")
    const linked = linkGoal(b.plan, b.goal.id, a.goal.id)

    const inserts = buildTrackInserts(linked, RUN, {
      goalIds: [b.goal.id],
      pushedRealIds: new Map([[a.goal.id, "real-uuid-of-a"]]),
    })
    expect(inserts).toHaveLength(1)
    expect(inserts[0].parent_goal_id).toBe("real-uuid-of-a")
    expect(inserts[0]._tempParentId).toBeNull()
  })

  it("sends a goal whose parent is in neither place as a goal with no parent", () => {
    const seed = emptyNsPlan()
    const a = withGoal(seed, "lm_money", "Ten grand a month", "achievement")
    const b = withGoal(a.plan, "lm_money", "Land three clients", "achievement")
    const linked = linkGoal(b.plan, b.goal.id, a.goal.id)

    const inserts = buildTrackInserts(linked, RUN, { goalIds: [b.goal.id] })
    expect(inserts).toHaveLength(1)
    expect(inserts[0]._tempParentId).toBeNull()
    expect(inserts[0].parent_goal_id).toBeUndefined()
  })

  it("sends every goal exactly once", () => {
    const seed = emptyNsPlan()
    const a = withGoal(seed, "lm_fitness", "One", "achievement")
    const b = withGoal(a.plan, "lm_money", "Two", "habit_ramp")
    const c = withGoal(b.plan, "lm_fun", "Three", "milestone_ladder")
    const inserts = buildTrackInserts(c.plan, RUN)
    expect(inserts.map((i) => i._tempId).sort()).toEqual([a.goal.id, b.goal.id, c.goal.id].sort())
  })
})

describe("the list the step shows", () => {
  it("says what each goal becomes and which are already over there", () => {
    const seed = emptyNsPlan()
    const a = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
    const withRate = updateGoal(a.plan, a.goal.id, { daysPerWeek: 4, perWeek: null })
    const b = withGoal(withRate, "lm_fun", "See the northern lights", "achievement")

    const rows = trackRows(b.plan, RUN, new Map([[a.goal.id, "uuid-a"]]))
    const gym = rows.find((r) => r.goalId === a.goal.id)!
    const lights = rows.find((r) => r.goalId === b.goal.id)!

    expect(gym.shape).toBe("weekly")
    expect(gym.readout).toBe("4× a week")
    expect(gym.pushed).toBe(true)
    expect(gym.areaLabel).toBe("Fitness")

    expect(lights.shape).toBe("finish")
    expect(lights.readout).toBe("done or not done")
    // Deleted in the hub means pushable again, not permanently done.
    expect(lights.pushed).toBe(false)
  })

  it("renames with the plan — a retitled goal pushes its new title", () => {
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
    const renamed = updateGoal(plan, goal.id, { title: "Train four times a week" })
    expect(trackRows(renamed, RUN, new Map())[0].title).toBe("Train four times a week")
  })
})

describe("surviving the goals hub", () => {
  /**
   * THE ONE THAT MADE THE WHOLE STEP LOOK BROKEN.
   *
   * `GET /api/goals/tree` sweeps up any goal whose `template_id` is not in
   * GOAL_TEMPLATE_MAP and archives it, which is right for a catalogue goal
   * whose template was deleted. Every pushed goal carries an `ns:` tag that is
   * deliberately not in that registry, so the first render of the hub archived
   * the entire plan — the push succeeded, returned 201, and the goals were
   * gone by the time the page below them finished loading. Nothing errored.
   */
  it("does not read a pushed goal as an orphan to be archived", () => {
    const row = { id: "uuid-a", template_id: trackTemplateId(RUN, "g1") } as GoalWithProgress
    expect(getOrphanedGoalIds([row])).toEqual([])
  })

  it("still archives a goal pointing at a template that really is gone", () => {
    const row = { id: "uuid-b", template_id: "deleted_template_id" } as GoalWithProgress
    expect(getOrphanedGoalIds([row])).toEqual(["uuid-b"])
  })
})

describe("the hub embedded under the step shows THIS plan, not the account", () => {
  const node = (id: string, templateId: string | null, children: unknown[] = []) =>
    ({ id, template_id: templateId, children }) as never

  it("drops goals made by hand and goals from another run", () => {
    const tree = [
      node("hand", null),
      node("mine", trackTemplateId(RUN, "g1")),
      node("other-run", trackTemplateId("otherrun", "g1")),
      node("catalogue", "daygame_approaches_10"),
    ]
    const kept = pruneTreeByTemplatePrefix(tree, trackTemplateId(RUN, ""))
    expect(kept.map((n) => n.id)).toEqual(["mine"])
  })

  it("promotes a plan goal hanging off a goal made by hand instead of losing it with the parent", () => {
    const tree = [node("hand", null, [node("mine", trackTemplateId(RUN, "g2"))])]
    const kept = pruneTreeByTemplatePrefix(tree, trackTemplateId(RUN, ""))
    expect(kept.map((n) => n.id)).toEqual(["mine"])
  })

  it("keeps a plan goal's own children under it", () => {
    const tree = [node("parent", trackTemplateId(RUN, "g1"), [node("child", trackTemplateId(RUN, "g2"))])]
    const kept = pruneTreeByTemplatePrefix(tree, trackTemplateId(RUN, ""))
    expect(kept).toHaveLength(1)
    expect(kept[0].children.map((c) => c.id)).toEqual(["child"])
  })
})

describe("the schedule: what you will actually be doing", () => {
  /**
   * THE POINT OF THE WHOLE VIEW.
   *
   * "Bench 100 kg" and "see the northern lights" are what the doing is for.
   * Neither happens on a Tuesday, and a weekly grid holding them reads as a
   * week you failed at them, every week, until the one you did not.
   */
  it("leaves milestones and finish lines out, and keeps the drivers", () => {
    const seed = emptyNsPlan()
    const a = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
    const b = withGoal(a.plan, "lm_fitness", "Bench 100 kg", "milestone_ladder")
    const c = withGoal(b.plan, "lm_fun", "See the northern lights", "achievement")

    const titles = trackActivities(c.plan).map((x) => x.title)
    expect(titles).toContain("Gym")
    expect(titles).not.toContain("Bench 100 kg")
    expect(titles).not.toContain("See the northern lights")
  })

  it("counts a driver in what it counts, not in days, when it counts things", () => {
    const seed = emptyNsPlan()
    const { plan, goal } = withGoal(seed, "lm_relationship", "Approaches", "habit_ramp")
    const next = updateGoal(plan, goal.id, { daysPerWeek: 4, perWeek: 20, unit: "approaches" })
    const activity = trackActivities(next).find((x) => x.title === "Approaches")!
    expect(activity.perWeek).toBe(20)
    expect(activity.unit).toBe("approaches")
  })

  describe("the ramp, which is the thing a plan cannot tell you by reading it", () => {
    const ramped = (ramp: { frequencyPerWeek: number; durationWeeks: number }[]) => {
      const seed = emptyNsPlan()
      const { plan, goal } = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
      const next = updateGoal(plan, goal.id, { daysPerWeek: 5, perWeek: null, rampSteps: ramp })
      return trackActivities(next).find((x) => x.title === "Gym")!
    }

    it("holds the ease-in rate through its weeks, then the steady rate after", () => {
      const gym = ramped([
        { frequencyPerWeek: 2, durationWeeks: 3 },
        { frequencyPerWeek: 3, durationWeeks: 2 },
      ])
      expect([1, 2, 3, 4, 5, 6, 7].map((w) => activityPerWeek(gym, w))).toEqual([2, 2, 2, 3, 3, 5, 5])
    })

    it("is the steady rate all the way through when there is no ramp", () => {
      const seed = emptyNsPlan()
      const { plan, goal } = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
      const gym = trackActivities(updateGoal(plan, goal.id, { daysPerWeek: 4, perWeek: null }))[0]
      expect([1, 5, 40].map((w) => activityPerWeek(gym, w))).toEqual([4, 4, 4])
    })

    it("marks the week the number goes up, and only that week", () => {
      const seed = emptyNsPlan()
      const { plan, goal } = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
      const next = updateGoal(plan, goal.id, {
        daysPerWeek: 4,
        perWeek: null,
        rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 2 }],
      })
      const weeks = trackWeeks(next, "2026-08-18", 4)
      expect(weeks.map((w) => w.rows[0].perWeek)).toEqual([2, 2, 4, 4])
      expect(weeks.map((w) => w.rows[0].stepsUp)).toEqual([false, false, true, false])
    })
  })

  it("starts the weeks on the Monday of the week you are looking at it", () => {
    // 2026-08-18 is a Tuesday.
    expect(weekStartISO("2026-08-18")).toBe("2026-08-17")
    expect(weekStartISO("2026-08-17")).toBe("2026-08-17")
    expect(weekStartISO("2026-08-23")).toBe("2026-08-17")
    expect(trackWeeks(emptyNsPlan(), "2026-08-18", 2).map((w) => w.startISO)).toEqual(["2026-08-17", "2026-08-24"])
  })

  describe("by day", () => {
    /** A morning-routine step, placed on Monday and Thursday at 07:00. */
    const withPlacedStep = () => {
      const seed = emptyNsPlan()
      const routine = seed.routines[0]
      const added = addCustomStep(seed, routine.id, "Cold shower", 5, 2)
      const step = added.routines.find((r) => r.id === routine.id)!.steps.slice(-1)[0]
      return { plan: placeStep(added, routine.id, step.id, [0, 3], 7 * 60), stepId: step.id }
    }

    it("puts a placed step on its own days and no others", () => {
      const { plan } = withPlacedStep()
      // Monday 2026-08-17 through Sunday.
      const days = trackDays(plan, "2026-08-17", 7)
      const onIt = days.filter((d) => d.items.some((i) => i.activity.title === "Cold shower"))
      expect(onIt.map((d) => d.weekday)).toEqual([0, 3])
      expect(onIt[0].items.find((i) => i.activity.title === "Cold shower")!.startMin).toBe(420)
    })

    it("does not invent a day for something that only said how often", () => {
      const seed = emptyNsPlan()
      const { plan, goal } = withGoal(seed, "lm_fitness", "Gym", "habit_ramp")
      const next = updateGoal(plan, goal.id, { daysPerWeek: 4, perWeek: null })
      for (const day of trackDays(next, "2026-08-17", 7)) {
        expect(day.items.some((i) => i.activity.title === "Gym")).toBe(false)
      }
      // …and it is not lost either.
      expect(unscheduledActivities(next).map((a) => a.title)).toContain("Gym")
    })

    it("marks the day you are looking at it, and starts there", () => {
      const days = trackDays(emptyNsPlan(), "2026-08-18", 7)
      expect(days[0].dateISO).toBe("2026-08-18")
      expect(days[0].isToday).toBe(true)
      expect(days.slice(1).every((d) => !d.isToday)).toBe(true)
    })
  })
})

describe("today: what you actually did", () => {
  /** A morning step on Mon+Thu, and a driver that names no day. */
  const seedDay = () => {
    const seed = emptyNsPlan()
    const routine = seed.routines[0]
    const added = addCustomStep(seed, routine.id, "Cold shower", 5, 2)
    const step = added.routines.find((r) => r.id === routine.id)!.steps.slice(-1)[0]
    const placed = placeStep(added, routine.id, step.id, [0, 3], 7 * 60)
    const withGoalAdded = addGoal(placed, "lm_relationship", "Approaches", "habit_ramp")
    const driver = withGoalAdded.goals[withGoalAdded.goals.length - 1]
    return { plan: updateGoal(withGoalAdded, driver.id, { perWeek: 20, unit: "approaches" }), stepId: step.id, driverId: driver.id }
  }

  const MONDAY = "2026-08-17"
  const TUESDAY = "2026-08-18"

  it("puts what is on today first, and keeps the rest inputtable", () => {
    const { plan, stepId } = seedDay()
    const items = todayItems(plan, MONDAY, [], RUN)
    expect(items[0].activity.id).toBe(stepId)
    expect(items[0].when).toBe("today")
    // A driver names no day, so today is as good a day as any: doing your
    // approaches on an unplanned day still happened.
    expect(items.find((i) => i.activity.title === "Approaches")!.when).toBe("anyDay")
  })

  it("does not put a step on a day it is not on", () => {
    const { plan, stepId } = seedDay()
    const item = todayItems(plan, TUESDAY, [], RUN).find((i) => i.activity.id === stepId)!
    expect(item.when).toBe("otherDay")
  })

  /**
   * THE MIDDLE ANSWER, which used to fall into "not today".
   *
   * A weekly review and a piece of content written once a week name no day.
   * Filed beside Thursday's stack they read as "not your problem today", which
   * is wrong on exactly the day you sit down to do them.
   */
  it("keeps a rate that names no day out of both 'today' and 'another day'", () => {
    const seed = emptyNsPlan()
    const routine = seed.routines[2]
    const weekly = addCustomStep(seed, routine.id, "Weekly review", 30, 1)
    const daily = addCustomStep(weekly, routine.id, "One most important task", 90, 7)
    const items = todayItems(daily, MONDAY, [], RUN)

    expect(items.find((i) => i.activity.title === "Weekly review")!.when).toBe("anyDay")
    // Seven days a week is every day, this one included, even unplaced.
    expect(items.find((i) => i.activity.title === "One most important task")!.when).toBe("today")
  })

  it("counts only what is on today towards today's total", () => {
    const seed = emptyNsPlan()
    const routine = seed.routines[2]
    const plan = addCustomStep(addCustomStep(seed, routine.id, "Weekly review", 30, 1), routine.id, "One most important task", 90, 7)
    expect(todayProgress(todayItems(plan, MONDAY, [], RUN))).toEqual({ done: 0, total: 1 })
  })

  describe("how often it runs, said on the row", () => {
    const stepCadence = (title: string, minutes: number, daysPerWeek: number, days?: number[]) => {
      const seed = emptyNsPlan()
      const routine = seed.routines[0]
      const added = addCustomStep(seed, routine.id, title, minutes, daysPerWeek)
      const made = added.routines.find((r) => r.id === routine.id)!.steps.slice(-1)[0]
      const plan = days ? placeStep(added, routine.id, made.id, days, null) : added
      return cadenceLabel(trackActivities(plan).find((a) => a.title === title)!)
    }

    it("says the rate when no day has been chosen", () => {
      expect(stepCadence("Weekly review", 30, 1)).toBe("Once a week")
      expect(stepCadence("Gym", 60, 3)).toBe("3× a week")
      expect(stepCadence("Water", 1, 7)).toBe("Every day")
    })

    it("says the days when days have been chosen, while they still fit", () => {
      expect(stepCadence("A", 5, 2, [0, 3])).toBe("Mon · Thu")
      expect(stepCadence("B", 5, 5, [0, 1, 2, 3, 4])).toBe("Weekdays")
      expect(stepCadence("C", 5, 7, [0, 1, 2, 3, 4, 5, 6])).toBe("Every day")
      expect(stepCadence("D", 5, 4, [0, 1, 2, 5])).toBe("4× a week")
    })

    it("says what a driver counts, in what it counts", () => {
      const seed = emptyNsPlan()
      const { plan, goal } = withGoal(seed, "lm_relationship", "Approaches", "habit_ramp")
      const counted = updateGoal(plan, goal.id, { perWeek: 20, unit: "approaches" })
      expect(cadenceLabel(trackActivities(counted)[0])).toBe("20 approaches a week")

      const occasions = updateGoal(plan, goal.id, { daysPerWeek: 4, perWeek: null })
      expect(cadenceLabel(trackActivities(occasions)[0])).toBe("4× a week")
    })
  })

  it("remembers the tick, and takes it back", () => {
    const { plan, stepId } = seedDay()
    expect(stepLogged(plan, MONDAY, stepId)).toBe(false)
    const ticked = toggleStepLogged(plan, MONDAY, stepId)
    expect(stepLogged(ticked, MONDAY, stepId)).toBe(true)
    // …and only on that day.
    expect(stepLogged(ticked, TUESDAY, stepId)).toBe(false)
    expect(stepLogged(toggleStepLogged(ticked, MONDAY, stepId), MONDAY, stepId)).toBe(false)
  })

  it("SURVIVES A RELOAD — the tick, the rating and the note are all on the plan", () => {
    // The whole point of the step. A tick that is gone when you come back is
    // worse than no tick, because you will not notice until the week is over.
    const { plan, stepId } = seedDay()
    const written = setDayNote(
      setDailyRating(toggleStepLogged(plan, MONDAY, stepId), MONDAY, "lm_health", 7),
      MONDAY,
      "Slept badly, went anyway."
    )
    const reloaded = loadNsPlan(serializeNsPlan(written))!
    expect(stepLogged(reloaded, MONDAY, stepId)).toBe(true)
    expect(dailyRating(reloaded, MONDAY, "lm_health")).toBe(7)
    expect(dayNote(reloaded, MONDAY)).toBe("Slept badly, went anyway.")
  })

  it("drops a tick whose step has been deleted rather than rendering a blank row", () => {
    const { plan, stepId } = seedDay()
    const ticked = toggleStepLogged(plan, MONDAY, stepId)
    const raw = JSON.parse(serializeNsPlan(ticked))
    raw.routines = raw.routines.map((r: { steps: { id: string }[] }) => ({ ...r, steps: r.steps.filter((st) => st.id !== stepId) }))
    const reloaded = loadNsPlan(JSON.stringify(raw))!
    expect(stepLogged(reloaded, MONDAY, stepId)).toBe(false)
  })

  it("hands a driver its real goal and this week's count, once it has been pushed", () => {
    const { plan, driverId } = seedDay()
    const hub = [{ id: "uuid-a", template_id: trackTemplateId(RUN, driverId), current_value: 12, target_value: 20 }]
    const item = todayItems(plan, MONDAY, hub, RUN).find((i) => i.activity.id === driverId)!
    expect(item.goalId).toBe("uuid-a")
    expect(item.current).toBe(12)
    expect(item.target).toBe(20)
  })

  it("gives an unpushed driver NO local tally to disagree with the real one later", () => {
    const { plan, driverId } = seedDay()
    const item = todayItems(plan, MONDAY, [], RUN).find((i) => i.activity.id === driverId)!
    expect(item.goalId).toBeNull()
    expect(item.current).toBeNull()
  })

  it("counts only today's own steps as the day's list", () => {
    const { plan, stepId } = seedDay()
    // A driver has a weekly count, not a tick, so it is not part of "3 of 4".
    expect(todayProgress(todayItems(plan, MONDAY, [], RUN))).toEqual({ done: 0, total: 1 })
    const ticked = toggleStepLogged(plan, MONDAY, stepId)
    expect(todayProgress(todayItems(ticked, MONDAY, [], RUN))).toEqual({ done: 1, total: 1 })
  })

  it("leaves a plan saved before any of this existed alone", () => {
    // Old saves have no `logged` and no `notes`; they must load, not throw.
    const raw = JSON.parse(serializeNsPlan(emptyNsPlan()))
    delete raw.logged
    delete raw.notes
    const reloaded = loadNsPlan(JSON.stringify(raw))!
    expect(reloaded.logged).toEqual({})
    expect(reloaded.notes).toEqual({})
  })
})

/**
 * YOUR OWN TEXT FIELDS: the half of a day that is not a number.
 *
 * Reported from the page: "something like my daily thing I track of 'one key
 * learning of today'". The plan could count a thing and rate an area and hold
 * one note about the whole day, and none of those is a question hung off the
 * goal that provoked it.
 *
 * The tests are about what happens to the WRITING, because that is the part
 * that cannot be regenerated: it survives renaming the question, it survives
 * deleting the thing the question was attached to, and it goes — deliberately,
 * all of it — when the question itself is deleted.
 */
describe("the text fields you hang off your own goals", () => {
  const MONDAY = "2026-08-17"
  const TUESDAY = "2026-08-18"

  /** A driver, and a field asking one thing about it. */
  const seedField = () => {
    const { plan, goal } = withGoal(emptyNsPlan(), "lm_relationship", "Approaches", "habit_ramp")
    const withField = addDailyField(plan, goal.id, "One key learning")
    const field = withField.fields[withField.fields.length - 1]
    return { plan: withField, fieldId: field.id, goalId: goal.id }
  }

  it("starts unnamed, because a question nobody asked reads back as one they did", () => {
    const plan = addDailyField(emptyNsPlan(), null)
    expect(plan.fields[0].label).toBe("")
    expect(plan.fields[0].targetId).toBeNull()
  })

  it("keeps one answer per field per day", () => {
    const { plan, fieldId } = seedField()
    const mon = setJournalEntry(plan, MONDAY, fieldId, "Openers land better slower")
    const both = setJournalEntry(mon, TUESDAY, fieldId, "Stop qualifying so early")
    expect(journalEntry(both, MONDAY, fieldId)).toBe("Openers land better slower")
    expect(journalEntry(both, TUESDAY, fieldId)).toBe("Stop qualifying so early")
  })

  it("treats wrote-nothing and wrote-then-cleared as one state", () => {
    const { plan, fieldId } = seedField()
    const written = setJournalEntry(plan, MONDAY, fieldId, "Something")
    const cleared = setJournalEntry(written, MONDAY, fieldId, "   ")
    expect(cleared.journal[MONDAY]).toBeUndefined()
  })

  it("refuses an answer to a field that does not exist", () => {
    // Otherwise a stale id from a stale render writes a dated blob nothing can
    // ever label, show or delete.
    const plan = setJournalEntry(emptyNsPlan(), MONDAY, "f99", "orphan")
    expect(plan.journal).toEqual({})
  })

  it("leaves the answers alone when the question is renamed", () => {
    const { plan, fieldId } = seedField()
    const written = setJournalEntry(plan, MONDAY, fieldId, "Openers land better slower")
    const renamed = renameDailyField(written, fieldId, "What I would do again")
    expect(renamed.fields[0].label).toBe("What I would do again")
    expect(journalEntry(renamed, MONDAY, fieldId)).toBe("Openers land better slower")
  })

  it("takes the answers with it when the field itself is deleted", () => {
    const { plan, fieldId } = seedField()
    const written = setJournalEntry(plan, MONDAY, fieldId, "Openers land better slower")
    const gone = removeDailyField(written, fieldId)
    expect(gone.fields).toEqual([])
    // Not orphaned: an entry keyed to a field nothing can name is unreadable
    // and uneditable, so keeping it keeps nothing.
    expect(gone.journal).toEqual({})
  })

  it("moves a field between a goal and the day itself", () => {
    const { plan, fieldId, goalId } = seedField()
    expect(dailyFieldsFor(plan, goalId).map((f) => f.id)).toEqual([fieldId])
    const onTheDay = moveDailyField(plan, fieldId, null)
    expect(dailyFieldsFor(onTheDay, goalId)).toEqual([])
    expect(dailyFieldsFor(onTheDay, null).map((f) => f.id)).toEqual([fieldId])
  })

  /**
   * THE ONE THAT DECIDES WHETHER THIS IS SAFE TO USE.
   *
   * `logged` prunes a tick whose step is gone, and that is right for a tick.
   * Doing the same to a field would delete the question AND every answer under
   * it because a step was deleted in another tab — months of writing lost to
   * tidying up a dangling id. It re-homes to the day instead.
   */
  it("re-homes a field to the day when what it was attached to is gone", () => {
    const { plan, fieldId, goalId } = seedField()
    const written = setJournalEntry(plan, MONDAY, fieldId, "Openers land better slower")
    const raw = JSON.parse(serializeNsPlan(written))
    raw.goals = raw.goals.filter((g: { id: string }) => g.id !== goalId)
    raw.priorityIds = []

    const reloaded = loadNsPlan(JSON.stringify(raw))!
    expect(reloaded.fields).toHaveLength(1)
    expect(reloaded.fields[0].targetId).toBeNull()
    expect(journalEntry(reloaded, MONDAY, fieldId)).toBe("Openers land better slower")
  })

  it("survives a round trip through localStorage", () => {
    const { plan, fieldId, goalId } = seedField()
    const written = setJournalEntry(plan, MONDAY, fieldId, "Openers land better slower")
    const reloaded = loadNsPlan(serializeNsPlan(written))!
    expect(reloaded.fields).toEqual([
      { id: fieldId, label: "One key learning", targetId: goalId, kind: "write", readSourceId: null },
    ])
    expect(journalEntry(reloaded, MONDAY, fieldId)).toBe("Openers land better slower")
  })

  it("drops an answer whose field did not survive the load", () => {
    const { plan, fieldId } = seedField()
    const raw = JSON.parse(serializeNsPlan(setJournalEntry(plan, MONDAY, fieldId, "text")))
    raw.fields = []
    expect(loadNsPlan(JSON.stringify(raw))!.journal).toEqual({})
  })

  it("loads a plan saved before any of this existed", () => {
    const raw = JSON.parse(serializeNsPlan(emptyNsPlan()))
    delete raw.fields
    delete raw.journal
    const reloaded = loadNsPlan(JSON.stringify(raw))!
    expect(reloaded.fields).toEqual([])
    expect(reloaded.journal).toEqual({})
  })

  /**
   * WHAT THE PICKER CAN OFFER, which is more than the schedule draws.
   *
   * A field belongs on a milestone as readily as on a driver — "what moved the
   * bench number this week" is a question about the climb — and neither
   * milestones nor experiences appear in the week grid at all.
   */
  it("offers every part of the plan a field can hang off, under its own header", () => {
    const { plan: routines } = seedField()
    const withStep = addCustomStep(routines, routines.routines[0].id, "Cold shower", 5, 7)
    const withMilestone = withGoal(withStep, "lm_fitness", "Bench 100 kg", "milestone_ladder").plan
    const full = addExperiences(withMilestone, "See the northern lights", "lm_fun")

    const targets = fieldTargets(full)
    const titles = targets.map((t) => t.label)
    expect(titles).toContain("Approaches")
    expect(titles).toContain("Cold shower")
    expect(titles).toContain("Bench 100 kg")
    expect(titles).toContain("See the northern lights")
    // Every option says which header it appears under, so the picker is not
    // forty unlabelled titles in whatever order the plan holds them.
    expect(targets.every((t) => t.group.trim().length > 0)).toBe(true)
    // One id space, one entry each: a duplicate would render two identical
    // options and a field could be hung off the loser.
    expect(new Set(targets.map((t) => t.id)).size).toBe(targets.length)
  })
})

/**
 * A ROW THAT HANDS YOU SOMETHING TO READ, and the run of answers behind one
 * that asks.
 *
 * Reported from the page: "I have writing like 'read my north star' — I want
 * to see that I want to read my north star and immediately be able to read it.
 * And I want to end up somewhere I can see my past responses to that same
 * field." Two different fixes to the same complaint: a tick against a line
 * naming something four steps away is a tick nobody can honestly make, and a
 * box that only ever holds today throws away the one thing daily writing is
 * for.
 */
describe("reading something back, and the days before today", () => {
  const MONDAY = "2026-08-17"
  const TUESDAY = "2026-08-18"

  it("offers only what has actually been written", () => {
    const empty = emptyNsPlan()
    expect(readSources(empty).some((s) => s.id === "star")).toBe(false)
    const written = setNorthStar(empty, "I wake up in a house I chose, with work that is mine.")
    const star = readSources(written).find((s) => s.id === "star")!
    expect(star.text).toContain("a house I chose")
    // A picker full of blank promises is how somebody attaches a row to
    // nothing and reads an empty box every morning.
    expect(readSources(written).every((s) => s.text.trim().length > 0)).toBe(true)
  })

  it("resolves the text live, so editing the star changes what the row shows", () => {
    const first = setNorthStar(emptyNsPlan(), "First draft")
    expect(readSource(first, "star")!.text).toBe("First draft")
    const edited = setNorthStar(first, "Second draft")
    expect(readSource(edited, "star")!.text).toBe("Second draft")
  })

  it("says nothing rather than reading nothing when the source is gone", () => {
    // The row renders "that is empty, or no longer in your plan" off this null
    // instead of a blank panel under a line telling you to read something.
    expect(readSource(emptyNsPlan(), "star")).toBeNull()
    expect(readSource(emptyNsPlan(), null)).toBeNull()
  })

  it("flips a field between asking and showing without touching the answers", () => {
    const plan = addDailyField(emptyNsPlan(), null, "One key learning")
    const fieldId = plan.fields[0].id
    const written = setJournalEntry(plan, MONDAY, fieldId, "Slower openers")
    const read = setDailyFieldSource(setDailyFieldKind(written, fieldId, "read"), fieldId, "star")
    expect(read.fields[0].kind).toBe("read")
    // Still there, because one mis-click on a dropdown must not be how a month
    // of entries disappears.
    expect(journalEntry(read, MONDAY, fieldId)).toBe("Slower openers")
    expect(journalEntry(setDailyFieldKind(read, fieldId, "write"), MONDAY, fieldId)).toBe("Slower openers")
  })

  it("hands back every other day you answered, newest first", () => {
    const plan = addDailyField(emptyNsPlan(), null, "One key learning")
    const fieldId = plan.fields[0].id
    const other = addDailyField(plan, null, "Something else")
    const otherId = other.fields[1].id
    const mon = setJournalEntry(other, MONDAY, fieldId, "Monday's line")
    const tue = setJournalEntry(mon, TUESDAY, fieldId, "Tuesday's line")
    const mixed = setJournalEntry(tue, MONDAY, otherId, "A different question")

    expect(journalHistory(mixed, fieldId)).toEqual([
      { date: TUESDAY, text: "Tuesday's line" },
      { date: MONDAY, text: "Monday's line" },
    ])
    // Today is left out: the box above the list already holds it, and a day
    // appearing twice reads as two different answers.
    expect(journalHistory(mixed, fieldId, TUESDAY)).toEqual([{ date: MONDAY, text: "Monday's line" }])
  })
})

/**
 * THE FIELD THAT IS A DOOR.
 *
 * Reported from the page: "I want to be able to select a field and change it.
 * Like my north star. I want to click that, and then go to the north star… so
 * that field should ultimately always be coded as: when the user clicks that,
 * they go to the place where the information is, they get an option to read it,
 * and easily track it, and go back to where they were. But importantly, users
 * should be able to decide that a field is that type of field themselves."
 *
 * A read field QUOTES the thing, which is right for a paragraph you re-read at
 * 07:00 and wrong for anything you might want to change while you are looking
 * at it — a goal's date, its curve, how many times a week. Those controls exist
 * three tabs away, and a blockquote on Today is a picture of them.
 *
 * So every readable piece of the plan now also says WHERE IT LIVES, and the
 * kind is a dropdown on the field the user already owns rather than a second
 * kind of thing to add.
 */
describe("a field that takes you to the thing instead of quoting it", () => {
  const MONDAY = "2026-08-17"

  it("gives every source somewhere real to go", () => {
    const plan = setAreaReview(
      setNorthStar(withGoal(emptyNsPlan(), "lm_fitness", "Bench 100kg", "milestone_ladder").plan, "A house I chose."),
      "lm_fitness",
      { ten: "Strong, and it shows." }
    )
    const sources = readSources(plan)
    expect(sources.length).toBeGreaterThan(0)
    // A destination the rail cannot draw is a link into nothing.
    expect(sources.every((s) => TAB_ORDER.includes(s.home.tab))).toBe(true)
  })

  it("lands on the paragraph, not on the top of the step that holds five boxes", () => {
    const plan = setNorthStar(emptyNsPlan(), "A house I chose.")
    expect(readSource(plan, "star")!.home).toEqual({ tab: "star", anchor: STAR_ANCHOR })
  })

  it("sends each question to the step it is actually answered on", () => {
    // The two prompt sets read alike and are written three steps apart. A field
    // that lands you on the wrong one is a link that goes to the right page and
    // the wrong screen.
    const star = STAR_PROMPTS[0]
    const review = REVIEW_PROMPTS[0]
    const plan = setAnswer(setAnswer(emptyNsPlan(), star.id, "Because of my kids."), review.id, "Mornings.")
    expect(readSource(plan, `answer:${star.id}`)!.home).toEqual({ tab: "star", anchor: `star-${star.id}` })
    expect(readSource(plan, `answer:${review.id}`)!.home).toEqual({ tab: "commit", anchor: `prompt-${review.id}` })
  })

  it("opens an area's own dialog for anything written inside it", () => {
    const plan = setAreaReview(emptyNsPlan(), "lm_fitness", { ten: "Strong, and it shows.", purpose: "So I can carry my kids." })
    expect(readSource(plan, "area:lm_fitness:ten")!.home).toEqual({ tab: "now", areaId: "lm_fitness" })
    expect(readSource(plan, "area:lm_fitness:purpose")!.home).toEqual({ tab: "now", areaId: "lm_fitness" })
  })

  it("opens a goal's card, on the step that holds goals of its kind", () => {
    const { plan: withMilestone, goal: milestone } = withGoal(emptyNsPlan(), "lm_fitness", "Bench 100kg", "milestone_ladder")
    const { plan, goal: driver } = withGoal(withMilestone, "lm_relationship", "Approaches", "habit_ramp")

    expect(readSource(plan, `goal:${milestone.id}`)!.home).toEqual({
      tab: "milestones",
      areaId: "lm_fitness",
      goalId: milestone.id,
    })
    expect(readSource(plan, `goal:${driver.id}`)!.home).toEqual({
      tab: "systems",
      areaId: "lm_relationship",
      goalId: driver.id,
    })
  })

  it("offers the goal ITSELF, not only the paragraphs written about it", () => {
    // The four goal sources under this one are pieces of writing, and a goal
    // with none of them written offers nothing — which is exactly the goal you
    // most want to open, because the writing is what is missing.
    const { plan, goal } = withGoal(emptyNsPlan(), "lm_fitness", "Bench 100kg", "milestone_ladder")
    const itself = readSource(plan, `goal:${goal.id}`)!
    expect(itself.text).toContain("Bench 100kg")
    expect(readSource(plan, `goal:${goal.id}:why`)).toBeNull()
  })

  it("keeps the kind the user picked across a reload", () => {
    // The loader used to read anything that was not "read" as "write", so a
    // third kind would have quietly turned back into a text box overnight.
    const plan = setNorthStar(addDailyField(emptyNsPlan(), null, "Read my north star"), "A house I chose.")
    const fieldId = plan.fields[0].id
    const go = setDailyFieldSource(setDailyFieldKind(plan, fieldId, "go"), fieldId, "star")
    const reloaded = loadNsPlan(serializeNsPlan(go))!
    expect(reloaded.fields[0].kind).toBe("go")
    expect(reloaded.fields[0].readSourceId).toBe("star")
  })

  it("ticks off in the SAME store as everything else you did today", () => {
    // A go field can hang on the day itself, where no step carries a tick for
    // it — so it carries its own. One store, or "did you read it" gets two
    // answers.
    const plan = addDailyField(emptyNsPlan(), null, "Read my north star")
    const fieldId = plan.fields[0].id
    const ticked = toggleStepLogged(setDailyFieldKind(plan, fieldId, "go"), MONDAY, fieldId)
    expect(stepLogged(ticked, MONDAY, fieldId)).toBe(true)
    expect(ticked.logged[MONDAY]).toContain(fieldId)
    expect(stepLogged(loadNsPlan(serializeNsPlan(ticked))!, MONDAY, fieldId)).toBe(true)
  })

  it("flips between quoting and going without losing what it points at", () => {
    // Read and go pick from one list, so the choice between them is a dropdown
    // and not a field to delete and re-point.
    const plan = setNorthStar(addDailyField(emptyNsPlan(), null, "My north star"), "A house I chose.")
    const fieldId = plan.fields[0].id
    const read = setDailyFieldSource(setDailyFieldKind(plan, fieldId, "read"), fieldId, "star")
    const go = setDailyFieldKind(read, fieldId, "go")
    expect(go.fields[0].readSourceId).toBe("star")
    expect(readSource(go, go.fields[0].readSourceId)!.text).toContain("A house I chose")
  })
})

/**
 * THE ROW ITSELF IS THE DOOR.
 *
 * Reported from the page (2026-08-23), after clicking "Read your north star out
 * loud" on Today and staying exactly where they were: *"i still dont go there
 * when i click it on the today page… and i cant see where i would change it."*
 *
 * The first build put this on a field somebody had to BUILD next to the row, in
 * a section at the bottom of Today called "Your own text fields" — neither
 * where anybody was looking nor a name that means "this is where doors are
 * made". The step carries its own destination now, and the canon rows arrive
 * already pointing at the thing they name.
 */
describe("a routine step that goes to the thing it names", () => {
  it("wires the canon rows up without anybody configuring them", () => {
    expect(inferStepDestination("Read your north star out loud")).toBe("star")
    // The commonest version of this row is one somebody typed. Matched on the
    // phrase, not on a library id, so their own wording works too.
    expect(inferStepDestination("Read my north star before bed")).toBe("star")
    expect(inferStepDestination("Say your identity lines. The ones that start with I am")).toBe("answer:identity_total")
    expect(inferStepDestination("Speak your incantations out loud, with your whole body")).toBe("answer:affirmations")
  })

  it("points a row nowhere rather than at a guess", () => {
    expect(inferStepDestination("Big glass of water")).toBeNull()
  })

  /**
   * The one canon row that pointed nowhere, and why it no longer does.
   *
   * The driving force is the whole document — vision, purpose, identity,
   * standards, values — so aiming this row at one of five parts would have been
   * a guess, and it was left pointing nowhere on that reasoning. The reasoning
   * was right about the guess and wrong about the conclusion: the answer is to
   * make the whole a source, which is what `driving` is.
   */
  it("sends the driving force row to the whole document, composed from its five parts", () => {
    expect(inferStepDestination("Read your driving force. Vision, purpose, identity, standards, values")).toBe("driving")

    let plan = addPractice(emptyNsPlan(), "morning", "driving-force")
    plan = setNorthStar(plan, "I wake up near the water.")
    plan = setAnswer(plan, "star_why", "Because I have watched what the other version costs.")
    plan = setAnswer(plan, "identity_total", "I am a disciplined man.")
    plan = setAnswer(plan, "conduct", "To be on time.")
    plan = setValues(plan, ["Health", "Freedom"])

    const step = plan.routines.flatMap((r) => r.steps).find((s) => s.id === "driving-force")!
    expect(step.goesTo).toBe("driving")

    const source = readSource(plan, "driving")!
    // All five, in the order the recap page reads them, and nothing quoted from
    // anywhere but the plan itself.
    expect(source.text).toContain("I wake up near the water.")
    expect(source.text).toContain("Because I have watched what the other version costs.")
    expect(source.text).toContain("I am a disciplined man.")
    expect(source.text).toContain("To be on time.")
    expect(source.text).toContain("1. Health")
    expect(source.home.tab).toBe("recap")
  })

  /**
   * An empty plan has no driving force, and the row must say so rather than
   * open a page of headings over blank space — the rule every other read source
   * follows.
   */
  it("offers no driving force until something under it has been written", () => {
    expect(readSource(emptyNsPlan(), "driving")).toBeNull()
  })

  it("arrives already pointing there when the step is added", () => {
    const plan = addPractice(emptyNsPlan(), "manifestation", "read-star")
    const step = plan.routines.flatMap((r) => r.steps).find((s) => s.id === "read-star")!
    expect(step.goesTo).toBe("star")
    // And one written in somebody's own words, on the same rule.
    const routine = plan.routines[0]
    const own = addCustomStep(plan, routine.id, "Read my north star again", 2, 7)
    expect(own.routines.find((r) => r.id === routine.id)!.steps.at(-1)!.goesTo).toBe("star")
  })

  it("infers for a plan written before rows could be doors, but never argues with a clearing", () => {
    // ABSENT is a plan from before this existed: "read your north star out
    // loud" said the right words months ago and should arrive wired up. NULL is
    // somebody who cleared it, and inference must leave that alone.
    const plan = addPractice(emptyNsPlan(), "manifestation", "read-star")
    const raw = JSON.parse(serializeNsPlan(plan))
    const stepOf = (p: NsPlan) => p.routines.flatMap((r) => r.steps).find((s) => s.id === "read-star")!

    for (const r of raw.routines) for (const st of r.steps) delete st.goesTo
    expect(stepOf(loadNsPlan(JSON.stringify(raw))!).goesTo).toBe("star")

    const cleared = updateStep(plan, plan.routines.find((r) => r.steps.some((s) => s.id === "read-star"))!.id, "read-star", { goesTo: null })
    expect(stepOf(loadNsPlan(serializeNsPlan(cleared))!).goesTo).toBeNull()
  })

  it("does not rewire a step somebody has just renamed", () => {
    // Silently repointing a row because its new title happens to contain two
    // words is worse than leaving it where it was.
    const plan = addPractice(emptyNsPlan(), "morning", "water")
    const routineId = plan.routines[0].id
    const renamed = updateStep(plan, routineId, "water", { title: "Read your north star, then water" })
    expect(renamed.routines[0].steps.find((s) => s.id === "water")!.goesTo).toBeNull()
  })

  it("keeps a destination somebody picked by hand across a reload", () => {
    const seeded = setAreaReview(addPractice(emptyNsPlan(), "morning", "water"), "lm_fitness", { ten: "Strong, and it shows." })
    const routineId = seeded.routines[0].id
    const pointed = updateStep(seeded, routineId, "water", { goesTo: "area:lm_fitness:ten" })
    const reloaded = loadNsPlan(serializeNsPlan(pointed))!
    const step = reloaded.routines.flatMap((r) => r.steps).find((s) => s.id === "water")!
    expect(step.goesTo).toBe("area:lm_fitness:ten")
    expect(readSource(reloaded, step.goesTo)!.home).toEqual({ tab: "now", areaId: "lm_fitness" })
  })

  it("resolves to nothing, rather than to a door onto a blank page", () => {
    // The star step is wired up from the moment it is added, and the paragraph
    // is usually written later. Until then the row says the source is empty
    // instead of offering to open it.
    const plan = addPractice(emptyNsPlan(), "manifestation", "read-star")
    const step = plan.routines.flatMap((r) => r.steps).find((s) => s.id === "read-star")!
    expect(step.goesTo).toBe("star")
    expect(readSource(plan, step.goesTo)).toBeNull()
    expect(readSource(setNorthStar(plan, "A house I chose."), step.goesTo)!.text).toContain("A house I chose")
  })
})

/**
 * SUB-STEPS: the to-do list under a bigger weekly thing.
 *
 * Reported from the page: "I have a weekly thing of creating content. That's
 * really a bigger thing… I want to add sub-steps so I can generate my own
 * little to-do list of actions to take in order to complete that main action.
 * It is a little different than workout 5× a week, because that's just the
 * thing itself."
 */
describe("the sub-steps under a bigger weekly thing", () => {
  const MONDAY = "2026-08-17"

  const seedContent = () => {
    const { plan, goal } = withGoal(emptyNsPlan(), "lm_mission", "Write a piece of content", "habit_ramp")
    const one = addSubStep(plan, goal.id, "Pick the angle")
    const two = addSubStep(one, goal.id, "Write the outline")
    const three = addSubStep(two, goal.id, "Record it")
    return { plan: three, targetId: goal.id }
  }

  it("keeps each list under its own thing, in the order it was written", () => {
    const { plan, targetId } = seedContent()
    expect(subStepsFor(plan, targetId).map((u) => u.title)).toEqual(["Pick the angle", "Write the outline", "Record it"])
    expect(subStepsFor(plan, "nothing")).toEqual([])
  })

  it("refuses a blank line rather than adding an empty row", () => {
    const { plan, targetId } = seedContent()
    expect(subStepsFor(addSubStep(plan, targetId, "   "), targetId)).toHaveLength(3)
  })

  it("ticks off in the SAME store the routine steps use", () => {
    const { plan, targetId } = seedContent()
    const first = subStepsFor(plan, targetId)[0]
    const ticked = toggleStepLogged(plan, MONDAY, first.id)
    expect(stepLogged(ticked, MONDAY, first.id)).toBe(true)
    expect(subStepProgress(ticked, MONDAY, targetId)).toEqual({ done: 1, total: 3 })
    // One store for "what got done today", so a sub-step and a step cannot
    // come to disagree about what a tick means.
    expect(ticked.logged[MONDAY]).toContain(first.id)
  })

  it("survives a round trip, ticks and all", () => {
    const { plan, targetId } = seedContent()
    const ticked = toggleStepLogged(plan, MONDAY, subStepsFor(plan, targetId)[1].id)
    const reloaded = loadNsPlan(serializeNsPlan(ticked))!
    expect(subStepsFor(reloaded, targetId).map((u) => u.title)).toEqual(["Pick the angle", "Write the outline", "Record it"])
    expect(subStepProgress(reloaded, MONDAY, targetId)).toEqual({ done: 1, total: 3 })
  })

  it("reorders one list without shuffling another", () => {
    const { plan, targetId } = seedContent()
    const other = addGoal(plan, "lm_fitness", "Gym", "habit_ramp")
    const otherId = other.goals[other.goals.length - 1].id
    const withOther = addSubStep(addSubStep(other, otherId, "Pack the bag"), otherId, "Book the slot")

    const moved = moveSubStep(withOther, subStepsFor(withOther, targetId)[2].id, -1)
    expect(subStepsFor(moved, targetId).map((u) => u.title)).toEqual(["Pick the angle", "Record it", "Write the outline"])
    expect(subStepsFor(moved, otherId).map((u) => u.title)).toEqual(["Pack the bag", "Book the slot"])
    // Off the end is a no-op, not a wrap-around.
    expect(moveSubStep(moved, subStepsFor(moved, targetId)[0].id, -1)).toBe(moved)
  })

  it("renames in place", () => {
    const { plan, targetId } = seedContent()
    const renamed = renameSubStep(plan, subStepsFor(plan, targetId)[0].id, "Pick the angle and the hook")
    expect(subStepsFor(renamed, targetId)[0].title).toBe("Pick the angle and the hook")
  })

  it("takes its tick with it when it is deleted", () => {
    const { plan, targetId } = seedContent()
    const first = subStepsFor(plan, targetId)[0]
    const ticked = toggleStepLogged(plan, MONDAY, first.id)
    const gone = removeSubStep(ticked, first.id)
    expect(subStepsFor(gone, targetId)).toHaveLength(2)
    // A tick left behind would count a thing that no longer exists, forever:
    // ids come off a monotonic counter, so nothing can ever claim it back.
    expect(gone.logged[MONDAY]).toBeUndefined()
  })

  /**
   * THE ONE PLACE THIS DIFFERS FROM A FIELD.
   *
   * A field re-homes to the day when its target is deleted, because a question
   * stands on its own. "Write the outline" does not: it is defined by the thing
   * it breaks down, and under the day it is a fragment of a plan that is gone.
   */
  it("drops a sub-step whose bigger thing was deleted", () => {
    const { plan, targetId } = seedContent()
    const raw = JSON.parse(serializeNsPlan(plan))
    raw.goals = raw.goals.filter((g: { id: string }) => g.id !== targetId)
    raw.priorityIds = []
    const reloaded = loadNsPlan(JSON.stringify(raw))!
    expect(reloaded.subSteps).toEqual([])
  })

  it("loads a plan saved before sub-steps existed", () => {
    const raw = JSON.parse(serializeNsPlan(emptyNsPlan()))
    delete raw.subSteps
    expect(loadNsPlan(JSON.stringify(raw))!.subSteps).toEqual([])
  })
})

describe("the schedule, grouped by what things belong to", () => {
  /**
   * Add a step to one of the seeded routines and hand back its id.
   *
   * `days`/`startMin` are optional: an unplaced step is the common case and
   * the one the ordering has to get right, since most stacks say how often and
   * never say at what hour.
   */
  function step(plan: NsPlan, routineIndex: number, title: string, days?: number[], startMin?: number) {
    const routine = plan.routines[routineIndex]
    const added = addCustomStep(plan, routine.id, title, 5, 7)
    const made = added.routines.find((r) => r.id === routine.id)!.steps.slice(-1)[0]
    const placed = days ? placeStep(added, routine.id, made.id, days, startMin ?? null) : added
    return { plan: placed, stepId: made.id, routineId: routine.id }
  }

  const labels = (plan: NsPlan) => trackGroups(trackActivities(plan)).map((g) => g.label)

  it("puts a routine's steps under the routine and not in a flat list", () => {
    const a = step(emptyNsPlan(), 0, "Read your north star")
    const b = step(a.plan, 0, "Drink water")
    const c = step(b.plan, 1, "Phone away")

    const groups = trackGroups(trackActivities(c.plan))
    expect(groups.map((g) => g.label)).toEqual(["Morning routine", "Evening routine"])
    expect(groups[0].activities.map((x) => x.title)).toEqual(["Read your north star", "Drink water"])
    expect(groups[1].activities.map((x) => x.title)).toEqual(["Phone away"])
  })

  it("orders the headers by the clock, not by the order the routines were made", () => {
    // The night routine at 06:00 and the morning one at 21:00: absurd, and
    // exactly the case that tells sorting from the plan's own order.
    const a = step(emptyNsPlan(), 0, "Read your north star", [0], 21 * 60)
    const b = step(a.plan, 1, "Phone away", [0], 6 * 60)

    const groups = trackGroups(trackActivities(b.plan))
    expect(groups.map((g) => g.label)).toEqual(["Evening routine", "Morning routine"])
    expect(groups.map((g) => g.startMin)).toEqual([6 * 60, 21 * 60])
  })

  it("puts the steps inside a group in time order, and keeps the stack's order when nothing has a time", () => {
    const a = step(emptyNsPlan(), 0, "Third", [0], 8 * 60)
    const b = step(a.plan, 0, "First", [0], 6 * 60)
    expect(trackGroups(trackActivities(b.plan))[0].activities.map((x) => x.title)).toEqual(["First", "Third"])

    const c = step(emptyNsPlan(), 0, "Water")
    const d = step(c.plan, 0, "Read your north star")
    expect(trackGroups(trackActivities(d.plan))[0].activities.map((x) => x.title)).toEqual(["Water", "Read your north star"])
  })

  it("holds an unplaced routine behind the timed ones rather than sorting it to midnight", () => {
    const a = step(emptyNsPlan(), 1, "Phone away")            // night, no time
    const b = step(a.plan, 0, "Read your north star", [0], 7 * 60) // morning, 07:00
    expect(labels(b.plan)).toEqual(["Morning routine", "Evening routine"])
  })

  /**
   * A driver names no hour. "Twenty approaches a week" is a week, not a
   * morning, and giving it a place in the day would be inventing one.
   */
  it("gathers the drivers into one group at the end", () => {
    const a = step(emptyNsPlan(), 0, "Read your north star", [0], 7 * 60)
    const withDriver = withGoal(a.plan, "lm_relationship", "Approaches", "habit_ramp")
    const plan = updateGoal(withDriver.plan, withDriver.goal.id, { perWeek: 20, unit: "approaches" })

    const groups = trackGroups(trackActivities(plan))
    expect(groups.map((g) => g.label)).toEqual(["Morning routine", "Any time this week"])
    expect(groups[1].id).toBe(DRIVERS_GROUP_ID)
    expect(groups[1].activities.map((x) => x.title)).toEqual(["Approaches"])
  })

  it("keeps two routines called the same thing apart, because it groups by id", () => {
    const a = step(emptyNsPlan(), 0, "Read your north star")
    const b = step(a.plan, 1, "Phone away")
    const renamed = updateRoutine(b.plan, b.plan.routines[1].id, { label: "Morning routine" })

    const groups = trackGroups(trackActivities(renamed))
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.activities.length)).toEqual([1, 1])
  })

  /**
   * Both screens draw this line. A driver counted as a "step" would file
   * twenty approaches a week as a line in a morning stack.
   */
  it("names what is inside a header, and counts one of them as one", () => {
    const a = step(emptyNsPlan(), 0, "Read your north star")
    expect(groupSummary(trackGroups(trackActivities(a.plan))[0])).toBe("1 step · ~5 min")

    const b = step(a.plan, 0, "Drink water")
    expect(groupSummary(trackGroups(trackActivities(b.plan))[0])).toBe("2 steps · ~10 min")

    const withDriver = withGoal(b.plan, "lm_relationship", "Approaches", "habit_ramp")
    const groups = trackGroups(trackActivities(withDriver.plan))
    expect(groupSummary(groups[groups.length - 1])).toBe("1 goal")
  })

  describe("how much of a group is done", () => {
    const DAY = "2026-08-17"

    it("counts the steps ticked on that day, and no other day", () => {
      const a = step(emptyNsPlan(), 0, "Read your north star")
      const b = step(a.plan, 0, "Drink water")
      const ticked = toggleStepLogged(b.plan, DAY, a.stepId)

      const group = trackGroups(trackActivities(ticked))[0]
      expect(groupLogged(ticked, DAY, group)).toEqual({ done: 1, total: 2 })
      expect(groupLogged(ticked, "2026-08-18", group)).toEqual({ done: 0, total: 2 })
    })

    /** A driver has a count, not a tick; counted here it would never fill. */
    it("does not count drivers towards the total", () => {
      const a = step(emptyNsPlan(), 0, "Read your north star")
      const withDriver = withGoal(a.plan, "lm_relationship", "Approaches", "habit_ramp")
      const groups = trackGroups(trackActivities(withDriver.plan))
      expect(groupLogged(withDriver.plan, DAY, groups[1])).toEqual({ done: 0, total: 0 })
    })
  })
})


describe("the half of the plan that is not a weekly rhythm", () => {
  const MONDAY = "2026-08-17"

  /** A ladder, a finish line, a driver and two experiences. */
  const seedStanding = () => {
    const seed = emptyNsPlan()
    const ladder = withGoal(seed, "lm_fitness", "Bench 100 kg", "milestone_ladder")
    const dated = updateGoal(ladder.plan, ladder.goal.id, { targetDate: "2026-12-01", unit: "kg", ladder: { start: 80, target: 100, curve: "linear", rungs: 4 } })
    const finish = withGoal(dated, "lm_fun", "Get the licence", "achievement")
    const sooner = updateGoal(finish.plan, finish.goal.id, { targetDate: "2026-09-01" })
    const driver = withGoal(sooner, "lm_relationship", "Approaches", "habit_ramp")
    return addExperiences(driver.plan, "See the northern lights\nLearn to sail", "lm_fun")
  }

  it("holds the milestones and the experiences, and never a driver", () => {
    const titles = standingItems(seedStanding()).map((i) => i.title)
    expect(titles).toContain("Bench 100 kg")
    expect(titles).toContain("See the northern lights")
    expect(titles).not.toContain("Approaches")
  })

  it("puts the milestones first, soonest date first, and the experiences after them", () => {
    const items = standingItems(seedStanding())
    expect(items.map((i) => i.kind)).toEqual(["milestone", "milestone", "experience", "experience"])
    expect(items.slice(0, 2).map((i) => i.title)).toEqual(["Get the licence", "Bench 100 kg"])
  })

  it("puts an undated milestone behind the dated ones rather than in front of them", () => {
    const seed = emptyNsPlan()
    const undated = withGoal(seed, "lm_money", "Buy a flat", "achievement")
    const dated = withGoal(undated.plan, "lm_fun", "Get the licence", "achievement")
    const plan = updateGoal(dated.plan, dated.goal.id, { targetDate: "2026-09-01" })
    expect(standingItems(plan).map((i) => i.title)).toEqual(["Get the licence", "Buy a flat"])
  })

  /** A record of what you have had goes under the list of what you have not. */
  it("sinks a ticked experience below the ones still to do, and keeps the day", () => {
    const plan = seedStanding()
    const first = standingItems(plan).find((i) => i.kind === "experience")!
    const ticked = toggleExperienceDone(plan, first.id, MONDAY)
    const after = standingItems(ticked).filter((i) => i.kind === "experience")

    expect(after[after.length - 1].id).toBe(first.id)
    expect(after[after.length - 1].done).toBe(true)
    expect(after[after.length - 1].doneOn).toBe(MONDAY)
  })

  /**
   * A MILESTONE HAS NOTHING TO TICK, on purpose. Its progress is the goal row
   * in the hub once pushed; a second tick here would disagree with it.
   */
  it("carries the numbers and the date on a milestone, and no tick", () => {
    const bench = standingItems(seedStanding()).find((i) => i.title === "Bench 100 kg")!
    expect(bench.readout).toBe("80 kg → 100 kg")
    expect(bench.targetDate).toBe("2026-12-01")
    expect(bench.done).toBe(false)
  })
})

describe("choosing the days a step runs on", () => {
  const MONDAY = "2026-08-17"
  const TUESDAY = "2026-08-18"

  /** "Write on the book, 2× a week" — a rate, then pinned to Tue and Sat. */
  const seedRate = () => {
    const seed = emptyNsPlan()
    const routine = seed.routines[2]
    const added = addCustomStep(seed, routine.id, "Writing on book", 60, 2)
    const step = added.routines.find((r) => r.id === routine.id)!.steps.slice(-1)[0]
    return { plan: added, routineId: routine.id, stepId: step.id }
  }

  it("is any day until days are picked, and that day's own business after", () => {
    const { plan, routineId, stepId } = seedRate()
    const before = todayItems(plan, TUESDAY, [], RUN).find((i) => i.activity.id === stepId)!
    expect(before.when).toBe("anyDay")

    // Tuesday and Saturday.
    const placed = placeStep(plan, routineId, stepId, [1, 5], null)
    expect(todayItems(placed, TUESDAY, [], RUN).find((i) => i.activity.id === stepId)!.when).toBe("today")
    expect(todayItems(placed, MONDAY, [], RUN).find((i) => i.activity.id === stepId)!.when).toBe("otherDay")
  })

  it("keeps the rate honest with the days that were picked", () => {
    const { plan, routineId, stepId } = seedRate()
    const placed = placeStep(plan, routineId, stepId, [1, 3, 5], null)
    const step = placed.routines.find((r) => r.id === routineId)!.steps.find((s) => s.id === stepId)!
    expect(step.daysPerWeek).toBe(3)
    expect(cadenceLabel(trackActivities(placed).find((a) => a.id === stepId)!)).toBe("Tue · Thu · Sat")
  })

  it("puts a step back to a rate on no particular day when the last day is unpicked", () => {
    const { plan, routineId, stepId } = seedRate()
    const placed = placeStep(plan, routineId, stepId, [1], null)
    const cleared = placeStep(placed, routineId, stepId, [], null)
    const step = cleared.routines.find((r) => r.id === routineId)!.steps.find((s) => s.id === stepId)!

    expect(step.days).toEqual([])
    // The rate the days left behind is kept — it is the last thing anybody said.
    expect(step.daysPerWeek).toBe(1)
    expect(todayItems(cleared, TUESDAY, [], RUN).find((i) => i.activity.id === stepId)!.when).toBe("anyDay")
  })
})
