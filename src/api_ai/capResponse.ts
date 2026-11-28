import { NextResponse } from "next/server"

import { AiCapReachedError } from "./aiGuard"

/**
 * The answer a route gives when a person's AI cap is reached: the short line
 * they see, and a code the page can recognise. Null for any other error, which
 * the route handles as before.
 */
export function aiCapReachedResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AiCapReachedError)) return null
  return NextResponse.json({ error: error.message, code: error.code }, { status: 429 })
}
