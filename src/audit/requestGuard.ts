/**
 * EVERY AUDIT ROUTE THAT CHANGES SOMETHING TAKES SAME-SITE JSON ONLY.
 *
 * The session cookie is SameSite=Lax, so another site's form post arrives
 * without it today; this does not lean on that alone (the privacy audit and
 * the security review, 2026-11-09). A browser that says the request came from
 * another site (`Sec-Fetch-Site`) is refused, and a body must be declared JSON,
 * which a plain HTML form cannot do. Same rule as Time's Stop route.
 */

import { NextResponse } from "next/server"

export function fromAnotherSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site")
  return site !== null && site !== "same-origin" && site !== "none"
}

/** A refusal to send back, or null when the request may go on. `body: false` for a DELETE. */
export function refuseCrossSite(req: Request, { body = true }: { body?: boolean } = {}): NextResponse | null {
  if (fromAnotherSite(req)) return NextResponse.json({ error: "Not from this site" }, { status: 403 })
  if (body && !(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send JSON" }, { status: 415 })
  }
  return null
}

/**
 * Text as the database can store it: Postgres refuses the NUL character
 * outright ("unsupported Unicode escape sequence"), and one such answer made
 * every save of a phone's queue fail with a 500 for good. Other control
 * characters, except tab and newline, are dropped too: nobody types them.
 */
export function storableText(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
}
