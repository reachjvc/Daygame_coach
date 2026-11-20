/**
 * COPYING ONE ACCOUNT'S PLAN INTO ANOTHER, as pure functions over rows.
 *
 * Every id in the plan tables is a global UUID: a row copied as it is would
 * collide with the original, and a row whose foreign key still pointed at the
 * original's parent would be refused (the keys are composite with the owner's
 * id). So the copy gives EVERY row a new id and rewrites every column that
 * holds one, consistently: one old id maps to one new id wherever it appears.
 *
 * WHERE AN ID CAN HIDE, found by listing every uuid column of the `life_plan_*`
 * tables (`tests/integration/repos/planSandboxCopy.integration.test.ts` does the
 * listing again against the real schema and fails when a column is in neither
 * list below):
 *   - `id` of every table that has one, `plan_id`, and `user_id` (the new owner);
 *   - the foreign keys named in MAPPED_COLUMNS;
 *   - NO id lives inside a jsonb or array column: `ladder` and `ramp_steps` hold
 *     numbers, `reasons_list` and `asked` hold words and prompt ids.
 *   - `local_id` (the plan's own `g3`, `area_health`) is the flow's name for a
 *     part, not a database id. It is kept verbatim: the browser, the journal and
 *     the day maps all speak it.
 *
 * ONE COLUMN IS DELIBERATELY NOT COPIED: `life_plan_routines.enrollment_id`
 * points at a training enrollment of the ORIGINAL account. The copy owns none,
 * so it is set to null rather than pointing a stranger's account at someone
 * else's program.
 */

import type { PlanRows, RowTable } from "@/src/db/lifePlanTypes"
import { PLAN_ROW_KEYS } from "@/src/db/lifePlanTypes"
import type { DayRows } from "@/src/db/lifePlanDayTypes"

type Row = Record<string, unknown>

/** Columns that hold a plan or day id and are rewritten through the map. */
export const MAPPED_COLUMNS = [
  "id",
  "plan_id",
  "area_id",
  "goal_id",
  "feeds_goal_id",
  "routine_id",
  "step_id",
  "season_id",
  "review_id",
  "target_id",
  "focus_id",
  "day_id",
  "node_id",
] as const

/** Uuid columns that are set to null in the copy (they point outside the plan). */
export const NULLED_COLUMNS = ["enrollment_id"] as const

/** The owner column, replaced with the new owner's id on every row. */
export const OWNER_COLUMN = "user_id"

export type IdMaker = () => string

/** A map that mints a new id the first time it sees an old one. */
export function idMapper(newId: IdMaker): (oldId: string) => string {
  const seen = new Map<string, string>()
  return (oldId) => {
    const had = seen.get(oldId)
    if (had) return had
    const made = newId()
    seen.set(oldId, made)
    return made
  }
}

function remapRow(row: Row, mapId: (id: string) => string, userId: string): Row {
  const out: Row = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === OWNER_COLUMN) out[key] = userId
    else if ((NULLED_COLUMNS as readonly string[]).includes(key)) out[key] = null
    else if ((MAPPED_COLUMNS as readonly string[]).includes(key)) out[key] = typeof value === "string" ? mapId(value) : value
    else out[key] = value
  }
  return out
}

/**
 * The plan, as rows of a NEW account.
 *
 * `plan_id` is the new account's own plan row (made first, so its id and
 * revision are known); a row that names the old plan gets it. `mapId` is shared
 * with `remapDayRows`, so a node's new id is the same in both.
 */
export function remapPlanRows(rows: PlanRows, mapId: (id: string) => string, userId: string, newPlanId: string): PlanRows {
  // The old plan id maps to the new plan's own id, wherever it appears.
  const oldPlanId = rows.plan_id
  const mapWithPlan = (id: string) => (id === oldPlanId ? newPlanId : mapId(id))
  const out = { ...rows, plan_id: newPlanId, user_id: userId } as unknown as Record<string, unknown>
  for (const table of PLAN_ROW_KEYS) {
    out[table] = (rows[table] as unknown as Row[]).map((row) => remapRow(row, mapWithPlan, userId))
  }
  return out as unknown as PlanRows
}

