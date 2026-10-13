/**
 * DELETING A PERSON DELETES EVERYTHING THEY WROTE — READ FROM THE CATALOG.
 *
 * Replaces nine tests that each deleted a profile and counted the rows left in
 * one table (goals, purchases, inner-game progress, value comparisons, user
 * values, field reports, sticking points, report templates, life answers), plus
 * four that inserted a row under a user who does not exist. Each covered one
 * table and was written when that table was; a table added after them was
 * covered by nothing. This asks Postgres for every foreign key instead, so a new
 * table is checked the day it is created.
 *
 * THREE RULES, each read from `pg_constraint` and `information_schema`:
 *
 *   1. Every table with a `user_id` is reached from `profiles` by ON DELETE
 *      CASCADE through a foreign key that includes `user_id`; every table
 *      without one that hangs off such a table is reached through that key.
 *      Reached means deleting the person removes the rows, and the key on
 *      `user_id` means the row cannot name a person who does not exist.
 *   2. Every ON DELETE SET NULL — a row that deliberately outlives what it
 *      points at — is named below with the reason. A new one fails until
 *      somebody writes down why the child should survive.
 *   3. No SET NULL clears a `user_id`. On a two-column key `(x, user_id)` a bare
 *      SET NULL nulls BOTH columns, `user_id` is NOT NULL, and the delete
 *      aborts — the defect 20260923130000_season_focus_is_any_node.sql fixed for
 *      one constraint. Five more carry it; they are listed as KNOWN WRONG and
 *      the list must shrink, never grow.
 *
 * THE PLAN'S EXCEPTION LIST, CHECKED. `error_reports` (SET NULL to the user, so
 * a crash report outlives the account) is production's only user key that does
 * not cascade, but the table is not in this mirror, so it cannot be named here.
 * `milestones.session_id` and `workout_logs.enrollment_id` are not exceptions to
 * rule 1 — both tables cascade from the user — they are SET NULLs to a parent
 * that is not the user, and they are in rule 2's list.
 */

import { describe, test, expect, beforeAll, afterAll } from "vitest"
import type { Client } from "pg"
import { getClient } from "../setup"

interface ForeignKey {
  name: string
  child: string
  parent: string
  /** pg_constraint.confdeltype: c cascade, n set null, a no action, r restrict, d set default */
  onDelete: string
  columns: string[]
  /** The columns a SET NULL clears: its column list, or every key column when it has none. */
  nulls: string[]
}

/**
 * Rows that outlive what they point at, and why. Every SET NULL in the schema
 * must be here, and everything here must be a SET NULL in the schema.
 */
const OUTLIVES_ITS_PARENT: Record<string, string> = {
  milestones_session_id_fkey: "a badge stays earned when the session it was earned in is deleted",
  field_reports_session_id_fkey: "a field report stays written when its session is deleted",
  workout_logs_enrollment_id_fkey:
    "erasing a program keeps the training; the workout keeps its day, cycle and week",
  life_plan_routines_enrollment_id_fkey: "ending a program must not delete the routine that ran it",
  life_plan_goals_user_goal_id_fkey: "deleting the counted goal unlinks the plan's goal; the plan keeps its words",
  life_plans_season_focus_fk: "deleting the focused node clears the focus and leaves the plan",
  // KNOWN WRONG — see KNOWN_TO_NULL_THE_OWNER below. The intent is right (the
  // item outlives its area, goal or target); the bare SET NULL is not.
  life_plan_goals_area_fk: "a goal outlives its area — KNOWN WRONG, nulls user_id",
  life_plan_routines_area_fk: "a routine outlives its area — KNOWN WRONG, nulls user_id",
  life_plan_experiences_area_fk: "an experience outlives its area — KNOWN WRONG, nulls user_id",
  life_plan_experiences_goal_fk: "an experience outlives its goal — KNOWN WRONG, nulls user_id",
  life_plan_fields_target_fk: "a field outlives its target — KNOWN WRONG, nulls user_id",
}

/**
 * SET NULLs that clear `user_id` as well as the pointer, so deleting the parent
 * aborts with a NOT NULL violation. Production has the same five
 * (20260922100000_life_plan_tables.sql; tests/db/baseline.sql). Verified on the
 * mirror: deleting an area node a goal is filed under raises `null value in
 * column "user_id" of relation "life_plan_goals"`, and `save_life_plan` deletes
 * gone nodes before it upserts goals, so a plan save that removes an area with
 * goals under it fails. Fix each with `ON DELETE SET NULL (<pointer column>)`
 * and delete its line here.
 */
