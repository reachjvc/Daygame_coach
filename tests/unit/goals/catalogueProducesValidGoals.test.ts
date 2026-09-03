/**
 * THE CATALOGUE MUST NOT MANUFACTURE A BROKEN GOAL.
 *
 * Every template in the catalogue was stamped `period: "weekly"`, milestones
 * included. So picking "Approach Volume" — a LIFETIME target of 1,000
 * approaches, backed by the lifetime approach count — created a WEEKLY goal fed
 * a lifetime total. Every Monday the roll zeroed it and the metric sync wrote
 * 1,000 back seconds later, so it read as permanently complete and its streak
 * meant nothing. Eleven live goals were in exactly that state.
 *
 * When `metricFitsPeriod` started refusing that pairing, the catalogue stopped
 * working: `POST /api/goals/batch` turned the refusal into a 500, and the test
 * account could not create a goal at all. Nothing caught it — no test asked
 * whether the catalogue's own output was acceptable to the app's own rules. That
 * is what this asks, for every template.
 */

import { describe, it, expect } from "vitest"
import { GOAL_TEMPLATES } from "@/src/goals/data/goalGraph"
import { generateGoalTreeInserts } from "@/src/goals/treeGenerationService"
import { metricFitsPeriod } from "@/src/tracking/metricsService"

describe("every goal the catalogue can create", () => {
  const everyInsert = GOAL_TEMPLATES.flatMap((t) => generateGoalTreeInserts(t.id))

  it("produces goals at all", () => {
    // Guards against the whole suite passing because nothing was generated.
    expect(everyInsert.length).toBeGreaterThan(20)
    expect(everyInsert.some((i) => i.linked_metric)).toBe(true)
  })

  it("never pairs a metric with a period it does not measure", () => {
    const broken = everyInsert
      .filter((i) => i.linked_metric)
      .filter((i) => !metricFitsPeriod(i.linked_metric as string, i.period ?? "weekly"))
      .map((i) => `${i.title}: ${i.period ?? "weekly"} goal linked to ${i.linked_metric}`)

    expect(
      broken,
      `The catalogue would create goals the API refuses:\n${broken.join("\n")}`
    ).toHaveLength(0)
  })

  it("gives a milestone a period that never resets", () => {
    // A target you walk towards is not something that goes back to zero on
    // Monday. `custom` is the only period that does not roll.
    const rollingMilestones = everyInsert
      .filter((i) => i.goal_type === "milestone")
      .filter((i) => i.period !== "custom")
      .map((i) => `${i.title}: milestone on a ${i.period} period`)

    expect(rollingMilestones, rollingMilestones.join("\n")).toHaveLength(0)
  })

  it("keeps a habit ramp weekly, because a ramp is a weekly habit", () => {
    const ramps = everyInsert.filter((i) => i.goal_type === "habit_ramp")
    expect(ramps.length).toBeGreaterThan(0)
    for (const ramp of ramps) {
      expect(ramp.period, `${ramp.title}`).toBe("weekly")
    }
  })
})
