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
import { copyIntoSandbox, resetSandbox } from "@/src/db/planSandboxCopy"
import { requirePlanTarget, SandboxBusyError, withSandboxBusy } from "@/src/db/planSandbox"
import { createServerSupabaseClient } from "@/src/db/supabase"

export async function POST(req: Request) {
  const site = req.headers.get("sec-fetch-site")
  if (site !== null && site !== "same-origin") {
    return NextResponse.json({ error: "Not from this site" }, { status: 403 })
  }
  const auth = await requirePlanTarget(req, "sandbox")
  if (!auth.success) return auth.response
  try {
    // One copy or reset at a time per owner: two tabs cannot interleave.
    const copied = await withSandboxBusy(auth.ownerId, async () => {
      const owner = { userId: auth.ownerId, supabase: await createServerSupabaseClient() }
      try {
        return await copyIntoSandbox(owner, auth)
      } catch (error) {
        // Half a copy is worse than none: leave the copy space empty, and say so.
        console.error("[plan-sandbox] copy failed", error instanceof Error ? error.message : "unknown")
        await resetSandbox(auth).catch(() => {})
        throw new CopyFailed()
      }
    })
    return NextResponse.json({ copied })
  } catch (error) {
    if (error instanceof SandboxBusyError) return NextResponse.json({ error: "The copy space is busy. Try again in a moment." }, { status: 409 })
    if (error instanceof CopyFailed) {
      return NextResponse.json({ error: "The copy did not finish, so the copy space was emptied. Your real plan is not touched. Try again." }, { status: 500 })
    }
    console.error("[plan-sandbox] copy failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not copy your plan in" }, { status: 500 })
  }
}

class CopyFailed extends Error {}
