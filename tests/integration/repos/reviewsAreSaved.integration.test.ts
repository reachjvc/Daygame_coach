import { describe, it, expect, vi } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, asUser, newUser } from "@/tests/db/harness"
import { applyLifePlanChanges, ensureLifePlan, readLifePlan } from "@/src/db/lifePlanRepo"
import { planToRows, rowsToPlan } from "@/src/goals/lifePlanMapper"
import { diffPlanRows } from "@/src/goals/lifePlanDiff"
import { emptyNsPlan, setAreaReview } from "@/src/goals/northStarService"
import { periodOf, writeReview } from "@/src/goals/reviewService"
import type { PlanRows } from "@/src/db/lifePlanTypes"
import type { NsPlan } from "@/src/goals/types"

/**
 * REVIEWS (Plans/life-plan-rebuild.md, Phase 5), against the real database:
 *
 *   1. a review written in the app is saved by the change-only save and read
 *      back the same, and one emptied again is gone, scores and all;
 *   2. THE COPY (migration 20261104180000) turns the Your 10s "last two weeks"
 *      scores into a first review, once;
 *   3. another account can neither read a review nor hang a score on one.
 */

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const NOW = "2026-11-04T12:00:00.000Z"
const TODAY = "2026-11-04"
const MIGRATION = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20261104180000_reviews.sql"), "utf8")

/**
 * The migration's copy and nothing else of it, for one person's plan only.
 * Run whole, the migration re-takes a lock on every plan part and reloads the
 * API's schema, and its loop walks every plan in the shared test database:
 * both under other test files' feet while they run.
 */
function copyFor(userId: string): string {
  const from = MIGRATION.indexOf("-- ---------------------------------------------------------------- the copy")
  const to = MIGRATION.indexOf("NOTIFY pgrst")
  expect(from).toBeGreaterThan(0)
  expect(to).toBeGreaterThan(from)
  const copy = MIGRATION.slice(from, to)
  const loop = "FOR p IN SELECT id, user_id, created_at FROM life_plans LOOP"
  expect(copy).toContain(loop)
  return copy.replace(loop, `FOR p IN SELECT id, user_id, created_at FROM life_plans WHERE user_id = '${userId}' LOOP`)
}

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

  it("starts from the Your 10s scores, copied in once as the first review", async () => {
    const { user, planId, rows } = await personWithPlan("reviews-copied")
    let plan = setAreaReview(emptyNsPlan(), "lm_health", { fortnight: 2 }, NOW)
    plan = setAreaReview(plan, "lm_friends", { fortnight: 8 }, NOW)
    plan = setAreaReview(plan, "lm_money", { ten: "No debt." }, NOW)
    await applyLifePlanChanges(diffPlanRows(null, rows(plan)), 0, user.id)
    const made = String((await asOwner((q) => q(`select (created_at at time zone 'UTC')::date::text as d from life_plans where id = $1`, [planId])))[0].d)

    await asOwner((q) => q(copyFor(user.id)))
    const copied = rowsToPlan((await readLifePlan(user.id))!.rows)!
    expect(copied.reviews).toHaveLength(1)
    const [first] = copied.reviews
    expect(first).toMatchObject({ cadence: "fortnight", periodEnd: made, writtenOn: made, scores: { lm_health: 2, lm_friends: 8 } })
    expect(first.id).toBe(`fortnight-${first.periodStart}`)
    // Your 10s keeps its own numbers.
    expect(copied.review.lm_health.fortnight).toBe(2)

    await asOwner((q) => q(copyFor(user.id)))
    expect(await count("life_plan_reviews", user.id)).toBe(1)
    expect(await count("life_plan_review_scores", user.id)).toBe(2)
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
})
