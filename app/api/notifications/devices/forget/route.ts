/**
 * SIGNING OUT: this browser stops receiving this person's reminders.
 *
 * Called by both Log Out buttons before the session ends
 * (src/shared/offlineCopies.ts), with the browser's own address, because by
 * then the page does not know the device's id. Only a row registered to the
 * signed-in person is removed.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { removeDevice } from "@/src/db/notificationsRepo"

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const body = await req.json().catch(() => null)
  if (typeof body?.endpoint !== "string" || body.endpoint.length > 1000) {
    return NextResponse.json({ error: "Send this browser's address" }, { status: 400 })
  }

  try {
    await removeDevice(auth.userId, { endpoint: body.endpoint })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[notifications] forget failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not remove this device" }, { status: 500 })
  }
}
