import "server-only"

/**
 * Server-side calendar fetching for the time-tracking sandbox.
 *
 * Two zero-OAuth paths into Google Calendar:
 *  1. `ics_url` — Google Calendar → Settings → "Secret address in iCal format".
 *     Fetched server-side because Google does not send CORS headers.
 *  2. `google_api` — Calendar API read via the workspace service account in
 *     GOOGLE_SERVICE_ACCOUNT_JSON. Requires the calendar to be shared with the
 *     service account's client_email.
 *
 * Failures throw with an explicit reason; nothing falls back silently.
 */

import { google } from "googleapis"

const FETCH_TIMEOUT_MS = 15_000
const MAX_ICS_BYTES = 5_000_000

/** Reject loopback / link-local / private hosts so the route can't be used to probe the network */
function assertPublicUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw.replace(/^webcal:\/\//i, "https://"))
  } catch {
    throw new Error("That does not look like a URL")
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) and webcal URLs are supported")
  }
  const host = url.hostname.toLowerCase()
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  if (blocked) throw new Error("Refusing to fetch a private or loopback address")
  return url
}

export async function fetchIcsFromUrl(raw: string): Promise<string> {
  const url = assertPublicUrl(raw)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/calendar, text/plain;q=0.8" },
      redirect: "follow",
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`Calendar responded with ${response.status} ${response.statusText}`)
    }
    const text = await response.text()
    if (text.length > MAX_ICS_BYTES) throw new Error("Calendar file is larger than 5 MB")
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("That URL did not return an iCalendar file — copy the secret address in iCal format")
    }
    return text
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Calendar request timed out after 15 s")
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export interface GoogleEventsResult {
  items: unknown[]
  serviceAccountEmail: string
}

export async function listGoogleCalendarEvents(
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string,
): Promise<GoogleEventsResult> {
  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credsJson) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not set — use the iCal secret address or a .ics upload instead",
    )
  }

  let credentials: { client_email?: string }
  try {
    credentials = JSON.parse(credsJson)
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON")
  }

  const auth = new google.auth.GoogleAuth({
    credentials: credentials as Record<string, unknown>,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  })
  const calendar = google.calendar({ version: "v3", auth })

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  })

  return {
    items: response.data.items ?? [],
    serviceAccountEmail: credentials.client_email ?? "unknown",
  }
}
