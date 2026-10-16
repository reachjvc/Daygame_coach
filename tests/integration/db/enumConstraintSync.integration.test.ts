/**
 * Integration test: code enums ↔ what production's database lets into the column.
 *
 * Reads every limit Postgres puts on a column and asserts the column allows
 * exactly the values of the code array the app validates against — so a value
 * added on one side only fails here rather than at somebody's save.
 *
 * WHAT COUNTS AS A LIMIT. Every single-column CHECK on it, and, when the column
 * is a Postgres ENUM type, that type's labels. They ALL have to hold, so what
 * the column accepts is their INTERSECTION — and that is what is compared.
 * Production is not tidy here: on `user_goals`, four columns carry two CHECKs
 * each (an older `chk_*` beside a newer `user_goals_*_check`), and `period`,
 * `tracking_type` and `linked_metric` are ENUM types. The test against the
 * hand-written mirror asked for "exactly one CHECK", which production fails on
 * shape alone; the intersection is the rule a write actually meets.
 *
 * A constraint is matched by the COLUMNS IT CONSTRAINS (pg_constraint.conkey),
 * not by whether its text mentions the column name.
 *
 * KNOWN WRONG IN PRODUCTION: an entry's `knownWrong` pins it with `test.fails`.
 * None today. The last, 'scenarios' refused on display_category, was fixed by
 * 20261016120100_user_goals_one_check_per_column.sql.
 *
 * Code enums whose values live only inside a `z.enum([...])` literal (program
 * level, session type, set kind, draft source) are not exported, so they cannot
 * be compared here without a change to src/.
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

/**
 * The quoted literals of a value-list CHECK, whatever type they are cast to:
 * `col = ANY (ARRAY['a'::text, 'b'::text])`, or `'a'::goal_period` on an ENUM
 * column. Null when the CHECK is not a value list at all.
 */
function parseCheckValues(constraintDef: string): string[] | null {
  const arrayMatch = constraintDef.match(/ARRAY\[([^\]]+)\]/)
  if (arrayMatch) {
    return [...arrayMatch[1].matchAll(/'([^']+)'::[\w".]+/g)].map((m) => m[1])
  }
  // `col IN ('a', 'b')` — the raw form, should a definition ever print that way.
  const inMatch = constraintDef.match(/IN\s*\(([^)]+)\)/i)
  if (inMatch) {
    return [...inMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  }
  return null
}

interface ColumnLimits {
  /** What the column accepts, sorted — null when nothing limits it. */
  allowed: string[] | null
  /** Where each limit came from, for the failure message. */
  sources: string[]
}

/** Every limit on `table.column`, intersected. */
async function limitsOn(client: Client, table: string, column: string): Promise<ColumnLimits> {
  const checks = await client.query(
    `SELECT con.conname AS name, pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
      WHERE con.contype = 'c'
        AND con.conrelid = to_regclass('public.' || $1)
        AND ARRAY(SELECT a.attname::text
                    FROM unnest(con.conkey) AS k(attnum)
                    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum)
            = ARRAY[$2::text]`,
    [table, column]
  )
  const enumType = await client.query(
    `SELECT t.typname AS name, ARRAY(SELECT e.enumlabel::text FROM pg_enum e WHERE e.enumtypid = t.oid) AS labels
       FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
      WHERE a.attrelid = to_regclass('public.' || $1) AND a.attname = $2 AND t.typtype = 'e'`,
    [table, column]
  )

  const lists: Array<[string, string[]]> = []
  for (const row of checks.rows) {
    const values = parseCheckValues(row.definition as string)
    if (values === null || values.length === 0) {
      // Fail loudly: a CHECK this cannot read would otherwise drop out of the
      // intersection and widen what the test believes the column accepts.
      throw new Error(`${table}.${column}: cannot read the values of ${row.name}: ${row.definition}`)
    }
    lists.push([`CHECK ${row.name}`, values])
  }
  for (const row of enumType.rows) lists.push([`ENUM ${row.name}`, row.labels as string[]])

  if (lists.length === 0) return { allowed: null, sources: [] }
  const allowed = lists.map(([, values]) => values).reduce((a, b) => a.filter((v) => b.includes(v)))
  return { allowed: [...new Set(allowed)].sort(), sources: lists.map(([source]) => source) }
}

const ENUMS: Array<{
  name: string
  table: string
  column: string
  codeValues: readonly string[]
  /** Production refuses part of what the code allows. Why, and what fixes it. */
  knownWrong?: string
}> = [
  { name: "GOAL_TYPES", table: "user_goals", column: "goal_type", codeValues: GOAL_TYPES },
  { name: "GOAL_TRACKING_TYPES", table: "user_goals", column: "tracking_type", codeValues: GOAL_TRACKING_TYPES },
  { name: "GOAL_PERIODS", table: "user_goals", column: "period", codeValues: GOAL_PERIODS },
  {
    name: "GOAL_DISPLAY_CATEGORIES",
    table: "user_goals",
    column: "display_category",
    codeValues: GOAL_DISPLAY_CATEGORIES,
  },
  { name: "GOAL_NATURES", table: "user_goals", column: "goal_nature", codeValues: GOAL_NATURES },
  { name: "LINKED_METRICS", table: "user_goals", column: "linked_metric", codeValues: LINKED_METRICS },
  { name: "GOAL_PHASES", table: "user_goals", column: "goal_phase", codeValues: GOAL_PHASES },
  { name: "SESSION_END_REASONS", table: "sessions", column: "end_reason", codeValues: SESSION_END_REASONS },
  { name: "NS_FIELD_KINDS", table: "life_plan_fields", column: "kind", codeValues: NS_FIELD_KINDS },
]

describe("Enum ↔ what the database accepts", () => {
  let client: Client

  beforeAll(async () => {
    client = await getClient()
  })

  afterAll(async () => {
    await client.end()
  })

  for (const { name, table, column, codeValues, knownWrong } of ENUMS) {
    const title = `${name} is exactly what ${table}.${column} accepts`
    const run = async () => {
      const { allowed, sources } = await limitsOn(client, table, column)
      expect(allowed, `nothing in the database limits ${table}.${column}`).not.toBeNull()
      expect(allowed, `${table}.${column}, limited by ${sources.join(" and ")}`).toEqual([...codeValues].sort())
    }
    if (knownWrong) test.fails(`${title} — KNOWN WRONG: ${knownWrong}`, run)
    else test(title, run)
  }
})
