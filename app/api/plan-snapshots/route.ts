import { NextResponse } from "next/server"
import { deletePlanSnapshot, savePlanSnapshot } from "@/src/db/planSnapshotRepo"
import { parseSnapshotRequest } from "@/src/goals/planSnapshotService"

/** Mirror one browser's Life Mastery plan. Unauthenticated by design; validated hard. */
export async function POST(req: Request) {
  const parsed = parseSnapshotRequest(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { clientId, plan, planText } = parsed.value
  try {
    const row = await savePlanSnapshot({
      client_id: clientId,
      plan,
      plan_text: planText,
      goal_count: plan.goals?.length ?? 0,
      area_count: plan.areas?.length ?? 0,
    })
    return NextResponse.json({ ok: true, revision: row.revision })
  } catch (error) {
    // Never echo the message back: it can carry column names and row contents.
    console.error("[plan-snapshots] save failed", error)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}

/** The page's own "delete mine". A browser can only ever delete its own id. */
export async function DELETE(req: Request) {
  const clientId = new URL(req.url).searchParams.get("clientId")
  const parsed = parseSnapshotRequest({ clientId, plan: { areas: [], goals: [] }, planText: "" })
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    await deletePlanSnapshot(parsed.value.clientId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[plan-snapshots] delete failed", error)
    return NextResponse.json({ error: "Could not delete" }, { status: 500 })
  }
}
