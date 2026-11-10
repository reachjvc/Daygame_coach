import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, asUser, newUser } from "@/tests/db/harness"
import { applyLifePlanChanges, ensureLifePlan, readLifePlan } from "@/src/db/lifePlanRepo"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import { diffPlanRows } from "@/src/goals/lifePlanDiff"
import { addGoal, emptyNsPlan, removeGoal } from "@/src/goals/northStarService"
import { periodOf, writeReview } from "@/src/goals/reviewService"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import type { NsPlan } from "@/src/goals/types"

/**
 * REVIEWS (Plans/life-plan-rebuild.md, Phase 5), against the real database:
 *
 *   1. a review written in the app is saved by the change-only save and read
 *      back the same, and one emptied again is gone, scores and all;
 *   2. another account can neither read a review nor hang a score on one.
 */

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const NOW = "2026-11-04T12:00:00.000Z"
const TODAY = "2026-11-04"
async function personWithPlan(label: string) {
  const user = await newUser(label)
  actAs(user)
  const { id: planId } = await ensureLifePlan(user.id)
  const minted = new Map<string, string>()
  const rows = (plan: NsPlan): PlanRows =>
    planToRows(plan, {
      planId,
      userId: user.id,
      idFor: (local) => minted.get(local) ?? minted.set(local, randomUUID()).get(local)!,
    })
  return { user, planId, rows, minted }
}

const count = (table: string, userId: string) =>
  asOwner(async (q) => Number((await q(`select count(*) from ${table} where user_id = $1`, [userId]))[0].count))

describe("a review", () => {
  it("is saved, read back the same, and gone with its scores once emptied", async () => {
    const { user, rows } = await personWithPlan("reviews-saved")
    const week = periodOf("week", TODAY)
    let plan = writeReview(emptyNsPlan(), week, { score: { areaId: "lm_health", value: 6 } }, TODAY, NOW)
    plan = writeReview(plan, week, { score: { areaId: "lm_money", value: 0 } }, TODAY, NOW)
    plan = writeReview(plan, week, { magicMoments: "The long walk on Sunday & the call." }, TODAY, NOW)
    plan = writeReview(plan, periodOf("year", TODAY), { nextOutcomes: "Move to the coast." }, TODAY, NOW)
    const first = rows(plan)
    let revision = await applyLifePlanChanges(diffPlanRows(null, first), 0, user.id)

    const read = (await readLifePlan(user.id))!
    expect(rowsToPlan(read.rows)!.reviews).toEqual(plan.reviews)
    expect(await count("life_plan_review_scores", user.id)).toBe(2)
    // Each score keeps the day it was given (20261105160000), which Your 10s ranks by.
    expect(read.rows.review_scores.map((s) => s.scored_on)).toEqual([TODAY, TODAY])

    // Taking every score and word out of the week deletes it, and only it.
    let emptied = writeReview(plan, week, { score: { areaId: "lm_health", value: null } }, TODAY, NOW)
    emptied = writeReview(emptied, week, { score: { areaId: "lm_money", value: null } }, TODAY, NOW)
    emptied = writeReview(emptied, week, { magicMoments: "" }, TODAY, NOW)
    revision = await applyLifePlanChanges(diffPlanRows(first, rows(emptied)), revision, user.id)
    expect(revision).toBe(2)
    const after = rowsToPlan((await readLifePlan(user.id))!.rows)!
    expect(after.reviews.map((r) => r.id)).toEqual(["year-2026-01-01"])
    expect(await count("life_plan_review_scores", user.id)).toBe(0)
    const reviewNodes = await asOwner((q) => q(`select local_id from life_plan_nodes where user_id = $1 and kind = 'review'`, [user.id]))
    expect(reviewNodes.map((n) => n.local_id)).toEqual(["review:year-2026-01-01"])
  })

  it("is its owner's alone", async () => {
    const owner = await personWithPlan("reviews-owner")
    const plan = writeReview(emptyNsPlan(), periodOf("week", TODAY), { score: { areaId: "lm_health", value: 6 } }, TODAY, NOW)
    const saved = owner.rows(plan)
    await applyLifePlanChanges(diffPlanRows(null, saved), 0, owner.user.id)
    const reviewId = saved.reviews[0].id

    const other = await personWithPlan("reviews-other")
    const otherRows = other.rows(emptyNsPlan())
    await applyLifePlanChanges(diffPlanRows(null, otherRows), 0, other.user.id)

    // Neither the review nor its score can be read…
    const seen = await asUser(other.user.id, async (q) => [
      ...(await q(`select id from life_plan_reviews where id = $1`, [reviewId])),
      ...(await q(`select review_id from life_plan_review_scores where review_id = $1`, [reviewId])),
    ])
    expect(seen).toEqual([])
    // …nor can a score of theirs be hung on it.
    await expect(
      asUser(other.user.id, (q) =>
        q(`insert into life_plan_review_scores (user_id, review_id, area_id, score) values ($1, $2, $3, 5)`, [
          other.user.id, reviewId, otherRows.areas[0].id,
        ]),
      ),
    ).rejects.toThrow(/life_plan_review_scores_review_fk/)
    expect(await count("life_plan_review_scores", owner.user.id)).toBe(1)
  })

  /**
   * THE ANSWER PER GOAL (20261105170000; Plans/life-plan-review-reads-back.md):
   * saved with the review and read back the same, gone with its goal, and
   * nobody else's to read or to hang on someone's review.
   */
  it("keeps an answer per goal, its owner's alone", async () => {
    const owner = await personWithPlan("review-goals-owner")
    let plan = addGoal(emptyNsPlan(), "lm_fitness", "Gym", "habit_ramp", NOW)
    plan = writeReview(plan, periodOf("week", TODAY), { verdict: { goalId: plan.goals[0].id, value: "behind" } }, TODAY, NOW)
    const saved = owner.rows(plan)
    let revision = await applyLifePlanChanges(diffPlanRows(null, saved), 0, owner.user.id)
    const read = (await readLifePlan(owner.user.id))!
    expect(read.rows.review_goals).toEqual([expect.objectContaining({ verdict: "behind" })])
    expect(rowsToPlan(read.rows)!.reviews).toEqual(plan.reviews)

    const other = await personWithPlan("review-goals-other")
    const otherPlan = addGoal(emptyNsPlan(), "lm_fitness", "Their gym", "habit_ramp", NOW)
    const otherRows = other.rows(otherPlan)
    await applyLifePlanChanges(diffPlanRows(null, otherRows), 0, other.user.id)
    const reviewId = saved.reviews[0].id
    expect(await asUser(other.user.id, (q) => q(`select review_id from life_plan_review_goals where review_id = $1`, [reviewId]))).toEqual([])
    await expect(
      asUser(other.user.id, (q) =>
        q(`insert into life_plan_review_goals (user_id, review_id, goal_id, verdict) values ($1, $2, $3, 'on_track')`, [
          other.user.id, reviewId, otherRows.goals[0].id,
        ]),
      ),
    ).rejects.toThrow(/life_plan_review_goals_review_fk/)

    // Removing the goal takes its answer, and the review with nothing left in it.
    actAs(owner.user)
    revision = await applyLifePlanChanges(diffPlanRows(saved, owner.rows(removeGoal(plan, plan.goals[0].id, NOW))), revision, owner.user.id)
    expect(revision).toBe(2)
    expect(await count("life_plan_review_goals", owner.user.id)).toBe(0)
    expect(await count("life_plan_reviews", owner.user.id)).toBe(0)
  })
})
