// @vitest-environment node
/**
 * "COULD NOT TELL" IS NOT "SIGNED OUT" (src/db/authResilience.ts).
 *
 * 2026-11-20: Supabase was unreachable from the site's Frankfurt server for
 * about three minutes. The proxy read every failed check as "nobody signed in"
 * and sent the owner to the login form, twice, and the time tracker, told 401,
 * stopped saving. The session was good throughout.
 *
 * These drive the real proxy against a stubbed Supabase: each case is an
 * answer Supabase (or Cloudflare in front of it) can give, and what the person
 * must see for it. Nobody is ever let in without a plain yes; nobody is told
 * "signed out" without a plain no.
 */

import { describe, it, expect, afterEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError, AuthUnknownError } from "@supabase/supabase-js"
import { proxy } from "../../../proxy"
import { isDefinitelySignedOut, refreshSafeFetch, withoutUnreadableSession } from "@/src/db/authResilience"

const BASE = "https://daygame-coach.vercel.app"
const SUPABASE = "https://stub.supabase.co"
const COOKIE = "sb-stub-auth-token"
const USER = { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated", email: "a@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" }

const b64url = (text: string) => Buffer.from(text).toString("base64url")
function jwt(exp: number) {
  return `${b64url(JSON.stringify({ alg: "ES256", typ: "JWT" }))}.${b64url(JSON.stringify({ sub: USER.id, exp }))}.sig`
}
function session(expiresInSeconds: number, refresh = "refresh-old") {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
  return { access_token: jwt(expiresAt), token_type: "bearer", expires_in: expiresInSeconds, expires_at: expiresAt, refresh_token: refresh, user: USER }
}
const cookieValue = (s: object) => "base64-" + b64url(JSON.stringify(s))

function req(path: string, s?: object) {
  const request = new NextRequest(new URL(path, BASE))
  if (s) request.cookies.set(COOKIE, cookieValue(s))
  return request
}

type Answer = (url: URL, init?: RequestInit) => Response | Promise<Response>
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
const cloudflarePage = (status: number) => new Response("<html><body>Cloudflare error</body></html>", { status, headers: { "content-type": "text/html" } })

/** Supabase stubbed by path: `/user` and the token refresh. */
function stubSupabase({ user, refresh }: { user: Answer; refresh?: Answer }) {
  const calls: string[] = []
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE)
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stub-anon-key")
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
    calls.push(`${init?.method ?? "GET"} ${url.pathname}${url.search}`)
    if (url.pathname === "/auth/v1/user") return user(url, init)
    if (url.pathname === "/auth/v1/token" && refresh) return refresh(url, init)
    throw new TypeError("fetch failed")
  }))
  return calls
}

const networkDown: Answer = () => {
  throw new TypeError("fetch failed")
}

