/**
 * COPY SPACE: empty it, so the next visit is a brand-new account's.
 *
 * Acts only on the signed-in account's own copy space (`plan_sandboxes`, no
 * row: 404). Removes the hidden account's plan, days and reminder as that
 * account; the signed-in account's own data is never read or written.
 */

import { NextResponse } from "next/server"
import { requirePlanTarget } from "@/src/db/planSandbox"
import { resetSandbox } from "@/src/db/planSandboxCopy"

export async function POST(req: Request) {
  const site = req.headers.get("sec-fetch-site")
  if (site !== null && site !== "same-origin") {
    return NextResponse.json({ error: "Not from this site" }, { status: 403 })
  }
  const auth = await requirePlanTarget(req, "sandbox")
  if (!auth.success) return auth.response
  try {
    await resetSandbox(auth)
    return NextResponse.json({ reset: true })
  } catch (error) {
    console.error("[plan-sandbox] reset failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not empty the copy space" }, { status: 500 })
  }
}
