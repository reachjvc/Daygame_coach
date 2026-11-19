/**
 * WHAT goalRepo's WRITES LEAVE IN `user_goals` AND `daily_goal_snapshots`.
 *
 * Plans/tests-catch-what-matters.md, Phase 4 (group B). For each writer: the
 * row as written (every field it sets), a second person's rows created first
 * and compared byte for byte afterwards, and, for archive / delete / reset,
 * that only the target rows changed.
 *
 * Every function runs unchanged through real PostgREST and real row security
 * (tests/db/harness.ts). Nothing here wipes a table: each test makes its own
 * users and only looks at rows that hang off them.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser } from "@/tests/db/harness"
import {
  archiveGoal,
  archiveGoalsBatch,
  awardStreakFreeze,
  deleteAllGoals,
  deleteGoal,
  reorderGoals,
  resetGoalPeriod,
  saveFrameworkPlan,
  snapshotGoals,
  useStreakFreeze,
} from "@/src/db/goalRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

type Row = Record<string, unknown>

/** A goal for `userId`, inserted as the table owner. Returns its id. */
async function goalFor(userId: string, fields: Record<string, unknown> = {}): Promise<string> {
  const row = { title: `goal-${randomUUID().slice(0, 8)}`, category: "custom", target_value: 5, ...fields }
  const cols = Object.keys(row)
  const [made] = await asOwner((q) =>
    q(
      `insert into user_goals (user_id, ${cols.join(", ")})
       values ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}) returning id`,
      [userId, ...Object.values(row)]
    )
  )
  return made.id as string
}

/** Every column of every goal the person owns, as JSON, in a fixed order. */
async function goalsOf(userId: string): Promise<Row[]> {
  return asOwner(async (q) =>
    (await q("select to_jsonb(g) as j from user_goals g where user_id = $1 order by id", [userId])).map(
      (r) => r.j as Row
    )
  )
}

async function oneGoal(goalId: string): Promise<Row> {
  const [row] = await asOwner((q) => q("select * from user_goals where id = $1", [goalId]))
  return row
}

async function snapshotsOf(userId: string): Promise<Row[]> {
  return asOwner((q) =>
    q("select goal_id, snapshot_date::text as d, current_value, target_value, was_complete, current_streak, best_streak, period from daily_goal_snapshots where user_id = $1 order by goal_id", [userId])
  )
}

/** Monday of this week in UTC, as YYYY-MM-DD, worked out here and not by the app's own helper. */
function mondayUtc(): string {
  const now = new Date()
  const day = (now.getUTCDay() + 6) % 7
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day))
  return monday.toISOString().slice(0, 10)
}

