/**
 * START A TWO-WEEK AUDIT. POST {id}: the id is made on the phone, so pressing
 * Start twice starts one audit. 409 while another audit is still open.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { AuditRefused, startAuditRun } from "@/src/db/auditRepo"
import { isUuid } from "@/src/shared/ids"

export async function POST(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null
  if (!isUuid(body?.id)) return NextResponse.json({ error: "Send an id" }, { status: 400 })
  try {
    const run = await startAuditRun(auth.userId, { id: body.id, startedAt: new Date() })
    return NextResponse.json({ run })
  } catch (error) {
    if (error instanceof AuditRefused) return NextResponse.json({ error: "An audit is already running" }, { status: 409 })
    console.error("[audit] start failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not start the audit" }, { status: 500 })
  }
}
