/**
 * Integration test: code enums ↔ DB CHECK constraints sync.
 *
 * Reads the CHECK constraints out of pg_constraint and asserts each one allows
 * exactly the values of the code array the app validates against — so a value
 * added on one side only fails here rather than at somebody's save.
 *
 * A constraint is matched by the COLUMNS IT CONSTRAINS (pg_constraint.conkey),
 * not by whether its text mentions the column name. The text match took the
 * first constraint whose definition contained the name anywhere — a CHECK on
 * another column that merely mentioned this one would have answered for it —
 * and a column with two CHECKs was read as having one.
 *
 * WHAT THIS CANNOT SEE: it reads tests/integration/schema.sql, a hand-written
 * mirror. Production has drifted from it — `user_goals` in production carries a
 * second `display_category` CHECK without 'scenarios' (see
 * 20260920100000_goal_abstinence.sql), which this mirror does not have. Code
 * enums whose values live only inside a `z.enum([...])` literal (program level,
 * session type, set kind, draft source) are not exported, so they cannot be
 * compared here without a change to src/.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest"
import type { Client } from "pg"
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
import { SESSION_END_REASONS } from "@/src/db/trackingEnums"
import { NS_FIELD_KINDS } from "@/src/goals/types"

/** The quoted literals of a CHECK, in either form Postgres prints. */
function parseCheckValues(constraintDef: string): string[] {
  // `col = ANY (ARRAY['a'::text, 'b'::text])` — how Postgres prints an IN list.
  const arrayMatch = constraintDef.match(/ARRAY\[([^\]]+)\]/)
  if (arrayMatch) {
    return [...arrayMatch[1].matchAll(/'([^']+)'::text/g)].map((m) => m[1]).sort()
  }
  // `col IN ('a', 'b')` — the raw form, should a definition ever print that way.
  const inMatch = constraintDef.match(/IN\s*\(([^)]+)\)/i)
  if (inMatch) {
    return [...inMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
  }
  return []
}

/** Every CHECK on `table` that constrains exactly the one column `column`. */
async function checksOnColumn(client: Client, table: string, column: string): Promise<string[]> {
  const result = await client.query(
    `SELECT pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
      WHERE con.contype = 'c'
        AND con.conrelid = to_regclass('public.' || $1)
        AND ARRAY(SELECT a.attname::text
                    FROM unnest(con.conkey) AS k(attnum)
                    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum)
            = ARRAY[$2::text]`,
    [table, column]
  )
  return result.rows.map((r) => r.definition as string)
}

const ENUMS: Array<{ name: string; table: string; column: string; codeValues: readonly string[] }> = [
  { name: "GOAL_TYPES", table: "user_goals", column: "goal_type", codeValues: GOAL_TYPES },
  { name: "GOAL_TRACKING_TYPES", table: "user_goals", column: "tracking_type", codeValues: GOAL_TRACKING_TYPES },
  { name: "GOAL_PERIODS", table: "user_goals", column: "period", codeValues: GOAL_PERIODS },
  { name: "GOAL_DISPLAY_CATEGORIES", table: "user_goals", column: "display_category", codeValues: GOAL_DISPLAY_CATEGORIES },
  { name: "GOAL_NATURES", table: "user_goals", column: "goal_nature", codeValues: GOAL_NATURES },
  { name: "LINKED_METRICS", table: "user_goals", column: "linked_metric", codeValues: LINKED_METRICS },
  { name: "GOAL_PHASES", table: "user_goals", column: "goal_phase", codeValues: GOAL_PHASES },
  { name: "SESSION_END_REASONS", table: "sessions", column: "end_reason", codeValues: SESSION_END_REASONS },
  { name: "NS_FIELD_KINDS", table: "life_plan_fields", column: "kind", codeValues: NS_FIELD_KINDS },
]

describe("Enum ↔ DB CHECK constraint sync", () => {
  let client: Client

  beforeAll(async () => {
    client = await getClient()
  })

  afterAll(async () => {
    await client.end()
  })

  for (const { name, table, column, codeValues } of ENUMS) {
    test(`${name} matches the CHECK on ${table}.${column}`, async () => {
      const defs = await checksOnColumn(client, table, column)
      // Exactly one: two CHECKs on a column must BOTH hold, so a value only one
      // of them allows is refused — and comparing against the first would miss it.
      expect(defs, `CHECK constraints on ${table}.${column}`).toHaveLength(1)
      expect(parseCheckValues(defs[0]!)).toEqual([...codeValues].sort())
    })
  }
})
