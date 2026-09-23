/**
 * Your day, on your account: what you rated, ticked, noted and wrote.
 *
 * Its own route because the whole-plan save may never reach these four tables —
 * a plan is replaced, a day is appended to. GET hands back the four maps the
 * flow works in. PUT changes ONE day, and only the keys it carries.
 *
 * An id the plan has not saved yet is answered 409 with the list, so the
 * browser can save the plan and try once more. Dropping it quietly is how a
 * tick disappears with nothing on screen to say so.
 *
 * The thinking is in `lifePlanDayService` (pure) and `lifePlanDayRepo` (rows).
 * This file resolves who is asking and turns a refusal into a status code.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { findLifePlanId, ensureLifePlan } from "@/src/db/lifePlanRepo"
import { readDayRows, readNodeIds, saveDay } from "@/src/db/lifePlanDayRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { dayRowsToRecord, fitAsked, unknownIds, whyNotWritable } from "@/src/goals/lifePlanDayService"
import type { DayPatch } from "@/src/db/lifePlanDayTypes"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const planId = await findLifePlanId(auth.userId)
    // No plan is a real answer, and it is not an empty one: a GET must never
    // create the row a PUT would.
    if (!planId) return NextResponse.json({ daily: {}, logged: {}, notes: {}, journal: {} })
    const [rows, ids] = await Promise.all([readDayRows(auth.userId, planId), readNodeIds(auth.userId, planId)])
    const localIdFor = new Map([...ids].map(([local, id]) => [id, local]))
    return NextResponse.json(dayRowsToRecord(rows, localIdFor))
  } catch (error) {
    console.error("[life-plan/day] read failed", error)
    return NextResponse.json({ error: "Could not read your days" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  const patch = (await req.json().catch(() => null)) as DayPatch | null
  if (!patch || typeof patch.date !== "string") {
    return NextResponse.json({ error: "Send a day" }, { status: 400 })
  }
  try {
    // The account's calendar day, never the server's and never the browser's
    // unchecked word. A failure here is loud: a silent "UTC" would file a whole
    // day under the wrong date.
    const today = getTodayInTimezone(await getUserTimezone(auth.userId))
    const refusal = whyNotWritable(patch, today)
    if (refusal) return NextResponse.json({ error: refusal }, { status: 400 })

    const { id: planId } = await ensureLifePlan(auth.userId)
    const ids = await readNodeIds(auth.userId, planId)
    const unknown = unknownIds(patch, ids)
    if (unknown.length > 0) {
      return NextResponse.json({ error: "plan-behind", unknown }, { status: 409 })
    }
    await saveDay(auth.userId, planId, { ...patch, asked: fitAsked(patch.asked) }, ids)
    return NextResponse.json({ savedAt: patch.date })
  } catch (error) {
    console.error("[life-plan/day] save failed", error)
    return NextResponse.json({ error: "Could not save that day" }, { status: 500 })
  }
}
