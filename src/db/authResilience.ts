import { isAuthApiError, isAuthRetryableFetchError, isAuthSessionMissingError, type SupabaseClient, type User } from "@supabase/supabase-js"

/**
 * "COULD NOT TELL" IS NOT "SIGNED OUT" (2026-11-20).
 *
 * The owner was sent to the login page twice in one evening, and the Time Log
 * stopped saving, with nobody signed out. Supabase's logs showed the reason:
 * for about three minutes the site's server in Frankfurt could not reach
 * Supabase at all (Cloudflare had trouble in the EU that evening), while its
 * server in the US could. Every "who is this?" asked from Frankfurt failed, and
 * the site read every failure as "nobody is signed in": the proxy sent pages to
 * the login form, and the time tracker, told 401, stopped sending until a
 * reload. The session itself was fine the whole time.
 *
 * Two things here keep a network fault from being reported as a sign-out:
 *
 * 1. `checkSignIn` answers in three states. Only an answer FROM Supabase that
 *    the session is no good is "signed-out". A network failure, a server
 *    error, a rate limit, or anything Supabase did not plainly answer is
 *    "unknown". Unknown never lets anyone in; it only stops the site from
 *    claiming a sign-out it did not see.
 *
 * 2. `refreshSafeFetch` stops Supabase's own client from deleting a good
 *    session over a server fault. supabase-js removes the session when a token
 *    refresh fails with anything it does not class as retryable, and it
 *    classes only 502/503/504 and no-answer-at-all as retryable. Cloudflare's
 *    own error pages (520–530), a 500 from the auth server, and a 429 are not,
 *    so one of those during a refresh deleted the session cookies for real
 *    (node_modules/@supabase/auth-js/dist/main/GoTrueClient.js,
 *    `_callRefreshToken`). A refresh answered with any of them is handed to
 *    supabase-js as a 503: it retries for up to 30 s, and if the server is
 *    still down it keeps the session for the next request.
 */

export type SignInCheck =
  | { state: "signed-in"; user: User }
  | { state: "signed-out" }
  | { state: "unknown" }

/**
 * True only when Supabase itself said the session is no good: no session in
 * the cookies at all, a session it no longer has, or a 4xx it answered about
 * the token (expired or reused refresh token, bad JWT, deleted user). A 408 or
 * 429 is "not now", not "no".
 */
export function isDefinitelySignedOut(error: unknown): boolean {
  if (isAuthSessionMissingError(error)) return true
  if (isAuthApiError(error)) {
    const status = error.status
    return status >= 400 && status < 500 && status !== 408 && status !== 429
  }
  return false
}

/**
 * Who is signed in, asked of Supabase, in three states (see above). Never throws.
 *
 * A THROW IS AN UNREADABLE SESSION, NOT AN OUTAGE. supabase-js turns every
 * network failure into a returned `AuthRetryableFetchError`; what it throws is
 * its own failure to read the cookie (a value that is not base64, say). That
 * session can never be used, so it is "signed-out" and the login form writes a
 * new one over it. Read as "unknown", it left the try-again page up for ever.
 */
export async function checkSignIn(supabase: SupabaseClient): Promise<SignInCheck> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data.user) return { state: "signed-in", user: data.user }
    if (!error || isDefinitelySignedOut(error)) return { state: "signed-out" }
    return { state: "unknown" }
  } catch (error) {
    return isAuthRetryableFetchError(error) ? { state: "unknown" } : { state: "signed-out" }
  }
}

const SESSION_COOKIE = /^(sb-.+-auth-token)(?:\.(\d+))?$/
// what @supabase/ssr decodes: base64url, plus the "=" and whitespace it skips
const BASE64URL = /^[A-Za-z0-9_\-=\s]*$/
const PREFIX = "base64-"

/**
 * The request's cookies without a session Supabase cannot decode.
 *
 * @supabase/ssr stores the session as "base64-" plus base64url, split over
 * `<name>`, or `<name>.0`, `<name>.1`, … when it is long. It throws on a
 * character outside base64url, from inside its own start-up as well as from
 * `getUser()`, so the start-up's copy is an unhandled rejection. A session
 * with such a character is left out whole: it reads as absent, a plain
 * "signed out", and the login form writes a new one over it. A session not in
 * the base64 form (the older plain-JSON one) is passed through untouched.
 */
