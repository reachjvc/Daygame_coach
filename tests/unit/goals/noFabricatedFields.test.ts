/**
 * THE CLASS, MECHANICALLY.
 *
 * Three times in one session the same mistake shipped: a field the user never
 * filled in was populated with something plausible, which then read as an
 * answer — so nothing could ever ask for the real one.
 *
 *   · `why`         → "Because fitness is part of the life I said I want."
 *   · `habits[0]`   → "Work toward: <the goal>", on the calendar 3×/week
 *   · `targetDate`  → today + 365, printed in the SMART sentence as a deadline
 *
 * `lifeMasteryRegressions.test.ts` class 18 pins those three by name. That is
 * a record, not a guard: a FOURTH fabricated field passes it clean, which is
 * exactly how the third one shipped an hour after the second was fixed.
 *
 * This file is the generalisation. It reads the field list off
 * `VisionGoalDraft` at run time and requires every field to be classified as
 * either STRUCTURAL (derived by us — ids, colours, the shape we parsed) or
 * AUTHORED (the user's own words and judgements). Then it asserts that a goal
 * created from bare input has every AUTHORED field empty.
 *
 * Two ways to fail, both wanted:
 *   1. Fabricate an authored field → the emptiness assertion fails.
 *   2. Add a new field to the type → the classification assertion fails until
 *      somebody decides which kind it is.
 *
 * The second is the point. It is the only part that catches the mistake in a
 * shape nobody has seen yet.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { createAreaGoal, classifyGoalInput, parseGoalList } from "@/src/goals/visionPlanService"

/** Derived by the system. Safe to populate — none of it is a user's judgement. */
const STRUCTURAL = new Set([
  "id", "title", "pillarId", "pillarLabel", "pillarColor",
  "objectiveId", "objectiveLabel", "type", "sourceIntentIds",
  "habits", "tasks", "measure", "rampSteps", "areaId", "feedsGoalIds",
])

/**
 * The user's own words and judgements. NEVER populated on their behalf.
 * A goal missing these is not broken — it is honestly incomplete, which is
 * what `goalGaps` reports and what the "captured" badge says out loud.
 */
const AUTHORED = new Set([
  "why", "painWhy", "reasonsList", "beliefLevel", "desireLevel",
  "targetDate", "smartSentence", "reward", "stake", "obstacles", "feeling",
])

/** Field names declared on an interface in types.ts. */
function fieldsOf(iface: string): string[] {
  const src = readFileSync(join(process.cwd(), "src/goals/types.ts"), "utf8")
  const start = src.indexOf(`export interface ${iface} {`)
  if (start < 0) throw new Error(`${iface} not found in types.ts`)
  // Walk to the matching brace so nested object literals don't end it early.
  let i = src.indexOf("{", start), depth = 0, end = i
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break } }
  }
  const body = src.slice(src.indexOf("{", start) + 1, end)
  return [...body.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1])
}

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)

describe("no fabricated fields — the class, not the three instances", () => {
  const declared = fieldsOf("VisionGoalDraft")

  it("every field on VisionGoalDraft is classified as structural or authored", () => {
    // A new field forces a decision. Without this, the next fabricated field
    // is invisible to every test in the repo — which is how the third one shipped.
    const unclassified = declared.filter((f) => !STRUCTURAL.has(f) && !AUTHORED.has(f))
    expect(
      unclassified,
      `Classify these in noFabricatedFields.test.ts. STRUCTURAL = we derive it; ` +
      `AUTHORED = the user's words or judgement, which we must never write for them.`,
    ).toEqual([])
  })

  it("the classification has not drifted from the type", () => {
    const gone = [...STRUCTURAL, ...AUTHORED].filter((f) => !declared.includes(f))
    expect(gone, "these are classified but no longer exist on the type").toEqual([])
  })

  it("a goal created from bare input has EVERY authored field empty", () => {
    const g = createAreaGoal(
      { areaId: "lm_fitness", title: "Bench 100 kg", type: "milestone_ladder", why: "", daysPerWeek: 3, measure: { unit: "kg", start: 60, target: 100, steps: 5 }, targetDate: null },
      [],
    ) as unknown as Record<string, unknown>
    const fabricated = [...AUTHORED].filter((f) => !isEmpty(g[f]))
    expect(fabricated.map((f) => `${f} = ${JSON.stringify(g[f])}`)).toEqual([])
  })

  it("intake invents no authored field, for any shape of line", () => {
    const lines = [
      "Bench 100 kg", "muscle up", "gym 4 days a week",
      "body fat from 22% to 14%", "no pain in my left knee", "read one book",
    ]
    for (const line of lines) {
      const r = classifyGoalInput(line, "2026-07-31") as unknown as Record<string, unknown>
      const fabricated = [...AUTHORED].filter((f) => f in r && !isEmpty(r[f]))
      expect(fabricated.map((f) => `${line}: ${f} = ${JSON.stringify(r[f])}`)).toEqual([])
    }
  })

  it("a pasted list invents nothing either — the path that shipped all three", () => {
    const { rows } = parseGoalList("Training\n  Bench 100 kg\n  Gym 4 days a week\n  1 muscle up", "2026-07-31")
    let goals: ReturnType<typeof createAreaGoal>[] = []
    for (const r of rows) goals = [...goals, createAreaGoal({ areaId: r.areaId!, ...r.reading }, goals.map((g) => g.id))]
    for (const g of goals) {
      const rec = g as unknown as Record<string, unknown>
      const fabricated = [...AUTHORED].filter((f) => !isEmpty(rec[f]))
      expect(fabricated.map((f) => `${g.title}: ${f} = ${JSON.stringify(rec[f])}`)).toEqual([])
    }
  })

  it("a date the user WROTE is kept — this guard must not ban real input", () => {
    // The failure mode of a rule like this is over-application: refusing to
    // record what the user actually said. Emptiness is required only when they
    // said nothing.
    expect(classifyGoalInput("Ship the MVP by 2027-03-01", "2026-07-31").targetDate).toBe("2027-03-01")
    const g = createAreaGoal(
      { areaId: "lm_fitness", title: "Bench", type: "habit_ramp", why: "because I am tired of being weak", daysPerWeek: 3, measure: null, targetDate: "2027-01-01" },
      [],
    )
    expect(g.why).toBe("because I am tired of being weak")
    expect(g.targetDate).toBe("2027-01-01")
  })

  it("a stand-in habit always admits it is one", () => {
    // The habit list can't be empty (schema + balancer), so the placeholder
    // exists. It must be labelled, or it reads as a plan the user made.
    expect(fieldsOf("VisionHabit")).toContain("placeholder")
    const finish = createAreaGoal({ areaId: "lm_fitness", title: "Muscle up", type: "achievement", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [])
    expect(finish.habits.every((h) => h.placeholder)).toBe(true)
    const practice = createAreaGoal({ areaId: "lm_fitness", title: "Stretch", type: "habit_ramp", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [])
    expect(practice.habits.some((h) => h.placeholder)).toBe(false)
  })
})
