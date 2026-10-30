/**
 * "It happened": one log or a batch (a phone catching up after no signal).
 *
 * Each log carries an id the device made, so a retry is stored once (R5).
 * Logging restarts the wait for the next reminder (Q17); a failure to
 * reschedule is logged and does not fail the tap, which is already saved.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { insertLogs } from "@/src/db/thoughtsRepo"
import { checkLogInput } from "@/src/thoughts/thoughtsService"
import { reschedulePrompts } from "@/src/thoughts/promptService"
import type { LogInput } from "@/src/thoughts/types"

const MAX_BATCH = 500

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const body = await req.json().catch(() => null)
  const raw: unknown[] | null = Array.isArray(body?.logs) ? body.logs : null
  if (!raw || raw.length === 0) return NextResponse.json({ error: "Send what you logged" }, { status: 400 })
  if (raw.length > MAX_BATCH) return NextResponse.json({ error: `At most ${MAX_BATCH} at once` }, { status: 400 })

  const now = new Date()
  const logs: LogInput[] = []
  const refused: { id: unknown; error: string }[] = []
  for (const item of raw) {
    const checked = checkLogInput(item, now)
    if (checked.ok) logs.push(checked.value)
    else refused.push({ id: (item as { id?: unknown } | null)?.id ?? null, error: checked.error })
  }

  try {
    const result = await insertLogs(auth.userId, logs)
    if (result.stored > 0) {
      await reschedulePrompts(auth.userId).catch((error) =>
        console.error("[thoughts] reschedule after a log failed", error instanceof Error ? error.message : "unknown"),
      )
    }
    return NextResponse.json({ ...result, refused })
  } catch (error) {
    console.error("[thoughts] log failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not save what you logged" }, { status: 500 })
  }
}
