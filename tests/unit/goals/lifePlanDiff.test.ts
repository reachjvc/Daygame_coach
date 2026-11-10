import { describe, it, expect } from "vitest"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planToRows } from "@/src/goals/lifePlanMapper"
import type { MapContext } from "@/src/goals/lifePlanMapper"
import { diffPlanRows, nothingChanged } from "@/src/goals/lifePlanDiff"
import { PLAN_ROW_KEYS } from "@/src/db/lifePlanTypes"
import { setNorthStar, updateGoal, removeGoal, setAnswer, unlinkGoal } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

const PLAN_ID = "11111111-1111-1111-1111-111111111111"
const USER_ID = "22222222-2222-2222-2222-222222222222"

/** One id map for both sides, as the flow keeps one for the whole visit. */
function mapper() {
  const minted = new Map<string, string>()
  let n = 0
  const ctx: MapContext = {
    planId: PLAN_ID,
    userId: USER_ID,
    idFor(localId: string): string {
      const had = minted.get(localId)
      if (had) return had
      n += 1
      const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
      minted.set(localId, id)
      return id
    },
  }
  return (plan: NsPlan) => planToRows(plan, ctx)
}

describe("a save sends only what changed", () => {
  it("sends nothing when nothing changed", () => {
    const rows = mapper()
    const plan = fullPlan()
    expect(nothingChanged(diffPlanRows(rows(plan), rows(plan)))).toBe(true)
  })

  it("sends one north star row when only the north star changed", () => {
    const rows = mapper()
    const plan = fullPlan()
    const changes = diffPlanRows(rows(plan), rows(setNorthStar(plan, "A different life")))
    expect(Object.keys(changes.upsert)).toEqual(["north_stars"])
    expect(changes.upsert.north_stars).toHaveLength(1)
    expect(changes.remove).toEqual({})
    expect(changes.replace).toEqual([])
  })

  it("sends one goal row when one goal's title changed", () => {
    const rows = mapper()
    const plan = fullPlan()
    const goal = plan.goals[0]
    const changes = diffPlanRows(rows(plan), rows(updateGoal(plan, goal.id, { title: "Renamed" })))
    expect(changes.upsert.goals).toHaveLength(1)
    expect(changes.upsert.goals?.[0]).toMatchObject({ title: "Renamed" })
    expect(changes.remove).toEqual({})
  })

  it("removes a deleted goal's node by its key alone, and nothing it did not delete", () => {
    const rows = mapper()
    const plan = fullPlan()
    const before = rows(plan)
    const goal = plan.goals[0]
    const after = rows(removeGoal(plan, goal.id))
    const changes = diffPlanRows(before, after)
    const goalUuid = before.nodes.find((n) => n.local_id === goal.id)!.id
    expect(changes.remove.nodes).toContainEqual({ id: goalUuid })
    expect(changes.remove.goals).toEqual([{ id: goalUuid }])
    // Every removed row really is gone from `after`.
    for (const [table, gone] of Object.entries(changes.remove)) {
      const left = (after as unknown as Record<string, Record<string, unknown>[]>)[table]
      for (const key of gone ?? []) {
        expect(left.some((row) => Object.entries(key).every(([k, v]) => row[k] === v))).toBe(false)
      }
    }
  })

  it("compares link tables by their two ids", () => {
    const rows = mapper()
    const plan = fullPlan()
    // The full plan's first goal already feeds its second.
    const from = plan.goals.find((g) => g.feedsGoalIds.length > 0)!
    const unlinked = unlinkGoal(plan, from.id, from.feedsGoalIds[0])
    const linked = plan
    const changes = diffPlanRows(rows(unlinked), rows(linked))
    const added = changes.upsert.goal_feeds ?? []
    expect(added.length).toBeGreaterThan(0)
    const back = diffPlanRows(rows(linked), rows(unlinked))
    expect(back.remove.goal_feeds).toEqual(added.map((r) => ({ goal_id: r.goal_id, feeds_goal_id: r.feeds_goal_id })))
  })

  it("replaces the answers whole when one answer changed, since their ids are minted per visit", () => {
    const rows = mapper()
    const plan = fullPlan()
    const after = rows(setAnswer(plan, "why", "Because"))
    const changes = diffPlanRows(rows(plan), after)
    expect(changes.replace).toEqual(["answers"])
    expect(changes.upsert.answers).toEqual(after.answers)
    expect(changes.upsert.values).toBeUndefined()
  })

  it("with nothing known on the account, writes every row and removes nothing", () => {
    const rows = mapper()
    const after = rows(fullPlan())
    const changes = diffPlanRows(null, after)
    expect(changes.remove).toEqual({})
    for (const table of PLAN_ROW_KEYS) {
      const list = after[table] as unknown[]
      if (list.length > 0) expect(changes.upsert[table]).toHaveLength(list.length)
    }
    expect(changes.plan).toEqual({ version: after.version, seq: after.seq })
    // Nor is anything replaced: values and answers are written, never wiped.
    expect(changes.replace).toEqual([])
    expect(changes.upsert.values).toHaveLength(after.values.length)
  })

  it("compares with the rows as the account holds them: its owner, its extra columns, its own value ids", () => {
    const rows = mapper()
    const plan = fullPlan()
    const sent = rows(plan)
    const held = JSON.parse(JSON.stringify(sent)) as typeof sent
    const stamp = (list: Record<string, unknown>[]) => list.forEach((r) => (r.user_id = "the-real-owner"))
    for (const key of Object.keys(held)) if (Array.isArray((held as unknown as Record<string, unknown>)[key])) stamp((held as unknown as Record<string, Record<string, unknown>[]>)[key])
    held.goals.forEach((g) => ((g as unknown as Record<string, unknown>).created_at = "2026-01-01T00:00:00Z"))
    held.values.forEach((v, i) => (v.id = `account-value-${i}`))
    held.values.reverse()
    expect(nothingChanged(diffPlanRows(held, sent))).toBe(true)
  })

  it("sends the parts an empty plan row lacks, the north star's node among them", () => {
    const rows = mapper()
    const plan = fullPlan()
    const after = rows(setNorthStar(plan, "Typed into a plan row that held nothing"))
    const empty = { ...after, nodes: [], north_stars: [], areas: [], goals: [], checkpoints: [], obstacles: [], beliefs: [], goal_feeds: [], goal_serves: [], routines: [], routine_serves: [], steps: [], split_days: [], step_serves: [], experiences: [], fields: [], sub_steps: [], values: [], answers: [], seasons: [], season_areas: [], season_goals: [], reviews: [], review_scores: [] }
    const changes = diffPlanRows(empty, after)
    const star = after.north_stars.find((s) => s.ended_on === null)!
    expect(changes.upsert.nodes).toContainEqual(expect.objectContaining({ id: star.id, kind: "north_star" }))
    expect(changes.upsert.areas).toHaveLength(after.areas.length)
  })

  it("does not care about the order keys were written in", () => {
    const rows = mapper()
    const plan = fullPlan()
    const before = rows(plan)
    const after = rows(plan)
    after.goals = after.goals.map((g) => Object.fromEntries(Object.entries(g).reverse()) as typeof g)
    expect(nothingChanged(diffPlanRows(before, after))).toBe(true)
  })
})
