/**
 * SAVE ANSWERS. PUT { slots: AuditAnswer[] } (1–200). Each is checked against
 * its own audit (`checkAnswer`). The same quarter again replaces its answer,
 * but only the answer the card saw (`was`): one another device gave or changed
 * since is kept, and comes back in `refused` with `stored` (null: deleted on
 * another device), for the person to choose (alpha slow-pass-06,
 * `splitByStored`, then `writeSlotsOverSeen`, which checks it in the same
 * database step as the write).
 *
 * ONE BAD ANSWER NEVER COSTS THE OTHERS. The good ones are stored and the bad
 * ones come back in `refused`, each with `retry`: true when it may pass later
 * (a quarter the phone thinks has ended but the server's clock has not reached
 * yet), false when it never can (the audit was ended on another device before
 * that quarter). It used to refuse the whole send, and the phone then dropped
 * every answer in it for good (code review, 2026-11-09).
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { answeredTimes, AuditRefused, readRuns, upsertSlots, writeSlotsOverSeen } from "@/src/db/auditRepo"
import { checkAnswer, correctedTime, NOT_STARTED, refusalFor, splitByStored } from "@/src/audit/auditService"
import { refuseCrossSite } from "@/src/audit/requestGuard"
import type { AuditAnswer } from "@/src/audit/types"

const AT_MOST = 200

export async function PUT(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const crossSite = refuseCrossSite(req)
  if (crossSite) return crossSite
  const body = (await req.json().catch(() => null)) as { slots?: unknown; sentAt?: unknown } | null
  const raw = body?.slots
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > AT_MOST) {
    return NextResponse.json({ error: `Send 1 to ${AT_MOST} answers` }, { status: 400 })
  }

  try {
    const now = new Date()
    const runs = new Map((await readRuns(auth.userId)).map((r) => [r.id, r]))
    const answers: AuditAnswer[] = []
    const refused: { id: unknown; error: string; retry: boolean }[] = []
    const byQuarter = new Map<string, number>()
    for (const item of raw) {
      const id = (item as { id?: unknown } | null)?.id
      const runId = (item as { runId?: unknown } | null)?.runId
      const run = typeof runId === "string" ? runs.get(runId) : undefined
      if (!run) {
        refused.push({ id, error: "No such audit", retry: false })
        continue
      }
      const checked = checkAnswer(item, run, now)
      if ("error" in checked) {
        refused.push({ id, error: checked.error, retry: checked.error === NOT_STARTED })
        continue
      }
      checked.answer.answeredAt = new Date(correctedTime((item as { answeredAt?: unknown }).answeredAt, body?.sentAt, now)).toISOString()
      // One answer per quarter in a send: the later one wins, as it would on screen.
      const key = `${checked.answer.runId}:${checked.answer.slotAt}`
      const earlier = byQuarter.get(key)
      if (earlier !== undefined) answers[earlier] = checked.answer
      else {
        byQuarter.set(key, answers.length)
        answers.push(checked.answer)
      }
    }
    // An answer older than the one stored for its quarter came from a phone that
    // was offline while another device answered: the newer one stays.
    // The same answer sent twice is stored, not refused as older (`splitByStored`).
    const split = splitByStored(answers, await answeredTimes(auth.userId, answers))
    refused.push(...split.refused)
    // Answers queued before `was` existed keep the clock rule; the rest are
    // written only over what their card saw, checked by the database itself.
    await upsertSlots(auth.userId, split.fresh.filter((a) => a.was === undefined))
    const written = await writeSlotsOverSeen(auth.userId, split.fresh.filter((a) => a.was !== undefined))
    let stored = split.fresh.length - written.missed.length + split.alreadyStored.length
    for (const { answer, held } of written.missed) {
      const r = refusalFor(answer, held)
      if (r) refused.push(r)
      else stored += 1
    }
    return NextResponse.json({ stored, refused })
  } catch (error) {
    if (error instanceof AuditRefused) return NextResponse.json({ error: "The audit could not save that" }, { status: 400 })
    console.error("[audit] save failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not save your answers" }, { status: 500 })
  }
}
