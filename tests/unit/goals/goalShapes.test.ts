/**
 * THE ONE READING OF WHAT KIND OF THING A GOAL IS.
 *
 * A goal row does not store its shape; it stores `goal_type` and
 * `tracking_type`, and the shape is a reading of the two. That reading was
 * written out by hand in six places across five files. These tests pin the
 * single reading and fail the build if a hand-written copy comes back.
 */

import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"
import { GOAL_SHAPES, shapeOfRow, isPracticeRow } from "@/src/goals/data/goalShapes"
import { GOAL_TYPES, GOAL_TRACKING_TYPES } from "@/src/db/goalEnums"

const row = (goal_type: string, tracking_type: string) =>
  ({ goal_type, tracking_type }) as Parameters<typeof shapeOfRow>[0]

describe("the three shapes", () => {
  it("is exactly the three, and each is a real VisionGoalType", () => {
    expect(GOAL_SHAPES.map((s) => s.type).sort()).toEqual(
      ["achievement", "habit_ramp", "milestone_ladder"],
    )
  })

  it("gives every shape a label and a hint that says what it is", () => {
    for (const s of GOAL_SHAPES) {
      expect(s.label.length, s.type).toBeGreaterThan(0)
      // The hint carries an example, which is the part that makes a shape
      // pickable by somebody who has never seen the word before.
      expect(s.hint.length, s.type).toBeGreaterThan(30)
    }
  })
})

describe("reading a row's shape", () => {
  /**
   * TOTAL BY CONSTRUCTION. Every combination lands somewhere, which is what
   * lets `shapeOfRow` return a shape rather than `shape | null` — a caller that
   * has to handle "unknown" is a caller that invents its own default.
   */
  it("answers for every combination of goal type and tracking type", () => {
    for (const gt of GOAL_TYPES) {
      for (const tt of GOAL_TRACKING_TYPES) {
        const shape = shapeOfRow(row(gt, tt))
        expect(GOAL_SHAPES.map((s) => s.type), `${gt}/${tt}`).toContain(shape)
      }
    }
  })

  it("treats recurring and habit_ramp as the same shape — a Practice", () => {
    expect(shapeOfRow(row("recurring", "counter"))).toBe("habit_ramp")
    expect(shapeOfRow(row("habit_ramp", "counter"))).toBe("habit_ramp")
    expect(shapeOfRow(row("recurring", "boolean"))).toBe("habit_ramp")
    expect(isPracticeRow(row("recurring", "counter"))).toBe(true)
  })

  it("separates a climb from a finish line by how it is counted", () => {
    expect(shapeOfRow(row("milestone", "counter"))).toBe("milestone_ladder")
    expect(shapeOfRow(row("milestone", "boolean"))).toBe("achievement")
    expect(isPracticeRow(row("milestone", "boolean"))).toBe(false)
  })
})

describe("the dead tracking types are gone", () => {
  /**
   * `percentage` and `streak` sat in the enum and in the database CHECK for
   * months and no production file ever wrote either. A value a constraint
   * allows and nothing produces reads as a supported feature.
   */
  it("allows only the two that are actually written", () => {
    expect([...GOAL_TRACKING_TYPES].sort()).toEqual(["boolean", "counter"])
  })
})

describe("the hand-written reading cannot come back", () => {
  /**
   * The pattern is the DISJUNCTION, not the bare string. Two looser assertions
   * were tried first — "contains both names", then `=== "recurring"` — and each
   * was run against the codebase and found to match ten sites of legitimate,
   * unrelated code (whether to show a reset button, whether a completed goal
   * repeats). Those are a different question wearing the same words.
   */
  const DUPLICATE = /(recurring"[^)]*\|\|[^)]*habit_ramp"|habit_ramp"[^)]*\|\|[^)]*recurring")/

  /** The one exemption, named with its reason so it cannot grow silently. */
  const EXEMPT = new Set([
    // Reads the form's own state before any row exists, so there is no
    // `tracking_type` to read alongside it.
    "src/goals/components/GoalFormModal.tsx",
  ])

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full, out)
      else if (/\.tsx?$/.test(name)) out.push(full)
    }
    return out
  }

  /**
   * AND NEITHER CAN A SECOND COPY OF THE LIST.
   *
   * This is the one the first version missed. `NS_GOAL_TYPES` in
   * `data/northStar.ts` held the same three entries with the same labels, the
   * same hints and the same emoji, and sat beside `GOAL_SHAPES` for two days
   * with every test green — because the assertion below guards the inline
   * two-column READING and says nothing about a duplicate DEFINITION.
   *
   * Anchored on the labels rather than on a variable name: renaming the copy
   * would have slipped straight past a name check.
   */
  it("is the only place the three shapes are named", () => {
    const definers = walk("src")
      .filter((f) => !f.endsWith(join("data", "goalShapes.ts")))
      .filter((f) => {
        const src = readFileSync(f, "utf8")
        return src.includes('label: "Target"') &&
               src.includes('label: "Practice"') &&
               src.includes('label: "Finish line"')
      })
    expect(definers, `a second definition of the shapes:\n${definers.join("\n")}`).toEqual([])
  })

  it("appears in goalShapes.ts and nowhere else", () => {
    const offenders = walk("src")
      .filter((f) => !f.endsWith(join("data", "goalShapes.ts")))
      .filter((f) => !EXEMPT.has(f.split("\\").join("/")))
      .filter((f) => DUPLICATE.test(readFileSync(f, "utf8")))
    expect(offenders, `re-inline of the shape rule:\n${offenders.join("\n")}`).toEqual([])
  })
})
