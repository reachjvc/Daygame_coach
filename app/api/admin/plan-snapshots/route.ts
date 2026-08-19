import { NextResponse } from "next/server"
import { getPlanSnapshot, listPlanSnapshots } from "@/src/db/planSnapshotRepo"

/**
 * Read the plans people have written. Same admin gate as the other admin
 * routes: a secret in a HEADER, never a query string, so it cannot end up in a
 * browser history, a referrer or a server access log.
 */
export async function GET(req: Request) {
  const adminKey = req.headers.get("X-Admin-Key")
  if (!process.env.ADMIN_SECRET_KEY || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const clientId = params.get("clientId")

  try {
    if (clientId) {
      const snapshot = await getPlanSnapshot(clientId)
      if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(snapshot)
    }
    const limit = Number(params.get("limit") ?? 50)
    return NextResponse.json({ snapshots: await listPlanSnapshots(Number.isFinite(limit) ? limit : 50) })
  } catch (error) {
    console.error("[admin/plan-snapshots] read failed", error)
    return NextResponse.json({ error: "Could not read" }, { status: 500 })
  }
}
