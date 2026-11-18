/**
 * THE COPY SPACE'S ID REMAP (Plans/plan-in-steps.md, Phase 2.4).
 *
 * Every id in the plan tables is a global UUID, so a copy must give every row a
 * new one and rewrite every column that names one, consistently. Proved here on
 * the one full plan (every table has rows), in memory; the integration test
 * proves the same through a real database and row security.

 * The write functions the copy uses, proved against the real schema in
 * tests/integration/repos/planSandbox.integration.test.ts: insertDayRows,
 * deleteReminder, deleteLifePlan.
 */
import { describe, it, expect } from "vitest"
import { randomUUID } from "node:crypto"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planToRows } from "@/src/goals/lifePlanMapper"
import { PLAN_ROW_KEYS, type PlanRows } from "@/src/db/lifePlanTypes"
import type { DayRows } from "@/src/db/lifePlanDayTypes"
import {
  MAPPED_COLUMNS,
  NULLED_COLUMNS,
  canonicalDays,
  canonicalPlan,
  idMapper,
  remapDayRows,
  remapPlanRows,
} from "@/src/goals/planSandboxCopy"

const OWNER = randomUUID()
const SANDBOX = randomUUID()

function ownersRows(): PlanRows {
  const planId = randomUUID()
  const minted = new Map<string, string>()
  const rows = planToRows(fullPlan(), {
    planId,
    userId: OWNER,
    idFor: (local) => minted.get(local) ?? minted.set(local, randomUUID()).get(local)!,
  })
  // Give the one column that points outside the plan a value, so the null is proved.
  rows.routines = rows.routines.map((r, i) => (i === 0 ? { ...r, enrollment_id: randomUUID() } : r))
  return rows
}

function ownersDays(rows: PlanRows): DayRows {
  const area = rows.areas[0].id
  const node = rows.steps[0].id
  const day = (n: number) => ({ id: randomUUID(), user_id: OWNER, plan_id: rows.plan_id, on_date: `2026-01-0${n}`, note: n === 1 ? "a line" : "" })
  const [d1, d2] = [day(1), day(2)]
  return {
    days: [d1, d2],
    ratings: [{ user_id: OWNER, day_id: d1.id, area_id: area, rating: 7 }],
    ticks: [{ user_id: OWNER, day_id: d1.id, node_id: node }],
    journal: [{ id: randomUUID(), user_id: OWNER, day_id: d1.id, local_id: "f1", asked: "How did it go?", body: "Fine" }],
    numbers: [{ user_id: OWNER, day_id: d1.id, node_id: node, value: 3 }],
  }
}

const ids = (rows: PlanRows, table: (typeof PLAN_ROW_KEYS)[number]) =>
  (rows[table] as unknown as Record<string, unknown>[]).flatMap((r) => (typeof r.id === "string" ? [r.id] : []))

