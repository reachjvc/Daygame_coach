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
 *
 * `?target=sandbox` acts on the hidden copy space's own rows (`src/db/planSandbox.ts`),
 * the same way the plan and day routes do; with no target it is the session's own.
 * The copy space's reminder stays off: a `remindOn` sent there is dropped.
 */

import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { requirePlanTarget } from "@/src/db/planSandbox"
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

async function answer(userId: string, ownerId: string, client: SupabaseClient) {
  const [settings, devices, tz] = await Promise.all([readCouncilSettings(userId, client), listDevices(userId), getUserTimezone(ownerId).catch(() => "UTC")])
  const today = getTodayInTimezone(tz)
  return NextResponse.json(
    { ...settings, weekValue: weekValueFor(settings, today), weekOf: weekOf(today), hasEnabledDevice: devices.some((d) => d.enabled) },
    { headers: NO_STORE },
  )
}

export async function GET(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response
  try {
    return await answer(auth.userId, auth.ownerId, auth.supabase)
  } catch {
    return fail(500, "Could not read your council settings")
  }
}

export async function PUT(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response
  if (fromAnotherSite(req)) return fail(403, "Not from this site")
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail(415, "Send JSON")
  const patch = readSettingsPatch(await req.json().catch(() => null))
  if (!patch) return fail(400, "Only weekValue, remindOn and remindHour (7-21)")
  // The copy space never pings a phone: its reminder stays off.
  if (auth.target === "sandbox") delete patch.remindOn
  try {
    const write: Parameters<typeof writeCouncilSettings>[1] = { ...patch }
    if (typeof patch.weekValue === "string") {
      const taken = (await readCouncil(auth.userId, auth.supabase)).flatMap((m) => m.takenValues)
      const own = taken.find((v) => v.toLowerCase() === patch.weekValue!.trim().toLowerCase())
      if (!own) return fail(400, "The value of the week must be one you took from your council")
      const tz = await getUserTimezone(auth.ownerId).catch(() => "UTC")
      write.weekValue = own
      write.weekOf = weekOf(getTodayInTimezone(tz))
    } else if (patch.weekValue === null) {
      write.weekOf = null
    }
    await writeCouncilSettings(auth.userId, write, auth.supabase)
    return await answer(auth.userId, auth.ownerId, auth.supabase)
  } catch {
    return fail(500, "Could not save your council settings")
  }
}
