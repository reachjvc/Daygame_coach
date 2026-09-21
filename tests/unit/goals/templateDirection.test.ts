/**
 * A TEMPLATE LEVEL MUST NOT INVERT OR ERASE A GOAL'S DIRECTION.
 *
 * WHAT THIS FOUND. Each TARGET in the framework carries one authored
 * `milestoneConfig` — a start and a target — written at roughly Intermediate
 * level. A TEMPLATE LEVEL then overrides only the target, and never the start.
 * So a Beginner aiming lower than the authored start inherits a start ABOVE
 * its target, and the climb runs the wrong way.
 *
 * Fifty-eight level/target pairs are in that state. Most are harmless and
 * correct — Body Weight 90 to 85, Body Fat 19 to 18, 5K Time 28 to 24, Screen
 * Time 6 to 4 — because those metrics are MEANT to come down, and descending
 * climbs work properly since 2026-09-20.
 *
 * The rest are not harmless, and they became less harmless when descending
 * climbs started working. A strength metric whose Beginner target is below its
 * start is now a functioning goal to get WEAKER:
 *
 *   tmpl_strength/Beginner   Bench Press 1RM   start 70 -> target 60
 *   tmpl_strength/Beginner   Squat 1RM         start 100 -> target 80
 *   tmpl_athlete/Beginner    Pull-ups Max      start 12 -> target 5
 *   tmpl_calisthenics/Beginner Max Dips        start 10 -> target 8
 *
 * Twenty-three are flagged in all: sixteen inverted and seven with no distance
 * at all — start and target the same number,
 * so the goal jumps from 0% to 100% with nothing in between:
 *
 *   tmpl_calisthenics/Beginner Max Push-ups 20, tmpl_bulk/Beginner Bench 60,
 *   tmpl_marathon/Beginner 5K Time 28, tmpl_hustle/Beginner Income 3000 and
 *   Profit 1000, tmpl_fi/Beginner Income 3000 and Savings Rate 15.
 *
 * WHY THIS IS A LIST AND NOT A FIX. Correcting them means choosing new
 * numbers, and they are the owner's product defaults rather than arithmetic
 * with one right answer. The allowlist below is the damage, written down and
 * frozen: it may only shrink, and a NEW template level that inverts or erases
 * a direction fails the build.
 *
 * `ASCENDING` is the honest part of the judgement — which metrics are supposed
 * to go up. A kilo lifted, a rep, a pound earned: up. A bodyweight, a body-fat
 * percentage, a 5K time, a resting heart rate, a drink, a screen hour: down.
 */

import { describe, it, expect } from "vitest"
import { TEMPLATES, TARGETS } from "@/src/goals/data/newGoalFramework"

/** Metrics that are meant to go UP. Anything else may legitimately come down. */
const ASCENDING = new Set([
  "t_bench", "t_squat", "t_deadlift", "t_ohp", "t_pullups", "t_total_workouts",
  "t_bench_muscle",
  "t_pullups_cal", "t_pushups_cal", "t_dips_cal", "t_pistol_cal", "t_lsit_cal",
  "t_longest_run", "t_total_km", "t_progress_photos",
  "t_monthly_income", "t_monthly_profit", "t_savings_rate", "t_paying_customers",
  "t_net_worth",
])

type Level = { label: string; targetValues: Record<string, number> }
type Tmpl = { id: string; levels: Level[] }
type Target = { id: string; label: string; milestoneConfig: { start: number; target: number } | null }

/** Every (template, level, target) whose climb is backwards or has no distance. */
function offenders() {
  const flat: Array<{ key: string; kind: "inverted" | "no_distance"; says: string }> = []
  for (const tmpl of TEMPLATES as unknown as Tmpl[]) {
    for (const level of tmpl.levels) {
      for (const [targetId, value] of Object.entries(level.targetValues)) {
        const target = (TARGETS as unknown as Target[]).find((t) => t.id === targetId)
        const config = target?.milestoneConfig
        if (!config) continue

        const key = `${tmpl.id}/${level.label}/${targetId}`
        if (value === config.start) {
          flat.push({ key, kind: "no_distance", says: `${target!.label}: start and target are both ${value}` })
        } else if (ASCENDING.has(targetId) && value < config.start) {
          flat.push({ key, kind: "inverted", says: `${target!.label}: climbs DOWN from ${config.start} to ${value}` })
        }
      }
    }
  }
  return flat
}

