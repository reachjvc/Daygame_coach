/**
 * Post-auth redirect targets arrive from the URL, so an attacker controls them.
 * Only same-origin absolute paths are allowed.
 *
 * The subtle case is the protocol-relative URL: "//evil.com" passes a naive
 * `startsWith("/")` check, and the browser then treats it as "https://evil.com".
 * That is an open redirect on a login page -- the classic phishing setup, where a
 * link that genuinely starts on your domain lands the user somewhere else with
 * your login flow in their history.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/redirect"
): string {
  if (!value) return fallback
  if (!value.startsWith("/")) return fallback
  if (value.startsWith("//")) return fallback
  // "/\evil.com" -- some browsers normalise the backslash to a forward slash.
  if (value.startsWith("/\\")) return fallback
  return value
}
