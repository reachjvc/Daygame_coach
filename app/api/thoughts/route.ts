/**
 * Thought Frequencies: the page's whole read, and adding a thought.
 *
 * GET returns every live thought with its counts in the person's own day,
 * their settings, their timezone, and when a reminder last reached a phone.
 * POST adds a thought, or returns the one these words already are
 * (src/db/thoughtsRepo.ts, `createThought`). Plans/thought.md.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { createThought, lastDeliveredAt, readSettings, readThoughts } from "@/src/db/thoughtsRepo"
import { checkThoughtText, isUuid } from "@/src/thoughts/thoughtsService"
import type { ThoughtsView } from "@/src/thoughts/types"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const timezone = await getUserTimezone(auth.userId)
    const [thoughts, settings, delivered] = await Promise.all([
      readThoughts(auth.userId, timezone),
      readSettings(auth.userId),
      lastDeliveredAt(auth.userId),
    ])
    const view: ThoughtsView = { thoughts, settings, timezone, lastDeliveredAt: delivered }
    return NextResponse.json(view)
  } catch (error) {
    // Never the thought text: only the database's message reaches the log.
    console.error("[thoughts] read failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not read your thoughts" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  if (!body || !isUuid(body.id)) return NextResponse.json({ error: "A thought needs an id made on the device" }, { status: 400 })
  const text = checkThoughtText(body.text)
  if (!text.ok) return NextResponse.json({ error: text.error }, { status: 400 })

  try {
    return NextResponse.json(await createThought(auth.userId, body.id, text.value))
  } catch (error) {
    console.error("[thoughts] add failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not add the thought" }, { status: 500 })
  }
}
