import { NextResponse } from "next/server"

import { fetchIcsFromUrl, listGoogleCalendarEvents } from "@/src/timetrack/calendarSyncService"

/** Fetch an external calendar for the /test/toggl sandbox (ICS URL or Google API). */
export async function POST(request: Request) {
  const body = (await request.json()) as { source?: string; ref?: string; timeMin?: string; timeMax?: string }
  const ref = body.ref?.trim()
  if (!ref) return NextResponse.json({ error: "Missing calendar reference" }, { status: 400 })

  try {
    if (body.source === "google_api") {
      if (!body.timeMin || !body.timeMax) {
        return NextResponse.json({ error: "Missing time window" }, { status: 400 })
      }
      const result = await listGoogleCalendarEvents(ref, body.timeMin, body.timeMax)
      return NextResponse.json(result)
    }
    if (body.source === "ics_url") {
      return NextResponse.json({ ics: await fetchIcsFromUrl(ref) })
    }
    return NextResponse.json({ error: `Unsupported source: ${String(body.source)}` }, { status: 400 })
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Calendar fetch failed"
    // Never echo the reference back: an iCal secret address is a credential
    const message = raw.split(ref).join("the calendar address")
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
