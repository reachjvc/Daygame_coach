/**
 * COPY SPACE: replace the copy with a fresh copy of the signed-in account's own
 * plan and days (`src/db/planSandboxCopy.ts`).
 *
 * The target is always the signed-in account's copy space, found through its
 * `plan_sandboxes` row; the body names nothing and a user id is never read
 * from the request. No row: 404. Reads the account's own rows with its own
 * session and writes only as the hidden account.
 */

import { NextResponse } from "next/server"
import { copyIntoSandbox } from "@/src/db/planSandboxCopy"
import { requirePlanTarget } from "@/src/db/planSandbox"
import { createServerSupabaseClient } from "@/src/db/supabase"

export async function POST(req: Request) {
  const site = req.headers.get("sec-fetch-site")
  if (site !== null && site !== "same-origin") {
    return NextResponse.json({ error: "Not from this site" }, { status: 403 })
  }
  const auth = await requirePlanTarget(req, "sandbox")
  if (!auth.success) return auth.response
  try {
    const owner = { userId: auth.ownerId, supabase: await createServerSupabaseClient() }
    const copied = await copyIntoSandbox(owner, auth)
    return NextResponse.json({ copied })
  } catch (error) {
    console.error("[plan-sandbox] copy failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not copy your plan in" }, { status: 500 })
  }
}
