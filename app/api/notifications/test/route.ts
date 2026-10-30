/**
 * A TEST REMINDER, NOW, to every switched-on device of this person — the
 * proof, the moment reminders are turned on, that they arrive. Looks like a
 * real one and opens the same sheet, but is recorded as a test, so it is never
 * counted as a reminder that went unanswered.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { PushNotConfigured, sendToPerson } from "@/src/notifications/pushService"
import { promptUrl } from "@/src/thoughts/promptService"

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const sent = await sendToPerson(auth.userId, "test", () => ({
      title: "Reminders are on",
      body: "This is how a reminder looks. Tap it to log a thought.",
      url: promptUrl(null),
      tag: "thought-prompt",
    }))
    if (sent.devices === 0) {
      return NextResponse.json({ error: "Turn reminders on for this device first" }, { status: 409 })
    }
    return NextResponse.json({ devices: sent.devices, delivered: sent.delivered, removed: sent.removed })
  } catch (error) {
    if (error instanceof PushNotConfigured) return NextResponse.json({ error: error.message }, { status: 503 })
    console.error("[notifications] test failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not send a test reminder" }, { status: 500 })
  }
}
