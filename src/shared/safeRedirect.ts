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
  /**
   * CONTROL CHARACTERS FIRST, because the browser deletes them and then reads
   * what is left.
   *
   * "/\t/evil.com" starts with a single "/", so every check below waves it
   * through -- and then the browser strips the tab and navigates to
   * "//evil.com", which is another site. Tab, newline and carriage return are
   * the three it removes; the rest have no business in a path either, so the
   * whole control range goes. A legitimate destination never contains one.
   *
   * The value arrives already percent-decoded from `searchParams`, so "%09"
   * reaches here as a real tab and is caught by the same line.
   */
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback
  if (!value.startsWith("/")) return fallback
  if (value.startsWith("//")) return fallback
  // "/\evil.com" -- some browsers normalise the backslash to a forward slash.
  if (value.startsWith("/\\")) return fallback
  return value
}
