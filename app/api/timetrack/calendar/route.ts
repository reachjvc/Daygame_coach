import { NextResponse } from "next/server"

import { requireAuth } from "@/src/db/auth"
import { fetchIcsFromUrl, listGoogleCalendarEvents } from "@/src/timetrack/calendarSyncService"
import { checkRateLimit } from "@/src/timetrack/rateLimitService"

/** Fetch an external calendar (ICS URL or Google API) for the signed-in user. */
export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const limit = checkRateLimit(`calendar:${auth.userId}`, 10, 60_000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many calendar requests — wait a moment and try again" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    )
  }

  const body = (await request.json()) as { source?: string; ref?: string; timeMin?: string; timeMax?: string }
  const ref = body.ref?.trim()
  if (!ref) return NextResponse.json({ error: "Missing calendar reference" }, { status: 400 })

  try {
    if (body.source === "google_api") {
      if (!body.timeMin || !body.timeMax) {
        return NextResponse.json({ error: "Missing time window" }, { status: 400 })
      }
      return NextResponse.json(await listGoogleCalendarEvents(ref, body.timeMin, body.timeMax))
    }
    if (body.source === "ics_url") {
      return NextResponse.json({ ics: await fetchIcsFromUrl(ref) })
    }
    return NextResponse.json({ error: `Unsupported source: ${String(body.source)}` }, { status: 400 })
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Calendar fetch failed"
    // Never echo the reference back: an iCal secret address is a credential
    return NextResponse.json({ error: raw.split(ref).join("the calendar address") }, { status: 502 })
  }
}