describe("archiving goals", () => {
  it("archiveGoal switches off that one goal and touches no other, of theirs or anybody else's", async () => {
    const me = await newUser("goal-archive")
    const other = await newUser("goal-archive-other")
    const target = await goalFor(me.id)
    const sibling = await goalFor(me.id)
    await goalFor(other.id)
    const siblingBefore = await oneGoal(sibling)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    await archiveGoal(me.id, target)

    expect(await oneGoal(target)).toMatchObject({ is_archived: true, is_active: false })
    expect(await oneGoal(sibling)).toEqual(siblingBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })

  it("archiveGoal cannot archive somebody else's goal, whatever id the caller passes", async () => {
    const owner = await newUser("goal-archive-owner")
    const intruder = await newUser("goal-archive-intruder")
    const goal = await goalFor(owner.id)
    const before = await goalsOf(owner.id)
    actAs(intruder)

    await archiveGoal(owner.id, goal)

    expect(await goalsOf(owner.id)).toEqual(before)
  })

  it("archiveGoalsBatch archives exactly the ids named, reports how many, and leaves the rest and other people alone", async () => {
    const me = await newUser("goal-batch")
    const other = await newUser("goal-batch-other")
    const a = await goalFor(me.id)
    const b = await goalFor(me.id)
    const kept = await goalFor(me.id)
    const othersGoal = await goalFor(other.id)
    const keptBefore = await oneGoal(kept)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    // The other person's id is named too: it must be neither archived nor counted.
    const count = await archiveGoalsBatch(me.id, [a, b, othersGoal])

    expect(count).toBe(2)
    expect(await oneGoal(a)).toMatchObject({ is_archived: true, is_active: false })
    expect(await oneGoal(b)).toMatchObject({ is_archived: true, is_active: false })
    expect(await oneGoal(kept)).toEqual(keptBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })

  it("archiveGoalsBatch with no ids writes nothing", async () => {
    const me = await newUser("goal-batch-empty")
    await goalFor(me.id)
    const before = await goalsOf(me.id)
    actAs(me)

    expect(await archiveGoalsBatch(me.id, [])).toBe(0)
    expect(await goalsOf(me.id)).toEqual(before)
  })
})

describe("deleting goals", () => {
  it("deleteGoal removes that goal for good and no other, of theirs or anybody else's", async () => {
    const me = await newUser("goal-delete")
    const other = await newUser("goal-delete-other")
    const target = await goalFor(me.id)
    const sibling = await goalFor(me.id)
    await goalFor(other.id)
    const siblingBefore = await oneGoal(sibling)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    await deleteGoal(me.id, target)

    expect(await asOwner((q) => q("select 1 from user_goals where id = $1", [target]))).toEqual([])
    expect(await oneGoal(sibling)).toEqual(siblingBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })

  it("deleteGoal cannot delete somebody else's goal, whatever id the caller passes", async () => {
    const owner = await newUser("goal-delete-owner")
    const intruder = await newUser("goal-delete-intruder")
    const goal = await goalFor(owner.id)
    const before = await goalsOf(owner.id)
    actAs(intruder)

    await deleteGoal(owner.id, goal)

    expect(await goalsOf(owner.id)).toEqual(before)
  })

  it("deleteAllGoals removes every goal of the caller, reports the count, and no goal of anybody else", async () => {
    const me = await newUser("goal-delete-all")
    const other = await newUser("goal-delete-all-other")
    await goalFor(me.id)
    await goalFor(me.id, { is_archived: true, is_active: false })
    await goalFor(other.id)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    expect(await deleteAllGoals(me.id)).toBe(2)

    expect(await goalsOf(me.id)).toEqual([])
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })
})

describe("reordering goals", () => {
  it("reorderGoals writes position = place in the list for the ids named, and nothing else on them", async () => {
    const me = await newUser("goal-reorder")
    const other = await newUser("goal-reorder-other")
    const a = await goalFor(me.id, { position: 0 })
    const b = await goalFor(me.id, { position: 1 })
    const c = await goalFor(me.id, { position: 2 })
    const notNamed = await goalFor(me.id, { position: 7 })
    await goalFor(other.id, { position: 3 })
    const beforeA = await oneGoal(a)
    const notNamedBefore = await oneGoal(notNamed)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    await reorderGoals(me.id, [c, a, b])

    expect((await oneGoal(c)).position).toBe(0)
    expect((await oneGoal(a)).position).toBe(1)
    expect((await oneGoal(b)).position).toBe(2)
    // Only position moved (the trigger restamps updated_at, so that is left out).
    expect({ ...(await oneGoal(a)), position: 0, updated_at: null }).toEqual({ ...beforeA, position: 0, updated_at: null })
    expect(await oneGoal(notNamed)).toEqual(notNamedBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })

  it("reorderGoals cannot move somebody else's goals, whatever ids the caller passes", async () => {
    const owner = await newUser("goal-reorder-owner")
    const intruder = await newUser("goal-reorder-intruder")
    const a = await goalFor(owner.id, { position: 4 })
    const b = await goalFor(owner.id, { position: 5 })
    const before = await goalsOf(owner.id)
    actAs(intruder)

    await reorderGoals(owner.id, [b, a])

    expect(await goalsOf(owner.id)).toEqual(before)
  })
})

describe("streak freezes", () => {
  it("awardStreakFreeze adds one, to that goal only", async () => {
    const me = await newUser("goal-freeze-award")
    const other = await newUser("goal-freeze-award-other")
    const goal = await goalFor(me.id, { streak_freezes_available: 1, streak_freezes_used: 2 })
    const sibling = await goalFor(me.id, { streak_freezes_available: 1 })
    await goalFor(other.id, { streak_freezes_available: 1 })
    const siblingBefore = await oneGoal(sibling)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    expect(await awardStreakFreeze(me.id, goal)).toBe(2)

    expect(await oneGoal(goal)).toMatchObject({ streak_freezes_available: 2, streak_freezes_used: 2 })
    expect(await oneGoal(sibling)).toEqual(siblingBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })

  it("awardStreakFreeze stops at three and writes nothing past it", async () => {
    const me = await newUser("goal-freeze-cap")
    const goal = await goalFor(me.id, { streak_freezes_available: 3 })
    const before = await oneGoal(goal)
    actAs(me)

    expect(await awardStreakFreeze(me.id, goal)).toBe(3)
    expect(await oneGoal(goal)).toEqual(before)
  })

  it("awardStreakFreeze cannot touch somebody else's goal", async () => {
    const owner = await newUser("goal-freeze-award-owner")
    const intruder = await newUser("goal-freeze-award-intruder")
    const goal = await goalFor(owner.id, { streak_freezes_available: 1 })
    const before = await goalsOf(owner.id)
    actAs(intruder)

    await expect(awardStreakFreeze(owner.id, goal)).rejects.toThrow(/Failed to fetch goal for freeze award/)

    expect(await goalsOf(owner.id)).toEqual(before)
  })

  it("useStreakFreeze spends one, counts it as used and stamps the date, on that goal only", async () => {
    const me = await newUser("goal-freeze-use")
    const other = await newUser("goal-freeze-use-other")
    const goal = await goalFor(me.id, { streak_freezes_available: 2, streak_freezes_used: 1 })
    const sibling = await goalFor(me.id, { streak_freezes_available: 2 })
    await goalFor(other.id, { streak_freezes_available: 2 })
    const siblingBefore = await oneGoal(sibling)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    await useStreakFreeze(me.id, goal, "2026-03-04")

    const row = await asOwner((q) =>
      q("select streak_freezes_available, streak_freezes_used, last_freeze_date::text as d from user_goals where id = $1", [goal])
    )
    expect(row).toEqual([{ streak_freezes_available: 1, streak_freezes_used: 2, d: "2026-03-04" }])
    expect(await oneGoal(sibling)).toEqual(siblingBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })

  it("useStreakFreeze with none left refuses and writes nothing", async () => {
    const me = await newUser("goal-freeze-none")
    const goal = await goalFor(me.id, { streak_freezes_available: 0 })
    const before = await oneGoal(goal)
    actAs(me)

    await expect(useStreakFreeze(me.id, goal, "2026-03-04")).rejects.toThrow("No streak freezes available")
    expect(await oneGoal(goal)).toEqual(before)
  })

  it("useStreakFreeze cannot spend somebody else's freeze", async () => {
    const owner = await newUser("goal-freeze-use-owner")
    const intruder = await newUser("goal-freeze-use-intruder")
    const goal = await goalFor(owner.id, { streak_freezes_available: 2 })
    const before = await goalsOf(owner.id)
    actAs(intruder)

    await expect(useStreakFreeze(owner.id, goal, "2026-03-04")).rejects.toThrow(/Failed to fetch goal for freeze use/)

    expect(await goalsOf(owner.id)).toEqual(before)
  })
})

describe("resetting a goal's period", () => {
  it("resetGoalPeriod zeroes the count and starts the period on its Monday, breaking the streak of a goal that was not complete", async () => {
    const me = await newUser("goal-reset")
    const other = await newUser("goal-reset-other")
    const goal = await goalFor(me.id, {
      period: "weekly",
      target_value: 5,
      current_value: 3,
      current_streak: 4,
      best_streak: 6,
      period_start_date: "2020-01-01",
    })
    const sibling = await goalFor(me.id, { current_value: 2, current_streak: 2 })
    await goalFor(other.id, { current_value: 2, current_streak: 2 })
    const siblingBefore = await oneGoal(sibling)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    const returned = await resetGoalPeriod(me.id, goal, "UTC")

    const row = await asOwner((q) =>
      q("select current_value, current_streak, best_streak, target_value, period_start_date::text as d from user_goals where id = $1", [goal])
    )
    expect(row).toEqual([{ current_value: 0, current_streak: 0, best_streak: 6, target_value: 5, d: mondayUtc() }])
    expect(returned.current_value).toBe(0)
    expect(await oneGoal(sibling)).toEqual(siblingBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)
  })

  it("resetGoalPeriod keeps the streak of a goal that was complete", async () => {
    const me = await newUser("goal-reset-complete")
    const goal = await goalFor(me.id, { target_value: 3, current_value: 3, current_streak: 4, best_streak: 4 })
    actAs(me)

    await resetGoalPeriod(me.id, goal, "UTC")

    expect(await oneGoal(goal)).toMatchObject({ current_value: 0, current_streak: 4, best_streak: 4 })
  })

  it("resetGoalPeriod cannot reset somebody else's goal", async () => {
    const owner = await newUser("goal-reset-owner")
    const intruder = await newUser("goal-reset-intruder")
    const goal = await goalFor(owner.id, { current_value: 3, current_streak: 4 })
    const before = await goalsOf(owner.id)
    actAs(intruder)

    await expect(resetGoalPeriod(owner.id, goal, "UTC")).rejects.toThrow(/Failed to fetch goal for reset/)

    expect(await goalsOf(owner.id)).toEqual(before)
  })
})

describe("the framework plan", () => {
  it("saveFrameworkPlan archives the old fw: goals only, then writes the new set, parent linked to child", async () => {
    const me = await newUser("goal-fw")
    const other = await newUser("goal-fw-other")
    const oldFw = await goalFor(me.id, { template_id: "fw:old", title: "Old plan goal" })
    const sameKey = await goalFor(me.id, { template_id: "fw:again", title: "Again, old values" })
    const notFw = await goalFor(me.id, { template_id: "cat:keep", title: "Catalogue goal" })
    const custom = await goalFor(me.id, { title: "Hand-made goal" })
    await goalFor(other.id, { template_id: "fw:again", title: "Their plan goal" })
    const notFwBefore = await oneGoal(notFw)
    const customBefore = await oneGoal(custom)
    const othersBefore = await goalsOf(other.id)
    actAs(me)

    const made = await saveFrameworkPlan(
      me.id,
      [
        { _tempId: "p", _tempParentId: null, title: "Plan parent", target_value: 10, template_id: "fw:again", goal_level: 0, period: "weekly", life_area: "health" },
        { _tempId: "c", _tempParentId: "p", title: "Plan child", target_value: 3, template_id: "fw:new", goal_level: 1, period: "daily", life_area: "health" },
      ],
      "UTC"
    )

    expect(made).toHaveLength(2)
    expect(await oneGoal(oldFw)).toMatchObject({ is_archived: true, is_active: false })
    expect(await oneGoal(sameKey)).toMatchObject({ is_archived: true, is_active: false })
    expect(await oneGoal(notFw)).toEqual(notFwBefore)
    expect(await oneGoal(custom)).toEqual(customBefore)
    expect(await goalsOf(other.id)).toEqual(othersBefore)

    const live = await asOwner((q) =>
      q(
        `select id, title, template_id, goal_level, period, target_value, life_area, parent_goal_id, is_archived
         from user_goals where user_id = $1 and template_id like 'fw:%' and not is_archived order by goal_level`,
        [me.id]
      )
    )
    expect(live).toEqual([
      expect.objectContaining({ title: "Plan parent", template_id: "fw:again", goal_level: 0, period: "weekly", target_value: 10, life_area: "health", parent_goal_id: null }),
      expect.objectContaining({ title: "Plan child", template_id: "fw:new", goal_level: 1, period: "daily", target_value: 3, life_area: "health", parent_goal_id: live[0].id }),
    ])
  })
})

describe("the archive of a period that is over", () => {
  it("snapshotGoals writes one row per goal with every number it was handed, and a re-run changes the same row", async () => {
    const me = await newUser("goal-snap")
    const other = await newUser("goal-snap-other")
    const done = await goalFor(me.id)
    const short = await goalFor(me.id)
    const theirs = await goalFor(other.id)
    await snapshotGoals(
      other.id,
      [{ id: theirs, current_value: 9, target_value: 9, milestone_config: null, current_streak: 1, best_streak: 1, period: "weekly" }],
      "2026-03-01"
    )
    const othersBefore = await snapshotsOf(other.id)

    const written = await snapshotGoals(
      me.id,
      [
        { id: done, current_value: 5, target_value: 5, milestone_config: null, current_streak: 3, best_streak: 7, period: "weekly" },
        { id: short, current_value: 1, target_value: 4, milestone_config: null, current_streak: 0, best_streak: 2, period: "daily" },
      ],
      "2026-03-01"
    )

    expect(written).toBe(2)
    const rows = await snapshotsOf(me.id)
    expect(rows).toHaveLength(2)
    expect(rows).toContainEqual({ goal_id: done, d: "2026-03-01", current_value: 5, target_value: 5, was_complete: true, current_streak: 3, best_streak: 7, period: "weekly" })
    expect(rows).toContainEqual({ goal_id: short, d: "2026-03-01", current_value: 1, target_value: 4, was_complete: false, current_streak: 0, best_streak: 2, period: "daily" })
    expect(await snapshotsOf(other.id)).toEqual(othersBefore)

    // Same day again with a new count: the one row is changed, not doubled.
    await snapshotGoals(
      me.id,
      [{ id: short, current_value: 4, target_value: 4, milestone_config: null, current_streak: 1, best_streak: 2, period: "daily" }],
      "2026-03-01"
    )
    const again = await snapshotsOf(me.id)
    expect(again).toHaveLength(2)
    expect(again).toContainEqual({ goal_id: short, d: "2026-03-01", current_value: 4, target_value: 4, was_complete: true, current_streak: 1, best_streak: 2, period: "daily" })
    expect(await snapshotsOf(other.id)).toEqual(othersBefore)
  })

  it("snapshotGoals with no goals writes nothing", async () => {
    const me = await newUser("goal-snap-empty")
    expect(await snapshotGoals(me.id, [], "2026-03-01")).toBe(0)
    expect(await snapshotsOf(me.id)).toEqual([])
  })
})