const KNOWN_TO_NULL_THE_OWNER = [
  "life_plan_experiences_area_fk",
  "life_plan_experiences_goal_fk",
  "life_plan_fields_target_fk",
  "life_plan_goals_area_fk",
  "life_plan_routines_area_fk",
]

async function foreignKeys(db: Client): Promise<ForeignKey[]> {
  const { rows } = await db.query(
    // relname, not ::regclass::text, which quotes a reserved word (`"values"`)
    // and would then never equal information_schema's table_name.
    `SELECT c.conname AS name,
            child.relname AS child,
            parent.relname AS parent,
            c.confdeltype::text AS "onDelete",
            ARRAY(SELECT a.attname::text
                    FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
                    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                   ORDER BY k.ord) AS columns,
            ARRAY(SELECT a.attname::text
                    FROM unnest(coalesce(c.confdelsetcols, c.conkey)) AS k(attnum)
                    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS nulls
       FROM pg_constraint c
       JOIN pg_class child ON child.oid = c.conrelid
       JOIN pg_class parent ON parent.oid = c.confrelid
      WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`
  )
  return rows as ForeignKey[]
}

async function tablesWithUserId(db: Client): Promise<Set<string>> {
  const { rows } = await db.query(
    `SELECT c.table_name AS name
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'user_id' AND t.table_type = 'BASE TABLE'`
  )
  return new Set(rows.map((r) => r.name as string))
}

describe("a person's data goes with the person", () => {
  let db: Client
  beforeAll(async () => {
    db = await getClient()
  })
  afterAll(async () => {
    await db.end()
  })

  test("every table cascades from the user, and every row that outlives its parent is named", async () => {
    const fks = await foreignKeys(db)
    const withUserId = await tablesWithUserId(db)

    // Owned: has a user_id, or hangs off something owned (workout_sets has no
    // user_id; whose it is comes from its workout).
    const owned = new Set(withUserId)
    for (let grew = true; grew; ) {
      grew = false
      for (const fk of fks) {
        if (owned.has(fk.parent) && !owned.has(fk.child)) {
          owned.add(fk.child)
          grew = true
        }
      }
    }

    // Reached: deleting the person deletes it, by a cascade that carries the
    // owner (through a key that includes user_id, where the table has one).
    const reached = new Set(["profiles"])
    for (let grew = true; grew; ) {
      grew = false
      for (const fk of fks) {
        if (reached.has(fk.child) || !reached.has(fk.parent) || fk.onDelete !== "c") continue
        if (withUserId.has(fk.child) && !fk.columns.includes("user_id")) continue
        reached.add(fk.child)
        grew = true
      }
    }

    // The scan read the schema at all, before anything is concluded from it.
    expect(withUserId.size, "tables with a user_id — the catalog query found too few").toBeGreaterThan(40)
    expect(fks.length, "foreign keys — the catalog query found too few").toBeGreaterThan(60)

    expect
      .soft(
        [...owned].filter((t) => !reached.has(t)).sort(),
        "these hold a person's rows but are not deleted with the person — give the key on user_id ON DELETE CASCADE"
      )
      .toEqual([])

    const setNull = fks.filter((fk) => fk.onDelete === "n")
    expect
      .soft(
        setNull.map((fk) => fk.name).filter((n) => !(n in OUTLIVES_ITS_PARENT)).sort(),
        "a new ON DELETE SET NULL — add it to OUTLIVES_ITS_PARENT with why the row should survive"
      )
      .toEqual([])
    expect
      .soft(
        Object.keys(OUTLIVES_ITS_PARENT).filter((n) => !setNull.some((fk) => fk.name === n)).sort(),
        "named as outliving its parent, but no longer a SET NULL here — remove it from the list"
      )
      .toEqual([])

    expect
      .soft(
        setNull.filter((fk) => fk.nulls.includes("user_id")).map((fk) => fk.name).sort(),
        "a SET NULL that clears user_id aborts the delete it should survive — use SET NULL (<pointer column>). " +
          "If one was FIXED, remove it from KNOWN_TO_NULL_THE_OWNER."
      )
      .toEqual([...KNOWN_TO_NULL_THE_OWNER].sort())
  })
})
