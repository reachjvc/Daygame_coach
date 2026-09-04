import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { goalAchievementsView, goalBelongsTo } from "@/src/goals/goalAchievementsService"
import { setGoalTotalTile } from "@/src/tracking/dashboardService"

type RouteParams = { params: Promise<{ id: string }> }
const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

/** What this goal has earned, and the running total that never resets. */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const view = await goalAchievementsView(auth.userId, (await params).id)
    return view ? NextResponse.json(view) : err("Goal not found", 404)
  } catch (e) {
    console.error("Error reading goal achievements:", e)
    return err("Failed to read this goal's achievements")
  }
}

/** Pin this goal's running total to the tracking page, or unpin it. */
export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const goalId = (await params).id
    const body = await request.json().catch(() => ({}))
    if (typeof body.totalPinned !== "boolean") return err("totalPinned must be true or false", 400)
    if (!(await goalBelongsTo(auth.userId, goalId))) return err("Goal not found", 404)

    await setGoalTotalTile(auth.userId, goalId, body.totalPinned)
    return NextResponse.json({ totalPinned: body.totalPinned })
  } catch (e) {
    // A full dashboard is a bad request, not a server fault, and the message says which.
    const message = e instanceof Error ? e.message : "Could not change that"
    if (/full/i.test(message)) return err(message, 400)
    console.error("Error pinning goal total:", e)
    return err("Could not change that")
  }
}
