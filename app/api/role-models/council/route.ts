/**
 * YOUR COUNCIL (Plans/role-models.md, Phase 7).
 *
 *   GET     the signed-in person's council, in order: `{ members, people }`, where
 *           `people` holds what the plan's screens show of each member (his
 *           quotes, principles and council question), never the whole catalogue.
 *   PUT     `{ roleModelId, takenValues }` adds one person, or changes the values
 *           taken from one already there; `{ order: [ids] }` reorders the whole
 *           council. Anything else is a 400; a sixth person is a 409.
 *   DELETE  `?id=<roleModelId>` removes one person.
 *
 * The user is always the session's (`requireAuth`); the rows are written with
 * their own client, so row security decides what is theirs. Writes take a
 * same-origin JSON request only.
 *
 * `?target=sandbox` acts on the hidden copy space's own rows (`src/db/planSandbox.ts`),
 * the same way the plan and day routes do; with no target it is the session's own.
 */

import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

import { requirePlanTarget } from "@/src/db/planSandbox"
import { CouncilFullError, readCouncil, removeCouncilMember, saveCouncilMember, writeCouncilOrder } from "@/src/db/roleModelsRepo"
import {
  checkCouncilPick,
  councilDetails,
  COUNCIL_FULL_MESSAGE,
  nextPosition,
  readOrder,
  readPick,
  reorderPositions,
  visibleCouncil,
} from "@/src/role-models/councilService"

const NO_STORE = { "Cache-Control": "no-store" }

function fromAnotherSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site")
  return site !== null && site !== "same-origin" && site !== "none"
}

const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE })

async function answer(userId: string, client: SupabaseClient) {
  const members = visibleCouncil(await readCouncil(userId, client))
  return NextResponse.json({ members, people: councilDetails(members) }, { headers: NO_STORE })
}

export async function GET(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response
  try {
    return await answer(auth.userId, auth.supabase)
  } catch {
    return fail(500, "Could not read your council")
  }
}

export async function PUT(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response
  if (fromAnotherSite(req)) return fail(403, "Not from this site")
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail(415, "Send JSON")
  const body = await req.json().catch(() => null)
  const pick = readPick(body)
  const order = pick ? null : readOrder(body)
  if (!pick && !order) return fail(400, "Send { roleModelId, takenValues } or { order }")

  try {
    const current = await readCouncil(auth.userId, auth.supabase)
    if (order) {
      const positions = reorderPositions(current, order)
      if (!positions) return fail(400, "The order must list every member of your council once")
      await writeCouncilOrder(auth.userId, positions, auth.supabase)
      return await answer(auth.userId, auth.supabase)
    }
    const p = pick!
    const check = checkCouncilPick(current, p.roleModelId, p.takenValues)
    if (!check.ok) return fail(check.status, check.message)
    const isNew = !current.some((m) => m.roleModelId === p.roleModelId)
    await saveCouncilMember(auth.userId, { roleModelId: p.roleModelId, takenValues: check.takenValues, position: nextPosition(current) }, isNew, auth.supabase)
    return await answer(auth.userId, auth.supabase)
  } catch (e) {
    if (e instanceof CouncilFullError) return fail(409, COUNCIL_FULL_MESSAGE)
    return fail(500, "Could not save your council")
  }
}

export async function DELETE(req: Request) {
  const auth = await requirePlanTarget(req)
  if (!auth.success) return auth.response
  if (fromAnotherSite(req)) return fail(403, "Not from this site")
  const id = new URL(req.url).searchParams.get("id") ?? ""
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 80) return fail(400, "Say which person: ?id=<id>")
  try {
    await removeCouncilMember(auth.userId, id, auth.supabase)
    return await answer(auth.userId, auth.supabase)
  } catch {
    return fail(500, "Could not remove from your council")
  }
}
