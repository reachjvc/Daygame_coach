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
import { addArea, addGoal, addCustomStep, dailyRating, dayNote, emptyNsPlan, linkGoal, loadNsPlan, placeStep, serializeNsPlan, setDailyRating, setDayNote, updateGoal } from "@/src/goals/northStarService"
import {
  activityPerWeek,
  areaSlug,
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
    expect(items[0].onToday).toBe(true)
    // A driver is always available: doing your approaches on an unplanned day
    // still happened.
    expect(items.find((i) => i.activity.title === "Approaches")!.onToday).toBe(true)
  })

  it("does not put a step on a day it is not on", () => {
    const { plan, stepId } = seedDay()
    const item = todayItems(plan, TUESDAY, [], RUN).find((i) => i.activity.id === stepId)!
    expect(item.onToday).toBe(false)
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
