/**
 * A TEST NOTIFICATION, NOW, to every switched-on device of this person — the
 * proof, the moment pings are turned on, that they arrive. Recorded as a test,
 * so it is never counted as a ping that went unanswered. Neutral words, so any
 * feature can use it.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { ROUTES } from "@/src/shared/routes"
import { PushNotConfigured, sendToPerson } from "@/src/notifications/pushService"

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const sent = await sendToPerson(auth.userId, "test", () => ({
      title: "Test notification",
      body: "Pings will look like this.",
      url: ROUTES.settings,
      tag: "test",
    }))
    if (sent.devices === 0) {
      return NextResponse.json({ error: "Turn notifications on for this device first" }, { status: 409 })
    }
    return NextResponse.json({ devices: sent.devices, delivered: sent.delivered, removed: sent.removed })
  } catch (error) {
    if (error instanceof PushNotConfigured) return NextResponse.json({ error: error.message }, { status: 503 })
    console.error("[notifications] test failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not send a test notification" }, { status: 500 })
  }
}
