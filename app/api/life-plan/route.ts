/**
 * The Life Mastery plan, read and written.
 *
 * GET hands back the plan and the revision it was read at. PATCH sends only
 * what changed since then (`diffPlanRows`), quoting that revision, and a save
 * built on a stale one is REFUSED with 409 rather than merged — the page then
 * says so. Merging two devices' plans into a third thing neither person wrote
 * is the failure this exists to avoid.
 *
 * PUT, THE WHOLE-PLAN SAVE, IS REFUSED (Phase 4 of Plans/life-plan-rebuild.md).
 * The flow stopped calling it in Phase 1. It deletes every row its payload
 * leaves out, so a page that loaded before an update — and does not know a
 * part the update added — wiped that part on its next save, and since Q5 the
 * read leaves the old habit rows out, so any whole-plan save would delete them
 * all. Only a page running old code can still send it; it is told to reload.
 *
 * The day tables are not reachable from here; they get their own route.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { applyLifePlanChanges, ensureLifePlan, readLifePlan, StalePlanError } from "@/src/db/lifePlanRepo"
export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const stored = await readLifePlan(auth.userId)
    // Null is a real answer: a new account has no plan and the flow starts
    // empty. It is NOT an empty plan, because the two must stay tellable apart.
    return NextResponse.json(stored ? { plan: stored.rows, revision: stored.revision, goalLinks: stored.goalLinks } : { plan: null })
  } catch (error) {
    console.error("[life-plan] read failed", error)
    return NextResponse.json({ error: "Could not read your plan" }, { status: 500 })
  }
}

export async function PUT() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  return NextResponse.json(
    { error: "This page is out of date and cannot save. Reload it, and your last change will need making again." },
    { status: 410 },
  )
}

/** Save only what changed. The database refuses any table outside the plan. */
export async function PATCH(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  const changes = body?.changes
  if (
    !body || typeof body.revision !== "number" || !changes || typeof changes !== "object" ||
    typeof changes.plan_id !== "string" || !Array.isArray(changes.replace)
  ) {
    return NextResponse.json({ error: "Send the changes and the revision you read" }, { status: 400 })
  }

  try {
    const revision = await applyLifePlanChanges(changes, body.revision, auth.userId)
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
export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    return NextResponse.json(await ensureLifePlan(auth.userId))
  } catch (error) {
    console.error("[life-plan] start failed", error)
    return NextResponse.json({ error: "Could not start your plan" }, { status: 500 })
  }
}
