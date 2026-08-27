/**
 * WHERE A LINK CAME FROM, carried on the link itself.
 *
 * A back control that names its destination in its own file always sends you
 * to the same place, which is wrong the moment a screen has two entrances:
 * open the plan from the tracking page and "back" took you to Goals, which is
 * not where you were. So the entrance passes its own address and the far side
 * uses it.
 *
 * One step, not a history stack. The question "where was I a moment ago" has
 * one answer and the browser keeps the rest.
 */

export const RETURN_PARAM = "from"

/** Longer than any real route, short enough that nobody can stuff a page into it. */
const MAX_LENGTH = 512

/**
 * A usable return address, or null.
 *
 * SECURITY: this value arrives in a URL, so anybody can write it. Rendered
 * unchecked into an `href` it is an open redirect — `?from=https://evil.example`
 * turns a page of yours into a credible hop to somebody else's login form. Only
 * a path on this site is allowed: one leading slash, no scheme, no protocol
 * relative `//host`, no backslash trick.
 */
export function readReturn(value: string | null | undefined): string | null {
  if (!value) return null
  const raw = value.trim()
  if (!raw || raw.length > MAX_LENGTH) return null
  if (!raw.startsWith("/")) return null
  // `//host` and `/\host` are both read as "another site" by browsers.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null
  // eslint-disable-next-line no-control-regex -- rejecting them is the point
  if (/[\x00-\x1f\x7f]/.test(raw)) return null
  if (/\s/.test(raw)) return null
  return raw
}

/** Add a return address to an internal link. */
export function withReturn(href: string, from: string): string {
  const safe = readReturn(from)
  if (!safe) return href
  const joiner = href.includes("?") ? "&" : "?"
  return `${href}${joiner}${RETURN_PARAM}=${encodeURIComponent(safe)}`
}
