/**
 * ONE PLACE DECIDES HOW FAR ALONG A GOAL IS.
 *
 * THE BUG THIS FORBIDS. "How far along is this goal" was written out by hand in
 * seven files as `current_value / target_value`, and "is it finished" in six
 * more as `current_value >= target_value`. Neither knows where the goal
 * STARTED, so both measure from zero: the owner's real "Dates per Month" goal,
 * a climb from 1 to 6, reported 17% complete before he had been on a date, and
 * a bench press entered as "22 kg now, 26 kg by November" reported 85%.
 *
 * It also made a whole kind of goal unrepresentable. A number that goes DOWN
 * cannot be measured from zero, so `goalToInsert` flattens every descending
 * ladder into a yes/no box — its comment says "precisely because
 * current / target lies" — and `climbReachedOn` then refuses the
 * quarter/half/three-quarter badges on a descending climb because
 * `goalToInsert` turned those into finish lines. Two workarounds, each citing
 * the other, both downstream of one formula in one line.
 *
 * With `src/db/goalProgress.ts` owning both questions, teaching goals to run
 * downwards is one edit in one file. Written out by hand again, it is seven.
 *
 * This is a floor, not a proof: it catches the two exact spellings that caused
 * the damage. A new file that invents a third way to say it is not covered.
 */

import { describe, test, expect } from "vitest"
import fs from "fs"
import path from "path"

const projectRoot = path.resolve(__dirname, "../../..")

/** The one owner, plus the screens that are not in the product. */
const ALLOWED = new Set([
  // Nine generations of goal-screen experiments behind /test, which 404s in
  // production (app/test/layout.tsx). Live code may not do this; a bench copy
  // nobody can reach is not worth the churn of editing five near-identical
  // files. If one of these is ever promoted, this entry comes off with it.
  "src/goals/components/views/V11ViewA.tsx",
  "src/goals/components/views/V11ViewC.tsx",
  "src/goals/components/views/V11ViewD.tsx",
  "src/goals/components/views/V11ViewE.tsx",
  "src/goals/components/new-goals/NewGoalsLab.tsx",
  // Rendered only by app/test/goal-scorecard/page.tsx.
  "src/goals/components/views/ScorecardView.tsx",
])

/** Every .ts/.tsx under a directory. */
function filesUnder(dir: string): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) out.push(full)
    }
  }
  walk(dir)
  return out
}

/**
 * The two spellings that caused the damage.
 *
 * Both require `target_value` on the right-hand side on purpose. Comparing
 * `current_value` against a RUNG (`goal.current_value >= milestoneValue`) is a
 * different and legitimate question, asked by `ProjectionTimeline` and
 * `GoalCard`, and catching it here would train people to ignore this test.
 */
const OFFENCES: Array<{ pattern: RegExp; says: string }> = [
  {
    pattern: /current_value\s*\/\s*[\w.]*target_value/,
    says: "computes progress as current / target — that counts from zero, not from where the goal started. Use progressPercent() from src/db/goalProgress.ts",
  },
  {
    pattern: /current_value\s*(?:\+\s*[\w.]+\s*)?>=\s*[\w.]*target_value/,
    says: "decides completion by hand — a goal that runs downwards completes the other way round. Use isGoalComplete() from src/db/goalProgress.ts",
  },
]

/**
 * Code only. The first version of this test flagged `goalAchievementsService`
 * for a COMMENT that names the old formula in order to warn people off it —
 * punishing the documentation for describing the bug.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

function scan(): { violations: string[]; seen: Set<string> } {
  const files = [
    ...filesUnder(path.join(projectRoot, "src")),
    ...filesUnder(path.join(projectRoot, "app")),
  ]
  const violations: string[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const relative = path.relative(projectRoot, file).split(path.sep).join("/")
    // Everything under app/test is a bench, not the product.
    if (relative.startsWith("app/test/")) continue

    const content = stripComments(fs.readFileSync(file, "utf-8"))
    for (const offence of OFFENCES) {
      if (!offence.pattern.test(content)) continue
      if (ALLOWED.has(relative)) {
        seen.add(relative)
        continue
      }
      violations.push(`${relative}: ${offence.says}`)
    }
  }
  return { violations, seen }
}

describe("how far along a goal is — one owner", () => {
  test("no live file computes a goal's progress or completion by hand", () => {
    const { violations } = scan()

    expect(
      violations,
      "These ask a question src/db/goalProgress.ts owns:\n" + violations.join("\n"),
    ).toHaveLength(0)
  })

  /**
   * THE ALLOWLIST MAY ONLY SHRINK.
   *
   * An entry whose file has since been fixed, or deleted, is a free pass
   * waiting for the violation to come back. Asserted off the same scan the
   * enforcement half runs, so there is one definition of what counts as a
   * violation rather than two that drift.
   */
  test("every allowlist entry is still doing work — fixed or gone means remove it", () => {
    const { seen } = scan()
    const stale = [...ALLOWED].filter((entry) => !seen.has(entry))

    expect(
      stale,
      "These are fixed or gone. Remove them from ALLOWED:\n" + stale.join("\n"),
    ).toHaveLength(0)
  })

  test("the scan actually reads files, so a green result means something", () => {
    // Not vacuous: if the walk breaks or the patterns stop matching, this fires
    // before the two tests above pass by finding nothing at all.
    // The owner itself is no longer on the allowlist: since descending goals
    // were switched on it reads `(current - start) / (target - start)` and
    // compares against a direction, so it does not spell either offence.
    expect(OFFENCES[0].pattern.test("x.current_value / x.target_value")).toBe(true)
    expect(OFFENCES[1].pattern.test("g.current_value >= g.target_value")).toBe(true)
    expect(OFFENCES[1].pattern.test("climb.current >= climb.target")).toBe(false)
    // And the comment stripper must not eat the code around a comment.
    expect(stripComments("const a = 1 // note\nconst b = 2")).toContain("const b = 2")
    expect(stripComments("/* current_value / target_value */ const c = 3")).not.toContain("target_value")
    expect(filesUnder(path.join(projectRoot, "src")).length).toBeGreaterThan(200)
  })
})
