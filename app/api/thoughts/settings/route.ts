/**
 * Save the person's reminder settings, then move the next reminder to match
 * (src/thoughts/promptService.ts). Returns when the next one is due, so the
 * page can say "next in 9 min" without a second read.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { readSettings, writeSettings } from "@/src/db/thoughtsRepo"
import { checkSettings } from "@/src/thoughts/thoughtsService"
import { reschedulePrompts } from "@/src/thoughts/promptService"

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const checked = checkSettings(await req.json().catch(() => null))
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

  try {
    const before = await readSettings(auth.userId)
    await writeSettings(auth.userId, checked.value)
    const next = await reschedulePrompts(auth.userId, { switchedOn: !before.remindersOn && checked.value.remindersOn })
    return NextResponse.json({ settings: checked.value, nextDueAt: next?.toISOString() ?? null })
  } catch (error) {
    console.error("[thoughts] settings save failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not save your reminder settings" }, { status: 500 })
  }
}
