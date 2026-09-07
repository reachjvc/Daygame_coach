/**
 * Taking the private things out of a crash report before it is stored.
 *
 * A crash report is useful because of its shape — which line, which browser,
 * which page. It is dangerous because of what tends to ride along with that:
 *
 *   - a password-reset link, where the token IS the password
 *   - an email address, in a message like `no user for jo@example.com`
 *   - what somebody typed, in a message like `could not save "Lunch with Sarah"`
 *
 * None of that helps you fix anything, and all of it turns a debugging aid into
 * a place where private information accumulates.
 *
 * This runs on the server, on the way in, even though the browser already
 * trimmed what it sends: a client can be an old version, or lying.
 */

/** Anything after ? or # — where tokens live */
const QUERY_OR_HASH = /([?#])[^\s"')]*/g
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g
/** long opaque strings: jwts, api keys, uuids in urls */
const TOKENISH = /\b(?:[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?|[A-Fa-f0-9]{32,})\b/g
/** anything a person typed, which the app quotes back in its own messages */
const QUOTED = /(["'])(?:(?!\1)[^\\]|\\.){3,}\1/g

export function scrubText(input: string | null | undefined, limit = 4000): string | null {
  if (input === null || input === undefined) return null
  const cleaned = input
    .replace(QUERY_OR_HASH, "$1[removed]")
    .replace(EMAIL, "[email]")
    .replace(TOKENISH, "[token]")
    .replace(QUOTED, "[text]")
  return cleaned.length > limit ? `${cleaned.slice(0, limit)}…[truncated]` : cleaned
}

/** The path only. A query string is a credential often enough to never keep one. */
export function scrubRoute(route: string): string {
  const path = route.split(/[?#]/)[0] || "/"
  // ids in a path are not secret, but they are noise when grouping faults
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
}

/**
 * What makes two reports the same fault: the message plus where it was thrown.
 * Deliberately not the whole stack — line numbers move between builds, and a
 * fault that gets a new identity on every deploy cannot be counted.
 */
export function fingerprint(message: string, stack: string | null | undefined): string {
  const firstFrame = (stack ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("at ")) ?? ""
  const basis = `${message}|${firstFrame.replace(/:\d+:\d+\)?$/, "")}`

  // a short, stable hash. Not for security — only for grouping.
  let hash = 0
  for (let i = 0; i < basis.length; i++) {
    hash = (hash * 31 + basis.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36).padStart(7, "0")
}