export function withoutUnreadableSession<T extends { name: string; value: string }>(cookies: T[]): T[] {
  const unreadable = new Set<string>()
  const byBase = new Map<string, T[]>()
  for (const cookie of cookies) {
    const match = SESSION_COOKIE.exec(cookie.name)
    if (match) byBase.set(match[1]!, [...(byBase.get(match[1]!) ?? []), cookie])
  }
  for (const [base, parts] of byBase) {
    // what the library reads: the unchunked cookie, or .0, .1, … up to the first gap
    const whole = parts.find((c) => c.name === base)
    const read: T[] = []
    if (whole) read.push(whole)
    else for (let i = 0; ; i++) {
      const chunk = parts.find((c) => c.name === `${base}.${i}`)
      if (!chunk) break
      read.push(chunk)
    }
    if (!read[0]?.value.startsWith(PREFIX)) continue
    const readable = read.every((c, i) => BASE64URL.test(i === 0 ? c.value.slice(PREFIX.length) : c.value))
    if (!readable) parts.forEach((c) => unreadable.add(c.name))
  }
  return cookies.filter((c) => !unreadable.has(c.name))
}

/** A token refresh: the one auth call whose failure makes supabase-js delete the session. */
function isTokenRefresh(input: RequestInfo | URL, init?: RequestInit): boolean {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase()
  if (method !== "POST") return false
  try {
    const parsed = new URL(url)
    return parsed.pathname.endsWith("/auth/v1/token") && parsed.searchParams.get("grant_type") === "refresh_token"
  } catch {
    return false
  }
}

/**
 * Wraps a fetch so a token refresh answered with a server fault or a rate
 * limit reaches supabase-js as a 503, which it retries and never treats as a
 * sign-out. Every other request, and every other answer, passes untouched.
 */
export function refreshSafeFetch(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const response = await inner(input, init)
    if (!isTokenRefresh(input, init)) return response
    if (response.status === 502 || response.status === 503 || response.status === 504) return response
    // The auth server answers every refusal in JSON. A 4xx that is not JSON came
    // from something in front of it (a Cloudflare block page), and a 408 is "not
    // now": neither says anything about the session (adversarial review, finding 1).
    const json = (response.headers.get("content-type") ?? "").includes("application/json")
    const fault = response.status >= 500 || response.status === 429 || response.status === 408 || (response.status >= 400 && !json)
    if (!fault) return response
    // the original body is not read; let its connection go
    await response.body?.cancel().catch(() => {})
    return new Response(JSON.stringify({ code: "service_unavailable", msg: "The sign-in service could not be reached" }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "content-type": "application/json" },
    })
  }
}

/**
 * The page the proxy answers when it could not tell who is signed in: not the
 * login form, which would say "you are signed out" when nobody knows that.
 * It tries again by itself, and offers the login form for the case where
 * signing in again is what is needed.
 */
export function couldNotTellPage(next: string): string {
  const login = `/auth/login?next=${encodeURIComponent(next)}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="10">
<title>Can't reach sign-in</title>
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #111111; --muted: #555555; --line: #d4d4d4; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0a0a0a; --fg: #f5f5f5; --muted: #a3a3a3; --line: #404040; } }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
  main { max-width: 28rem; margin: 0 auto; padding: 48px 16px; }
  h1 { font-size: 1.25rem; margin: 0 0 12px; }
  p { margin: 0 0 16px; color: var(--muted); }
  .row { display: flex; flex-wrap: wrap; gap: 12px; }
  a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border: 1px solid var(--line); border-radius: 8px; color: var(--fg); text-decoration: none; }
</style>
</head>
<body>
<main>
  <h1>Can't reach the sign-in service</h1>
  <p>The site can't reach its sign-in service right now, so it can't check who you are. This is a connection problem, not something you did. This page tries again every 10 seconds.</p>
  <div class="row">
    <a href="">Try again</a>
    <a href="${login}">Log in again</a>
  </div>
</main>
</body>
</html>`
}
