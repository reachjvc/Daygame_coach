/**
 * WHICH COUNTED GOAL A PLAN GOAL BECAME.
 *
 * Its own route because the link is its own fact with its own lifetime: the
 * push makes it, the whole-plan save may never touch it (`saveLifePlan` strips
 * `user_goal_id` before sending), and the two must not be able to race each
 * other through one code path.
 *
 * WHY IT EXISTS AT ALL. The link used to live in the goal's TAG —
 * `ns:<run>:<goal>`, where `<run>` is a code minted in one browser's
 * localStorage. On a second device the run differs, every pushed goal reads as
 * never pushed, and pressing push makes a second copy of all fifty. The tag is
 * still written, because the goals screen needs a prefix to group by; it is no
 * longer read for identity.
 *
 * The browser sends its own plan ids and never a UUID, the same as the day
 * route: resolving them is the server's job.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { findLifePlanId, linkPlanGoal } from "@/src/db/lifePlanRepo"
import { readNodeIds } from "@/src/db/lifePlanDayRepo"

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = (await req.json().catch(() => null)) as { links?: Record<string, string | null> } | null
  if (!body?.links || typeof body.links !== "object") {
    return NextResponse.json({ error: "Send the links" }, { status: 400 })
  }

  try {
    const planId = await findLifePlanId(auth.userId)
    // No plan means nothing to link to. A push cannot have happened without
    // one, so this is a stale client rather than an error worth 500ing over.
    if (!planId) return NextResponse.json({ linked: 0 })

    const ids = await readNodeIds(auth.userId, planId)
    const unknown = Object.keys(body.links).filter((local) => !ids.has(local))
    if (unknown.length > 0) {
      return NextResponse.json({ error: "plan-behind", unknown }, { status: 409 })
    }

    for (const [local, userGoalId] of Object.entries(body.links)) {
      await linkPlanGoal(auth.userId, ids.get(local)!, userGoalId)
    }
    return NextResponse.json({ linked: Object.keys(body.links).length })
  } catch (error) {
    console.error("[life-plan/goal-link] failed", error)
    return NextResponse.json({ error: "Could not link your goals" }, { status: 500 })
  }
}
