/**
 * This person's devices: list them (GET), or register this browser (POST).
 *
 * POST `intent`:
 *   "enable"  — the person tapped "Turn on": register it, switched on. If the
 *               browser was someone else's device, it becomes theirs.
 *   "refresh" — the page opened with notifications already allowed: update the
 *               keys of a device already registered to this person, without
 *               touching whether it is on (they may have switched it off). If
 *               it was someone else's, it moves here SWITCHED OFF, so a new
 *               person on a shared browser is not sent reminders they never
 *               asked for and the previous person stops getting theirs here.
 *               A browser with no row is not registered: they removed it.
 *               With `oldEndpoint` (the worker, after the browser replaced the
 *               address), the row with the old address moves to the new one.
 *
 * The address is checked against the known push services first
 * (src/notifications/endpoints.ts): the server will POST to it.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { deviceByEndpoint, listDevices, moveDevice, registerDevice } from "@/src/db/notificationsRepo"
import { readSubscription } from "@/src/notifications/endpoints"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    return NextResponse.json({ devices: await listDevices(auth.userId) })
  } catch (error) {
    console.error("[notifications] devices read failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not read your devices" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  const sub = readSubscription(body?.subscription)
  if (!sub) return NextResponse.json({ error: "This browser's notification address is not one we can send to" }, { status: 400 })
  const label = typeof body?.label === "string" ? body.label.slice(0, 80) : ""

  try {
    if (body?.intent !== "refresh") {
      return NextResponse.json({ id: await registerDevice(auth.userId, { ...sub, label }, true), enabled: true })
    }
    // The worker reports a replaced address with the old one, so the row can follow it.
    if (typeof body?.oldEndpoint === "string" && body.oldEndpoint !== sub.endpoint) {
      if (await moveDevice(auth.userId, body.oldEndpoint, sub)) {
        const moved = await deviceByEndpoint(sub.endpoint)
        return NextResponse.json({ id: moved?.id ?? null, enabled: moved?.enabled ?? false })
      }
    }
    const existing = await deviceByEndpoint(sub.endpoint)
    if (!existing) return NextResponse.json({ id: null, enabled: false })
    const enabled = existing.userId === auth.userId ? existing.enabled : false
    return NextResponse.json({ id: await registerDevice(auth.userId, { ...sub, label }, enabled), enabled })
  } catch (error) {
    console.error("[notifications] register failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not register this device" }, { status: 500 })
  }
}
