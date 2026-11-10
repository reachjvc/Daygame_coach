/**
 * THE COUNCIL'S SETTINGS (Plans/role-models.md, Phase 12).
 *
 *   GET  `{ weekValue, weekOf, remindOn, remindHour, hasEnabledDevice }`, where
 *        `weekValue` is null unless it was chosen for the current week.
 *   PUT  `{ weekValue?: string | null, remindOn?: boolean, remindHour?: 7-21 }`,
 *        only those keys. A week value must be one you took from your council;
 *        choosing it ties it to this week. A same-origin JSON request only.
 *
 * The user is always the session's (`requireAuth`); the row is written with
 * their own client, so row security decides what is theirs.
 */

import { NextResponse } from "next/server"

import { requireAuth } from "@/src/db/auth"
import { listDevices } from "@/src/db/notificationsRepo"
import { readCouncil, readCouncilSettings, writeCouncilSettings } from "@/src/db/roleModelsRepo"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { readSettingsPatch, weekOf, weekValueFor } from "@/src/role-models/councilReminderService"
import { getTodayInTimezone } from "@/src/shared/dateUtils"

const NO_STORE = { "Cache-Control": "no-store" }
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE })

function fromAnotherSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site")
  return site !== null && site !== "same-origin" && site !== "none"
}

async function answer(userId: string) {
  const [settings, devices, tz] = await Promise.all([readCouncilSettings(userId), listDevices(userId), getUserTimezone(userId).catch(() => "UTC")])
  const today = getTodayInTimezone(tz)
  return NextResponse.json(
    { ...settings, weekValue: weekValueFor(settings, today), weekOf: weekOf(today), hasEnabledDevice: devices.some((d) => d.enabled) },
    { headers: NO_STORE },
  )
}

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  try {
    return await answer(auth.userId)
  } catch {
    return fail(500, "Could not read your council settings")
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  if (fromAnotherSite(req)) return fail(403, "Not from this site")
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail(415, "Send JSON")
  const patch = readSettingsPatch(await req.json().catch(() => null))
  if (!patch) return fail(400, "Only weekValue, remindOn and remindHour (7-21)")
  try {
    const write: Parameters<typeof writeCouncilSettings>[1] = { ...patch }
    if (typeof patch.weekValue === "string") {
      const taken = (await readCouncil(auth.userId)).flatMap((m) => m.takenValues)
      const own = taken.find((v) => v.toLowerCase() === patch.weekValue!.trim().toLowerCase())
      if (!own) return fail(400, "The value of the week must be one you took from your council")
      const tz = await getUserTimezone(auth.userId).catch(() => "UTC")
      write.weekValue = own
      write.weekOf = weekOf(getTodayInTimezone(tz))
    } else if (patch.weekValue === null) {
      write.weekOf = null
    }
    await writeCouncilSettings(auth.userId, write)
    return await answer(auth.userId)
  } catch {
    return fail(500, "Could not save your council settings")
  }
}