/** What a response does to the session cookie: kept (not mentioned), replaced, or deleted. */
function sessionCookieWrite(response: Response): "untouched" | "deleted" | "replaced" {
  const sets = response.headers.getSetCookie().filter((c) => c.startsWith(COOKIE))
  if (sets.length === 0) return "untouched"
  return sets.some((c) => /^[^=]+=;|Max-Age=0/i.test(c)) && !sets.some((c) => /^[^=]+=[^;]+;/.test(c) && !/Max-Age=0/i.test(c)) ? "deleted" : "replaced"
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("what counts as a plain no", () => {
  it("is only Supabase answering that the session is no good", () => {
    expect(isDefinitelySignedOut(new AuthSessionMissingError())).toBe(true)
    expect(isDefinitelySignedOut(new AuthApiError("Invalid Refresh Token: Already Used", 400, "refresh_token_already_used"))).toBe(true)
    expect(isDefinitelySignedOut(new AuthApiError("invalid JWT", 403, "bad_jwt"))).toBe(true)
    expect(isDefinitelySignedOut(new AuthApiError("User not found", 404, "user_not_found"))).toBe(true)
  })

  it("is never a network failure, a server fault, a rate limit or an unreadable answer", () => {
    expect(isDefinitelySignedOut(new AuthRetryableFetchError("fetch failed", 0))).toBe(false)
    expect(isDefinitelySignedOut(new AuthRetryableFetchError("Bad Gateway", 502))).toBe(false)
    expect(isDefinitelySignedOut(new AuthApiError("unexpected_failure", 500, "unexpected_failure"))).toBe(false)
    expect(isDefinitelySignedOut(new AuthApiError("rate limit", 429, "over_request_rate_limit"))).toBe(false)
    expect(isDefinitelySignedOut(new AuthApiError("timeout", 408, undefined))).toBe(false)
    expect(isDefinitelySignedOut(new AuthUnknownError("Unexpected token <", null))).toBe(false)
    expect(isDefinitelySignedOut(new Error("anything else"))).toBe(false)
  })
})

describe("a refresh answered with a server fault reaches supabase-js as a 503", () => {
  const refreshUrl = `${SUPABASE}/auth/v1/token?grant_type=refresh_token`
  const run = async (status: number, url = refreshUrl, method = "POST") => {
    const inner = vi.fn(async () => (status >= 500 ? cloudflarePage(status) : json(status, {})))
    return (await refreshSafeFetch(inner as unknown as typeof fetch)(url, { method })).status
  }

  it.each([500, 520, 521, 522, 524, 525, 526, 530, 429])("%i on a refresh becomes 503", async (status) => {
    expect(await run(status)).toBe(503)
  })

  it.each([200, 400, 401, 403, 502, 503, 504])("%i on a refresh is passed unchanged", async (status) => {
    expect(await run(status)).toBe(status)
  })

  it("a 408, or a 4xx that is not the auth server's JSON (a Cloudflare block page), becomes 503", async () => {
    const page = (status: number) => vi.fn(async () => new Response("<html>blocked</html>", { status, headers: { "content-type": "text/html" } }))
    expect((await refreshSafeFetch(page(403) as unknown as typeof fetch)(refreshUrl, { method: "POST" })).status).toBe(503)
    expect((await refreshSafeFetch(page(408) as unknown as typeof fetch)(refreshUrl, { method: "POST" })).status).toBe(503)
  })

  it("leaves every other call alone: a password login, a user lookup, a database read", async () => {
    expect(await run(520, `${SUPABASE}/auth/v1/token?grant_type=password`)).toBe(520)
    expect(await run(429, `${SUPABASE}/auth/v1/token?grant_type=password`)).toBe(429)
    expect(await run(500, `${SUPABASE}/auth/v1/user`, "GET")).toBe(500)
    expect(await run(500, `${SUPABASE}/rest/v1/goals`, "GET")).toBe(500)
  })
})

describe("the proxy, Supabase answering", () => {
  it("yes: the page is served", async () => {
    stubSupabase({ user: () => json(200, USER) })
    const response = await proxy(req("/dashboard", session(3600)))
    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("no session at all: the login form, as before", async () => {
    const calls = stubSupabase({ user: () => json(200, USER) })
    const response = await proxy(req("/dashboard?tab=week"))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
    expect(calls).toEqual([])
  })

  it("a session Supabase no longer has: the login form", async () => {
    stubSupabase({ user: () => json(403, { code: "session_not_found", msg: "Session from session_id claim in JWT does not exist" }) })
    const response = await proxy(req("/dashboard", session(3600)))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
  })

  it.each([
    ["not base64 at all", "base64-%%%not-a-session"],
    ["base64 of nonsense", "base64-" + Buffer.from("garbage").toString("base64url")],
    ["a session with no tokens", cookieValue({ user: USER })],
  ])("a garbled cookie (%s): the login form, never stuck on try-again", async (_, value) => {
    stubSupabase({ user: networkDown })
    const request = new NextRequest(new URL("/dashboard", BASE))
    request.cookies.set(COOKIE, value)
    const response = await proxy(request)
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
  })

  it("a spent refresh token: the login form", async () => {
    stubSupabase({
      user: () => json(200, USER),
      refresh: () => json(400, { code: "refresh_token_already_used", msg: "Invalid Refresh Token: Already Used" }),
    })
    const response = await proxy(req("/dashboard", session(-60)))
    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login")
  })
})

describe("the proxy, Supabase not answering plainly", () => {
  it.each([
    ["no network", networkDown],
    ["a Cloudflare 522 page", () => cloudflarePage(522)],
    ["a 502", () => cloudflarePage(502)],
    ["a 500 from the auth server", () => json(500, { code: "unexpected_failure", msg: "Unexpected failure" })],
    ["a rate limit", () => json(429, { code: "over_request_rate_limit", msg: "Too many requests" })],
  ] as [string, Answer][])("%s: a page gets the try-again page, not the login form", async (_, answer) => {
    stubSupabase({ user: answer })
    const response = await proxy(req("/dashboard?tab=week", session(3600)))
    expect(response.status).toBe(503)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("cache-control")).toBe("no-store")
    const html = await response.text()
    expect(html).toContain("Can't reach the sign-in service")
    expect(html).toContain(`/auth/login?next=${encodeURIComponent("/dashboard?tab=week")}`)
    expect(sessionCookieWrite(response)).toBe("untouched")
  })

  it("the time tracker's sync gets a 503 it retries, not the 401 that stops it", async () => {
    stubSupabase({ user: networkDown })
    const response = await proxy(req("/api/timetrack/sync", session(3600)))
    expect(response.status).toBe(503)
    expect(((await response.json()) as { retryable?: boolean }).retryable).toBe(true)
  })

  it("the audit's calls likewise", async () => {
    stubSupabase({ user: () => cloudflarePage(520) })
    const response = await proxy(req("/api/audit/answer", session(3600)))
    expect(response.status).toBe(503)
  })

  it("the sandbox test routes are untouched: they answer signed in or not", async () => {
    stubSupabase({ user: networkDown })
    const response = await proxy(req("/api/test/articles", session(3600)))
    // production seals them (404); elsewhere they pass. Either way, not the 503.
    expect(response.status).not.toBe(503)
  })
})

describe("the session survives a refresh during an outage", () => {
  it("a refresh that worked, then a failed check: the new session still reaches the browser", async () => {
    stubSupabase({
      user: networkDown,
      refresh: () => json(200, session(3600, "refresh-new")),
    })
    const response = await proxy(req("/dashboard", session(-60)))
    expect(response.status).toBe(503)
    // Dropping this would leave the browser holding the spent token: its next request a real sign-out.
    expect(sessionCookieWrite(response)).toBe("replaced")
    const written = response.headers.getSetCookie().find((c) => c.startsWith(COOKIE) && !/Max-Age=0/i.test(c))!
    const value = decodeURIComponent(written.split(";")[0]!.split("=").slice(1).join("="))
    expect(JSON.parse(Buffer.from(value.replace(/^base64-/, ""), "base64url").toString()).refresh_token).toBe("refresh-new")
  })

  it.each([
    ["a Cloudflare 520 page", () => cloudflarePage(520)],
    ["a 500 from the auth server", () => json(500, { code: "unexpected_failure", msg: "Unexpected failure" })],
    ["a rate limit", () => json(429, { code: "over_request_rate_limit", msg: "Too many requests" })],
    ["no network", networkDown],
  ] as [string, Answer][])("a refresh answered with %s: the session is kept, not deleted", async (_, answer) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "Date"], shouldAdvanceTime: true })
    stubSupabase({ user: () => json(200, USER), refresh: answer })
    const pending = proxy(req("/dashboard", session(-60)))
    // supabase-js retries a retryable refresh for up to 30 s
    for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(2_000)
    const response = await pending
    expect(response.status).toBe(503)
    expect(sessionCookieWrite(response)).toBe("untouched")
  })
})

