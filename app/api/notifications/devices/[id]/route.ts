/**
 * One of this person's devices: switch reminders (`enabled`) or the running
 * timer (`timerRunning`) on or off for it (PATCH), or remove it (DELETE).
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { removeDevice, setDeviceEnabled, setDeviceTimer } from "@/src/db/notificationsRepo"
import { afterResponse } from "@/src/shared/afterResponse"
import { isUuid } from "@/src/shared/ids"
import { announceCurrentTimer } from "@/src/timetrack/runningTimerService"

type RouteParams = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const { id } = await params
  const body = await req.json().catch(() => null)
  const enabled = typeof body?.enabled === "boolean" ? (body.enabled as boolean) : undefined
  const timerRunning = typeof body?.timerRunning === "boolean" ? (body.timerRunning as boolean) : undefined
  if (!isUuid(id) || (enabled === undefined && timerRunning === undefined)) {
    return NextResponse.json({ error: "Send on or off" }, { status: 400 })
  }

  try {
    const found = await Promise.all([
      enabled === undefined ? true : setDeviceEnabled(auth.userId, id, enabled),
      timerRunning === undefined ? true : setDeviceTimer(auth.userId, id, timerRunning),
    ])
    if (found.includes(false)) {
      return NextResponse.json({ error: "No such device" }, { status: 404 })
    }
    // switched on: whatever runs now appears at once, rather than at the next start
    if (timerRunning === true) afterResponse(() => announceCurrentTimer(auth.userId))
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
