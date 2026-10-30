/** One of this person's devices: switch reminders on or off for it (PATCH), or remove it (DELETE). */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { removeDevice, setDeviceEnabled } from "@/src/db/notificationsRepo"
import { isUuid } from "@/src/thoughts/thoughtsService"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!isUuid(id) || typeof body?.enabled !== "boolean") return NextResponse.json({ error: "Send on or off" }, { status: 400 })

  try {
    if (!(await setDeviceEnabled(auth.userId, id, body.enabled))) {
      return NextResponse.json({ error: "No such device" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[notifications] device change failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not change the device" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ ok: true })

  try {
    await removeDevice(auth.userId, { id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[notifications] device remove failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not remove the device" }, { status: 500 })
  }
}
