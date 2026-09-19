/**
 * THE HEALTH PANEL RENDERED FOR NOBODY.
 *
 * `GoalHierarchyView` showed it when `life_area === "health_fitness"`. That
 * value is written by `areaSlug`, which strips the `lm_` prefix — so Life
 * Mastery's own `lm_health` and `lm_fitness` areas arrive as "health" and
 * "fitness", and the comparison was false for every account.
 *
 * "health_fitness" exists only in `metricCatalog.ts`, a different vocabulary
 * for a different feature. The one way to see the panel was to create a custom
 * area and name it something that slugified to exactly that.
 *
 * The panel holds weight, sleep, nutrition and — since the Tracking card was
 * rebuilt — the training card. All of it was unreachable from Life Mastery.
 *
 * Found by another session reading the two files side by side; verified here
 * against what `areaSlug` actually returns rather than against the claim.
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { areaSlug } from "@/src/goals/northStarTrackService"
import { DEFAULT_AREAS } from "@/src/goals/data/northStar"

const projectRoot = path.resolve(__dirname, "../../..")

describe("what areaSlug actually produces", () => {
  it("strips the lm_ prefix, so no default area is ever 'health_fitness'", () => {
    const slugs = DEFAULT_AREAS.map((a) => areaSlug(a))
    expect(slugs).not.toContain("health_fitness")
    // The two the panel is meant for.
    expect(slugs).toContain("health")
    expect(slugs).toContain("fitness")
  })
})

describe("the gate names values that exist", () => {
  it("compares against 'health' and 'fitness', not the value nothing produces", () => {
    const view = fs.readFileSync(
      path.join(projectRoot, "src/goals/components/GoalHierarchyView.tsx"),
      "utf-8"
    )
    // Comments blanked: the one above the gate explains the bug using the very
    // string the bug was.
    const code = view.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

    expect(code).toContain('life_area === "health"')
    expect(code).toContain('life_area === "fitness"')
    expect(
      code,
      'nothing writes "health_fitness" into life_area — areaSlug cannot produce it'
    ).not.toContain('life_area === "health_fitness"')
  })

  it("the health gate's values are ones areaSlug can return", () => {
    /**
     * Scoped to the HEALTH gate on purpose.
     *
     * `life_area` has writers other than `areaSlug` — the tracking slice's own
     * goal categories put "daygame" in the same column, and the view compares
     * against that too, legitimately. A blanket "every compared value must
     * come from areaSlug" would fail on a value that is perfectly real, which
     * is how a guard teaches people to delete it.
     */
    const view = fs.readFileSync(
      path.join(projectRoot, "src/goals/components/GoalHierarchyView.tsx"),
      "utf-8"
    )
    const code = view.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
    // lastIndexOf: the first "HealthTrackingPanel" in the file is the import,
    // and slicing back from that found no gate at all. The premise assertion
    // below is what caught it rather than letting this pass on an empty list.
    const mount = code.lastIndexOf("HealthTrackingPanel")
    const gate = code.slice(Math.max(0, mount - 400), mount)
    const named = [...gate.matchAll(/life_area === "([^"]+)"/g)].map((m) => m[1])

    expect(named.length, "premise: the health gate should name its areas").toBeGreaterThan(0)
    const producible = new Set(DEFAULT_AREAS.map((a) => areaSlug(a)))
    const dead = named.filter((v) => !producible.has(v))
    expect(dead, `the health panel is gated on values nothing produces: ${dead.join(", ")}`).toEqual([])
  })
})