describe("outside the proxy: a route's own client keeps the session through a refresh fault", () => {
  /**
   * Route handlers and the Time Log's browser client write cookies straight
   * through, with no proxy to hold a deletion back, so `refreshSafeFetch` is
   * what stands between a Cloudflare error page and a real sign-out. The
   * first case proves the trap is real; the second that the wrapper closes it.
   */
  async function refreshWith(answer: Answer, wrap: boolean) {
    const { createServerClient } = await import("@supabase/ssr")
    stubSupabase({ user: () => json(200, USER), refresh: answer })
    const deleted: string[] = []
    const client = createServerClient(SUPABASE, "stub-anon-key", {
      global: wrap ? { fetch: refreshSafeFetch((i, init) => fetch(i, init)) } : {},
      cookies: {
        getAll: () => [{ name: COOKIE, value: cookieValue(session(-60)) }],
        setAll: (cookies) => cookies.forEach(({ name, value }) => value === "" && deleted.push(name)),
      },
    })
    vi.useFakeTimers({ toFake: ["setTimeout", "Date"], shouldAdvanceTime: true })
    const pending = client.auth.getUser()
    for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(2_000)
    await pending
    return deleted
  }

  it("without it, a Cloudflare 520 page during a refresh deletes the session", async () => {
    expect(await refreshWith(() => cloudflarePage(520), false)).toContain(COOKIE)
  })

  it.each([
    ["a Cloudflare 520 page", () => cloudflarePage(520)],
    ["a 500 from the auth server", () => json(500, { code: "unexpected_failure", msg: "Unexpected failure" })],
    ["a rate limit", () => json(429, { code: "over_request_rate_limit", msg: "Too many requests" })],
  ] as [string, Answer][])("with it, %s during a refresh deletes nothing", async (_, answer) => {
    expect(await refreshWith(answer, true)).toEqual([])
  })

  it("with it, a spent refresh token still ends the session, as it must", async () => {
    expect(await refreshWith(() => json(400, { code: "refresh_token_already_used", msg: "Invalid Refresh Token: Already Used" }), true)).toContain(COOKIE)
  })
})

