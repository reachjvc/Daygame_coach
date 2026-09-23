/**
 * The Life Mastery plan, read and written.
 *
 * GET hands back the plan and the revision it was read at. PUT sends the whole
 * plan quoting that revision, and a save built on a stale one is REFUSED with
 * 409 rather than merged — the page then says so. Merging two devices' plans
 * into a third thing neither person wrote is the failure this exists to avoid.
 *
 * The day tables are not reachable from here; they get their own route.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { ensureLifePlan, readLifePlan, saveLifePlan, StalePlanError } from "@/src/db/lifePlanRepo"
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

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object" || typeof body.revision !== "number" || !body.plan) {
    return NextResponse.json({ error: "Send a plan and the revision you read" }, { status: 400 })
  }
  // The owner is stamped by the repo, from the session — never taken from
  // the body, and never only at the top level.

  try {
    const revision = await saveLifePlan(body.plan, body.revision, auth.userId)
    return NextResponse.json({ revision })
  } catch (error) {
    if (error instanceof StalePlanError) {
      return NextResponse.json({ error: error.message, revision: error.revision }, { status: 409 })
    }
    console.error("[life-plan] save failed", error)
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