/** The days, as rows of the new account, on the new plan. */
export function remapDayRows(rows: DayRows, oldPlanId: string, mapId: (id: string) => string, userId: string, newPlanId: string): DayRows {
  const mapWithPlan = (id: string) => (id === oldPlanId ? newPlanId : mapId(id))
  const each = (list: Row[]) => list.map((row) => remapRow(row, mapWithPlan, userId))
  return {
    days: each(rows.days as unknown as Row[]) as unknown as DayRows["days"],
    ratings: each(rows.ratings as unknown as Row[]) as unknown as DayRows["ratings"],
    ticks: each(rows.ticks as unknown as Row[]) as unknown as DayRows["ticks"],
    journal: each(rows.journal as unknown as Row[]) as unknown as DayRows["journal"],
    numbers: each((rows.numbers ?? []) as unknown as Row[]) as unknown as DayRows["numbers"],
  }
}

/**
 * Every row of every plan table with its ids replaced by NAMES, so an account's
 * plan and its copy can be compared for equal content although no id is equal.
 *
 * A node's id becomes its `local_id` (the plan's own `g3`); the plan's id
 * becomes "plan"; the owner and the training enrollment are dropped. Rows are
 * sorted as text, so the order the two accounts' ids happen to sort in does not
 * matter. Used by the tests; nothing at run time reads it.
 */
export function canonicalPlan(rows: PlanRows): Record<RowTable, string[]> {
  const named = new Map(rows.nodes.map((n) => [n.id, n.local_id]))
  const name = (key: string, value: unknown): unknown => {
    if (typeof value !== "string") return value
    if (key === "plan_id") return "plan"
    return named.get(value) ?? `UNNAMED:${value}`
  }
  const out = {} as Record<RowTable, string[]>
  for (const table of PLAN_ROW_KEYS) {
    out[table] = (rows[table] as unknown as Row[])
      .map((row) => {
        const kept: [string, unknown][] = []
        for (const [k, v] of Object.entries(row)) {
          if (k === OWNER_COLUMN || (NULLED_COLUMNS as readonly string[]).includes(k)) continue
          // `values` and `answers` carry a minted id of their own that nothing names.
          if (k === "id" && (table === "values" || table === "answers")) continue
          kept.push([k, (MAPPED_COLUMNS as readonly string[]).includes(k) ? name(k, v) : v])
        }
        return JSON.stringify(kept.sort(([a], [b]) => (a < b ? -1 : 1)))
      })
      .sort()
  }
  return out
}

/** The day half by names: a day is its date, a part is its `local_id`. */
export function canonicalDays(days: DayRows, nodes: PlanRows["nodes"]): Record<keyof DayRows, string[]> {
  const named = new Map(nodes.map((n) => [n.id, n.local_id]))
  const dateOf = new Map(days.days.map((d) => [d.id, d.on_date]))
  const canon = (list: Row[], drop: string[]) =>
    list
      .map((row) =>
        JSON.stringify(
          Object.entries(row)
            .filter(([k]) => k !== OWNER_COLUMN && !drop.includes(k))
            .map(([k, v]): [string, unknown] => [
              k,
              k === "day_id" ? dateOf.get(v as string) : k === "node_id" || k === "area_id" ? named.get(v as string) ?? `UNNAMED:${v}` : v,
            ])
            .sort(([a], [b]) => (a < b ? -1 : 1)),
        ),
      )
      .sort()
  return {
    days: canon(days.days as unknown as Row[], ["id", "plan_id"]),
    ratings: canon(days.ratings as unknown as Row[], []),
    ticks: canon(days.ticks as unknown as Row[], []),
    journal: canon(days.journal as unknown as Row[], ["id"]),
    numbers: canon((days.numbers ?? []) as unknown as Row[], []),
  }
}

/**
 * WHAT THE COPY SPACE KEEPS WHEN IT IS COPIED AGAIN: the version and sorter being tried and the "Not now" marks of the
 * go-deeper cards (answers whose key starts `start:new:sequence`, `start:new:sorter`, `start:new:deeper:`). They are the
 * copy space's own settings, not part of the real plan, so a fresh copy of the real plan must not reset them.
 */
export const COPY_SPACE_KEPT_ANSWER = /^start:new:(sequence|sorter|deeper:)/

/** The copied answers, with the copy space's own settings (from before the copy) laid over them. */
export function keepCopySpaceAnswers(
  copied: PlanRows["answers"],
  before: PlanRows["answers"],
  owner: { userId: string; planId: string },
  newId: IdMaker,
): PlanRows["answers"] {
  const kept = before.filter((a) => a.kind === "answer" && COPY_SPACE_KEPT_ANSWER.test(a.prompt_id))
  const names = new Set(kept.map((a) => a.prompt_id))
  return [
    ...copied.filter((a) => !(a.kind === "answer" && names.has(a.prompt_id))),
    ...kept.map((a) => ({ ...a, id: newId(), user_id: owner.userId, plan_id: owner.planId })),
  ]
}
