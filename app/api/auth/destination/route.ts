import { NextResponse } from "next/server"

import { resolveLoginDestination } from "@/src/profile/loginDestinationService"

// Reads the session cookie, so it must never be cached.
export const dynamic = "force-dynamic"

/**
 * Where the login form should send someone it has just signed in.
 * Exists so the form can answer that question without navigating to a page
 * that renders nothing while it works it out.
 */
export async function GET(request: Request) {
  const requestedNext = new URL(request.url).searchParams.get("next")
  const destination = await resolveLoginDestination(requestedNext)

  if (destination === null) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  return NextResponse.json({ destination })
}