/**
 * THE DAMAGE, FROZEN. May only shrink. Regenerate by running this test and
 * reading what it prints — never by pasting a longer list.
 */
const KNOWN = new Set([
  // No distance: start and target the same, so 0% then 100% and nothing between.
  "tmpl_calisthenics/Beginner/t_pushups_cal",  // Max Push-ups, both 20
  "tmpl_marathon/Beginner/t_5k_time",          // 5K Time, both 28
  "tmpl_bulk/Beginner/t_bench_muscle",         // Bench Press 1RM, both 60
  "tmpl_hustle/Beginner/t_monthly_income",     // both 3000
  "tmpl_hustle/Beginner/t_monthly_profit",     // both 1000
  "tmpl_fi/Beginner/t_monthly_income",         // both 3000
  "tmpl_fi/Beginner/t_savings_rate",           // both 15
  // Inverted: a metric that should go up, aimed below where it starts.
  "tmpl_strength/Beginner/t_bench",            // 70 -> 60
  "tmpl_strength/Beginner/t_squat",            // 100 -> 80
  "tmpl_strength/Beginner/t_deadlift",         // 125 -> 100
  "tmpl_strength/Beginner/t_pullups",          // 12 -> 5
  "tmpl_strength/Beginner/t_ohp",              // 55 -> 40
  "tmpl_transform/Beginner/t_bench",           // 70 -> 60
  "tmpl_athlete/Beginner/t_bench",             // 70 -> 60
  "tmpl_athlete/Beginner/t_squat",             // 100 -> 80
  "tmpl_athlete/Beginner/t_deadlift",          // 125 -> 100
  "tmpl_athlete/Beginner/t_pullups",           // 12 -> 5
  "tmpl_athlete/Beginner/t_longest_run",       // 11 -> 5
  "tmpl_calisthenics/Beginner/t_pullups_cal",  // 8 -> 5
  "tmpl_calisthenics/Beginner/t_dips_cal",     // 10 -> 8
  "tmpl_c25k/Beginner/t_longest_run",          // 11 -> 3
  "tmpl_c25k/Intermediate/t_longest_run",      // 11 -> 5
  "tmpl_c25k/Advanced/t_longest_run",          // 11 -> 8
])

describe("template levels and the direction of the climb they produce", () => {
  it("no NEW level inverts a metric or gives it no distance", () => {
    const fresh = offenders().filter((o) => !KNOWN.has(o.key))

    expect(
      fresh.map((o) => `${o.key} — ${o.says}`),
      "These template levels produce a backwards or zero-length climb.\n" +
        "A level overrides the target and never the start, so a level aiming below\n" +
        "the authored start inherits a start above its own target.\n" +
        fresh.map((o) => `  ${o.key} — ${o.says}`).join("\n"),
    ).toEqual([])
  })

  it("the known list may only shrink — fixed or gone means remove it", () => {
    const live = new Set(offenders().map((o) => o.key))
    const stale = [...KNOWN].filter((k) => !live.has(k))

    expect(
      stale,
      "These are fixed or gone. Remove them from KNOWN:\n" + stale.join("\n"),
    ).toEqual([])
  })

  it("the scan reads real data, so a green result means something", () => {
    // Not vacuous: if TEMPLATES or TARGETS stop resolving, this fires first.
    expect((TEMPLATES as unknown as Tmpl[]).length).toBeGreaterThan(10)
    expect((TARGETS as unknown as Target[]).length).toBeGreaterThan(50)
    expect(offenders().length).toBeGreaterThan(0)
  })

  it("a metric that is MEANT to come down is not flagged", () => {
    // Body Weight 90 -> 85 and 5K Time 28 -> 24 are correct, and descending
    // climbs work. Flagging them would train people to ignore this test.
    const keys = offenders().map((o) => o.key)
    expect(keys).not.toContain("tmpl_transform/Beginner/t_bodyweight")
    expect(keys).not.toContain("tmpl_athlete/Intermediate/t_5k_time")
    expect(keys).not.toContain("tmpl_detox/Beginner/t_screen_time")
  })
})
