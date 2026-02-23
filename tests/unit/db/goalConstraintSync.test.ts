import { describe, test, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import {
  GOAL_TYPES,
  GOAL_DISPLAY_CATEGORIES,
  LINKED_METRICS,
  GOAL_NATURES,
  GOAL_PERIODS,
  GOAL_TRACKING_TYPES,
} from "@/src/db/goalEnums"

const migrationPath = join(process.cwd(), "supabase/migrations/20260221_add_missing_linked_metric_values.sql")

describe("DB constraint sync", () => {
  const sql = readFileSync(migrationPath, "utf-8")

  test("migration includes all GOAL_DISPLAY_CATEGORIES values", () => {
    for (const cat of GOAL_DISPLAY_CATEGORIES) {
      expect(sql).toContain(`'${cat}'`)
    }
  })

  test("migration includes all GOAL_TYPES values", () => {
    for (const type of GOAL_TYPES) {
      expect(sql).toContain(`'${type}'`)
    }
  })

  test("migration includes all LINKED_METRICS values", () => {
    for (const metric of LINKED_METRICS) {
      expect(sql).toContain(`'${metric}'`)
    }
  })

  test("migration includes all GOAL_NATURES values", () => {
    for (const nature of GOAL_NATURES) {
      expect(sql).toContain(`'${nature}'`)
    }
  })

  test("migration includes all GOAL_PERIODS values", () => {
    for (const period of GOAL_PERIODS) {
      expect(sql).toContain(`'${period}'`)
    }
  })

  test("migration includes all GOAL_TRACKING_TYPES values", () => {
    for (const type of GOAL_TRACKING_TYPES) {
      expect(sql).toContain(`'${type}'`)
    }
  })
})
