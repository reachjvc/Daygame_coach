/**
 * WHAT CHANGED BETWEEN TWO COPIES OF THE PLAN, AS ROWS.
 *
 * The whole-plan save sent every row of the plan four seconds after every
 * keystroke and let the database delete whatever was missing. So a page that
 * had loaded half a plan could wipe the other half, and one changed letter
 * rewrote three hundred values. This sends what changed instead, and removes
 * only the rows it names (Plans/life-plan-rebuild.md, Phase 1).
 *
 * `before` is THE ROWS THE ACCOUNT HOLDS: as the read returned them, then as
 * the last accepted save sent them. Never `planToRows(rowsToPlan(read))`: the
 * loader fills in what a plan lacks (twelve default areas, the north star's
 * node), so a copy rebuilt that way lists parts the account does not have, the
 * diff never sends them, and every save after fails on a missing parent.
 *
 * A ROW IS COMPARED ON WHAT THE APP SENDS. Columns the read carries and the app
 * does not write (`user_goal_id`, defaults) are not a change, and neither is
 * `user_id`, which the server stamps.
 *
 * TWO TABLES ARE SENT WHOLE. Values and answers have no node, so their ids are
 * minted again on every page load and never match the account's. Diffing them
 * by id would add a second copy of every value on its first edit. When their
 * content changes, the whole table is replaced, as the old save always did.
 */

import { PLAN_ROW_KEYS, type PlanChanges, type PlanRows, type RowTable } from "@/src/db/lifePlanTypes"

export type { PlanChanges }

/** Replaced whole when any row in them changes. See the header. */
export const WHOLE_TABLES = ["values", "answers"] as const satisfies readonly RowTable[]

/** The key of every other table: `id`, except the four link tables. */
export const ROW_KEY: Record<RowTable, readonly string[]> = {
  nodes: ["id"],
  north_stars: ["id"],
  areas: ["id"],
  goals: ["id"],
  checkpoints: ["id"],
  obstacles: ["id"],
  beliefs: ["id"],
  habits: ["id"],
  goal_feeds: ["goal_id", "feeds_goal_id"],
  goal_serves: ["goal_id", "area_id"],
  routines: ["id"],
  routine_serves: ["routine_id", "area_id"],
  steps: ["id"],
  split_days: ["id"],
  step_serves: ["step_id", "goal_id"],
  experiences: ["id"],
  fields: ["id"],
  sub_steps: ["id"],
  seasons: ["id"],
  season_areas: ["season_id", "area_id"],
  season_goals: ["season_id", "goal_id"],
  values: ["id"],
  answers: ["id"],
}

type Row = Record<string, unknown>

const PLAN_FIELDS = ["version", "seq", "season_focus_id"] as const

/** Text that is the same for two rows holding the same values, whatever order their keys were written in. */
function same(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Row)[k]]))
      : v,
  )
}

/** `after`'s row as text, on its own columns minus `user_id` (and `id` for the whole tables). */
function sentPart(row: Row, drop: readonly string[]): string {
  return same(Object.fromEntries(Object.keys(row).filter((k) => !drop.includes(k)).map((k) => [k, row[k]])))
}

/** `before`'s row as text, on exactly the columns `after`'s row has. */
function onColumnsOf(shape: Row, row: Row, drop: readonly string[]): string {
  return same(Object.fromEntries(Object.keys(shape).filter((k) => !drop.includes(k)).map((k) => [k, row[k] ?? null])))
}

const STAMPED = ["user_id"] as const
const MINTED = ["user_id", "id"] as const

function keyOf(table: RowTable, row: Row): string {
  return ROW_KEY[table].map((col) => String(row[col])).join("|")
}

function keyColumns(table: RowTable, row: Row): Row {
  return Object.fromEntries(ROW_KEY[table].map((col) => [col, row[col]]))
}

/**
 * The changes that turn `before` into `after`.
 *
 * `before` null means nothing is known to be on the account: every row is
 * written and nothing is removed or replaced, so the unknown is never deleted.
 */
export function diffPlanRows(before: PlanRows | null, after: PlanRows): PlanChanges {
  const changes: PlanChanges = { plan_id: after.plan_id, plan: {}, upsert: {}, remove: {}, replace: [] }

  for (const field of PLAN_FIELDS) {
    if (!before || before[field] !== after[field]) {
      ;(changes.plan as Row)[field] = after[field]
    }
  }

  for (const table of PLAN_ROW_KEYS) {
    const next = after[table] as unknown as Row[]
    const prev = (before?.[table] ?? []) as unknown as Row[]

    if ((WHOLE_TABLES as readonly RowTable[]).includes(table)) {
      if (!before) {
        if (next.length > 0) changes.upsert[table] = next
        continue
      }
      // Content only, in any order: the ids differ per visit by design.
      const shape = next[0] ?? prev[0] ?? {}
      const content = (rows: Row[], read: boolean) =>
        rows.map((row) => (read ? onColumnsOf(shape, row, MINTED) : sentPart(row, MINTED))).sort().join("\n")
      if (content(prev, true) !== content(next, false)) {
        changes.replace.push(table)
        if (next.length > 0) changes.upsert[table] = next
      }
      continue
    }

    const had = new Map(prev.map((row) => [keyOf(table, row), row]))
    const written = next.filter((row) => {
      const was = had.get(keyOf(table, row))
      return !was || onColumnsOf(row, was, STAMPED) !== sentPart(row, STAMPED)
    })
    if (written.length > 0) changes.upsert[table] = written

    const kept = new Set(next.map((row) => keyOf(table, row)))
    const gone = prev.filter((row) => !kept.has(keyOf(table, row))).map((row) => keyColumns(table, row))
    if (gone.length > 0) changes.remove[table] = gone
  }

  return changes
}

/** True when sending these changes would change nothing on the account. */
export function nothingChanged(changes: PlanChanges): boolean {
  return (
    Object.keys(changes.plan).length === 0 &&
    Object.keys(changes.upsert).length === 0 &&
    Object.keys(changes.remove).length === 0 &&
    changes.replace.length === 0
  )
}
