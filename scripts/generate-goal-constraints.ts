/**
 * Generate SQL migration to sync DB constraints with TypeScript const arrays.
 *
 * Usage: npx tsx scripts/generate-goal-constraints.ts
 * Output: prints SQL to stdout. Redirect to a migration file.
 */

import {
  GOAL_TYPES,
  GOAL_DISPLAY_CATEGORIES,
  LINKED_METRICS,
  GOAL_NATURES,
  GOAL_PERIODS,
  GOAL_TRACKING_TYPES,
} from "../src/db/goalEnums"

function checkConstraint(table: string, column: string, values: readonly string[], nullable: boolean): string {
  const valueList = values.map(v => `'${v}'`).join(", ")
  const constraintName = `${table}_${column}_check`
  const nullClause = nullable ? `${column} IS NULL OR ` : ""
  return [
    `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraintName};`,
    `ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} CHECK (`,
    `  ${nullClause}${column} IN (${valueList})`,
    `);`,
  ].join("\n")
}

function enumValues(enumName: string, values: readonly string[]): string {
  return values
    .map(v => `ALTER TYPE ${enumName} ADD VALUE IF NOT EXISTS '${v}';`)
    .join("\n")
}

const sql = [
  "-- Auto-generated from src/db/goalEnums.ts",
  `-- Generated: ${new Date().toISOString()}`,
  "",
  "-- linked_metric enum",
  enumValues("linked_metric", LINKED_METRICS),
  "",
  "-- goal_period enum",
  enumValues("goal_period", GOAL_PERIODS),
  "",
  "-- display_category (CHECK constraint, nullable)",
  checkConstraint("user_goals", "display_category", GOAL_DISPLAY_CATEGORIES, true),
  "",
  "-- goal_type (CHECK constraint, NOT NULL)",
  checkConstraint("user_goals", "goal_type", GOAL_TYPES, false),
  "",
  "-- goal_nature (CHECK constraint, nullable)",
  checkConstraint("user_goals", "goal_nature", GOAL_NATURES, true),
  "",
  "-- tracking_type (CHECK constraint, NOT NULL)",
  checkConstraint("user_goals", "tracking_type", GOAL_TRACKING_TYPES, false),
  "",
  "-- life_area is intentionally user-extensible — no constraint",
  "ALTER TABLE user_goals DROP CONSTRAINT IF EXISTS user_goals_life_area_check;",
].join("\n")

console.log(sql)
