/**
 * ONE CONVERSION, ONE CEILING.
 *
 * The failure these pin down actually shipped: the app converted weights with
 * two different constants — `0.45359237` in the programs slice and `2.20462` in
 * the health slice, whose reciprocal is `0.45359290`. The same 225 lb read back
 * as a different number of kilograms depending on which screen asked, and a
 * third copy was written out by hand inside the live-workout hook.
 *
 * And the ceiling: `workout_sets.weight_kg` is `NUMERIC(5,2)`, so 999.99 is the
 * most it can hold. Three schemas said `max(1000)` and let through a value the
 * database then refused — after the program's weights had been advanced.
 */

import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { KG_PER_LB, MAX_DISTANCE_KM, MAX_DURATION_MIN, MAX_WEIGHT_KG, toKg, fromKg } from "@/src/shared/weight"

describe("weight conversion", () => {
  it("round-trips without drifting", () => {
    for (const kg of [0, 2.5, 20, 102.06, 999.99]) {
      expect(toKg(fromKg(kg, "lb"), "lb")).toBeCloseTo(kg, 10)
      expect(toKg(fromKg(kg, "kg"), "kg")).toBe(kg)
    }
  })

  it("leaves kilograms alone", () => {
    expect(toKg(100, "kg")).toBe(100)
    expect(fromKg(100, "kg")).toBe(100)
  })

  it("uses the exact international pound, not a rounded reciprocal", () => {
    // 0.45359237 is exact by definition. The health slice's old 1/2.20462 is
    // 0.45359290 — different in the sixth decimal, which is enough to make two
    // screens disagree about the same set.
    expect(KG_PER_LB).toBe(0.45359237)
    expect(toKg(225, "lb")).toBeCloseTo(102.05828, 5)
    // With the old 1/2.20462 this would have been 102.05840 — a different bar.
    expect(toKg(225, "lb")).not.toBeCloseTo(225 / 2.20462, 4)
  })

  it("is the only conversion constant left in the app", () => {
    // The rule this test exists to hold: nobody writes the number out again.
    const root = path.resolve(__dirname, "../../..")
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (["node_modules", ".next", ".git", "coverage"].includes(entry.name)) continue
          walk(full)
        } else if (/\.tsx?$/.test(entry.name)) {
          const rel = path.relative(root, full)
          if (rel === "src/shared/weight.ts" || rel.startsWith("tests/")) continue
          const code = fs
            .readFileSync(full, "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "")
          if (/0\.4535\d*|2\.20462/.test(code)) offenders.push(rel)
        }
      }
    }
    for (const dir of ["src", "app", "components"]) walk(path.join(root, dir))
    expect(
      offenders,
      `These write a kg/lb conversion constant out by hand. Import from\n` +
        `src/shared/weight.ts instead:\n${offenders.join("\n")}`
    ).toEqual([])
  })
})

describe("the weight ceiling", () => {
  it("matches what the column can actually hold", () => {
    expect(MAX_WEIGHT_KG).toBe(999.99)
  })

  it("is what the database column says, read from the migration", () => {
    // If somebody widens the column, this fails and the constant follows it —
    // rather than the two drifting apart, which is how 1000 got through.
    const root = path.resolve(__dirname, "../../..")
    const sql = fs.readFileSync(
      path.join(root, "supabase/migrations/20260305_create_health_tracking_tables.sql"),
      "utf-8"
    )
    const decl = sql.match(/weight_kg\s+NUMERIC\((\d+),\s*(\d+)\)/)
    expect(decl, "workout_sets.weight_kg is no longer declared NUMERIC(p,s)").toBeTruthy()
    const [, precision, scale] = decl!
    const ceiling = Number("9".repeat(Number(precision) - Number(scale)) + "." + "9".repeat(Number(scale)))
    expect(MAX_WEIGHT_KG).toBe(ceiling)
  })

  it("the integration schema says the same ceiling as the migrations", () => {
    /*
     * The database tests run against their own copy of the schema
     * (tests/integration/schema.sql) in a throwaway Postgres. That copy said
     * `weight_kg <= 1000` for four days after the real database was narrowed to
     * 999.99 — so a test could have "proved" that 1000 kg is storable while
     * production refused it. A mirror that disagrees with what it mirrors is
     * worse than no mirror.
     */
    const root = path.resolve(__dirname, "../../..")
    const mirror = fs.readFileSync(path.join(root, "tests/integration/schema.sql"), "utf-8")
    const found = mirror.match(/CONSTRAINT workout_sets_weight_max CHECK \(weight_kg <= ([\d.]+)\)/)
    expect(found, "the test schema no longer declares workout_sets_weight_max").toBeTruthy()
    expect(Number(found![1])).toBe(MAX_WEIGHT_KG)
  })
})

describe("the other limits, which are NOT the weight limit", () => {
  /**
   * These exist because one constant was used for two different facts: a blanket
   * replacement of `max(1000)` with the weight ceiling capped DISTANCE at
   * 999.99 km, for no reason at all. Each is pinned to the migration that
   * declares it, so the code cannot drift from the database again.
   */
  const migrations = (): string => {
    // FILES ONLY. This read every entry as a file, so the first directory
    // anybody put in `supabase/migrations/` made it throw EISDIR and the
    // failure read as "the schema no longer declares the limit".
    const dir = path.resolve(__dirname, "../../../supabase/migrations")
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
      .map((entry) => fs.readFileSync(path.join(dir, entry.name), "utf-8"))
      .join("\n")
  }

  it("a distance may reach 1000 km, where a weight may not reach 1000 kg", () => {
    expect(MAX_DISTANCE_KM).toBe(1000)
    expect(MAX_WEIGHT_KG).toBeLessThan(MAX_DISTANCE_KM)
    expect(migrations()).toMatch(/distance_km[\s\S]{0,80}<=\s*1000/)
  })

  it("a workout is under 600 minutes, so 599 is the most that can be stored", () => {
    // The CHECK is `< 600`, not `<= 600`. Both schemas said 600 and the database
    // refused it — an off-by-one nobody sees until somebody logs a long session.
    expect(MAX_DURATION_MIN).toBe(599)
    expect(migrations()).toMatch(/duration_min[\s\S]{0,80}<\s*600/)
  })
})
