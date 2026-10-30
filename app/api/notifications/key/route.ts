/**
 * The public key a browser subscribes with. Not a secret (every subscribing
 * browser holds it), but served only to a signed-in person, because nobody
 * else has a reason to subscribe. 503 when the vault holds no keys yet.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { pushKeys } from "@/src/notifications/pushService"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const keys = await pushKeys()
  if (!keys) return NextResponse.json({ error: "Reminders are not set up on this server yet" }, { status: 503 })
  return NextResponse.json({ publicKey: keys.publicKey })
}
