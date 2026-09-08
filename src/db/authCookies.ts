/**
 * The flags on the cookie that keeps someone signed in.
 *
 * ONE OWNER. Two different Supabase clients write this cookie -- the browser one
 * after a password login, the server one when it refreshes an expiring session --
 * and each writes its own copy with its own flags. A call site that forgets these
 * silently writes a weaker cookie, and nothing fails.
 * `tests/unit/db/authCookies.test.ts` fails instead.
 *
 * secure: the browser will only send the cookie over an encrypted (https)
 * connection, so the session token cannot be read off an unencrypted one.
 *
 * It is decided by the connection the user is actually on, NOT by whether this
 * is a production build. Both matter here: the end-to-end suite runs a
 * production build over plain http://localhost (see playwright.config.ts, CI
 * branch), and Safari/WebKit refuses to store a Secure cookie there -- login
 * would appear to work and the browser would keep nothing. Marking it by build
 * type would have switched the flag off in production and on in CI, i.e. exactly
 * backwards in both places.
 *
 * httpOnly is deliberately false. Supabase's browser code reads this cookie with
 * document.cookie to know who is signed in; hiding it from JavaScript signs
 * everyone out on the client side. The exposure is real -- any script that gets
 * injected into a page can read a live session -- but the defence against that is
 * keeping injected scripts out, not this flag.
 */
const SHARED = {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
} as const

/** @param overHttps whether the user's connection is encrypted. */
export function authCookieOptions(overHttps: boolean) {
  return { ...SHARED, secure: overHttps }
}

/** In a browser the scheme is known exactly, so ask the page itself. */
export function browserAuthCookieOptions() {
  return authCookieOptions(
    typeof window !== "undefined" && window.location.protocol === "https:"
  )
}

/**
 * On a server the user's scheme is whatever the proxy in front of us saw, which
 * it reports in `x-forwarded-proto`. Vercel always sets it. A bare `next start`
 * on http sets nothing, and nothing is the right answer there.
 *
 * A host that terminates TLS without setting the header would have the session
 * cookie written without Secure on refresh -- but Next.js itself reads the same
 * header for the same purpose, so such a host breaks far more than this.
 */
export function requestIsHttps(headers: { get(name: string): string | null }): boolean {
  const forwarded = headers.get("x-forwarded-proto")
  if (!forwarded) return false
  // Chained proxies send a list; the first entry is the user's own hop.
  return forwarded.split(",")[0]!.trim().toLowerCase() === "https"
}