describe("an undecodable session cookie is left out whole", () => {
  const c = (name: string, value: string) => ({ name, value })
  it("keeps a good session, chunked or not, and every other cookie", () => {
    const good = [c(COOKIE, "base64-abc_DEF-123"), c("theme", "%%%"), c(`${COOKIE}-code-verifier`, "%x")]
    expect(withoutUnreadableSession(good)).toEqual(good)
    const chunked = [c(`${COOKIE}.0`, "base64-abc"), c(`${COOKIE}.1`, "def_-")]
    expect(withoutUnreadableSession(chunked)).toEqual(chunked)
  })
  it("drops every chunk of a session with one bad character in any chunk", () => {
    expect(withoutUnreadableSession([c(`${COOKIE}.0`, "base64-abc"), c(`${COOKIE}.1`, "de%f"), c("theme", "dark")])).toEqual([c("theme", "dark")])
    expect(withoutUnreadableSession([c(COOKIE, "base64-%%%")])).toEqual([])
  })
  it("keeps what the library itself decodes: padding, whitespace, a stale chunk past a gap", () => {
    const padded = [c(COOKIE, "base64-abc=")]
    expect(withoutUnreadableSession(padded)).toEqual(padded)
    const gap = [c(`${COOKIE}.0`, "base64-abc"), c(`${COOKIE}.2`, "%%%")]
    expect(withoutUnreadableSession(gap)).toEqual(gap)
  })

  it("passes a session in the older plain-JSON form untouched", () => {
    const plain = [c(COOKIE, '{"access_token":"x"}')]
    expect(withoutUnreadableSession(plain)).toEqual(plain)
  })
})

describe("a route's own client: a Cloudflare block page during a refresh", () => {
  it("deletes nothing (adversarial review, finding 1)", async () => {
    const { createServerClient } = await import("@supabase/ssr")
    stubSupabase({ user: () => json(200, USER), refresh: () => new Response("<html>blocked</html>", { status: 403, headers: { "content-type": "text/html" } }) })
    const deleted: string[] = []
    const client = createServerClient(SUPABASE, "stub-anon-key", {
      global: { fetch: refreshSafeFetch((i, init) => fetch(i, init)) },
      cookies: {
        getAll: () => [{ name: COOKIE, value: cookieValue(session(-60)) }],
        setAll: (cookies) => cookies.forEach(({ name, value }) => value === "" && deleted.push(name)),
      },
    })
    vi.useFakeTimers({ toFake: ["setTimeout", "Date"], shouldAdvanceTime: true })
    const pending = client.auth.getUser()
    for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(2_000)
    await pending
    expect(deleted).toEqual([])
  })
})