describe("remapping a plan into another account", () => {
  const before = ownersRows()
  const mapId = idMapper(randomUUID)
  const newPlanId = randomUUID()
  const after = remapPlanRows(before, mapId, SANDBOX, newPlanId)

  it("fills every table, or the rest of this proves nothing", () => {
    for (const table of PLAN_ROW_KEYS) expect(before[table].length, `the fixture has no ${table}`).toBeGreaterThan(0)
  })

  it("keeps every table's row count", () => {
    for (const table of PLAN_ROW_KEYS) expect(after[table].length).toBe(before[table].length)
  })

  it("gives every row a new id, and no new id is an old one", () => {
    const old = new Set<string>([before.plan_id])
    for (const table of PLAN_ROW_KEYS) for (const id of ids(before, table)) old.add(id)
    for (const table of PLAN_ROW_KEYS) for (const id of ids(after, table)) expect(old.has(id), `${table} kept an old id`).toBe(false)
    expect(after.plan_id).toBe(newPlanId)
  })

  it("names the new owner on every row, and the old owner on none", () => {
    expect(after.user_id).toBe(SANDBOX)
    for (const table of PLAN_ROW_KEYS) for (const row of after[table] as unknown as Record<string, unknown>[]) expect(row.user_id).toBe(SANDBOX)
    expect(JSON.stringify(after)).not.toContain(OWNER)
  })

  it("leaves no id the new plan does not hold: every reference resolves inside the copy", () => {
    const held = new Set<string>([newPlanId])
    for (const table of PLAN_ROW_KEYS) for (const id of ids(after, table)) held.add(id)
    for (const table of PLAN_ROW_KEYS) {
      for (const row of after[table] as unknown as Record<string, unknown>[]) {
        for (const column of MAPPED_COLUMNS) {
          const value = row[column]
          if (typeof value === "string") expect(held.has(value), `${table}.${column} points outside the copy`).toBe(true)
        }
      }
    }
  })

  it("does not carry the training enrollment, which belongs to the other account", () => {
    expect(NULLED_COLUMNS).toContain("enrollment_id")
    for (const r of after.routines) expect(r.enrollment_id).toBeNull()
    expect(before.routines.some((r) => r.enrollment_id)).toBe(true)
  })

  it("keeps the plan's own names, and every other value, exactly", () => {
    expect(after.nodes.map((n) => n.local_id).sort()).toEqual(before.nodes.map((n) => n.local_id).sort())
    expect(canonicalPlan(after)).toEqual(canonicalPlan(before))
  })

  it("is one old id to one new id, wherever it appears", () => {
    // A goal's new id is the same in the goals table, its node, its checkpoints and the links that name it.
    const g = before.goals.find((x) => before.checkpoints.some((c) => c.goal_id === x.id))!
    const newId = after.goals[before.goals.indexOf(g)].id
    expect(after.nodes.some((n) => n.id === newId && n.local_id === before.nodes.find((n0) => n0.id === g.id)!.local_id)).toBe(true)
    expect(after.checkpoints.filter((c) => c.goal_id === newId).length).toBe(before.checkpoints.filter((c) => c.goal_id === g.id).length)
  })

  it("does not change the rows it was given", () => {
    expect(JSON.stringify(before)).toContain(OWNER)
    expect(before.plan_id).not.toBe(newPlanId)
  })
})

describe("remapping the days with the same map", () => {
  const plan = ownersRows()
  const days = ownersDays(plan)
  const mapId = idMapper(randomUUID)
  const newPlanId = randomUUID()
  const newPlan = remapPlanRows(plan, mapId, SANDBOX, newPlanId)
  const newDays = remapDayRows(days, plan.plan_id, mapId, SANDBOX, newPlanId)

  it("keeps every row, including a day with nothing in it", () => {
    expect(newDays.days).toHaveLength(2)
    expect(newDays.ratings).toHaveLength(1)
    expect(newDays.ticks).toHaveLength(1)
    expect(newDays.journal).toHaveLength(1)
    expect(newDays.numbers).toHaveLength(1)
  })

  it("points ticks, ratings and numbers at the NEW plan's parts", () => {
    const nodes = new Set(newPlan.nodes.map((n) => n.id))
    expect(nodes.has(newDays.ticks[0].node_id)).toBe(true)
    expect(nodes.has(newDays.ratings[0].area_id)).toBe(true)
    expect(nodes.has(newDays.numbers![0].node_id)).toBe(true)
    expect(newDays.days.every((d) => d.plan_id === newPlanId && d.user_id === SANDBOX)).toBe(true)
    const dayIds = new Set(newDays.days.map((d) => d.id))
    expect(dayIds.has(newDays.ticks[0].day_id)).toBe(true)
    expect(JSON.stringify(newDays)).not.toContain(OWNER)
  })

  it("keeps the journal's plan name and the words asked, and is equal by content", () => {
    expect(newDays.journal[0].local_id).toBe("f1")
    expect(newDays.journal[0].asked).toBe("How did it go?")
    expect(canonicalDays(newDays, newPlan.nodes)).toEqual(canonicalDays(days, plan.nodes))
  })
})
