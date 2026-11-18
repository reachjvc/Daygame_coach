/**
 * The Life Mastery plan, read and written.
 *
 * GET hands back the plan and the revision it was read at. PATCH sends only
 * what changed since then (`diffPlanRows`), quoting that revision, and a save
 * built on a stale one is REFUSED with 409 rather than merged — the page then
 * says so. Merging two devices' plans into a third thing neither person wrote
 * is the failure this exists to avoid.
 *
 * The day tables are not reachable from here; they get their own route.
 *
 * `?target=sandbox` acts on the signed-in account's hidden copy space instead
 * of the account itself (`src/db/planSandbox.ts`); no other value is accepted
 * and a user id never is.
 */

import { NextResponse } from "next/server"
import { requirePlanTarget } from "@/src/db/planSandbox"
import { applyLifePlanChanges, ensureLifePlan, readLifePlan, StalePlanError } from "@/src/db/lifePlanRepo"
import { findPlanBreach, limitMessage } from "@/src/goals/planLimits"
export async function GET(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response

  try {
    const stored = await readLifePlan(auth.userId, auth.supabase)
    // Null is a real answer: a new account has no plan and the flow starts
    // empty. It is NOT an empty plan, because the two must stay tellable apart.
    return NextResponse.json(stored ? { plan: stored.rows, revision: stored.revision } : { plan: null })
  } catch (error) {
    console.error("[life-plan] read failed", error)
    return NextResponse.json({ error: "Could not read your plan" }, { status: 500 })
  }
}

/** Save only what changed. The database refuses any table outside the plan. */
export async function PATCH(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  const changes = body?.changes
  if (
    !body || typeof body.revision !== "number" || !changes || typeof changes !== "object" ||
    typeof changes.plan_id !== "string" || !Array.isArray(changes.replace)
  ) {
    return NextResponse.json({ error: "Send the changes and the revision you read" }, { status: 400 })
  }

  // A text over its cap is refused here, by name, before the database's own
  // CHECK would answer 500 and the page would retry the same save for ever.
  const breach = findPlanBreach(changes)
  if (breach) return NextResponse.json({ error: limitMessage(breach), ...breach }, { status: 422 })

  try {
    const revision = await applyLifePlanChanges(changes, body.revision, auth.userId, auth.supabase)
    return NextResponse.json({ revision })
  } catch (error) {
    if (error instanceof StalePlanError) {
      return NextResponse.json({ error: error.message, revision: error.revision }, { status: 409 })
    }
    console.error("[life-plan] change save failed", error)
    return NextResponse.json({ error: "Could not save your plan" }, { status: 500 })
  }
}

/** Start a plan for an account that has none, so the flow has an id to save against. */
export async function POST(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response

  try {
    return NextResponse.json(await ensureLifePlan(auth.userId, auth.supabase))
  } catch (error) {
    console.error("[life-plan] start failed", error)
    return NextResponse.json({ error: "Could not start your plan" }, { status: 500 })
  }
}
