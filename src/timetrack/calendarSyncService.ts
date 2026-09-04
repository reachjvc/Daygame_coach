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

import { lookup } from "node:dns/promises"

import { google } from "googleapis"
import { Agent } from "undici"

import { isBlockedAddress, parseIpBytes } from "./networkGuardService"

const FETCH_TIMEOUT_MS = 15_000
const MAX_ICS_BYTES = 5_000_000
const MAX_REDIRECTS = 3
/** One message for every refusal: a specific one tells an attacker what is there */
const REFUSED = "Refusing to fetch that address"

const dnsLookup = lookup

/**
 * Turn the user's text into a URL we are willing to fetch.
 *
 * Two separate checks, because either one alone can be walked around:
 *
 *  1. Here: resolve the name to real IP numbers and refuse if ANY of them is
 *     off the public internet. Checking the spelling of the hostname is not
 *     enough — `[::ffff:127.0.0.1]` is loopback and looks nothing like it.
 *  2. At connect time, in `guardedDispatcher` below: the same check runs again
 *     on the address the socket actually connects to. Between step 1 and the
 *     connection, DNS can change its mind (deliberately — it is an attack with
 *     a name, DNS rebinding), and a redirect can send us somewhere new. The
 *     connection-time check is the one that cannot be raced.
 */
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw.replace(/^webcal:\/\//i, "https://"))
  } catch {
    throw new Error("That does not look like a URL")
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) and webcal URLs are supported")
  }

  const host = url.hostname.replace(/^\[/, "").replace(/\]$/, "")
  const literal = parseIpBytes(host)
  if (literal) {
    if (isBlockedAddress(host)) throw new Error(REFUSED)
    return url
  }

  let resolved: { address: string }[]
  try {
    resolved = await dnsLookup(host, { all: true, verbatim: true })
  } catch {
    throw new Error("That address does not resolve")
  }
  if (resolved.length === 0) throw new Error("That address does not resolve")
  if (resolved.some((entry) => isBlockedAddress(entry.address))) throw new Error(REFUSED)
  return url
}

/**
 * Every socket this dispatcher opens is checked at the moment it is opened, so
 * a name that resolved publicly a millisecond ago cannot resolve privately now.
 */
const guardedDispatcher = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      const literal = parseIpBytes(hostname)
      if (literal) {
        if (isBlockedAddress(hostname)) {
          callback(new Error(REFUSED), "", 4)
          return
        }
        callback(null, hostname, literal.family)
        return
      }
      dnsLookup(hostname, { all: true, verbatim: true })
        .then((addresses) => {
          if (addresses.length === 0 || addresses.some((entry) => isBlockedAddress(entry.address))) {
            callback(new Error(REFUSED), "", 4)
            return
          }
          callback(
            null,
            addresses.map((entry) => ({ address: entry.address, family: entry.family })) as never,
            0 as never,
          )
        })
        .catch((error: Error) => callback(error, "", 4))
    },
  },
})

export async function fetchIcsFromUrl(raw: string): Promise<string> {
  let url = await assertPublicUrl(raw.trim())
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "text/calendar, text/plain;q=0.8" },
        // Never "follow": a redirect is a second address, and it gets the same
        // checks as the first. Following silently is how a public URL becomes
        // a fetch of 169.254.169.254.
        redirect: "manual",
        cache: "no-store",
        dispatcher: guardedDispatcher,
      } as RequestInit)

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")
        if (!location) throw new Error("The calendar address redirected to nowhere")
        if (hop === MAX_REDIRECTS) throw new Error("The calendar address redirected too many times")
        url = await assertPublicUrl(new URL(location, url).toString())
        continue
      }

      if (!response.ok) {
        // Deliberately not the status text: on an internal address, "Connection
        // refused" versus "401 Unauthorized" is a port scanner's answer.
        throw new Error("The calendar address did not return a calendar")
      }

      const text = await response.text()
      if (text.length > MAX_ICS_BYTES) throw new Error("Calendar file is larger than 5 MB")
      if (!text.includes("BEGIN:VCALENDAR")) {
        throw new Error("That URL did not return an iCalendar file — copy the secret address in iCal format")
      }
      return text
    }
    throw new Error("The calendar address redirected too many times")
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
