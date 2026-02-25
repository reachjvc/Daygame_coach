/**
 * Integration test: Code enums ↔ DB CHECK constraints sync.
 *
 * Queries actual Postgres CHECK constraint definitions from pg_constraint
 * and asserts they match the canonical enum arrays in src/db/goalEnums.ts.
 *
 * Catches drift in either direction:
 * - Code adds a value but DB constraint wasn't updated
 * - DB constraint has a value that code doesn't know about
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest"
import { getClient } from "../setup"
import {
  GOAL_TYPES,
  GOAL_DISPLAY_CATEGORIES,
  LINKED_METRICS,
  GOAL_NATURES,
  GOAL_PERIODS,
  GOAL_TRACKING_TYPES,
  GOAL_PHASES,
} from "@/src/db/goalEnums"
import { Client } from "pg"

/** Extract allowed values from a CHECK constraint definition string. */
function parseCheckValues(constraintDef: string): string[] {
  // Matches patterns like:
  //   CHECK ((col = ANY (ARRAY['a'::text, 'b'::text])))
  //   CHECK ((col IS NULL OR (col = ANY (ARRAY['a'::text, 'b'::text]))))
  //   CHECK (col IN ('a', 'b', 'c'))
  //   CHECK ((col IS NULL OR col IN ('a', 'b')))
  const values: string[] = []

  // Pattern 1: ARRAY['val'::text, ...] (Postgres normalizes inline CHECK to this)
  const arrayMatch = constraintDef.match(/ARRAY\[([^\]]+)\]/)
  if (arrayMatch) {
    const items = arrayMatch[1].matchAll(/'([^']+)'::text/g)
    for (const m of items) {
      values.push(m[1])
    }
    return values.sort()
  }

  // Pattern 2: IN ('val1', 'val2', ...) (raw SQL form)
  const inMatch = constraintDef.match(/IN\s*\(([^)]+)\)/i)
  if (inMatch) {
    const items = inMatch[1].matchAll(/'([^']+)'/g)
    for (const m of items) {
      values.push(m[1])
    }
    return values.sort()
  }

  return values
}

/** Query all CHECK constraints for a table and return a map of constraint_name → definition. */
async function getCheckConstraints(
  client: Client,
  tableName: string
): Promise<Map<string, string>> {
  const result = await client.query(
    `SELECT con.conname AS name, pg_get_constraintdef(con.oid) AS definition
     FROM pg_constraint con
     JOIN pg_class rel ON con.conrelid = rel.oid
     JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
     WHERE nsp.nspname = 'public'
       AND rel.relname = $1
       AND con.contype = 'c'
     ORDER BY con.conname`,
    [tableName]
  )
  const map = new Map<string, string>()
  for (const row of result.rows) {
    map.set(row.name, row.definition)
  }
  return map
}

/** Find the constraint definition that references a given column name. */
function findConstraintForColumn(
  constraints: Map<string, string>,
  columnName: string
): string | undefined {
  for (const [, def] of constraints) {
    if (def.includes(columnName)) {
      return def
    }
  }
  return undefined
}

describe("Enum ↔ DB CHECK constraint sync", () => {
  let client: Client

  // Single connection for all read-only queries
  beforeAll(async () => {
    client = await getClient()
  })

  afterAll(async () => {
    await client.end()
  })

  let constraints: Map<string, string>

  test("can query CHECK constraints from user_goals", async () => {
    constraints = await getCheckConstraints(client, "user_goals")
    expect(constraints.size).toBeGreaterThan(0)
  })

  const ENUM_COLUMN_MAP: Array<{
    name: string
    column: string
    codeValues: readonly string[]
  }> = [
    { name: "GOAL_TYPES", column: "goal_type", codeValues: GOAL_TYPES },
    { name: "GOAL_TRACKING_TYPES", column: "tracking_type", codeValues: GOAL_TRACKING_TYPES },
    { name: "GOAL_PERIODS", column: "period", codeValues: GOAL_PERIODS },
    { name: "GOAL_DISPLAY_CATEGORIES", column: "display_category", codeValues: GOAL_DISPLAY_CATEGORIES },
    { name: "GOAL_NATURES", column: "goal_nature", codeValues: GOAL_NATURES },
    { name: "LINKED_METRICS", column: "linked_metric", codeValues: LINKED_METRICS },
    { name: "GOAL_PHASES", column: "goal_phase", codeValues: GOAL_PHASES },
  ]

  for (const { name, column, codeValues } of ENUM_COLUMN_MAP) {
    test(`${name} matches DB CHECK constraint on '${column}'`, async () => {
      // Re-fetch if first test hasn't populated yet
      if (!constraints) {
        constraints = await getCheckConstraints(client, "user_goals")
      }

      const def = findConstraintForColumn(constraints, column)
      expect(def, `No CHECK constraint found for column '${column}'`).toBeDefined()

      const dbValues = parseCheckValues(def!)
      const sorted = [...codeValues].sort()

      expect(dbValues).toEqual(sorted)
    })
  }
})
