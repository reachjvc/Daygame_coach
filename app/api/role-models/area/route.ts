/**
 * PEOPLE WHO LIVED THIS AREA AT A 10 (Plans/role-models.md, Phase 9).
 *
 *   GET ?id=<life plan area id>  up to three validated people for that area,
 *       your council first: `{ people: [{ id, name, years, color, startedFrom, inCouncil }] }`.
 *
 * Signed in only, because "your council first" reads your council. The answer
 * holds catalogue facts and which of them are yours, nothing else.
 */

import { NextResponse } from "next/server"

import { LIFE_MASTERY_AREA_MAP } from "@/src/goals/data/lifeMasteryAreas"
import { requireAuth } from "@/src/db/auth"
import { readCouncil } from "@/src/db/roleModelsRepo"
import { peopleForArea } from "@/src/role-models/catalog"

const NO_STORE = { "Cache-Control": "no-store" }

export async function GET(req: Request) {
  const auth = await requireAuth(req)
  if (!auth.success) return auth.response
  const id = new URL(req.url).searchParams.get("id") ?? ""
  if (!LIFE_MASTERY_AREA_MAP.has(id)) return NextResponse.json({ people: [] }, { headers: NO_STORE })
  const council = await readCouncil(auth.userId).catch(() => [])
  return NextResponse.json({ people: peopleForArea(id, council.map((m) => m.roleModelId)) }, { headers: NO_STORE })
}
