/**
 * THE WEEKLY REVIEW REMINDER'S SETTINGS (Plans/life-plan-after-setup.md, Phase 5).
 *
 *   GET  the signed-in person's reminder, plus whether any of their devices has
 *        reminders on (`hasEnabledDevice`).
 *   PUT  `{ pushOn?: boolean, reviewDay?: 1-7, reviewHour?: 6-22 }`, only those
 *        keys; anything else is a 400. A same-origin JSON request only.
 *
 * The user is always the session's (`requireAuth`); the row is written with
 * their own client, so row security decides what is theirs.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { readReminder, writeReminder } from "@/src/db/lifePlanRemindersRepo"
import { readReminderPatch } from "@/src/goals/reviewReminderService"
import { listDevices } from "@/src/db/notificationsRepo"

const NO_STORE = { "Cache-Control": "no-store" }

function fromAnotherSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site")
  return site !== null && site !== "same-origin" && site !== "none"
}

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const [reminder, devices] = await Promise.all([readReminder(auth.userId), listDevices(auth.userId)])
    return NextResponse.json({ ...reminder, hasEnabledDevice: devices.some((d) => d.enabled) }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: "Could not read your reminder" }, { status: 500, headers: NO_STORE })
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  if (fromAnotherSite(req)) return NextResponse.json({ error: "Not from this site" }, { status: 403, headers: NO_STORE })
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send JSON" }, { status: 415, headers: NO_STORE })
  }
  const patch = readReminderPatch(await req.json().catch(() => null))
  if (!patch) return NextResponse.json({ error: "Only pushOn, reviewDay (1-7) and reviewHour (6-22)" }, { status: 400, headers: NO_STORE })
  try {
    await writeReminder(auth.userId, patch)
    return NextResponse.json(await readReminder(auth.userId), { headers: NO_STORE })
  } catch {
    return NextResponse.json({ error: "Could not save your reminder" }, { status: 500, headers: NO_STORE })
  }
}
