/**
 * SAVE ANSWERS. PUT { slots: AuditAnswer[] } (1–200). Each is checked against
 * its own audit (`checkAnswer`); one bad answer refuses the whole send, so a
 * phone's queue never half-lands. The same quarter again replaces its answer.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { AuditRefused, readRuns, upsertSlots } from "@/src/db/auditRepo"
import { checkAnswer } from "@/src/audit/auditService"
import type { AuditAnswer } from "@/src/audit/types"

const AT_MOST = 200

export async function PUT(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const body = (await req.json().catch(() => null)) as { slots?: unknown } | null
  const raw = body?.slots
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > AT_MOST) {
    return NextResponse.json({ error: `Send 1 to ${AT_MOST} answers` }, { status: 400 })
  }

  try {
    const now = new Date()
    const runs = new Map((await readRuns(auth.userId)).map((r) => [r.id, r]))
    const answers: AuditAnswer[] = []
    const seen = new Set<string>()
    for (const item of raw) {
      const runId = (item as { runId?: unknown } | null)?.runId
      const run = typeof runId === "string" ? runs.get(runId) : undefined
      if (!run) return NextResponse.json({ error: "No such audit" }, { status: 404 })
      const checked = checkAnswer(item, run, now)
      if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 })
      const key = `${checked.answer.runId}:${checked.answer.slotAt}`
      if (seen.has(key)) return NextResponse.json({ error: "One answer per quarter" }, { status: 400 })
      seen.add(key)
      answers.push(checked.answer)
    }
    await upsertSlots(auth.userId, answers)
    return NextResponse.json({ stored: answers.length })
  } catch (error) {
    if (error instanceof AuditRefused) return NextResponse.json({ error: "The audit could not save that" }, { status: 400 })
    console.error("[audit] save failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not save your answers" }, { status: 500 })
  }
}
